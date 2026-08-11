'use client';

import React, { useState } from 'react';
import { ArrowLeft, Home, Trash2, Clock, Calendar, ChevronDown, DollarSign, Plus, Minus, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/app/context/CartContext';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export default function KeranjangPage() {
  const router = useRouter();
  const {
    cartItems,
    updateQuantity,
    toggleSelectItem,
    toggleSelectAll,
    clearSelectedItems,
    clearCart,
    selectedItems,
  } = useCart();

  const todayStr = new Date().toISOString().split('T')[0];
  const [pickupDate, setPickupDate] = useState<string>(todayStr);
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

  const handleCreateOrder = async () => {
    if (!hasSelected) {
      alert('Pilih minimal satu makanan terlebih dahulu!');
      return;
    }
    setLoading(true);

    // 1. Ambil Data Pelanggan yang Login
    const userLocal = JSON.parse(
      localStorage.getItem('user') || localStorage.getItem('smart_canteen_user') || '{}'
    );
    const namaPelanggan = userLocal.username || userLocal.nama || 'Siswa Pelanggan';

    // 2. Hitung Total Price
    const totalHarga = selectedItems.reduce(
      (sum: number, item: any) => sum + Number(item.price || 0) * Number(item.quantity || 1),
      0
    );

    // 3. Generate Unik order_id
    const generatedOrderId = `#SC${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    // 4. Format Items untuk LocalStorage & Component Strapi
    const localItems = selectedItems.map((item: any) => ({
      id: String(item.id),
      nama: String(item.name || item.nama || 'Makanan'),
      harga: Number(item.price || 0),
      qty: Number(item.quantity || 1),
      gambar: item.image || '',
      notes: item.notes || item.note || '',
    }));

    const strapiItemsComponent = selectedItems.map((item: any) => {
      const rawMenuId = item.id || item.documentId;
      const numMenuId = Number(rawMenuId);

      return {
        quantity: Number(item.quantity || 1),
        notes: String(item.notes || item.note || ''),
        menu: isNaN(numMenuId) ? rawMenuId : numMenuId,
      };
    });

    // 5. Payload yang 100% Presisi dengan Enum Strapi
    const strapiPayload = {
      data: {
        order_id: generatedOrderId,
        customer_name: namaPelanggan,
        payment_method: paymentMethod.toLowerCase() === 'cash' ? 'cash' : 'saldo_digital', // FIX: Enum huruf kecil sesuai error!
        total_price: totalHarga,
        menu_status: 'pending',
        payment_status: 'Tertunda', // FIX: Enum (Sukses, Gagal, Tertunda)
        pickup_time: pickupTime,
        pickup_date: pickupDate,
        items: strapiItemsComponent,
      },
    };

    // 6. Cadangan Data Lokal untuk Halaman Status Pesanan
    const pesananLokal = {
      orderId: generatedOrderId,
      createdAt: new Date().toISOString(),
      status: 'Menunggu Konfirmasi',
      menu_status: 'pending',
      customer_name: namaPelanggan,
      items: localItems,
      totalPrice: totalHarga,
      pickupDate: pickupDate,
      pickupTime: pickupTime,
      paymentMethod: paymentMethod,
    };

    // 7. Proses Pengiriman ke Database Strapi
    try {
      const response = await fetch(`${STRAPI_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(strapiPayload),
      });

      const resJson = await response.json();

      if (response.ok) {
        console.log('✅ Pesanan berhasil tersimpan di Strapi:', resJson);

        const dataLama = JSON.parse(localStorage.getItem('smart_canteen_orders') || '[]');
        dataLama.unshift(pesananLokal);
        localStorage.setItem('smart_canteen_orders', JSON.stringify(dataLama));

        clearSelectedItems();
        router.push('/status-pesanan');
      } else {
        console.error('❌ Error Detail dari Strapi:', resJson);

        const details = resJson?.error?.details?.errors;
        let detailMessage = '';
        if (Array.isArray(details)) {
          detailMessage = details.map((e: any) => `- ${e.path ? e.path.join('.') : 'field'}: ${e.message}`).join('\n');
        }

        alert(
          `Gagal menyimpan ke database Strapi!\n\nRincian Error:\n${
            detailMessage || resJson?.error?.message || 'Format data ditolak oleh Strapi'
          }`
        );
      }
    } catch (err) {
      console.warn('⚠️ Server Strapi offline / error koneksi:', err);
      alert('Tidak dapat terhubung ke server Strapi. Pastikan backend Strapi sedang menyala.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white font-sans text-gray-900 flex flex-col justify-between">
      <div className="w-full py-6 px-4 sm:px-8 space-y-6 pb-28">
        
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <button onClick={() => router.back()} className="text-gray-900 hover:text-orange-500 transition-colors p-1 -ml-1 cursor-pointer">
            <ArrowLeft size={26} />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Keranjang</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/home')} className="text-gray-900 hover:text-orange-500 transition-colors p-1 cursor-pointer">
              <Home size={24} />
            </button>
            {cartItems.length > 0 && (
              <button onClick={clearCart} className="text-gray-900 hover:text-red-500 transition-colors p-1 cursor-pointer" title="Kosongkan Keranjang">
                <Trash2 size={24} />
              </button>
            )}
          </div>
        </div>

        {cartItems.length > 0 ? (
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100">
              <label className="flex items-center gap-3 cursor-pointer font-semibold text-sm sm:text-base text-gray-800">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-5 h-5 accent-[#52C453] rounded cursor-pointer" />
                Pilih Semua ({cartItems.length} Makanan)
              </label>
              <span className="text-xs sm:text-sm text-gray-400">{selectedItems.length} Terpilih</span>
            </div>

            {/* DAFTAR ITEM */}
            <div className="bg-white border border-gray-200 rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
              {cartItems.map((item) => {
                const isChecked = item.selected ?? true;
                const itemSubtotal = Number(item.price || 0) * Number(item.quantity || 1);
                const itemNote = item.notes || item.note;

                return (
                  <div key={item.id} className="flex flex-col gap-2 pb-5 border-b border-gray-100 last:border-none last:pb-0">
                    <div className="flex items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 sm:gap-5 min-w-0 flex-1">
                        <input type="checkbox" checked={isChecked} onChange={() => toggleSelectItem(item.id)} className="w-5 h-5 accent-[#52C453] rounded cursor-pointer shrink-0" />
                        <img src={item.image || 'https://via.placeholder.com/150?text=Makanan'} alt={item.name} className="h-20 w-24 sm:h-24 sm:w-32 rounded-2xl object-cover bg-gray-100 shrink-0" />
                        <div className="min-w-0 space-y-1">
                          <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate">{item.name}</h3>
                          <div className="flex items-center gap-4 text-gray-800 font-medium text-sm sm:text-base">
                            <span className="font-bold text-black">{item.quantity}</span>
                            <span>Rp {Number(item.price || 0).toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <span className="text-base sm:text-lg font-bold text-[#F28728]">Rp {itemSubtotal.toLocaleString('id-ID')}</span>
                        <div className="flex items-center bg-gray-100 rounded-xl px-2.5 py-1 gap-2 border border-gray-200">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-0.5 text-gray-700 hover:text-black font-bold transition-colors cursor-pointer"><Minus size={13} /></button>
                          <span className="font-bold text-xs sm:text-sm px-1.5 text-gray-900">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-0.5 text-gray-700 hover:text-black font-bold transition-colors cursor-pointer"><Plus size={13} /></button>
                        </div>
                      </div>
                    </div>

                    {/* MENAMPILKAN CATATAN JIKA ADA */}
                    {itemNote && (
                      <div className="ml-8 sm:ml-10 flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 w-fit">
                        <FileText size={14} className="text-gray-400 shrink-0" />
                        <span>Catatan: <strong className="text-gray-700">{itemNote}</strong></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {hasSelected && (
              <div className="space-y-6 pt-2 transition-all">
                <div className="space-y-2">
                  <label className="text-sm sm:text-base font-semibold text-gray-900 block">Tanggal Pengambilan</label>
                  <div className="relative">
                    <Calendar size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-800 pointer-events-none" />
                    <input type="date" min={todayStr} value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className="w-full bg-[#FAFAFA] border border-gray-300 rounded-2xl pl-12 pr-4 py-3.5 text-sm sm:text-base font-medium text-gray-900 outline-none focus:border-green-500 cursor-pointer shadow-sm" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm sm:text-base font-semibold text-gray-900 block">Jam Pengambilan</label>
                  <div className="relative">
                    <Clock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-800 pointer-events-none" />
                    <select value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-full bg-[#FAFAFA] border border-gray-300 rounded-2xl pl-12 pr-10 py-3.5 text-sm sm:text-base font-medium text-gray-900 outline-none appearance-none focus:border-green-500 cursor-pointer shadow-sm">
                      {timeSlots.map((slot, index) => <option key={index} value={slot}>{slot}</option>)}
                    </select>
                    <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-800 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm sm:text-base font-semibold text-gray-900 block">Metode Pembayaran</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <div className="w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center">
                        <DollarSign size={13} className="stroke-[3]" />
                      </div>
                    </div>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-[#FAFAFA] border border-gray-300 rounded-2xl pl-12 pr-10 py-3.5 text-sm sm:text-base font-medium text-gray-900 outline-none appearance-none focus:border-green-500 cursor-pointer shadow-sm">
                      <option value="Cash">Cash</option>
                      <option value="Saldo Digital">Saldo Digital</option>
                    </select>
                    <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-800 pointer-events-none" />
                  </div>
                </div>

              </div>
            )}
          </div>
        ) : (
          <div className="py-20 text-center text-gray-400">
            <p className="text-base font-medium">Keranjang kamu masih kosong.</p>
            <button onClick={() => router.push('/home')} className="mt-4 rounded-xl bg-[#52C453] px-6 py-2.5 text-white font-bold text-sm hover:bg-[#43b044] transition-all shadow-sm cursor-pointer">
              Cari Makanan
            </button>
          </div>
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 sm:px-8 py-3 shadow-lg z-50">
          <button onClick={handleCreateOrder} disabled={loading} className="w-full rounded-2xl bg-[#52C453] hover:bg-[#43b044] py-4 font-bold text-white text-base sm:text-lg transition-all active:scale-[0.99] text-center cursor-pointer shadow-sm disabled:opacity-50">
            {loading ? 'Memproses Pesanan...' : 'Buat Pesanan'}
          </button>
        </div>
      )}
    </div>
  );
}