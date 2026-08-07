<<<<<<< HEAD
"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, UtensilsCrossed } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Setelah klik Login, diarahkan ke Halaman Utama (/home)
    router.push("/home");
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4">
      {/* Background Gambar Kantin */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80')" }}
      />
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" />

      {/* Card Form Melayang */}
      <div className="relative z-10 w-full max-w-sm bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 text-center text-white shadow-2xl">
        <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg">
          <UtensilsCrossed className="w-6 h-6 text-white" />
        </div>

        <h1 className="text-xl font-serif font-semibold">Welcome to Our</h1>
        <p className="text-sm font-serif mb-6 text-gray-200">Smart Canteen</p>

        <form onSubmit={handleLogin} className="space-y-3">

          <div className="relative">
            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="email"
              placeholder="E-Mail"
              required
              className="w-full pl-9 pr-3 py-2 text-xs rounded-md bg-white text-slate-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="password"
              placeholder="Password"
              required
              className="w-full pl-9 pr-3 py-2 text-xs rounded-md bg-white text-slate-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-orange-500 hover:bg-orange-600 font-semibold text-xs rounded-md transition shadow-md mt-2 cursor-pointer"
          >
            Login
          </button>
        </form>

        <p className="text-[10px] mt-4 text-gray-200">
          Don't Have an Account?{" "}
          <Link href="/signup" className="text-orange-300 underline font-semibold hover:text-orange-200">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
=======
import { redirect } from 'next/navigation';

export default function RootPage() {
  // Langsung arahkan user ke URL /login
  redirect('/login');
}
>>>>>>> 3e3164811ad8254bb9a8e8453afa91f15d2ab6d2
