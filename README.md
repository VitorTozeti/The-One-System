# Nexus RPG — Protótipo

Aplicação **100% offline**, sem build, sem dependências. Abra o `index.html` com dois
cliques. Os dados ficam salvos no navegador (LocalStorage).

## Como abrir
Basta abrir `index.html` no navegador. Não precisa de servidor, internet nem instalação.

> Os scripts são carregados como **scripts clássicos** (não módulos ES) de propósito:
> assim continuam funcionando via `file://` sem servidor local.

## Estrutura de pastas

```
index.html                 → só a "casca": carrega o CSS e os scripts na ordem certa
assets/
  css/
    styles.css             → todo o visual (antes estava embutido no <style>)
src/
  auth/                    → contas (login local) e hub de personagens
    accounts.js            → camada de dados: contas, sessão, personagens
    auth-ui.js             → telas de login/cadastro e "Meus personagens"
  core/                    → núcleo, sem dependência de UI
    helpers.js             → h()/node(), storage, esc(), sign(), uid()
    formula-engine.js      → MOTOR DE FÓRMULAS (parser/avaliador de expressões)
    dice-engine.js         → MOTOR DE DADOS (rolagens)
    state.js               → ESTADO global (S) + render()
    history.js             → Desfazer / Refazer
  data/
    example-system.js      → sistema de exemplo, migração e criação de ficha (initDraft)
  ui/                      → UI compartilhada
    shortcuts.js           → atalhos do editor
    ui-basic.js            → componentes básicos
    glossary.js            → glossário e dicas
    formula-field.js       → campo de fórmula + mestreView()
  master/                  → tela do Mestre
    master-nav.js          → navegação do Mestre
    master-pieces.js       → editores das "Peças" (pontos de escolha, condições, tags,
                             rolador, orçamento de técnica, etc.)
  player/
    player.js              → tela do Jogador (jogadorView) e blocos da ficha
  app.js                   → monta o cabeçalho e dispara render() — carregado por ÚLTIMO
```

## Ordem de carregamento (importante)

O código usa **funções e variáveis globais**. Por isso a ordem dos `<script>` no
`index.html` importa — cada arquivo depende dos anteriores:

1. `core/helpers` → `core/formula-engine` → `core/dice-engine`
2. `data/example-system`
3. `core/state` → `core/history`
4. `ui/*`
5. `master/*`
6. `player/player`
7. `app.js` (contém a chamada `render()` inicial e **deve ser o último**)

## Contas e personagens (login local)

O app abre numa tela de **login**. Você cria uma **conta** (usuário + senha) e, dentro
dela, cria **personagens**:

- **Personagem Mestre** → abre o editor de sistema (as regras).
- **Personagem Jogador** → abre a ficha.

O **tipo do personagem selecionado** é o que libera o acesso — um Jogador nunca vê o
editor do Mestre. Cada conta só enxerga os próprios personagens (isolamento).

Dados no LocalStorage:

```
nexus_accounts    → [ {id, name, pass, createdAt} ]
nexus_session     → { accountId, personagemId } | null
nexus_acct_<id>   → { personagens: [ {id, kind, name, system|draft+saved} ] }
```

> ⚠️ **Só para teste:** a senha é guardada em **texto plano**, sem criptografia nem
> servidor. Não é segurança real — não use uma senha de verdade. Dados antigos (de antes
> das contas) são migrados automaticamente para uma "Conta local" (senha `1234`).

## Onde mexer para customizar

- **Aparência (cores, layout):** `assets/css/styles.css` (variáveis em `:root`).
- **Regras/atributos do sistema de exemplo:** `src/data/example-system.js`.
- **Fórmulas e funções disponíveis:** `src/core/formula-engine.js`.
- **Tela do Mestre:** `src/master/`.
- **Tela do Jogador / ficha:** `src/player/player.js`.
