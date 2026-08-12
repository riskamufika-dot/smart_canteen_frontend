'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Home, Utensils } from 'lucide-react';
import { useRouter } from 'next/navigation';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

interface OrderItem {
  id?: number | string;
  name?: string;
  nama?: string;
  price?: number;
  harga?: number;
  quantity?: number;
  qty?: number;
  notes?: string;
  note?: string;
}

interface OrderData {
  id?: number | string;
  orderId?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  totalPrice?: number;
  items?: OrderItem[];
  pickupDate?: string;
  pickupTime?: string;
  paymentMethod?: string;
}

export default function StatusPesananPage() {
  const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // PARSER PRESISI & BEBAS GARIS MERAH TYPESCRIPT
  const parseItems = (rawItemsInput: any, masterMenus: any[] = []): OrderItem[] => {
    let parsed: any[] = [];
    if (!rawItemsInput) return [];

    if (typeof rawItemsInput === 'string') {
      try { parsed = JSON.parse(rawItemsInput); } catch (e) { parsed = []; }
    } else if (Array.isArray(rawItemsInput)) {
      parsed = rawItemsInput;
    }

    if (!Array.isArray(parsed)) return [];

    return parsed.map((it: any) => {
      const attr = it.attributes || it;
      const menuObj = attr.menu?.data?.attributes || attr.menu?.data || attr.menu || {};

      let name = menuObj.name || menuObj.nama || attr.name || attr.nama;
      let price = Number(menuObj.price || menuObj.harga || attr.price || attr.harga || 0);
      const quantity = Number(attr.quantity || attr.qty || attr.jumlah || 1);
      const notes = attr.notes || attr.note || attr.catatan || '';

      const itemId = attr.id || menuObj.id || attr.menu_id;

      // Pencocokan Cadangan ke Master Menu jika relasi dari Strapi kosong
      if (masterMenus.length > 0 && (!name || price === 0)) {
        const matched = masterMenus.find((m: any) => {
          const mAttr = m.attributes || m;
          return String(m.id) === String(itemId) || String(mAttr.name || mAttr.nama || '').toLowerCase() === String(name || '').toLowerCase();
        });

        if (matched) {
          const mAttr = matched.attributes || matched;
          if (!name) name = mAttr.name || mAttr.nama;
          if (price === 0) price = Number(mAttr.price || mAttr.harga || 0);
        }
      }

      return {
        ...attr,
        name: name || 'Makanan Kantin',
        price: price,
        quantity: quantity,
        notes: notes,
      };
    });
  };

  const fetchLatestOrder = useCallback(async () => {
    let latestData: OrderData | null = null;

    // 1. Ambil ID Pesanan spesifik milik user yang sedang aktif
    const activeOrderId = typeof window !== 'undefined' ? (localStorage.getItem('active_order_id') || '') : '';

    let latestLocal: any = null;
    try {
      const savedOrders = JSON.parse(localStorage.getItem('smart_canteen_orders') || '[]');
      if (savedOrders.length > 0) {
        latestLocal = savedOrders.find((o: any) => o.orderId === activeOrderId || o.order_id === activeOrderId) || savedOrders[0];
      }
    } catch (e) {}

    // 2. Fetch Master Menu Strapi
    let masterMenus: any[] = [];
    try {
      const resMenus = await fetch(`${STRAPI_URL}/api/menus?populate=*&pagination[pageSize]=1000`);
      if (resMenus.ok) {
        const jsonMenus = await resMenus.json();
        masterMenus = jsonMenus.data || [];
      }
    } catch (e) {}

    // 3. Fetch Data Pesanan Spesifik dari Strapi v5 (DEEP POPULATE RELASI MENU)
    try {
      const fetchUrl = activeOrderId
        ? `${STRAPI_URL}/api/orders?filters[order_id][$eq]=${encodeURIComponent(activeOrderId)}&populate[items][populate][menu][populate]=*&populate[items][populate]=*&populate=*&status=draft`
        : `${STRAPI_URL}/api/orders?populate[items][populate][menu][populate]=*&populate[items][populate]=*&populate=*&status=draft&sort[0]=createdAt:desc&pagination[limit]=1`;

      const res = await fetch(fetchUrl, { cache: 'no-store' });

      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          const raw = json.data[0];
          const attr = raw.attributes ? { ...raw.attributes, id: raw.id } : raw;

          const parsedItems = parseItems(attr.items || attr.order_items || attr.details, masterMenus);
          
          // FIX TYPESCRIPT GARIS MERAH: Pengamanan Number() pada perkalian
          const calculatedTotal = parsedItems.reduce(
            (sum: number, it: OrderItem) => sum + (Number(it.price || 0) * Number(it.quantity || 1)),
            0
          );

          const rawStatus = String(attr.menu_status || attr.status_pesanan || attr.status || '').toLowerCase();
          let normStatus = 'Menunggu Konfirmasi';
          if (rawStatus.includes('disiapkan') || rawStatus === 'sedang_disiapkan') {
            normStatus = 'Sedang Disiapkan';
          } else if (rawStatus.includes('siap') || rawStatus === 'siap_diambil') {
            normStatus = 'Siap Diambil';
          } else if (rawStatus.includes('selesai')) {
            normStatus = 'Selesai';
          }

          latestData = {
            id: raw.id,
            orderId: attr.order_id || attr.orderId || `#SC-${raw.id}`,
            createdAt: attr.createdAt || new Date().toISOString(),
            updatedAt: attr.updatedAt || new Date().toISOString(),
            status: normStatus,
            totalPrice: Number(attr.total_price || attr.totalPrice) || calculatedTotal,
            items: parsedItems.length > 0 ? parsedItems : (latestLocal ? parseItems(latestLocal.items, masterMenus) : []),
            pickupDate: attr.pickup_date || attr.pickupDate || latestLocal?.pickupDate || '-',
            pickupTime: attr.pickup_time || attr.pickupTime || latestLocal?.pickupTime || '06.15 WIB',
            paymentMethod: String(attr.payment_method || attr.paymentMethod || latestLocal?.paymentMethod || 'CASH').toUpperCase(),
          };
        }
      }
    } catch (e) {
      console.warn('Strapi offline, beralih ke lokal:', e);
    }

    // 4. Fallback LocalStorage jika backend Strapi offline
    if (!latestData && latestLocal) {
      const raw = latestLocal.data || latestLocal;
      const parsedItems = parseItems(raw.items, masterMenus);

      const rawStatus = String(raw.status || raw.menu_status || '').toLowerCase();
      let normStatus = 'Menunggu Konfirmasi';
      if (rawStatus.includes('disiapkan') || rawStatus === 'sedang_disiapkan') {
        normStatus = 'Sedang Disiapkan';
      } else if (rawStatus.includes('siap') || rawStatus === 'siap_diambil') {
        normStatus = 'Siap Diambil';
      } else if (rawStatus.includes('selesai')) {
        normStatus = 'Selesai';
      }

      // FIX TYPESCRIPT GARIS MERAH
      const calculatedTotal = parsedItems.reduce(
        (sum: number, it: OrderItem) => sum + (Number(it.price || 0) * Number(it.quantity || 1)),
        0
      );

      latestData = {
        id: raw.id || 1,
        orderId: raw.orderId || raw.order_id || `#SC001`,
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || new Date().toISOString(),
        status: normStatus,
        totalPrice: Number(raw.totalPrice || raw.total_price) || calculatedTotal,
        items: parsedItems,
        pickupDate: raw.pickupDate || raw.pickup_date || '-',
        pickupTime: raw.pickupTime || raw.pickup_time || '06.15 WIB',
        paymentMethod: String(raw.paymentMethod || raw.payment_method || 'CASH').toUpperCase(),
      };
    }

    setOrder(latestData);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLatestOrder();

    const intervalId = setInterval(() => {
      fetchLatestOrder();
    }, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchLatestOrder]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date
      .toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      .replace('.', ':');
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
      .replace('.', ':');
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white font-sans font-bold text-gray-400">
        Memuat status pesanan...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white gap-4 px-4 text-center">
        <p className="text-gray-600 font-medium">Belum ada pesanan aktif.</p>
        <button
          onClick={() => router.push('/home')}
          className="px-5 py-2.5 bg-[#52C453] text-white font-semibold rounded-full hover:bg-green-600 transition-colors cursor-pointer"
        >
          Pesan Makanan
        </button>
      </div>
    );
  }

  const rawStatusText = String(order.status || '').toLowerCase();
  let currentStatusIndex = 0;
  if (rawStatusText.includes('disiapkan') || rawStatusText.includes('proses')) {
    currentStatusIndex = 1;
  } else if (rawStatusText.includes('siap')) {
    currentStatusIndex = 2;
  } else if (rawStatusText.includes('selesai')) {
    currentStatusIndex = 3;
  }

  const isCompletedOrder = currentStatusIndex === 3;

  const statusSteps = [
    { label: 'Menunggu Konfirmasi', desc: 'Pesananmu telah diterima oleh penjual' },
    { label: 'Sedang Disiapkan', desc: 'Pesananmu sedang disiapkan' },
    { label: 'Siap Diambil', desc: 'Pesananmu sudah siap diambil' },
    { label: 'Selesai', desc: 'Pesanan telah selesai' },
  ];

  return (
    <div className="w-full min-h-screen bg-white font-sans text-gray-900 py-6 px-4 sm:px-8">
      <main className="w-full space-y-6 max-w-4xl mx-auto">

        {/* HEADER NAVBAR */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <button
            onClick={() => router.push('/home')}
            className="text-gray-900 hover:text-orange-500 transition-colors p-1 -ml-1 cursor-pointer"
          >
            <ArrowLeft size={26} />
          </button>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Status Pesanan
          </h1>

          <button
            onClick={() => router.push('/home')}
            className="text-gray-900 hover:text-orange-500 transition-colors p-1 cursor-pointer"
          >
            <Home size={24} />
          </button>
        </div>

        {/* INFO ORDER ID & TANGGAL */}
        <div className="bg-[#FFF8EE] border border-orange-200/80 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row justify-between gap-4 w-full">
          <div className="space-y-1">
            <span className="text-sm font-semibold text-gray-400">Order ID</span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-wide">
              {order.orderId}
            </h2>
          </div>
          <div className="space-y-1 sm:text-right">
            <span className="text-sm font-semibold text-gray-400">Tanggal Transaksi</span>
            <p className="text-sm sm:text-base font-bold text-gray-500">
              {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        {/* STEPPER STATUS PESANAN */}
        <div className="py-4 px-2 space-y-8 relative w-full">
          {statusSteps.map((step, idx) => {
            const isCompleted = idx <= currentStatusIndex;
            const isCurrent = idx === currentStatusIndex;

            let bgClass = 'bg-gray-200 text-gray-400';
            if (isCompleted) {
              if (idx === 0 || idx === 1) bgClass = 'bg-[#F28728] text-white';
              if (idx === 2) bgClass = 'bg-[#52C453] text-white';
              if (idx === 3) bgClass = 'bg-gray-700 text-white';
            }

            return (
              <div key={step.label} className="flex items-start gap-4 relative w-full">
                {idx < statusSteps.length - 1 && (
                  <div
                    className={`absolute left-5 top-10 w-0.5 h-12 -ml-[1px] ${
                      idx < currentStatusIndex ? 'bg-orange-400' : 'bg-gray-200'
                    }`}
                  />
                )}

                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 font-bold transition-all ${bgClass}`}>
                  <Utensils size={18} />
                </div>

                <div className="flex-1 min-w-0 flex items-start justify-between gap-2 pt-1">
                  <div>
                    <h3 className={`font-bold text-base sm:text-lg ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                      {step.desc}
                    </p>
                  </div>

                  <span className="text-xs sm:text-sm font-semibold text-gray-400 shrink-0">
                    {isCurrent ? formatTime(order.updatedAt) : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* NOTIFIKASI JIKA SELESAI */}
        {isCompletedOrder && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center space-y-3 animate-in fade-in duration-300">
            <p className="text-sm text-green-800 font-bold">
              🎉 Pesanan ini telah selesai!
            </p>
            <button
              onClick={() => router.push('/home')}
              className="px-6 py-2.5 bg-[#52C453] hover:bg-green-600 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Kembali ke Beranda
            </button>
          </div>
        )}

        {/* DETAIL PENGAMBILAN */}
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-2 text-sm w-full">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium">Tanggal Pengambilan:</span>
            <span className="font-bold text-gray-900">{order.pickupDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium">Jam Pengambilan:</span>
            <span className="font-bold text-gray-900">{order.pickupTime}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium">Metode Pembayaran:</span>
            <span className="font-bold text-gray-900 uppercase">{order.paymentMethod}</span>
          </div>
        </div>

        {/* RINCIAN ITEM PESANAN */}
        <div className="bg-[#FFF8EE] border border-orange-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs w-full">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 pb-2 border-b border-orange-200/60">
            Detail Pesanan
          </h3>

          <div className="space-y-3">
            {order.items && Array.isArray(order.items) && order.items.length > 0 ? (
              order.items.map((item, index) => {
                const name = item.name || item.nama || 'Makanan';
                const qty = Number(item.quantity || item.qty) || 1;
                const price = Number(item.price || item.harga) || 0;
                const note = item.notes || item.note;

                return (
                  <div key={index} className="flex flex-col gap-1 border-b border-orange-100/60 last:border-none pb-2 last:pb-0">
                    <div className="flex items-center justify-between text-sm sm:text-base font-medium">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-900 font-bold">{qty}x</span>
                        <span className="text-gray-800 font-bold">{name}</span>
                      </div>
                      <span className="font-bold text-gray-900">
                        Rp {(price * qty).toLocaleString('id-ID')}
                      </span>
                    </div>
                    {note && (
                      <p className="text-xs text-gray-500 italic ml-8">Catatan: {note}</p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-400">Tidak ada item terdeteksi.</p>
            )}
          </div>

          <div className="pt-4 border-t border-orange-200/80 flex items-center justify-between">
            <span className="text-base sm:text-lg font-bold text-gray-900">Total Pembayaran</span>
            <span className="text-lg sm:text-xl font-extrabold text-[#F28728]">
              Rp {Number(order.totalPrice || 0).toLocaleString('id-ID')}
            </span>
          </div>
        </div>

      </main>
    </div>
  );
}