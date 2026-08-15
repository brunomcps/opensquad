import { useEffect } from 'react';
import { useAudienceIntelStore } from '../../store/useAudienceIntelStore';
import { Breadcrumbs } from './Breadcrumbs';
import { StrategicDimensions } from './StrategicDimensions';
import { DimensionDetail } from './DimensionDetail';
import { CommentList } from './CommentList';
import { CommentCard } from './CommentCard';
import { SuperfanList } from './SuperfanList';
import { SubclusterView } from './SubclusterView';
import { ExecutiveInsights } from './ExecutiveInsights';
import { SuperfanProfile } from './SuperfanProfile';

export function AudienceIntelView() {
  const { currentLevel, currentDimension, selectedComment, selectedSuperfan, fetchStats, fetchDimensionCards } = useAudienceIntelStore();

  useEffect(() => {
    fetchStats();
    fetchDimensionCards();
  }, []);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto', overflowY: 'auto', flex: 1 }}>
      <Breadcrumbs />

      {currentLevel === 1 && <ExecutiveInsights />}

      {currentLevel === 2 && <StrategicDimensions />}

      {currentLevel === 3 && currentDimension === 'superfans' && <SuperfanList />}
      {currentLevel === 3 && currentDimension && currentDimension !== 'superfans' && <DimensionDetail />}

      {currentLevel === 4 && <SubclusterView />}

      {currentLevel === 5 && selectedComment && <CommentCard />}
      {currentLevel === 5 && !selectedComment && (
        <>
          {currentDimension === 'superfan' && selectedSuperfan && <SuperfanProfile />}
          <CommentList />
        </>
      )}
    </div>
  );
}
