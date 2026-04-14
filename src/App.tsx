import { useState } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { Timeline } from './components/Timeline';
import { CalendarView } from './components/CalendarView';
import { AnalyticsViewV2 } from './components/AnalyticsViewV2';
import { CompetitorsView } from './components/CompetitorsView';
import { ViralRadarView } from './components/ViralRadarView';
import { CrossPostingView } from './components/CrossPostingView';
import { BRollLibrary } from './components/BRollLibrary';
import { ProductionsView } from './components/productions/ProductionsView';
import { DashboardHome } from './components/DashboardHome';
import { RoteiroLab } from './components/RoteiroLab';
import { FichaDetail } from './components/FichaDetail';
import { FinancialView } from './components/FinancialView';
import { AudienceIntelView } from './components/audience-intel/AudienceIntelView';
import { InfoprodutosView } from './components/InfoprodutosView';
import { VideoDetail } from './components/VideoDetail';
import { TikTokDetail } from './components/TikTokDetail';
import { InstagramDetail } from './components/InstagramDetail';
import { FacebookDetail } from './components/FacebookDetail';
import { ThreadsDetail } from './components/ThreadsDetail';
import { LinkedInDetail } from './components/LinkedInDetail';
import { TwitterDetail } from './components/TwitterDetail';
import { useYouTubeVideos } from './hooks/usePublications';
import type { ViewMode } from './components/Header';

export default function App() {
  const { refresh } = useYouTubeVideos();
  const [viewMode, setViewMode] = useState<ViewMode>('home');

  return (
    <>
      <Header onRefresh={refresh} viewMode={viewMode} onViewChange={setViewMode} />
      {viewMode === 'home' && <DashboardHome onNavigate={setViewMode} />}
      {viewMode === 'timeline' && <FilterBar />}
      {viewMode === 'timeline' && <Timeline />}
      {viewMode === 'calendar' && <CalendarView />}
      {viewMode === 'analytics' && <AnalyticsViewV2 />}
      {viewMode === 'financial' && <FinancialView />}
      {viewMode === 'audience' && <AudienceIntelView />}
      {viewMode === 'viral-radar' && <ViralRadarView />}
      {viewMode === 'crosspost' && <CrossPostingView />}
      {viewMode === 'productions' && <ProductionsView />}
      {viewMode === 'brolls' && <BRollLibrary />}
      {viewMode === 'roteiro-lab' && <RoteiroLab />}
      {viewMode === 'infoprodutos' && <InfoprodutosView />}
      {!['brolls', 'productions', 'home', 'financial', 'audience', 'roteiro-lab', 'infoprodutos'].includes(viewMode) && <VideoDetail />}
      <FichaDetail />
      <TikTokDetail />
      <InstagramDetail />
      <FacebookDetail />
      <ThreadsDetail />
      <LinkedInDetail />
      <TwitterDetail />
    </>
  );
}
