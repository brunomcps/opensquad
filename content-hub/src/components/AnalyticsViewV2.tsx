import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useContentStore } from '../store/useContentStore';
import { SummaryCards } from './analytics/SummaryCards';
import { ViewsByMonth } from './analytics/ViewsByMonth';
import { TopVideosCompact } from './analytics/TopVideosCompact';
import { FormatComparison } from './analytics/FormatComparison';
import { PublishFrequency } from './analytics/PublishFrequency';
import { EngagementScatter } from './analytics/EngagementScatter';
import { BestTimeHeatmap } from './analytics/BestTimeHeatmap';

const wrapper: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
};

const row: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '14px',
  alignItems: 'stretch',
};

const rightStack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  height: '100%',
};

const loadingStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  color: 'var(--text-secondary)',
  fontSize: '14px',
};

export function AnalyticsViewV2() {
  const loading = useContentStore((s) => s.loading);
  const videos = useContentStore((s) => s.youtubeVideos);

  if (loading && videos.length === 0) {
    return <div style={loadingStyle}>Carregando analytics...</div>;
  }

  return (
    <div style={wrapper}>
      {/* Row 1: Summary cards */}
      <SummaryCards />

      {/* Row 2: Hero chart — full width */}
      <ViewsByMonth />

      {/* Row 3: Top Videos (scroll) + stacked sidebar (Shorts + Melhor Horário) */}
      <div style={row}>
        <TopVideosCompact />
        <div style={rightStack}>
          <FormatComparison />
          <BestTimeHeatmap />
        </div>
      </div>

      {/* Row 4: Frequency + Scatter */}
      <div style={row}>
        <PublishFrequency />
        <EngagementScatter />
      </div>
    </div>
  );
}
