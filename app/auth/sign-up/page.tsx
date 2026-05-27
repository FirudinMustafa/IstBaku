import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SignUpForm } from './SignUpForm';

export const metadata = {
  title: 'Kayıt Ol — ISTBAKU',
  description: '2 dakikada hesap aç, AI eşleşmeye hemen başla.',
};

/**
 * MH-33: Server component shell — only the form interactivity lives in the client island.
 */
export default function SignUpPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-6 md:py-12 pb-24 md:pb-12">
      <div className="absolute inset-0 ai-hero-bg -z-10" />
      <Card className="w-full max-w-md">
        <CardBody className="p-6 md:p-8">
          <div className="text-center">
            <Badge variant="ai"><Sparkles size={11} aria-hidden="true" /> Yeni Hesap</Badge>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">ISTBAKU&apos;ya katıl</h1>
            <p className="text-sm text-[color:var(--fg-muted)] mt-1">2 dakikada hesap aç, AI eşleşmeye hemen başla.</p>
          </div>
          <SignUpForm />
        </CardBody>
      </Card>
    </div>
  );
}
