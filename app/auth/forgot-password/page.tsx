import { Mail } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export const metadata = {
  title: 'Şifremi Unuttum — ISTBAKU',
  description: 'E-postanı gir, sıfırlama linkini gönderelim.',
};

/**
 * MH-33: Server component shell — form interactivity is the client island only.
 */
export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 ai-hero-bg -z-10" />
      <Card className="w-full max-w-md">
        <CardBody className="p-6 md:p-8">
          <div className="text-center">
            <Badge variant="ai"><Mail size={11} aria-hidden="true" /> Şifre Sıfırlama</Badge>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">Şifremi unuttum</h1>
            <p className="text-sm text-[color:var(--fg-muted)] mt-1">
              E-postanı gir, sıfırlama linkini gönderelim.
            </p>
          </div>
          <ForgotPasswordForm />
        </CardBody>
      </Card>
    </div>
  );
}
