import { getAllCountryGuides } from '@/lib/admin-queries';
import { CountryGuidesClient } from './CountryGuidesClient';

export const dynamic = 'force-dynamic';

export default async function CountryGuidesAdmin() {
  const guides = await getAllCountryGuides();
  return (
    <CountryGuidesClient
      initial={guides.map((g) => ({
        iso: g.iso,
        name: g.name,
        flag: g.flag,
        description: g.description,
        pdfUrl: g.pdfUrl,
        pages: g.pages,
        language: g.language,
        updatedAt: g.updatedAt.toISOString().slice(0, 10),
      }))}
    />
  );
}
