'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  FileText, 
  LogOut, 
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import Link from 'next/link';

// CONFIG STRAPI URL & TOKEN
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.NEXT_PUBLIC_STRAPI_API_TOKEN;

export default function Dashboard() {
  // 1. State untuk menampung total pengguna dari Strapi
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);

  // 2. State untuk menu toggle responsif (Layar HP)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Helper untuk mengambil Token secara aman (tidak pernah mengirim token 'undefined' / 'null')
  const getAuthToken = () => {
    if (API_TOKEN && API_TOKEN !== 'undefined') return API_TOKEN;
    if (typeof window !== 'undefined') {
      const localToken = localStorage.getItem('token');
      if (localToken && localToken !== 'null' && localToken !== 'undefined') {
        return localToken;
      }
    }
    return null;
  };

  // 3. Fetch data pengguna dari API Strapi
  useEffect(() => {
    const fetchTotalUsers = async () => {
      try {
        setLoadingUsers(true);
        const activeToken = getAuthToken();

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (activeToken) {
          headers['Authorization'] = `Bearer ${activeToken}`;
        }

        const res = await fetch(`${STRAPI_URL}/api/users`, {
          method: 'GET',
          headers,
        });

        // HILANGKAN 'throw new Error' AGAR TIDAK POP-UP EROR MERAH
        if (!res.ok) {
          console.warn('Strapi menolak request fetch total users. Status:', res.status);
          setTotalUsers(0);
          return;
        }

        const data = await res.json();
        setTotalUsers(Array.isArray(data) ? data.length : 0);
      } catch (error) {
        console.error('Error fetching total users:', error);
        setTotalUsers(0);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchTotalUsers();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8 text-slate-800 font-sans">
      
      {/* ================= HEADER MOBILE ================= */}
      <div className="flex lg:hidden justify-between items-center bg-white p-4 rounded-2xl mb-4 shadow-sm border border-slate-100 w-full max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="Smart Canteen Logo" 
            className="h-8 w-8 object-contain rounded-xl"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span className="text-lg font-bold">
            <span className="text-orange-500">Smart</span> Canteen
          </span>
        </div>

        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2.5 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100 cursor-pointer"
          aria-label="Toggle Navigation Menu"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-xl relative">
        
        {/* OVERLAY HITAM TRANSPARAN UNTUK HP */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* ================= SIDEBAR ================= */}
        <aside className={`
          fixed lg:static top-0 left-0 h-full lg:h-auto w-64 bg-white z-50 p-6 flex flex-col justify-between border-r border-slate-100
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          shadow-2xl lg:shadow-none
        `}>
          <div>
            {/* Logo Sidebar */}
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo.png" 
                  alt="Smart Canteen Logo" 
                  className="h-10 w-10 object-contain rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <span className="text-xl font-bold">
                  <span className="text-orange-500">Smart</span> Canteen
                </span>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Card */}
            <div className="mb-8 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
                <Users className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Admin</h4>
                <p className="text-xs text-slate-400">Admin Sistem</p>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex flex-col gap-3">
              <Link
                href="/admin-aplikasi/dasboard-aplikasi"
                onClick={() => setIsSidebarOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-orange-200 bg-orange-50 py-2.5 font-semibold text-orange-500 shadow-sm transition-colors hover:bg-orange-100"
              >
                <LayoutDashboard size={18} />
                Dashboard
              </Link>

              <Link 
                href="/admin-aplikasi/kelola-kantin"
                onClick={() => setIsSidebarOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-orange-200 bg-white py-2.5 font-semibold text-orange-500 transition-colors hover:bg-orange-50"
              >
                <Store size={18} />
                Kelola Kantin
              </Link>

              <Link 
                href="/admin-aplikasi/kelola-user"
                onClick={() => setIsSidebarOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-orange-200 bg-white py-2.5 font-semibold text-orange-500 transition-colors hover:bg-orange-50"
              >
                <Users size={18} />
                Kelola Pengguna
              </Link>

              <Link 
                href="/admin-aplikasi/laporan-admin"
                onClick={() => setIsSidebarOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-orange-200 bg-white py-2.5 font-semibold text-orange-500 transition-colors hover:bg-orange-50"
              >
                <FileText size={18} />
                Laporan
              </Link>
            </nav>
          </div>

          {/* Logout Button */}
          <button className="flex items-center gap-3 font-semibold text-slate-700 hover:text-red-500 transition-colors px-2 py-2 mt-6 cursor-pointer">
            <LogOut className="h-5 w-5" />
            <span>Keluar</span>
          </button>
        </aside>

        {/* ================= MAIN CONTENT ================= */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">Halo, Admin.</p>
          </header>

          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 p-4 bg-white shadow-sm">
              <span className="text-xs font-bold text-slate-800">Total Kantin</span>
              <div className="my-1 text-3xl font-extrabold text-slate-900">9</div>
              <div className="flex items-center text-[10px] font-semibold text-emerald-600">
                <span className="mr-0.5">↑ 2</span> dari bulan lalu
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 bg-white shadow-sm">
              <span className="text-xs font-bold text-slate-800">Total Pengguna</span>
              <div className="my-1 text-3xl font-extrabold text-slate-900">
                {loadingUsers ? '...' : totalUsers}
              </div>
              <div className="flex items-center text-[10px] font-semibold text-emerald-600">
                <span className="mr-0.5">↑ Realtime</span> dari Strapi
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 bg-white shadow-sm">
              <span className="text-xs font-bold text-slate-800">Total Pesanan</span>
              <div className="my-1 text-3xl font-extrabold text-orange-500">500</div>
              <div className="flex items-center text-[10px] font-semibold text-emerald-600">
                <span className="mr-0.5">↑ 24</span> dari bulan lalu
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 bg-white shadow-sm">
              <span className="text-xs font-bold text-slate-800">Total Pendapatan</span>
              <div className="my-1 text-lg font-extrabold text-emerald-600">Rp 12.500.000</div>
              <div className="flex items-center text-[10px] font-semibold text-emerald-600">
                <span className="mr-0.5">↑ 15%</span> dari bulan lalu
              </div>
            </div>
          </div>

          {/* Middle Section: Chart & Top Canteen */}
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 p-4 bg-white shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Grafik Pesanan</h3>
                <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 cursor-pointer">
                  <span>7 Hari Lalu</span>
                  <ChevronDown className="h-3 w-3" />
                </div>
              </div>

              <div className="h-40 w-full overflow-x-auto">
                <svg className="h-full w-full min-w-[300px] overflow-visible" viewBox="0 0 500 120">
                  <line x1="30" y1="0" x2="480" y2="0" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="30" y1="30" x2="480" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="30" y1="60" x2="480" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="30" y1="90" x2="480" y2="90" stroke="#f1f5f9" strokeWidth="1" />

                  <text x="15" y="5" className="text-[10px] fill-slate-400">400</text>
                  <text x="15" y="35" className="text-[10px] fill-slate-400">300</text>
                  <text x="15" y="65" className="text-[10px] fill-slate-400">200</text>
                  <text x="15" y="95" className="text-[10px] fill-slate-400">100</text>
                  <text x="20" y="118" className="text-[10px] fill-slate-400">0</text>

                  <path
                    d="M 50 90 L 150 65 L 250 35 L 350 70 L 450 15"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="2"
                  />

                  <text x="40" y="118" className="text-[10px] fill-slate-600 font-medium">Senin</text>
                  <text x="135" y="118" className="text-[10px] fill-slate-600 font-medium">Selasa</text>
                  <text x="235" y="118" className="text-[10px] fill-slate-600 font-medium">Rabu</text>
                  <text x="335" y="118" className="text-[10px] fill-slate-600 font-medium">Kamis</text>
                  <text x="435" y="118" className="text-[10px] fill-slate-600 font-medium">Jum'at</text>
                </svg>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 bg-white shadow-sm">
              <h3 className="mb-3 text-sm font-bold text-slate-800">Kantin Terlaris</h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5 bg-slate-50/50">
                  <div className="h-10 w-12 rounded-lg bg-orange-100 flex items-center justify-center font-bold text-orange-500 text-xs">#1</div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Kantin Mas Arjo</h4>
                    <p className="text-[10px] text-slate-400">254 Pesanan</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5 bg-slate-50/50">
                  <div className="h-10 w-12 rounded-lg bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">#2</div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Kedai Hampura</h4>
                    <p className="text-[10px] text-slate-400">240 Pesanan</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5 bg-slate-50/50">
                  <div className="h-10 w-12 rounded-lg bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">#3</div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Warung Nasi Bu Joe</h4>
                    <p className="text-[10px] text-slate-400">150 Pesanan</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table: Pesanan Terbaru */}
          <div className="rounded-2xl border border-slate-200 p-4 bg-white shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Pesanan Terbaru</h3>
              <Link 
                href="/admin-aplikasi/pesanan"
                className="rounded-full bg-orange-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-600 cursor-pointer"
              >
                Lihat Semua
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-200 font-bold text-slate-700">
                    <th className="pb-3">Id Pesanan</th>
                    <th className="pb-3">Kantin</th>
                    <th className="pb-3">Pelanggan</th>
                    <th className="pb-3">Total</th>
                    <th className="pb-3">Waktu</th>
                    <th className="pb-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="py-3 font-semibold text-slate-800">#000123</td>
                    <td className="py-3">Kantin Mas Arjo</td>
                    <td className="py-3">Setia Dewi</td>
                    <td className="py-3 font-semibold text-slate-800">Rp 16.000</td>
                    <td className="py-3">12 Mei 2026, 09:40</td>
                    <td className="py-3 text-center">
                      <span className="rounded-full border border-emerald-400 bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-600">
                        Selesai
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold text-slate-800">#000124</td>
                    <td className="py-3">Kantin Teh Nci</td>
                    <td className="py-3">Siti Mae</td>
                    <td className="py-3 font-semibold text-slate-800">Rp 10.000</td>
                    <td className="py-3">12 Mei 2026, 09:58</td>
                    <td className="py-3 text-center">
                      <span className="rounded-full border border-emerald-400 bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-600">
                        Selesai
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold text-slate-800">#000125</td>
                    <td className="py-3">Kedai Hampura</td>
                    <td className="py-3">Luna Freya</td>
                    <td className="py-3 font-semibold text-slate-800">Rp 6.000</td>
                    <td className="py-3">12 Mei 2026, 10:10</td>
                    <td className="py-3 text-center">
                      <span className="rounded-full border border-orange-400 bg-orange-50 px-3 py-1 text-[10px] font-semibold text-orange-500">
                        Sedang Disiapkan
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}