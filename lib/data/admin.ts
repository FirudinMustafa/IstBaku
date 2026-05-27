// Mock admin verileri

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'user' | 'agent' | 'admin';
  country: 'TR' | 'AZ' | 'OTHER';
  status: 'active' | 'suspended' | 'pending';
  kyc: 'none' | 'pending' | 'approved' | 'rejected';
  premium: boolean;
  joinedAt: string;
  lastSeen: string;
}

export const ADMIN_USERS: AdminUser[] = [
  { id: 'u1', name: 'Firudin Mustafayev', email: 'firudinmustafayev00@gmail.com', avatar: 'https://i.pravatar.cc/200?img=14', role: 'user', country: 'AZ', status: 'active', kyc: 'approved', premium: true, joinedAt: '2025-09-01', lastSeen: new Date(Date.now() - 1e6).toISOString() },
  { id: 'u2', name: 'Murat Kaya', email: 'murat@example.com', avatar: 'https://i.pravatar.cc/200?img=15', role: 'user', country: 'TR', status: 'active', kyc: 'pending', premium: false, joinedAt: '2026-01-12', lastSeen: new Date(Date.now() - 8e6).toISOString() },
  { id: 'u3', name: 'Elnur Hüseynov', email: 'elnur@istbaku.com', avatar: 'https://i.pravatar.cc/200?img=33', role: 'agent', country: 'AZ', status: 'active', kyc: 'approved', premium: true, joinedAt: '2025-06-20', lastSeen: new Date(Date.now() - 4e5).toISOString() },
  { id: 'u4', name: 'Ayşe Demir', email: 'ayse@istbaku.com', avatar: 'https://i.pravatar.cc/200?img=47', role: 'agent', country: 'TR', status: 'active', kyc: 'approved', premium: true, joinedAt: '2025-07-10', lastSeen: new Date(Date.now() - 6e5).toISOString() },
  { id: 'u5', name: 'Anna Sokolova', email: 'anna@example.com', avatar: 'https://i.pravatar.cc/200?img=48', role: 'user', country: 'OTHER', status: 'active', kyc: 'approved', premium: true, joinedAt: '2025-11-05', lastSeen: new Date(Date.now() - 2e6).toISOString() },
  { id: 'u6', name: 'Hasan Yıldız', email: 'hasan@example.com', avatar: 'https://i.pravatar.cc/200?img=16', role: 'user', country: 'TR', status: 'suspended', kyc: 'rejected', premium: false, joinedAt: '2025-12-15', lastSeen: new Date(Date.now() - 9e7).toISOString() },
  { id: 'u7', name: 'Leyla Məmmədova', email: 'leyla@istbaku.com', avatar: 'https://i.pravatar.cc/200?img=49', role: 'agent', country: 'AZ', status: 'active', kyc: 'approved', premium: true, joinedAt: '2025-05-01', lastSeen: new Date(Date.now() - 2e5).toISOString() },
  { id: 'u8', name: 'Tural İsmayılov', email: 'tural@example.com', avatar: 'https://i.pravatar.cc/200?img=51', role: 'user', country: 'AZ', status: 'pending', kyc: 'pending', premium: false, joinedAt: '2026-05-10', lastSeen: new Date(Date.now() - 1.5e5).toISOString() },
];

export interface ApprovalQueueItem {
  id: string;
  propertyId: string;
  submittedBy: string; // agent name
  submittedAt: string;
  type: 'new_listing' | 'price_change' | 'photo_update' | 'tier_upgrade';
  aiQualityScore: number;
  aiFlags: string[]; // e.g. 'duplicate-suspect', 'low-quality-photos'
  status: 'pending' | 'approved' | 'rejected';
}

export const APPROVAL_QUEUE: ApprovalQueueItem[] = [
  { id: 'q1', propertyId: 'p2', submittedBy: 'Leyla Məmmədova', submittedAt: new Date(Date.now() - 6e5).toISOString(), type: 'tier_upgrade', aiQualityScore: 96, aiFlags: [], status: 'pending' },
  { id: 'q2', propertyId: 'p8', submittedBy: 'Elnur Hüseynov', submittedAt: new Date(Date.now() - 2e6).toISOString(), type: 'new_listing', aiQualityScore: 78, aiFlags: ['low-quality-photos'], status: 'pending' },
  { id: 'q3', propertyId: 'p11', submittedBy: 'Mehmet Yılmaz', submittedAt: new Date(Date.now() - 5e6).toISOString(), type: 'new_listing', aiQualityScore: 65, aiFlags: ['duplicate-suspect', 'price-outlier'], status: 'pending' },
  { id: 'q4', propertyId: 'p12', submittedBy: 'Leyla Məmmədova', submittedAt: new Date(Date.now() - 9e6).toISOString(), type: 'price_change', aiQualityScore: 88, aiFlags: [], status: 'pending' },
  { id: 'q5', propertyId: 'p4', submittedBy: 'Can Aksoy', submittedAt: new Date(Date.now() - 12e6).toISOString(), type: 'new_listing', aiQualityScore: 82, aiFlags: [], status: 'pending' },
];

export interface KYCRequest {
  id: string;
  userId: string;
  type: 'investor' | 'agent_license' | 'title_deed';
  submittedAt: string;
  documents: { name: string; url: string }[];
  status: 'pending' | 'approved' | 'rejected';
  aiCheck: { score: number; notes: string };
}

export const KYC_REQUESTS: KYCRequest[] = [
  { id: 'k1', userId: 'u2', type: 'investor', submittedAt: new Date(Date.now() - 2e6).toISOString(),
    documents: [{ name: 'Pasaport.pdf', url: '#' }, { name: 'Banka_dekontu.pdf', url: '#' }],
    status: 'pending', aiCheck: { score: 87, notes: 'OCR başarılı, isim eşleşmesi tamam.' } },
  { id: 'k2', userId: 'u8', type: 'investor', submittedAt: new Date(Date.now() - 1.5e5).toISOString(),
    documents: [{ name: 'Sehsiyyət_vesiqesi.pdf', url: '#' }],
    status: 'pending', aiCheck: { score: 62, notes: 'Selfie eşleşmesi düşük güven, manuel inceleme önerilir.' } },
  { id: 'k3', userId: 'u3', type: 'agent_license', submittedAt: new Date(Date.now() - 30e6).toISOString(),
    documents: [{ name: 'Emlakçı_lisansı.pdf', url: '#' }, { name: 'Vergi_levhası.pdf', url: '#' }],
    status: 'pending', aiCheck: { score: 94, notes: 'Tüm belgeler okundu, MEB kayıt doğrulandı.' } },
];

export interface AbuseReport {
  id: string;
  reporterId: string;
  targetType: 'listing' | 'user' | 'message';
  targetId: string;
  reason: 'fake' | 'spam' | 'scam' | 'inappropriate' | 'duplicate' | 'wrong_info';
  details: string;
  createdAt: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  severity: 'low' | 'medium' | 'high';
}

export const ABUSE_REPORTS: AbuseReport[] = [
  { id: 'r1', reporterId: 'u2', targetType: 'listing', targetId: 'p11', reason: 'fake', details: 'Fotoğraflar başka bir ilandan alınmış görünüyor.', createdAt: new Date(Date.now() - 3e6).toISOString(), status: 'open', severity: 'high' },
  { id: 'r2', reporterId: 'u5', targetType: 'listing', targetId: 'p7', reason: 'wrong_info', details: 'Bina yaşı 5 yazıyor ama bina en az 15 yaşında.', createdAt: new Date(Date.now() - 8e6).toISOString(), status: 'reviewing', severity: 'medium' },
  { id: 'r3', reporterId: 'u1', targetType: 'message', targetId: 'msg-99', reason: 'spam', details: 'Aynı emlakçı sürekli aynı mesajı atıyor.', createdAt: new Date(Date.now() - 15e6).toISOString(), status: 'open', severity: 'low' },
  { id: 'r4', reporterId: 'u3', targetType: 'user', targetId: 'u6', reason: 'scam', details: 'Kullanıcı kapora istedi, ilan görülmedi.', createdAt: new Date(Date.now() - 20e6).toISOString(), status: 'open', severity: 'high' },
];

export interface PaymentRecord {
  id: string;
  userId: string;
  amount: number;
  currency: 'USD' | 'TRY' | 'AZN';
  type: 'tier_upgrade' | 'premium_membership' | 'report_purchase' | 'partner_commission';
  status: 'paid' | 'refunded' | 'failed';
  createdAt: string;
}

export const PAYMENTS: PaymentRecord[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `pay-${i + 1}`,
  userId: ADMIN_USERS[i % ADMIN_USERS.length].id,
  amount: [9, 29, 49, 199, 499][i % 5],
  currency: 'USD',
  type: (['tier_upgrade', 'premium_membership', 'report_purchase', 'partner_commission'] as const)[i % 4],
  status: i % 9 === 0 ? 'refunded' : 'paid',
  createdAt: new Date(Date.now() - i * 86400000 * 2).toISOString(),
}));

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
}

export const AUDIT_LOG: AuditLog[] = [
  { id: 'a1', actor: 'admin@istbaku.com', action: 'İlan onaylandı', target: 'p2 (Səbail Penthouse)', at: new Date(Date.now() - 3e5).toISOString() },
  { id: 'a2', actor: 'admin@istbaku.com', action: 'KYC reddedildi', target: 'u6 (Hasan Yıldız)', at: new Date(Date.now() - 9e6).toISOString() },
  { id: 'a3', actor: 'moderator@istbaku.com', action: 'Şikayet kapatıldı', target: 'r2', at: new Date(Date.now() - 12e6).toISOString() },
  { id: 'a4', actor: 'admin@istbaku.com', action: 'Kullanıcı askıya alındı', target: 'u6', at: new Date(Date.now() - 90e6).toISOString() },
  { id: 'a5', actor: 'system', action: 'AI duplikat tespiti', target: 'p11', at: new Date(Date.now() - 6e6).toISOString() },
];
