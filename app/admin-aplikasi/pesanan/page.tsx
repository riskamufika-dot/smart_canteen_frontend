'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface Pesanan {
  id: string;
  kantin: string;
  pelanggan: string;
  total: string;
  waktu: string;
  status: 'Selesai' | 'Sedang Disiapkan' | 'Menunggu' | 'Siap Diambil';
}

export default function DaftarPesanan() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('Semua');

  const [dataPesanan] = useState<Pesanan[]>([
    {
      id: '#000123',
      kantin: 'Kantin Mas Arjo',
      pelanggan: 'Setia Dewi',
      total: 'Rp 16.000',
      waktu: '12 Mei 2026, 09:40',
      status: 'Selesai',
    },
    {
      id: '#000124',
      kantin: 'Kantin Teh Nci',
      pelanggan: 'Siti Mae',
      total: 'Rp 10.000',
      waktu: '12 Mei 2026, 09:58',
      status: 'Selesai',
    },
    {
      id: '#000125',
      kantin: 'Kedai Hampura',
      pelanggan: 'Luna Freya',
      total: 'Rp 6.000',
      waktu: '12 Mei 2026, 10:10',
      status: 'Sedang Disiapkan',
    },
    {
      id: '#000126',
      kantin: 'Kantin Lies',
      pelanggan: 'Riska',
      total: 'Rp 5.000',
      waktu: '12 Mei 2026, 10:15',
      status: 'Menunggu',
    },
    {
      id: '#000127',
      kantin: 'Kantin Apih',
      pelanggan: 'Imelda',
      total: 'Rp 12.000',
      waktu: '12 Mei 2026, 10:30',
      status: 'Siap Diambil',
    },
    {
      id: '#000128',
      kantin: 'Kantin Mas Echo',
      pelanggan: 'Cici',
      total: 'Rp 15.000',
      waktu: '12 Mei 2026, 10:45',
      status: 'Sedang Disiapkan',
    },
    {
      id: '#000129',
      kantin: 'Kantin Bu Nani',
      pelanggan: 'Shelva',
      total: 'Rp 7.000',
      waktu: '12 Mei 2026, 10:50',
      status: 'Selesai',
    },
  ]);

  const filteredPesanan = dataPesanan.filter((item) => {
    if (activeTab === 'Semua') return true;
    return item.status === activeTab;
  });

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Selesai':
        return (
          <span className="inline-block rounded-full border border-emerald-400 bg-emerald-50 px-3 py-0.5 text-xs font-medium text-emerald-600">
            Selesai
          </span>
        );
      case 'Sedang Disiapkan':
        return (
          <span className="inline-block rounded-full border border-orange-400 bg-orange-50 px-3 py-0.5 text-xs font-medium text-orange-500">
            Sedang Disiapkan
          </span>
        );
      case 'Menunggu':
        return (
          <span className="inline-block rounded-full border border-amber-400 bg-amber-50 px-3 py-0.5 text-xs font-medium text-amber-600">
            Menunggu Konfirmasi
          </span>
        );
      case 'Siap Diambil':
        return (
          <span className="inline-block rounded-full border border-teal-400 bg-teal-50 px-3 py-0.5 text-xs font-medium text-teal-600">
            Siap Diambil
          </span>
        );
      default:
        return null;
    }
  };

  const tabs = ['Semua', 'Menunggu', 'Sedang Disiapkan', 'Siap Diambil', 'Selesai'];

  return (
    <div className="min-h-screen bg-slate-100 p-8 text-slate-800">
      <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-slate-100 active:scale-95"
            title="Kembali"
          >
            <ArrowLeft className="h-5 w-5 text-slate-700" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Daftar Pesanan</h1>
        </div>

        <div className="mb-6 flex border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-6 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? 'bg-orange-50/60 text-orange-500'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 h-0.5 w-full bg-orange-500" />
              )}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-white font-bold text-slate-900">
                  <th className="px-6 py-4">Id Pesanan</th>
                  <th className="px-6 py-4">Kantin</th>
                  <th className="px-6 py-4">Pelanggan</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPesanan.length > 0 ? (
                  filteredPesanan.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-3.5 font-medium text-slate-900">{item.id}</td>
                      <td className="px-6 py-3.5 font-medium text-slate-900">{item.kantin}</td>
                      <td className="px-6 py-3.5 text-slate-800">{item.pelanggan}</td>
                      <td className="px-6 py-3.5 font-medium text-slate-900">{item.total}</td>
                      <td className="px-6 py-3.5 text-slate-600">{item.waktu}</td>
                      <td className="px-6 py-3.5 text-center">
                        {renderStatusBadge(item.status)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      Tidak ada pesanan dalam status ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}