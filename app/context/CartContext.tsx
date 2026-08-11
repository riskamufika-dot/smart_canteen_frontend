'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// app/context/CartContext.tsx

export interface CartItem {
  id: number | string;
  documentId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  note?: string;    // 👈 Tambahkan ini jika belum ada
  notes?: string;   // 👈 Tambahkan ini agar tidak error di TypeScript
  selected?: boolean;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: number | string) => void;
  updateQuantity: (id: number | string, delta: number) => void;
  toggleSelectItem: (id: number | string) => void;
  toggleSelectAll: () => void;
  clearSelectedItems: () => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  selectedItems: CartItem[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Load keranjang dari localStorage saat dibuka
  useEffect(() => {
    const savedCart = localStorage.getItem('smart_canteen_cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart', e);
      }
    }
  }, []);

  // Simpan keranjang ke localStorage setiap ada perubahan
  useEffect(() => {
    localStorage.setItem('smart_canteen_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // 3. Tambah ke keranjang dengan pencocokan ID yang ketat & unik
  const addToCart = (newItem: CartItem) => {
    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex((i) => i.id === newItem.id);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex].quantity += newItem.quantity;
        if (newItem.note) updated[existingIndex].note = newItem.note;
        return updated;
      }
      // Item baru otomatis tercentang (selected: true)
      return [...prevItems, { ...newItem, selected: true }];
    });
  };

  const removeFromCart = (id: number | string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: number | string, delta: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      })
    );
  };

  // Toggle centang 1 item
  const toggleSelectItem = (id: number | string) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  // Toggle centang semua item
  const toggleSelectAll = () => {
    const allSelected = cartItems.every((item) => item.selected);
    setCartItems((prev) =>
      prev.map((item) => ({ ...item, selected: !allSelected }))
    );
  };

  // Hapus HANYA item yang dicentang setelah checkout
  const clearSelectedItems = () => {
    setCartItems((prev) => prev.filter((item) => !item.selected));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  // Item-item yang sedang dicentang
  const selectedItems = cartItems.filter((item) => item.selected ?? true);

  // Total quantity item tercentang
  const totalItems = selectedItems.reduce((acc, item) => acc + item.quantity, 0);

  // Total harga item tercentang
  const totalPrice = selectedItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        toggleSelectItem,
        toggleSelectAll,
        clearSelectedItems,
        clearCart,
        totalItems,
        totalPrice,
        selectedItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};