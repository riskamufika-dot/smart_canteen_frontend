'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Clean trailing slash di akhir URL
  const cleanPath = pathname?.endsWith('/') && pathname.length > 1 
    ? pathname.slice(0, -1) 
    : pathname;

  // 1. Path persis (exact match)
  const hiddenExactPaths = [
    '/login',
    '/signup',
    '/aboutus',
    '/riwayat',
    '/keranjang',
    '/status-pesanan',
    '/dasboard-admin',
    '/dashboard-admin',
    '/kelola-menu',
    '/daftar-pesanan',
  ];

  const isExactHidden = hiddenExactPaths.includes(cleanPath);

  // 2. Cek halaman dinamis / awalan path (startsWith)
  const isDynamicHidden = 
    cleanPath.startsWith('/dasboard-admin') ||
    cleanPath.startsWith('/kelola-menu') ||
    cleanPath.startsWith('/menu/') ||
    cleanPath.startsWith('/admin-aplikasi/') ||
    cleanPath.startsWith('/daftar-pesanan/');

  // Jika cocok salah satu, langsung sembunyikan
  if (isExactHidden || isDynamicHidden) {
    return null;
  }

  const navLinks = [
    { name: 'Home', href: '/home' },
    { name: 'Menu', href: '/menu' },
    { name: 'About', href: '/aboutus' },
    { name: 'History', href: '/riwayat' },
  ];

  return (
    <nav className="w-full bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* LOGO */}
          <Link 
            href="/" 
            className="flex items-center text-base sm:text-xl font-bold whitespace-nowrap shrink-0"
          >
            <span className="text-orange-500">Smart</span>
            <span className="text-black ml-1">Canteen</span>
          </Link>

          {/* NAVIGASI DEKSTOP / LAPTOP (Sembunyi di HP 'hidden', Tampil di Laptop 'md:flex') */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`font-semibold text-sm lg:text-base whitespace-nowrap transition-colors duration-150 ${
                    isActive ? 'text-orange-500' : 'text-black hover:text-orange-500'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* LOGOUT DESKTOP */}
          <div className="hidden md:flex items-center shrink-0">
            <Link
              href="/login"
              title="Keluar"
              className="flex items-center text-black hover:text-orange-500 p-2 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </Link>
          </div>

          {/* TOMBOL HAMBURGER MOBILE (Tampil di HP 'flex', Sembunyi di Laptop 'md:hidden') */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
              className="p-2 text-black hover:text-orange-500 focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* OVERLAY / BACKDROP PERGELAPAN LAYAR (Saat Sidebar Terbuka di HP) */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}

      {/* SIDEBAR MOBILE (SLIDE-IN DARI KANAN) */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col justify-between ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div>
          {/* Header Sidebar */}
          <div className="p-4 flex items-center justify-between border-b border-gray-100">
            <Link 
              href="/" 
              onClick={() => setIsOpen(false)}
              className="text-base font-bold"
            >
              <span className="text-orange-500">Smart</span>
              <span className="text-black ml-1">Canteen</span>
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-500 hover:text-black"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigasi Links Sidebar */}
          <div className="p-4 flex flex-col gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`font-semibold text-base py-2.5 px-3 rounded-lg transition-colors ${
                    isActive
                      ? 'text-orange-500 bg-orange-50'
                      : 'text-black hover:bg-gray-50'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Logout Sidebar */}
        <div className="p-4 border-t border-gray-100">
          <Link
            href="/login"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 font-semibold text-base text-red-600 hover:bg-red-50 p-2.5 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Keluar</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}