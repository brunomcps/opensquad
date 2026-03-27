import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

export function ViewsByMonth() {
  const videos = useContentStore((s) => s.youtubeVideos);
  const tiktokVideos = useContentStore((s) => s.tiktokVideos);
  const instagramPosts = useContentStore((s) => s.instagramPosts);

  const data = useMemo(() => {
    const map: Record<string, { month: string; longViews: number; shortViews: number; tiktokViews: number; igLikes: number }> = {};

    for (const v of videos) {
      if (v.privacyStatus !== 'public') continue;
      const d = new Date(v.publishedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;

      if (!map[key]) map[key] = { month: label, longViews: 0, shortViews: 0, tiktokViews: 0, igLikes: 0 };

      if (v.isShort) {
        map[key].shortViews += v.viewCount || 0;
      } else {
        map[key].longViews += v.viewCount || 0;
      }
    }

    for (const v of tiktokVideos) {
      if (v.viewCount === 0 && v.likeCount === 0) continue; // skip scheduled
      const d = new Date(v.createTime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;

      if (!map[key]) map[key] = { month: label, longViews: 0, shortViews: 0, tiktokViews: 0, igLikes: 0 };
      map[key].tiktokViews += v.viewCount;
    }

    for (const p of instagramPosts) {
      const d = new Date(p.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
      if (!map[key]) map[key] = { month: label, longViews: 0, shortViews: 0, tiktokViews: 0, igLikes: 0 };
      map[key].igLikes += p.likeCount;
    }

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, val]) => val);
  }, [videos, tiktokVideos, instagramPosts]);

  return (
    <div style={wrapper}>
      <div style={title}>Views por mes de publicacao</div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#999990' }} />
          <YAxis tick={{ fontSize: 11, fill: '#999990' }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #E8E5DD', borderRadius: 8, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
            labelStyle={{ color: '#1A1A1A', fontWeight: 600 }}
            formatter={(value: number) => value.toLocaleString('pt-BR')}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="longViews" name="YT Longos" fill="#FF0000" radius={[4, 4, 0, 0]} stackId="views" />
          <Bar dataKey="shortViews" name="YT Shorts" fill="#FF6666" radius={[4, 4, 0, 0]} stackId="views" />
          <Bar dataKey="tiktokViews" name="TikTok" fill="#00C4BD" radius={[4, 4, 0, 0]} stackId="views" />
          <Bar dataKey="igLikes" name="IG Likes" fill="#E1306C" radius={[4, 4, 0, 0]} stackId="views" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
