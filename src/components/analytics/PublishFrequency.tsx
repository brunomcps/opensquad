import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useContentStore } from '../../store/useContentStore';

const wrapper: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '18px 22px',
  boxShadow: 'var(--shadow-sm)',
};

const title: CSSProperties = {
  fontSize: '15px',
  fontWeight: 700,
  color: 'var(--text-primary)',
  marginBottom: '14px',
  fontFamily: 'var(--font)',
};

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function PublishFrequency() {
  const videos = useContentStore((s) => s.youtubeVideos);
  const tiktokVideos = useContentStore((s) => s.tiktokVideos);
  const instagramPosts = useContentStore((s) => s.instagramPosts);

  const data = useMemo(() => {
    const map: Record<string, { month: string; ytCount: number; ttCount: number; igCount: number }> = {};

    for (const v of videos) {
      if (v.privacyStatus !== 'public') continue;
      const d = new Date(v.publishedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
      if (!map[key]) map[key] = { month: label, ytCount: 0, ttCount: 0, igCount: 0 };
      map[key].ytCount++;
    }

    for (const v of tiktokVideos) {
      if (v.viewCount === 0 && v.likeCount === 0) continue;
      const d = new Date(v.createTime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
      if (!map[key]) map[key] = { month: label, ytCount: 0, ttCount: 0, igCount: 0 };
      map[key].ttCount++;
    }

    for (const p of instagramPosts) {
      const d = new Date(p.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
      if (!map[key]) map[key] = { month: label, ytCount: 0, ttCount: 0, igCount: 0 };
      map[key].igCount++;
    }

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, val]) => val);
  }, [videos, tiktokVideos, instagramPosts]);

  return (
    <div style={wrapper}>
      <div style={title}>Frequencia de publicacao</div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data}>
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#999990' }} />
          <YAxis
            yAxisId="count"
            tick={{ fontSize: 11, fill: '#999990' }}
            label={{ value: 'Videos', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#999990' } }}
          />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #E8E5DD', borderRadius: 8, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
            labelStyle={{ color: '#1A1A1A', fontWeight: 600 }}
            formatter={(value: number, name: string) => [
              name === 'avgViews' ? value.toLocaleString('pt-BR') : value,
              name === 'count' ? 'Videos publicados' : 'Views media/video',
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="count" dataKey="ytCount" name="YouTube" fill="var(--accent-gold)" radius={[4, 4, 0, 0]} stackId="count" />
          <Bar yAxisId="count" dataKey="ttCount" name="TikTok" fill="#00C4BD" radius={[4, 4, 0, 0]} stackId="count" />
          <Bar yAxisId="count" dataKey="igCount" name="Instagram" fill="#E1306C" radius={[4, 4, 0, 0]} stackId="count" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
