import type { Notification } from '../types';

export const NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    type: 'match',
    title: 'Senin için 3 yeni eşleşme bulundu',
    body: 'Bakı Səbail bölgesinde kayıtlı aramana uygun yeni ilanlar.',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    read: false,
    link: '/dashboard?tab=matches',
  },
  {
    id: 'n2',
    type: 'price_drop',
    title: 'Favorindeki ilanın fiyatı düştü',
    body: 'Bodrum Yalıkavak villasının fiyatı $1,950,000 → $1,850,000.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    read: false,
    link: '/property/bodrum-yalikavak-villa',
  },
  {
    id: 'n3',
    type: 'message',
    title: 'Elnur Hüseynov sana mesaj attı',
    body: 'Penthouse görüntüleme randevusu için müsait misin?',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    read: true,
    link: '/dashboard',
  },
  {
    id: 'n4',
    type: 'system',
    title: 'Profilini tamamla, gizli portföyü aç',
    body: 'KYC adımını tamamlayarak doğrulanmış yatırımcı statüsü kazan.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    read: true,
    link: '/private-portfolio',
  },
];
