'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { unifiedLoginAction } from '@/app/actions/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, Lock, User, ShieldCheck } from 'lucide-react';

export default function UnifiedLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await unifiedLoginAction(formData);
      if (res?.error) {
        setError(res.error);
      } else if (res?.redirectUrl) {
        router.push(res.redirectUrl);
      }
    });
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-emerald-50/60 p-4">
      {/* Top Header Logos (MAN & OSIM) */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center space-x-4 mb-4">
          <img
            src="/logo-man.png"
            alt="Logo MAN"
            className="h-16 sm:h-20 w-auto object-contain drop-shadow-md"
          />
          <span className="text-emerald-300 font-light text-2xl">|</span>
          <img
            src="/logo-osim.png"
            alt="Logo OSIM"
            className="h-16 sm:h-20 w-auto object-contain drop-shadow-md"
          />
        </div>
        <h1 className="text-2xl font-bold text-emerald-950 tracking-tight">
          E-Voting OSIM
        </h1>
        <p className="text-sm text-emerald-800/80 mt-1 font-medium">
          Sistem Pemungutan Suara Pemilihan Ketua OSIM
        </p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-emerald-100 bg-white">
        <CardHeader className="space-y-1 text-center border-b border-slate-100 pb-6">
          <CardTitle className="text-xl text-emerald-950">Masuk Aplikasi</CardTitle>
          <CardDescription className="text-slate-500">
            Masukkan username dan password untuk melanjutkan.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-sm">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Akses Ditolak</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Username / Nama
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-emerald-600" />
                <Input
                  name="username"
                  type="text"
                  placeholder="Masukkan Username atau NISN"
                  required
                  className="pl-9 border-slate-300 focus-visible:ring-emerald-600"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-emerald-600" />
                <Input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="pl-9 border-slate-300 focus-visible:ring-emerald-600"
                  disabled={isPending}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-bold mt-2 bg-emerald-700 hover:bg-emerald-800 text-white shadow-md"
              disabled={isPending}
            >
              {isPending ? 'Memverifikasi...' : 'Masuk ke Sistem'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <div className="inline-flex items-center text-xs text-gray-400 px-3 py-1.5 font-medium">
              {/* <ShieldCheck className="h-4 w-4 text-emerald-600 mr-1.5" /> */}
              MAN 1 Kota Pekalongan @ 2026
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
