import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Roast Royale 🔥 — Can You Survive The Roast?',
  description: '16 players. 15 are AI. 1 is you. Can they spot the human?',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen fire-bg antialiased">
        {children}
      </body>
    </html>
  );
}
