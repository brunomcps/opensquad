import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useCommercialIntelligenceStore } from '../../store/useCommercialIntelligenceStore';
import type {
  DataQualitySource,
  DataQualityStatus,
} from '../../types/commercialIntelligence';

const card: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-sm)',
  padding: '18px',
};

const STATUS: Record<DataQualityStatus, { label: string; color: string; background: string }> = {
  healthy: { label: 'Saudável', color: 'var(--accent-green)', background: 'rgba(34, 163, 91, 0.1)' },
  warning: { label: 'Atenção', color: 'var(--accent-gold-dark)', background: 'rgba(240, 186, 60, 0.14)' },
  error: { label: 'Erro', color: 'var(--accent-red)', background: 'rgba(220, 53, 69, 0.1)' },
  not_configured: { label: 'Não configurado', color: 'var(--text-muted)', background: 'var(--bg-primary)' },
};

const ALERT_LABELS: Record<string, string> = {
  database_not_configured: 'Banco da Inteligência Comercial ainda não configurado.',
  database_query_failed: 'Não foi possível consultar o banco da Inteligência Comercial.',
  source_never_synced: 'A fonte ainda não teve uma sincronização registrada.',
  source_stale: 'A fonte está há mais de 36 horas sem atualização.',
  webhook_not_configured: 'O HOTTOK do webhook Hotmart ainda não foi configurado.',
  buyer_hmac_secret_missing: 'O segredo de anonimização dos compradores ainda não foi configurado.',
  hotmart_reconciliation_repairs: 'A última reconciliação corrigiu transações.',
  invalid_hotmart_row: 'A reconciliação encontrou uma linha Hotmart inválida.',
};

function formatAlert(code: string): string {
  const base = code.split(':')[0];
  if (base === 'youtube_missing_days') {
    return `O YouTube tem ${code.split(':')[1] || 'alguns'} dia(s) sem dados na janela.`;
  }
  if (base === 'youtube_metadata_missing') {
    return `Faltaram metadados de ${code.split(':')[1] || 'alguns'} vídeo(s).`;
  }
  if (base === 'hotmart_partial_statuses') {
    return `A reconciliação Hotmart ficou parcial nos status: ${code.split(':')[1] || 'não informados'}.`;
  }
  return ALERT_LABELS[base] || code;
}

function formatDate(value: string | null): string {
  if (!value) return 'Ainda não sincronizado';
  return new Date(value).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function SourceCard({ source }: { source: DataQualitySource }) {
  const status = STATUS[source.status];
  return (
    <section style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 750, color: 'var(--text-primary)' }}>
            {source.label}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
            Última atualização: {formatDate(source.lastSyncAt)}
          </div>
        </div>
        <span style={{
          color: status.color,
          background: status.background,
          borderRadius: '999px',
          padding: '4px 9px',
          fontSize: '10px',
          fontWeight: 800,
          whiteSpace: 'nowrap',
        }}>
          {status.label}
        </span>
      </div>

      <dl style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '12px',
        margin: '18px 0 0',
      }}>
        <div>
          <dt style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Watermark</dt>
          <dd style={{ margin: '3px 0 0', fontSize: '13px', fontWeight: 700 }}>{source.sourceWatermark || '—'}</dd>
        </div>
        <div>
          <dt style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Idade</dt>
          <dd style={{ margin: '3px 0 0', fontSize: '13px', fontWeight: 700 }}>
            {source.ageHours === null ? '—' : `${source.ageHours.toFixed(1)} h`}
          </dd>
        </div>
        <div>
          <dt style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lidas / gravadas</dt>
          <dd style={{ margin: '3px 0 0', fontSize: '13px', fontWeight: 700 }}>
            {source.rowsRead} / {source.rowsWritten}
          </dd>
        </div>
        <div>
          <dt style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reparos</dt>
          <dd style={{ margin: '3px 0 0', fontSize: '13px', fontWeight: 700 }}>{source.repairs}</dd>
        </div>
      </dl>
    </section>
  );
}
export function DataQualityTab() {
  const { quality, loading, error, fetchQuality } = useCommercialIntelligenceStore();

  useEffect(() => {
    fetchQuality();
  }, [fetchQuality]);

  if (loading && !quality) {
    return <div style={{ ...card, color: 'var(--text-muted)' }}>Carregando diagnóstico das fontes...</div>;
  }
  if (error && !quality) {
    return (
      <div style={{ ...card, color: 'var(--accent-red)' }}>
        <strong>Não foi possível carregar a qualidade dos dados.</strong>
        <div style={{ fontSize: '12px', marginTop: '6px' }}>{error}</div>
      </div>
    );
  }
  if (!quality) return null;

  const overall = STATUS[quality.overallStatus];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <section style={{ ...card, display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Confiança operacional
          </div>
          <div style={{ fontSize: '22px', color: overall.color, fontWeight: 850, marginTop: '4px' }}>
            {overall.label}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px' }}>
            Janela auditada: {quality.coverage.requestedStart} a {quality.coverage.requestedEnd}
          </div>
        </div>
        <button
          type="button"
          onClick={fetchQuality}
          disabled={loading}
          style={{
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '8px 12px',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            cursor: loading ? 'wait' : 'pointer',
            fontWeight: 650,
          }}
        >
          {loading ? 'Atualizando...' : 'Atualizar diagnóstico'}
        </button>
      </section>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
        gap: '14px',
      }}>
        {quality.sources.map(source => <SourceCard key={source.source} source={source} />)}
      </div>

      <section style={card}>
        <div style={{ fontSize: '14px', fontWeight: 750, color: 'var(--text-primary)' }}>Alertas</div>
        {quality.alerts.length ? (
          <ul style={{ margin: '12px 0 0', paddingLeft: '20px', display: 'grid', gap: '8px' }}>
            {quality.alerts.map(alert => (
              <li key={alert} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {formatAlert(alert)}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px' }}>
            Nenhum alerta ativo.
          </div>
        )}
      </section>
    </div>
  );
}
