import { redirect } from 'next/navigation';

export default function RootPage() {
  // Langsung arahkan user ke URL /login
  redirect('/login');
}
