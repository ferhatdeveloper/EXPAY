import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Wrench,
  Phone,
  Briefcase,
  Key,
  FileText,
  Database,
  Settings,
  Plus,
  Activity,
  ToggleLeft,
  ToggleRight,
  PlayCircle,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
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

type Tab = 'jobs' | 'phones' | 'permissions' | 'files' | 'backup' | 'format';

interface Phone {
  id: string;
  label: string;
  number: string;
}

interface Job {
  id: string;
  code: string;
  name: string;
  active: boolean;
  cron?: string;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  status?: 'OK' | 'FAIL' | 'IDLE';
}

interface PermissionTech {
  id: string;
  code: string;
  name: string;
  group: string;
  granted: boolean;
}

interface FileEntry {
  id: string;
  name: string;
  category: string;
  size: number;
  uploadedAt: string;
  uploadedBy?: string;
}

interface Backup {
  id: string;
  filename: string;
  createdAt: string;
  size: number;
  status: 'OK' | 'FAIL';
}

const TABS: { key: Tab; label: string; icon: typeof Wrench }[] = [
  { key: 'jobs', label: 'Jobs (Cron)', icon: Briefcase },
  { key: 'phones', label: 'Telefonlar', icon: Phone },
  { key: 'permissions', label: 'İzinler', icon: Key },
  { key: 'files', label: 'Dosyalar', icon: FileText },
  { key: 'backup', label: 'Yedekleme', icon: Database },
  { key: 'format', label: 'Format / Sıfırla', icon: Settings },
];

export function TechnicalPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('jobs');

  return (
    <div className="-mx-6 -my-6 min-h-[calc(100vh-3.5rem)] bg-gray-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* HEADER */}
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-slate-50">
            <Wrench className="h-6 w-6 text-blue-600" />
            Teknik İşlemler
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
            Sistem bakımı, cron jobs, telefon tanımları ve yedekleme yönetimi
          </p>
        </div>

        {/* TAB BAR */}
        <div className="border-b border-gray-200 dark:border-slate-800">
          <nav className="-mb-px flex flex-wrap gap-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* TAB CONTENT */}
        {tab === 'jobs' && <JobsTab />}
        {tab === 'phones' && <PhonesTab />}
        {tab === 'permissions' && <PermissionsTab />}
        {tab === 'files' && <FilesTab />}
        {tab === 'backup' && <BackupTab />}
        {tab === 'format' && <FormatTab />}
      </div>
    </div>
  );
}

// ============ JOBS ============
function JobsTab() {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm<{
    code: string;
    name: string;
    cron: string;
  }>();
  const { data: jobs = [] } = useQuery({
    queryKey: ['tech-jobs'],
    queryFn: () =>
      api
        .get('/technical/jobs')
        .then((r) => (Array.isArray(r.data) ? r.data : r.data?.items ?? [])),
  });
  const add = useMutation({
    mutationFn: (data: { code: string; name: string; cron: string }) =>
      api.post('/technical/jobs', data).then((r) => r.data),
    onSuccess: () => {
      toast.success('İş tanımı eklendi');
      queryClient.invalidateQueries({ queryKey: ['tech-jobs'] });
      reset();
    },
  });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.put(`/technical/jobs/${id}`, { active }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tech-jobs'] }),
  });
  const run = useMutation({
    mutationFn: (id: string) =>
      api.post(`/technical/jobs/${id}/run`).then((r) => r.data),
    onSuccess: () => toast.success('Job tetiklendi'),
  });

  return (
    <div className="space-y-6">
      <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="border-b border-gray-200 dark:border-slate-800">
          <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
            <Plus className="h-4 w-4 text-blue-600" /> Yeni İş Tanımı
          </CardTitle>
          <CardDescription>Periyodik çalışacak cron job'lar</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form
            onSubmit={handleSubmit((data) => add.mutate(data))}
            className="grid grid-cols-1 gap-3 md:grid-cols-3"
          >
            <div className="space-y-1.5">
              <Label>Kod</Label>
              <Input
                placeholder="DAILY_CLOSE"
                className="bg-gray-50"
                {...register('code', { required: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>İsim</Label>
              <Input
                placeholder="Günlük Kasa Kapatma"
                className="bg-gray-50"
                {...register('name', { required: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cron İfadesi</Label>
              <Input
                placeholder="0 23 * * *"
                className="bg-gray-50 font-mono"
                {...register('cron', { required: true })}
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button
                type="submit"
                disabled={add.isPending}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" /> İş Ekle
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="border-b border-gray-200 dark:border-slate-800">
          <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
            <Briefcase className="h-4 w-4 text-blue-600" /> İş Tanımları
          </CardTitle>
          <CardDescription>{(jobs as Job[]).length} iş listeleniyor</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-900">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                  Kod
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                  İsim
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                  Cron
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                  Son
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-slate-400">
                  Aktif
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-400">
                  İşlem
                </th>
              </tr>
            </thead>
            <tbody>
              {(jobs as Job[]).length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    Henüz iş tanımı yok
                  </td>
                </tr>
              ) : (
                (jobs as Job[]).map((j) => (
                  <tr
                    key={j.id}
                    className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900 dark:text-slate-100">
                      {j.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                      {j.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-slate-400">
                      {j.cron ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {j.lastRunAt
                        ? new Date(j.lastRunAt).toLocaleString('tr-TR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggle.mutate({ id: j.id, active: !j.active })}
                        className={cn(
                          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                          j.active
                            ? 'bg-emerald-500'
                            : 'bg-gray-300 dark:bg-slate-700',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                            j.active ? 'translate-x-4' : 'translate-x-0.5',
                          )}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600"
                        onClick={() => run.mutate(j.id)}
                      >
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ============ PHONES ============
function PhonesTab() {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm<{ label: string; number: string }>();
  const { data: phones = [] } = useQuery({
    queryKey: ['tech-phones'],
    queryFn: () =>
      api
        .get('/technical/phones')
        .then((r) => (Array.isArray(r.data) ? r.data : r.data?.items ?? [])),
  });
  const add = useMutation({
    mutationFn: (data: { label: string; number: string }) =>
      api.post('/technical/phones', data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Telefon eklendi');
      queryClient.invalidateQueries({ queryKey: ['tech-phones'] });
      reset();
    },
  });
  const del = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/technical/phones/${id}`).then((r) => r.data),
    onSuccess: () => {
      toast.success('Silindi');
      queryClient.invalidateQueries({ queryKey: ['tech-phones'] });
    },
  });

  return (
    <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="border-b border-gray-200 dark:border-slate-800">
        <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
          <Plus className="h-4 w-4 text-blue-600" /> Telefon Tanımları
        </CardTitle>
        <CardDescription>Acil durum ve dahili numaralar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <form
          onSubmit={handleSubmit((data) => add.mutate(data))}
          className="grid grid-cols-1 gap-3 md:grid-cols-3"
        >
          <div className="space-y-1.5">
            <Label>Etiket</Label>
            <Input
              placeholder="Polis"
              className="bg-gray-50"
              {...register('label', { required: true })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Numara</Label>
            <Input
              placeholder="155"
              className="bg-gray-50"
              {...register('number', { required: true })}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              disabled={add.isPending}
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" /> Ekle
            </Button>
          </div>
        </form>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-800">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-800">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Etiket
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Numara
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                  İşlem
                </th>
              </tr>
            </thead>
            <tbody>
              {(phones as Phone[]).length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    Henüz telefon tanımı yok
                  </td>
                </tr>
              ) : (
                (phones as Phone[]).map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-slate-100">
                      {p.label}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-700 dark:text-slate-300">
                      {p.number}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-600"
                        onClick={() => del.mutate(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ PERMISSIONS ============
function PermissionsTab() {
  const { data: perms = [] } = useQuery({
    queryKey: ['tech-permissions'],
    queryFn: () =>
      api
        .get('/permissions')
        .then((r) => (Array.isArray(r.data) ? r.data : r.data?.items ?? [])),
  });

  const grouped = ((perms as PermissionTech[]) ?? []).reduce<
    Record<string, PermissionTech[]>
  >((acc, p) => {
    (acc[p.group] ??= []).push(p);
    return acc;
  }, {});

  return (
    <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="border-b border-gray-200 dark:border-slate-800">
        <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
          <Key className="h-4 w-4 text-blue-600" /> Sistem İzinleri
        </CardTitle>
        <CardDescription>Tüm permission code'ları ve grupları</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {Object.entries(grouped).length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Henüz izin tanımı yok</p>
        ) : (
          Object.entries(grouped).map(([group, list]) => (
            <div
              key={group}
              className="rounded-lg border border-gray-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
                <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {group}
                </span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {list.length} izin
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2 lg:grid-cols-3">
                {list.map((p) => (
                  <div
                    key={p.code}
                    className="rounded-md border border-gray-200 px-3 py-2 dark:border-slate-800"
                  >
                    <div className="font-mono text-xs font-semibold text-gray-900 dark:text-slate-100">
                      {p.code}
                    </div>
                    {p.name && (
                      <div className="text-[10px] text-gray-500">{p.name}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ============ FILES ============
function FilesTab() {
  const [search, setSearch] = useState('');
  const { data: files = [] } = useQuery({
    queryKey: ['tech-files'],
    queryFn: () =>
      api
        .get('/technical/files')
        .then((r) => (Array.isArray(r.data) ? r.data : r.data?.items ?? [])),
  });

  const filtered = (files as FileEntry[]).filter((f) =>
    search ? f.name.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="border-b border-gray-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
              <FileText className="h-4 w-4 text-blue-600" /> Dosyalar
            </CardTitle>
            <CardDescription>{filtered.length} dosya listeleniyor</CardDescription>
          </div>
          <Input
            placeholder="Dosya ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-64 bg-gray-50"
          />
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-900">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                Dosya
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                Kategori
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-400">
                Boyut
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                Tarih
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-sm text-gray-400"
                >
                  Dosya bulunamadı
                </td>
              </tr>
            ) : (
              filtered.map((f) => (
                <tr
                  key={f.id}
                  className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900 dark:text-slate-100">
                    {f.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {f.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-gray-600 dark:text-slate-400">
                    {(f.size / 1024).toFixed(1)} KB
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-slate-400">
                    {new Date(f.uploadedAt).toLocaleString('tr-TR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ============ BACKUP ============
function BackupTab() {
  const queryClient = useQueryClient();
  const { data: backups = [] } = useQuery({
    queryKey: ['tech-backups'],
    queryFn: () =>
      api
        .get('/technical/backups')
        .then((r) => (Array.isArray(r.data) ? r.data : r.data?.items ?? [])),
  });
  const take = useMutation({
    mutationFn: () => api.post('/technical/backups').then((r) => r.data),
    onSuccess: () => {
      toast.success('Yedekleme başlatıldı');
      queryClient.invalidateQueries({ queryKey: ['tech-backups'] });
    },
  });

  return (
    <Card className="border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="border-b border-gray-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-50">
              <Database className="h-4 w-4 text-blue-600" /> Yedekleme Kayıtları
            </CardTitle>
            <CardDescription>
              {(backups as Backup[]).length} yedek listeleniyor
            </CardDescription>
          </div>
          <Button
            onClick={() => take.mutate()}
            disabled={take.isPending}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Database className="mr-2 h-4 w-4" /> Şimdi Yedekle
          </Button>
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-900">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                Dosya
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-400">
                Tarih
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-400">
                Boyut
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-slate-400">
                Durum
              </th>
            </tr>
          </thead>
          <tbody>
            {(backups as Backup[]).length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-sm text-gray-400"
                >
                  Henüz yedek yok
                </td>
              </tr>
            ) : (
              (backups as Backup[]).map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900 dark:text-slate-100">
                    {b.filename}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-slate-400">
                    {new Date(b.createdAt).toLocaleString('tr-TR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-gray-600 dark:text-slate-400">
                    {(b.size / 1024 / 1024).toFixed(2)} MB
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                        b.status === 'OK'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
                      )}
                    >
                      {b.status === 'OK' ? 'OK' : 'Hata'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ============ FORMAT ============
function FormatTab() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-amber-900 dark:text-amber-200">
            <Activity className="h-4 w-4" /> Cache Temizle
          </CardTitle>
          <CardDescription className="text-amber-800 dark:text-amber-300">
            Uygulama cache, rate cache ve session'lar temizlenir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="bg-white text-amber-900 hover:bg-amber-100"
            onClick={() => toast.info('Cache temizleme isteği gönderildi')}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Cache Temizle
          </Button>
        </CardContent>
      </Card>
      <Card className="border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-rose-900 dark:text-rose-200">
            <Settings className="h-4 w-4" /> Sıfırla
          </CardTitle>
          <CardDescription className="text-rose-800 dark:text-rose-300">
            <strong>Tehlikeli işlem:</strong> Tüm demo verileri silinir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="border-rose-300 bg-white text-rose-700 hover:bg-rose-100"
            onClick={() =>
              toast.error('Demo veriler sıfırlanıyor - onay gerekli', {
                description: 'Bu işlem geri alınamaz',
              })
            }
          >
            <Trash2 className="mr-2 h-4 w-4" /> Demo Verileri Sıfırla
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

void ToggleLeft;
void ToggleRight;
