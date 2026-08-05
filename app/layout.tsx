import "./globals.css";
import Navbar from "../components/navbar";
import { CartProvider } from "./context/CartContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      {/* Tambahkan m-0 p-0 overflow-x-hidden agar tidak ada whitespace/gap samping */}
      <body className="bg-white w-full min-h-screen m-0 p-0 overflow-x-hidden font-sans text-gray-900 antialiased">
        <CartProvider>
          <Navbar />

          {/* KUNCI: main diberi class w-full min-h-screen agar konten di dalamnya melebar 100% */}
          <main className="w-full min-h-screen m-0 p-0">{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
