import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { getCurrentAdmin, signOutAndRedirect } from '@/lib/auth-actions';
import { headers } from 'next/headers';
import { AdminShell } from './AdminShell';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  const pathname = h.get('x-pathname') ?? ''; // middleware'den
  const isLogin = pathname === '/admin/login';

  const admin = await getCurrentAdmin();

  if (isLogin) return <>{children}</>;

  if (!admin) redirect('/admin/login');

  async function logoutAction() {
    'use server';
    await signOutAndRedirect('/admin/login');
  }

  return (
    <AdminShell admin={admin} logoutAction={logoutAction}>
      {children}
    </AdminShell>
  );
}
