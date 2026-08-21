'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, ChevronRight, Loader2, Inbox } from 'lucide-react';
import Link from 'next/link';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

interface Order {
  id: number | string;
  orderId: string;
  rawOrderId: string;
  customerName: string;
  customerClass: string;
  orderTime: string;
  status: string;
}

export default function DaftarPesananPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      // API query standar yang pasti didukung Strapi v5
      let res = await fetch(
        `${STRAPI_URL}/api/orders?populate[items][populate]=*&populate[users_permissions_user]=*&sort[0]=createdAt:desc`,
        { cache: 'no-store' }
      );

      if (!res.ok) {
        res = await fetch(
          `${STRAPI_URL}/api/orders?populate=*&sort[0]=createdAt:desc`,
          { cache: 'no-store' }
        );
      }

      if (res.ok) {
        const json = await res.json();
        const dataList = json.data || [];

        const formattedOrders: Order[] = dataList.map((item: any) => {
          const attr = item.attributes ? { ...item.attributes, id: item.id } : item;
          const userObj = attr.users_permissions_user?.data?.attributes || attr.users_permissions_user || attr.user || {};

          const rawDate = attr.createdAt ? new Date(attr.createdAt) : new Date();
          const orderTime = rawDate.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).replace('.', ':') + ' WIB';

          const rawStatus = String(attr.menu_status || attr.status_pesanan || attr.status || 'pending').toLowerCase();
          let displayStatus = 'Menunggu Konfirmasi';
          if (rawStatus.includes('disiapkan') || rawStatus === 'sedang_disiapkan') displayStatus = 'Sedang Disiapkan';
          else if (rawStatus.includes('siap') || rawStatus === 'siap_diambil') displayStatus = 'Siap Diambil';
          else if (rawStatus.includes('selesai')) displayStatus = 'Selesai';

          const fullOrderId = attr.order_id || attr.orderId || `#SC-${item.id}`;
          const cleanOrderId = String(fullOrderId).replace('#', '').trim();

          return {
            id: item.id,
            orderId: fullOrderId,
            rawOrderId: cleanOrderId,
            customerName: attr.customer_name || userObj.username || userObj.nama || 'Siswa Pelanggan',
            customerClass: attr.kelas || attr.customer_class || userObj.kelas || '-',
            orderTime: orderTime,
            status: displayStatus,
          };
        });

        if (formattedOrders.length > 0) {
          setOrders(formattedOrders);
        }
      }
    } catch (e) {
      console.warn('Gagal koneksi ke Strapi:', e);
    }

    if (typeof window !== 'undefined') {
      try {
        const localOrders = JSON.parse(localStorage.getItem('smart_canteen_orders') || '[]');
        if (localOrders.length > 0) {
          const localFormatted: Order[] = localOrders.map((attr: any, idx: number) => {
            const rawDate = attr.createdAt ? new Date(attr.createdAt) : new Date();
            const orderTime = rawDate.toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }).replace('.', ':') + ' WIB';

            const rawStatus = String(attr.menu_status || attr.status || 'pending').toLowerCase();
            let displayStatus = 'Menunggu Konfirmasi';
            if (rawStatus.includes('disiapkan') || rawStatus === 'sedang_disiapkan') displayStatus = 'Sedang Disiapkan';
            else if (rawStatus.includes('siap') || rawStatus === 'siap_diambil') displayStatus = 'Siap Diambil';
            else if (rawStatus.includes('selesai')) displayStatus = 'Selesai';

            const fullOrderId = attr.order_id || attr.orderId || `#SC-${idx + 1}`;
            const cleanOrderId = String(fullOrderId).replace('#', '').trim();

            return {
              id: attr.id || attr.documentId || cleanOrderId,
              orderId: fullOrderId,
              rawOrderId: cleanOrderId,
              customerName: attr.customer_name || attr.customerName || 'Siswa Pelanggan',
              customerClass: attr.kelas || attr.customer_class || '-',
              orderTime: orderTime,
              status: displayStatus,
            };
          });

          setOrders(prev => prev.length > 0 ? prev : localFormatted);
        }
      } catch (e) {}
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(() => {
      fetchOrders();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  const filteredOrders = orders.filter(
    (o) =>
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNavigateDetail = (order: Order) => {
    // Navigasi menggunakan ID bersih (contoh: SC260811-473 atau 47)
    const targetParam = order.rawOrderId || String(order.id);
    router.push(`/daftar-pesanan/${encodeURIComponent(targetParam)}`);
  };

  return (
    <div className="min-h-screen w-full bg-white font-sans flex flex-col p-4 sm:p-6 text-slate-800">
      
      {/* HEADER TOPBAR */}
      <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/dasboard-admin" 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-700"
          >
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Daftar Pesanan</h1>
        </div>

      {/* SEARCH BAR */}
      <div className="w-full max-w-md mb-6 relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama atau ID pesanan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#E07A2F] transition-all placeholder:text-slate-400 shadow-xs"
        />
      </div>

      {/* TABEL FULL SCREEN */}
      <div className="w-full border-y sm:border border-gray-200 sm:rounded-2xl overflow-hidden flex-1 flex flex-col bg-white shadow-xs">
        <div className="overflow-x-auto w-full flex-1">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-gray-200 bg-slate-50/80 text-black font-bold text-sm">
                <th className="p-4 sm:p-5">ID Pemesanan</th>
                <th className="p-4 sm:p-5">Nama</th>
                <th className="p-4 sm:p-5 text-center">Kelas</th>
                <th className="p-4 sm:p-5 text-center">Jam Pesan</th>
                <th className="p-4 sm:p-5 text-center">Status</th>
                <th className="p-4 sm:p-5 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm font-medium text-gray-900">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-slate-400 font-normal">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-7 h-7 animate-spin text-[#E07A2F]" />
                      <span>Memuat data pesanan...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    onClick={() => handleNavigateDetail(order)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="p-4 sm:p-5 font-bold text-[#E07A2F] whitespace-nowrap align-middle">
                      {order.orderId}
                    </td>

                    <td className="p-4 sm:p-5 font-bold text-slate-900 whitespace-nowrap align-middle">
                      {order.customerName}
                    </td>

                    <td className="p-4 sm:p-5 text-center text-slate-600 font-medium whitespace-nowrap align-middle">
                      {order.customerClass}
                    </td>

                    <td className="p-4 sm:p-5 text-center text-slate-800 font-semibold whitespace-nowrap align-middle">
                      {order.orderTime}
                    </td>

                    <td className="p-4 sm:p-5 text-center whitespace-nowrap align-middle">
                      <span className={`px-4 py-1.5 text-xs font-bold rounded-full inline-block ${
                        order.status === 'Sedang Disiapkan' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                        order.status === 'Siap Diambil' ? 'bg-blue-100 text-blue-600 border border-blue-200' :
                        order.status === 'Selesai' ? 'bg-green-100 text-green-600 border border-green-200' :
                        'bg-orange-100 text-orange-600 border border-orange-200'
                      }`}>
                        {order.status}
                      </span>
                    </td>

                    <td className="p-4 sm:p-5 text-center whitespace-nowrap align-middle">
                      <div className="flex items-center justify-center text-[#E07A2F] group-hover:translate-x-1 transition-transform">
                        <ChevronRight size={20} strokeWidth={2.5} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-slate-400 font-normal">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Inbox className="w-8 h-8 text-slate-300" />
                      <span>Belum ada pesanan ditemukan.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}