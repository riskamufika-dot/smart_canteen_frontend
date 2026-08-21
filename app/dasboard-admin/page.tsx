'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, ChevronRight, LogOut } from 'lucide-react';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

// Daftar email khusus Admin / Penjual
const ADMIN_EMAILS = ['adminkantin@gmail.com'];

type StatusPesanan = 'Menunggu Konfirmasi' | 'Sedang Disiapkan' | 'Siap Diambil' | 'Selesai';

interface Pesanan {
  id: string;
  strapiId: number | string;
  namaSiswa: string;
  waktu: string;
  status: StatusPesanan;
  totalPrice: number;
}

export default function DashboardAdmin() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>('');
  const [allOrders, setAllOrders] = useState<Pesanan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [authorized, setAuthorized] = useState<boolean>(false);

  // State Profil Penjual
  const [userData, setUserData] = useState<{ username: string; nama?: string; email?: string } | null>(null);

  // 1. PROTEKSI HALAMAN & FETCH PROFIL PENJUAL
  useEffect(() => {
    const checkAuthAndFetchProfile = () => {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (!savedUser || !token) {
        router.push('/');
        return;
      }

      try {
        const parsedUser = JSON.parse(savedUser);
        const userEmail = (parsedUser.email || '').toLowerCase();

        if (!ADMIN_EMAILS.includes(userEmail)) {
          alert('Akses ditolak! Halaman ini hanya untuk Admin Penjual.');
          router.push('/home');
          return;
        }

        setUserData(parsedUser);
        setAuthorized(true);
      } catch (e) {
        console.error('Error parsing user storage:', e);
        router.push('/');
      }
    };

    checkAuthAndFetchProfile();
  }, [router]);

  // FUNGSI LOGOUT (DIPERBAIKI)
  const handleLogout = () => {
    // 1. Hapus semua data auth dari localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
    
    // Optional: Bersihkan seluruh storage jika diperlukan
    // localStorage.clear();

    // 2. Beri notifikasi singkat
    alert('Anda telah keluar dari akun Admin.');

    // 3. Force redirect ke halaman auth/login
    router.replace('/'); 
  };

  const namaPenjual = userData?.nama || userData?.username || 'Admin Kantin';
  const inisialPenjual = namaPenjual.charAt(0).toUpperCase();

  // 2. FETCH DATA PESANAN UTAMA DARI STRAPI
  const fetchOrdersFromStrapi = async (isBackgroundFetch = false) => {
    if (!isBackgroundFetch) setLoading(true);
    try {
      const res = await fetch(`${STRAPI_URL}/api/orders?sort[0]=createdAt:desc&populate=*`);

      if (res.ok) {
        const result = await res.json();
        const rawData = result.data || [];

        const formattedOrders: Pesanan[] = rawData.map((item: any) => {
          const attr = item.attributes ? { ...item.attributes, id: item.id } : item;
          const userAttr = attr.users_permissions_user?.data?.attributes || attr.user || {};

          const createdAtDate = new Date(attr.createdAt || new Date());
          const waktuFormatted = createdAtDate
            .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            .replace('.', ':');

          let normStatus: StatusPesanan = 'Menunggu Konfirmasi';
          const rawStatus = (
            attr.menu_status || 
            attr.status || 
            attr.order_status || 
            ''
          ).toString().toLowerCase().trim();

          if (
            rawStatus.includes('disiapkan') || 
            rawStatus.includes('proses') || 
            rawStatus.includes('processing') || 
            rawStatus.includes('preparing')
          ) {
            normStatus = 'Sedang Disiapkan';
          } else if (
            rawStatus.includes('siap') || 
            rawStatus.includes('ready') || 
            rawStatus.includes('diambil')
          ) {
            normStatus = 'Siap Diambil';
          } else if (
            rawStatus.includes('selesai') || 
            rawStatus.includes('completed') || 
            rawStatus.includes('done')
          ) {
            normStatus = 'Selesai';
          } else {
            normStatus = 'Menunggu Konfirmasi';
          }

          const namaSiswaAsli =
            attr.customer_name ||
            attr.nama_siswa ||
            attr.namaSiswa ||
            userAttr.username ||
            userAttr.nama ||
            'Siswa Pelanggan';

          const totalHargaAsli = Number(attr.total_price || attr.totalPrice || attr.total) || 0;

          return {
            id: attr.order_id || attr.orderId || `#SC-${item.id}`,
            strapiId: item.id,
            namaSiswa: namaSiswaAsli,
            waktu: waktuFormatted,
            status: normStatus,
            totalPrice: totalHargaAsli,
          };
        });

        setAllOrders(formattedOrders);
      } else {
        throw new Error('Gagal mengambil data dari Strapi');
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
      setAllOrders([]);
    } finally {
      if (!isBackgroundFetch) setLoading(false);
    }
  };

  useEffect(() => {
    const today = new Date();
    setCurrentDate(
      today.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    );

    fetchOrdersFromStrapi();
    const interval = setInterval(() => fetchOrdersFromStrapi(true), 4000);
    return () => clearInterval(interval);
  }, []);

  const totalPesanan = allOrders.length;
  const totalMenunggu = allOrders.filter((p) => p.status === 'Menunggu Konfirmasi').length;
  const totalDisiapkan = allOrders.filter((p) => p.status === 'Sedang Disiapkan').length;
  const totalSiap = allOrders.filter((p) => p.status === 'Siap Diambil').length;

  const recentOrders = allOrders.slice(0, 5);

  const getBadgeStyle = (status: StatusPesanan) => {
    switch (status) {
      case 'Siap Diambil':
        return 'bg-[#E6F7ED] text-[#22AD5C] border-[#22AD5C]/30';
      case 'Sedang Disiapkan':
        return 'bg-[#FFF4E5] text-[#E07A2F] border-[#E07A2F]/30';
      case 'Menunggu Konfirmasi':
        return 'bg-[#FFF8EE] text-[#D97706] border-[#D97706]/30';
      case 'Selesai':
        return 'bg-[#E6F7ED] text-[#22AD5C] border-[#22AD5C]/30';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-600 font-bold">
        Memeriksa hak akses admin...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white font-sans text-gray-900">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 p-6 flex flex-col justify-between transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 shrink-0">
                <Image src="/logo.png" alt="Smart Canteen" fill className="object-contain" />
              </div>
              <h1 className="text-xl font-extrabold tracking-tight">
                <span className="text-[#E07A2F]">Smart </span>
                <span className="text-gray-900">Canteen</span>
              </h1>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl p-4 flex items-center gap-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-gray-800 text-lg shrink-0">
              {inisialPenjual}
            </div>
            <div className="overflow-hidden">
              <h4 className="font-extrabold text-lg text-gray-900 truncate" title={namaPenjual}>
                {namaPenjual}
              </h4>
              <p className="text-sm font-semibold text-gray-500">Penjual</p>
            </div>
          </div>

          <nav className="space-y-3">
            <Link
              href="/dasboard-admin"
              className="flex items-center px-6 py-4 bg-[#FFF8EE] text-[#E07A2F] border border-orange-200/80 rounded-full font-bold text-base"
            >
              Dashboard
            </Link>
            <Link
              href="/daftar-pesanan"
              className="flex items-center px-6 py-4 text-gray-700 hover:bg-gray-50 border border-orange-200/80 rounded-full font-bold text-base"
            >
              <span className="text-[#E07A2F]">Daftar Pesanan</span>
            </Link>
            <Link
              href="/kelola-menu"
              className="flex items-center px-6 py-4 text-gray-700 hover:bg-gray-50 border border-orange-200/80 rounded-full font-bold text-base"
            >
              <span className="text-[#E07A2F]">Kelola Menu</span>
            </Link>
          </nav>
        </div>

        {/* TOMBOL LOGOUT UTAMA (DILENGKAPI type="button" & cursor-pointer) */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 font-bold text-gray-800 hover:text-red-600 px-2 py-3 mt-6 transition-colors cursor-pointer w-full text-left"
        >
          <LogOut className="w-6 h-6 text-red-500" />
          <span className="text-lg text-red-600">Keluar</span>
        </button>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 p-6 md:p-10 w-full min-w-0">
        <div className="flex items-center justify-between lg:hidden mb-6">
          <button onClick={() => setSidebarOpen(true)} className="p-2.5 rounded-2xl bg-white border border-gray-200">
            <Menu className="w-6 h-6" />
          </button>
          <div className="font-extrabold text-xl">
            <span className="text-[#E07A2F]">Smart </span>Canteen
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-900 font-extrabold text-lg">Halo, {namaPenjual}!</p>
            <p className="text-gray-800 font-bold text-base">Berikut ringkasan data hari ini.</p>
          </div>
          <div className="bg-white border border-gray-300 px-5 py-2.5 rounded-full text-sm font-semibold text-gray-500 shadow-2xs self-start">
            {currentDate}
          </div>
        </div>

        {/* CARDS KATEGORI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-300 shadow-2xs text-center flex flex-col justify-between h-full min-h-[180px]">
            <span className="text-xs font-bold text-gray-900 uppercase">Total Pesanan</span>
            <span className="text-3xl md:text-5xl font-black text-gray-900 block my-auto">
              {loading ? '-' : totalPesanan}
            </span>
            <span className="text-xs font-bold text-gray-900">Pesanan</span>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-300 shadow-2xs text-center flex flex-col justify-between h-full min-h-[180px]">
            <span className="text-xs font-bold text-gray-900 uppercase">Menunggu</span>
            <span className="text-3xl md:text-5xl font-black text-gray-900 block my-auto">
              {loading ? '-' : totalMenunggu}
            </span>
            <span className="text-xs font-bold text-gray-900">Pesanan</span>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-300 shadow-2xs text-center flex flex-col justify-between h-full min-h-[180px]">
            <span className="text-xs font-bold text-gray-900 uppercase">Sedang Disiapkan</span>
            <span className="text-3xl md:text-5xl font-black text-[#E07A2F] block my-auto">
              {loading ? '-' : totalDisiapkan}
            </span>
            <span className="text-xs font-bold text-gray-900">Pesanan</span>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-300 shadow-2xs text-center flex flex-col justify-between h-full min-h-[180px]">
            <span className="text-xs font-bold text-gray-900 uppercase">Siap Diambil</span>
            <span className="text-3xl md:text-5xl font-black text-[#22AD5C] block my-auto">
              {loading ? '-' : totalSiap}
            </span>
            <span className="text-xs font-bold text-gray-900">Pesanan</span>
          </div>
        </div>

        {/* TABEL RINGKASAN PESANAN */}
        <div className="bg-white border border-gray-300 rounded-[32px] p-6 md:p-8 shadow-xs">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Daftar Pesanan Terbaru</h2>
            <Link href="/daftar-pesanan" className="text-[#E07A2F] text-lg font-bold hover:underline">
              Lihat Semua
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400 font-medium">Memuat data pesanan...</div>
          ) : recentOrders.length > 0 ? (
            <div className="border border-gray-200 rounded-3xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-white text-gray-900 font-bold text-sm sm:text-base">
                    <th className="py-4 px-6">Id Pesanan</th>
                    <th className="py-4 px-6">Pelanggan</th>
                    <th className="py-4 px-6">Waktu</th>
                    <th className="py-4 px-6">Total</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm sm:text-base font-semibold text-gray-800">
                  {recentOrders.map((item) => (
                    <tr key={item.strapiId} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-4 px-6 font-bold text-gray-900 whitespace-nowrap">{item.id}</td>
                      <td className="py-4 px-6 text-gray-900 font-bold whitespace-nowrap">{item.namaSiswa}</td>
                      <td className="py-4 px-6 text-gray-900 whitespace-nowrap">{item.waktu}</td>
                      <td className="py-4 px-6 font-bold text-gray-900 whitespace-nowrap">
                        Rp {item.totalPrice ? item.totalPrice.toLocaleString('id-ID') : '0'}
                      </td>
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold border ${getBadgeStyle(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <button
                          onClick={() => router.push(`/daftar-pesanan/${item.strapiId}`)}
                          className="p-1.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all cursor-pointer inline-flex items-center justify-center"
                        >
                          <ChevronRight size={18} className="stroke-[2.5]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400 text-sm">Belum ada pesanan terbaru.</div>
          )}
        </div>
      </main>
    </div>
  );
}