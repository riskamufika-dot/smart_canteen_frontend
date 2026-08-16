'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Star, Plus, ArrowLeft } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

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
    return rawImg.startsWith('http')
      ? rawImg
      : `${STRAPI_URL}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`;
  }

  const url =
    rawImg?.data?.attributes?.url ||
    rawImg?.data?.url ||
    rawImg?.attributes?.url ||
    rawImg?.url;

  if (!url) return '';

  return url.startsWith('http')
    ? url
    : `${STRAPI_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function getMenuProductUrl(menuData: any): string {
  if (!menuData) return '';

  const rawImg =
    menuData.image ||
    menuData.foto ||
    menuData.gambar;

  if (!rawImg) return '';

  if (typeof rawImg === 'string') {
    return rawImg.startsWith('http')
      ? rawImg
      : `${STRAPI_URL}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`;
  }

  const url =
    rawImg?.data?.attributes?.url ||
    rawImg?.data?.url ||
    rawImg?.attributes?.url ||
    rawImg?.url;

  if (!url) return '';

  return url.startsWith('http')
    ? url
    : `${STRAPI_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ─── KOMPONEN UTAMA ──────────────────────────────────────────────────────────

export default function TokoDetailPage() {
  const router = useRouter();
  const params = useParams();

  const tenantId = params?.id ? String(params.id) : '';

  const [tenant, setTenant] = useState<any>(null);
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    const signal = controller.signal;

    let cancelled = false;

    async function fetchTenantData() {
      setLoading(true);

      try {
        let fetchedTenant: any = null;

        // ─────────────────────────────────────────────
        // 1. FETCH DETAIL TOKO
        // ─────────────────────────────────────────────

        let resHome = await fetch(
          `${STRAPI_URL}/api/homes?filters[documentId][$eq]=${tenantId}&populate=*`,
          { signal }
        );

        if (cancelled) return;

        if (resHome.ok) {
          const dataHome = await resHome.json();
          fetchedTenant = dataHome?.data?.[0] || null;
        }

        // ─────────────────────────────────────────────
        // FALLBACK KE TENANTS
        // ─────────────────────────────────────────────

        if (!fetchedTenant) {
          const resTenant = await fetch(
            `${STRAPI_URL}/api/tenants?filters[documentId][$eq]=${tenantId}&populate=*`,
            { signal }
          );

          if (resTenant.ok) {
            const dataTenant = await resTenant.json();
            fetchedTenant = dataTenant?.data?.[0] || null;
          }
        }

        if (cancelled) return;

        setTenant(fetchedTenant);

        const realNumericId = fetchedTenant?.id;

        // ─────────────────────────────────────────────
        // 2. FETCH MENU
        // ─────────────────────────────────────────────

        const filterQueries = [
          `filters[tenant][documentId][$eq]=${tenantId}`,
          `filters[home][documentId][$eq]=${tenantId}`,
          `filters[tenants][documentId][$eq]=${tenantId}`,
          `filters[homes][documentId][$eq]=${tenantId}`,
        ];

        if (realNumericId) {
          filterQueries.push(
            `filters[tenant][id][$eq]=${realNumericId}`,
            `filters[home][id][$eq]=${realNumericId}`
          );
        }

        let foundMenus: any[] = [];

        // ─────────────────────────────────────────────
        // COBA FILTER RELASI SATU PER SATU
        // ─────────────────────────────────────────────

        for (const filter of filterQueries) {
          const menuUrl =
            `${STRAPI_URL}/api/menus?${filter}` +
            `&populate=*&pagination[pageSize]=100`;

          const resMenus = await fetch(menuUrl, { signal });

          if (cancelled) return;

          if (resMenus.ok) {
            const dataMenus = await resMenus.json();

            if (dataMenus?.data?.length > 0) {
              foundMenus = dataMenus.data;
              break;
            }
          }
        }

        // ─────────────────────────────────────────────
        // FALLBACK TERAKHIR
        // ─────────────────────────────────────────────

        if (!foundMenus.length) {
          const resAll = await fetch(
            `${STRAPI_URL}/api/menus?populate=*&pagination[pageSize]=100`,
            { signal }
          );

          if (resAll.ok) {
            const dataAll = await resAll.json();
            const allMenus = dataAll?.data || [];

            foundMenus = allMenus.filter((m: any) => {
              const tDocId =
                m.tenant?.documentId ||
                m.home?.documentId ||
                m.tenants?.[0]?.documentId;

              const tId =
                m.tenant?.id ||
                m.home?.id;

              return (
                tDocId === tenantId ||
                (realNumericId && tId === realNumericId)
              );
            });
          }
        }

        if (!cancelled) {
          setMenus(foundMenus);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Gagal mengambil data toko:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTenantData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [tenantId]);

  // ─────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#FDFDFD] flex items-center justify-center text-gray-400">
        Memuat halaman toko...
      </div>
    );
  }

  const storeName =
    tenant?.name ||
    tenant?.nama ||
    'Toko Kami';

  const storeBannerImg =
    getStoreBannerUrl(tenant || {});

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#FDFDFD] pb-20">

      <main className="w-full pt-6 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">

        {/* ─────────────────────────────────────── */}
        {/* TOMBOL BACK */}
        {/* ─────────────────────────────────────── */}

        <button
          onClick={() => router.back()}
          className="
            mb-4
            flex
            items-center
            gap-2
            text-gray-700
            hover:text-orange-500
            transition-colors
            cursor-pointer
          "
        >
          <ArrowLeft size={24} />
        </button>

        {/* ─────────────────────────────────────── */}
        {/* BANNER TOKO */}
        {/* ─────────────────────────────────────── */}

        <div
          className="
            relative
            w-full
            h-48
            sm:h-56
            md:h-64
            lg:h-72
            xl:h-80
            overflow-hidden
            rounded-[20px]
            sm:rounded-[28px]
            lg:rounded-[36px]
            bg-gray-100
            shadow-sm
          "
        >
          {storeBannerImg ? (
            <img
              src={storeBannerImg}
              alt={storeName}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div
              className="
                w-full
                h-full
                flex
                items-center
                justify-center
                bg-gray-200
                text-gray-500
                font-medium
                text-lg
                sm:text-xl
              "
            >
              {storeName}
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────── */}
        {/* DAFTAR MENU */}
        {/* ─────────────────────────────────────── */}

        <section className="mt-8 sm:mt-10">

          <h2
            className="
              text-2xl
              sm:text-3xl
              lg:text-4xl
              font-serif
              font-medium
              text-gray-900
              mb-6
            "
          >
            Menu Kami
          </h2>

          {menus.length > 0 ? (

            <div
              className="
                grid
                grid-cols-1
                sm:grid-cols-2
                xl:grid-cols-3
                gap-4
                sm:gap-5
                lg:gap-6
              "
            >

              {menus.map((menu: any) => {

                const menuImgSrc =
                  getMenuProductUrl(menu);

                const menuName =
                  menu.name ||
                  menu.nama ||
                  'Nama Menu';

                const menuPrice =
                  Number(menu.price || 0);

                const targetId =
                  menu.documentId ||
                  menu.id;

                return (
                  <div
                    key={menu.documentId || menu.id}
                    className="
                      flex
                      items-center
                      gap-3
                      sm:gap-4
                      lg:gap-5
                      rounded-[22px]
                      sm:rounded-[26px]
                      lg:rounded-[28px]
                      border
                      border-gray-100
                      bg-white
                      p-3
                      sm:p-4
                      lg:p-5
                      shadow-sm
                      transition-all
                      hover:shadow-md
                      min-w-0
                    "
                  >

                    {/* ─────────────────────────── */}
                    {/* GAMBAR MENU */}
                    {/* ─────────────────────────── */}

                    <div
                      className="
                        h-24
                        w-24
                        sm:h-28
                        sm:w-28
                        lg:h-32
                        lg:w-32
                        flex-shrink-0
                        overflow-hidden
                        rounded-2xl
                        bg-gray-100
                      "
                    >

                      {menuImgSrc ? (

                        <img
                          src={menuImgSrc}
                          alt={menuName}
                          className="
                            h-full
                            w-full
                            object-cover
                          "
                          onError={(e) => {
                            (
                              e.target as HTMLImageElement
                            ).style.display = 'none';
                          }}
                        />

                      ) : (

                        <div
                          className="
                            h-full
                            w-full
                            flex
                            items-center
                            justify-center
                            text-xs
                            text-gray-400
                            bg-gray-50
                          "
                        >
                          No Image
                        </div>

                      )}

                    </div>

                    {/* ─────────────────────────── */}
                    {/* INFORMASI MENU */}
                    {/* ─────────────────────────── */}

                    <div
                      className="
                        flex
                        flex-grow
                        flex-col
                        justify-between
                        py-1
                        h-full
                        min-w-0
                      "
                    >

                      <div>

                        <h3
                          className="
                            text-base
                            sm:text-lg
                            lg:text-xl
                            font-serif
                            font-medium
                            text-gray-800
                            truncate
                          "
                          title={menuName}
                        >
                          {menuName}
                        </h3>

                        <p
                          className="
                            text-sm
                            sm:text-base
                            font-bold
                            text-gray-900
                            mt-1
                          "
                        >
                          Rp{' '}
                          {menuPrice.toLocaleString(
                            'id-ID'
                          )}
                        </p>

                        {/* RATING */}

                        <div className="mt-2 flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              fill="#FFD700"
                              className="text-yellow-400"
                            />
                          ))}
                        </div>

                      </div>

                      {/* ───────────────────────── */}
                      {/* BUTTON PLUS */}
                      {/* ───────────────────────── */}

                      <div className="flex justify-end mt-2">

                        <button
                          onClick={() =>
                            router.push(
                              `/menu/${targetId}`
                            )
                          }
                          className="
                            rounded-2xl
                            bg-orange-500
                            p-2
                            sm:p-2.5
                            lg:p-3
                            text-black
                            shadow-md
                            transition-all
                            hover:bg-orange-600
                            active:scale-95
                            cursor-pointer
                          "
                          title="Lihat Detail Produk"
                        >
                          <Plus
                            size={20}
                            className="text-black"
                          />
                        </button>

                      </div>

                    </div>

                  </div>
                );
              })}

            </div>

          ) : (

            <div
              className="
                py-12
                text-center
                text-gray-400
                border
                border-dashed
                border-gray-200
                rounded-3xl
              "
            >
              Toko ini belum memiliki daftar menu.
            </div>

          )}

        </section>

      </main>

    </div>
  );
}