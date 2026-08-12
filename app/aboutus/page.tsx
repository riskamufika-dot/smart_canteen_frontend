"use client";

import SubHeader from '@/components/sub-header';
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Leaf, Smartphone, Wallet } from "lucide-react";

// CONFIG STRAPI URL LOKAL TANPA FILE LIB
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export default function AboutUs() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function getAboutData() {
      try {
        const res = await fetch(`${STRAPI_URL}/api/about`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Gagal mengambil data About Us:", error);
      }
    }
    getAboutData();
  }, []);

  return (
    <div className="min-h-screen w-full bg-white p-4 sm:p-6 md:p-8 flex flex-col"> 
      {/* SubHeader */}
      <div className="mb-6">
        <SubHeader title="About Us" showBack={true} showBell={false} titleAlign="left" />
      </div>

      {/* Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* KOLOM KIRI - Kotak Logo */}
        <div className="md:col-span-5 border border-gray-900/80 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-sm bg-white min-h-[480px]">
          
          {/* Logo */}
          <div className="relative w-32 h-32 mb-4 shrink-0">
            <Image
              src="/logo.png"
              alt="Smart Canteen Logo"
              fill
              className="object-contain"
              onError={(e) => {
                // Fallback jika logo belum ada
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128?text=Logo';
              }}
            />
          </div>
          
          {/* Judul & Deskripsi */}
          <h2 className="text-2xl font-black mb-3 tracking-tight">
            <span className="text-orange-500">Smart </span>
            <span className="text-black">Canteen</span>
          </h2>

          <p className="text-gray-700 text-xs sm:text-sm leading-relaxed font-normal max-w-xs">
            {data?.data?.attributes?.description ||
              "platform digital resmi SMK Negeri 2 Sumedang yang mengintegrasikan teknologi modern dengan ekosistem kantin sekolah. Aplikasi ini dirancang untuk menciptakan pengalaman jajan yang lebih higienis, praktis, dan bebas antrean bagi seluruh siswa, guru, dan staf sekolah."}
          </p>

        </div>

        {/* KOLOM KANAN - 3 Fitur Sejajar */}
        <div className="md:col-span-7 flex flex-col gap-4 justify-center">
          
          {/* Fitur 1 */}
          <div className="border border-orange-200/80 rounded-2xl p-5 flex items-start gap-4 shadow-sm bg-white">
            <div className="p-3 bg-orange-100/70 text-orange-500 rounded-xl shrink-0">
              <Leaf className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-orange-500 text-base mb-1">
                Komitmen Kantin Sehat
              </h3>
              <p className="text-orange-600/90 text-xs sm:text-sm leading-relaxed font-medium">
                Seluruh mitra kuliner kami berkomitmen menyajikan menu yang higienis, menggunakan bahan segar setiap hari, dan dengan harga yang tetap bersahabat bagi kantong pelajar.
              </p>
            </div>
          </div>

          {/* Fitur 2 */}
          <div className="border border-gray-900/80 rounded-2xl p-5 flex items-start gap-4 shadow-sm bg-white">
            <div className="p-3 bg-green-100/70 text-green-600 rounded-xl shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-black text-base mb-1">
                Smart Pre-Order
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                Pesan makanan favoritmu langsung dari dalam kelas sebelum bel berbunyi. Ambil pesanan tepat waktu di stan vendor tanpa perlu terjebak antrean panjang.
              </p>
            </div>
          </div>

          {/* Fitur 3 */}
          <div className="border border-gray-900/80 rounded-2xl p-5 flex items-start gap-4 shadow-sm bg-white">
            <div className="p-3 bg-orange-100/70 text-orange-500 rounded-xl shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-black text-base mb-1">
                Metode Pembayaran Fleksibel
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                Bebas pilih cara bayar! Kamu bisa bertransaksi cepat menggunakan Saldo Digital (QR Code), atau tetap menggunakan Uang Tunai langsung di kasir stan kantin.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}