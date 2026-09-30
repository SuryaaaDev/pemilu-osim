import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'E-Voting OSIM MAN 1 Kota Pekalongan',
  description: 'Sistem Pemungutan Suara Online Ketua & Wakil Ketua OSIM MAN 1 Kota Pekalongan',
  icons: {
    icon: '/logo-man.png',
    shortcut: '/logo-man.png',
    apple: '/logo-man.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/logo-man.png" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/logo-man.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-man.png" />
      </head>
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
