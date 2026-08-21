'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  User,
  UtensilsCrossed,
  FileText,
  Clock,
  ChefHat,
  ShoppingBag,
  Check,
  X
} from 'lucide-react';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

type StatusType = 'Menunggu Konfirmasi' | 'Sedang Disiapkan' | 'Siap Diambil' | 'Selesai';

interface OrderItem {
  id?: number | string;
  name?: string;
  price?: number;
  quantity?: number;
  notes?: string;
}

interface StatusTimestamps {
  menunggu: string;
  disiapkan: string;
  siapDiambil: string;
  selesai: string;
}

interface OrderDetail {
  documentId: string;
  id?: number | string;
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
  timestamps: StatusTimestamps;
}

export default function DetailPesananPage() {
  const router = useRouter();
  const params = useParams();

  let rawParam = '';
  try {
    if (params?.id) {
      const unwrappedParams = React.use ? (React.use(params as any) as any) : params;
      rawParam = unwrappedParams?.id ? decodeURIComponent(String(unwrappedParams.id)).trim() : '';
    }
  } catch (e) {
    rawParam = params?.id ? decodeURIComponent(String(params.id)).trim() : '';
  }

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // State Pop-up Modal
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  const isUpdatingRef = useRef<boolean>(false);

  // Helper format jam
  const getCurrentFormattedTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':') + ' WIB';
  };

  // Parser Item Kuat & Fleksibel
  const parseItems = (attrData: any, localOrderItems: any[] = []): OrderItem[] => {
    let rawItems = attrData?.items || attrData?.order_items || attrData?.details || attrData?.menu_items || [];

    if (typeof rawItems === 'string') {
      try { rawItems = JSON.parse(rawItems); } catch (e) { rawItems = []; }
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      if (Array.isArray(localOrderItems) && localOrderItems.length > 0) {
        rawItems = localOrderItems;
      }
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      if (attrData?.menu_name || attrData?.nama_menu || attrData?.menu) {
        rawItems = [{
          name: attrData.menu_name || attrData.nama_menu || attrData.menu,
          price: attrData.harga || attrData.price || attrData.total_price || attrData.totalPrice,
          quantity: attrData.quantity || attrData.qty || attrData.total_item || 1
        }];
      } else {
        return [];
      }
    }

    const overallTotal = Number(attrData?.total_price || attrData?.totalPrice || 0);

    return rawItems.map((it: any, idx: number) => {
      const itemAttr = it.attributes || it;
      const menuObj = itemAttr.menu?.data?.attributes || itemAttr.menu?.data || itemAttr.menu || itemAttr.menu_item || {};
      const localMatch = localOrderItems[idx] || {};

      const name =
        itemAttr.name || itemAttr.nama || itemAttr.nama_menu || itemAttr.menu_name || itemAttr.title ||
        menuObj.name || menuObj.nama || menuObj.title ||
        localMatch.name || localMatch.nama ||
        'Menu Kantin';

      const quantity = Number(
        itemAttr.quantity || itemAttr.qty || itemAttr.jumlah ||
        localMatch.quantity || localMatch.qty || 1
      );

      let price = Number(
        itemAttr.price || itemAttr.harga || itemAttr.harga_satuan || itemAttr.unit_price ||
        menuObj.price || menuObj.harga ||
        localMatch.price || localMatch.harga || 0
      );

      if (price === 0) {
        const itemSubtotal = Number(itemAttr.subtotal || itemAttr.total_harga || itemAttr.totalPrice || 0);
        if (itemSubtotal > 0) {
          price = itemSubtotal / quantity;
        } else if (overallTotal > 0 && rawItems.length === 1) {
          price = overallTotal / quantity;
        }
      }

      return {
        id: itemAttr.id || idx,
        name,
        price,
        quantity,
        notes: itemAttr.notes || itemAttr.catatan || itemAttr.note || localMatch.notes || localMatch.catatan || '',
      };
    });
  };

  // Fetch Data Pesanan & Timestamp Aman
  const fetchOrderDetail = useCallback(async (isSilent = false) => {
    if (isUpdatingRef.current || !rawParam) return;

    if (!isSilent) setLoading(true);
    let activeData: any = null;
    const cleanNoHash = rawParam.replace('#', '').trim();

    let savedLocalStatus: StatusType | null = null;
    let savedTimestamps: StatusTimestamps | null = null;
    let localMatchingOrder: any = null;

    if (typeof window !== 'undefined') {
      try {
        const localOrders = JSON.parse(localStorage.getItem('smart_canteen_orders') || '[]');
        localMatchingOrder = localOrders.find((o: any) => {
          const docId = String(o.documentId || '');
          const idStr = String(o.id || '');
          const orderIdStr = String(o.orderId || o.order_id || '').replace('#', '').trim();
          return docId === rawParam || idStr === rawParam || orderIdStr === cleanNoHash;
        });

        if (localMatchingOrder) {
          if (localMatchingOrder.status) savedLocalStatus = localMatchingOrder.status as StatusType;
          if (localMatchingOrder.timestamps) savedTimestamps = localMatchingOrder.timestamps as StatusTimestamps;
        }
      } catch (e) {}
    }

    try {
      const resFilter = await fetch(
        `${STRAPI_URL}/api/orders?populate=*&populate[items][populate][menu]=*&filters[$or][0][documentId][$eq]=${rawParam}&filters[$or][1][order_id][$contains]=${cleanNoHash}`,
        { cache: 'no-store' }
      );
      if (resFilter.ok) {
        const jsonRes = await resFilter.json();
        const dataList = jsonRes.data || [];
        if (dataList.length > 0) {
          const found = dataList[0];
          activeData = found.attributes ? { ...found.attributes, id: found.id, documentId: found.documentId } : found;
        }
      }
    } catch (e) {}

    if (!activeData) {
      try {
        const resAll = await fetch(`${STRAPI_URL}/api/orders?populate=*&populate[items][populate][menu]=*&pagination[pageSize]=100`, { cache: 'no-store' });
        if (resAll.ok) {
          const jsonOrders = await resAll.json();
          const dataList = jsonOrders.data || [];

          const found = dataList.find((data: any) => {
            const attr = data.attributes ? { ...data.attributes, id: data.id, documentId: data.documentId } : data;
            const docId = String(attr.documentId || '');
            const idNum = String(data.id || attr.id || '');
            const orderIdStr = String(attr.order_id || attr.orderId || '').replace('#', '').trim();

            return (
              docId === rawParam ||
              idNum === rawParam ||
              orderIdStr === cleanNoHash ||
              orderIdStr.includes(cleanNoHash)
            );
          });

          if (found) {
            activeData = found.attributes ? { ...found.attributes, id: found.id, documentId: found.documentId } : found;
          }
        }
      } catch (e) {
        console.error('Fetch error:', e);
      }
    }

    if (activeData || localMatchingOrder) {
      const dataToUse = activeData || localMatchingOrder;

      const rawUser = dataToUse.users_permissions_user?.data?.attributes || dataToUse.users_permissions_user;
      const userObj = (rawUser && typeof rawUser === 'object') ? rawUser : {};

      const rawDate = dataToUse.createdAt ? new Date(dataToUse.createdAt) : new Date();
      const formattedOrderTime = rawDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':') + ' WIB';
      const formattedOrderDate = rawDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const rawPickupTime = dataToUse.pickup_time || dataToUse.pickupTime || dataToUse.jam_pengambilan || formattedOrderTime;

      let normStatus: StatusType = savedLocalStatus || 'Menunggu Konfirmasi';
      if (!savedLocalStatus && activeData) {
        const rawStatus = String(dataToUse.menu_status || dataToUse.status || '').toLowerCase();
        if (rawStatus.includes('selesai')) normStatus = 'Selesai';
        else if (rawStatus.includes('siap')) normStatus = 'Siap Diambil';
        else if (rawStatus.includes('disiapkan') || rawStatus.includes('proses')) normStatus = 'Sedang Disiapkan';
      }

      const localItemsList = localMatchingOrder?.items || [];
      const parsedList = parseItems(dataToUse, localItemsList);

      const calculatedQty = parsedList.reduce((acc, it) => acc + (it.quantity || 1), 0);
      const calculatedTotal = parsedList.reduce((acc, it) => acc + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
      const finalTotalPrice = Number(dataToUse.total_price || dataToUse.totalPrice) || calculatedTotal;

      let extractedNotes: string[] = [];
      const rootNotes = dataToUse.catatan || dataToUse.notes || dataToUse.order_notes || localMatchingOrder?.catatan || localMatchingOrder?.notes;
      if (Array.isArray(rootNotes)) {
        extractedNotes = rootNotes.map(n => String(n)).filter(Boolean);
      } else if (typeof rootNotes === 'string' && rootNotes.trim() !== '') {
        try {
          const parsed = JSON.parse(rootNotes);
          if (Array.isArray(parsed)) extractedNotes = parsed.map(n => String(n)).filter(Boolean);
          else extractedNotes = [rootNotes];
        } catch {
          extractedNotes = [rootNotes];
        }
      }

      if (extractedNotes.length === 0) {
        extractedNotes = parsedList.map(i => i.notes).filter(n => n && n.trim() !== '') as string[];
      }

      const timestamps: StatusTimestamps = {
        menunggu: savedTimestamps?.menunggu || dataToUse.time_menunggu || formattedOrderTime || '-',
        disiapkan: savedTimestamps?.disiapkan || dataToUse.time_disiapkan || '-',
        siapDiambil: savedTimestamps?.siapDiambil || dataToUse.time_siap_diambil || '-',
        selesai: savedTimestamps?.selesai || dataToUse.time_selesai || '-'
      };

      setOrder({
        documentId: dataToUse.documentId || rawParam,
        id: dataToUse.id,
        orderId: dataToUse.order_id || dataToUse.orderId || `#SC-${dataToUse.documentId || rawParam}`,
        createdAt: dataToUse.createdAt || new Date().toISOString(),
        orderTime: formattedOrderTime,
        orderDate: formattedOrderDate,
        pickupTime: rawPickupTime,
        pickupDate: formattedOrderDate,
        paymentMethod: String(dataToUse.payment_method || 'CASH').toUpperCase() === 'CASH' ? 'Bayar di Kantin' : (dataToUse.payment_method || 'Bayar di Kantin'),
        customerName: dataToUse.customer_name || dataToUse.customerName || userObj.username || userObj.nama || 'Pelanggan Kantin',
        customerClass: dataToUse.kelas || userObj.kelas || '-',
        items: parsedList,
        notes: extractedNotes,
        totalPrice: finalTotalPrice,
        totalItem: calculatedQty || 1,
        status: normStatus,
        timestamps
      });
    }

    if (!isSilent) setLoading(false);
  }, [rawParam]);

  useEffect(() => {
    fetchOrderDetail();
    const interval = setInterval(() => fetchOrderDetail(true), 3000);
    return () => clearInterval(interval);
  }, [fetchOrderDetail]);

  const handleActionClick = (targetStatus: StatusType) => {
    if (!order) return;

    if (order.status === 'Menunggu Konfirmasi' && (targetStatus === 'Siap Diambil' || targetStatus === 'Selesai')) {
      setShowErrorModal(true);
      return;
    }

    updateOrderStatus(targetStatus);

    if (targetStatus === 'Selesai') {
      setShowSuccessModal(true);
    }
  };

  const updateOrderStatus = async (newStatus: StatusType) => {
    if (!order) return;

    isUpdatingRef.current = true;
    const nowFormatted = getCurrentFormattedTime();

    const currentTimestamps = order.timestamps || {
      menunggu: order.orderTime || '-',
      disiapkan: '-',
      siapDiambil: '-',
      selesai: '-'
    };

    const updatedTimestamps: StatusTimestamps = { ...currentTimestamps };
    if (newStatus === 'Sedang Disiapkan' && updatedTimestamps.disiapkan === '-') {
      updatedTimestamps.disiapkan = nowFormatted;
    } else if (newStatus === 'Siap Diambil') {
      if (updatedTimestamps.disiapkan === '-') updatedTimestamps.disiapkan = nowFormatted;
      if (updatedTimestamps.siapDiambil === '-') updatedTimestamps.siapDiambil = nowFormatted;
    } else if (newStatus === 'Selesai') {
      if (updatedTimestamps.disiapkan === '-') updatedTimestamps.disiapkan = nowFormatted;
      if (updatedTimestamps.siapDiambil === '-') updatedTimestamps.siapDiambil = nowFormatted;
      if (updatedTimestamps.selesai === '-') updatedTimestamps.selesai = nowFormatted;
    }

    const strapiSlugStatus =
      newStatus === 'Sedang Disiapkan' ? 'sedang_disiapkan' :
      newStatus === 'Siap Diambil' ? 'siap_diambil' :
      newStatus === 'Selesai' ? 'selesai' : 'menunggu_konfirmasi';

    setOrder(prev => prev ? { ...prev, status: newStatus, timestamps: updatedTimestamps } : null);

    if (typeof window !== 'undefined') {
      try {
        const localOrders = JSON.parse(localStorage.getItem('smart_canteen_orders') || '[]');
        let found = false;
        const targetDocId = order.documentId || rawParam;

        const updatedLocal = localOrders.map((o: any) => {
          if (String(o.documentId || o.id) === String(targetDocId) || String(o.orderId || o.order_id).replace('#', '') === rawParam.replace('#', '')) {
            found = true;
            return {
              ...o,
              documentId: targetDocId,
              status: newStatus,
              menu_status: strapiSlugStatus,
              timestamps: updatedTimestamps
            };
          }
          return o;
        });

        if (!found) {
          updatedLocal.push({
            documentId: targetDocId,
            orderId: order.orderId,
            status: newStatus,
            menu_status: strapiSlugStatus,
            timestamps: updatedTimestamps
          });
        }

        localStorage.setItem('smart_canteen_orders', JSON.stringify(updatedLocal));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {
        console.error('Error update local storage:', e);
      }
    }

    try {
      const targetDocId = order.documentId || rawParam;
      await fetch(`${STRAPI_URL}/api/orders/${targetDocId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: { 
            menu_status: strapiSlugStatus
          } 
        }),
      });
    } catch (e) {
      console.error('Gagal update status ke server Strapi:', e);
    } finally {
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 1500);
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
          className="px-6 py-2.5 bg-[#E07A2F] text-white rounded-full font-bold hover:bg-orange-600 transition-colors cursor-pointer"
        >
          Kembali ke Daftar Pesanan
        </button>
      </div>
    );
  }

  const getStepIndex = (status: StatusType) => {
    switch (status) {
      case 'Menunggu Konfirmasi': return 0;
      case 'Sedang Disiapkan': return 1;
      case 'Siap Diambil': return 2;
      case 'Selesai': return 3;
      default: return 0;
    }
  };

  const currentStep = getStepIndex(order.status);

  return (
    <div className="min-h-screen w-full bg-white font-sans text-gray-800 p-4 sm:p-6 md:p-8 flex flex-col">
      <div className="w-full space-y-6 flex-1">

        {/* Top Header */}
        <div className="relative flex items-center justify-center mb-6">
          <button
            onClick={() => router.push('/daftar-pesanan')}
            className="absolute left-0 flex items-center gap-2 text-2xl font-bold text-gray-900 hover:opacity-80 transition-opacity cursor-pointer p-1"
          >
            <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
          </button>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 text-center">
            Detail Pesanan
          </h1>
        </div>

        {/* 1. Header Information Box - FULL SCREEN WIDTH */}
        <div className="w-full border border-gray-300 rounded-2xl p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
          <div className="col-span-1">
            <p className="text-xs sm:text-sm font-semibold text-gray-500">Id Pemesanan</p>
            <p className="text-base sm:text-lg font-bold text-orange-500 mt-1 break-words">{order.orderId}</p>
          </div>
          <div className="col-span-1 pt-0 sm:px-4 lg:px-6">
            <p className="text-xs sm:text-sm font-semibold text-gray-500">Tanggal</p>
            <p className="text-sm sm:text-base font-bold text-gray-900 mt-1">{order.orderDate}</p>
          </div>
          <div className="col-span-1 pt-3 sm:pt-0 sm:px-4 lg:px-6">
            <p className="text-xs sm:text-sm font-semibold text-gray-500">Jam Pesan</p>
            <p className="text-sm sm:text-base font-bold text-gray-900 mt-1">{order.orderTime}</p>
          </div>
          <div className="col-span-1 pt-3 sm:pt-0 sm:px-4 lg:px-6">
            <p className="text-xs sm:text-sm font-semibold text-gray-500">Jam Pengambilan</p>
            <p className="text-sm sm:text-base font-bold text-gray-900 mt-1">{order.pickupTime}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 pt-3 sm:pt-0 sm:pl-4 lg:pl-6">
            <p className="text-xs sm:text-sm font-semibold text-gray-500">Metode Pembayaran</p>
            <p className="text-sm sm:text-base font-bold text-gray-900 mt-1">{order.paymentMethod}</p>
          </div>
        </div>

        {/* 2. Data Pelanggan Box */}
        <div className="w-full border border-gray-300 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-base text-gray-900">
            <User className="w-5 h-5 text-orange-500 shrink-0" />
            <span>Data Pelanggan</span>
          </div>
          <div className="grid grid-cols-[80px_1fr] text-sm sm:text-base font-semibold space-y-1">
            <span className="text-gray-600">Nama</span>
            <span className="text-gray-900">: {order.customerName}</span>
            <span className="text-gray-600">Kelas</span>
            <span className="text-gray-900">: {order.customerClass}</span>
          </div>
        </div>

        {/* 3. Detail Menu Box */}
        <div className="w-full border border-gray-300 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 font-bold text-base pb-3 border-b border-gray-200 text-gray-900">
            <UtensilsCrossed className="w-5 h-5 text-orange-500 shrink-0" />
            <span>Menu</span>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs sm:text-sm font-semibold text-gray-600">
                  <th className="py-3 text-left w-2/5">Nama Menu</th>
                  <th className="py-3 text-center w-1/5 whitespace-nowrap px-1">Harga</th>
                  <th className="py-3 text-center w-1/5 whitespace-nowrap px-1">Jumlah</th>
                  <th className="py-3 text-right w-1/5 whitespace-nowrap px-1">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, idx) => {
                    const price = Number(item.price || 0);
                    const qty = Number(item.quantity || 1);
                    const subtotal = price * qty;

                    return (
                      <tr key={idx} className="text-xs sm:text-base font-medium">
                        <td className="py-3 font-bold text-gray-900 pr-2">{item.name}</td>
                        <td className="py-3 text-center font-semibold text-gray-700 whitespace-nowrap px-1">
                          Rp {price.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 text-center font-bold text-gray-900 whitespace-nowrap px-1">
                          {qty}
                        </td>
                        <td className="py-3 text-right font-bold text-gray-900 whitespace-nowrap px-1">
                          Rp {subtotal.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-400">Tidak ada item terdeteksi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between font-semibold text-xs sm:text-sm text-gray-700">
              <span>Total Item</span>
              <span>{order.totalItem}</span>
            </div>
            <div className="flex justify-between items-center text-sm sm:text-lg font-bold">
              <span className="text-gray-900">Total Bayar</span>
              <span className="text-orange-500 whitespace-nowrap">
                Rp {Number(order.totalPrice || 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Catatan Pesanan Box */}
        <div className="w-full border border-gray-300 rounded-2xl p-4 sm:p-5 space-y-2">
          <div className="flex items-center gap-2 font-bold text-base text-gray-900">
            <FileText className="w-5 h-5 text-orange-500 shrink-0" />
            <span>Catatan</span>
          </div>
          {order.notes && order.notes.length > 0 ? (
            <ol className="list-decimal list-inside text-gray-600 text-xs sm:text-sm space-y-1 font-medium pl-1">
              {order.notes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ol>
          ) : (
            <p className="text-xs sm:text-sm text-gray-400 italic pl-1">Tidak ada catatan untuk pesanan ini.</p>
          )}
        </div>

        {/* 5. Status Pesanan - FULL MELEBAR DENGAN GARIS PERSISI DARI PUSAT KE PUSAT */}
        <div className="w-full border border-gray-300 rounded-2xl p-4 sm:p-6 space-y-6 sm:space-y-8">
          <h3 className="font-bold text-base sm:text-lg text-gray-900">Status Pesanan</h3>

          <div className="relative w-full py-2">
            
            {/* LAYER 1: GARIS LANDASAN ABU-ABU */}
            <div className="absolute top-[20px] sm:top-[24px] -translate-y-1/2 left-[12.5%] right-[12.5%] h-[2px] bg-gray-300 z-0" />

            {/* GARIS SEGMEN 1 (Menunggu -> Disiapkan: Orange saat step >= 1) */}
            <div 
              className={`absolute top-[20px] sm:top-[24px] -translate-y-1/2 left-[12.5%] w-[25%] h-[2px] z-0 transition-colors duration-300 ${
                currentStep >= 1 ? 'bg-orange-500' : 'bg-transparent'
              }`} 
            />

            {/* GARIS SEGMEN 2 (Disiapkan -> Siap Diambil: Hijau saat step >= 2) */}
            <div 
              className={`absolute top-[20px] sm:top-[24px] -translate-y-1/2 left-[37.5%] w-[25%] h-[2px] z-0 transition-colors duration-300 ${
                currentStep >= 2 ? 'bg-[#52C453]' : 'bg-transparent'
              }`} 
            />

            {/* GARIS SEGMEN 3 (Siap Diambil -> Selesai: Hijau saat step >= 3) */}
            <div 
              className={`absolute top-[20px] sm:top-[24px] -translate-y-1/2 left-[62.5%] w-[25%] h-[2px] z-0 transition-colors duration-300 ${
                currentStep >= 3 ? 'bg-[#52C453]' : 'bg-transparent'
              }`} 
            />

            {/* LAYER IKON STATUS (RATA MELEBAR 100% KONTANIER) */}
            <div className="relative z-10 flex items-start justify-between w-full">
              
              {/* Step 1: Menunggu */}
              <div className="flex flex-col items-center gap-1 w-[25%]">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                  currentStep >= 0 ? 'bg-orange-500 text-white' : 'bg-white border-2 border-gray-300 text-gray-400'
                }`}>
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className={`text-[10px] sm:text-xs text-center leading-tight mt-1 ${currentStep >= 0 ? 'font-bold text-orange-500' : 'font-semibold text-gray-500'}`}>
                  Menunggu
                </span>
                <span className="text-[8px] sm:text-[10px] text-gray-400 text-center">
                  {order.orderTime}
                </span>
              </div>

              {/* Step 2: Sedang Disiapkan */}
              <div className="flex flex-col items-center gap-1 w-[25%]">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                  currentStep >= 1 ? 'bg-orange-500 text-white' : 'bg-white border-2 border-gray-300 text-gray-700'
                }`}>
                  <ChefHat className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className={`text-[10px] sm:text-xs text-center leading-tight mt-1 ${currentStep >= 1 ? 'font-bold text-orange-500' : 'font-semibold text-gray-500'}`}>
                  Sedang Disiapkan
                </span>
                <span className="text-[8px] sm:text-[10px] text-gray-400 text-center">
                  {currentStep >= 1 ? order.timestamps?.disiapkan : '-'}
                </span>
              </div>

              {/* Step 3: Siap Diambil */}
              <div className="flex flex-col items-center gap-1 w-[25%]">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                  currentStep >= 2 ? 'bg-[#52C453] text-white' : 'bg-white border-2 border-gray-300 text-gray-700'
                }`}>
                  <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className={`text-[10px] sm:text-xs text-center leading-tight mt-1 ${currentStep >= 2 ? 'font-bold text-[#52C453]' : 'font-semibold text-gray-500'}`}>
                  Siap Diambil
                </span>
                <span className="text-[8px] sm:text-[10px] text-gray-400 text-center">
                  {currentStep >= 2 ? order.timestamps?.siapDiambil : '-'}
                </span>
              </div>

              {/* Step 4: Selesai */}
              <div className="flex flex-col items-center gap-1 w-[25%]">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                  currentStep >= 3 ? 'bg-[#52C453] text-white' : 'bg-white border-2 border-gray-300 text-gray-700'
                }`}>
                  <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className={`text-[10px] sm:text-xs text-center leading-tight mt-1 ${currentStep >= 3 ? 'font-bold text-[#52C453]' : 'font-semibold text-gray-500'}`}>
                  Selesai
                </span>
                <span className="text-[8px] sm:text-[10px] text-gray-400 text-center">
                  {currentStep >= 3 ? order.timestamps?.selesai : '-'}
                </span>
              </div>

            </div>

          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2">
            <button
              onClick={() => handleActionClick('Menunggu Konfirmasi')}
              className="py-3 px-4 border border-red-500 text-red-500 font-bold text-sm sm:text-base rounded-xl hover:bg-red-50 transition cursor-pointer"
            >
              Batalkan Pesanan
            </button>

            <button
              onClick={() => handleActionClick('Sedang Disiapkan')}
              className={`py-3 px-4 font-bold text-sm sm:text-base rounded-xl transition cursor-pointer ${
                currentStep === 0
                  ? 'bg-orange-500 text-white shadow-xs hover:bg-orange-600'
                  : 'border border-gray-300 text-gray-400 bg-white'
              }`}
            >
              Konfirmasi Pesanan
            </button>

            {currentStep < 2 ? (
              <button
                onClick={() => handleActionClick('Siap Diambil')}
                className={`py-3 px-4 font-bold text-sm sm:text-base rounded-xl transition cursor-pointer ${
                  currentStep === 1
                    ? 'bg-[#52C453] text-white hover:bg-green-600 shadow-xs'
                    : 'bg-green-50 border border-green-200 text-green-600 hover:bg-green-100'
                }`}
              >
                Siap Diambil
              </button>
            ) : (
              <button
                onClick={() => handleActionClick('Selesai')}
                className={`py-3 px-4 font-bold text-sm sm:text-base rounded-xl transition cursor-pointer ${
                  currentStep === 3
                    ? 'border border-gray-300 text-gray-400 bg-white'
                    : 'bg-[#52C453] text-white hover:bg-green-600 shadow-xs'
                }`}
              >
                Selesai
              </button>
            )}
          </div>
        </div>

      </div>

      {/* MODAL ERROR */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full flex flex-col items-center text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-red-600 flex items-center justify-center text-white shrink-0">
              <X className="w-12 h-12 sm:w-16 sm:h-16 stroke-[3]" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">
              Tidak dapat melanjutkan aktivitas sebelum anda mengonfirmasi pesanan
            </p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full py-3 bg-orange-500 text-white font-extrabold text-base sm:text-lg rounded-2xl hover:bg-orange-600 transition cursor-pointer"
            >
              Kembali
            </button>
          </div>
        </div>
      )}

      {/* MODAL SUKSES */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full flex flex-col items-center text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#52C453] flex items-center justify-center text-white shrink-0">
              <Check className="w-12 h-12 sm:w-16 sm:h-16 stroke-[3]" />
            </div>
            <div className="space-y-1">
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                Pesanan sudah selesai
              </p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                Terima Kasih!
              </p>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 bg-orange-500 text-white font-extrabold text-base sm:text-lg rounded-2xl hover:bg-orange-600 transition cursor-pointer"
            >
              Kembali
            </button>
          </div>
        </div>
      )}

    </div>
  );
}