# Modelo de integração com a plataforma

Use este modelo quando análises de referência, templates e publicações do Bruno forem catalogados na plataforma Inteligência Comercial.

## Princípio central

O **template é a entidade principal**. Ele reúne, na mesma página:

1. explicação, fórmula, etapas, função no funil e riscos;
2. referências que originaram ou reforçaram o template, com análise e mídia;
3. publicações do Bruno que aplicaram o template;
4. métricas e aprendizados acumulados.

A navegação deve preservar sempre a rede:

`Referência(s) ↔ Template(s) ↔ Publicação(ões)`

## Entidades

### Template

- nome e slug estrutural;
- explicação e fórmula;
- etapas esperadas;
- função no funil;
- mecanismos;
- versões e aprendizados.

### Referência

Uma sequência observada de outro creator:

- creator e contexto;
- análise completa;
- stories individuais ordenados;
- prints completos;
- recortes automáticos de elementos relevantes;
- data da captura.

A relação `Referência ↔ Template` deve registrar **qual contribuição aquela referência deu ao template**, em vez de apenas guardar um link sem significado.

### Sequência publicada

Uma unidade narrativa produzida pelo Bruno:

- objetivo e status;
- ordem narrativa;
- template principal e complementares;
- referências consultadas;
- métricas consolidadas.

Status úteis: `em construção`, `aguardando interação`, `concluída` e `abandonada`.

### Story publicado

Cada tela individual mantém:

- mídia e copy;
- horário cronológico real;
- métricas próprias;
- função cumprida no template;
- posição narrativa dentro de cada sequência à qual pertence.

## Cronologia e pertencimento narrativo

Não agrupar stories apenas por dia ou proximidade de horário. Sequências diferentes podem se intercalar, e uma sequência pode continuar horas ou dias depois, especialmente quando depende de resposta de seguidor.

Exemplo cronológico:

`A1 → A2 → B1 → C1 → A3`

Dentro da página da sequência A, mostrar:

`A1 → A2 → A3`

A linha do tempo geral preserva a ordem real de publicação. A página da sequência preserva a ordem narrativa.

## Pertencimento múltiplo

Por padrão, cada story publicado possui uma sequência principal. Excepcionalmente, o mesmo story pode pertencer a sequências adicionais quando Bruno avisar ou aprovar a sugestão do Hermes.

O vínculo entre story e sequência deve guardar:

- `is_primary`;
- `narrative_position`;
- `narrative_role`;
- justificativa opcional do vínculo adicional.

Nunca presumir pertencimento múltiplo só porque dois assuntos aparecem na mesma tela.

## Visões obrigatórias

### Visão por template

Mostrar juntas:

- descrição do template;
- referências e análises que o sustentam;
- publicações do Bruno que o usaram;
- métricas comparáveis;
- aprendizados e variações.

### Visão cronológica

Mostrar todas as publicações na ordem real. Cada card deve exibir e ligar:

- sequência ou sequências;
- template principal e complementares;
- referências usadas;
- métricas disponíveis.

## Aprovação e ingestão

Fluxo inicial decidido:

1. Hermes prepara análise, recortes, classificação, vínculos e proposta de template.
2. Bruno revisa tudo em uma única aprovação.
3. Após o OK, a plataforma cataloga o item no template correspondente.
4. Se nenhum template servir, Hermes propõe criar um novo.
5. Métricas ficam previstas no modelo e entram via Meta API quando a conta permitir.

## Regra de qualidade

Um template nunca pode ficar órfão de origem. Uma referência nunca deve aparecer sem explicar o que ensinou ao template. Uma publicação nunca deve aparecer sem mostrar quais templates e referências influenciaram sua criação, quando esses vínculos existirem.