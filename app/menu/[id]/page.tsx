'use client';

import SubHeader from '@/components/sub-header';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Home, ShoppingCart, Check } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/app/context/CartContext';
import { getImageUrl, STRAPI_URL } from '@/lib/getImageUrl';

interface MenuDetail {
  id: number;
  documentId?: string;
  name: string;
  price: number;
  stock?: number;
  description?: string;
  image?: any;
  attributes?: any;
}

export default function DetailMenuPage() {
  const params = useParams();
  const router = useRouter();

  const { addToCart, totalItems } = useCart();

  const [menu, setMenu] = useState<MenuDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    async function getMenuDetail() {
      if (!params?.id) return;
      setLoading(true);

      try {
        let res = await fetch(
          `${STRAPI_URL}/api/menus/${params.id}?populate=*`
        );

        if (res.ok) {
          const result = await res.json();
          if (result.data) {
            setMenu(result.data);
            setLoading(false);
            return;
          }
        }

        res = await fetch(
          `${STRAPI_URL}/api/menus?filters[documentId][$eq]=${params.id}&populate=*`
        );
        let filterResult = await res.json();

        if (filterResult?.data && filterResult.data.length > 0) {
          setMenu(filterResult.data[0]);
          setLoading(false);
          return;
        }

        res = await fetch(
          `${STRAPI_URL}/api/menus?filters[id][$eq]=${params.id}&populate=*`
        );
        filterResult = await res.json();

        if (filterResult?.data && filterResult.data.length > 0) {
          setMenu(filterResult.data[0]);
          setLoading(false);
          return;
        }

        setMenu(null);
      } catch (error) {
        console.error('Gagal mengambil detail menu:', error);
        setMenu(null);
      } finally {
        setLoading(false);
      }
    }

    getMenuDetail();
  }, [params?.id]);

  const handleIncrease = () => setQuantity((prev) => prev + 1);
  const handleDecrease = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = () => {
    if (!menu) return;

    const menuData: any = menu.attributes || menu;

    addToCart({
      id: menu.id,
      documentId: menu.documentId || String(menu.id),
      name: menuData.name || menuData.nama || 'Menu',
      price: Number(menuData.price || menuData.harga || 0),
      quantity: quantity,
      note: note,
      image: getImageUrl(menuData.image || menuData.foto || menuData.gambar),
    });

    router.push('/keranjang');
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <p className="text-gray-400 font-medium">Memuat detail menu...</p>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white gap-4 px-4 text-center">
        <p className="text-gray-600 font-medium">Menu tidak ditemukan.</p>
        <button
          onClick={() => router.back()}
          className="px-5 py-2.5 bg-[#E07A2F] text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
        >
          Kembali ke Menu
        </button>
      </div>
    );
  }

  const menuData: any = menu.attributes || menu;

  return (
    <div className="w-full min-h-screen bg-white font-sans text-[#111827] flex flex-col m-0 p-0">
      
      {/* NAVBAR HEADER FULL BLEED */}
      <header className="w-full bg-white border-b border-gray-200 px-6 sm:px-10 py-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1 text-[#111827] hover:text-orange-500 transition-colors"
          title="Kembali"
        >
          <ArrowLeft size={26} className="stroke-[2.2]" />
        </button>

        <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight">
          Detail Menu
        </h1>

        <div className="flex items-center gap-4 text-[#111827]">
          <Link href="/home" className="hover:text-orange-500 transition-colors">
            <Home size={24} className="stroke-[2]" />
          </Link>
          
          <Link href="/keranjang" className="relative hover:text-orange-500 transition-colors">
            <ShoppingCart size={24} className="stroke-[2]" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-[#E07A2F] text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* BODY KONTEN PUSH FULL KE KANAN DAN KIRI */}
      <main className="w-full flex-1 px-6 sm:px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start w-full">
          
          {/* FOTO MENU SANGAT BESAR & FULL CONTAINER */}
          <div className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-[32px] overflow-hidden bg-gray-100">
            <img
              src={getImageUrl(menuData.image || menuData.foto || menuData.gambar)}
              alt={menuData.name || 'Menu'}
              className="w-full h-full object-cover"
            />
          </div>

          {/* DETAIL KONTEN */}
          <div className="flex flex-col justify-between space-y-6 w-full">
            
            <div className="space-y-5">
              {/* NAMA & HARGA */}
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111827]">
                  {menuData.name}
                </h2>
                <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#E07A2F] shrink-0">
                  Rp {menuData.price ? Number(menuData.price).toLocaleString('id-ID') : '0'}
                </span>
              </div>

              {/* BADGE STOK */}
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5 bg-[#E6F7ED] text-[#22AD5C] px-4 py-1.5 rounded-full text-xs font-semibold">
                  <Check size={14} className="stroke-[3]" /> Tersedia
                </span>
                <span className="text-sm font-semibold text-[#111827]">
                  Stok: {menuData.stock ?? 40} Porsi
                </span>
              </div>

              {/* DESKRIPSI */}
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                {menuData.description ||
                  'Aneka buah segar pilihan (mangga, kedondong, jambu, bengkuang) yang disajikan dengan cocolan bumbu gula merah kacang yang pedas, manis, dan legit.'}
              </p>

              {/* JUMLAH */}
              <div className="space-y-2 pt-2">
                <label className="block text-base font-bold text-[#111827]">
                  Jumlah
                </label>
                <div className="inline-flex items-center border border-gray-300 rounded-2xl px-4 py-2.5 gap-6 bg-white">
                  <button
                    onClick={handleDecrease}
                    className="text-gray-600 hover:text-black font-semibold text-xl transition-colors px-1"
                  >
                    -
                  </button>
                  <span className="font-bold text-lg text-[#111827]">
                    {quantity}
                  </span>
                  <button
                    onClick={handleIncrease}
                    className="text-gray-600 hover:text-black font-semibold text-xl transition-colors px-1"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* CATATAN */}
              <div className="space-y-2 pt-2">
                <label className="block text-base font-bold text-[#111827]">
                  Catatan Untuk Penjual:
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Contoh: Tidak pedas, tidak pakai timun, dll."
                  className="w-full px-5 py-4 text-base text-[#111827] bg-white border border-gray-300 rounded-2xl focus:outline-none focus:border-orange-500 transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* TOMBOL TAMBAH KE KERANJANG */}
            <div className="pt-4">
              <button
                onClick={handleAddToCart}
                className="w-full bg-orange-400 hover:bg-orange-500 text-white font-bold py-4.5 px-6 rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] cursor-pointer shadow-sm">

                <ShoppingCart size={22} className="text-white fill-white" />
                <span className="text-lg font-bold text-white">
                  Tambah Ke Keranjang
                </span>
              </button>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}