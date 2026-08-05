'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, ChevronDown } from 'lucide-react';

interface Pengguna {
  id: number;
  username: string;
  email: string;
  status: 'Aktif' | 'Non-Aktif';
  blocked?: boolean;
}

export default function KelolaUser() {
  const router = useRouter();

  // State Data Pengguna dari Strapi
  const [dataPengguna, setDataPengguna] = useState<Pengguna[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    namaPengguna: '',
    email: '',
    status: 'Aktif',
  });

  const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

  // 1. Fetch Data User dari Backend Strapi
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${STRAPI_URL}/api/users`);
      if (!res.ok) throw new Error('Gagal mengambil data dari Strapi');

      const data = await res.json();

      // Format data Strapi agar sesuai dengan UI
      const formattedData: Pengguna[] = data.map((user: any) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        status: user.blocked ? 'Non-Aktif' : 'Aktif',
        blocked: user.blocked || false,
      }));

      setDataPengguna(formattedData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 2. Toggle Status Aktif / Non-Aktif
  const toggleStatus = async (user: Pengguna) => {
    const statusBaru = user.status === 'Aktif' ? 'Non-Aktif' : 'Aktif';
    const isBlocked = statusBaru === 'Non-Aktif';

    // Update State Lokal Dulu (Optimistic UI)
    setDataPengguna((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: statusBaru, blocked: isBlocked } : u))
    );

    try {
      await fetch(`${STRAPI_URL}/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked: isBlocked }),
      });
    } catch (error) {
      console.error('Gagal memperbarui status:', error);
      fetchUsers(); // Rollback jika error
    }
  };

  // 3. Hapus Data Pengguna dari Strapi
  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) return;

    setDataPengguna((prev) => prev.filter((user) => user.id !== id));

    try {
      await fetch(`${STRAPI_URL}/api/users/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Gagal menghapus pengguna:', error);
      fetchUsers();
    }
  };

  // 4. Buka Modal Edit
  const handleOpenEditModal = (user: Pengguna) => {
    setSelectedId(user.id);
    setFormData({
      namaPengguna: user.username,
      email: user.email,
      status: user.status,
    });
    setIsModalOpen(true);
  };

  // 5. Submit Update Data ke Strapi
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaPengguna || !formData.email || selectedId === null) return;

    const isBlocked = formData.status === 'Non-Aktif';

    try {
      const res = await fetch(`${STRAPI_URL}/api/users/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.namaPengguna,
          email: formData.email,
          blocked: isBlocked,
        }),
      });

      if (!res.ok) throw new Error('Gagal memperbarui data pengguna');

      // Update State Lokal
      setDataPengguna((prev) =>
        prev.map((user) =>
          user.id === selectedId
            ? {
                ...user,
                username: formData.namaPengguna,
                email: formData.email,
                status: formData.status as 'Aktif' | 'Non-Aktif',
                blocked: isBlocked,
              }
            : user
        )
      );

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Gagal mengupdate data pengguna.');
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8 text-slate-800">
      <div className="mx-auto max-w-4xl rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 lg:p-8 shadow-xl">
        
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-slate-100"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="h-5 w-5 text-slate-700" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">Kelola Pengguna</h1>
          </div>
        </div>

        {/* Tabel Data Pengguna */}
        <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-xs sm:text-sm font-semibold text-slate-500">
                Memuat data pengguna dari database...
              </div>
            ) : dataPengguna.length === 0 ? (
              <div className="p-8 text-center text-xs sm:text-sm font-semibold text-slate-500">
                Belum ada pengguna yang mendaftar.
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 font-bold text-slate-800">
                    <th className="px-3.5 sm:px-6 py-3.5">Nama Pengguna</th>
                    <th className="px-3.5 sm:px-6 py-3.5">E-Mail</th>
                    <th className="px-3.5 sm:px-6 py-3.5 text-center">Status</th>
                    <th className="px-3.5 sm:px-6 py-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {dataPengguna.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-3.5 sm:px-6 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {user.username}
                      </td>
                      <td className="px-3.5 sm:px-6 py-3 text-slate-800 whitespace-nowrap">
                        {user.email}
                      </td>

                      {/* Status Button Toggle */}
                      <td className="px-3.5 sm:px-6 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => toggleStatus(user)}
                          className={`inline-block rounded-full border px-3 sm:px-4 py-1 text-[10px] sm:text-xs font-medium transition-all active:scale-95 ${
                            user.status === 'Aktif'
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                              : 'border-rose-400 bg-rose-50 text-rose-600 hover:bg-rose-100'
                          }`}
                        >
                          {user.status}
                        </button>
                      </td>

                      {/* Aksi Edit & Delete */}
                      <td className="px-3.5 sm:px-6 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2 sm:gap-3">
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1 text-slate-600 transition-colors hover:text-orange-500"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-1 text-slate-600 transition-colors hover:text-red-600"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Pop Up Modal Edit Data Pengguna */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-white p-5 sm:p-8 shadow-2xl">
            <h2 className="mb-4 sm:mb-6 text-lg sm:text-xl font-bold text-slate-900">
              Edit Data Pengguna
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-900">Nama Pengguna</label>
                <input
                  type="text"
                  placeholder="Masukan Nama Pengguna"
                  value={formData.namaPengguna}
                  onChange={(e) => setFormData({ ...formData, namaPengguna: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm outline-none focus:border-orange-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-900">E-Mail</label>
                <input
                  type="email"
                  placeholder="Masukan E-Mail"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm outline-none focus:border-orange-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-900">Status</label>
                <div className="relative w-full sm:w-36">
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium outline-none focus:border-orange-500 transition-all"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Non-Aktif">Non-Aktif</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-xs sm:text-sm font-bold text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto rounded-xl bg-orange-500 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-orange-600 transition-colors"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}