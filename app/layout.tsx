import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trader Command Center',
  description: 'Market intelligence dashboard for crypto and semiconductor-linked instruments.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
