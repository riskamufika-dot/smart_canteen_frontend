'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Utensils, 
  BarChart2, 
  Menu, 
  Plus, 
  SquarePen, 
  Trash2, 
  X, 
  Upload 
} from 'lucide-react';

interface MenuItem {
  id: number;
  documentId?: string;
  fotoUrl: string;
  namaMenu: string;
  kategori: string;
  harga: string;
  stok: number;
  status: string;
}

export default function KelolaMenu() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // State Modal Tambah & Hapus
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<{ id: number; nama: string; docId?: string } | null>(null);

  // Form State Tambah Menu
  const [formNama, setFormNama] = useState('');
  const [formKategori, setFormKategori] = useState('Makanan');
  const [formHarga, setFormHarga] = useState('');
  const [formStok, setFormStok] = useState('');
  const [formStatus, setFormStatus] = useState('Tersedia');
  // State Khusus Gambar
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const STRAPI_URL = 'http://localhost:1337';

  // 1. FETCH DATA DARI STRAPI
  const fetchMenus = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${STRAPI_URL}/api/menus?populate=*`);
      const result = await res.json();

      if (result.data) {
        const mappedData: MenuItem[] = result.data.map((item: any) => {
          const imgUrl = item.foto?.url
            ? `${STRAPI_URL}${item.foto.url}`
            : 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=150&q=80';

          return {
            id: item.id,
            documentId: item.documentId,
            namaMenu: item.nama_menu || 'Tanpa Nama',
            kategori: item.kategori || 'Makanan',
            harga: `Rp ${(item.Harga || item.harga || 0).toLocaleString('id-ID')}`,
            stok: item.Stok || item.stok || 0,
            status: item.statusmenu || item.status || 'Tersedia',
            fotoUrl: imgUrl,
          };
        });

        setMenus(mappedData);
      }
    } catch (error) {
      console.error('Gagal mengambil data Strapi:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  // Handle Pilih File Gambar
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // 2. SIMPAN MENU BARU DENGAN UPLOAD GAMBAR KE STRAPI
  const handleSimpanMenu = async () => {
    if (!formNama || !formHarga || !formStok) {
      alert('Mohon isi semua data yang diperlukan!');
      return;
    }

    try {
      setIsSubmitting(true);
      let uploadedImageId = null;

      // Step A: Upload File Gambar ke Strapi jika ada
      if (selectedFile) {
        const formData = new FormData();
        formData.append('files', selectedFile);

        const uploadRes = await fetch(`${STRAPI_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedImageId = uploadData[0].id;
        }
      }

      // Step B: Simpan Data Menu ke Strapi
      const payload = {
        data: {
          nama_menu: formNama,
          kategori: formKategori,
          Harga: Number(formHarga),
          Stok: Number(formStok),
          statusmenu: formStatus,
          ...(uploadedImageId && { foto: uploadedImageId }),
        },
      };

      const res = await fetch(`${STRAPI_URL}/api/menus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        // Reset Form
        setFormNama('');
        setFormHarga('');
        setFormStok('');
        setSelectedFile(null);
        setPreviewUrl(null);
        fetchMenus();
      }
    } catch (error) {
      console.error('Gagal menyimpan menu:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. HAPUS MENU DARI STRAPI
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
      }
    } catch (error) {
      console.error('Gagal menghapus menu:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans">
      {/* Overlay Gelap saat Sidebar Terbuka di HP */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}

      {/* Sidebar Component */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 p-6 flex flex-col gap-6 transform transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Smart Canteen"
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
            <div className="font-bold text-xl leading-tight">
              <span className="text-orange-500">Smart </span>
              <span className="text-gray-900">Canteen</span>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="md:hidden text-gray-500 p-1 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
            A
          </div>
          <div>
            <h4 className="font-bold text-sm text-gray-900">Admin</h4>
            <p className="text-xs text-gray-500">Penjual</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <Link
            href="/dasboard-admin"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-full font-medium text-sm transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </Link>
          <Link
            href="/daftar-pesanan"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-full font-medium text-sm transition-colors"
          >
            <ClipboardList className="w-5 h-5" /> Daftar Pesanan
          </Link>
          <Link
            href="/kelola-menu"
            className="flex items-center gap-3 px-4 py-3 bg-orange-50 text-orange-500 rounded-full font-medium text-sm transition-colors"
          >
            <Utensils className="w-5 h-5" /> Kelola Menu
          </Link>
          <Link
            href="/laporan"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-full font-medium text-sm transition-colors"
          >
            <BarChart2 className="w-5 h-5" /> Laporan
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 min-w-0">
        {/* Top Header Section */}
        <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            {/* Tombol Hamburger Menu untuk HP */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 border border-gray-200 rounded-xl md:hidden text-gray-600 hover:bg-gray-100"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Kelola Menu</h1>
              <p className="text-xs sm:text-sm text-slate-500">Tambah, ubah, dan atur ketersediaan menu kantin.</p>
            </div>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-full shadow-sm transition-all active:scale-95 shrink-0"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Tambah Menu</span>
            <span className="sm:hidden">Tambah</span>
          </button>
        </div>

        {/* Card Utama & Tabel Data Menu */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 shadow-sm">
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-900 font-bold text-xs sm:text-sm">
                  <th className="p-3 sm:p-4 pl-4 sm:pl-6 text-center w-28">Foto</th>
                  <th className="p-3 sm:p-4">Nama Menu</th>
                  <th className="p-3 sm:p-4">Kategori</th>
                  <th className="p-3 sm:p-4">Harga</th>
                  <th className="p-3 sm:p-4 text-center">Stok</th>
                  <th className="p-3 sm:p-4 text-center">Status</th>
                  <th className="p-3 sm:p-4 text-center pr-4 sm:pr-6 w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-semibold text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                      Memuat data menu dari Strapi...
                    </td>
                  </tr>
                ) : menus.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                      Belum ada menu. Silakan tambah menu baru.
                    </td>
                  </tr>
                ) : (
                  menus.map((menu) => (
                    <tr key={menu.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 sm:p-4 pl-4 sm:pl-6 flex justify-center">
                        <img 
                          src={menu.fotoUrl} 
                          alt={menu.namaMenu} 
                          className="w-14 h-12 sm:w-16 sm:h-12 object-cover rounded-xl border border-slate-100 shadow-sm" 
                        />
                      </td>
                      <td className="p-3 sm:p-4 text-slate-900 font-bold whitespace-nowrap">{menu.namaMenu}</td>
                      <td className="p-3 sm:p-4 text-slate-500 font-medium whitespace-nowrap">{menu.kategori}</td>
                      <td className="p-3 sm:p-4 text-slate-950 whitespace-nowrap">{menu.harga}</td>
                      <td className="p-3 sm:p-4 text-center text-slate-600 whitespace-nowrap">{menu.stok}</td>
                      <td className="p-3 sm:p-4 text-center whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border inline-block ${menu.status === 'Tersedia' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
                          {menu.status}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 text-center pr-4 sm:pr-6 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-3 text-slate-600">
                          <button className="hover:text-orange-500 transition-colors p-1">
                            <SquarePen size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(menu)}
                            className="hover:text-red-600 transition-colors p-1"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL TAMBAH MENU */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-all duration-300">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-16 duration-300 ease-out">
            <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Tambah Menu Baru</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] sm:max-h-[75vh] overflow-y-auto">
              {/* Input Unggah Foto */}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Foto Menu</label>
                <div className="flex items-center gap-4">
                  {previewUrl && (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  
                  <label className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-orange-500 transition-colors bg-slate-50/50">
                    <Upload size={20} className="text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-500 text-center">Klik untuk unggah foto</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Nama Menu</label>
                <input 
                  type="text" 
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Masukan Nama Menu" 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Kategori</label>
                  <select 
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-medium"
                  >
                    <option value="Makanan">Makanan</option>
                    <option value="Minuman">Minuman</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Harga</label>
                  <input 
                    type="number" 
                    value={formHarga}
                    onChange={(e) => setFormHarga(e.target.value)}
                    placeholder="Masukan Harga" 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Stok</label>
                  <input 
                    type="number" 
                    value={formStok}
                    onChange={(e) => setFormStok(e.target.value)}
                    placeholder="Jumlah Stok" 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Status</label>
                  <select 
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-medium"
                  >
                    <option value="Tersedia">Tersedia</option>
                    <option value="Habis">Habis</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 pt-2 flex justify-end gap-3 border-t border-slate-100">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 sm:px-6 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95 text-xs sm:text-sm"
              >
                Batal
              </button>
              <button 
                onClick={handleSimpanMenu}
                disabled={isSubmitting}
                className="px-5 sm:px-6 py-2.5 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50 text-xs sm:text-sm"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HAPUS */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-all duration-300">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-16 duration-300 ease-out">
            <div className="p-6 sm:p-8 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <Trash2 size={28} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">Hapus Menu?</h3>
              <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed">
                Apakah Anda yakin ingin menghapus menu <span className="font-bold text-slate-800">"{selectedMenu?.nama}"</span>?
              </p>
            </div>

            <div className="p-5 sm:p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 sm:px-5 py-2.5 border border-slate-200 bg-white rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95 text-xs sm:text-sm"
              >
                Batal
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="px-4 sm:px-5 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all active:scale-95 text-xs sm:text-sm"
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