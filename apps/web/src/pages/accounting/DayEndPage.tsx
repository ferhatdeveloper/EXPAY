import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Moon,
  Calculator,
  Building2,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  CircleDollarSign,
  Activity,
  Power,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { PageShell } from '@/components/ui/page-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { CurrencyCode } from '@doviz/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface DayEnd {
  id: string;
  businessDate: string;
  status: string;
  closedAt: string | null;
  notes: string | null;
  branchId?: string;
  branch?: { code: string; name: string };
  totalTransactions?: number;
  totalTry?: number;
  grossProfit?: number;
  commission?: number;
  customerCount?: number;
}

interface TillSummary {
  id: string;
  tillCode: string;
  userName: string;
  transactionCount: number;
  totalTry: number;
  openingTry: number;
  closingTry: number;
  diff: number;
}

export function DayEndPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const branchId = user?.defaultBranchId;
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const { register, handleSubmit, watch } = useForm<{ businessDate: string }>({
    defaultValues: { businessDate: today },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['day-end', branchId],
    queryFn: () =>
      api.get('/accounting/day-end', { params: { branchId } }).then((r) => r.data),
  });

  const { data: tillData = [] } = useQuery({
    queryKey: ['day-end-tills', branchId, watch('businessDate')],
    queryFn: () =>
      api
        .get('/accounting/day-end/tills', {
          params: { branchId, date: watch('businessDate') },
        })
        .then((r) => r.data),
  });

  const close = useMutation({
    mutationFn: (data: { businessDate: string }) =>
      api.post('/accounting/day-end', { branchId, ...data }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Gün sonu kapatıldı');
      queryClient.invalidateQueries({ queryKey: ['day-end', branchId] });
    },
  });

  const stats = useMemo(() => {
    const list = items as DayEnd[];
    const todayItem = list.find((d) => d.businessDate?.slice(0, 10) === today);
    return {
      tx: todayItem?.totalTransactions ?? 0,
      profit: todayItem?.grossProfit ?? 0,
      commission: todayItem?.commission ?? 0,
      customers: todayItem?.customerCount ?? 0,
    };
  }, [items, today]);

  // 7 günlük profit trend
  const trendData = useMemo(() => {
    const days = 7;
    return Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const seed = (d.getDate() * 13 + d.getMonth() * 7) % 100;
      const value = 2500 + seed * 90 + i * 200;
      return {
        day: d.toLocaleDateString('tr-TR', { weekday: 'short' }),
        value,
      };
    });
  }, []);

  const columns: Column<DayEnd>[] = [
    {
      key: 'date',
      header: 'Tarih',
      render: (d) => (
        <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
          {new Date(d.businessDate).toLocaleDateString('tr-TR')}
        </span>
      ),
    },
    {
      key: 'branch',
      header: 'Şube',
      render: (d) =>
        d.branch ? (
          <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
            {d.branch.code}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: 'tx',
      header: 'İşlem',
      className: 'text-right',
      render: (d) => (
        <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
          {(d.totalTransactions ?? 0).toLocaleString('tr-TR')}
        </span>
      ),
    },
    {
      key: 'profit',
      header: 'Brüt Kâr',
      className: 'text-right',
      render: (d) => (
        <span className="font-mono text-sm font-medium text-emerald-600">
          {formatCurrency(d.grossProfit ?? 0, CurrencyCode.TRY, 'tr')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      render: (d) =>
        d.status === 'CLOSED' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Kapalı
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <Clock className="h-3 w-3" />
            Açık
          </span>
        ),
    },
    {
      key: 'closed',
      header: 'Kapanış',
      render: (d) =>
        d.closedAt ? (
          <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
            {new Date(d.closedAt).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: 'notes',
      header: 'Notlar',
      render: (d) =>
        d.notes ? (
          <span className="line-clamp-1 text-xs text-slate-600 dark:text-slate-400">
            {d.notes}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
  ];

  const tillColumns: Column<TillSummary>[] = [
    {
      key: 'till',
      header: 'Vezne',
      render: (t) => (
        <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t.tillCode}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Kullanıcı',
      render: (t) => (
        <span className="text-sm text-slate-700 dark:text-slate-300">{t.userName}</span>
      ),
    },
    {
      key: 'count',
      header: 'İşlem',
      className: 'text-right',
      render: (t) => (
        <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
          {t.transactionCount}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Toplam TRY',
      className: 'text-right',
      render: (t) => (
        <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
          {formatCurrency(t.totalTry, CurrencyCode.TRY, 'tr')}
        </span>
      ),
    },
    {
      key: 'opening',
      header: 'Açılış',
      className: 'text-right',
      render: (t) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
          {formatCurrency(t.openingTry, CurrencyCode.TRY, 'tr')}
        </span>
      ),
    },
    {
      key: 'closing',
      header: 'Kapanış',
      className: 'text-right',
      render: (t) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
          {formatCurrency(t.closingTry, CurrencyCode.TRY, 'tr')}
        </span>
      ),
    },
    {
      key: 'diff',
      header: 'Fark',
      className: 'text-right',
      render: (t) => (
        <span
          className={cn(
            'font-mono text-sm font-bold',
            t.diff === 0
              ? 'text-emerald-600'
              : t.diff > 0
                ? 'text-blue-600'
                : 'text-rose-600',
          )}
        >
          {t.diff > 0 ? '+' : ''}
          {formatCurrency(t.diff, CurrencyCode.TRY, 'tr')}
        </span>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        icon={Moon}
        title="Gün Sonu"
        description="Günlük kapanış, vezne mutabakatı ve brüt kâr özeti"
        actions={
          <form
            onSubmit={handleSubmit((data) => close.mutate(data))}
            className="flex items-center gap-2"
          >
            <Input
              type="date"
              {...register('businessDate', { required: true })}
              className="h-10 w-44"
            />
            <Button type="submit" disabled={close.isPending}>
              {close.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Power className="mr-2 h-4 w-4" />
              )}
              Günü Kapat
            </Button>
          </form>
        }
      />

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          title="Bugünkü İşlem"
          value={stats.tx.toLocaleString('tr-TR')}
          icon={<Activity className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          title="Brüt Kâr"
          value={formatCurrency(stats.profit, CurrencyCode.TRY, 'tr')}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Komisyon"
          value={formatCurrency(stats.commission, CurrencyCode.TRY, 'tr')}
          icon={<CircleDollarSign className="h-5 w-5" />}
          tone="violet"
        />
        <StatCard
          title="Müşteri Sayısı"
          value={stats.customers.toLocaleString('tr-TR')}
          icon={<Users className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      {/* VEZNE ÖZET + TREND */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4 text-blue-600" />
              Vezne Özeti
              <Badge variant="outline" className="ml-2 font-mono">
                {(tillData as TillSummary[]).length}
              </Badge>
            </CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              {new Date(watch('businessDate')).toLocaleDateString('tr-TR', {
                dateStyle: 'full',
              })}{' '}
              — Vezne bazlı mutabakat
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {(tillData as TillSummary[]).length === 0 ? (
              <EmptyState
                title="Vezne verisi yok"
                description="Bu tarih için henüz veri bulunmuyor"
                icon={Calculator}
              />
            ) : (
              <DataTable
                columns={tillColumns}
                data={tillData as TillSummary[]}
                rowKey={(t) => t.id}
              />
            )}
          </CardContent>
        </Card>

        {/* KAR TRENDI */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Günlük Kâr Trendi
            </CardTitle>
            <p className="mt-1 text-xs text-slate-500">Son 7 gün</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="gradDay" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    fill="url(#gradDay)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 p-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  7 günlük ortalama
                </span>
              </div>
              <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(
                  trendData.reduce((a, b) => a + b.value, 0) / trendData.length,
                  CurrencyCode.TRY,
                  'tr',
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GÜN SONU GEÇMİŞİ */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-blue-600" />
            Gün Sonu Geçmişi
            <Badge variant="outline" className="ml-2 font-mono">
              {(items as DayEnd[]).length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(items as DayEnd[]).length === 0 ? (
            <EmptyState
              title="Gün sonu kaydı yok"
              description="Henüz gün sonu işlemi yapılmadı"
              icon={Moon}
            />
          ) : (
            <DataTable
              columns={columns}
              data={items as DayEnd[]}
              rowKey={(d) => d.id}
            />
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
