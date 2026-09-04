import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

const schema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      setSession(res.data.user, res.data.accessToken, res.data.refreshToken);
      navigate('/');
    } catch {
      toast.error(t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('auth.welcome')} - Doviz Burosu</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('auth.username')}</Label>
              <Input {...register('username')} autoComplete="username" />
              {errors.username && <p className="text-destructive text-xs">{String(errors.username.message)}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('auth.password')}</Label>
              <Input type="password" {...register('password')} autoComplete="current-password" />
              {errors.password && <p className="text-destructive text-xs">{String(errors.password.message)}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {t('auth.login')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}