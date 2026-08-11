'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft,
  Plus, 
  SquarePen, 
  Trash2, 
  Upload,
  Loader2,
  ImageIcon,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

// HELPER AMBIL URL GAMBAR DARI STRAPI
const getImageUrl = (item: any): string => {
  if (!item) return '';

  const rawImage = item?.image || item?.foto || item?.gambar || item?.attributes?.image || item?.attributes?.foto;

  if (!rawImage) return '';

  if (typeof rawImage === 'string') {
    if (rawImage.startsWith('http://') || rawImage.startsWith('https://')) return rawImage;
    return `${STRAPI_URL}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;
  }

  if (Array.isArray(rawImage) && rawImage.length > 0) {
    return getImageUrl(rawImage[0]);
  }

  const url = rawImage?.data?.attributes?.url || rawImage?.data?.url || rawImage?.attributes?.url || rawImage?.url;
  if (url) {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${STRAPI_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  return '';
};

interface MenuItem {
  id: number | string;
  documentId?: string;
  fotoUrl: string;
  imageId?: number | string;
  namaMenu: string;
  kategori: string;
  hargaNum: number;
  hargaFormatted: string;
  stok: number;
  ketersediaanStatus: string;
}

export default function KelolaMenuPage() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // State Modal (Tambah/Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);

  // State Modal Konfirmasi Hapus
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<{ id: number | string; nama: string; docId?: string } | null>(null);

  // State Pagination Halaman
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form State (Menyesuaikan Key Strapi)
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('makanan');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formKetersediaan, setFormKetersediaan] = useState('tersedia');
  
  // State Gambar
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. FETCH DATA UTAMA DARI STRAPI
  const fetchMenus = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${STRAPI_URL}/api/menus?populate=*&status=draft&pagination[pageSize]=1000&sort[0]=createdAt:desc`
      );
      const result = await res.json();

      if (result.data) {
        const mappedData: MenuItem[] = result.data.map((item: any) => {
          const docId = item.documentId || item.attributes?.documentId;
          const attr = item.attributes ? { ...item.attributes, id: item.id, documentId: docId } : item;
          const imgUrl = getImageUrl(item);

          const rawImg = attr.image || attr.foto || attr.gambar;
          let imageId = undefined;
          if (rawImg?.data?.id) imageId = rawImg.data.id;
          else if (rawImg?.id) imageId = rawImg.id;
          else if (Array.isArray(rawImg) && rawImg[0]?.id) imageId = rawImg[0].id;

          // Menggunakan Key: price, stock, ketersediaan, category, name
          const hargaRaw = Number(attr.price ?? 0);
          const stokRaw = Number(attr.stock ?? 0);
          const ketersediaanRaw = String(attr.ketersediaan || 'tersedia').toLowerCase().trim();

          return {
            id: item.id,
            documentId: docId || item.id,
            namaMenu: attr.name || 'Tanpa Nama',
            kategori: String(attr.category || 'makanan').toLowerCase(),
            hargaNum: hargaRaw,
            hargaFormatted: `Rp ${hargaRaw.toLocaleString('id-ID')}`,
            stok: stokRaw,
            ketersediaanStatus: ketersediaanRaw === 'habis' ? 'habis' : 'tersedia',
            fotoUrl: imgUrl,
            imageId: imageId,
          };
        });

        setMenus(mappedData);
      }
    } catch (error) {
      console.error('Gagal mengambil data dari database Strapi:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  // Hitung Kebutuhan Pagination
  const totalPages = Math.ceil(menus.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMenus = menus.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const getPageNumbers = () => {
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Buka Modal Tambah
  const handleOpenAddModal = () => {
    setEditingMenu(null);
    setFormName('');
    setFormCategory('makanan');
    setFormPrice('');
    setFormStock('10');
    setFormKetersediaan('tersedia');
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsModalOpen(true);
  };

  // Buka Modal Edit
  const handleOpenEditModal = (menu: MenuItem) => {
    setEditingMenu(menu);
    setFormName(menu.namaMenu);
    setFormCategory(menu.kategori.toLowerCase());
    setFormPrice(String(menu.hargaNum));
    setFormStock(String(menu.stok));
    setFormKetersediaan(menu.ketersediaanStatus === 'habis' ? 'habis' : 'tersedia');
    setSelectedFile(null);
    setPreviewUrl(menu.fotoUrl || null);
    setIsModalOpen(true);
  };

  // Handle Pilih File Gambar
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // 2. SIMPAN MENU KE DATABASE STRAPI (HANYA MENGGUNAKAN KEY SKEMA YANG BENAR)
  const handleSimpanMenu = async () => {
    if (!formPrice) {
      alert('Mohon lengkapi harga!');
      return;
    }

    try {
      setIsSubmitting(true);
      let uploadedImageId = editingMenu?.imageId || null;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('files', selectedFile);

        const uploadRes = await fetch(`${STRAPI_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData && uploadData[0]) {
            uploadedImageId = uploadData[0].id;
          }
        } else {
          console.warn('Gagal upload gambar, melanjutkan tanpa mengganti gambar.');
        }
      }

      // 💡 Payload Eksplisit Sesuai Skema Strapi: name, category, price, stock, ketersediaan, image
      const payloadData: any = {
        name: formName,
        category: formCategory.toLowerCase(),
        price: Number(formPrice),
        stock: Number(formStock || 0),
        ketersediaan: formKetersediaan.toLowerCase(),
      };

      if (uploadedImageId) {
        payloadData.image = uploadedImageId;
      }

      let targetUrl = `${STRAPI_URL}/api/menus`;
      let httpMethod = 'POST';

      if (editingMenu) {
        const targetId = editingMenu.documentId || editingMenu.id;
        targetUrl = `${STRAPI_URL}/api/menus/${targetId}`;
        httpMethod = 'PUT';
      }

      const res = await fetch(targetUrl, {
        method: httpMethod,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: payloadData }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchMenus();
      } else {
        const errJson = await res.json().catch(() => null);
        console.error('Detail Error Strapi:', errJson);
        const errMsg = errJson?.error?.message || `Status Code: ${res.status}`;
        alert(`Gagal menyimpan perubahan: ${errMsg}`);
      }
    } catch (error) {
      console.error('Gagal menyimpan menu:', error);
      alert('Terjadi kesalahan koneksi server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. HAPUS MENU
  const handleDeleteClick = (menu: MenuItem) => {
    setSelectedMenu({ id: menu.id, nama: menu.namaMenu, docId: menu.documentId });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedMenu) return;

    try {
      const targetId = selectedMenu.docId || selectedMenu.id;
      const res = await fetch(`${STRAPI_URL}/api/menus/${targetId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setIsDeleteModalOpen(false);
        fetchMenus();
      } else {
        alert('Gagal menghapus data dari database.');
      }
    } catch (error) {
      console.error('Gagal menghapus menu:', error);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white font-sans flex flex-col p-4 sm:p-8 md:p-10 text-slate-800">
      
      {/* Header Topbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link 
            href="/dasboard-admin" 
            className="p-1 text-slate-800 hover:text-slate-600 transition-colors cursor-pointer flex items-center justify-center"
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Kelola Menu</h1>
          </div>
        </div>

        <button 
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-6 py-3 rounded-full transition-all active:scale-95 shadow-sm cursor-pointer"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Tambah Menu</span>
        </button>
      </div>

      {/* Tabel Data Menu Full Width */}
      <div className="w-full border border-gray-200 rounded-2xl overflow-hidden flex-1 flex flex-col bg-white shadow-xs">
        <div className="overflow-x-auto w-full flex-1">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-gray-200 bg-slate-50/80 text-black font-bold text-sm">
                <th className="p-4 sm:p-5 text-center w-24">Foto</th>
                <th className="p-4 sm:p-5">Nama Menu</th>
                <th className="p-4 sm:p-5">Kategori</th>
                <th className="p-4 sm:p-5">Harga</th>
                <th className="p-4 sm:p-5 text-center w-24">Stok</th>
                <th className="p-4 sm:p-5 text-center w-32">Status</th>
                <th className="p-4 sm:p-5 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm font-medium text-gray-900">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-slate-400 font-normal">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-7 h-7 animate-spin text-orange-500" />
                      <span>Memuat data menu dari Strapi Database...</span>
                    </div>
                  </td>
                </tr>
              ) : menus.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-slate-400 font-normal">
                    Belum ada menu di database. Silakan klik tombol "Tambah Menu".
                  </td>
                </tr>
              ) : (
                currentMenus.map((menu) => {
                  const isTersedia = menu.ketersediaanStatus === 'tersedia';

                  return (
                    <tr key={menu.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 sm:p-5 text-center align-middle">
                        <div className="w-14 h-11 mx-auto rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                          {menu.fotoUrl ? (
                            <img 
                              src={menu.fotoUrl} 
                              alt={menu.namaMenu} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </td>
                      
                      <td className="p-4 sm:p-5 font-bold text-slate-900 whitespace-nowrap align-middle">{menu.namaMenu}</td>
                      <td className="p-4 sm:p-5 text-gray-500 font-normal whitespace-nowrap align-middle capitalize">{menu.kategori}</td>
                      <td className="p-4 sm:p-5 font-bold text-slate-900 whitespace-nowrap align-middle">{menu.hargaFormatted}</td>
                      <td className="p-4 sm:p-5 text-center font-bold text-slate-800 whitespace-nowrap align-middle">{menu.stok}</td>
                      
                      <td className="p-4 sm:p-5 text-center whitespace-nowrap align-middle">
                        <span className={`px-3.5 py-1 text-xs font-bold rounded-full inline-block ${
                          isTersedia
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                            : 'text-red-600 bg-red-50 border border-red-200'
                        }`}>
                          {isTersedia ? 'Tersedia' : 'Habis'}
                        </span>
                      </td>
                      
                      <td className="p-4 sm:p-5 text-center whitespace-nowrap align-middle">
                        <div className="flex items-center justify-center gap-2 text-gray-700">
                          <button 
                            onClick={() => handleOpenEditModal(menu)}
                            title="Edit Menu"
                            className="p-2 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all cursor-pointer"
                          >
                            <SquarePen size={18} />
                          </button>

                          <button 
                            onClick={() => handleDeleteClick(menu)}
                            title="Hapus Menu"
                            className="p-2 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* NAVIGASI PAGINATION */}
        {!loading && menus.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center p-4 border-t border-gray-200 bg-slate-50/50">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>

              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentPage === page
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL POP-UP TAMBAH & EDIT MENU */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-4 transition-all duration-300">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingMenu ? 'Edit Menu' : 'Tambah Menu Baru'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-2">Foto Menu</label>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  
                  <label className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-orange-500 transition-colors bg-slate-50/50">
                    <Upload size={18} className="text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-500 text-center">Pilih foto dari perangkat</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">Nama Menu</label>
                <input 
                  type="text" 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Masukan Nama Menu" 
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">Kategori</label>
                  <select 
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium cursor-pointer"
                  >
                    <option value="makanan">makanan</option>
                    <option value="minuman">minuman</option>
                    <option value="cemilan">cemilan</option>
                    <option value="aksesoris">aksesoris</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">Harga (Rp)</label>
                  <input 
                    type="number" 
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="Masukan Harga" 
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">Stok</label>
                  <input 
                    type="number" 
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    placeholder="Jumlah Stok" 
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">Status Ketersediaan</label>
                  <select 
                    value={formKetersediaan}
                    onChange={(e) => setFormKetersediaan(e.target.value.toLowerCase())}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium cursor-pointer"
                  >
                    <option value="tersedia">Tersedia</option>
                    <option value="habis">Habis</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-5 flex justify-end gap-3 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all text-sm cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={handleSimpanMenu}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 shadow-sm transition-all disabled:opacity-50 text-sm cursor-pointer flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 transition-all duration-300">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Hapus Menu?</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">
                Apakah Anda yakin ingin menghapus menu ini dari daftar menu?
              </p>
            </div>

            <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-5 py-2.5 border border-slate-200 bg-white rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all text-sm cursor-pointer"
              >
                Batal
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all text-sm cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}