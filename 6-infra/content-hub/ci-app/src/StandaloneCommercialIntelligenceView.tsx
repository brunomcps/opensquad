import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { CampaignTracking } from '../../src/components/commercial-intelligence/CampaignTracking';
import { CommercialOverview } from '../../src/components/commercial-intelligence/CommercialOverview';
import { DataQualityTab } from '../../src/components/commercial-intelligence/DataQualityTab';
import { EmailInboxView } from '../../src/components/commercial-intelligence/EmailInboxView';
import { InstagramInboxView } from '../../src/components/commercial-intelligence/InstagramInboxView';
import { ProjecoesSimulador } from '../../src/components/commercial-intelligence/ProjecoesSimulador';
import { Rota2027View } from '../../src/components/commercial-intelligence/Rota2027View';
import { StoryContentView } from '../../src/components/commercial-intelligence/StoryContentView';
import {
  readStoryDeepLink,
  storyDeepLinkUrl,
} from '../../src/components/commercial-intelligence/storyReferenceDeepLink';
import { VideoSalesAssociation } from '../../src/components/commercial-intelligence/VideoSalesAssociation';
import type { MemberRole } from './api';

type Tab = 'overview' | 'tracking' | 'association' | 'projecoes' | 'rota' | 'instagram' | 'emails' | 'quality'
  | 'content-templates' | 'content-references' | 'content-publications' | 'content-approvals';

interface ItemNav {
  chave: Tab;
  rotulo: string;
  icone: string;
  copy: string;
}

const GRUPOS: Array<{ titulo: string; itens: ItemNav[] }> = [
  {
    titulo: 'Vendas',
    itens: [
      { chave: 'overview', rotulo: 'Visão comercial', icone: '◧', copy: 'O que vendeu, quanto entrou e quais produtos sustentaram o período.' },
      { chave: 'tracking', rotulo: 'Rastreamento', icone: '⟿', copy: 'Quais campanhas possuem origem comprovada, clique e venda atribuída.' },
      { chave: 'association', rotulo: 'Vídeos × vendas', icone: '▤', copy: 'Quais vídeos foram seguidos por mudança nas vendas, sem fingir causalidade.' },
      { chave: 'projecoes', rotulo: 'Projeções', icone: '◎', copy: 'Quanto tempo até cada meta de receita, em cenários calibrados com o histórico real.' },
    ],
  },
  {
    titulo: 'Relacionamento',
    itens: [
      { chave: 'instagram', rotulo: 'Instagram', icone: '❒', copy: 'As DMs do Instagram: a IA rascunha, você aprova, edita ou descarta.' },
      { chave: 'emails', rotulo: 'E-mails', icone: '✉', copy: 'Os e-mails de compradores do MAPA: tag por tipo, rascunho da IA e aprovação sua. Reembolso alerta na hora.' },
    ],
  },
  {
    titulo: 'Conteúdo',
    itens: [
      { chave: 'content-templates', rotulo: 'Biblioteca de stories', icone: '▦', copy: 'Navegação rápida, evidências concretas e análise completa no mesmo dossiê.' },
      { chave: 'content-references', rotulo: 'Referências', icone: '◫', copy: 'Prints, fonte, cronologia e leitura estrutural de sequências que vale guardar.' },
      { chave: 'content-publications', rotulo: 'Publicações', icone: '▤', copy: 'Planejamento, sequência narrativa e preview dos stories.' },
      { chave: 'content-approvals', rotulo: 'Para aprovar', icone: '✓', copy: 'Fila editorial antes do agendamento ou da publicação.' },
    ],
  },
  {
    titulo: 'Estratégia',
    itens: [
      { chave: 'rota', rotulo: 'Rota 2027', icone: '⚑', copy: 'Tô no caminho? O que fazer agora? Uma tela responde; os documentos completos ficam no rodapé.' },
      { chave: 'quality', rotulo: 'Qualidade dos dados', icone: '◈', copy: 'Qualidade da ingestão e confiança dos fatos observados.' },
    ],
  },
];

const TODOS = GRUPOS.flatMap(g => g.itens);

const TAB_STORAGE_KEY = 'ci-aba-ativa';
const TAB_VALIDAS = new Set(TODOS.map(item => item.chave));

function abaInicial(): Tab {
  const tabParam = new URLSearchParams(window.location.search).get('tab');
  if (tabParam && TAB_VALIDAS.has(tabParam as Tab)) return tabParam as Tab;
  try {
    const salva = sessionStorage.getItem(TAB_STORAGE_KEY);
    if (salva && TAB_VALIDAS.has(salva as Tab)) return salva as Tab;
  } catch { /* sessionStorage bloqueado: usa o padrão */ }
  return 'overview';
}

export function StandaloneCommercialIntelligenceView({ actions, role }: { actions?: ReactNode; role: MemberRole }) {
  // Lembra a aba entre re-montagens: se algo remontar a tela (token, reload),
  // o usuário continua onde estava em vez de cair na Visão comercial.
  const [tab, setTab] = useState<Tab>(abaInicial);
  const [initialStorySelection] = useState(() => readStoryDeepLink(window.location.search));
  const [publicationTemplateId, setPublicationTemplateId] = useState<string | null>(null);
  useEffect(() => {
    try { sessionStorage.setItem(TAB_STORAGE_KEY, tab); } catch { /* ignora */ }
    const url = storyDeepLinkUrl(window.location.href, tab, readStoryDeepLink(window.location.search));
    window.history.replaceState(window.history.state, '', url);
  }, [tab]);
  const handleStorySelectionChange = useCallback((templateId: string, referenceId: string | null) => {
    const url = storyDeepLinkUrl(window.location.href, 'content-templates', { templateId, referenceId });
    window.history.replaceState(window.history.state, '', url);
  }, []);
  const atual = TODOS.find(i => i.chave === tab) ?? TODOS[0];

  return (
    <div className="ci-shell">
      <aside className="ci-sidebar">
        <div className="ci-sidebar-marca">
          <span className="ci-sidebar-mono">B</span>
          <span className="ci-sidebar-nome">Inteligência<br />Comercial</span>
        </div>
        <nav className="ci-nav" aria-label="Áreas da inteligência comercial">
          {GRUPOS.map(grupo => (
            <div key={grupo.titulo} className="ci-nav-grupo">
              <span className="ci-nav-titulo">{grupo.titulo}</span>
              {grupo.itens.map(item => (
                <button
                  key={item.chave}
                  type="button"
                  className={`ci-nav-item${item.chave === tab ? ' active' : ''}`}
                  onClick={() => setTab(item.chave)}
                >
                  <span className="ci-nav-icone" aria-hidden="true">{item.icone}</span>
                  {item.rotulo}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="ci-main">
        <header className="ci-topbar">
          <div>
            <h1>{atual.rotulo}</h1>
            <p>{atual.copy}</p>
          </div>
          <div className="ci-topbar-acoes">{actions}</div>
        </header>
        <div className="ci-conteudo">
          {tab === 'overview' && <CommercialOverview />}
          {tab === 'tracking' && <CampaignTracking role={role} />}
          {tab === 'association' && <VideoSalesAssociation />}
          {tab === 'projecoes' && <ProjecoesSimulador />}
          {tab === 'rota' && <Rota2027View />}
          {tab === 'instagram' && <InstagramInboxView />}
          {tab === 'emails' && <EmailInboxView />}
          {tab === 'quality' && <DataQualityTab />}
          {tab === 'content-templates' && <StoryContentView
            section="templates"
            role={role}
            initialTemplateId={initialStorySelection.templateId}
            initialReferenceId={initialStorySelection.referenceId}
            onSelectionChange={handleStorySelectionChange}
            onUseTemplate={templateId => {
              setPublicationTemplateId(templateId);
              setTab('content-publications');
            }}
          />}
          {tab === 'content-references' && <StoryContentView section="references" role={role} />}
          {tab === 'content-publications' && <StoryContentView
            section="publications"
            role={role}
            initialTemplateId={publicationTemplateId}
            onInitialTemplateConsumed={() => setPublicationTemplateId(null)}
          />}
          {tab === 'content-approvals' && <StoryContentView section="approvals" role={role} />}
        </div>
      </div>
    </div>
  );
}
