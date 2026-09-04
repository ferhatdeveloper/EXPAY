import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

export function TechnicalPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'phones' | 'jobs' | 'backups' | 'settings'>('phones');

  const { data: phones = [] } = useQuery({ queryKey: ['tech-phones'], queryFn: () => api.get('/technical/phones').then((r) => r.data) });
  const { data: jobs = [] } = useQuery({ queryKey: ['tech-jobs'], queryFn: () => api.get('/technical/jobs').then((r) => r.data) });
  const { data: backups = [] } = useQuery({ queryKey: ['tech-backups'], queryFn: () => api.get('/technical/backups').then((r) => r.data) });
  const { data: settings = [] } = useQuery({ queryKey: ['tech-settings'], queryFn: () => api.get('/technical/settings').then((r) => r.data) });

  const { register, handleSubmit, reset } = useForm<{ label: string; number: string }>({});
  const addPhone = useMutation({
    mutationFn: (data: { label: string; number: string }) => api.post('/technical/phones', data).then((r) => r.data),
    onSuccess: () => {
      toast.success(t('common.success'));
      queryClient.invalidateQueries({ queryKey: ['tech-phones'] });
      reset();
    },
  });

  return (
    <div>
      <PageHeader title={t('teknik.title')} />
      <div className="flex gap-2 mb-4">
        <Button variant={tab === 'phones' ? 'default' : 'outline'} onClick={() => setTab('phones')}>{t('teknik.phone')}</Button>
        <Button variant={tab === 'jobs' ? 'default' : 'outline'} onClick={() => setTab('jobs')}>{t('teknik.jobDefinition')}</Button>
        <Button variant={tab === 'backups' ? 'default' : 'outline'} onClick={() => setTab('backups')}>{t('teknik.backup')}</Button>
        <Button variant={tab === 'settings' ? 'default' : 'outline'} onClick={() => setTab('settings')}>{t('teknik.general')}</Button>
      </div>

      {tab === 'phones' && (
        <Card>
          <CardHeader><CardTitle>Telefon Tanimlari</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit((data) => addPhone.mutate(data))} className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label>Etiket</Label>
                <Input {...register('label', { required: true })} />
              </div>
              <div className="flex-1 space-y-1">
                <Label>Numara</Label>
                <Input {...register('number', { required: true })} />
              </div>
              <div className="self-end"><Button type="submit">Ekle</Button></div>
            </form>
            <div className="space-y-1">
              {phones.map((p: { id: string; label: string; number: string }) => (
                <div key={p.id} className="flex justify-between border-b py-1 text-sm">
                  <span>{p.label}</span>
                  <span>{p.number}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'jobs' && (
        <Card>
          <CardHeader><CardTitle>Ise Baslama Tanimlari</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {jobs.map((j: { id: string; code: string; name: string; active: boolean; cron?: string }) => (
              <div key={j.id} className="flex justify-between items-center border-b py-1 text-sm">
                <span>{j.code} - {j.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{j.cron ?? '-'}</span>
                  <Badge variant={j.active ? 'success' : 'outline'}>{j.active ? 'Aktif' : 'Pasif'}</Badge>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tab === 'backups' && (
        <Card>
          <CardHeader><CardTitle>Yedekleme Kayitlari</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {backups.map((b: { id: string; filename: string; createdAt: string; size: string | number }) => (
              <div key={b.id} className="flex justify-between border-b py-1 text-sm">
                <span>{b.filename}</span>
                <span>{new Date(b.createdAt).toLocaleString()} - {Number(b.size) / 1024 / 1024} MB</span>
              </div>
            ))}
            {backups.length === 0 && <p className="text-sm text-muted-foreground">Henuz yedek yok</p>}
          </CardContent>
        </Card>
      )}

      {tab === 'settings' && (
        <Card>
          <CardHeader><CardTitle>Genel Ayarlar</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {settings.map((s: { key: string; value: unknown }) => (
              <div key={s.key} className="flex justify-between border-b py-1 text-sm">
                <span className="font-semibold">{s.key}</span>
                <span>{JSON.stringify(s.value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}