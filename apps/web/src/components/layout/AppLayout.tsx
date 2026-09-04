import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Menu, Moon, Sun, Globe, LogOut } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type Language } from '@doviz/shared';

const NAV: Array<{
  key: string;
  to?: string;
  items?: Array<{ key: string; to: string; permission?: string }>;
}> = [
  { key: 'dashboard', to: '/' },
  {
    key: 'vezne',
    items: [
      { key: 'receiptCreate', to: '/vezne/receipts/create', permission: 'vezne.receipt.create' },
      { key: 'receiptList', to: '/vezne/receipts', permission: 'vezne.list' },
      { key: 'transferCreate', to: '/vezne/transfer', permission: 'vezne.transfer.create' },
      { key: 'monitor', to: '/vezne/monitor', permission: 'vezne.monitor' },
      { key: 'banknoteCount', to: '/vezne/banknote', permission: 'vezne.banknoteCount' },
      { key: 'balanceReport', to: '/vezne/balance', permission: 'vezne.balanceReport' },
    ],
  },
  {
    key: 'kur',
    items: [
      { key: 'rawFree', to: '/rate/raw-free', permission: 'rate.rawFree' },
      { key: 'free', to: '/rate/free', permission: 'rate.free' },
      { key: 'old', to: '/rate/old', permission: 'rate.old' },
      { key: 'closing', to: '/rate/closing', permission: 'rate.closing' },
      { key: 'definition', to: '/rate/definition', permission: 'rate.definition' },
      { key: 'deviation', to: '/rate/deviation', permission: 'rateDeviation.report' },
    ],
  },
  {
    key: 'raporlar',
    items: [
      { key: 'receiptList', to: '/reports/receipt-list', permission: 'report.receiptList' },
      { key: 'dailyDetail', to: '/reports/daily-detail', permission: 'report.dailyDetail' },
      { key: 'profitability', to: '/reports/profitability', permission: 'report.profitability' },
      { key: 'personnel', to: '/reports/personnel', permission: 'report.personnel' },
      { key: 'cashLedger', to: '/reports/cash-ledger', permission: 'cash.ledger' },
      { key: 'changes', to: '/reports/changes', permission: 'change.report' },
    ],
  },
  {
    key: 'kasa',
    items: [
      { key: 'accountCreate', to: '/cash/accounts', permission: 'cash.accountNames' },
      { key: 'movementCreate', to: '/cash/movements', permission: 'cash.list' },
      { key: 'balance', to: '/cash/balances', permission: 'cash.balance' },
    ],
  },
  {
    key: 'cari',
    items: [
      { key: 'cardCreate', to: '/cari/customers', permission: 'customer.list' },
      { key: 'movementCreate', to: '/cari/movements', permission: 'customer.list' },
      { key: 'balance', to: '/cari/balances', permission: 'customer.balance' },
    ],
  },
  {
    key: 'sapma',
    items: [{ key: 'rateReport', to: '/rate/deviation', permission: 'rateDeviation.report' }],
  },
  {
    key: 'muhasebe',
    items: [
      { key: 'accountCreate', to: '/accounting/accounts', permission: 'accounting.account.correct' },
      { key: 'voucherCreate', to: '/accounting/vouchers', permission: 'accounting.voucher.correct' },
      { key: 'fiscalYear', to: '/accounting/fiscal-years', permission: 'accounting.fiscalYear' },
      { key: 'dayEnd', to: '/accounting/day-end', permission: 'manager.dayEnd' },
    ],
  },
  {
    key: 'yonetim',
    items: [{ key: 'dayEnd', to: '/accounting/day-end', permission: 'manager.dayEnd' }],
  },
  {
    key: 'teknik',
    to: '/teknik',
  },
  {
    key: 'admin',
    items: [
      { key: 'users', to: '/admin/users', permission: 'admin.users' },
      { key: 'roles', to: '/admin/roles', permission: 'admin.roles' },
      { key: 'branches', to: '/admin/branches', permission: 'admin.branches' },
    ],
  },
];

export function AppLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { sidebarOpen, toggleSidebar, theme, toggleTheme } = useUiStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="flex h-screen w-full">
      <aside
        className={cn(
          'border-r bg-card transition-all duration-200 overflow-y-auto',
          sidebarOpen ? 'w-72' : 'w-16',
        )}
      >
        <div className="flex items-center justify-between p-3 border-b">
          <div className={cn('font-bold text-lg', !sidebarOpen && 'hidden')}>Doviz Burosu</div>
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        <nav className="p-2 space-y-1">
          {NAV.map((group) => {
            if (group.to) {
              return (
                <NavLink
                  key={group.key}
                  to={group.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center px-3 py-2 rounded-md text-sm transition-colors',
                      isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                    )
                  }
                >
                  {t(`nav.${group.key}`)}
                </NavLink>
              );
            }
            const items = (group.items ?? []).filter(
              (i) => user.roleCode === 'ADMIN' || !i.permission || user.permissions.includes(i.permission),
            );
            if (items.length === 0) return null;
            return (
              <div key={group.key} className="space-y-1">
                <div className="px-3 py-1 text-xs uppercase text-muted-foreground tracking-wide">
                  {sidebarOpen ? t(`nav.${group.key}`) : ''}
                </div>
                {items.map((it) => (
                  <NavLink
                    key={it.key}
                    to={it.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center px-3 py-2 rounded-md text-sm transition-colors',
                        isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                      )
                    }
                  >
                    {t(`${group.key}.${it.key}`)}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b flex items-center justify-between px-4 bg-card">
          <div className="text-sm text-muted-foreground">{user.username} - {user.roleCode}</div>
          <div className="flex items-center gap-2">
            <select
              className="border rounded-md h-9 px-2 text-sm bg-background"
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map((l: Language) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </select>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { logout(); navigate('/login'); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6 bg-background">
          <Outlet />
        </div>
      </main>
    </div>
  );
}