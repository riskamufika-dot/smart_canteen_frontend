'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, ClipboardList, Utensils, BarChart2, Menu, X, RefreshCw } from 'lucide-react';

type StatusPesanan = 'Menunggu Konfirmasi' | 'Sedang Disiapkan' | 'Siap Diambil' | 'Selesai';

interface OrderItem {
  id?: number | string;
  name?: string;
  nama?: string;
  price?: number;
  harga?: number;
  quantity?: number;
}

interface Pesanan {
  id: string | number;
  strapiId: number | string;
  namaSiswa: string;
  waktu: string;
  status: StatusPesanan;
  menuSummary: string;
  totalPrice: number;
}

export default function DashboardAdmin() {
  const router = useRouter();

  // State buat buka/tutup sidebar di mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // State Tanggal Otomatis (Real-time Hari Ini)
  const [currentDate, setCurrentDate] = useState<string>('');

  // State Data Pesanan dari Database Strapi
  const [allOrders, setAllOrders] = useState<Pesanan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);

  // FUNGSI HELPER AMBIL DRAFT MENU DARI DATA ITEMS STRAPI
  const formatMenuSummary = (itemsRaw: any, fallbackName?: string) => {
    if (Array.isArray(itemsRaw) && itemsRaw.length > 0) {
      return itemsRaw
        .map((it: OrderItem) => `${it.quantity || 1}x ${it.name || it.nama || 'Menu'}`)
        .join(', ');
    }
    return fallbackName || 'Pesanan Makanan';
  };

  // FUNGSI FETCH DATA DARI STRAPI (COLLECTION TYPE: ORDER)
  const fetchOrdersFromStrapi = async (isBackgroundFetch = false) => {
    if (!isBackgroundFetch) setLoading(true);
    try {
      const res = await fetch('http://localhost:1337/api/orders?sort[0]=createdAt:desc&populate=*');

      if (res.ok) {
        const result = await res.json();
        const rawData = result.data || [];

        const formattedOrders: Pesanan[] = rawData.map((item: any) => {
          const attr = item.attributes ? { ...item.attributes, id: item.id } : item;
          const userAttr = attr.users_permissions_user?.data?.attributes || attr.user || {};

          // Format waktu (contoh: 09:30)
          const createdAtDate = new Date(attr.createdAt || new Date());
          const waktuFormatted = createdAtDate
            .toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            })
            .replace('.', ':');

          // Rincian Menu
          const summary = formatMenuSummary(attr.items, attr.menu_name || attr.menuName);

          return {
            id: attr.order_id || attr.orderId || `#SC-${item.id}`,
            strapiId: item.id,
            namaSiswa: userAttr.username || attr.nama_siswa || attr.namaSiswa || 'Siswa',
            waktu: waktuFormatted,
            status: (attr.menu_status || attr.status || 'Menunggu Konfirmasi') as StatusPesanan,
            menuSummary: summary,
            totalPrice: Number(attr.total_price || attr.totalPrice) || 0,
          };
        });

        setAllOrders(formattedOrders);
      } else {
        throw new Error('Gagal mengambil data dari Strapi');
      }
    } catch (err) {
      console.warn('Backend Strapi offline / error, menggunakan LocalStorage.');
      const localData = JSON.parse(localStorage.getItem('smart_canteen_orders') || '[]');
      const fallback: Pesanan[] = localData.map((data: any, idx: number) => {
        const itemData = data.data || data;
        return {
          id: itemData.orderId || itemData.order_id || `#SC-${idx + 1}`,
          strapiId: itemData.id || idx + 1,
          namaSiswa: itemData.namaSiswa || 'Siswa',
          waktu: '09:30',
          status: itemData.status || 'Menunggu Konfirmasi',
          menuSummary: formatMenuSummary(itemData.items),
          totalPrice: Number(itemData.totalPrice || itemData.total_price) || 0,
        };
      });
      setAllOrders(fallback);
    } finally {
      if (!isBackgroundFetch) setLoading(false);
    }
  };

  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    setCurrentDate(formattedDate);

    // 1. Fetch data pertama kali
    fetchOrdersFromStrapi();

    // 2. AUTO-REFRESH (Polling): Cek otomatis ke Strapi setiap 5 detik
    const interval = setInterval(() => {
      fetchOrdersFromStrapi(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // KALKULASI RINGKASAN DATA
  const totalPesanan = allOrders.length;
  const totalMenunggu = allOrders.filter(
    (p) => (p.status || '').toLowerCase().includes('menunggu')
  ).length;
  const totalDisiapkan = allOrders.filter(
    (p) => (p.status || '').toLowerCase().includes('disiapkan')
  ).length;
  const totalSiap = allOrders.filter(
    (p) => (p.status || '').toLowerCase().includes('siap')
  ).length;

  // TABEL HANYA MENAMPILKAN 4 PESANAN TERBARU
  const recentOrders = allOrders.slice(0, 4);

  // FUNGSI MENGUBAH STATUS PESANAN KE STRAPI DATABASE
  const handleNextStatus = async (item: Pesanan) => {
    if (item.status === 'Siap Diambil') return;

    let nextStatus: StatusPesanan = item.status;
    if (item.status === 'Menunggu Konfirmasi') nextStatus = 'Sedang Disiapkan';
    else if (item.status === 'Sedang Disiapkan') nextStatus = 'Siap Diambil';

    setUpdatingId(item.strapiId);

    // 1. Update State UI secara Cepat
    setAllOrders((prevOrders) =>
      prevOrders.map((ord) =>
        ord.strapiId === item.strapiId ? { ...ord, status: nextStatus } : ord
      )
    );

    // 2. Kirim Update ke Strapi Backend (PUT /api/orders/:id)
    try {
      await fetch(`http://localhost:1337/api/orders/${item.strapiId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            menu_status: nextStatus,
            status: nextStatus,
          },
        }),
      });
    } catch (err) {
      console.warn('Gagal sync status ke Strapi, tersimpan secara lokal.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Helper Warna Button Status
  const getStatusStyle = (status: StatusPesanan) => {
    const s = (status || '').toLowerCase();
    if (s.includes('siap')) {
      return 'bg-green-100 text-green-700 hover:bg-green-200';
    }
    if (s.includes('disiapkan')) {
      return 'bg-orange-100 text-orange-700 hover:bg-orange-200';
    }
    if (s.includes('menunggu')) {
      return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200';
    }
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-gray-900">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Left */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 p-6 flex flex-col gap-6 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Smart Canteen Logo"
              width={40}
              height={40}
              className="rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40';
              }}
            />
            <div className="font-bold text-xl leading-tight">
              <span className="text-orange-500">Smart </span>
              <span className="text-gray-900">Canteen</span>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
            A
          </div>
          <div>
            <h4 className="font-bold text-sm text-gray-900">Admin</h4>
            <p className="text-xs text-gray-500">Penjual</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <Link
            href="/dasboard-admin"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 bg-orange-50 text-orange-500 rounded-full font-medium text-sm transition"
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>

          <Link
            href="/daftar-pesanan"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-full font-medium text-sm transition"
          >
            <ClipboardList className="w-5 h-5" />
            Daftar Pesanan
          </Link>

          <Link
            href="/kelola-menu"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-full font-medium text-sm transition"
          >
            <Utensils className="w-5 h-5" />
            Kelola Menu
          </Link>

          <Link
            href="/laporan"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-full font-medium text-sm transition"
          >
            <BarChart2 className="w-5 h-5" />
            Laporan
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 w-full min-w-0">
        {/* Topbar mobile */}
        <div className="flex items-center justify-between lg:hidden mb-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-white border border-gray-100 shadow-sm text-gray-600"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="font-bold text-lg">
            <span className="text-orange-500">Smart </span>
            <span className="text-gray-900">Canteen</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Dashboard</h1>
            <p className="text-gray-500 text-sm">Halo, Admin!</p>
            <p className="text-gray-500 text-sm">Berikut ringkasan data hari ini.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchOrdersFromStrapi(false)}
              className="p-2 bg-gray-100 text-gray-600 hover:text-orange-500 rounded-full transition"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-xs font-medium self-start">
              {currentDate || 'Loading tanggal...'}
            </div>
          </div>
        </div>

        {/* 4 KOTAK RINGKASAN DATA */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
            <span className="text-[10px] md:text-xs font-bold tracking-wider text-gray-400 uppercase block mb-2">
              Total Pesanan
            </span>
            <span className="text-2xl md:text-4xl font-extrabold text-gray-900 block mb-1">
              {loading ? '-' : totalPesanan}
            </span>
            <span className="text-xs text-gray-400">Pesanan</span>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
            <span className="text-[10px] md:text-xs font-bold tracking-wider text-gray-400 uppercase block mb-2">
              Menunggu
            </span>
            <span className="text-2xl md:text-4xl font-extrabold text-gray-900 block mb-1">
              {loading ? '-' : totalMenunggu}
            </span>
            <span className="text-xs text-gray-400">Pesanan</span>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
            <span className="text-[10px] md:text-xs font-bold tracking-wider text-gray-400 uppercase block mb-2">
              Sedang Disiapkan
            </span>
            <span className="text-2xl md:text-4xl font-extrabold text-orange-500 block mb-1">
              {loading ? '-' : totalDisiapkan}
            </span>
            <span className="text-xs text-gray-400">Pesanan</span>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
            <span className="text-[10px] md:text-xs font-bold tracking-wider text-gray-400 uppercase block mb-2">
              Siap Diambil
            </span>
            <span className="text-2xl md:text-4xl font-extrabold text-green-500 block mb-1">
              {loading ? '-' : totalSiap}
            </span>
            <span className="text-xs text-gray-400">Pesanan</span>
          </div>
        </div>

        {/* PESANAN TERBARU SECTION */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Pesanan Terbaru</h2>

            <button
              onClick={() => router.push('/daftar-pesanan')}
              className="text-orange-500 text-sm font-semibold hover:underline"
            >
              Lihat Semua
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
              <p className="text-xs font-medium">Memuat data pesanan...</p>
            </div>
          ) : recentOrders.length > 0 ? (
            <div className="flex flex-col gap-3">
              {recentOrders.map((item) => (
                <div
                  key={item.strapiId}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3.5 px-4 hover:bg-gray-50/80 rounded-xl transition border-b border-gray-100 last:border-none"
                >
                  {/* ID & Siswa */}
                  <div className="sm:w-1/4 flex flex-col">
                    <span className="font-bold text-sm text-gray-900">{item.id}</span>
                    <span className="text-xs text-gray-500 font-medium">{item.namaSiswa}</span>
                  </div>

                  {/* Detail Menu Makanan yang dipesan */}
                  <div className="sm:w-2/5 flex flex-col">
                    <span className="text-xs font-bold text-gray-800 truncate" title={item.menuSummary}>
                      {item.menuSummary}
                    </span>
                    {item.totalPrice > 0 && (
                      <span className="text-[11px] text-gray-400 font-medium">
                        Rp{item.totalPrice.toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>

                  {/* Waktu */}
                  <span className="text-xs text-gray-400 sm:w-1/6">{item.waktu} WIB</span>

                  {/* Tombol Status */}
                  <div className="sm:w-1/5 sm:text-right">
                    <button
                      onClick={() => handleNextStatus(item)}
                      disabled={item.status === 'Siap Diambil' || updatingId === item.strapiId}
                      title={
                        item.status === 'Siap Diambil'
                          ? 'Status akhir — tidak bisa diubah lagi'
                          : 'Klik untuk mengubah status'
                      }
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                        item.status === 'Siap Diambil'
                          ? 'cursor-default'
                          : 'active:scale-95 cursor-pointer'
                      } ${getStatusStyle(item.status)}`}
                    >
                      {updatingId === item.strapiId ? 'Memproses...' : item.status}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400 text-sm">
              Belum ada pesanan terbaru hari ini.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}