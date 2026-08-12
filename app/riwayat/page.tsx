'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Star, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

// CONFIG STRAPI URL LOKAL TANPA FILE LIB
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

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
  status?: string;
  totalPrice?: number;
  items?: OrderItem[];
  tenantId?: number | string;
  tenantName?: string;
  tenantImage?: string;
  tenantRating?: string | number;
  userRating?: number;
}

export default function RiwayatPage() {
  const router = useRouter();
  const [historyOrders, setHistoryOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [ratingLoading, setRatingLoading] = useState<string | number | null>(null);

  const defaultTenantImage =
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80';

  const fetchHistoryOrders = async () => {
    setLoading(true);
    let orders: OrderData[] = [];

    // 1. Ambil Data dari LocalStorage khusus Riwayat terlebih dahulu
    try {
      const historyLocal = JSON.parse(localStorage.getItem('smart_canteen_history') || '[]');
      const savedOrders = JSON.parse(localStorage.getItem('smart_canteen_orders') || '[]');

      const mergedLocal = [...historyLocal, ...savedOrders];
      const localFormatted = mergedLocal.map((raw: any) => {
        const data = raw.data || raw;
        return {
          id: data.id || data.orderId,
          orderId: data.orderId || data.order_id || `#SC-${data.id || 1}`,
          createdAt: data.createdAt || new Date().toISOString(),
          status: data.status || 'Selesai',
          totalPrice: Number(data.totalPrice || data.total_price) || 0,
          items: Array.isArray(data.items) ? data.items : [],
          tenantId: data.tenantId || 1,
          tenantName: data.tenantName || 'Kantin Sekolah',
          tenantImage: defaultTenantImage,
          tenantRating: '4.8',
          userRating: Number(data.rating || data.userRating) || 0,
        };
      });

      orders = localFormatted;
    } catch (e) {
      console.error('Gagal membaca LocalStorage riwayat:', e);
    }

    // 2. Ambil dari Strapi Backend jika online
    try {
      const res = await fetch(`${STRAPI_URL}/api/orders?sort[0]=createdAt:desc&populate=*`);

      if (res.ok) {
        const result = await res.json();
        const rawData = result.data || [];

        const strapiOrders = rawData.map((item: any) => {
          const attr = item.attributes ? { ...item.attributes, id: item.id } : item;
          return {
            id: item.id,
            orderId: attr.order_id || attr.orderId || `#SC-${item.id}`,
            createdAt: attr.createdAt || new Date().toISOString(),
            status: attr.menu_status || attr.status || 'Selesai',
            totalPrice: Number(attr.total_price || attr.totalPrice) || 0,
            items: Array.isArray(attr.items) ? attr.items : [],
            tenantId: attr.tenant_id || attr.tenantId || 1,
            tenantName: attr.tenant_name || attr.tenantName || 'Kantin Sekolah',
            tenantImage: attr.tenant_image || defaultTenantImage,
            tenantRating: attr.tenant_rating || '4.8',
            userRating: Number(attr.rating || attr.userRating) || 0,
          };
        });

        if (strapiOrders.length > 0) {
          orders = strapiOrders;
        }
      }
    } catch (err) {
      console.warn('Backend Strapi offline, menggunakan data riwayat dari LocalStorage.');
    }

    // Filter hanya yang berstatus Selesai atau Dibatalkan
    const filtered = orders.filter((o) =>
      ['selesai', 'dibatalkan', 'Selesai', 'Dibatalkan', 'siap_diambil', 'siap diambil'].includes(o.status || '')
    );

    setHistoryOrders(filtered);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistoryOrders();
  }, []);

  const handleRating = async (orderItem: OrderData, ratingValue: number) => {
    const targetOrderKey = orderItem.id || orderItem.orderId;
    if (!targetOrderKey) return;

    setRatingLoading(targetOrderKey);

    // 1. Update Tampilan Bintang di UI
    setHistoryOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderItem.id || ord.orderId === orderItem.orderId
          ? { ...ord, userRating: ratingValue }
          : ord
      )
    );

    // 2. Simpan di LocalStorage
    try {
      const savedRatings = JSON.parse(localStorage.getItem('canteen_user_ratings') || '{}');
      savedRatings[targetOrderKey] = ratingValue;
      localStorage.setItem('canteen_user_ratings', JSON.stringify(savedRatings));
    } catch (e) {
      console.error('Gagal menyimpan rating lokal:', e);
    }

    // 3. Kirim Update Rating ke Endpoint Strapi "homes"
    try {
      const tenantId = orderItem.tenantId;

      if (tenantId) {
        const numericHomeId = typeof tenantId === 'string' ? tenantId.replace(/\D/g, '') : tenantId;

        if (numericHomeId) {
          const res = await fetch(`${STRAPI_URL}/api/homes/${numericHomeId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              data: {
                rating: Number(ratingValue),
              },
            }),
          });

          if (res.ok) {
            console.log(`✅ Rating ${ratingValue} berhasil dikirim ke Home/Tenant ID: ${numericHomeId}`);
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ Server offline, rating tersimpan lokal.');
    } finally {
      setRatingLoading(null);
    }
  };

  const handleBeliLagi = (order: OrderData) => {
    if (order.tenantId) {
      router.push(`/toko/${order.tenantId}`);
    } else {
      router.push('/home');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '02 Agustus 2026, 08:50';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const formattedDate = date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const formattedTime = date
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
      .replace('.', ':');

    return `${formattedDate}, ${formattedTime}`;
  };

  const formatMenuSummary = (items: OrderItem[]) => {
    if (!items || items.length === 0) return 'Pesanan Makanan';
    return items
      .map((it) => `${it.quantity || 1} ${it.name || it.nama || 'Menu'}`)
      .join(' + ');
  };

  return (
    <div className="w-full min-h-screen bg-gray-50/50 font-sans text-gray-900 pb-20">
      
      {/* HEADER */}
      <header className="w-full bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-30 shadow-xs">
        <div className="w-full flex items-center justify-between">
          <button
            onClick={() => router.push('/home')}
            className="text-gray-900 hover:text-green-600 transition-colors p-1.5 -ml-1 rounded-full hover:bg-gray-100 cursor-pointer"
          >
            <ArrowLeft size={22} />
          </button>

          <h1 className="text-lg font-bold text-gray-900 tracking-tight">
            Riwayat
          </h1>

          <div className="flex items-center gap-1">
            <button
              onClick={fetchHistoryOrders}
              className="text-gray-600 hover:text-green-600 transition-colors p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
              title="Perbarui Data"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              className="text-gray-900 hover:text-green-600 transition-colors p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
              title="Notifikasi"
            >
              <Bell size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* KONTEN UTAMA */}
      <main className="w-full px-4 py-5 space-y-4 max-w-4xl mx-auto">
        {loading ? (
          <div className="py-20 text-center text-gray-400">
            <RefreshCw size={28} className="animate-spin mx-auto mb-2 text-green-500" />
            <p className="text-xs font-medium">Memuat riwayat...</p>
          </div>
        ) : historyOrders.length > 0 ? (
          historyOrders.map((order, orderIdx) => {
            const normStat = (order.status || '').toLowerCase();
            const isSelesai = normStat === 'selesai' || normStat === 'siap_diambil' || normStat === 'siap diambil';
            const orderKey = order.id || order.orderId || orderIdx;
            const currentRating = order.userRating || 0;
            const totalItemsCount = (order.items || []).reduce(
              (sum, item) => sum + (item.quantity || 1),
              0
            );

            return (
              <div
                key={orderKey}
                className="w-full bg-white rounded-3xl p-5 shadow-xs border border-gray-100 flex flex-col gap-4"
              >
                {/* BARIS ATAS: GAMBAR + INFO LENGKAP */}
                <div className="flex items-start gap-4">
                  {/* GAMBAR TENANT DENGAN BADGE RATING */}
                  <div className="relative shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-gray-100">
                    <img
                      src={order.tenantImage}
                      alt={order.tenantName || 'Kantin'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = defaultTenantImage;
                      }}
                    />
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xs px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1 border border-gray-100">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      <span className="text-[11px] font-bold text-gray-900">
                        {order.tenantRating || '4.8'}
                      </span>
                    </div>
                  </div>

                  {/* INFO TEXT LENGKAP */}
                  <div className="flex-1 min-w-0 flex flex-col space-y-1 text-left">
                    {/* 1. NAMA TENANT */}
                    <h2 className="text-lg font-bold text-gray-900 leading-tight truncate">
                      {order.tenantName || 'Kantin Sekolah'}
                    </h2>

                    {/* 2. TANGGAL + STATUS SEJAJAR */}
                    <p className="text-xs text-gray-400 font-medium">
                      {formatDate(order.createdAt)}{' '}
                      <span className="text-gray-400">.</span>{' '}
                      <span className={isSelesai ? 'text-[#52C453] font-semibold' : 'text-red-500 font-semibold'}>
                        {isSelesai ? 'Selesai' : 'Dibatalkan'}
                      </span>
                    </p>

                    {/* 3. RINCIAN MENU */}
                    <p className="text-xs font-semibold text-gray-800 pt-1 leading-snug">
                      {formatMenuSummary(order.items || [])}
                    </p>

                    {/* 4. TOTAL HARGA */}
                    <p className="text-sm font-bold text-gray-900 pt-0.5">
                      Rp{Number(order.totalPrice || 0).toLocaleString('id-ID')}
                    </p>

                    {/* 5. JUMLAH MENU */}
                    <p className="text-[11px] text-gray-400 font-medium">
                      {totalItemsCount || (order.items || []).length || 1} Menu
                    </p>
                  </div>
                </div>

                {/* BARIS BAWAH: PENILAIAN & TOMBOL BELI LAGI */}
                <div className="flex items-end justify-between pt-2 border-t border-gray-50">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-gray-400 block">
                      Beri Penilaian Mu
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          disabled={ratingLoading === orderKey}
                          onClick={() => handleRating(order, star)}
                          className="p-0.5 transition-transform active:scale-125 cursor-pointer disabled:opacity-50"
                        >
                          <Star
                            size={18}
                            className={
                              star <= currentRating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-300'
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleBeliLagi(order)}
                    className="bg-[#E2F7E3] hover:bg-[#d0f2d2] text-[#42B543] text-xs font-bold px-4 py-2 rounded-full transition-all active:scale-95 border border-[#d0f2d2] cursor-pointer"
                  >
                    Beli Lagi
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center text-gray-400 space-y-3">
            <p className="text-sm font-medium">Belum ada riwayat pesanan.</p>
            <button
              onClick={() => router.push('/home')}
              className="rounded-full bg-[#52C453] px-5 py-2 text-white font-bold text-xs hover:bg-[#43b044] transition-all cursor-pointer"
            >
              Cari Makanan
            </button>
          </div>
        )}
      </main>

    </div>
  );
}