import { useAuthStore } from '@/stores/auth-store';
import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

interface Props {
  permission?: string;
  children: ReactNode;
}

export function PermissionGuard({ permission, children }: Props) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.roleCode === 'ADMIN') return <>{ children }</>;
  if (permission && !user.permissions.includes(permission)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AuthGuard({ children }: { children: ReactNode }) {
  return <PermissionGuard>{children}</PermissionGuard>;
}