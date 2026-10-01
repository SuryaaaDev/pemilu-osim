'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  logoutAdminAction,
  createVoterAction,
  bulkImportVotersAction,
  deleteVoterAction,
  saveCandidateAction,
  deleteCandidateAction,
} from '@/app/actions/admin';
import { generateRandomCode, compressImageToWebP } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Vote,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit,
  LogOut,
  Search,
  Radio,
  FileSpreadsheet,
  BarChart3,
  UserCheck,
  UserX,
  KeyRound,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Image as ImageIcon,
  Sparkles,
  Maximize2,
  Minimize2,
  PieChart as PieChartIcon,
  Presentation,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import Papa from 'papaparse';

export interface CandidateItem {
  id: string;
  candidate_number: number;
  name: string;
  vision: string;
  mission: string[];
  photo_url?: string | null;
  vote_count: number;
}

export interface VoterItem {
  id: string;
  username: string;
  raw_password?: string;
  has_voted: boolean;
  voted_at?: string | null;
  created_at: string;
}

interface DashboardClientProps {
  candidates: CandidateItem[];
  voters: VoterItem[];
  totalVotes: number;
}

export default function DashboardClient({
  candidates,
  voters,
  totalVotes,
}: DashboardClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'recap' | 'voters' | 'candidates'>('recap');

  // Realtime state notification pulse
  const [lastVoteTime, setLastVoteTime] = useState<string | null>(null);

  // Search & Filter & Pagination state for voters table
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'voted' | 'not_voted'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10);

  // Auto-reset page to 1 when search term, status filter, or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, itemsPerPage]);

  // Modal & Projector states
  const [isAddVoterOpen, setIsAddVoterOpen] = useState(false);
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<CandidateItem | null>(null);
  const [isProjectorModeOpen, setIsProjectorModeOpen] = useState(false);

  // Native Browser Fullscreen Handlers for Projector Mode (F11 style)
  const openProjectorFullscreen = () => {
    setIsProjectorModeOpen(true);
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) {
      (elem as any).msRequestFullscreen();
    }
  };

  const closeProjectorFullscreen = () => {
    setIsProjectorModeOpen(false);
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        setIsProjectorModeOpen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Candidate photo upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [compressedSizeInfo, setCompressedSizeInfo] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Auto-generated password state for new voter modal
  const [autoPassword, setAutoPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form error/success alerts
  const [modalError, setModalError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Initialize auto password when opening Add Voter modal
  const handleOpenAddVoterModal = () => {
    setModalError(null);
    setAutoPassword(generateRandomCode(6));
    setIsAddVoterOpen(true);
  };

  const handleRegenerateAutoPassword = () => {
    setAutoPassword(generateRandomCode(6));
  };

  // Open candidate modal with reset photo state
  const handleOpenCandidateModal = (candidate: CandidateItem | null = null) => {
    setEditingCandidate(candidate);
    setPhotoFile(null);
    setPhotoPreview(candidate?.photo_url || null);
    setCompressedSizeInfo(null);
    setModalError(null);
    setIsCandidateModalOpen(true);
  };

  // Handle Photo File selection & WebP compression
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setModalError(null);
    setIsCompressing(true);

    try {
      const webpFile = await compressImageToWebP(file, 800, 0.8);

      setPhotoFile(webpFile);
      setPhotoPreview(URL.createObjectURL(webpFile));
      setCompressedSizeInfo(
        `Valid`
      );
    } catch (err) {
      console.error('Compression error:', err);
      setModalError('Gagal mengompres gambar. Pastikan format file gambar valid.');
      toast.error('Gagal mengompres gambar. Pastikan format file gambar valid.');
    } finally {
      setIsCompressing(false);
    }
  };

  // RULE 3: Supabase Realtime Subscription setup on `votes` table
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('admin-realtime-votes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes' },
        () => {
          setLastVoteTime(new Date().toLocaleTimeString('id-ID'));
          toast.success('Suara baru masuk! Rekapitulasi diperbarui.', 'Realtime Update');
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, toast]);

  // Derived Stats
  const totalVotersCount = voters.length;
  const votedVotersCount = voters.filter((v) => v.has_voted).length;
  const remainingVotersCount = totalVotersCount - votedVotersCount;
  const participationPercentage =
    totalVotersCount > 0
      ? ((votedVotersCount / totalVotersCount) * 100).toFixed(1)
      : '0.0';

  // Filtered Voters
  const filteredVoters = voters.filter((v) => {
    const matchesSearch = v.username.toLowerCase().includes(searchTerm.toLowerCase());
    if (statusFilter === 'voted') return matchesSearch && v.has_voted;
    if (statusFilter === 'not_voted') return matchesSearch && !v.has_voted;
    return matchesSearch;
  });

  // Paginated Voters Calculation
  const totalFilteredVoters = filteredVoters.length;
  const perPageNum = itemsPerPage === 'all' ? (totalFilteredVoters || 1) : itemsPerPage;
  const totalPages = Math.max(1, Math.ceil(totalFilteredVoters / perPageNum));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = totalFilteredVoters === 0 ? 0 : (validCurrentPage - 1) * perPageNum;
  const endIndex = Math.min(startIndex + perPageNum, totalFilteredVoters);
  const paginatedVoters = filteredVoters.slice(startIndex, endIndex);

  // Recharts Colors matching logo (Emerald Green, Gold Yellow, Teal, Emerald Dark)
  const COLORS = ['#047857', '#EAB308', '#0284C7', '#10B981', '#D97706', '#059669'];

  const chartData = candidates.map((c, index) => ({
    name: `Kandidat ${String(c.candidate_number).padStart(2, '0')}`,
    fullName: c.name,
    votes: c.vote_count,
    color: COLORS[index % COLORS.length],
  }));

  const pieChartData = candidates.map((c, index) => ({
    name: `Kandidat ${String(c.candidate_number).padStart(2, '0')}`,
    fullName: c.name,
    value: c.vote_count,
    color: COLORS[index % COLORS.length],
  }));

  // Export CSV Action formatted as: username, password
  const handleExportCsv = () => {
    const csvData = voters.map((v) => ({
      username: v.username,
      password: v.raw_password || '',
    }));

    const csvString = Papa.unparse(csvData, {
      header: true,
      columns: ['username', 'password'],
    });

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rekap-pemilih-osis-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Berhasil mengunduh CSV ${voters.length} pemilih.`, 'Export CSV');
  };

  // Voter Actions
  const handleAddVoter = (formData: FormData) => {
    const username = formData.get('username')?.toString();
    setModalError(null);

    startTransition(async () => {
      const res = await createVoterAction(formData);
      if (res?.error) {
        setModalError(res.error);
        toast.error(res.error, 'Gagal Tambah Pemilih');
      } else {
        setIsAddVoterOpen(false);
        toast.success(`Pemilih '${username}' berhasil ditambahkan!`, 'Sukses Tambah Pemilih');
      }
    });
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setModalError(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Array<Record<string, string>>;
        const parsedVoters: { username: string; password?: string }[] = [];

        for (const row of rows) {
          const username = row.username || row.Username || row.NISN;
          const password = row.password || row.Password || row.token || row.Token;
          if (username) {
            parsedVoters.push({ username, password });
          }
        }

        if (parsedVoters.length === 0) {
          const msg = 'Format CSV tidak valid. Pastikan terdapat kolom "username".';
          setModalError(msg);
          toast.error(msg, 'Gagal Import CSV');
          return;
        }

        startTransition(async () => {
          const res = await bulkImportVotersAction(parsedVoters);
          if (res?.error) {
            setModalError(res.error);
            toast.error(res.error, 'Gagal Import CSV');
          } else {
            setIsImportCsvOpen(false);
            toast.success(`Berhasil mengimpor ${res.count} data pemilih!`, 'Sukses Import CSV');
          }
        });
      },
      error: (err) => {
        const msg = `Gagal membaca file CSV: ${err.message}`;
        setModalError(msg);
        toast.error(msg, 'Gagal Import CSV');
      },
    });
  };

  const handleDeleteVoter = (voterId: string, username: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus pemilih '${username}'?`)) {
      startTransition(async () => {
        const res = await deleteVoterAction(voterId);
        if (res?.error) {
          toast.error(res.error, 'Gagal Hapus Pemilih');
        } else {
          toast.success(`Pemilih '${username}' berhasil dihapus.`, 'Sukses Hapus Pemilih');
        }
      });
    }
  };

  const toggleShowPassword = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Password disalin ke clipboard!', 'Salin Password');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Candidate Actions (Upload to Supabase Storage or Base64 WebP fallback)
  const handleSaveCandidate = async (formData: FormData) => {
    setModalError(null);
    const isEdit = !!editingCandidate;
    const name = formData.get('name')?.toString() || '';

    let finalPhotoUrl = photoPreview || '';

    if (photoFile) {
      const supabase = createClient();
      const candidateNumber = formData.get('candidate_number')?.toString() || '0';
      const fileName = `paslon-${candidateNumber}-${Date.now()}.webp`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('candidate-photos')
          .upload(fileName, photoFile, {
            contentType: 'image/webp',
            upsert: true,
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('candidate-photos')
            .getPublicUrl(fileName);

          finalPhotoUrl = publicUrlData.publicUrl;
        } else {
          console.warn('Storage upload error fallback to base64 WebP:', uploadError.message);
          finalPhotoUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(photoFile);
          });
        }
      } catch (err) {
        console.warn('Storage upload exception fallback to base64 WebP:', err);
        finalPhotoUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(photoFile);
        });
      }
    }

    formData.set('photo_url', finalPhotoUrl);

    startTransition(async () => {
      const res = await saveCandidateAction(formData);
      if (res?.error) {
        setModalError(res.error);
        toast.error(res.error, isEdit ? 'Gagal Edit Kandidat' : 'Gagal Tambah Kandidat');
      } else {
        setIsCandidateModalOpen(false);
        setEditingCandidate(null);
        setPhotoFile(null);
        setPhotoPreview(null);
        toast.success(
          isEdit
            ? `Data Kandidat '${name}' berhasil diperbarui!`
            : `Kandidat baru '${name}' berhasil ditambahkan!`,
          isEdit ? 'Sukses Edit Kandidat' : 'Sukses Tambah Kandidat'
        );
      }
    });
  };

  const handleDeleteCandidate = (candidateId: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus '${name}'? Semua data perolehan suara kandidat ini akan ikut terhapus.`)) {
      startTransition(async () => {
        const res = await deleteCandidateAction(candidateId);
        if (res?.error) {
          toast.error(res.error, 'Gagal Hapus Kandidat');
        } else {
          toast.success(`Kandidat '${name}' berhasil dihapus.`, 'Sukses Hapus Kandidat');
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50/40 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-emerald-950 text-white shadow-md border-b border-emerald-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/logo-man.png" alt="Logo MAN" className="h-9 w-auto object-contain" />
            <div>
              <h1 className="text-base font-bold leading-none text-white">Admin E-Voting OSIM</h1>
              <p className="text-xs text-emerald-300 mt-0.5">Dashboard Kendali & Rekapitulasi</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <form action={logoutAdminAction}>
              <Button variant="ghost" size="sm" className="text-emerald-200 hover:text-white hover:bg-emerald-900">
                <LogOut className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-2 border-b border-emerald-200 mb-8 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('recap')}
            className={`flex items-center px-4 py-2.5 font-semibold text-sm rounded-t-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'recap'
                ? 'bg-white text-emerald-700 border-b-2 border-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-emerald-900 hover:bg-emerald-100/50'
            }`}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Rekapitulasi Realtime
          </button>
          <button
            onClick={() => setActiveTab('voters')}
            className={`flex items-center px-4 py-2.5 font-semibold text-sm rounded-t-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'voters'
                ? 'bg-white text-emerald-700 border-b-2 border-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-emerald-900 hover:bg-emerald-100/50'
            }`}
          >
            <Users className="h-4 w-4 mr-2" />
            Data Pemilih ({totalVotersCount})
          </button>
          <button
            onClick={() => setActiveTab('candidates')}
            className={`flex items-center px-4 py-2.5 font-semibold text-sm rounded-t-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'candidates'
                ? 'bg-white text-emerald-700 border-b-2 border-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-emerald-900 hover:bg-emerald-100/50'
            }`}
          >
            <Vote className="h-4 w-4 mr-2" />
            Data Kandidat ({candidates.length})
          </button>
        </div>

        {/* TAB 1: REKAPITULASI REALTIME */}
        {activeTab === 'recap' && (
          <div className="space-y-8">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Total Pemilih
                    </p>
                    <h3 className="text-2xl font-extrabold text-emerald-950 mt-1">
                      {totalVotersCount}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Terdaftar dalam sistem</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                    <Users className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Suara Masuk
                    </p>
                    <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">
                      {totalVotes}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Sudah menggunakan hak pilih</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Belum Memilih
                    </p>
                    <h3 className="text-2xl font-extrabold text-amber-600 mt-1">
                      {remainingVotersCount}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Menunggu giliran</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                    <Clock className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Partisipasi Suara
                    </p>
                    <h3 className="text-2xl font-extrabold text-emerald-700 mt-1">
                      {participationPercentage}%
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Tingkat kehadiran suara</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                    <Radio className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Realtime Bar Chart */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-emerald-950">
                      Grafik Perolehan Suara Kandidat
                    </CardTitle>
                    <CardDescription>
                      Data diperbarui secara instan saat suara dikirimkan pemilih.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {candidates.length === 0 ? (
                  <p className="text-center text-slate-400 py-12">Belum ada data kandidat.</p>
                ) : (
                  <div className="h-80 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} />
                        <YAxis allowDecimals={false} stroke="#64748B" fontSize={12} tickLine={false} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-emerald-950 text-white p-3 rounded-lg shadow-xl text-xs space-y-1 border border-emerald-800">
                                  <p className="font-bold">{data.name}: {data.fullName}</p>
                                  <p className="text-emerald-400 font-extrabold text-sm">
                                    {data.votes} Suara (
                                    {totalVotes > 0
                                      ? ((data.votes / totalVotes) * 100).toFixed(1)
                                      : 0}
                                    %)
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="votes" radius={[8, 8, 0, 0]} barSize={50}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Realtime Pie Chart (Directly below Bar Chart) */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg text-emerald-950 flex items-center">
                      <PieChartIcon className="h-5 w-5 mr-2 text-emerald-700" />
                      Grafik Persentase Perolehan Suara (Pie Chart)
                    </CardTitle>
                    <CardDescription>
                      Proporsi persentase pembagian suara antar pasangan calon.
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openProjectorFullscreen}
                      className="bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 font-bold text-xs shadow-xs"
                    >
                      <Maximize2 className="h-4 w-4 mr-1.5 text-emerald-700" />
                      Mode Proyektor (Fullscreen)
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {candidates.length === 0 ? (
                  <p className="text-center text-slate-400 py-12">Belum ada data kandidat.</p>
                ) : (
                  <div className="h-96 w-full pt-2 flex flex-col items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }: any) =>
                            totalVotes > 0 && percent ? `${name}: ${(percent * 100).toFixed(1)}%` : `${name}: 0%`
                          }
                          outerRadius={130}
                          innerRadius={50}
                          fill="#8884d8"
                          dataKey="value"
                          paddingAngle={4}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`pie-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-emerald-950 text-white p-3 rounded-lg shadow-xl text-xs space-y-1 border border-emerald-800">
                                  <p className="font-bold">{data.name}: {data.fullName}</p>
                                  <p className="text-emerald-400 font-extrabold text-sm">
                                    {data.value} Suara (
                                    {totalVotes > 0
                                      ? ((data.value / totalVotes) * 100).toFixed(1)
                                      : 0}
                                    %)
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          formatter={(value, entry: any) => (
                            <span className="text-xs font-semibold text-slate-700 mx-2">
                              {value} ({entry.payload.fullName})
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* FULLSCREEN PROJECTOR MODE FOR PIE CHART ONLY (BRIGHT THEME) */}
        {isProjectorModeOpen && (
          <div className="fixed inset-0 z-50 bg-emerald-50/95 text-slate-900 p-6 md:p-10 flex flex-col justify-between overflow-y-auto animate-in fade-in duration-300">
            {/* Projector Header */}
            <div className="flex flex-col md:flex-row items-center justify-between border-b border-emerald-200 pb-4 gap-4 bg-white p-5 rounded-2xl shadow-sm border border-emerald-100">
              <div className="flex items-center space-x-4">
                <img src="/logo-man.png" alt="Logo MAN" className="h-14 w-auto object-contain" />
                <img src="/logo-osim.png" alt="Logo OSIM" className="h-14 w-auto object-contain" />
                <div>
                  <h2 className="text-xl md:text-2xl font-extrabold text-emerald-950 tracking-tight">
                    REKAPITULASI SUARA REALTIME
                  </h2>
                  <p className="text-xs md:text-sm text-emerald-800 font-medium">
                    Pemilihan Ketua OSIM 
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">

                <Button
                  onClick={closeProjectorFullscreen}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-11 px-5 shadow-md"
                >
                  <Minimize2 className="h-5 w-5 mr-2" />
                  Tutup Proyektor
                </Button>
              </div>
            </div>

            {/* Giant Pie Chart Container (Projector Centerpiece on Light Background) */}
            <div className="flex-1 my-6 flex items-center justify-center min-h-[500px] w-full bg-white p-6 rounded-2xl border border-emerald-100 shadow-md">
              {candidates.length === 0 ? (
                <p className="text-slate-400 text-lg">Belum ada data kandidat kandidat.</p>
              ) : (
                <ResponsiveContainer width="100%" height={520}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={{ stroke: '#047857', strokeWidth: 2 }}
                      label={({ name, value, percent }: any) =>
                        `${name}: ${value} Suara (${percent ? (percent * 100).toFixed(1) : 0}%)`
                      }
                      outerRadius={180}
                      innerRadius={65}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={5}
                      style={{ fontSize: '16px', fontWeight: '800', fill: '#064e3b' }}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`proj-cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={3} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-emerald-950 text-white p-4 rounded-xl shadow-2xl text-sm space-y-1 border border-emerald-500">
                              <p className="font-extrabold text-base text-emerald-300">{data.name}: {data.fullName}</p>
                              <p className="text-white font-black text-lg">
                                {data.value} Suara (
                                {totalVotes > 0
                                  ? ((data.value / totalVotes) * 100).toFixed(1)
                                  : 0}
                                %)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Bottom Candidate Cards Summary (Bright/Light Theme) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 border-t border-emerald-200 pt-4">
              {candidates.map((c, index) => {
                const color = COLORS[index % COLORS.length];
                const pct = totalVotes > 0 ? ((c.vote_count / totalVotes) * 100).toFixed(1) : '0.0';
                return (
                  <div
                    key={c.id}
                    className="bg-white border border-emerald-200 rounded-xl p-4 flex items-center space-x-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shrink-0 shadow-md border border-white/20"
                      style={{ backgroundColor: color }}
                    >
                      {String(c.candidate_number).padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-base truncate">{c.name}</p>
                      <p className="text-xs text-slate-600 font-medium">
                        <strong className="text-emerald-700 text-sm font-extrabold">{c.vote_count} Suara</strong> ({pct}%)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: MANAJEMEN USER PEMILIH */}
        {activeTab === 'voters' && (
          <div className="space-y-6">
            {/* Header Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center space-x-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-emerald-600" />
                  <Input
                    placeholder="Cari username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-white border-slate-300"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="all">Semua Status</option>
                  <option value="voted">Sudah Memilih</option>
                  <option value="not_voted">Belum Memilih</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="bg-white border-slate-300 text-slate-700 hover:bg-emerald-50"
                  onClick={handleExportCsv}
                >
                  <Download className="h-4 w-4 mr-2 text-emerald-700" />
                  Export CSV Pemilih
                </Button>

                <Button
                  variant="outline"
                  className="bg-white border-slate-300 text-slate-700 hover:bg-emerald-50"
                  onClick={() => {
                    setModalError(null);
                    setIsImportCsvOpen(true);
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
                  Import CSV Massal
                </Button>

                <Button onClick={handleOpenAddVoterModal} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Pemilih
                </Button>
              </div>
            </div>

            {/* Voter Table */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Password Token</TableHead>
                      <TableHead>Status Hak Pilih</TableHead>
                      <TableHead>Waktu Memilih</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedVoters.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                          Tidak ada data pemilih yang sesuai.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedVoters.map((voter, index) => {
                        const isPasswordVisible = !!showPasswords[voter.id];
                        const pwd = voter.raw_password || '******';
                        const globalIndex = startIndex + index + 1;

                        return (
                          <TableRow key={voter.id}>
                            <TableCell className="font-mono text-xs text-slate-400">
                              {globalIndex}
                            </TableCell>
                            <TableCell className="font-semibold text-slate-900">
                              {voter.username}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 text-xs tracking-wider">
                                  {isPasswordVisible ? pwd : '••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleShowPassword(voter.id)}
                                  className="text-slate-400 hover:text-emerald-700 p-1"
                                  title={isPasswordVisible ? 'Sembunyikan' : 'Tampilkan'}
                                >
                                  {isPasswordVisible ? (
                                    <EyeOff className="h-3.5 w-3.5" />
                                  ) : (
                                    <Eye className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(pwd, voter.id)}
                                  className="text-slate-400 hover:text-emerald-700 p-1"
                                  title="Salin Password"
                                >
                                  {copiedId === voter.id ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </TableCell>
                            <TableCell>
                              {voter.has_voted ? (
                                <Badge variant="success" className="gap-1">
                                  <UserCheck className="h-3 w-3" /> Sudah Memilih
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1 bg-amber-50 text-amber-700 border-amber-200">
                                  <UserX className="h-3 w-3 text-amber-600" /> Belum Memilih
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {voter.voted_at
                                ? new Date(voter.voted_at).toLocaleString('id-ID')
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8"
                                onClick={() => handleDeleteVoter(voter.id, voter.username)}
                                title="Hapus Pemilih"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {/* Pagination Footer Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-200 bg-slate-50/60 gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-slate-600 font-medium">
                      {totalFilteredVoters > 0
                        ? `Menampilkan ${startIndex + 1} - ${endIndex} dari ${totalFilteredVoters} pemilih`
                        : '0 pemilih'}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500 font-medium">Tampilkan per halaman:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItemsPerPage(val === 'all' ? 'all' : Number(val));
                        }}
                        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-xs cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value="all">Semua ({totalVotersCount})</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-slate-300"
                      disabled={validCurrentPage <= 1}
                      onClick={() => setCurrentPage(1)}
                      title="Halaman Pertama"
                    >
                      <ChevronsLeft className="h-4 w-4 text-slate-600" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-slate-300"
                      disabled={validCurrentPage <= 1}
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      title="Halaman Sebelumnya"
                    >
                      <ChevronLeft className="h-4 w-4 text-slate-600" />
                    </Button>

                    <span className="px-3 font-semibold text-emerald-950">
                      Halaman {validCurrentPage} dari {totalPages}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-slate-300"
                      disabled={validCurrentPage >= totalPages}
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      title="Halaman Selanjutnya"
                    >
                      <ChevronRight className="h-4 w-4 text-slate-600" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-slate-300"
                      disabled={validCurrentPage >= totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      title="Halaman Terakhir"
                    >
                      <ChevronsRight className="h-4 w-4 text-slate-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 3: MANAJEMEN KANDIDAT PASLON */}
        {activeTab === 'candidates' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-emerald-950">Daftar Kandidat</h3>
                <p className="text-xs text-slate-500">Kelola nomor urut, foto kandidat, visi & misi kandidat</p>
              </div>

              <Button onClick={() => handleOpenCandidateModal(null)} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Kandidat Baru
              </Button>
            </div>

            {/* Candidates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {candidates.map((c) => (
                <Card key={c.id} className="bg-white border-slate-200 flex flex-col justify-between overflow-hidden shadow-sm">
                  <div>
                    <div className="relative h-56 w-full bg-slate-100">
                      {c.photo_url ? (
                        <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Vote className="h-16 w-16" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 bg-emerald-700 text-white font-extrabold px-3 py-1 rounded-lg text-sm border border-emerald-600 shadow-md">
                        KANDIDAT {String(c.candidate_number).padStart(2, '0')}
                      </div>
                      <div className="absolute bottom-3 right-3 bg-emerald-950/90 text-emerald-300 font-extrabold px-3 py-1 rounded-lg text-xs backdrop-blur-xs border border-emerald-800">
                        {c.vote_count} Suara Masuk
                      </div>
                    </div>

                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-emerald-950">{c.name}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                          Visi
                        </span>
                        <p className="text-slate-700 text-xs italic mt-0.5">"{c.vision}"</p>
                      </div>

                      <div>
                        <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                          Misi
                        </span>
                        <ul className="list-disc list-inside text-xs text-slate-600 mt-1 space-y-1">
                          {c.mission.map((m, idx) => (
                            <li key={idx} className="line-clamp-2">{m}</li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </div>

                  <div className="p-4 pt-0 flex space-x-2 border-t border-slate-100 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-slate-300 hover:bg-emerald-50 hover:text-emerald-900"
                      onClick={() => handleOpenCandidateModal(c)}
                    >
                      <Edit className="h-3.5 w-3.5 mr-1 text-emerald-700" /> Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteCandidate(c.id, c.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Tambah Pemilih Single */}
      <Dialog
        isOpen={isAddVoterOpen}
        onClose={() => setIsAddVoterOpen(false)}
        title="Tambah Pemilih Baru"
        description="Password otomatis di-generate 6 karakter acak (Angka + Huruf Kapital)"
      >
        {modalError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            {modalError}
          </div>
        )}
        <form action={handleAddVoter} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Username / Nama</label>
            <Input name="username" placeholder="Raditya Putra" required disabled={isPending} />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700">Password Token</label>
              <button
                type="button"
                onClick={handleRegenerateAutoPassword}
                className="text-xs text-emerald-700 hover:underline flex items-center font-medium"
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Acak Password
              </button>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-emerald-600" />
              <Input
                name="password"
                type="text"
                value={autoPassword}
                onChange={(e) => setAutoPassword(e.target.value.toUpperCase())}
                className="pl-9 font-mono font-bold tracking-widest text-emerald-800 uppercase"
                required
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsAddVoterOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold">
              {isPending ? 'Simpan...' : 'Simpan Pemilih'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL: Import CSV Massal */}
      <Dialog
        isOpen={isImportCsvOpen}
        onClose={() => setIsImportCsvOpen(false)}
        title="Import Pemilih dari File CSV"
        description="Upload file CSV berisi kolom 'username'. Jika password kosong, sistem otomatis membuatkan 6 angka/huruf acak."
      >
        {modalError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            {modalError}
          </div>
        )}
        <div className="space-y-4">
          <div className="p-4 border-2 border-dashed border-emerald-300 rounded-xl text-center bg-emerald-50/50">
            <Upload className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-emerald-950">Pilih File .CSV Pemilih</p>
            <p className="text-xs text-slate-500 mt-1 mb-3">Format header: username, password (opsional)</p>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvFileUpload}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-700 file:text-white hover:file:bg-emerald-800 cursor-pointer"
              disabled={isPending}
            />
          </div>

          <div className="bg-slate-100 p-3 rounded-lg text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Contoh Format Isi File CSV:</p>
            <pre className="bg-white p-2 rounded border border-slate-200 text-[11px] font-mono">
{`username,password
voter01,8K9A2X
voter02,`}
            </pre>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsImportCsvOpen(false)}>
              Tutup
            </Button>
          </div>
        </div>
      </Dialog>

      {/* MODAL: Form Candidate (Add / Edit) with Image Upload & WebP Compression */}
      <Dialog
        isOpen={isCandidateModalOpen}
        onClose={() => {
          setIsCandidateModalOpen(false);
          setEditingCandidate(null);
        }}
        title={editingCandidate ? 'Edit Data Kandidat' : 'Tambah Kandidat Baru'}
        description="Upload foto kandidat, lengkapi visi & misi"
        className="max-w-3xl w-full"
      >
        {modalError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            {modalError}
          </div>
        )}
        <form action={handleSaveCandidate} className="space-y-5 max-h-[78vh] overflow-y-auto px-1 pt-1">
          {editingCandidate && <input type="hidden" name="id" value={editingCandidate.id} />}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-semibold text-slate-700">Nomor Urut Kandidat</label>
              <Input
                name="candidate_number"
                type="number"
                min="1"
                defaultValue={editingCandidate?.candidate_number || candidates.length + 1}
                required
                disabled={isPending || isCompressing}
                className="h-11 font-bold text-base border-slate-300 focus-visible:ring-emerald-600"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Nama Pasangan Calon</label>
              <Input
                name="name"
                placeholder="Contoh: Ahmad & Siti"
                defaultValue={editingCandidate?.name || ''}
                required
                disabled={isPending || isCompressing}
                className="h-11 border-slate-300 focus-visible:ring-emerald-600"
              />
            </div>
          </div>

          {/* Photo File Upload & WebP Compression UI */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Foto Kandidat (File Upload)</span>
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border-2 border-dashed border-emerald-300 rounded-xl bg-emerald-50/40">
              {/* Photo Preview Box */}
              <div className="relative h-32 w-32 shrink-0 rounded-lg overflow-hidden bg-slate-200 border border-slate-300 flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview Foto Kandidat" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-2 text-slate-400">
                    <ImageIcon className="h-8 w-8 mx-auto mb-1" />
                    <span className="text-[10px] block">Belum ada foto</span>
                  </div>
                )}
              </div>

              {/* Upload Input & Info */}
              <div className="flex-1 w-full space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  disabled={isPending || isCompressing}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-700 file:text-white hover:file:bg-emerald-800 cursor-pointer"
                />

                {isCompressing && (
                  <p className="text-xs text-emerald-700 animate-pulse font-medium">
                    ⚡ Sedang mengompres gambar ke format WebP...
                  </p>
                )}

                {compressedSizeInfo && (
                  <div className="p-2 rounded bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-medium">
                    {compressedSizeInfo}
                  </div>
                )}

                <p className="text-[11px] text-slate-500">
                  Format gambar .jpg, .png, .jpeg, .webp.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Visi Kandidat</label>
            <textarea
              name="vision"
              rows={3}
              className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none leading-relaxed"
              placeholder="Tuliskan visi utama pasangan calon..."
              defaultValue={editingCandidate?.vision || ''}
              required
              disabled={isPending || isCompressing}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Misi (Satu baris per poin misi)</label>
            <textarea
              name="mission"
              rows={5}
              className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono text-xs leading-relaxed"
              placeholder={'1. Meningkatkan kegiatan kesiswaan\n2. Mengembangkan digitalisasi sekolah\n3. Menjalin kolaborasi dengan ekstrakurikuler'}
              defaultValue={editingCandidate?.mission ? editingCandidate.mission.join('\n') : ''}
              required
              disabled={isPending || isCompressing}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              type="button"
              className="h-11 px-6"
              onClick={() => {
                setIsCandidateModalOpen(false);
                setEditingCandidate(null);
                setPhotoFile(null);
                setPhotoPreview(null);
              }}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending || isCompressing}
              className="h-11 px-8 font-bold bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {isPending ? 'Menyimpan...' : 'Simpan Data Kandidat'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
