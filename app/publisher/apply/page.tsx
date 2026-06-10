import { ApplyClient } from './ApplyClient';

export const dynamic = 'force-dynamic';

// Veri (rol/başvuru durumu) istemcide çekilir (Server Action'ı SSR'da çağırmaktan
// kaçınılır — prod build'de hooks/#310 sorununa yol açıyordu).
export default function PublisherApplyPage() {
  return <ApplyClient />;
}
