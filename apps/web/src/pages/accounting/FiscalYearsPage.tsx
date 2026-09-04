import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  CalendarDays,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Calendar,
  FileText,
  Edit,
  Lock,
  Power,
  Building2,
} from 'lucide-react';
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
import { api } from '@/lib/api';

interface FiscalYear {
  id: string;
  year: number;
  startDate: string;
  endDate: string;
  active: boolean;
  closed?: boolean;
  openingVoucherId?: string | null;
  closingVoucherId?: string | null;
  branch?: { code: string; name: string };
}

type FYStatus = 'ACTIVE' | 'OPEN' | 'CLOSED';

function getStatus(fy: FiscalYear): FYStatus {
  if (fy.active) return 'ACTIVE';
  if (fy.closed) return 'CLOSED';
  return 'OPEN';
}

const STATUS_META: Record<FYStatus, { label: string; tone: string; bg: string }> = {
  ACTIVE: {
    label: 'Aktif',
    tone: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
  },
  OPEN: {
    label: 'Açık',
    tone: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-100 dark:bg-blue-900/40',
  },
  CLOSED: {
    label: 'Kapanmış',
    tone: 'text-slate-700 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-800',
  },
};

export function FiscalYearsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  const { register, handleSubmit, reset } = useForm<{
    year: number;
    startDate: string;
    endDate: string;
  }>({
    defaultValues: {
      year: new Date().getFullYear() + 1,
      startDate: '',
      endDate: '',
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['fiscal-years'],
    queryFn: () =>
      api.get('/accounting/fiscal-years').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: unknown) =>
      api.post('/accounting/fiscal-years', data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Mali yıl oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      setShowForm(false);
      reset();
    },
  });

  const filtered = useMemo(() => {
    const list = items as FiscalYear[];
    return list.filter((f) => {
      if (search) {
        return String(f.year).includes(search);
      }
      return true;
    });
  }, [items, search]);

  const stats = useMemo(() => {
    const list = items as FiscalYear[];
    return {
      active: list.filter((f) => f.active).length,
      total: list.length,
      open: list.filter((f) => !f.active && !f.closed).length,
      closed: list.filter((f) => f.closed).length,
    };
  }, [items]);

  const columns: Column<FiscalYear>[] = [
    {
      key: 'year',
      header: 'Yıl',
      render: (f) => (
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white">
            {String(f.year).slice(-2)}
          </div>
          <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
            {f.year}
          </span>
        </div>
      ),
    },
    {
      key: 'start',
      header: 'Başlangıç',
      render: (f) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
          {new Date(f.startDate).toLocaleDateString('tr-TR')}
        </span>
      ),
    },
    {
      key: 'end',
      header: 'Bitiş',
      render: (f) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
          {new Date(f.endDate).toLocaleDateString('tr-TR')}
        </span>
      ),
    },
    {
      key: 'opening',
      header: 'Açılış Fişi',
      render: (f) =>
        f.openingVoucherId ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Var
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <XCircle className="h-3 w-3" />
            Yok
          </span>
        ),
    },
    {
      key: 'closing',
      header: 'Kapanış Fişi',
      render: (f) =>
        f.closingVoucherId ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
            <CheckCircle2 className="h-3 w-3" />
            Var
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <XCircle className="h-3 w-3" />
            Yok
          </span>
        ),
    },
    {
      key: 'status',
      header: 'Durum',
      render: (f) => {
        const s = getStatus(f);
        const meta = STATUS_META[s];
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
              meta.bg,
              meta.tone,
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {meta.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (f) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Edit className="h-4 w-4" />
          </Button>
          {f.active ? (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600">
              <Lock className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600">
              <Power className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        icon={CalendarDays}
        title="Mali Yıl"
        description="Mali yıl dönemlerini, açılış / kapanış fişlerini yönetin"
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? 'İptal' : 'Yeni Yıl'}
          </Button>
        }
      />

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          title="Aktif Yıl"
          value={stats.active.toString()}
          icon={<Calendar className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Toplam Yıl"
          value={stats.total.toLocaleString('tr-TR')}
          icon={<CalendarDays className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          title="Açık Yıl"
          value={stats.open.toString()}
          icon={<FileText className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Kapanmış Yıl"
          value={stats.closed.toString()}
          icon={<Lock className="h-5 w-5" />}
          tone="slate"
        />
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              Mali Yıl Listesi
              <Badge variant="outline" className="ml-2 font-mono">
                {filtered.length}
              </Badge>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Yıl ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-48 pl-7"
              />
            </div>
          </div>
        </CardHeader>
        {showForm && (
          <CardContent className="border-b bg-slate-50 dark:bg-slate-900/40">
            <form
              onSubmit={handleSubmit((data) => create.mutate(data))}
              className="grid grid-cols-1 gap-3 md:grid-cols-3"
            >
              <div className="space-y-1.5">
                <Label>Yıl</Label>
                <Input
                  type="number"
                  {...register('year', { required: true, valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Başlangıç</Label>
                <Input type="date" {...register('startDate', { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>Bitiş</Label>
                <Input type="date" {...register('endDate', { required: true })} />
              </div>
              <div className="md:col-span-3 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  İptal
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  <Plus className="mr-2 h-4 w-4" /> Yıl Oluştur
                </Button>
              </div>
            </form>
          </CardContent>
        )}
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              title="Mali yıl bulunamadı"
              description="Yeni mali yıl oluşturun"
              icon={CalendarDays}
            />
          ) : (
            <DataTable
              columns={columns}
              data={filtered}
              rowKey={(f) => f.id}
            />
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
