'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck, Vote, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function VoteSuccessPage() {
  const [countdown, setCountdown] = useState(10);
  const router = useRouter();

  useEffect(() => {
    if (countdown <= 0) {
      router.push('/');
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, router]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-emerald-50/60 p-4">
      <Card className="w-full max-w-md shadow-xl border-emerald-100 bg-white text-center p-6">
        <CardContent className="pt-6 flex flex-col items-center">
          <div className="mb-4">
            <img src="/logo-man.png" alt="Logo MAN" className="h-16 w-auto object-contain drop-shadow-sm" />
          </div>

          <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-200">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <h1 className="text-2xl font-bold text-emerald-950 mb-2">
            Suara Anda Berhasil Disimpan!
          </h1>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            Terima kasih telah berpartisipasi dalam Pemilihan Ketua & Wakil Ketua OSIM MAN 1 PEKALONGAN. 
            Hak suara Anda sangat berharga bagi kemajuan sekolah.
          </p>

          <div className="w-full bg-emerald-50/50 rounded-lg p-4 mb-6 border border-emerald-100 text-left space-y-2">
            <div className="flex items-center text-xs font-semibold text-emerald-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600 mr-2 shrink-0" />
              Kerahasiaan Suara Terjamin (Anonim)
            </div>
            <div className="flex items-center text-xs font-semibold text-emerald-900">
              <Vote className="h-4 w-4 text-emerald-700 mr-2 shrink-0" />
              Sesi Akun Telah Diakhiri Otomatis
            </div>
          </div>

          <div className="mb-4 px-3 py-1.5 bg-emerald-100/70 border border-emerald-300 rounded-full text-emerald-800 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
            <span>Mengalihkan ke Login dalam</span>
            <span className="font-bold text-emerald-950 bg-white px-2 py-0.5 rounded-full shadow-sm">
              {countdown}s
            </span>
          </div>

          <Link href="/" className="w-full">
            <Button className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-md flex items-center justify-center gap-2">
              Kembali Sekarang <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

