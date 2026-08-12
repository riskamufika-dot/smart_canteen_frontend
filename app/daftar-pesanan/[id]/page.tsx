'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  Utensils, 
  FileText, 
  ShoppingBag, 
  X, 
  Check,
  ImageIcon
} from 'lucide-react';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

type StatusType = 'Menunggu Konfirmasi' | 'Sedang Disiapkan' | 'Siap Diambil' | 'Selesai';

interface OrderItem {
  id?: number | string;
  name?: string;
  price?: number;
  quantity?: number;
  image?: string | null;
  notes?: string;
}

interface OrderDetail {
  id: number | string;
  documentId?: string;
  orderId: string;
  createdAt: string;
  orderTime: string;      
  orderDate: string;      
  pickupTime: string;     
  pickupDate: string;     
  paymentMethod: string;
  customerName: string;
  customerClass: string;
  items: OrderItem[];
  notes: string[];
  totalPrice: number;
  totalItem: number;
  status: StatusType;
  historyTime: {
    menunggu?: string;
    disiapkan?: string;
    siap?: string;
    selesai?: string;
  };
}

export default function DetailPesananPage() {
  const router = useRouter();
  const params = useParams();
  const rawParam = params?.id ? decodeURIComponent(String(params.id)) : '';

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // Helper Ambil URL Gambar Lengkap dari Strapi
  const getImageUrl = (imageAttr: any): string | null => {
    if (!imageAttr) return null;

    if (typeof imageAttr === 'string') {
      if (imageAttr.startsWith('http://') || imageAttr.startsWith('https://')) return imageAttr;
      return `${STRAPI_URL}${imageAttr.startsWith('/') ? '' : '/'}${imageAttr}`;
    }

    if (Array.isArray(imageAttr) && imageAttr.length > 0) {
      return getImageUrl(imageAttr[0]);
    }

    const imgObj = imageAttr.data?.attributes || imageAttr.data || imageAttr.attributes || imageAttr;
    const url = 
      imgObj?.formats?.medium?.url || 
      imgObj?.formats?.small?.url || 
      imgObj?.formats?.thumbnail?.url || 
      imgObj?.url;

    if (url) {
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      return `${STRAPI_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    return null;
  };

  // Parsing Items & Pencocokan Otomatis dengan Master Menu Strapi
  // Parsing Items & Pencocokan Otomatis dengan Master Menu Strapi + LocalStorage Fallback
  // 1. Parsing Items yang Diperbaiki (Menghapus matching harga agresif agar menu tidak tertukar)
  const parseItems = (attrData: any, allStrapiMenus: any[] = [], localItemsBackup: any[] = []): OrderItem[] => {
    let rawItems = attrData?.items || attrData?.order_items || attrData?.menu_items || attrData?.details || [];

    if (typeof rawItems === 'string') {
      try { rawItems = JSON.parse(rawItems); } catch (e) { rawItems = []; }
    }

    if (rawItems && !Array.isArray(rawItems) && Array.isArray(rawItems.data)) {
      rawItems = rawItems.data;
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      if (Array.isArray(localItemsBackup) && localItemsBackup.length > 0) {
        rawItems = localItemsBackup;
      } else {
        return [];
      }
    }

    return rawItems.map((it: any, idx: number) => {
      const itemAttr = it.attributes || it;
      const menuRel = itemAttr.menu?.data?.attributes || 
                      itemAttr.menu?.data || 
                      itemAttr.menu?.attributes || 
                      itemAttr.menu || 
                      {};

      // Ambil nama
      let name = itemAttr.name || 
                 itemAttr.nama || 
                 itemAttr.nama_makanan || 
                 itemAttr.nama_menu || 
                 itemAttr.title ||
                 menuRel.name || 
                 menuRel.nama;

      // Ambil harga
      let price = Number(
        itemAttr.price || 
        itemAttr.harga || 
        menuRel.price || 
        menuRel.harga || 
        0
      );

      const quantity = Number(
        itemAttr.quantity || 
        itemAttr.qty || 
        itemAttr.jumlah || 
        1
      );

      let rawImg = menuRel.image || menuRel.gambar || menuRel.foto || itemAttr.image || itemAttr.gambar || itemAttr.foto;

      // Ekstrak ID menu
      const targetMenuId = menuRel.id || 
                           itemAttr.menu_id || 
                           itemAttr.menuId || 
                           (typeof itemAttr.menu === 'object' ? itemAttr.menu?.id : (typeof itemAttr.menu === 'number' || typeof itemAttr.menu === 'string' ? itemAttr.menu : null)) ||
                           itemAttr.id ||
                           menuRel.documentId;

      // Fallback 1: Ambil dari backup lokal berdasarkan INDEX (bukan pencocokan harga)
      if ((!name || price === 0) && Array.isArray(localItemsBackup) && localItemsBackup[idx]) {
        const b = localItemsBackup[idx];
        if (!name) name = b.name || b.nama || b.nama_makanan;
        if (price === 0) price = Number(b.price || b.harga || 0);
        if (!rawImg) rawImg = b.image || b.gambar || b.foto;
      }
      
      // Fallback 2: Pencocokan ke Master Menu Strapi BERDASARKAN ID ATAU NAMA
      if (allStrapiMenus.length > 0) {
        const matchedMenu = allStrapiMenus.find((m: any) => {
          const mAttr = m.attributes || m;
          const mName = mAttr.name || mAttr.nama || '';
          return (
            (targetMenuId && String(m.id) === String(targetMenuId)) ||
            (targetMenuId && String(m.documentId) === String(targetMenuId)) ||
            (name && mName.toLowerCase().trim() === String(name).toLowerCase().trim())
          );
        });

        if (matchedMenu) {
          const mAttr = matchedMenu.attributes || matchedMenu;
          if (!name) name = mAttr.name || mAttr.nama;
          if (price === 0) price = Number(mAttr.price || mAttr.harga || 0);
          if (!rawImg) rawImg = mAttr.image || mAttr.gambar || mAttr.foto;
        }
      }

      return {
        id: targetMenuId || itemAttr.id || Math.random(),
        name: name || 'Menu Makanan',
        price: price || 0,
        quantity: quantity,
        image: getImageUrl(rawImg),
        notes: itemAttr.notes || itemAttr.catatan || itemAttr.note || '',
      };
    });
  };

  // 2. FetchOrderDetail yang Diperbaiki (Total Bayar dihitung murni dari penjumlahan item)
  const fetchOrderDetail = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    let foundOrder: OrderDetail | null = null;
    let strapiMatchData: any = null;
    let allStrapiMenus: any[] = [];

    const cleanParam = rawParam.trim();
    const numOnlyParam = cleanParam.replace(/[^0-9]/g, '');

    let localMatchedOrder: any = null;
    try {
      const savedOrders = JSON.parse(localStorage.getItem('smart_canteen_orders') || '[]');
      localMatchedOrder = savedOrders.find((o: any) => {
        const itemOrderId = String(o.orderId || o.order_id || o.id || '');
        const cleanOrderId = itemOrderId.replace('#', '').trim();
        return (
          itemOrderId === cleanParam ||
          cleanOrderId === cleanParam ||
          String(o.id) === cleanParam ||
          (numOnlyParam && String(o.id) === numOnlyParam)
        );
      });
    } catch (e) {
      console.warn('Error reading local orders:', e);
    }

    try {
      const [resList, resMenus] = await Promise.all([
        fetch(`${STRAPI_URL}/api/orders?populate=*&status=draft&pagination[pageSize]=1000&sort[0]=createdAt:desc`, { cache: 'no-store' }),
        fetch(`${STRAPI_URL}/api/menus?populate=*&status=draft&pagination[pageSize]=1000`).catch(() => null)
      ]);
      
      if (resMenus && resMenus.ok) {
        const jsonMenus = await resMenus.json();
        allStrapiMenus = jsonMenus.data || [];
      }

      if (resList.ok) {
        const jsonList = await resList.json();
        const dataList = jsonList.data || [];
        
        strapiMatchData = dataList.find((data: any) => {
          const attr = data.attributes ? { ...data.attributes, id: data.id, documentId: data.documentId } : data;
          const itemOrderId = String(attr.order_id || attr.orderId || `#SC-${data.id}`);
          const cleanOrderId = itemOrderId.replace('#', '').trim();

          return (
            String(data.documentId) === cleanParam ||
            String(data.id) === cleanParam ||
            itemOrderId === cleanParam ||
            cleanOrderId === cleanParam ||
            (numOnlyParam && String(data.id) === numOnlyParam)
          );
        });
      }
    } catch (e) {
      console.error('Gagal mengambil detail pesanan dari Strapi:', e);
    }

    const activeData = strapiMatchData 
      ? (strapiMatchData.attributes ? { ...strapiMatchData.attributes, id: strapiMatchData.id, documentId: strapiMatchData.documentId } : strapiMatchData) 
      : localMatchedOrder;

    if (activeData) {
      const userObj = activeData.users_permissions_user?.data?.attributes || 
                      activeData.users_permissions_user?.data ||
                      activeData.users_permissions_user || 
                      activeData.user?.data?.attributes || 
                      activeData.user || {};

      const rawDate = activeData.createdAt ? new Date(activeData.createdAt) : new Date();
      const formattedOrderTime = rawDate.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).replace('.', ':') + ' WIB';

      const formattedOrderDate = rawDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const userPickupTime = activeData.pickup_time || activeData.pickupTime || formattedOrderTime;

      const effectiveStatusStr = localMatchedOrder?.status || localMatchedOrder?.menu_status || activeData.status_pesanan || activeData.menu_status || activeData.status || activeData.order_status || '';
      const rawStatus = String(effectiveStatusStr).toLowerCase();
      let normStatus: StatusType = 'Menunggu Konfirmasi';

      if (rawStatus.includes('disiapkan') || rawStatus === 'sedang_disiapkan') {
        normStatus = 'Sedang Disiapkan';
      } else if (rawStatus.includes('siap') || rawStatus === 'siap_diambil') {
        normStatus = 'Siap Diambil';
      } else if (rawStatus.includes('selesai')) {
        normStatus = 'Selesai';
      }

      const localBackupItems = localMatchedOrder?.items || activeData?.items || [];
      let parsedList = parseItems(activeData, allStrapiMenus, localBackupItems);

      // Hitung Qty dan Total secara DINAMIS murni dari item yang tampil
      const calculatedQty = parsedList.reduce((acc, it) => acc + (it.quantity || 1), 0);
      const calculatedTotal = parsedList.reduce((acc, it) => acc + (Number(it.price || 0) * Number(it.quantity || 1)), 0);

      // UTAMAKAN HASIL KALKULASI DINAMIS (Kecuali jika calculatedTotal 0, baru gunakan nilai fallback)
      const finalTotalPrice = calculatedTotal > 0 
        ? calculatedTotal 
        : Number(activeData.total_price || activeData.totalPrice || activeData.total || 0);

      let userNotes: string[] = parsedList.map(i => i.notes).filter(Boolean) as string[];
      if (userNotes.length === 0) {
        if (activeData.catatan) userNotes = Array.isArray(activeData.catatan) ? activeData.catatan : [String(activeData.catatan)];
        else if (activeData.notes) userNotes = Array.isArray(activeData.notes) ? activeData.notes : [String(activeData.notes)];
      }

      const customerName = activeData.customer_name || 
                           activeData.nama_siswa || 
                           activeData.nama_pemesan || 
                           userObj.username || 
                           userObj.nama || 
                           'Siswa Pelanggan';

      const customerClass = activeData.kelas || 
                            activeData.customer_class || 
                            userObj.kelas || 
                            '-';

      foundOrder = {
        id: activeData.id || rawParam,
        documentId: activeData.documentId,
        orderId: activeData.order_id || activeData.orderId || `#SC-${activeData.id || rawParam}`,
        createdAt: activeData.createdAt || new Date().toISOString(),
        orderTime: formattedOrderTime,
        orderDate: formattedOrderDate,
        pickupTime: userPickupTime,
        pickupDate: formattedOrderDate,
        paymentMethod: activeData.payment_method === 'cash' ? 'Bayar di Kantin' : (activeData.payment_method || 'Bayar di Kantin'),
        customerName: customerName,
        customerClass: customerClass,
        items: parsedList,
        notes: userNotes,
        totalPrice: finalTotalPrice,
        totalItem: calculatedQty,
        status: normStatus,
        historyTime: {
          menunggu: `${formattedOrderDate} ${formattedOrderTime}`,
          disiapkan: normStatus !== 'Menunggu Konfirmasi' ? `${formattedOrderDate} ${formattedOrderTime}` : undefined,
          siap: normStatus === 'Siap Diambil' || normStatus === 'Selesai' ? `${formattedOrderDate} ${userPickupTime}` : undefined,
          selesai: normStatus === 'Selesai' ? `${formattedOrderDate} ${userPickupTime}` : undefined,
        }
      };
    }

    setOrder(foundOrder);
    if (!isSilent) setLoading(false);
  }, [rawParam]);

  useEffect(() => {
    fetchOrderDetail();

    const interval = setInterval(() => {
      fetchOrderDetail(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchOrderDetail]);

  // Update Status Pesanan ke Strapi & LocalStorage (Sync 100%)
  const updateOrderStatus = async (newStatus: StatusType) => {
    if (!order) return;

    const currentTimeStr = `${order.orderDate} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')} WIB`;

    const updatedOrder: OrderDetail = {
      ...order,
      status: newStatus,
      historyTime: {
        ...order.historyTime,
        ...(newStatus === 'Sedang Disiapkan' && { disiapkan: currentTimeStr }),
        ...(newStatus === 'Siap Diambil' && { siap: currentTimeStr }),
        ...(newStatus === 'Selesai' && { selesai: currentTimeStr }),
      }
    };

    // 1. Update State Lokal Langsung
    setOrder(updatedOrder);

    // 2. Update status di LocalStorage smart_canteen_orders agar sinkron dan tidak revert saat polling
    try {
      const savedOrders = JSON.parse(localStorage.getItem('smart_canteen_orders') || '[]');
      const cleanTargetId = String(order.orderId || order.id).replace('#', '').trim();
      
      const updatedOrders = savedOrders.map((o: any) => {
        const itemOrderId = String(o.orderId || o.order_id || o.id || '');
        const cleanItemOrderId = itemOrderId.replace('#', '').trim();
        if (
          itemOrderId === String(order.orderId) ||
          cleanItemOrderId === cleanTargetId ||
          String(o.id) === String(order.id)
        ) {
          return {
            ...o,
            status: newStatus,
            menu_status: newStatus.toLowerCase().replace(/\s+/g, '_'),
            order_status: newStatus,
            updatedAt: new Date().toISOString(),
          };
        }
        return o;
      });
      localStorage.setItem('smart_canteen_orders', JSON.stringify(updatedOrders));
    } catch (e) {
      console.warn('Gagal update LocalStorage:', e);
    }

    const strapiSlugStatus = 
      newStatus === 'Sedang Disiapkan' ? 'sedang_disiapkan' : 
      newStatus === 'Siap Diambil' ? 'siap_diambil' : 
      newStatus === 'Selesai' ? 'selesai' : 'menunggu_konfirmasi';

    const targetEndpoint = order.documentId 
      ? `${STRAPI_URL}/api/orders/${order.documentId}`
      : `${STRAPI_URL}/api/orders/${order.id}`;

    // 3. Update ke Backend Strapi
    try {
      await fetch(targetEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            status_pesanan: newStatus,
            menu_status: strapiSlugStatus,
            status: newStatus,
            order_status: newStatus,
          }
        }),
      });
    } catch (e) {
      console.warn('Backend Strapi offline, status tersimpan di LocalStorage:', e);
    }

    if (newStatus === 'Selesai') {
      setShowSuccessModal(true);
    }
  };

  const handleKonfirmasiPesanan = () => {
    if (order?.status === 'Menunggu Konfirmasi') {
      updateOrderStatus('Sedang Disiapkan');
    }
  };

  const handleSiapDiambil = () => {
    if (order?.status === 'Menunggu Konfirmasi') {
      setShowErrorModal(true);
      return;
    }
    if (order?.status === 'Sedang Disiapkan') {
      updateOrderStatus('Siap Diambil');
    }
  };

  const handleSelesai = () => {
    if (order?.status === 'Siap Diambil') {
      updateOrderStatus('Selesai');
    }
  };

  const handleBatalkanPesanan = () => {
    if (confirm('Apakah Anda yakin ingin membatalkan/menolak pesanan ini?')) {
      updateOrderStatus('Menunggu Konfirmasi');
      alert('Pesanan telah dibatalkan.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center font-sans font-bold text-gray-500 p-4">
        Memuat Detail Pesanan...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center font-sans gap-4 p-6 text-center">
        <p className="text-gray-500 font-bold text-lg">Pesanan tidak ditemukan.</p>
        <button
          onClick={() => router.push('/daftar-pesanan')}
          className="px-6 py-2.5 bg-[#E07A2F] text-white rounded-full font-bold cursor-pointer hover:bg-orange-600 transition-colors"
        >
          Kembali ke Daftar Pesanan
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white font-sans text-gray-900 p-4 sm:p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header Navigation */}
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 sm:mb-8">
          <button
            onClick={() => router.push('/daftar-pesanan')}
            className="self-start sm:self-auto flex items-center gap-2 text-gray-900 hover:text-orange-500 font-bold text-base sm:text-lg transition-colors cursor-pointer z-10"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            <span>kembali</span>
          </button>

          <h1 className="sm:absolute sm:left-1/2 sm:-translate-x-1/2 text-2xl sm:text-3xl font-extrabold text-gray-900 text-center">
            Detail Pesanan
          </h1>
          <div className="hidden sm:block w-24"></div>
        </div>

        {/* Informasi Utama Pesanan */}
        <div className="bg-white border border-gray-300 rounded-2xl sm:rounded-3xl p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-left shadow-2xs">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-500 block">Id Pemesanan</span>
            <span className="text-sm sm:text-lg font-extrabold text-[#E07A2F] break-all">{order.orderId}</span>
          </div>
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-500 block">Tanggal</span>
            <span className="text-sm sm:text-lg font-bold text-gray-900">{order.orderDate}</span>
          </div>
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-500 block">Jam Pesan</span>
            <span className="text-sm sm:text-lg font-bold text-gray-900">{order.orderTime}</span>
          </div>
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-500 block">Metode Pembayaran</span>
            <span className="text-sm sm:text-lg font-bold text-gray-900">{order.paymentMethod}</span>
          </div>
        </div>

        {/* Data Pelanggan */}
        <div className="bg-white border border-gray-300 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 text-[#E07A2F] font-bold text-base sm:text-lg">
            <User className="w-5 h-5" />
            <span className="text-gray-900 font-extrabold">Data Pelanggan</span>
          </div>
          <div className="space-y-1.5 text-sm sm:text-base font-bold text-gray-800 pl-1">
            <div className="flex gap-2 sm:gap-4">
              <span className="w-16 sm:w-20 text-gray-700 shrink-0">Nama</span>
              <span className="break-all">: {order.customerName}</span>
            </div>
            <div className="flex gap-2 sm:gap-4">
              <span className="w-16 sm:w-20 text-gray-700 shrink-0">Kelas</span>
              <span>: {order.customerClass}</span>
            </div>
          </div>
        </div>

        {/* Daftar Menu Pesanan */}
        <div className="bg-white border border-gray-300 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 text-[#E07A2F] font-bold text-base sm:text-lg mb-2">
            <Utensils className="w-5 h-5" />
            <span className="text-gray-900 font-extrabold">Menu</span>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600 font-bold text-xs sm:text-sm">
                  <th className="pb-3 pl-2">Nama Menu</th>
                  <th className="pb-3 text-center w-36">Harga</th>
                  <th className="pb-3 text-center w-28">Jumlah</th>
                  <th className="pb-3 text-right w-36">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm sm:text-base font-semibold text-gray-900">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, idx) => {
                    const price = Number(item.price || 0);
                    const qty = Number(item.quantity || 1);
                    const subtotal = price * qty;

                    return (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="py-4 pl-2">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gray-100 overflow-hidden border border-gray-200 shrink-0 flex items-center justify-center">
                              {item.image ? (
                                <img 
                                  src={item.image} 
                                  alt={item.name} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="w-6 h-6 text-gray-400" />
                              )}
                            </div>
                            <span className="font-extrabold text-gray-900 text-base">{item.name}</span>
                          </div>
                        </td>
                        <td className="py-4 text-center font-medium text-gray-800">
                          Rp {price.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 text-center font-bold text-gray-900">
                          {qty}
                        </td>
                        <td className="py-4 text-right font-extrabold text-gray-900">
                          Rp {subtotal.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400">Tidak ada item menu terdeteksi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="block md:hidden space-y-3">
            {order.items && order.items.length > 0 ? (
              order.items.map((item, idx) => {
                const price = Number(item.price || 0);
                const qty = Number(item.quantity || 1);
                const subtotal = price * qty;

                return (
                  <div key={idx} className="flex gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 items-center">
                    <div className="w-16 h-16 rounded-xl bg-gray-200 overflow-hidden shrink-0 flex items-center justify-center border border-gray-200">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{item.name}</p>
                      <p className="text-xs text-gray-500 font-medium">
                        Rp {price.toLocaleString('id-ID')} × {qty}
                      </p>
                      <p className="text-sm font-extrabold text-[#E07A2F] mt-1">
                        Rp {subtotal.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-xs text-gray-400 py-4">Tidak ada item menu terdeteksi.</p>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between items-center text-sm sm:text-base font-bold text-gray-800">
              <span className="text-left font-semibold text-gray-700">Total Item</span>
              <span className="text-right font-extrabold text-gray-900">{order.totalItem}</span>
            </div>
            <div className="flex justify-between items-center text-base sm:text-xl font-black pt-1">
              <span className="text-left text-gray-900">Total Bayar</span>
              <span className="text-right text-[#E07A2F]">
                Rp {order.totalPrice.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Catatan Pesanan */}
        <div className="bg-white border border-gray-300 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-2 shadow-2xs">
          <div className="flex items-center gap-2 text-[#E07A2F] font-bold text-base sm:text-lg">
            <FileText className="w-5 h-5" />
            <span className="text-gray-900 font-extrabold">Catatan</span>
          </div>
          <div className="text-sm sm:text-base font-semibold text-gray-600 pl-1 space-y-1">
            {order.notes && order.notes.length > 0 ? (
              order.notes.map((note, idx) => (
                <p key={idx}>{idx + 1}. {note}</p>
              ))
            ) : (
              <p className="text-gray-400 italic">Tidak ada catatan khusus.</p>
            )}
          </div>
        </div>

        {/* Status Pesanan Step Indicator */}
        <div className="bg-white border border-gray-300 rounded-2xl sm:rounded-3xl p-4 sm:p-8 space-y-6 sm:space-y-8 shadow-2xs">
          <h3 className="text-base sm:text-xl font-extrabold text-gray-900">
            Status Pesanan
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-2 relative">
            <div className="flex flex-col items-center gap-1.5 z-10 text-center">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                order.status === 'Menunggu Konfirmasi'
                  ? 'bg-[#E07A2F] border-[#E07A2F] text-white shadow-md'
                  : 'bg-white border-gray-300 text-gray-700'
              }`}>
                <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className={`text-xs sm:text-sm font-bold ${order.status === 'Menunggu Konfirmasi' ? 'text-[#E07A2F]' : 'text-gray-600'}`}>
                Menunggu
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                {order.historyTime.menunggu || `${order.orderDate} ${order.orderTime}`}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1.5 z-10 text-center">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                order.status === 'Sedang Disiapkan'
                  ? 'bg-[#E07A2F] border-[#E07A2F] text-white shadow-md'
                  : 'bg-white border-gray-300 text-gray-700'
              }`}>
                <Utensils className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className={`text-xs sm:text-sm font-bold ${order.status === 'Sedang Disiapkan' ? 'text-[#E07A2F]' : 'text-gray-600'}`}>
                Sedang Disiapkan
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                {order.historyTime.disiapkan || '-'}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1.5 z-10 text-center">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                order.status === 'Siap Diambil'
                  ? 'bg-[#22AD5C] border-[#22AD5C] text-white shadow-md'
                  : 'bg-white border-gray-300 text-gray-700'
              }`}>
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className={`text-xs sm:text-sm font-bold ${order.status === 'Siap Diambil' ? 'text-[#22AD5C]' : 'text-gray-600'}`}>
                Siap Diambil
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                {order.historyTime.siap || '-'}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1.5 z-10 text-center">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                order.status === 'Selesai'
                  ? 'bg-[#22AD5C] border-[#22AD5C] text-white shadow-md'
                  : 'bg-white border-gray-300 text-gray-700'
              }`}>
                <Check className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
              </div>
              <span className={`text-xs sm:text-sm font-bold ${order.status === 'Selesai' ? 'text-[#22AD5C]' : 'text-gray-600'}`}>
                Selesai
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                {order.historyTime.selesai || '-'}
              </span>
            </div>
          </div>

          {/* Action Buttons Penjual */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={handleBatalkanPesanan}
              className="w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl border border-gray-300 font-bold text-red-500 hover:bg-red-50 transition-all active:scale-98 cursor-pointer text-center text-sm sm:text-base"
            >
              {order.status === 'Menunggu Konfirmasi' ? 'Tolak Pesanan' : 'Batalkan Pesanan'}
            </button>

            <button
              onClick={handleKonfirmasiPesanan}
              disabled={order.status !== 'Menunggu Konfirmasi'}
              className={`w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl font-bold transition-all text-center text-sm sm:text-base cursor-pointer active:scale-98 ${
                order.status === 'Menunggu Konfirmasi'
                  ? 'bg-[#E07A2F] hover:bg-orange-600 text-white shadow-md'
                  : 'border border-gray-300 text-gray-400 bg-gray-50/50 cursor-not-allowed'
              }`}
            >
              Konfirmasi Pesanan
            </button>

            {order.status === 'Siap Diambil' ? (
              <button
                onClick={handleSelesai}
                className="w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl bg-[#E07A2F] hover:bg-orange-600 text-white shadow-md active:scale-98 cursor-pointer text-center text-sm sm:text-base"
              >
                Selesai
              </button>
            ) : (
              <button
                onClick={handleSiapDiambil}
                className={`w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl font-bold transition-all text-center text-sm sm:text-base cursor-pointer active:scale-98 ${
                  order.status === 'Sedang Disiapkan'
                    ? 'bg-[#E07A2F] hover:bg-orange-600 text-white shadow-md'
                    : 'border border-gray-300 text-gray-400 bg-gray-50/50'
                }`}
              >
                Siap Diambil
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Modal Peringatan */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-10 max-w-md w-full text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 sm:w-28 sm:h-28 bg-[#DC2626] rounded-full flex items-center justify-center mx-auto shadow-lg">
              <X className="w-10 h-10 sm:w-16 sm:h-16 text-white stroke-[3]" />
            </div>

            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 leading-snug px-2">
              Tidak dapat melanjutkan aktivitas sebelum anda mengonfirmasi pesanan
            </h3>

            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full py-3.5 bg-[#E07A2F] hover:bg-orange-600 text-white font-bold text-base sm:text-xl rounded-2xl transition-all shadow-md cursor-pointer active:scale-98"
            >
              Kembali
            </button>
          </div>
        </div>
      )}

      {/* Modal Berhasil */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-10 max-w-md w-full text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 sm:w-28 sm:h-28 bg-[#52C453] rounded-full flex items-center justify-center mx-auto shadow-lg">
              <Check className="w-10 h-10 sm:w-16 sm:h-16 text-white stroke-[3.5]" />
            </div>

            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 leading-snug">
              Pesanan sudah selesai<br />Terima Kasih!
            </h3>

            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.push('/daftar-pesanan');
              }}
              className="w-full py-3.5 bg-[#E07A2F] hover:bg-orange-600 text-white font-bold text-base sm:text-xl rounded-2xl transition-all shadow-md cursor-pointer active:scale-98"
            >
              Kembali
            </button>
          </div>
        </div>
      )}

    </div>
  );
}