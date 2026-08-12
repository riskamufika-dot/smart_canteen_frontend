'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight } from 'lucide-react';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

interface Order {
  id: number | string;
  documentId?: string;
  orderId: string;
  rawOrderId: string; // ID bersih tanpa tanda #
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
    let allOrders: Order[] = [];

    // 1. Ambil Data Lokal sebagai basis / fallback
    try {
      const localData = JSON.parse(localStorage.getItem('smart_canteen_orders') || '[]');
      allOrders = localData.map((data: any, idx: number) => {
        const attr = data.data || data;
        const rawDate = attr.createdAt ? new Date(attr.createdAt) : new Date();
        const orderTime = rawDate.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).replace('.', ':');

        const rawStatus = String(attr.status || attr.menu_status || attr.order_status || 'Menunggu Konfirmasi');
        let displayStatus = 'Menunggu Konfirmasi';
        if (rawStatus.toLowerCase().includes('disiapkan') || rawStatus === 'sedang_disiapkan') displayStatus = 'Sedang Disiapkan';
        else if (rawStatus.toLowerCase().includes('siap') || rawStatus === 'siap_diambil') displayStatus = 'Siap Diambil';
        else if (rawStatus.toLowerCase().includes('selesai')) displayStatus = 'Selesai';

        const fullOrderId = attr.orderId || attr.order_id || `#SC-${attr.id || idx + 1}`;
        const cleanOrderId = String(fullOrderId).replace('#', '').trim();

        return {
          id: attr.id || idx + 1,
          documentId: attr.documentId,
          orderId: fullOrderId,
          rawOrderId: cleanOrderId,
          customerName: attr.customer_name || attr.customerName || attr.nama_siswa || attr.username || 'Pelanggan',
          customerClass: attr.kelas || attr.customer_class || '-',
          orderTime: orderTime,
          status: displayStatus,
        };
      });
    } catch (err) {
      console.warn('Gagal membaca LocalStorage pesanan:', err);
    }

    // 2. Ambil dari Strapi Backend jika online
    try {
      const res = await fetch(`${STRAPI_URL}/api/orders?populate=*&sort[0]=createdAt:desc`, {
        cache: 'no-store'
      });
      
      if (res.ok) {
        const json = await res.json();
        const dataList = json.data || [];

        const strapiFormatted: Order[] = dataList.map((item: any) => {
          const attr = item.attributes ? { ...item.attributes, id: item.id, documentId: item.documentId } : item;
          const userObj = attr.users_permissions_user?.data?.attributes || attr.users_permissions_user || attr.user || {};

          const rawDate = attr.createdAt ? new Date(attr.createdAt) : new Date();
          const orderTime = rawDate.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).replace('.', ':');

          const rawStatus = String(attr.menu_status || attr.status || attr.order_status || 'Menunggu Konfirmasi');
          let displayStatus = 'Menunggu Konfirmasi';
          if (rawStatus.toLowerCase().includes('disiapkan') || rawStatus === 'sedang_disiapkan') displayStatus = 'Sedang Disiapkan';
          else if (rawStatus.toLowerCase().includes('siap') || rawStatus === 'siap_diambil') displayStatus = 'Siap Diambil';
          else if (rawStatus.toLowerCase().includes('selesai')) displayStatus = 'Selesai';

          const fullOrderId = attr.order_id || attr.orderId || `#SC-${item.id}`;
          const cleanOrderId = String(fullOrderId).replace('#', '').trim();

          return {
            id: item.id,
            documentId: item.documentId,
            orderId: fullOrderId,
            rawOrderId: cleanOrderId,
            customerName: attr.customer_name || attr.nama_siswa || userObj.username || userObj.nama || 'Pelanggan',
            customerClass: attr.kelas || attr.customer_class || userObj.kelas || '-',
            orderTime: orderTime,
            status: displayStatus,
          };
        });

        if (strapiFormatted.length > 0) {
          allOrders = strapiFormatted;
        }
      }
    } catch (e) {
      console.warn('Gagal koneksi ke Strapi, menggunakan data pesanan lokal:', e);
    } finally {
      setOrders(allOrders);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(() => {
      fetchOrders();
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  const filteredOrders = orders.filter(
    (o) =>
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper Navigasi Detail Pesanan yang Aman
  const handleNavigateDetail = (order: Order) => {
    // Prioritas param: documentId -> rawOrderId (tanpa #) -> id
    const targetParam = order.documentId || order.rawOrderId || order.id;
    router.push(`/daftar-pesanan/${encodeURIComponent(targetParam)}`);
  };

  return (
    <div className="min-h-screen bg-white p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Daftar Pesanan</h1>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama atau ID pesanan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-[#E07A2F] text-sm font-medium"
          />
        </div>

        {/* Table Pesanan */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-bold text-sm">
                <th className="py-3 px-4">ID Pemesanan</th>
                <th className="py-3 px-4">Nama</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Jam Pesan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">Memuat data pesanan...</td>
                </tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50">
                    <td className="py-4 px-4 font-extrabold text-[#E07A2F]">{order.orderId}</td>
                    <td className="py-4 px-4 text-gray-900">{order.customerName}</td>
                    <td className="py-4 px-4 text-gray-700">{order.customerClass}</td>
                    <td className="py-4 px-4 text-gray-700">{order.orderTime} WIB</td>
                    <td className="py-4 px-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        order.status === 'Menunggu Konfirmasi' ? 'bg-orange-100 text-orange-600' :
                        order.status === 'Sedang Disiapkan' ? 'bg-yellow-100 text-yellow-700' :
                        order.status === 'Siap Diambil' ? 'bg-blue-100 text-blue-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleNavigateDetail(order)}
                        className="p-2 hover:bg-orange-100 text-[#E07A2F] rounded-full transition-colors cursor-pointer inline-flex items-center justify-center"
                        title="Lihat Detail"
                      >
                        <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">Tidak ada pesanan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}