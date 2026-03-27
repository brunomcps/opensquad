# Briefing — Content Hub Redesign (Google Stitch)

## O que e o projeto

Content Hub e um dashboard web para um criador de conteudo digital gerenciar publicacoes em 7 plataformas (YouTube, TikTok, Instagram, Facebook, Threads, LinkedIn, X/Twitter), acompanhar analytics, financeiro, producao de videos e biblioteca de assets.

O usuario e um unico criador solo — nao e SaaS, nao tem multi-tenant. E uma ferramenta interna de produtividade.

## Tech stack atual

- React 19 + TypeScript + Vite
- Zustand (state management)
- Recharts (graficos)
- Express backend (API na porta 3001)
- Inline CSS styles (sem framework de UI)

## Paginas (9 views + modais)

### 1. Home (Dashboard)
- Saudacao com nome do usuario e data
- 5 KPI cards no topo (Inscritos YT, Views Total, Conteudos, Engagement, Receita Hotmart)
- Publicacoes recentes (lista com thumbnail, titulo, likes, tempo)
- Proximos agendados (lista com titulo e countdown)
- Top Performance 30d (ranking de videos)
- Agenda de Hoje (mini-agenda com input para adicionar evento)
- Screenshot: 01-home.png

### 2. Timeline
- Barra de filtros: busca, plataforma (com icones), status (todos/publicados/agendados/privados)
- Colunas horizontais por plataforma: YouTube, YT Shorts, TikTok, Instagram, Facebook, Threads, LinkedIn, X
- Cada coluna mostra cards com thumbnail e titulo, scroll vertical
- Botao "Sincronizar" por plataforma com data do ultimo sync
- Screenshot: 02-timeline.png

### 3. Calendario
- Navegacao semanal/mensal com botoes
- Botao "Agenda" para integrar Google Calendar
- Vista semanal com grid horario (07:00-22:00)
- Eventos coloridos por plataforma (vermelho = YouTube, ciano = TikTok, rosa = Instagram)
- Eventos de dia todo no topo
- Botoes "+ evento" por dia
- Screenshot: 03-calendar.png

### 4. Analytics
- 5 KPI cards (Inscritos, Views Total, Videos, Engagement, TT Shares)
- Grafico de barras: Views por mes de publicacao (legenda: IG Likes, TikTok, YT Longos, YT Shorts)
- Top Videos: lista rankada com filtros (Todos/YT/Shorts/TikTok) e ordenacao (Views/Likes/Eng%)
- Comparativo por plataforma: cards lado a lado com metricas (quantidade, views total, views media, engagement)
- Melhor horario para postar: top 5 slots com media de views
- Frequencia de publicacao: grafico de barras empilhadas por plataforma ao longo do tempo
- Engagement vs Views: scatter plot com media de engagement
- Screenshot: 04-analytics.png

### 5. Financeiro
- Periodo (mes atual)
- 3 KPI cards (Receita Bruta, Receita Liquida, Ticket Medio)
- Barra de progresso da meta (R$ 50.000/mes)
- Receita Diaria: grafico de barras
- Receita por Produto: donut chart com legenda detalhada
- Vendas Recentes: lista com nome do comprador, produto, metodo de pagamento, valor e data
- Screenshot: 05-financial.png

### 6. Concorrentes
- Input para adicionar canal por @handle, URL ou Channel ID
- Cards de canal: avatar, nome, handle, metricas absolutas (inscritos, views, videos), metricas derivadas (views/video, views/inscrito, inscritos/video)
- Card "Voce" destacado com borda dourada
- Radar chart comparativo (normalizado): Inscritos, Views, Videos, Views/Video, Views/Inscrito, Inscritos/Video
- Tabela ranking geral com todas as metricas
- Screenshot: 06-competitors.png

### 7. Cross-posting Tracker
- Header com contadores (completos/incompletos) e botao Auto-Match
- Lista de conteudos vinculados: titulo + badges por plataforma (YT, TT, IG) com links diretos
- Badges coloridos: verde = publicado com link, cinza = nao publicado ainda
- Screenshot: 07-crosspost.png

### 8. Producoes
- Header com botao "+ Nova producao"
- Filtros por status (Todas, Ideia, Roteiro, Gravacao, Edicao, Pronto, Publicado)
- Busca por titulo ou tags
- Lista de producoes: titulo, quantidade de blocos, status badge, data
- Ao clicar abre editor completo com: script blocks, b-roll picker, lower third editor, variacoes de titulo, thumbnail
- Screenshot: 08-productions.png

### 9. B-Roll Library
- Header com botao "+ Importar B-Rolls"
- Stats: quantidade, duracao total, armazenamento, em uso
- Filtros: busca, fonte (Veo/Grok/Pexels/Pixabay/Gravado/Remotion/Outro), tags, ordenacao (Data/Duracao/Nome/Mais usado)
- Grid de cards: thumbnail com badge de fonte e duracao, titulo, resolucao, tamanho, tags
- Badge "Usado Nx" para assets ja utilizados
- Screenshot: 09-brolls.png

## Design system atual

### Cores
- **Fundo primario:** #F5F5F0 (bege claro)
- **Cards:** #FFFFFF (branco)
- **Accent principal:** #F0BA3C (dourado) — botoes, KPIs destacados, badges
- **Accent secundario:** #C99A2E (dourado escuro)
- **Texto primario:** #1a1a1a
- **Texto secundario:** #666
- **Sucesso:** #22A35B (verde)
- **Alerta:** #D4940A (amber)
- **Erro:** #DC3545 (vermelho)
- **Cores por plataforma:** YouTube vermelho, TikTok ciano/rosa, Instagram rosa/roxo, Facebook azul, LinkedIn azul, X preto

### Tipografia
- **Headings:** Montserrat (ExtraBold 800)
- **Body:** Inter (400-600)
- **Tamanhos:** 11px (labels) ate 28px (KPI values)

### Componentes
- Cards com border-radius 8-12px, sombra sutil
- Botoes com border-radius 8px, fundo dourado (#F0BA3C) para primario
- Badges arredondados com cores semanticas
- Tab navigation no header com estado ativo destacado
- Graficos via Recharts com paleta consistente

### Layout
- Header fixo no topo com tabs de navegacao
- Conteudo centralizado com max-width
- Grid responsivo para cards e graficos
- Sidebar nao existe — navegacao e por tabs

## O que quero do redesign

[PREENCHER AQUI — descreva o que quer mudar: dark mode? layout diferente? mais moderno? referencia visual?]

## Arquivos de referencia

Screenshots de todas as paginas estao na pasta `screenshots-stitch/`:
- 01-home.png
- 02-timeline.png
- 03-calendar.png
- 04-analytics.png
- 05-financial.png
- 06-competitors.png
- 07-crosspost.png
- 08-productions.png
- 09-brolls.png
