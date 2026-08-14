'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Star, Plus, ArrowLeft } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

// ─── HELPER FUNCTIONS — di luar komponen ─────────────────────────────────────

function getStoreBannerUrl(tenantData: any): string {
  if (!tenantData) return '';
  const rawImg =
    tenantData.banner ||
    tenantData.benner ||
    tenantData.image ||
    tenantData.foto ||
    tenantData.gambar ||
    tenantData.cover;
  if (!rawImg) return '';
  if (typeof rawImg === 'string') {
    return rawImg.startsWith('http') ? rawImg : `${STRAPI_URL}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`;
  }
  const url = rawImg?.data?.attributes?.url || rawImg?.data?.url || rawImg?.attributes?.url || rawImg?.url;
  if (!url) return '';
  return url.startsWith('http') ? url : `${STRAPI_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function getMenuProductUrl(menuData: any): string {
  if (!menuData) return '';
  const rawImg = menuData.image || menuData.foto || menuData.gambar;
  if (!rawImg) return '';
  if (typeof rawImg === 'string') {
    return rawImg.startsWith('http') ? rawImg : `${STRAPI_URL}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`;
  }
  const url = rawImg?.data?.attributes?.url || rawImg?.data?.url || rawImg?.attributes?.url || rawImg?.url;
  if (!url) return '';
  return url.startsWith('http') ? url : `${STRAPI_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ─── KOMPONEN ─────────────────────────────────────────────────────────────────

export default function TokoDetailPage() {
  const router = useRouter();
  const params = useParams();

  // Stabilkan tenantId sebagai string primitif — primitif stabil di dep array
  const tenantId = params?.id ? String(params.id) : '';

  const [tenant, setTenant] = useState<any>(null);
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Ref untuk cancel fetch jika komponen unmount sebelum selesai
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    // Cancel request sebelumnya jika ada
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    let cancelled = false;

    async function fetchTenantData() {
      setLoading(true);
      try {
        // 1. Fetch detail toko berdasarkan documentId
        const resHome = await fetch(
          `${STRAPI_URL}/api/homes?filters[documentId][$eq]=${tenantId}&populate=*`,
          { signal }
        );
        if (cancelled) return;

        if (resHome.ok) {
          const dataHome = await resHome.json();
          // Strapi v5: flat object
          setTenant(dataHome?.data?.[0] || null);
        }

        // 2. Fetch menu milik toko ini — coba field tenant dulu (dengan populate lengkap)
        let menuUrl = `${STRAPI_URL}/api/menus?filters[tenant][documentId][$eq]=${tenantId}&populate[image]=*&populate[tenant]=*&pagination[pageSize]=100`;
        let resMenus = await fetch(menuUrl, { signal });
        if (cancelled) return;

        let dataMenus = resMenus.ok ? await resMenus.json() : { data: [] };

        if (!dataMenus?.data?.length) {
          // Fallback: coba relasi field "home"
          menuUrl = `${STRAPI_URL}/api/menus?filters[home][documentId][$eq]=${tenantId}&populate[image]=*&populate[home]=*&pagination[pageSize]=100`;
          resMenus = await fetch(menuUrl, { signal });
          if (cancelled) return;
          dataMenus = resMenus.ok ? await resMenus.json() : { data: [] };
        }

        if (!cancelled) {
          setMenus(dataMenus?.data || []);
        }
      } catch (err: any) {
        // AbortError bukan error nyata — abaikan
        if (err?.name !== 'AbortError') {
          console.error('Gagal mengambil data toko:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTenantData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [tenantId]); // tenantId adalah string primitif — stabil, tidak trigger infinite loop

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center text-gray-400">
        Memuat halaman toko...
      </div>
    );
  }

  // Strapi v5: flat object, tidak ada .attributes
  const storeName = tenant?.name || tenant?.nama || 'Toko Kami';
  const storeBannerImg = getStoreBannerUrl(tenant || {});

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
                // Strapi v5: flat, tidak ada .attributes
                const menuImgSrc = getMenuProductUrl(menu);
                const menuName = menu.name || menu.nama || 'Nama Menu';
                const menuPrice = Number(menu.price || 0);
                const targetId = menu.documentId || menu.id;

                return (
                  <div
                    key={menu.id}
                    className="flex items-center gap-4 sm:gap-6 rounded-[28px] border border-gray-100 bg-white p-4 sm:p-5 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="h-28 w-28 sm:h-32 sm:w-32 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                      {menuImgSrc ? (
                        <img
                          src={menuImgSrc}
                          alt={menuName}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
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
                          {menuName}
                        </h3>
                        <p className="text-base font-bold text-gray-900 mt-1">
                          Rp {menuPrice.toLocaleString('id-ID')}
                        </p>
                        <div className="mt-2 flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={16} fill="#FFD700" className="text-yellow-400" />
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => router.push(`/menu/${targetId}`)}
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