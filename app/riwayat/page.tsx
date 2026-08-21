'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/* ==========================================================================
   1. TYPESCRIPT INTERFACES
   ========================================================================== */

export interface Tenant {
  documentId: string;
  name: string;
  rating?: number;
  benner?: { url: string };
  banner?: { url: string };
}

export interface Menu {
  documentId: string;
  name: string;
  price: number;
  image?: { url: string };
}

export interface OrderItem {
  documentId: string;
  quantity: number;
  price: number;
  menu?: Menu | { data?: Menu }; // Flexible untuk response Strapi
}

export interface Order {
  documentId: string;
  order_id?: string;
  status_pesanan?: string;
  menu_status?: string;
  total_price?: number;
  rating?: number;
  tenant?: Tenant | { data?: Tenant };
  items?: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

/* ==========================================================================
   2. STRAPI V5 API FETCHERS
   ========================================================================== */

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

async function fetchOrderHistory(userDocId?: string): Promise<Order[]> {
  const queryParts: string[] = [
    // 🟢 Deep Populate untuk Tenant & Menu beserta Gambar & Detailnya
    `populate[tenant][populate]=*`,
    `populate[items][populate][menu][populate]=*`,

    // Populate User
    `populate[user][fields][0]=username`,
    `populate[user][fields][1]=email`,

    // Filter HANYA pesanan berstatus "Selesai"
    `filters[menu_status][$eq]=Selesai`,

    // Urutkan transaksi terbaru ke terlama
    `sort[0]=createdAt:desc`,
  ];

  if (userDocId) {
    queryParts.push(`filters[user][documentId][$eq]=${userDocId}`);
  }

  const queryString = queryParts.join('&');
  const url = `${STRAPI_URL}/api/orders?${queryString}`;

  const res = await fetch(url, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || `Gagal mengambil data`);
  }

  const json = await res.json();
  return json.data || [];
}

async function submitOrderRating(orderDocumentId: string, rating: number): Promise<void> {
  const res = await fetch(`${STRAPI_URL}/api/orders/${orderDocumentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: { rating },
    }),
  });

  if (!res.ok) throw new Error('Gagal menyimpan penilaian.');
}

/* ==========================================================================
   3. HALAMAN UTAMA RIWAYAT
   ========================================================================== */

export default function RiwayatPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const CURRENT_USER_DOC_ID = ""; 

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchOrderHistory(CURRENT_USER_DOC_ID || undefined);
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // 🟢 Beli Lagi mengarahkan ke halaman Detail Menu jika ID ditemukan
  const handleBuyAgain = (menuDocId?: string) => {
    if (menuDocId) {
      router.push(`/menu/${menuDocId}`);
    } else {
      router.push('/menu');
    }
  };

  const handleRateOrder = async (orderDocumentId: string, rating: number) => {
    try {
      await submitOrderRating(orderDocumentId, rating);
      setOrders((prev) =>
        prev.map((ord) =>
          ord.documentId === orderDocumentId ? { ...ord, rating } : ord
        )
      );
    } catch {
      alert('Gagal memperbarui rating.');
    }
  };

  return (
    <div className="w-full min-h-screen bg-white p-4 md:p-8">
      <div className="w-full max-w-full mx-auto">
        
        {/* Header Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <button 
            onClick={() => router.back()} 
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 border border-gray-100 shadow-sm hover:bg-gray-100 transition"
          >
            <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Riwayat</h1>
          <div className="flex items-center space-x-2">
            <button 
              onClick={loadOrders} 
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 border border-gray-100 shadow-sm hover:bg-gray-100 transition text-gray-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4 w-full">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 w-full animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="w-full rounded-2xl bg-red-50 p-6 text-center text-red-600">
            <p className="font-semibold">{error}</p>
            <button
              onClick={loadOrders}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && orders.length === 0 && (
          <div className="w-full rounded-2xl bg-gray-50 border border-gray-100 p-12 text-center text-gray-500">
            Belum ada riwayat pesanan yang selesai.
          </div>
        )}

        {/* Order History List */}
        {!loading && !error && orders.length > 0 && (
          <div className="space-y-4 w-full">
            {orders.map((order) => {
              const status = order.menu_status || order.status_pesanan || 'Selesai';
              const price = Number(order.total_price || 0);

              // 🟢 Normalisasi data Tenant
              const rawTenant: any = (order.tenant as any)?.data || order.tenant;
              const tenantName = rawTenant?.name || 'Toko';
              const tenantRating = rawTenant?.rating || '4.8';

              // 🟢 Normalisasi data Item & Menu pertama
              const firstItem: any = order.items?.[0];
              const rawFirstMenu: any = (firstItem?.menu as any)?.data || firstItem?.menu;

              // 🟢 Ambil Document ID Menu dengan berbagai macam opsi format Strapi
              const firstMenuItemDocId = rawFirstMenu?.documentId || rawFirstMenu?.id;

              // 🟢 Prioritas Gambar: Banner Tenant -> Foto Menu -> Placeholder Unsplash
              const rawImageUrl = 
                rawTenant?.benner?.url || 
                rawTenant?.banner?.url || 
                rawFirstMenu?.image?.url;

              const imageUrl = rawImageUrl
                ? (rawImageUrl.startsWith('http') ? rawImageUrl : `${STRAPI_URL}${rawImageUrl}`)
                : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80';

              // 🟢 Rincian ringkas nama menu yang dipesan
              const itemsSummary = order.items?.length
                ? order.items
                    .map((item: any) => {
                      const menuObj = item.menu?.data || item.menu;
                      return `${item.quantity || 1}x ${menuObj?.name || 'Menu'}`;
                    })
                    .join(' + ')
                : 'Pesanan';

              return (
                <div 
                  key={order.documentId} 
                  className="w-full rounded-2xl bg-white p-4 md:p-5 shadow-sm border border-gray-200 flex gap-4 items-start justify-between"
                >
                  {/* SISI KIRI: Foto Toko & Detail Pesanan */}
                  <div className="flex gap-4 items-start flex-1 min-w-0">
                    
                    {/* Foto Toko / Menu */}
                    <div className="relative h-24 w-24 md:h-28 md:w-28 shrink-0 overflow-hidden rounded-xl bg-gray-100 border border-gray-100">
                      <img
                        src={imageUrl}
                        alt={tenantName}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80';
                        }}
                      />
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-gray-800 shadow-sm backdrop-blur-sm">
                        <span className="text-amber-400">★</span>
                        <span>{tenantRating}</span>
                      </div>
                    </div>

                    {/* Rincian Teks */}
                    <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5">
                      <div>
                        <h2 className="text-base md:text-lg font-bold text-gray-900 truncate leading-snug">
                          {tenantName}
                        </h2>
                        
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[11px] md:text-xs text-gray-400 font-medium">
                            {new Date(order.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })},{' '}
                            {new Date(order.createdAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            }).replace('.', ':')}
                          </p>
                          <span className="text-gray-300">•</span>
                          <span className="text-[11px] md:text-xs font-semibold text-emerald-600">
                            {status}
                          </span>
                        </div>
                      </div>

                      {/* Detail Menu & Harga */}
                      <div className="mt-1.5">
                        <p className="text-xs md:text-sm text-gray-600 font-medium truncate">
                          {itemsSummary}
                        </p>
                        <p className="text-sm md:text-base font-bold text-gray-900 mt-0.5">
                          Rp{price.toLocaleString('id-ID')}
                        </p>
                      </div>

                      {/* Penilaian Bintang Interaktif */}
                      <div className="mt-2">
                        <p className="text-[10px] md:text-xs font-semibold text-gray-500 mb-0.5">Beri Penilaian Mu</p>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => handleRateOrder(order.documentId, star)}
                              className={`text-base md:text-lg leading-none transition-transform active:scale-125 ${
                                star <= (order.rating || 0)
                                  ? 'text-amber-400'
                                  : 'text-gray-200 hover:text-amber-300'
                              }`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SISI KANAN: Tombol Beli Lagi */}
                  <div className="shrink-0 flex flex-col justify-start items-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBuyAgain(firstMenuItemDocId);
                      }}
                      className="rounded-full bg-emerald-50 px-4 md:px-5 py-1.5 text-xs md:text-sm font-semibold text-emerald-600 hover:bg-emerald-100 transition border border-emerald-200"
                    >
                      Beli Lagi
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}