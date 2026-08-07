'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Star, Plus, LogOut, Search } from 'lucide-react';
import Link from 'next/link';
import { getImageUrl, STRAPI_URL } from '@/lib/getImageUrl';

interface MenusRepsonse {
  res: {
    data: Array<{
      id: number;
      documentId: string;
      name?: string;
      category?: string;
      price?: number;
      stock?: number;
      ketersediaan?: string;
      description?: string;
      slug?: any;
      createdAt?: string;
      updatedAt?: string;
      publishedAt?: string;
      image?: any;
      attributes?: any;
      tenant?: any;
    }>;
    meta: {
      pagination: {
        page: number;
        pageSize: number;
        pageCount: number;
        total: number;
      };
    };
  };
}

function MenuContent() {
  const [data, setData] = useState<MenusRepsonse['res'] | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. Membaca nomor page dari URL jika pengguna kembali dari halaman detail
  const pageParam = searchParams?.get('page');
  const initialSection = pageParam ? Math.min(Math.max(Number(pageParam), 1), 4) : 1;

  const [activeSection, setActiveSection] = useState<number>(initialSection);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Ambil Data dari Database Strapi
  useEffect(() => {
    async function getAboutData() {
      setLoading(true);
      try {
        const response = await fetch(
          `${STRAPI_URL}/api/menus?populate=*&pagination[limit]=10000`
        );
        const res: MenusRepsonse['res'] = await response.json();
        setData(res);
      } catch (error) {
        console.error({ error });
      } finally {
        setLoading(false);
      }
    }
    getAboutData();
  }, []);

  // Update activeSection jika query URL berubah
  useEffect(() => {
    if (pageParam) {
      setActiveSection(Number(pageParam));
    }
  }, [pageParam]);

  // Helper Ambil Nama Menu Aman (Strapi v4/v5/Flat)
  const getMenuName = (menu: any) => {
    if (!menu) return 'Menu Kantin';
    const attr = menu.attributes || menu;
    return attr.name || attr.nama || 'Menu Kantin';
  };

  // Helper Ambil Harga Menu Aman
  const getMenuPrice = (menu: any) => {
    if (!menu) return 0;
    const attr = menu.attributes || menu;
    return Number(attr.price || attr.harga || 0);
  };

  // 2. Filter Search pada Seluruh Data Database
  const filteredMenus = useMemo(() => {
    if (!data?.data) return [];

    const query = searchTerm.toLowerCase().trim();
    if (!query) return data.data;

    return data.data.filter((menu) => {
      const name = getMenuName(menu);
      const cleanMenuName = name.toLowerCase().replace(/\s+/g, ' ');
      const cleanQuery = query.replace(/\s+/g, ' ');

      return cleanMenuName.includes(cleanQuery);
    });
  }, [data, searchTerm]);

  // 3. Pembagian 4 Section (Page 1-3 = 12 Menu, Page 4 = Sisanya)
  const paginatedMenus = useMemo(() => {
    if (searchTerm.trim() !== '') {
      return filteredMenus;
    }

    if (activeSection === 1) {
      return filteredMenus.slice(0, 12);
    } else if (activeSection === 2) {
      return filteredMenus.slice(12, 24);
    } else if (activeSection === 3) {
      return filteredMenus.slice(24, 36);
    } else if (activeSection === 4) {
      return filteredMenus.slice(36);
    }

    return [];
  }, [filteredMenus, activeSection, searchTerm]);

  // Navigasi ke Halaman Detail Sambil Membawa Parameter Page
  const handleGoToDetail = (menu: any) => {
    const targetId = menu.documentId || menu.id;
    router.push(`/menu/${targetId}?page=${activeSection}`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setActiveSection(1);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-20 w-full overflow-x-hidden">
      
      {/* --- MAIN CONTENT --- */}
      <main className="w-full pt-6 px-6 sm:px-12 md:px-16">

        {/* BANNER HEADER */}
        <div className="relative w-full h-64 sm:h-72 md:h-80 overflow-hidden rounded-[36px] bg-gray-900 shadow-sm border border-gray-100">
          <img
            src="/bg_makanan.jpeg"
            alt="Banner Makanan"
            className="w-full h-full object-cover object-center opacity-80 brightness-90"
          />

          <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center px-4 text-center">
            <h1 className="text-white text-3xl sm:text-4xl font-serif font-normal drop-shadow-md mb-1">
              Selamat Datang
            </h1>
            <p className="text-white text-sm sm:text-base font-sans font-light drop-shadow-sm mb-5">
              Cari makanan favoritmu hari ini!
            </p>

            {/* Input Search */}
            <div className="relative w-full max-w-md sm:max-w-lg">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full rounded-full bg-white px-5 py-3 pl-11 text-sm text-gray-700 placeholder-gray-400 shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Title Section */}
        <div className="mt-10 flex items-center justify-between">
          <h3 className="text-2xl sm:text-3xl font-serif font-medium text-gray-900">Menu Kami</h3>
          <span className="text-xs sm:text-sm font-medium text-gray-400">
            {searchTerm.trim() !== ''
              ? `Hasil pencarian: ${filteredMenus.length} menu`
              : `Halaman ${activeSection} dari 4`}
          </span>
        </div>

        {/* --- GRID MENU --- */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {loading ? (
            <div className="col-span-2 text-center py-10 text-gray-400">
              Memuat menu...
            </div>
          ) : paginatedMenus.length > 0 ? (
            paginatedMenus.map((menu) => {
              const name = getMenuName(menu);
              const price = getMenuPrice(menu);
              const imgUrl = getImageUrl(menu);

              return (
                <div
                  key={menu.id}
                  className="flex items-center gap-4 rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md min-h-[140px]"
                >
                  {/* Foto Makanan */}
                  <div className="h-28 w-28 sm:h-32 sm:w-32 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                    <img
                      src={imgUrl}
                      alt={name}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>

                  {/* Info Makanan */}
                  <div className="flex flex-grow flex-col justify-between py-1 h-full min-w-0">
                    <div>
                      <h4 className="text-base sm:text-lg font-serif font-medium text-gray-800 line-clamp-2 leading-snug break-words">
                        {name}
                      </h4>
                      {/* HARGA DIKUNCI whitespace-nowrap AGAR 'Rp' TIDAK TERPISAH */}
                      <p className="text-sm sm:text-base font-bold text-gray-900 mt-1 whitespace-nowrap">
                        Rp {price.toLocaleString('id-ID')}
                      </p>
                      <div className="mt-1.5 flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={15} fill="#FFD700" className="text-yellow-400" />
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end mt-2">
                      {/* TOMBOL PLUS */}
                      <button
                        onClick={() => handleGoToDetail(menu)}
                        className="rounded-xl bg-orange-500 p-2 text-black shadow-md hover:bg-orange-600 transition-colors active:scale-95 flex items-center justify-center"
                        title="Lihat Detail Menu"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 text-center py-10 text-gray-500">
              Menu tidak ditemukan.
            </div>
          )}
        </div>

        {/* --- PAGINATION --- */}
        {searchTerm.trim() === '' && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              onClick={() => {
                const nextSec = Math.max(activeSection - 1, 1);
                setActiveSection(nextSec);
                router.push(`/menu?page=${nextSec}`);
              }}
              disabled={activeSection === 1}
              className="px-2 py-1 text-sm text-gray-500 hover:text-black disabled:opacity-30 transition-colors"
            >
              &lt;
            </button>

            {[1, 2, 3, 4].map((sectionNum) => (
              <button
                key={sectionNum}
                onClick={() => {
                  setActiveSection(sectionNum);
                  setSearchTerm('');
                  router.push(`/menu?page=${sectionNum}`);
                }}
                className={`h-9 w-9 rounded-full text-xs font-semibold transition-all ${
                  activeSection === sectionNum
                    ? 'bg-orange-500 text-black shadow-md scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {sectionNum}
              </button>
            ))}

            <button
              onClick={() => {
                const nextSec = Math.min(activeSection + 1, 4);
                setActiveSection(nextSec);
                router.push(`/menu?page=${nextSec}`);
              }}
              disabled={activeSection === 4}
              className="px-2 py-1 text-sm text-gray-500 hover:text-black disabled:opacity-30 transition-colors"
            >
              &gt;
            </button>
          </div>
        )}

      </main>
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center text-gray-400">
        Memuat menu...
      </div>
    }>
      <MenuContent />
    </Suspense>
  );
}