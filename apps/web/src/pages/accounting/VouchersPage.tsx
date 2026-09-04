import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  CheckCircle2,
  Clock,
  Calendar,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  CircleDollarSign,
  TrendingDown,
  Receipt,
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
import { formatCurrency } from '@/lib/format';
import { CurrencyCode } from '@doviz/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface Line {
  accountCode: string;
  currencyCode: string;
  debit: number;
  credit: number;
  description?: string;
}
interface FormVals {
  description: string;
  date: string;
  voucherType: 'NORMAL' | 'OPENING' | 'CLOSING';
  lines: Line[];
}

interface Voucher {
  id: string;
  voucherNo: string;
  voucherType: string;
  voucherDate: string;
  description: string;
  totalDebit: string;
  totalCredit: string;
  postedAt: string | null;
  branchId?: string;
  branch?: { code: string; name: string };
  lines: Array<{
    id: string;
    account: { code: string; name: string };
    currencyCode: string;
    debit: string;
    credit: string;
  }>;
}

const TYPE_META: Record<string, { label: string; tone: string; bg: string }> = {
  NORMAL: { label: 'Normal', tone: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  OPENING: { label: 'Açılış', tone: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  CLOSING: { label: 'Kapanış', tone: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-100 dark:bg-violet-900/40' },
};

export function VouchersPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const branchId = user?.defaultBranchId;
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { register, handleSubmit, control, reset } = useForm<FormVals>({
    defaultValues: {
      description: '',
      date: new Date().toISOString().slice(0, 10),
      voucherType: 'NORMAL',
      lines: [
        { accountCode: '', currencyCode: 'TRY', debit: 0, credit: 0 },
        { accountCode: '', currencyCode: 'TRY', debit: 0, credit: 0 },
      ],
    },
  });
  const { fields, remove: removeLine, append } = useFieldArray({
    control,
    name: 'lines',
  });

  const { data: items = [] } = useQuery({
    queryKey: ['vouchers', branchId],
    queryFn: () =>
      api
        .get('/accounting/vouchers', { params: { branchId } })
        .then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: unknown) =>
      api.post('/accounting/vouchers', data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Fiş oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['vouchers', branchId] });
      setShowForm(false);
      reset();
    },
  });

  const filtered = useMemo(() => {
    const list = items as Voucher[];
    return list.filter((v) => {
      if (typeFilter !== 'ALL' && v.voucherType !== typeFilter) return false;
      if (statusFilter === 'POSTED' && !v.postedAt) return false;
      if (statusFilter === 'DRAFT' && v.postedAt) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !v.voucherNo.toLowerCase().includes(q) &&
          !v.description.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [items, typeFilter, statusFilter, search]);

  const stats = useMemo(() => {
    const list = items as Voucher[];
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const total = list.length;
    const thisMonth = list.filter((v) => {
      const d = new Date(v.voucherDate);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;
    const totalDebit = list.reduce(
      (acc, v) => acc + Number(v.totalDebit ?? 0),
      0,
    );
    const totalCredit = list.reduce(
      (acc, v) => acc + Number(v.totalCredit ?? 0),
      0,
    );
    return { total, thisMonth, totalDebit, totalCredit };
  }, [items]);

  const columns: Column<Voucher>[] = [
    {
      key: 'no',
      header: 'Fiş No',
      render: (v) => (
        <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
          {v.voucherNo}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Tarih',
      render: (v) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
          {new Date(v.voucherDate).toLocaleDateString('tr-TR')}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Tip',
      render: (v) => {
        const meta = TYPE_META[v.voucherType];
        return (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              meta?.bg,
              meta?.tone,
            )}
          >
            {meta?.label ?? v.voucherType}
          </span>
        );
      },
    },
    {
      key: 'branch',
      header: 'Şube',
      render: (v) =>
        v.branch ? (
          <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
            {v.branch.code}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: 'desc',
      header: 'Açıklama',
      render: (v) => (
        <span className="line-clamp-1 text-sm text-slate-700 dark:text-slate-300">
          {v.description}
        </span>
      ),
    },
    {
      key: 'debit',
      header: 'Toplam Borç',
      className: 'text-right',
      render: (v) => (
        <span className="font-mono text-sm font-medium text-rose-600 dark:text-rose-400">
          {formatCurrency(Number(v.totalDebit), CurrencyCode.TRY, 'tr')}
        </span>
      ),
    },
    {
      key: 'credit',
      header: 'Toplam Alacak',
      className: 'text-right',
      render: (v) => (
        <span className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {formatCurrency(Number(v.totalCredit), CurrencyCode.TRY, 'tr')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      render: (v) =>
        v.postedAt ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Postali
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <Clock className="h-3 w-3" />
            Bekliyor
          </span>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: () => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        icon={FileText}
        title="Muhasebe Fişleri"
        description="Borç / alacak fişlerini yönetin — açılış, kapanış ve normal fişler"
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? 'İptal' : 'Yeni Fiş'}
          </Button>
        }
      />

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          title="Toplam Fiş"
          value={stats.total.toLocaleString('tr-TR')}
          icon={<Receipt className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          title="Bu Ay"
          value={stats.thisMonth.toLocaleString('tr-TR')}
          icon={<Calendar className="h-5 w-5" />}
          tone="violet"
          sublabel="Aylık"
        />
        <StatCard
          title="Toplam Borç"
          value={formatCurrency(stats.totalDebit, CurrencyCode.TRY, 'tr')}
          icon={<ArrowUpRight className="h-5 w-5" />}
          tone="rose"
        />
        <StatCard
          title="Toplam Alacak"
          value={formatCurrency(stats.totalCredit, CurrencyCode.TRY, 'tr')}
          icon={<ArrowDownRight className="h-5 w-5" />}
          tone="emerald"
        />
      </div>

      {/* FİLTRE BAR + LİSTE */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-blue-600" />
              Fiş Listesi
              <Badge variant="outline" className="ml-2 font-mono">
                {filtered.length}
              </Badge>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Fiş no / açıklama ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-56 pl-7"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-background px-3 text-sm dark:border-slate-800"
              >
                <option value="ALL">Tüm Tipler</option>
                <option value="NORMAL">Normal</option>
                <option value="OPENING">Açılış</option>
                <option value="CLOSING">Kapanış</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-background px-3 text-sm dark:border-slate-800"
              >
                <option value="ALL">Tüm Durumlar</option>
                <option value="POSTED">Postali</option>
                <option value="DRAFT">Bekliyor</option>
              </select>
            </div>
          </div>
        </CardHeader>
        {showForm && (
          <CardContent className="border-b bg-slate-50 dark:bg-slate-900/40">
            <form
              onSubmit={handleSubmit((data) =>
                create.mutate({
                  ...data,
                  branchId,
                  date: new Date(data.date),
                }),
              )}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Tarih</Label>
                  <Input type="date" {...register('date', { required: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tip</Label>
                  <select
                    {...register('voucherType')}
                    className="h-10 w-full rounded-md border border-slate-200 bg-background px-3 text-sm dark:border-slate-800"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="OPENING">Açılış</option>
                    <option value="CLOSING">Kapanış</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Açıklama</Label>
                  <Input
                    placeholder="Fiş açıklaması..."
                    {...register('description', { required: true })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Fiş Satırları</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({
                        accountCode: '',
                        currencyCode: 'TRY',
                        debit: 0,
                        credit: 0,
                      })
                    }
                  >
                    <Plus className="mr-1 h-3 w-3" /> Satır Ekle
                  </Button>
                </div>
                {fields.map((f, i) => (
                  <div
                    key={f.id}
                    className="grid grid-cols-12 gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <Input
                      className="col-span-3"
                      placeholder="Hesap Kodu"
                      {...register(`lines.${i}.accountCode`, {
                        required: true,
                      })}
                    />
                    <Input
                      className="col-span-2"
                      placeholder="Döviz"
                      {...register(`lines.${i}.currencyCode`)}
                    />
                    <Input
                      className="col-span-2"
                      type="number"
                      step="any"
                      placeholder="Borç"
                      {...register(`lines.${i}.debit`, {
                        valueAsNumber: true,
                      })}
                    />
                    <Input
                      className="col-span-2"
                      type="number"
                      step="any"
                      placeholder="Alacak"
                      {...register(`lines.${i}.credit`, {
                        valueAsNumber: true,
                      })}
                    />
                    <Input
                      className="col-span-2"
                      placeholder="Açıklama"
                      {...register(`lines.${i}.description`)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="col-span-1"
                      onClick={() => removeLine(i)}
                    >
                      Sil
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  İptal
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  <Plus className="mr-2 h-4 w-4" /> Fiş Oluştur
                </Button>
              </div>
            </form>
          </CardContent>
        )}
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              title="Fiş bulunamadı"
              description="Filtreleri değiştirin veya yeni fiş oluşturun"
              icon={Filter}
            />
          ) : (
            <DataTable
              columns={columns}
              data={filtered}
              rowKey={(v) => v.id}
            />
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
