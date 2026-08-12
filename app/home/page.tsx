'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Star, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

// CONFIG STRAPI URL LOKAL TANPA FILE LIB
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

// FUNGSI HELPER AMBIL URL GAMBAR STRAPI SECARA LOKAL
const getImageUrl = (item: any): string => {
  if (!item) return '';

  // 1. Ambil objek gambar dari berbagai kemungkinan properti field
  const rawImage =
    item?.image ||
    item?.foto ||
    item?.gambar ||
    item?.banner ||
    item?.benner ||
    item?.cover;

  if (!rawImage) return '';

  // 2. Jika berbentuk string
  if (typeof rawImage === 'string') {
    if (rawImage.startsWith('http://') || rawImage.startsWith('https://')) {
      return rawImage;
    }
    return `${STRAPI_URL}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;
  }

  // 3. Jika berbentuk objek Strapi v4 / v5
  const url =
    rawImage?.data?.attributes?.url ||
    rawImage?.data?.url ||
    rawImage?.attributes?.url ||
    rawImage?.url;

  if (url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${STRAPI_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  // 4. Jika berbentuk Array of Media
  if (Array.isArray(rawImage?.data) && rawImage.data.length > 0) {
    const firstImg = rawImage.data[0];
    const arrayUrl = firstImg?.attributes?.url || firstImg?.url;
    if (arrayUrl) {
      if (arrayUrl.startsWith('http://') || arrayUrl.startsWith('https://')) {
        return arrayUrl;
      }
      return `${STRAPI_URL}${arrayUrl.startsWith('/') ? '' : '/'}${arrayUrl}`;
    }
  }

  return '';
};

interface MenuItem {
  id: number;
  documentId?: string;
  name?: string;
  price?: number;
  image?: any;
  tenant?: any;
}

interface TenantItem {
  id: number;
  documentId?: string;
  name?: string;
  rating?: number;
  banner?: any;
  benner?: any;
  image?: any;
  foto?: any;
  gambar?: any;
  cover?: any;
}

export default function HomePage() {
  const router = useRouter();

  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const menuScrollRef = useRef<HTMLDivElement>(null);
  const storeScrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Data Menu & Toko/Homes dari Strapi
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [resMenus, resHomes] = await Promise.all([
          fetch(`${STRAPI_URL}/api/menus?populate=*&pagination[pageSize]=1000`).catch(() => null),
          fetch(`${STRAPI_URL}/api/homes?populate=*&pagination[pageSize]=1000`).catch(() => null),
        ]);

        let fetchedMenus: MenuItem[] = [];
        let fetchedTenants: TenantItem[] = [];

        if (resMenus && resMenus.ok) {
          try {
            const jsonMenus = await resMenus.json();
            fetchedMenus = jsonMenus?.data || [];
          } catch (e) {
            console.warn('Gagal parsing JSON menu:', e);
          }
        }

        if (resHomes && resHomes.ok) {
          try {
            const jsonHomes = await resHomes.json();
            fetchedTenants = jsonHomes?.data || [];
          } catch (e) {
            console.warn('Gagal parsing JSON homes:', e);
          }
        }

        setMenus(fetchedMenus);
        setTenants(fetchedTenants);
      } catch (error) {
        console.error('Gagal mengambil data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // 2. Filter Rekomendasi / Search Real-Time
  const displayedMenus = useMemo(() => {
    if (!searchTerm.trim()) {
      // Jika tidak mencari: Filter 3 menu spesifik (Es Teh, Rencang, Batagor)
      const priorityNames = ['es teh', 'rencang', 'batagor'];
      const prioritized = menus.filter((menu) => {
        const name = menu.name?.toLowerCase() || '';
        return priorityNames.some((key) => name.includes(key));
      });

      // Jika menu spesifik ditemukan kurang dari 3, tambahkan sisa menu lain sebagai fallback
      if (prioritized.length < 3) {
        const remaining = menus.filter((m) => !prioritized.includes(m));
        return [...prioritized, ...remaining].slice(0, 3);
      }

      return prioritized.slice(0, 3);
    }

    // Jika sedang mencari: Tampilkan SEMUA menu yang cocok dengan kata kunci
    const query = searchTerm.toLowerCase().trim().replace(/\s+/g, ' ');
    return menus.filter((menu) => {
      if (!menu.name) return false;
      return menu.name.toLowerCase().includes(query);
    });
  }, [menus, searchTerm]);

  // 3. Filter Search Real-Time untuk Toko/Kantin
  const filteredTenants = useMemo(() => {
    if (!searchTerm.trim()) return tenants;
    const query = searchTerm.toLowerCase().trim().replace(/\s+/g, ' ');
    return tenants.filter((tenant) => {
      if (!tenant.name) return false;
      return tenant.name.toLowerCase().includes(query);
    });
  }, [tenants, searchTerm]);

  // Handler Scroll Horizontal
  const handleScroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -420 : 420;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleGoToMenuDetail = (menu: MenuItem) => {
    const targetId = menu.documentId || menu.id;
    router.push(`/menu/${targetId}`);
  };

  const handleGoToTenantDetail = (tenant: TenantItem) => {
    const targetId = tenant.documentId || tenant.id;
    router.push(`/toko/${targetId}`);
  };

  // Status Pencarian
  const isSearching = searchTerm.trim() !== '';
  const hasMatchingMenus = displayedMenus.length > 0;
  const hasMatchingTenants = filteredTenants.length > 0;

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-20 w-full overflow-x-hidden">
      
      {/* --- MAIN CONTENT --- */}
      <main className="w-full pt-6 px-6 sm:px-12 md:px-16">
        
        {/* HERO BANNER */}
        <div 
          className="relative h-64 w-full overflow-hidden rounded-[32px] sm:rounded-[40px] bg-cover bg-center sm:h-80 shadow-sm"
          style={{ backgroundImage: "url('/bg_makanan.jpeg')" }}
        >
          <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center px-4 text-center">
            <h2 className="text-2xl font-serif text-white sm:text-4xl">Selamat Datang</h2>
            <p className="mt-2 text-sm text-gray-200 sm:text-lg">Cari makanan favoritmu hari ini!</p>

            <div className="mt-6 flex w-full max-w-xl items-center rounded-full bg-white px-5 py-3 shadow-lg">
              <Search className="text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search makanan atau toko..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ml-3 w-full bg-transparent text-sm sm:text-base outline-none text-gray-800 placeholder-gray-400"
              />
            </div>
          </div>
        </div>

        {/* SECTION 1: REKOMENDASI MENU */}
        {(!isSearching || hasMatchingMenus) && (
          <section className="mt-12 relative group">
            <h3 className="text-2xl font-serif font-medium text-gray-900 sm:text-3xl">
              {isSearching ? 'Hasil Pencarian Menu' : 'Rekomendasi Menu'}
            </h3>

            {loading ? (
              <p className="py-8 text-gray-400">Memuat menu...</p>
            ) : displayedMenus.length > 0 ? (
              <div className="relative mt-6">
                <button 
                  onClick={() => handleScroll(menuScrollRef, 'left')}
                  className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-xl text-orange-500 border border-gray-100 hover:bg-orange-50 hover:scale-110 transition-all cursor-pointer"
                >
                  <ChevronLeft size={28} />
                </button>

                <div 
                  ref={menuScrollRef}
                  className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth py-3 px-1"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {displayedMenus.map((menu) => {
                    const menuImgSrc = getImageUrl(menu);
                    return (
                      <div 
                        key={menu.id} 
                        className="flex min-w-[320px] sm:min-w-[420px] flex-shrink-0 items-center gap-4 sm:gap-6 rounded-[32px] border border-gray-100 bg-white p-4 sm:p-5 shadow-sm transition-all hover:shadow-md"
                      >
                        <div className="h-28 w-28 sm:h-36 sm:w-36 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                          {menuImgSrc ? (
                            <img 
                              src={menuImgSrc} 
                              alt={menu.name || 'Menu'} 
                              className="h-full w-full object-cover" 
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs text-gray-400 bg-gray-50">
                              No Image
                            </div>
                          )}
                        </div>

                        <div className="flex flex-grow flex-col justify-between py-1 h-full min-w-0">
                          <div>
                            <h4 className="text-lg font-serif font-medium text-gray-800 sm:text-xl truncate">
                              {menu.name}
                            </h4>
                            <p className="text-base font-bold text-orange-500 mt-1">
                              Rp {menu.price ? menu.price.toLocaleString('id-ID') : '0'}
                            </p>
                            
                            <div className="mt-2 flex gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} size={16} fill="#FFD700" className="text-yellow-400" />
                              ))}
                            </div>
                          </div>

                          {/* TOMBOL PLUS DENGAN IKON WARNA HITAM */}
                          <div className="flex justify-end mt-3">
                            <button 
                              onClick={() => handleGoToMenuDetail(menu)}
                              className="rounded-2xl bg-orange-500 p-2.5 sm:p-3 text-black shadow-md transition-colors hover:bg-orange-600 active:scale-95 cursor-pointer"
                              title="Lihat Detail Menu"
                            >
                              <Plus size={20} className="text-black" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={() => handleScroll(menuScrollRef, 'right')}
                  className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-xl text-orange-500 border border-gray-100 hover:bg-orange-50 hover:scale-110 transition-all cursor-pointer"
                >
                  <ChevronRight size={28} />
                </button>
              </div>
            ) : null}
          </section>
        )}

        {/* SECTION 2: TOKO KAMI */}
        {(!isSearching || hasMatchingTenants) && (
          <section className="mt-14 relative group">
            <h3 className="text-2xl font-serif font-medium text-gray-900 sm:text-3xl">
              {isSearching ? 'Hasil Pencarian Toko' : 'Toko Kami'}
            </h3>

            {filteredTenants.length > 0 && (
              <div className="relative mt-6">
                <button 
                  onClick={() => handleScroll(storeScrollRef, 'left')}
                  className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg text-orange-500 border border-gray-100 hover:bg-orange-50 hover:scale-110 transition-all cursor-pointer"
                >
                  <ChevronLeft size={24} />
                </button>

                <div 
                  ref={storeScrollRef}
                  className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth py-2 px-1"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {filteredTenants.map((store) => {
                    const storeRating = Number(store.rating) > 0 ? Math.floor(Number(store.rating)) : 5;
                    const storeImgSrc = getImageUrl(store);

                    return (
                      <div 
                        key={store.id} 
                        className="flex w-[240px] sm:w-[260px] flex-shrink-0 flex-col items-center rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                      >
                        <div className="h-36 sm:h-40 w-full overflow-hidden rounded-2xl bg-gray-100">
                          {storeImgSrc ? (
                            <img 
                              src={storeImgSrc} 
                              alt={store.name || 'Toko'} 
                              className="h-full w-full object-cover" 
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs text-gray-400 bg-gray-50">
                              No Image
                            </div>
                          )}
                        </div>

                        <div className="mt-3 text-center w-full">
                          <h4 className="text-base sm:text-lg font-serif font-medium text-gray-800 truncate">
                            {store.name || 'Nama Toko'}
                          </h4>
                          
                          {/* Rating Bintang Toko */}
                          <div className="mt-1 flex justify-center gap-0.5">
                            {[...Array(storeRating)].map((_, i) => (
                              <Star key={i} size={15} fill="#FFD700" className="text-yellow-400" />
                            ))}
                          </div>

                          <button 
                            onClick={() => handleGoToTenantDetail(store)}
                            className="mt-4 w-full rounded-xl bg-orange-500 py-2.5 text-xs sm:text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-600 active:scale-95 cursor-pointer"
                          >
                            Lihat Menu
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={() => handleScroll(storeScrollRef, 'right')}
                  className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg text-orange-500 border border-gray-100 hover:bg-orange-50 hover:scale-110 transition-all cursor-pointer"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}
          </section>
        )}

        {/* JIKA TIDAK ADA HASIL SAMA SEKALI */}
        {isSearching && !hasMatchingMenus && !hasMatchingTenants && (
          <div className="mt-12 py-12 text-center text-gray-500 border border-gray-100 rounded-3xl bg-white shadow-sm">
            Menu atau Toko dengan kata kunci "<span className="font-semibold text-gray-800">{searchTerm}</span>" tidak ditemukan.
          </div>
        )}

      </main>
    </div>
  );
}