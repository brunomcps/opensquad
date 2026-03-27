import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useContentStore } from '../../store/useContentStore';

const wrapper: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '18px 22px',
  boxShadow: 'var(--shadow-sm)',
};

const titleRow: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  marginBottom: '10px',
  flexWrap: 'wrap',
  gap: '4px',
};

const title: CSSProperties = {
  fontSize: '14px',
  fontWeight: 700,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font)',
};

const legendStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  fontSize: '10px',
  color: 'var(--text-secondary)',
  flexWrap: 'wrap',
};

const legendDot: CSSProperties = {
  display: 'inline-block',
  width: 8,
  height: 8,
  borderRadius: '50%',
  marginRight: 5,
  verticalAlign: 'middle',
};

interface DataPoint {
  x: number;
  y: number;
  title: string;
  isShort: boolean;
}

export function EngagementScatter() {
  const videos = useContentStore((s) => s.youtubeVideos);
  const tiktokVideos = useContentStore((s) => s.tiktokVideos);

  const { longData, shortData, tiktokData, avgEngagement } = useMemo(() => {
    const publicVids = videos.filter((v) => v.privacyStatus === 'public' && (v.viewCount || 0) > 0);
    const publishedTT = tiktokVideos.filter((v) => v.viewCount > 0);

    const longPts: DataPoint[] = [];
    const shortPts: DataPoint[] = [];
    const ttPts: DataPoint[] = [];

    let totalEng = 0;
    let totalCount = 0;

    for (const v of publicVids) {
      const eng = ((v.likeCount || 0) / (v.viewCount || 1)) * 100;
      totalEng += eng;
      totalCount++;
      const point = { x: v.viewCount || 0, y: parseFloat(eng.toFixed(2)), title: v.title, isShort: v.isShort };
      if (v.isShort) shortPts.push(point);
      else longPts.push(point);
    }

    for (const v of publishedTT) {
      const eng = (v.likeCount / (v.viewCount || 1)) * 100;
      totalEng += eng;
      totalCount++;
      ttPts.push({ x: v.viewCount, y: parseFloat(eng.toFixed(2)), title: v.title, isShort: false });
    }

    return {
      longData: longPts,
      shortData: shortPts,
      tiktokData: ttPts,
      avgEngagement: totalCount > 0 ? totalEng / totalCount : 0,
    };
  }, [videos, tiktokVideos]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as DataPoint;
    return (
      <div style={{
        background: '#fff',
        border: '1px solid #E8E5DD',
        borderRadius: 8,
        padding: '10px 12px',
        fontSize: 12,
        maxWidth: 260,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}>
        <div style={{ color: '#1A1A1A', fontWeight: 600, marginBottom: 4 }}>{d.title}</div>
        <div style={{ color: '#666660' }}>
          {d.x.toLocaleString('pt-BR')} views · {d.y}% engagement
        </div>
      </div>
    );
  };

  return (
    <div style={wrapper}>
      <div style={titleRow}>
        <span style={title}>Engagement vs Views</span>
        <div style={legendStyle}>
          <span><span style={{ ...legendDot, background: '#FF0000' }} />YT Longos</span>
          <span><span style={{ ...legendDot, background: '#FF6666' }} />YT Shorts</span>
          <span><span style={{ ...legendDot, background: '#00C4BD' }} />TikTok</span>
          <span style={{ color: 'var(--text-muted)' }}>— {avgEngagement.toFixed(1)}%</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart>
          <XAxis
            type="number"
            dataKey="x"
            name="Views"
            tick={{ fontSize: 11, fill: '#999990' }}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Engagement %"
            tick={{ fontSize: 11, fill: '#999990' }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={avgEngagement}
            stroke="var(--accent-gold)"
            strokeDasharray="4 4"
            strokeOpacity={0.6}
          />
          <Scatter data={longData} fill="#FF0000" fillOpacity={0.75} />
          <Scatter data={shortData} fill="#FF6666" fillOpacity={0.75} />
          <Scatter data={tiktokData} fill="#00C4BD" fillOpacity={0.75} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
