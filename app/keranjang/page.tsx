'use client';

import React, { useState } from 'react';
import { ArrowLeft, Home, Trash2, Clock, Calendar, ChevronDown, DollarSign, Plus, Minus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/app/context/CartContext';

export default function KeranjangPage() {
  const router = useRouter();
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    toggleSelectItem,
    toggleSelectAll,
    clearSelectedItems,
    clearCart,
    selectedItems,
  } = useCart();

  // Tanggal Hari Ini sebagai Default (Format YYYY-MM-DD untuk Strapi Date)
  const todayStr = new Date().toISOString().split('T')[0];
  const [pickupDate, setPickupDate] = useState<string>(todayStr);
  
  // Jam Pengambilan (Short Text di Strapi)
  const [pickupTime, setPickupTime] = useState<string>('06.15 WIB');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [loading, setLoading] = useState<boolean>(false);

  const timeSlots = [
    '06.15 WIB',
    '07.15 WIB',
    '08.15 WIB',
    '09.15 WIB',
    '10.15 WIB',
    '11.15 WIB',
    '12.15 WIB',
    '13.15 WIB',
    '14.15 WIB',
  ];

  const allSelected = cartItems.length > 0 && cartItems.every((item) => item.selected ?? true);
  const hasSelected = selectedItems.length > 0;

  // FUNGSI UTAMA BUAT PESANAN
  const handleCreateOrder = async () => {
    if (!hasSelected) {
      alert('Pilih minimal satu makanan terlebih dahulu!');
      return;
    }
    setLoading(true);

    const cleanItems = selectedItems.map((item: any) => ({
      id: String(item.id),
      name: String(item.name || item.nama || 'Makanan'),
      price: Number(item.price || item.harga || 0),
      quantity: Number(item.quantity || item.qty || 1),
    }));

    const totalHargaMurni = cleanItems.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );

    const generatedOrderId = `#SC${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    // 1. Data untuk Simpan di LocalStorage (Untuk Tampilan Halaman Status Pesanan)
    const pesananLokal = {
      orderId: generatedOrderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'Menunggu Konfirmasi',
      items: cleanItems,
      totalPrice: totalHargaMurni,
      pickupDate: pickupDate,
      pickupTime: pickupTime,
      paymentMethod: paymentMethod,
    };

    const dataLama = JSON.parse(localStorage.getItem('smart_canteen_orders') || '[]');
    dataLama.push(pesananLokal);
    localStorage.setItem('smart_canteen_orders', JSON.stringify(dataLama));

    // 2. Payload Khusus Strapi (Sesuaikan persis dengan aturan Enum Strapi)
    const strapiPayload = {
      order_id: generatedOrderId,
      total_price: totalHargaMurni,
      pickup_date: pickupDate,
      pickup_time: pickupTime,
      // Mengirim 'cash' atau 'saldo_digital' sesuai pilihan Enum di Strapi
      payment_method: paymentMethod.toLowerCase() === 'cash' ? 'cash' : 'saldo_digital',
      // Mengirim 'pending' sesuai pilihan Enum di Strapi
      menu_status: 'pending',
    };

    try {
      console.log('📤 Mengirim ke Strapi:', strapiPayload);

      const res = await fetch('http://localhost:1337/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ data: strapiPayload }),
      });

      const resData = await res.json();

      if (res.ok) {
        console.log('✅ SUKSES! Pesanan berhasil masuk ke Strapi:', resData);
      } else {
        console.error('❌ STRAPI ERROR DETAILS:', JSON.stringify(resData.error, null, 2));
      }
    } catch (err) {
      console.warn('⚠️ Server Strapi offline, data tersimpan lokal:', err);
    }

    clearSelectedItems();
    setLoading(false);
    router.push('/status-pesanan');
  };

  return (
    <div className="w-full min-h-screen bg-white font-sans text-gray-900 flex flex-col justify-between">
      
      {/* KONTEN UTAMA */}
      <div className="w-full py-6 px-4 sm:px-8 space-y-6 pb-28">
        
        {/* HEADER ATAS */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <button
            onClick={() => router.back()}
            className="text-gray-900 hover:text-orange-500 transition-colors p-1 -ml-1"
          >
            <ArrowLeft size={26} />
          </button>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Keranjang
          </h1>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/home')}
              className="text-gray-900 hover:text-orange-500 transition-colors p-1"
            >
              <Home size={24} />
            </button>
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-gray-900 hover:text-red-500 transition-colors p-1"
                title="Kosongkan Keranjang"
              >
                <Trash2 size={24} />
              </button>
            )}
          </div>
        </div>

        {cartItems.length > 0 ? (
          <div className="space-y-6 pt-2">
            
            {/* OPSI PILIH SEMUA */}
            <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100">
              <label className="flex items-center gap-3 cursor-pointer font-semibold text-sm sm:text-base text-gray-800">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 accent-[#52C453] rounded cursor-pointer"
                />
                Pilih Semua ({cartItems.length} Makanan)
              </label>
              <span className="text-xs sm:text-sm text-gray-400">
                {selectedItems.length} Terpilih
              </span>
            </div>

            {/* DAFTAR ITEM KERANJANG */}
            <div className="bg-white border border-gray-200 rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
              {cartItems.map((item) => {
                const isChecked = item.selected ?? true;
                const itemSubtotal = Number(item.price || 0) * Number(item.quantity || 1);

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 sm:gap-4 pb-5 border-b border-gray-100 last:border-none last:pb-0"
                  >
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectItem(item.id)}
                        className="w-5 h-5 accent-[#52C453] rounded cursor-pointer shrink-0"
                      />

                      <img
                        src={item.image || '/placeholder.jpeg'}
                        alt={item.name}
                        className="h-20 w-24 sm:h-24 sm:w-32 rounded-2xl object-cover bg-gray-100 shrink-0"
                      />
                      
                      <div className="min-w-0 space-y-1">
                        <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate">
                          {item.name}
                        </h3>
                        
                        <div className="flex items-center gap-4 text-gray-800 font-medium text-sm sm:text-base">
                          <span className="font-bold text-black">{item.quantity}</span>
                          <span>Rp {Number(item.price || 0).toLocaleString('id-ID')}</span>
                        </div>

                        {item.note && (
                          <p className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded italic inline-block">
                            Catatan: {item.note}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* SUBTOTAL HARGA & COUNTER */}
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <span className="text-base sm:text-lg font-bold text-[#F28728]">
                        Rp {itemSubtotal.toLocaleString('id-ID')}
                      </span>

                      <div className="flex items-center bg-gray-100 rounded-xl px-2.5 py-1 gap-2 border border-gray-200">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-0.5 text-gray-700 hover:text-black font-bold transition-colors"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="font-bold text-xs sm:text-sm px-1.5 text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-0.5 text-gray-700 hover:text-black font-bold transition-colors"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* OPSI PENGAMBILAN & PEMBAYARAN */}
            {hasSelected && (
              <div className="space-y-6 pt-2 transition-all">
                
                {/* 1. TANGGAL PENGAMBILAN */}
                <div className="space-y-2">
                  <label className="text-sm sm:text-base font-semibold text-gray-900 block">
                    Tanggal Pengambilan
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-800 pointer-events-none">
                      <Calendar size={20} />
                    </div>
                    <input
                      type="date"
                      min={todayStr}
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-2xl pl-12 pr-4 py-3.5 text-sm sm:text-base font-medium text-gray-900 outline-none focus:border-green-500 cursor-pointer shadow-sm"
                    />
                  </div>
                </div>

                {/* 2. JAM PENGAMBILAN */}
                <div className="space-y-2">
                  <label className="text-sm sm:text-base font-semibold text-gray-900 block">
                    Jam Pengambilan
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-800 pointer-events-none">
                      <Clock size={20} />
                    </div>
                    <select
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-2xl pl-12 pr-10 py-3.5 text-sm sm:text-base font-medium text-gray-900 outline-none appearance-none focus:border-green-500 cursor-pointer shadow-sm"
                    >
                      {timeSlots.map((slot, index) => (
                        <option key={index} value={slot} className="text-gray-900">
                          {slot}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-800 pointer-events-none">
                      <ChevronDown size={20} />
                    </div>
                  </div>
                </div>

                {/* 3. METODE PEMBAYARAN */}
                <div className="space-y-2">
                  <label className="text-sm sm:text-base font-semibold text-gray-900 block">
                    Metode Pembayaran
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <div className="w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center">
                        <DollarSign size={13} className="stroke-[3]" />
                      </div>
                    </div>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-2xl pl-12 pr-10 py-3.5 text-sm sm:text-base font-medium text-gray-900 outline-none appearance-none focus:border-green-500 cursor-pointer shadow-sm"
                    >
                      <option value="Cash" className="text-gray-900">
                        Cash
                      </option>
                      <option value="Saldo Digital" className="text-gray-900">
                        Saldo Digital
                      </option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-800 pointer-events-none">
                      <ChevronDown size={20} />
                    </div>
                  </div>
                </div>

                {/* BANNER PERINGATAN */}
                <div className="flex items-center gap-3 bg-[#E5E7EB] rounded-full px-5 py-3.5 w-full">
                  <svg
                    className="w-6 h-6 text-gray-900 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <line x1="12" y1="8" x2="12" y2="12" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="12" y1="15.5" x2="12" y2="16" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <p className="text-xs sm:text-sm text-gray-900 font-semibold leading-relaxed">
                    Apakah anda yakin pesanan anda sudah benar? Mohon untuk cek kembali pesanan anda.
                  </p>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="py-20 text-center text-gray-400">
            <p className="text-base font-medium">Keranjang kamu masih kosong.</p>
            <button
              onClick={() => router.push('/home')}
              className="mt-4 rounded-xl bg-[#52C453] px-6 py-2.5 text-white font-bold text-sm hover:bg-[#43b044] transition-all shadow-sm"
            >
              Cari Makanan
            </button>
          </div>
        )}
      </div>

      {/* STICKY BOTTOM BAR */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 sm:px-8 py-3 shadow-lg z-50">
          <button
            onClick={handleCreateOrder}
            disabled={loading}
            className="w-full rounded-2xl bg-[#52C453] hover:bg-[#43b044] py-4 font-bold text-white text-base sm:text-lg transition-all active:scale-[0.99] text-center cursor-pointer shadow-sm"
          >
            {loading ? 'Memproses Pesanan...' : 'Buat Pesanan'}
          </button>
        </div>
      )}

    </div>
  );
}