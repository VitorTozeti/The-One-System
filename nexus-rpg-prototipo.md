# Nexus RPG — Protótipo (o que já existe)

Arquivo único `nexus-rpg-prototipo.html` (~4.000 linhas), 100% offline: sem internet, sem CDN, sem instalação, sem build. Abre com dois cliques. Tudo em JavaScript puro (helper `h()` criando DOM na mão) e os dados ficam no **LocalStorage** do navegador.

Dois modos, alternados no cabeçalho: **🛠️ Mestre** (cria o sistema) e **🎲 Jogador** (cria a ficha usando esse sistema).

---

## Motores internos

- **Motor de fórmulas** — tokenizador + parser próprios. Aceita números, variáveis com espaço/acento (`Nível`, `Força`), `+ - * / %`, parênteses, comparações, `e`/`ou` e funções: `min/max`, `menor/maior`, `arredondar/round`, `piso/floor`, `teto/ceil`, `abs`, `modulo`, `se/if`. Nome de variável casa pelo mais longo com fronteira de palavra; função vence variável quando vem seguida de `(`.
- **Motor de dados** — expressões `NdX` com `kh/kl/dh/dl` (manter/descartar maiores/menores), pool de dados, vantagem/desvantagem, modificador de quantidade de dados, e texto explicando a rolagem.
- **Motor de efeitos** — reúne efeitos de classe, raça, escolhas, condições e itens equipados: bônus de atributo, perícia concedida, modificador de dados por escopo (todas, ataque, perícia, defesa, dano, técnica), etc.
- **Migração de versão** — `SCHEMA = 10`, com migração automática de sistemas salvos a partir do schema 6.
- **Desfazer/Refazer** do layout da ficha + atalhos de teclado no editor.

---

## Modo Mestre — 16 abas

| Aba | O que faz |
|---|---|
| 📛 **Campanha** | Nome da campanha e do sistema; temas (10 presets + temas personalizados). |
| ⚙️ **Regras** | Nível inicial/máximo, pontos de atributo, nº de perícias, valor inicial, mín/máx de atributo, "dump" (baixar atributo p/ ganhar pontos), modo de atributo: **valor direto** ou **modificador** com fórmula própria (`(V-10)/2`). |
| 📈 **Progressão** | Tabela de progressão por degrau: colunas livres, rótulos, valores por nível. Nome do eixo configurável (Nível, NEX, Grau…). Também disponível por classe. |
| 💪 **Atributos** | Criar/editar atributos com nome e sigla (FOR, AGI…). |
| ❤️ **Recursos** | Recursos tipo **barra** (Vida, Mana) ou **valor** (Defesa), com cor, fórmula (`Vigor*10+15`) e prévia ao vivo. **Recarga**: gatilho (nunca / descanso curto / longo), quanto (tudo, metade, fórmula) e gasto máximo por rodada. |
| 🎯 **Perícias** | Perícia com descrição, atributo ligado, bônus ao treinar, automática ou escolhível. **Proficiência** em 3 modos (nenhum / multiplicador estilo D&D / graus fixos estilo Ordem) com presets e tiers editáveis. |
| 🎭 **Classes** | Descrição, habilidades com requisitos, efeitos e tabela de progressão própria. |
| 🌱 **Origem / Raça** | Efeitos, habilidades com requisitos e características físicas (traits). |
| 🌿 **Escolhas** | Pontos de escolha "escolha N de M" liberados por degrau: subclasse, trilha, talento, dom. Opções com pré-requisito (nível, atributo mínimo, outra opção já escolhida) e flag repetível. |
| 🎒 **Itens** | Itens por categoria (arma, armadura, acessório, ferramenta, consumível, outro) com peso, efeitos e equipável. **Espaços de equipamento** (slots com capacidade) + **sintonização** (teto global) + fórmula de **carga máxima**. Armas com dano, ataque e tags; armaduras com defesa. |
| 🩸 **Condições** | Condições/estados com ícone, cor, descrição, efeitos, **composição** (Fatigado = Fraco + Vulnerável), **níveis cumulativos** (exaustão) e regra de não-empilhamento. |
| 🏷 **Tags** | Tags coloridas (Fogo, Corte, Paranormal…) e **matriz de interação direcional**: quando tag A atinge tag B → multiplicador de dano e modificador de dados. Cobre resistência, vulnerabilidade e ciclo de opressão com a mesma peça. |
| 🎲 **Dados** | Modo de rolagem do sistema: **base + bônus** (1d20+X) ou **pool** de dados, faces configuráveis, escopos de rolagem. |
| 🌀 **Técnicas** | Construtor de habilidades autorais: liga/desliga, nome no sistema (Técnicas, Rituais, Feitiços), recurso que paga o custo, custo por componente (ação complexa/simples/característica extra) e **tiers** com teto de dano e fórmula de custo base. |
| 🖼️ **Ficha** | Editor visual do layout da ficha (abaixo). |
| 💾 **Sistema** | Exportar/importar `.nexus` (JSON) e restaurar o sistema de exemplo. |

---

## Editor de ficha (aba 🖼️ Ficha)

Editor de layout livre em canvas de largura fixa (860px), escalado para caber na tela.

**21 tipos de bloco**
- Dados: Nome & Identidade, Foto, Atributos, Valores, Recursos, Perícias, Habilidades, Características físicas, Anotações, Rolador de Dados, Progressão, Inventário, Condições, Ataques & Armas, Técnicas Autorais, Escolhas.
- Decorativos (repetíveis): Texto livre, Divisor, Forma, Imagem/Selo, Painel vazio.

**Edição**
- Arrastar da paleta com fantasma seguindo o cursor; arrastar e redimensionar blocos; grade opcional com tamanho configurável; **snap magnético** com guias; **guias fixas** clicáveis; seleção múltipla por marquee; painel de **camadas**; barra de ações no bloco selecionado (duplicar, alinhar, ajustar ao conteúdo, travar, ocultar, remover); desfazer/refazer; painel de propriedades flutuante em telas largas.
- **Estilo livre em qualquer bloco**: fundo + opacidade, cor/espessura da borda, raio, sombra, padding, rotação, opacidade, moldura, título (cor, tamanho, alinhamento, maiúsculas), apelido.
- **Atributos estilizados**: formas (caixa, círculo, hexágono, octógono, escudo, losango), arranjos (grade, colmeia, flor/roseta com núcleo central), fontes (padrão, serifada, display, mono), cores, tamanhos, exibir sigla/nome/bônus. 6 presets prontos (Ritual, Colmeia, Pergaminho, Marcial, Arcano, Limpo).
- **Modelos de ficha** prontos (Clássico, Duas colunas, etc.) como ponto de partida.

---

## Modo Jogador — assistente passo a passo

Passos dinâmicos (o passo "Escolhas" só aparece se o sistema tiver pontos de escolha no degrau do personagem):

1. **Identidade** — nome, nível inicial, classe e origem/raça (mostrando habilidades e traços de cada opção).
2. **Atributos** — distribuição por + / −, respeitando mín/máx e dump; contador de pontos restantes; mostra modificador quando o sistema usa esse modo.
3. **Perícias** — escolher exatamente o nº pedido; mostra automáticas e concedidas por classe/raça; seletor de **grau de treino** quando há proficiência.
4. **Escolhas** — pontos de escolha com opções **travadas** quando o pré-requisito não é cumprido, explicando o que falta.
5. **Ficha** — a ficha montada no layout que o mestre desenhou.

**Validações amigáveis**: barra "Avançar" só libera quando o passo está completo, e o app explica quando a *regra do mestre é impossível* (ex.: mais pontos do que cabe nos atributos, mais perícias pedidas do que existem, sistema sem classe/origem cadastrada).

**Na ficha do jogador**: barras de recurso com controles e botões de descanso curto/longo, rolador de dados estruturado com resultado detalhado, inventário com equipar/slots/carga, ataques com tags e matriz de interação, condições liga/desliga com níveis, construtor de técnicas dentro do orçamento do tier, anotações, foto (upload local) e salvar ficha no dispositivo.

---

## Persistência e portabilidade

- Sistema e rascunho de ficha salvos automaticamente no LocalStorage (com aviso quando a cota estoura).
- Exportar/importar o sistema inteiro como arquivo `.nexus` (JSON legível).
- Fichas salvas ficam no dispositivo; contador exibido no rodapé do assistente.
- Sistema de exemplo completo embutido, restaurável a qualquer momento.

---

## Log de alterações

### 2026-07-24 — Barra de abas do Mestre centralizada
- **O quê**: `.tabs` deixou de ser fita com `overflow-x:auto` e virou `flex-wrap:wrap; justify-content:center`. As 16 abas quebram em linhas e ficam centradas no papel, em vez de metade ficar escondida fora da tela.
- **Teste**: Chrome headless `--dump-dom` no arquivo. Resultado: 16 botões de aba no DOM (15 `class="tab "` + 1 `class="tab on"`), regra `flex-wrap:wrap;justify-content:center` presente, 0 ocorrência de `Uncaught`/`SyntaxError`.
- **Falhas**: nenhuma. Observação: `--dump-dom` só valida estrutura e CSS no texto, não o resultado visual da quebra de linha em telas estreitas.

---

### 2026-07-24 — Navegação do Mestre reconstruída (checklist 1 a 10)
- **O quê**: as 16 abas soltas viraram 4 grupos com sub-abas, guiados por uma tabela `TAB_META` (grupo, ícone, flag de avançada). Entregue de uma vez:
  - **1** grupos 🏗 Fundação / 🧍 Personagem / 🌍 Mundo & Regras / 📤 Saída;
  - **2** módulos avançados (Progressão, Escolhas, Condições, Tags, Técnicas) marcados com ◇ e escondidos no Modo Simples;
  - **3** badge de contagem em cada aba (`contagemDaAba`);
  - **4** ponto vermelho na aba e no grupo com problema (`problemasDaAba`, ~25 checagens: fórmula inválida, regra impossível, classe/origem faltando, matriz sem tag, tier sem custo…);
  - **5** rodapé "← anterior / passo N de M / Próximo passo →", terminando em "Testar como jogador";
  - **6** barra de progresso dos 12 passos essenciais (`passosEssenciais`);
  - **7** nova aba 🧭 **Início**, com checklist clicável dos 12 passos + lista de problemas encontrados + atalhos;
  - **8** busca global **Ctrl+K** com ~60 destinos (abas + ajustes específicos como carga, sintonização, crítico), busca sem acento, Enter abre o primeiro, Esc fecha;
  - **9** alternador **Modo Simples / Avançado**, salvo em `nexus_modo`; abrir um item avançado pela busca ou pelo checklist religa o Avançado sozinho;
  - **10** breadcrumb "🛠️ Campanha › Grupo › Aba" com o grupo clicável.
- **Estado novo**: `S.ui.modo`, `S.ui.grupo`, `S.ui.busca`; aba inicial passou de `campanha` para `inicio`.
- **Testes** (Chrome headless `--dump-dom`, cópias com estado injetado):
  - as 17 abas renderizam sem erro — cards por aba: inicio 3, campanha 2, regras 3, progressao 3, atributos 1, recursos 1, pericias 2, classes 1, racas 1, escolhas 1, itens 2, dados 4, condicoes 1, tags 2, tecnicas 1, ficha 3, sistema 1;
  - 4 grupos e 1 breadcrumb no DOM, barra de progresso em 92% (11/12) no sistema de exemplo;
  - Modo Simples deixa 12 abas visíveis (esconde as 5 avançadas) e, com `S.tab` numa aba escondida, cai para o Início em vez de tela vazia;
  - busca por "carga" retorna "Recarga de recurso" e "Carga máxima" com a aba de destino;
  - `irParaAba('tags')` a partir do Modo Simples religa o Avançado e chega na aba certa;
  - 0 ocorrências de `Uncaught` / `is not defined`.
- **Falhas encontradas no caminho**: (a) a faixa de acentos combinantes escrita literal na regex de `semAcento` virava bytes invisíveis no arquivo — trocada por `new RegExp('[\u0300-\u036f]','g')`; (b) o primeiro harness de teste usava caminhos `file:///tmp/...`, que o Chrome no Windows não resolve — os testes só passaram a valer usando caminho absoluto do Windows.
- **Não coberto pelo teste**: aparência real (quebra de linha dos grupos em telas estreitas) e o foco automático do campo de busca, que dependem de renderização/interação de verdade.

### 2026-07-24 — Glossário e dicas "?" (checklist 14 e 15)
- **O quê**: uma fonte única (`GLOSSARIO`, 35 verbetes em 6 categorias, cada um com título, explicação e exemplo) alimenta as duas entregas:
  - **14** — `aj(chave)` gera um "?" ao lado do campo: hover mostra o resumo no `title`, clique abre o verbete. `field()` ganhou um 3º parâmetro opcional (a chave) e `tit()` põe o "?" no título de um card. Ligado em ~24 pontos: dump, fórmula do modificador, tipo de recurso, recarga, gasto por rodada, graus de treino, bônus ao treinar, perícia automática, slots, sintonização, carga, crítico natural, modo de rolagem, eixo de progressão, pontos de escolha, condição composta, tags, matriz de interação, tier de técnica e arquivo .nexus.
  - **15** — glossário completo em modal, com filtro por texto (ignora acento), aberto pelo botão 📖 no breadcrumb, por um card na aba Início (com 8 atalhos para os termos mais confusos) ou por qualquer "?". Os verbetes também entraram na busca Ctrl+K, marcados como "📖 glossário".
- **Estado novo**: `S.ui.gloss` (`{termo}` ou `{q}`); Esc fecha; o atalho do editor de ficha é suspenso enquanto o modal está aberto.
- **Testes** (Chrome headless `--dump-dom`, estado injetado):
  - as 17 abas seguem renderizando; "?" por aba: recursos 11, perícias 17, itens 3, regras 2, progressão 2, dados 2, tags 2, escolhas/condições/técnicas/sistema 1 cada;
  - `GLOSS_MAP` com 35 verbetes; modal completo lista 35 itens em 6 categorias;
  - abrir por termo (`sintonia`) mostra o título "📖 Sintonização" e o bloco de exemplo;
  - filtro "exaust" reduz para 1 verbete;
  - Ctrl+K com "sintoniz" devolve os dois caminhos: o ajuste (🎒 Itens) e o verbete (📖 glossário);
  - 0 erros de JS.
- **Falhas**: nenhuma nova. Observação: a primeira rodada de substituições deixou 5 campos sem efeito (o texto trocado era idêntico ao original) — só apareceu na contagem de "?" por aba, e foi corrigido numa segunda passada.
- **Não coberto**: aparência do modal em tela estreita e o comportamento do `title` no hover, que dependem de interação real.

### 2026-07-24 — Campo de fórmula unificado (checklist 19 a 25)
- **O quê**: um componente só, `campoFormula(sys, obj, chave, opts)`, resolve os sete itens de uma vez. Todo campo de fórmula do app passou a usar ele:
  - **25** realce de sintaxe por espelho — um `<div>` colorido embaixo e o `<input>` por cima com texto transparente (variável azul, função roxa, número âmbar, operador cinza, desconhecido em vermelho ondulado);
  - **21** autocomplete de variáveis e funções ao digitar, com ↑ ↓ / Enter / Tab / Esc;
  - **19** botão "⊞ Montar" abre um construtor por chips: clicar insere no cursor, com espaçamento automático;
  - **20** lista de variáveis disponíveis com o valor de cada uma no último degrau;
  - **24** fórmulas prontas de 1 clique, específicas por contexto (recurso, defesa, carga, modificador, proficiência, recarga, gasto por rodada, custo) e escritas com os nomes reais dos atributos do sistema;
  - **22** prévia em 3 pontos (degrau inicial, meio e máximo) em vez de só "atributos no máximo" — `varsNoDegrau` interpola o valor do atributo por degrau e ainda lê colunas numéricas da tabela de progressão;
  - **23** erro específico com `analisarFormula`: variável inexistente (com "você quis dizer" por distância de edição e botão que corrige sozinho), parêntese faltando com contagem, fórmula terminada em operador, símbolo inválido nomeado.
- **Pontos trocados (8)**: fórmula do recurso, fórmula da recarga, gasto por rodada, fórmula de proficiência, fórmula do modificador (com prévia em V=8/10/14/18 em vez de degraus), carga máxima, custo base do tier e fórmula de armadura. As prévias antigas, feitas à mão em cada lugar, foram removidas.
- **Testes** (Chrome headless `--dump-dom`, estado injetado):
  - as 17 abas renderizam; campos de fórmula por aba com o exemplo padrão: recursos 7, itens 1; ligando os modos condicionais — regras (modo modificador) 1, perícias (proficiência mult) 1, técnicas (construtor ativo) 1, itens (armadura ligada) 2;
  - diagnóstico: `Vigr * 10` → "Não conheço “Vigr”" + sugestão "Vigor"; `(Vigor` → "Falta fechar 1 parêntese."; `((Vigor` → "Faltam fechar 2 parênteses."; `10 +` → "termina num operador"; `10 # 2` → "O símbolo “#” não vale"; `piso(Vigor / 2) + 10` → válida;
  - realce de `piso(Vigor / 2) + Xyz` marca 1 função, 1 variável, 1 número e 1 desconhecido;
  - prévia mostra os 3 degraus ("Nível 1: 15 | Nível 6: 25 | Nível 10: 35");
  - construtor abre com 30 chips em 4 grupos, 5 fórmulas prontas; clicar numa preencheu o campo com "10 + Força";
  - botão de correção troca `Vigr * 3` por `Vigor * 3` e a borda vermelha some; autocomplete de "Vig" oferece "Vigor (variável)";
  - ficha do jogador segue montando os 11 blocos; 0 erros de JS.
- **Falhas encontradas no caminho**: (a) em 3 dos 8 pontos usei um atalho (`campoFormula(...) && h('input'...)`) que descartava o componente e mantinha o campo antigo escondido — pego na revisão e refeito; (b) a mensagem de erro mostrava a variável em minúsculas, porque o tokenizador normaliza palavras desconhecidas — passou a mostrar como o mestre digitou; (c) escrever a regex de escape via script Python corrompeu as barras invertidas, e o arquivo ficou com `/[.*+?^${}()|[\]\]/` — corrigido à mão e reconferido no arquivo.
- **Não coberto**: o alinhamento visual do espelho de realce (fonte/padding do `<div>` e do `<input>` precisam bater ao pixel) só dá para conferir a olho, com o campo rolando na horizontal.

---

## Checklist de melhorias aprovadas

Ideias selecionadas para implementar. Marcar `[x]` conforme forem entregues (cada entrega vira uma entrada no log acima).

### Navegação e estrutura do modo Mestre
- [x] **1. Agrupar as 16 abas em 4 grupos** — Fundação / Personagem / Mundo & Regras / Saída, com sub-abas.
- [x] **2. Separar abas essenciais das avançadas** — Tags, Condições e Técnicas são módulos opcionais e não devem parecer obrigatórios.
- [x] **3. Badge de contagem em cada aba** — ex.: "🎯 Perícias 12".
- [x] **4. Ponto de alerta na aba com problema** — fórmula inválida, classe sem habilidade, regra impossível.
- [x] **5. Botão "Próximo passo →"** no rodapé de cada aba, guiando a ordem sugerida.
- [x] **6. Barra de progresso do sistema** — "7 de 12 passos essenciais prontos".
- [x] **7. Aba "Início" com checklist clicável** do que falta para o sistema ficar jogável.
- [x] **8. Busca global (Ctrl+K)** — pular direto para qualquer campo pelo nome.
- [x] **9. Modo Simples / Avançado** — o Simples esconde Tags, Condições, Técnicas, Escolhas e Progressão.
- [x] **10. Breadcrumb fixo** — "Campanha X › Regras › Criação Inicial".

### Onboarding
- [x] **14. Tooltips "?" nos campos técnicos** — dump, sintonização, tier, escopo de rolagem.
- [x] **15. Glossário** — o que é slot, tag, tier, degrau, escopo.

### Fórmulas
- [x] **19. Construtor visual de fórmula** — montar por chips clicáveis em vez de digitar.
- [x] **20. Lista de variáveis disponíveis clicável** ao lado de todo campo de fórmula.
- [x] **21. Autocomplete** de atributo/recurso/nível ao digitar.
- [x] **22. Prévia em 3 pontos** — nível mínimo, médio e máximo (hoje só o máximo).
- [x] **23. Erro de fórmula específico** — dizer qual variável não existe e sugerir a parecida.
- [x] **24. Fórmulas prontas de 1 clique** — "10 + Vigor×5", "8 + modificador", "piso(Nível/2)".
- [x] **25. Realce de sintaxe** no campo de fórmula (variáveis e funções coloridas).

### Editor de ficha
- [ ] **32. Estilos nomeados / tema da ficha** — mudar a cor de acento e todos os blocos acompanham.
- [ ] **33. Mais modelos prontos** — compacta 1 página, retrato, caderno, cartão de NPC.
- [ ] **36. Ficha responsiva para celular** — empilhamento automático do layout em canvas.
- [ ] **37. Botões ↶ ↷ visíveis** na barra, não só atalho de teclado.
- [ ] **38. Lixeira / restaurar bloco removido**.
- [ ] **39. Snap entre blocos** com indicação de espaçamento igual, além da grade.
- [ ] **40. Miniatura do bloco na paleta**, não só o nome.

### Visual
- [ ] **56. Tema claro** além do escuro.
- [ ] **57. Aumentar contraste** dos textos `--muted` / `--dim`.
- [ ] **59. Padronizar o conjunto de ícones** — hoje mistura estilos de emoji.
