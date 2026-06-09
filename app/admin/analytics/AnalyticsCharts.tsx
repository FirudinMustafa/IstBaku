'use client';

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, Legend,
} from 'recharts';
import { Search } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { useLang } from '@/components/layout/LangProvider';

interface Props {
  visits: { d: string; dau: number; sessions: number }[];
  engagement: { topicKey: string; a: number }[];
  queries: { q: string; c: number }[];
}

export function AnalyticsCharts({ visits, engagement, queries }: Props) {
  const { t } = useLang();
  const engagementData = engagement.map((e) => ({ topic: t(e.topicKey), a: e.a }));
  const queryData = queries.length > 0 ? queries : [{ q: t('admin.analytics.noSearch'), c: 0 }];
  return (
    <>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardBody>
            <h3 className="font-semibold mb-3">{t('admin.analytics.chart.dauSessions')}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={visits}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="d" stroke="var(--fg-muted)" fontSize={11} />
                  <YAxis stroke="var(--fg-muted)" fontSize={11} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Legend />
                  <Line type="monotone" dataKey="dau" stroke="#CAAE99" strokeWidth={2} dot={false} name={t('admin.analytics.chart.newUser')} />
                  <Line type="monotone" dataKey="sessions" stroke="#34619a" strokeWidth={2} dot={false} name={t('admin.analytics.chart.session')} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="font-semibold mb-3">{t('admin.analytics.chart.featureUsage')}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={engagementData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="topic" tick={{ fontSize: 10, fill: 'var(--fg-muted)' }} />
                  <PolarRadiusAxis stroke="var(--border)" tick={{ fontSize: 9 }} />
                  <Radar dataKey="a" stroke="#CAAE99" fill="#CAAE99" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <h3 className="font-semibold mb-3 inline-flex items-center gap-2"><Search size={15} className="text-gold-300" /> {t('admin.analytics.chart.popularSearches')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={queryData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis type="number" stroke="var(--fg-muted)" fontSize={11} />
                <YAxis type="category" dataKey="q" stroke="var(--fg-muted)" fontSize={11} width={120} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="c" fill="#CAAE99" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
