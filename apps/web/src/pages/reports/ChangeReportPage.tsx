import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  History,
  FileText,
  FileSpreadsheet,
  Printer,
  FileDown,
  Filter,
  AlertCircle,
  Edit3,
  Trash2,
  Eye,
  User as UserIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { exportToCSV, exportToExcel, printHtml } from '@/components/shared/exporters';
import { formatDateTime } from '@/lib/format';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ChangeRow {
  id: string;
  model: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
  recordId: string;
  reason?: string | null;
  user?: { fullName: string } | null;
  createdAt: string;
}

const ACTION_META: Record<
  string,
  { label: string; classes: string; icon: typeof Edit3 }
> = {
  CREATE: {
    label: 'CREATE',
    classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    icon: Edit3,
  },
  UPDATE: {
    label: 'UPDATE',
    classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    icon: Edit3,
  },
  DELETE: {
    label: 'DELETE',
    classes: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    icon: Trash2,
  },
  READ: {
    label: 'READ',
    classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    icon: Eye,
  },
};

export function ChangeReportPage() {
  const branchId = useAuthStore((s) => s.user?.defaultBranchId) ?? '';
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [action, setAction] = useState('');
  const [model, setModel] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['report-change', branchId, startDate, endDate, action, model],
    queryFn: () =>
      api
        .get('/reports/audit/changes', {
          params: {
            branchId,
            startDate,
            endDate,
            action: action || undefined,
            model: model || undefined,
          },
        })
        .then((r) => r.data?.items ?? r.data ?? []),
  });

  const arr = items as ChangeRow[];

  const stats = useMemo(() => {
    const total = arr.length;
    const updates = arr.filter((c) => c.action === 'UPDATE').length;
    const deletes = arr.filter((c) => c.action === 'DELETE').length;
    const creates = arr.filter((c) => c.action === 'CREATE').length;
    return { total, updates, deletes, creates };
  }, [arr]);

  const exportColumns = [
    { key: 'createdAt' as const, header: 'Tarih' },
    { key: 'user' as const, header: 'Kullanıcı' },
    { key: 'model' as const, header: 'Model' },
    { key: 'action' as const, header: 'Action' },
    { key: 'reason' as const, header: 'Sebep' },
  ];

  const handlePrint = () => {
    const rows = arr
      .map(
        (r) =>
          `<tr><td>${new Date(r.createdAt).toLocaleString('tr-TR')}</td><td>${r.user?.fullName ?? '-'}</td><td>${r.model}</td><td>${r.action}</td><td>${r.reason ?? ''}</td></tr>`,
      )
      .join('');
    const html = `<h2>Değişiklik Raporu</h2><table border="1" cellpadding="6" cellspacing="0"><thead><tr><th>Tarih</th><th>Kullanıcı</th><th>Model</th><th>Action</th><th>Sebep</th></tr></thead><tbody>${rows}</tbody></table>`;
    printHtml('Değişiklik Raporu', html);
  };

  return (
    <div className="-mx-6 -my-6 min-h-[calc(100vh-3.5rem)] bg-gray-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-slate-50">
              <History className="h-6 w-6 text-blue-600" />
              Değişiklik Raporu
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              Audit log — tüm CRUD işlemleri ve kullanıcı hareketleri
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={() =>
                exportToExcel('degisiklik', arr as never, exportColumns as never)
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={() => exportToCSV('degisiklik', arr as never)}
            >
              <FileDown className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Yazdır
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={handlePrint}
            >
              <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.total.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Toplam Hareket</div>
              <div className="mt-2 text-xs text-blue-600">Tüm aksiyonlar</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                  <Edit3 className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.updates.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">UPDATE</div>
              <div className="mt-2 text-xs text-amber-600">Düzeltme / Değişiklik</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/40">
                  <Trash2 className="h-5 w-5 text-rose-600" />
                </div>
              </div>
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.deletes.toLocaleString('tr-TR')}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">DELETE</div>
              <div className="mt-2 text-xs text-rose-600">Silme işlemi</div>
            </CardContent>
          </Card>
        </div>

        {/* FILTER */}
        <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-gray-200 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
              <Filter className="h-4 w-4 text-blue-600" />
              Filtreler
            </CardTitle>
            <CardDescription>Model, aksiyon ve tarih filtresi</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Receipt, User..."
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label>Action</Label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-white"
                >
                  <option value="">Tümü</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                  <option value="READ">READ</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Başlangıç</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label>Bitiş</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-gray-50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TABLE */}
        <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-gray-200 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
              <History className="h-4 w-4 text-blue-600" />
              Audit Trail
            </CardTitle>
            <CardDescription>{stats.total} kayıt listeleniyor</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 w-full animate-pulse rounded bg-gray-100 dark:bg-slate-800"
                  />
                ))}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-900">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Tarih
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Kullanıcı
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Model
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                      Sebep
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {arr.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-sm text-gray-400"
                      >
                        Filtreye uyan kayıt yok
                      </td>
                    </tr>
                  ) : (
                    arr.map((r) => {
                      const meta = ACTION_META[r.action] ?? {
                        label: r.action,
                        classes: 'bg-gray-100 text-gray-700',
                        icon: AlertCircle,
                      };
                      const Icon = meta.icon;
                      return (
                        <tr
                          key={r.id}
                          className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-slate-400">
                            {formatDateTime(r.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-[10px] font-bold text-white">
                                {(r.user?.fullName ?? '?')
                                  .split(' ')
                                  .map((s) => s[0])
                                  .slice(0, 2)
                                  .join('')
                                  .toUpperCase()}
                              </div>
                              <span className="text-sm text-gray-700 dark:text-slate-300">
                                {r.user?.fullName ?? 'Sistem'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-3 w-3 text-gray-400" />
                              <span className="font-mono text-xs font-semibold text-gray-900 dark:text-slate-100">
                                {r.model}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.classes}`}
                            >
                              <Icon className="h-3 w-3" />
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                            {r.reason ?? '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
