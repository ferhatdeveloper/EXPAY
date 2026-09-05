import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Box,
  ArrowDownToLine,
  CheckCircle2,
  RefreshCw,
  Loader2,
  MapPin,
  Hash,
  Scale,
  Coins,
  Calendar,
  User,
  Building2,
  X,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageShell } from '@/components/ui/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatNumber, formatDate, formatDateTime } from '@/lib/format';

interface EmanetDetail {
  id: string;
  referenceNo: string;
  customerId: string;
  customer?: { id: string; code?: string; fullName: string; phone?: string };
  branch?: { id: string; code: string; name: string };
  currency: string;
  kind: 'CURRENCY' | 'PRECIOUS_METAL';
  metalType?: string | null;
  weightGrams?: string | null;
  purity?: string | null;
  initialAmount: string;
  currentAmount: string;
  unit: string;
  entryRate: string;
  entryTRYEquivalent: string;
  currentTRYEquivalent?: string | null;
  storageLocation?: string | null;
  vaultNumber?: string | null;
  status: 'OPEN' | 'PARTIAL' | 'CLOSED' | 'FORFEIT';
  openedAt: string;
  closedAt?: string | null;
  closedReason?: string | null;
  description?: string | null;
  expiresAt?: string | null;
  opener?: { id: string; fullName: string; username: string };
  closer?: { id: string; fullName: string; username: string } | null;
  transactions: Array<{
    id: string;
    type: 'DEPOSIT' | 'RELEASE' | 'CLOSE' | 'ADJUST';
    currency: string;
    amount: string;
    rateTRY: string;
    tryEquivalent: string;
    description?: string | null;
    createdAt: string;
    user?: { id: string; fullName: string; username: string };
  }>;
}

const STATUS_TONE: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Açık', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  PARTIAL: { label: 'Kısmi İade', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  CLOSED: { label: 'Kapalı', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  FORFEIT: { label: 'Müsadere', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

const TX_TYPE_META: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  DEPOSIT: { label: 'Emanet Alındı', icon: <Box className="h-3.5 w-3.5" />, cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  RELEASE: { label: 'Kısmi İade', icon: <ArrowDownToLine className="h-3.5 w-3.5" />, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  CLOSE: { label: 'Tam İade', icon: <CheckCircle2 className="h-3.5 w-3.5" />, cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  ADJUST: { label: 'Düzeltme', icon: <RefreshCw className="h-3.5 w-3.5" />, cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
};

export function EmanetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [releaseModal, setReleaseModal] = useState<{ open: boolean; full: boolean }>({ open: false, full: false });
  const [releaseAmount, setReleaseAmount] = useState(0);
  const [releaseRate, setReleaseRate] = useState(0);

  const emanetQ = useQuery({
    queryKey: ['emanet-detail', id],
    queryFn: () => api.get(`/emanet/${id}`).then((r) => r.data as EmanetDetail),
    enabled: !!id,
  });

  const release = useMutation({
    mutationFn: (payload: { amount: number; rateTRY: number; full: boolean }) => {
      if (payload.full) {
        return api
          .post('/emanet/close', {
            emanetId: id,
            rateTRY: payload.rateTRY,
          })
          .then((r) => r.data);
      }
      return api
        .post('/emanet/release', {
          emanetId: id,
          amount: payload.amount,
          rateTRY: payload.rateTRY,
        })
        .then((r) => r.data);
    },
    onSuccess: () => {
      toast.success('İade işlemi tamamlandı');
      queryClient.invalidateQueries({ queryKey: ['emanet-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['emanet'] });
      setReleaseModal({ open: false, full: false });
      setReleaseAmount(0);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'İade başarısız'),
  });

  const e = emanetQ.data;

  const tryRelease = useMemo(() => releaseAmount * releaseRate, [releaseAmount, releaseRate]);

  if (emanetQ.isLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      </PageShell>
    );
  }

  if (!e) {
    return (
      <PageShell>
        <PageHeader title="Emanet Bulunamadı" icon={Box} />
        <Link to="/cari/emanet">
          <Button variant="outline" className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Listeye Dön
          </Button>
        </Link>
      </PageShell>
    );
  }

  const tone = STATUS_TONE[e.status] ?? STATUS_TONE.OPEN;
  const remaining = Number(e.currentAmount);
  const initial = Number(e.initialAmount);
  const ratio = initial > 0 ? remaining / initial : 0;

  const openReleaseModal = (full: boolean) => {
    setReleaseRate(Number(e.entryRate));
    setReleaseAmount(full ? remaining : 0);
    setReleaseModal({ open: true, full });
  };

  return (
    <PageShell>
      <PageHeader
        title={`Emanet ${e.referenceNo}`}
        description={`${e.customer?.fullName ?? '-'} · ${e.kind === 'PRECIOUS_METAL' ? 'Kıymetli Maden' : 'Döviz'}`}
        icon={Box}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/cari/emanet">
              <Button variant="outline" size="sm" className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Geri
              </Button>
            </Link>
            {(e.status === 'OPEN' || e.status === 'PARTIAL') && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openReleaseModal(false)}
                  className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200"
                >
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  Kısmi İade
                </Button>
                <Button
                  size="sm"
                  onClick={() => openReleaseModal(true)}
                  className="bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Tam İade
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sol kolon — Emanet kartı */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm">
            <CardHeader className="p-4 border-b border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
                  <Box className="h-5 w-5 text-blue-600" />
                  Emanet Bilgileri
                </CardTitle>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold ${tone.cls}`}>
                  {tone.label}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Progress */}
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-slate-400">Kalan / Başlangıç</span>
                  <span className="font-mono font-semibold text-gray-900 dark:text-slate-50">
                    {formatNumber(remaining, "tr", 4)} / {formatNumber(initial, "tr", 4)} {e.currency}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                    style={{ width: `${Math.min(100, ratio * 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Info label="Referans No" value={e.referenceNo} mono />
                <Info label="Tür" value={e.kind === 'PRECIOUS_METAL' ? `${e.metalType ?? 'XAU'} (Maden)` : 'Döviz'} />
                <Info label="Currency" value={e.currency} mono />
                <Info
                  label="Birim"
                  value={e.unit === 'PIECE' ? 'Adet' : e.unit === 'GRAM' ? 'Gram' : 'Ons'}
                />
                <Info label="Başlangıç" value={`${formatNumber(initial, "tr", 4)} ${e.currency}`} mono />
                <Info label="Kalan" value={`${formatNumber(remaining, "tr", 4)} ${e.currency}`} mono highlight />
                <Info label="Giriş Kuru" value={`1 ${e.currency} = ${formatNumber(Number(e.entryRate), "tr", 4)} ₺`} mono />
                <Info label="Başlangıç TRY" value={`${formatNumber(Number(e.entryTRYEquivalent), "tr", 2)} ₺`} mono />
                <Info label="Anlık TRY" value={e.currentTRYEquivalent ? `${formatNumber(Number(e.currentTRYEquivalent), "tr", 2)} ₺` : '-'} mono />
              </div>

              {e.kind === 'PRECIOUS_METAL' && (
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 border-t border-gray-200 dark:border-slate-800 pt-4">
                  {e.weightGrams && <Info label="Ağırlık" value={`${formatNumber(Number(e.weightGrams), "tr", 4)} gr`} mono />}
                  {e.purity && <Info label="Saflık" value={`${(Number(e.purity) * 100).toFixed(2)}%`} mono />}
                </div>
              )}

              {(e.storageLocation || e.vaultNumber) && (
                <div className="mt-4 border-t border-gray-200 dark:border-slate-800 pt-4 grid grid-cols-2 gap-3">
                  {e.storageLocation && (
                    <Info
                      label="Saklama Yeri"
                      value={e.storageLocation}
                      icon={<MapPin className="h-3 w-3" />}
                    />
                  )}
                  {e.vaultNumber && (
                    <Info label="Vault No" value={e.vaultNumber} icon={<Hash className="h-3 w-3" />} mono />
                  )}
                </div>
              )}

              <div className="mt-4 border-t border-gray-200 dark:border-slate-800 pt-4 grid grid-cols-2 gap-3">
                <Info
                  label="Açılış"
                  value={formatDateTime(e.openedAt)}
                  icon={<Calendar className="h-3 w-3" />}
                />
                <Info
                  label="Açan"
                  value={e.opener?.fullName ?? '-'}
                  icon={<User className="h-3 w-3" />}
                />
                {e.closedAt && (
                  <>
                    <Info
                      label="Kapanış"
                      value={formatDateTime(e.closedAt)}
                      icon={<Calendar className="h-3 w-3" />}
                    />
                    <Info
                      label="Kapanan"
                      value={e.closer?.fullName ?? '-'}
                      icon={<User className="h-3 w-3" />}
                    />
                  </>
                )}
                {e.expiresAt && (
                  <Info
                    label="Vade"
                    value={formatDate(e.expiresAt)}
                    icon={<Calendar className="h-3 w-3" />}
                  />
                )}
                <Info label="Şube" value={e.branch?.name ?? '-'} icon={<Building2 className="h-3 w-3" />} />
              </div>

              {e.description && (
                <div className="mt-4 border-t border-gray-200 dark:border-slate-800 pt-4">
                  <p className="text-xs text-gray-500 mb-1">Açıklama</p>
                  <p className="text-sm text-gray-900 dark:text-slate-50">{e.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sağ kolon — Hareket Geçmişi */}
        <div>
          <Card className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm">
            <CardHeader className="p-4 border-b border-gray-200 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
                <History className="h-5 w-5 text-blue-600" />
                Hareket Geçmişi
              </CardTitle>
              <p className="mt-1 text-xs text-gray-500">{e.transactions.length} hareket</p>
            </CardHeader>
            <CardContent className="p-4">
              {e.transactions.length === 0 ? (
                <p className="text-sm text-gray-500">Henüz hareket yok.</p>
              ) : (
                <ol className="space-y-3">
                  {e.transactions.map((tx) => {
                    const meta = TX_TYPE_META[tx.type] ?? TX_TYPE_META.DEPOSIT;
                    const isNegative = tx.type === 'RELEASE' || tx.type === 'CLOSE';
                    return (
                      <li key={tx.id} className="relative pl-7">
                        <div className="absolute left-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                          {meta.icon}
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-slate-50">
                              <span className={`inline-block rounded px-1.5 py-0.5 text-xs mr-1 ${meta.cls}`}>
                                {meta.label}
                              </span>
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {formatDateTime(tx.createdAt)} · {tx.user?.fullName ?? tx.user?.username ?? '-'}
                            </p>
                            {tx.description && (
                              <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">{tx.description}</p>
                            )}
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <p className={`font-mono text-sm font-semibold ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                              {isNegative ? '-' : '+'}
                              {formatNumber(Number(tx.amount), "tr", 4)} {tx.currency}
                            </p>
                            <p className="mt-0.5 font-mono text-xs text-gray-500">
                              {formatNumber(Number(tx.tryEquivalent), "tr", 2)} ₺
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* İade Modal */}
      {releaseModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="w-full max-w-md bg-white dark:bg-slate-900 shadow-xl">
            <CardHeader className="p-4 border-b border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-gray-900 dark:text-slate-50">
                  {releaseModal.full ? 'Tam İade' : 'Kısmi İade'}
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setReleaseModal({ open: false, full: false })}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600 dark:text-slate-400">
                  İade Tutarı {releaseModal.full ? '(tüm bakiye)' : `(${formatNumber(remaining, "tr", 4)} ${e.currency} max)`}
                </Label>
                <Input
                  type="number"
                  step="0.0001"
                  max={remaining}
                  value={releaseAmount}
                  onChange={(ev) => setReleaseAmount(Math.min(remaining, Number(ev.target.value) || 0))}
                  disabled={releaseModal.full}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600 dark:text-slate-400">İade Kuru (1 {e.currency} = ? ₺)</Label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={releaseRate}
                  onChange={(ev) => setReleaseRate(Number(ev.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-900 dark:text-blue-300">İade Tutarı</span>
                  <span className="font-mono font-semibold text-blue-900 dark:text-blue-300">
                    {formatNumber(releaseAmount, "tr", 4)} {e.currency}
                  </span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-blue-900 dark:text-blue-300">TRY Karşılığı</span>
                  <span className="font-mono font-semibold text-blue-900 dark:text-blue-300">
                    {formatNumber(tryRelease, "tr", 2)} ₺
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setReleaseModal({ open: false, full: false })}
                  className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
                >
                  İptal
                </Button>
                <Button
                  onClick={() => release.mutate({ amount: releaseAmount, rateTRY: releaseRate, full: releaseModal.full })}
                  disabled={release.isPending || releaseAmount <= 0 || releaseRate <= 0}
                  className="bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  {release.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      İşleniyor…
                    </>
                  ) : (
                    <>Onayla</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}

function Info({
  label,
  value,
  mono,
  highlight,
  icon,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p
        className={`mt-1 text-sm ${
          mono ? 'font-mono' : ''
        } ${highlight ? 'font-bold text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-slate-50'}`}
      >
        {value}
      </p>
    </div>
  );
}

export default EmanetDetailPage;
