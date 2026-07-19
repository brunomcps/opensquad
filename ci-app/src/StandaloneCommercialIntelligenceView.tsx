import { useState, type ReactNode } from 'react';
import { CampaignTracking } from '../../src/components/commercial-intelligence/CampaignTracking';
import { CommercialOverview } from '../../src/components/commercial-intelligence/CommercialOverview';
import { DataQualityTab } from '../../src/components/commercial-intelligence/DataQualityTab';
import { InstagramInboxView } from '../../src/components/commercial-intelligence/InstagramInboxView';
import { ProjecoesSimulador } from '../../src/components/commercial-intelligence/ProjecoesSimulador';
import { Rota2027View } from '../../src/components/commercial-intelligence/Rota2027View';
import { VideoSalesAssociation } from '../../src/components/commercial-intelligence/VideoSalesAssociation';
import type { MemberRole } from './api';

type Tab = 'overview' | 'tracking' | 'association' | 'projecoes' | 'rota' | 'instagram' | 'quality';

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

export function StandaloneCommercialIntelligenceView({ actions, role }: { actions?: ReactNode; role: MemberRole }) {
  const [tab, setTab] = useState<Tab>('overview');
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
          {tab === 'quality' && <DataQualityTab />}
        </div>
      </div>
    </div>
  );
}
