import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency } from '@/lib/format';
import { CurrencyCode } from '@doviz/shared';

interface MonitorItem {
  drawerId: string;
  code: string;
  name: string;
  status: string;
  userName: string | null;
  balances: Array<{ currencyCode: string; foreignBalance: number; tryBalance: number }>;
}

export function VezneMonitorPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.defaultBranchId);
  const { data: items = [] } = useQuery({
    queryKey: ['vezne-monitor', branchId],
    queryFn: () => api.get('/vezne/monitor', { params: { branchId } }).then((r) => r.data),
    enabled: !!branchId,
    refetchInterval: 10_000,
  });

  return (
    <div>
      <PageHeader title={t('vezne.monitor')} description="Canli vezne durumu" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(items as MonitorItem[]).map((it) => (
          <Card key={it.drawerId}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {it.name}
                <Badge variant={it.status === 'OPEN' ? 'success' : 'outline'}>{it.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground">Kullanici: {it.userName ?? '-'}</div>
              {it.balances.length === 0 ? (
                <p className="text-sm text-muted-foreground">Hareket yok</p>
              ) : (
                it.balances.map((b) => (
                  <div key={b.currencyCode} className="flex justify-between text-sm border-b pb-1">
                    <span className="font-semibold">{b.currencyCode}</span>
                    <span>
                      Yab: {b.foreignBalance.toFixed(2)} - TL:{' '}
                      {formatCurrency(b.tryBalance, CurrencyCode.TRY, 'tr')}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}