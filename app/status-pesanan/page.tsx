'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { STRAPI_URL } from '@/lib/getImageUrl';

interface OrderItem {
  id?: number | string;
  name?: string;
  nama?: string;
  price?: number;
  harga?: number;
  quantity?: number;
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

  // Ambil data pesanan (Mendahulukan transaksi terbaru dari LocalStorage, lalu sync Strapi)
  const fetchLatestOrder = async () => {
    let latestData: OrderData | null = null;

    // 1. Ambil dari LocalStorage terlebih dahulu
    try {
      const savedOrders = JSON.parse(localStorage.getItem('smart_canteen_orders') || '[]');
      if (savedOrders.length > 0) {
        const lastOrder = savedOrders[savedOrders.length - 1];
        const raw = lastOrder.data || lastOrder;

        latestData = {
          id: raw.id || 1,
          orderId: raw.orderId || `#SC${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-001`,
          createdAt: raw.createdAt || new Date().toISOString(),
          updatedAt: raw.updatedAt || new Date().toISOString(),
          status: raw.status || 'pending',
          totalPrice: Number(raw.totalPrice || raw.total) || 0,
          items: Array.isArray(raw.items) ? raw.items : [],
          pickupDate: raw.pickupDate || '-',
          pickupTime: raw.pickupTime || '06.15 WIB',
          paymentMethod: raw.paymentMethod || 'Cash',
        };
      }
    } catch (e) {
      console.error('Gagal membaca LocalStorage:', e);
    }

    // 2. Jika Strapi online, cek update status real-time dari backend
    try {
      const res = await fetch(
        `${STRAPI_URL}/api/orders?sort[0]=createdAt:desc&pagination[limit]=1`
      );

      if (res.ok) {
        const result = await res.json();
        if (result.data && result.data.length > 0) {
          const raw = result.data[0];
          const attributes = raw.attributes ? { ...raw.attributes, id: raw.id } : raw;

          if (latestData) {
            latestData.status = attributes.menu_status || attributes.status || latestData.status;
            latestData.updatedAt = attributes.updatedAt || latestData.updatedAt;
          } else {
            latestData = {
              id: raw.id,
              orderId: attributes.order_id || attributes.orderId || `#SC-${raw.id}`,
              createdAt: attributes.createdAt || new Date().toISOString(),
              updatedAt: attributes.updatedAt || new Date().toISOString(),
              status: attributes.menu_status || attributes.status || 'pending',
              totalPrice: Number(attributes.total_price || attributes.totalPrice) || 0,
              items: Array.isArray(attributes.items) ? attributes.items : [],
              pickupDate: attributes.pickup_date || '-',
              pickupTime: attributes.pickup_time || '06.15 WIB',
              paymentMethod: attributes.payment_method || 'Cash',
            };
          }
        }
      }
    } catch (err) {
      console.warn('Backend Strapi offline, menggunakan data lokal.');
    }

    setOrder(latestData);
    setLoading(false);
  };

  useEffect(() => {
    fetchLatestOrder();

    // Refresh otomatis setiap 4 detik
    const interval = setInterval(() => {
      fetchLatestOrder();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Format Tanggal
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).replace('.', ':');
  };

  // Format Jam Saja
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }).replace('.', ':');
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <p className="text-gray-400 font-medium">Memuat status pesanan...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white gap-4 px-4 text-center">
        <p className="text-gray-600 font-medium">Belum ada pesanan aktif.</p>
        <button
          onClick={() => router.push('/home')}
          className="px-5 py-2.5 bg-[#52C453] text-white font-semibold rounded-full hover:bg-green-600 transition-colors"
        >
          Pesan Makanan
        </button>
      </div>
    );
  }

  // Pemetaan Status Pesanan (Mendukung format Enum Strapi & LocalStorage)
  const statusSteps = [
    { keys: ['pending', 'menunggu konfirmasi'], label: 'Menunggu Konfirmasi', desc: 'Pesananmu telah diterima oleh penjual' },
    { keys: ['sedang_disiapkan', 'sedang diproses', 'sedang disiapkan'], label: 'Sedang Disiapkan', desc: 'Pesananmu sedang disiapkan' },
    { keys: ['siap_diambil', 'siap diambil'], label: 'Siap Diambil', desc: 'Pesananmu sudah siap' },
    { keys: ['selesai'], label: 'Selesai', desc: 'Pesanan telah diambil' },
  ];

  const normalizedStatus = (order.status || '').toLowerCase();
  const currentStatusIndex = statusSteps.findIndex((step) =>
    step.keys.includes(normalizedStatus)
  );

  return (
    <div className="w-full min-h-screen bg-white font-sans text-gray-900 py-6 px-4 sm:px-8">
      <main className="w-full space-y-6">
        
        {/* HEADER ATAS */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <button
            onClick={() => router.back()}
            className="text-gray-900 hover:text-orange-500 transition-colors p-1 -ml-1"
          >
            <ArrowLeft size={26} />
          </button>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Status Pesanan
          </h1>

          <button
            onClick={() => router.push('/home')}
            className="text-gray-900 hover:text-orange-500 transition-colors p-1"
          >
            <Home size={24} />
          </button>
        </div>

        {/* BOX INFORMASI ORDER ID & TANGGAL */}
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

        {/* TIMELINE STATUS PESANAN */}
        <div className="py-4 px-2 space-y-8 relative w-full">
          {statusSteps.map((step, idx) => {
            const activeIdx = currentStatusIndex < 0 ? 0 : currentStatusIndex;
            const isCompleted = idx <= activeIdx;
            const isCurrent = idx === activeIdx;

            let bgClass = 'bg-gray-200 text-gray-400';
            if (isCompleted) {
              if (idx === 0 || idx === 1) bgClass = 'bg-[#F28728] text-white';
              if (idx === 2) bgClass = 'bg-[#52C453] text-white';
              if (idx === 3) bgClass = 'bg-gray-400 text-white';
            }

            return (
              <div key={step.label} className="flex items-start gap-4 relative w-full">
                {idx < statusSteps.length - 1 && (
                  <div
                    className={`absolute left-5 top-10 w-0.5 h-12 -ml-[1px] ${
                      idx < activeIdx ? 'bg-orange-400' : 'bg-gray-200'
                    }`}
                  />
                )}

                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 font-bold transition-all ${bgClass}`}>
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.46 3.91 3.45 4.38L6 22h2l.55-8.62C10.54 12.91 12 11.12 12 9V2h-1v7zm7-7s-3 0-3 5v5h2v10h2V2z" />
                  </svg>
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

        {/* INFORMASI WAKTU PENGAMBILAN & METODE PEMBAYARAN */}
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

        {/* RINCIAN DETAIL PESANAN */}
        <div className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm w-full">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 pb-2 border-b border-gray-100">
            Detail Pesanan
          </h3>

          <div className="space-y-3">
            {order.items && order.items.length > 0 ? (
              order.items.map((item, index) => {
                const name = item.name || item.nama || 'Item Makanan';
                const qty = Number(item.quantity) || 1;
                const price = Number(item.price ?? item.harga) || 0;

                return (
                  <div key={index} className="flex items-center justify-between text-sm sm:text-base font-medium">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-900 font-bold">{qty}x</span>
                      <span className="text-gray-800">{name}</span>
                    </div>
                    <span className="font-bold text-gray-900">
                      Rp {(price * qty).toLocaleString('id-ID')}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-400">Tidak ada item terdeteksi.</p>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
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