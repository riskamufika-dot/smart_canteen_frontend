'use client';

import React, { useState, useEffect } from 'react';
import { Star, Plus, ArrowLeft } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

// CONFIG STRAPI URL LOKAL TANPA FILE LIB
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

// 1. HELPER KHUSUS AMBIL GAMBAR BANNER TOKO
const getStoreBannerUrl = (tenantData: any): string => {
  if (!tenantData) return '';
  const attr = tenantData.attributes || tenantData;
  const rawImg = attr.banner || attr.benner || attr.image || attr.foto || attr.gambar || attr.cover;

  if (!rawImg) return '';

  if (typeof rawImg === 'string') {
    if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) return rawImg;
    return `${STRAPI_URL}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`;
  }

  const url = rawImg?.data?.attributes?.url || rawImg?.data?.url || rawImg?.attributes?.url || rawImg?.url;
  if (url) {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${STRAPI_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  return '';
};

// 2. HELPER KHUSUS AMBIL GAMBAR PRODUK MAKANAN
const getMenuProductUrl = (menuData: any): string => {
  if (!menuData) return '';
  const attr = menuData.attributes || menuData;
  const rawImg = attr.image || attr.foto || attr.gambar;

  if (!rawImg) return '';

  if (typeof rawImg === 'string') {
    if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) return rawImg;
    return `${STRAPI_URL}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`;
  }

  const url = rawImg?.data?.attributes?.url || rawImg?.data?.url || rawImg?.attributes?.url || rawImg?.url;
  if (url) {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${STRAPI_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  return '';
};

export default function TokoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params?.id;

  const [tenant, setTenant] = useState<any>(null);
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchTenantData() {
      if (!tenantId) return;
      setLoading(true);
      try {
        // 1. Fetch Detail Toko Ini
        const resHome = await fetch(
          `${STRAPI_URL}/api/homes?filters[documentId][$eq]=${tenantId}&populate=*`
        );
        const dataHome = await resHome.json();
        const currentTenant = dataHome?.data?.[0];
        setTenant(currentTenant);

        // 2. FETCH HANYA MENU YANG MILIK TOKO INI SAJA
        let resMenus = await fetch(
          `${STRAPI_URL}/api/menus?filters[home][documentId][$eq]=${tenantId}&populate=*`
        );
        let dataMenus = await resMenus.json();

        if (!dataMenus?.data || dataMenus.data.length === 0) {
          resMenus = await fetch(
            `${STRAPI_URL}/api/menus?filters[tenant][documentId][$eq]=${tenantId}&populate=*`
          );
          dataMenus = await resMenus.json();
        }

        setMenus(dataMenus?.data || []);

      } catch (error) {
        console.error('Gagal mengambil data toko dan menu:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTenantData();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center text-gray-400">
        Memuat halaman toko...
      </div>
    );
  }

  const tenantObj = tenant?.attributes || tenant;
  const storeName = tenantObj?.name || tenantObj?.nama || 'Toko Kami';
  const storeBannerImg = getStoreBannerUrl(tenant);

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-20 w-full overflow-x-hidden">
      <main className="w-full pt-6 px-4 sm:px-8 md:px-16 max-w-7xl mx-auto">
        
        {/* TOMBOL BACK */}
        <button 
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-gray-700 hover:text-orange-500 transition-colors cursor-pointer"
        >
          <ArrowLeft size={24} />
        </button>

        {/* BANNER TOKO */}
        <div className="relative h-48 sm:h-64 md:h-80 w-full overflow-hidden rounded-[24px] sm:rounded-[36px] bg-gray-100 shadow-sm">
          {storeBannerImg ? (
            <img 
              src={storeBannerImg} 
              alt={storeName} 
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 font-medium">
              {storeName}
            </div>
          )}
        </div>

        {/* TITLE MENU KAMI */}
        <section className="mt-8 sm:mt-10">
          <h2 className="text-2xl sm:text-3xl font-serif font-medium text-gray-900 mb-6">
            Menu Kami
          </h2>

          {menus.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {menus.map((menu: any) => {
                const menuData = menu.attributes || menu;
                const menuImgSrc = getMenuProductUrl(menuData);

                return (
                  <div 
                    key={menu.id} 
                    className="flex items-center gap-4 sm:gap-6 rounded-[28px] border border-gray-100 bg-white p-4 sm:p-5 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="h-28 w-28 sm:h-32 sm:w-32 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                      {menuImgSrc ? (
                        <img 
                          src={menuImgSrc} 
                          alt={menuData.name || 'Menu'} 
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
                        <h3 className="text-lg sm:text-xl font-serif font-medium text-gray-800 truncate">
                          {menuData.name || 'Nama Menu'}
                        </h3>
                        <p className="text-base font-bold text-gray-900 mt-1">
                          Rp {Number(menuData.price || 0).toLocaleString('id-ID')}
                        </p>
                        
                        <div className="mt-2 flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={16} fill="#FFD700" className="text-yellow-400" />
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end mt-2">
                        <button 
                          onClick={() => router.push(`/menu/${menu.documentId || menu.id}`)}
                          className="rounded-2xl bg-orange-500 p-2.5 sm:p-3 text-black shadow-md transition-all hover:bg-orange-600 active:scale-95 cursor-pointer"
                          title="Lihat Detail Produk"
                        >
                          <Plus size={20} className="text-black" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-3xl">
              Toko ini belum memiliki daftar menu.
            </div>
          )}
        </section>

      </main>
    </div>
  );
}