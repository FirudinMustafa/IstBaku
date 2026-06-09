import { Phone, Mail, Clock, Instagram, Send } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { T } from '@/components/i18n/T';
import { localizedMetadata } from '@/lib/metadata-i18n';

export async function generateMetadata() {
  return localizedMetadata('meta.contact.title', 'meta.contact.desc');
}

const PHONES = [
  { label: '+90 552 814 24 17', href: 'tel:+905528142417' },
  { label: '+994 50 363 16 36', href: 'tel:+994503631636' },
];
const EMAIL = 'istbaku2025@gmail.com';

export default function ContactPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] px-4 py-12 sm:py-16">
      <div className="absolute inset-0 ai-hero-bg -z-10" />
      <div className="mx-auto w-full max-w-3xl">
        <div className="text-center">
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight">
            <T k="contact.title" />
          </h1>
          <p className="mt-3 text-[color:var(--fg-muted)]">
            <T k="contact.subtitle" />
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {/* Telefon */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-2 text-gold-300">
                <Phone size={18} aria-hidden="true" />
                <h2 className="font-semibold"><T k="contact.phone" /></h2>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {PHONES.map((p) => (
                  <li key={p.href}>
                    <a href={p.href} className="hover:text-gold-300" dir="ltr">{p.label}</a>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          {/* E-posta */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-2 text-gold-300">
                <Mail size={18} aria-hidden="true" />
                <h2 className="font-semibold"><T k="contact.email" /></h2>
              </div>
              <a href={`mailto:${EMAIL}`} className="mt-3 inline-block text-sm hover:text-gold-300">{EMAIL}</a>
              <div className="mt-4">
                <a href={`mailto:${EMAIL}`}>
                  <Button variant="gold" size="md" className="gap-2">
                    <Send size={14} /> <T k="contact.cta" />
                  </Button>
                </a>
              </div>
            </CardBody>
          </Card>

          {/* Çalışma saatleri */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-2 text-gold-300">
                <Clock size={18} aria-hidden="true" />
                <h2 className="font-semibold"><T k="contact.hours" /></h2>
              </div>
              <p className="mt-3 text-sm text-[color:var(--fg-muted)]"><T k="contact.hoursValue" /></p>
            </CardBody>
          </Card>

          {/* Sosyal medya */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-2 text-gold-300">
                <Instagram size={18} aria-hidden="true" />
                <h2 className="font-semibold"><T k="contact.social" /></h2>
              </div>
              <a
                href="https://instagram.com/istbakucom"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm hover:text-gold-300"
              >
                @istbakucom
              </a>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
