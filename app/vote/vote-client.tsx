'use client';

import { useState, useTransition } from 'react';
import { submitVoteAction, logoutVoterAction } from '@/app/actions/voter';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Check, Eye, LogOut, Vote, AlertTriangle, ShieldCheck, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface Candidate {
  id: string;
  candidate_number: number;
  name: string;
  vision: string;
  mission: string[];
  photo_url?: string | null;
}

interface VoteClientProps {
  voterUsername: string;
  candidates: Candidate[];
}

export default function VoteClient({ voterUsername, candidates }: VoteClientProps) {
  const router = useRouter();
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [viewVisionCandidate, setViewVisionCandidate] = useState<Candidate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleConfirmVote = () => {
    if (!selectedCandidate) return;

    setError(null);
    startTransition(async () => {
      const res = await submitVoteAction(selectedCandidate.id);
      if (res?.error) {
        setError(res.error);
        setSelectedCandidate(null);
      } else {
        router.push('/success');
      }
    });
  };

  return (
    <div className="min-h-screen bg-emerald-50/40 flex flex-col">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-emerald-100 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/logo-man.png" alt="Logo MAN" className="h-9 w-auto object-contain" />
            <div>
              <h1 className="text-base font-bold text-emerald-950 leading-none">
                Surat Suara Digital
              </h1>
              <p className="text-xs text-emerald-700/80 mt-0.5 font-medium">Pemilihan Ketua OSIM</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 bg-emerald-50 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-900 border border-emerald-200">
              <User className="h-3.5 w-3.5 text-emerald-600" />
              <span>Pemilih: <strong>{voterUsername}</strong></span>
            </div>

            <form action={logoutVoterAction}>
              <Button variant="ghost" size="sm" type="submit" className="text-slate-600 hover:text-rose-600">
                <LogOut className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Ballot Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Banner Instruction */}
        <div className="bg-emerald-900 text-white p-6 rounded-2xl mb-8 shadow-lg relative overflow-hidden border border-emerald-800">
          <div className="relative z-10">
            <div className="inline-flex items-center bg-emerald-800 text-emerald-200 px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-emerald-700">
              {/* <ShieldCheck className="h-3.5 w-3.5 mr-1 text-emerald-300" /> */}
              MAN 1 KOTA PEKALONGAN
            </div>
            <h2 className="text-2xl font-bold mb-1">Pilihlah Kandidat Terbaik Anda</h2>
            <p className="text-emerald-100 text-sm max-w-2xl">
              Silakan periksa visi & misi setiap pasangan calon di bawah ini. Anda hanya dapat menggunakan hak suara 1 kali.
            </p>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 sm:opacity-90 pointer-events-none">
            <img src="/logo-osim.png" alt="Logo OSIM" className="h-24 sm:h-32 w-auto object-contain drop-shadow-md" />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-3 text-rose-800">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Candidate Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((candidate) => (
            <Card
              key={candidate.id}
              className="group hover:border-emerald-500 hover:shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden bg-white border-slate-200"
            >
              <div>
                {/* Photo & Number Badge Header */}
                <div className="relative h-64 w-full bg-slate-100 overflow-hidden">
                  {candidate.photo_url ? (
                    <img
                      src={candidate.photo_url}
                      alt={candidate.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                      <User className="h-20 w-20" />
                    </div>
                  )}
                  {/* Candidate Number Badge */}
                  <div className="absolute top-4 left-4 bg-emerald-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl shadow-lg text-lg border border-emerald-600">
                    KANDIDAT {String(candidate.candidate_number).padStart(2, '0')}
                  </div>
                </div>

                <CardHeader className="pb-2">
                  <CardTitle className="text-xl text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {candidate.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 text-sm text-slate-600">
                  <div>
                    <span className="font-semibold text-xs text-emerald-800 uppercase tracking-wider block mb-1">
                      Visi Ringkas
                    </span>
                    <p className="line-clamp-3 text-slate-700 font-medium">
                      "{candidate.vision}"
                    </p>
                  </div>
                </CardContent>
              </div>

              <CardFooter className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full border-slate-200 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900"
                  onClick={() => setViewVisionCandidate(candidate)}
                >
                  <Eye className="h-4 w-4 mr-2 text-emerald-600" />
                  Lihat Visi & Misi Lengkap
                </Button>

                <Button
                  variant="accent"
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-11 shadow-md"
                  onClick={() => setSelectedCandidate(candidate)}
                >
                  <Check className="h-5 w-5 mr-2" />
                  Pilih Kandidat Ini
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>

      {/* Vision & Mission Detail Modal */}
      <Dialog
        isOpen={!!viewVisionCandidate}
        onClose={() => setViewVisionCandidate(null)}
        title={`Visi & Misi - Kandidat ${String(viewVisionCandidate?.candidate_number || '').padStart(2, '0')}`}
        description={viewVisionCandidate?.name}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {viewVisionCandidate?.photo_url && (
            <img
              src={viewVisionCandidate.photo_url}
              alt={viewVisionCandidate.name}
              className="w-full h-48 object-cover rounded-lg mb-4"
            />
          )}

          <div>
            <h4 className="text-sm font-semibold uppercase text-emerald-700 tracking-wider mb-1">
              Visi
            </h4>
            <p className="text-slate-800 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 italic">
              "{viewVisionCandidate?.vision}"
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase text-emerald-700 tracking-wider mb-2">
              Misi
            </h4>
            <ul className="space-y-2">
              {viewVisionCandidate?.mission.map((m, idx) => (
                <li key={idx} className="flex items-start text-sm text-slate-700">
                  <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center mr-2.5 shrink-0 mt-0.5 border border-emerald-200">
                    {idx + 1}
                  </span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button variant="outline" onClick={() => setViewVisionCandidate(null)}>
              Tutup
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Voting Confirmation Modal (Rule 2 Requirement) */}
      <Dialog
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        title="Konfirmasi Pilihan Suara"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900 mb-1">Pilihan Bersifat Final & Sekali Pakai!</p>
              <p>
                Apakah Anda yakin ingin memilih{' '}
                <strong>
                  Pasangan Nomor Urut {String(selectedCandidate?.candidate_number).padStart(2, '0')} ({selectedCandidate?.name})
                </strong>
                ? Pilihan tidak dapat diubah setelah dikirim dan sesi Anda akan diselesaikan.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setSelectedCandidate(null)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              variant="accent"
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6"
              onClick={handleConfirmVote}
              disabled={isPending}
            >
              {isPending ? 'Mengirim Suara...' : 'Ya, Saya Yakin Pilih'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
