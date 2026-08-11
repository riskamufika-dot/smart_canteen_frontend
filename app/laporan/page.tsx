'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// 1. Definisi Tipe Data untuk Baris Laporan
interface LaporanItem {
  no: number;
  namaMenu: string;
  jumlahTerjual: number;
  totalPendapatan: string;
}

export default function LaporanPage() {
  // Data dummy untuk tabel laporan utama
  const dataLaporan: LaporanItem[] = [
    { no: 1, namaMenu: 'Mie Bakso', jumlahTerjual: 60, totalPendapatan: 'Rp 480.000' },
    { no: 2, namaMenu: 'Mie Campur', jumlahTerjual: 25, totalPendapatan: 'Rp 200.000' },
    { no: 3, namaMenu: 'Mie Yamin', jumlahTerjual: 30, totalPendapatan: 'Rp 280.000' },
  ];

  // Data dummy untuk tabel menu terlaris
  const dataTerlaris: LaporanItem[] = [
    { no: 1, namaMenu: 'Mie Bakso', jumlahTerjual: 60, totalPendapatan: 'Rp 480.000' },
    { no: 2, namaMenu: 'Mie Campur', jumlahTerjual: 25, totalPendapatan: 'Rp 200.000' },
  ];

  const totalKeseluruhan = "Rp 920.000";

  return (
    <div className="min-h-screen bg-slate-50 p-10 font-sans text-slate-800">
      <div className="mx-auto bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
        
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/dasboard-admin" 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-700"
          >
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Laporan</h1>
        </div>

        {/* Tabel Laporan Utama */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden mb-8 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-900 font-bold text-sm">
                <th className="p-4 pl-6 text-center w-16">No.</th>
                <th className="p-4">Nama Menu</th>
                <th className="p-4 text-center">Jumlah Item Terjual</th>
                <th className="p-4 text-right pr-10">Total Pendapatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
              {dataLaporan.map((item) => (
                <tr key={item.no}>
                  <td className="p-4 text-center pl-6">{item.no}.</td>
                  <td className="p-4 text-slate-900 font-bold">{item.namaMenu}</td>
                  <td className="p-4 text-center">{item.jumlahTerjual}</td>
                  <td className="p-4 text-right pr-10">{item.totalPendapatan}</td>
                </tr>
              ))}
            </tbody>
            {/* Footer Tabel - Total Keseluruhan */}
            <tfoot className="bg-slate-50/30">
              <tr>
                <td colSpan={2} className="p-5 pl-6 font-extrabold text-green-600 text-base">
                  Total Keseluruhan
                </td>
                <td colSpan={2} className="p-5 pr-10 text-right font-extrabold text-green-600 text-base">
                  {totalKeseluruhan}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Menu Terlaris Section */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-slate-900 mb-4 px-2">Menu Terlaris</h2>
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-900 font-bold text-sm">
                  <th className="p-4 pl-6 text-center w-16">No.</th>
                  <th className="p-4">Nama Menu</th>
                  <th className="p-4 text-center">Jumlah Item Terjual</th>
                  <th className="p-4 text-right pr-10">Total Pendapatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                {dataTerlaris.map((item) => (
                  <tr key={item.no}>
                    <td className="p-4 text-center pl-6">{item.no}.</td>
                    <td className="p-4 text-slate-900 font-bold">{item.namaMenu}</td>
                    <td className="p-4 text-center">{item.jumlahTerjual}</td>
                    <td className="p-4 text-right pr-10">{item.totalPendapatan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}