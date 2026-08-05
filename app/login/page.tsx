'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, BookOpen } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState<boolean>(true);

  // Form States
  const [fullName, setFullName] = useState('');
  const [kelas, setKelas] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isSignUp) {
        // --- PROSES SIGN UP ---
        const res = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: `${fullName} (${kelas})`, // Hasil: "imelda novianti (XII PPLG 4)"
            email: email,
            password: password,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Gagal mendaftar.');

        alert('Pendaftaran berhasil! Silakan login.');
        setIsSignUp(false);
      } else {
        // --- PROSES LOGIN ---
        const res = await fetch(`${STRAPI_URL}/api/auth/local`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: email,
            password: password,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Email atau password salah.');

        // Simpan JWT token ke localStorage
        localStorage.setItem('token', data.jwt);
        localStorage.setItem('user', JSON.stringify(data.user));

        alert('Login berhasil!');
        router.push('/dashboard-pelanggan'); // Arahkan ke halaman utama pelanggan
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="flex min-h-screen items-center justify-center bg-cover bg-center p-4 sm:p-6"
      style={{ backgroundImage: "url('/kantin.jpeg')" }} 
    >
      {/* Background Overlay Hitam untuk Kontras Layar */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" />

      {/* Main Auth Card */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md rounded-3xl bg-black/50 p-6 sm:p-8 backdrop-blur-md text-white shadow-2xl border border-white/20">
        
        {/* Logo & Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex justify-center">
            <img 
              src="/logo.png" 
              alt="Logo Smart Canteen" 
              className="h-20 w-20 sm:h-24 sm:w-24 object-contain rounded-2xl drop-shadow-md"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-wide">Welcome to Our</h1>
          <p className="text-base sm:text-lg font-serif text-slate-200">Smart Canteen</p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 rounded-xl bg-red-500/80 p-3 text-center text-xs sm:text-sm text-white border border-red-400">
            {errorMsg}
          </div>
        )}

        {/* Form Auth */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignUp && (
            <>
              {/* Input Full Name */}
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl bg-white p-3 pl-10 text-xs sm:text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400 transition-all"
                  required
                />
              </div>

              {/* Input Class */}
              <div className="relative">
                <BookOpen className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Class"
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  className="w-full rounded-xl bg-white p-3 pl-10 text-xs sm:text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400 transition-all"
                  required
                />
              </div>
            </>
          )}

          {/* Input Email */}
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-white p-3 pl-10 text-xs sm:text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400 transition-all"
              required
            />
          </div>

          {/* Input Password */}
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-white p-3 pl-10 text-xs sm:text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400 transition-all"
              required
            />
          </div>

          {/* Tombol Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-orange-500 py-3 text-xs sm:text-sm font-semibold text-white transition-all hover:bg-orange-600 active:scale-[0.98] shadow-md disabled:opacity-70 mt-2"
          >
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </form>

        {/* Footer Link / Switch mode */}
        <div className="mt-5 text-center text-xs text-slate-200 space-y-2">
          {isSignUp ? (
            <p>
              Already have an account?{' '}
              <button 
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setIsSignUp(false);
                }} 
                className="font-semibold text-orange-400 hover:underline inline-block"
              >
                Login
              </button>
            </p>
          ) : (
            <p>
              Don't Have an Account?{' '}
              <button 
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setIsSignUp(true);
                }} 
                className="font-semibold text-orange-400 hover:underline inline-block"
              >
                Sign Up
              </button>
            </p>
          )}
          <p className="text-slate-300 pt-1">
            Need Some Help? <a href="#" className="text-orange-400 hover:underline">Contact Admin</a>
          </p>
        </div>

      </div>
    </div>
  );
}