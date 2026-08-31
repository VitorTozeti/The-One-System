/* ============================================================ GLOSSÁRIO E DICAS ============================================================
   Cada verbete alimenta duas coisas: o "?" ao lado do campo (dica de hover +
   modal) e a lista completa do glossário. Um lugar só para escrever. */
const GLOSSARIO=[
  ['Regras da mesa',[
    ['degrau','Degrau (nível)','O eixo em que o personagem avança. Você escolhe o nome dele — Nível, NEX, Grau, Círculo — na aba Progressão; o app usa esse nome nas fórmulas e nos textos.','Se você chamar de "NEX", a fórmula "NEX * 2" funciona igual a "Nível * 2".'],
    ['dump','Baixar atributo (dump)','Deixa o jogador colocar um atributo ABAIXO do valor inicial para ganhar pontos extras e subir outro. Serve para personagens desequilibrados de propósito.','Valor inicial 1, mínimo 0: baixar Carisma para 0 devolve 1 ponto para gastar em Força.'],
    ['modificador','Modo Modificador','Em vez de usar o valor cru do atributo, o app converte o número por uma fórmula antes de somar. É o jeito de F&M/D&D: 14 de Força vira +2.','Fórmula "(V - 10) / 2" com V = 14 → +2. Arredonda para baixo.'],
    ['valordireto','Modo Valor direto','O número do atributo entra na conta como está. 7 de Força soma 7. É o jeito de sistemas como Ordem Paranormal.','Sem conversão nenhuma: 3 de Agilidade = +3 no teste.'],
    ['progressaotab','Tabela de progressão','Uma tabela com uma linha por degrau e as colunas que você quiser. Colunas numéricas viram variáveis usáveis em qualquer fórmula.','Coluna "Proficiência" com 2,2,3,3… permite escrever "Proficiência + Força" numa perícia.'],
  ]],
  ['Atributos, perícias e recursos',[
    ['recursobarra','Recurso do tipo Barra','Algo que gasta e volta: Vida, Mana, Sanidade, Munição. Aparece como barra na ficha e tem valor atual separado do máximo.','"Vigor * 10 + 15" define o máximo; o jogador gasta e recupera durante o jogo.'],
    ['recursovalor','Recurso do tipo Valor','Um número fixo calculado, sem barra e sem gasto: Defesa, Deslocamento, Iniciativa.','Defesa = "10 + Agilidade" aparece como um número só.'],
    ['recarga','Recarga','Quando e quanto um recurso volta sozinho. Cada recurso decide isso separado — Vida pode voltar tudo no descanso longo enquanto a Mana volta metade no curto.','Gatilho "Descanso curto", quanto "Metade do máximo".'],
    ['perround','Gasto máximo por rodada','Teto de quanto daquele recurso pode ser gasto numa única rodada. Opcional; deixe vazio para não limitar.','"piso(Nível / 5)" trava o gasto de Mana conforme o degrau.'],
    ['proficiencia','Proficiência','O sistema de "quanto você é treinado" numa perícia. Três modos: nenhum (só bônus fixo por perícia), graus fixos (Treinado +5, Expert +15 — estilo Ordem) ou multiplicador (× um valor que cresce com o degrau — estilo D&D).','No modo multiplicador com fórmula "2 + piso((Nível-1)/4)": Proficiente ×1, Especialista ×2.'],
    ['expertise','Expertise','Não é uma peça separada: é só um grau de proficiência com multiplicador 2. Dobra o bônus de treino naquela perícia.','Grau "Especialista" com mult 2 no modo multiplicador.'],
    ['periciaauto','Perícia automática','Todo personagem tem, sem gastar escolha. Serve para perícias básicas que ninguém deveria ficar sem.','Percepção marcada como automática entra em toda ficha.'],
    ['bonustreino','Bônus ao treinar','Valor fixo somado quando o personagem tem a perícia. Só vale quando a proficiência está no modo "nenhum" — nos outros modos o grau manda.','Perícia ligada a Agilidade com bônus 2: treinada = Agilidade + 2.'],
  ]],
  ['Itens e equipamento',[
    ['slot','Espaço de equipamento (slot)','Um limite de quantos itens daquele tipo ficam equipados ao mesmo tempo. Sem slots, o jogador equipa quantos quiser.','Espaço "Mão" com capacidade 2: cabem duas armas equipadas.'],
    ['sintonia','Sintonização','Um teto GLOBAL de itens mágicos ativos, independente de onde estão equipados. Vem do D&D, mas aqui é só um número: 0 desliga a regra.','Sintonização 3: o personagem só pode ter 3 itens sintonizados ao todo.'],
    ['carga','Carga máxima','Quanto peso o personagem aguenta. É uma fórmula; vazio significa sem limite. O peso vem de cada item.','"Força * 5" com Força 4 → carrega 20.'],
    ['armadura','Armadura que define fórmula','Uma armadura pode SUBSTITUIR a fórmula de um recurso (a Defesa vira "13 + Agilidade") e ainda limitar quanto de um atributo entra na conta.','Cota de malha: fórmula "16", máximo de Agilidade 0 — a Agilidade deixa de contar.'],
  ]],
  ['Dados e combate',[
    ['rollmode','Como o sistema rola','Duas famílias: "soma" (rola uma expressão base e soma bônus — 1d20+5) ou "pool" (rola um dado por ponto de atributo e conta sucessos).','Soma cobre D&D e Ordem; pool cobre sistemas de dados agrupados.'],
    ['escopo','Escopo de rolagem','Onde um modificador de dados se aplica: todas, ataques, testes de perícia, defesa, dano ou técnicas. Serve para efeitos que só valem numa situação.','Condição "Cego": −1 dado no escopo "ataque" apenas.'],
    ['critnat','Crítico natural','O número no dado (não no total) que conta como acerto crítico.','Crítico natural 20 num d20; algumas armas baixam para 19.'],
    ['vantagem','Vantagem / desvantagem','Rola o dado base duas vezes e fica com o melhor (vantagem) ou o pior (desvantagem). No app é o campo "VD": +1 vantagem, −1 desvantagem.','2d20kh1 é o que roda por baixo da vantagem.'],
    ['tag','Tag','Uma etiqueta que classifica dano, elemento, material ou criatura: Fogo, Corte, Paranormal, Morto-vivo.','Uma espada flamejante tem as tags Corte e Fogo.'],
    ['matriz','Matriz de interação','A relação DIRECIONAL entre duas tags: quando A atinge B, o dano multiplica e a quantidade de dados muda. Resistência, vulnerabilidade e ciclo de elementos são a mesma peça.','Fogo ▸ Gelo = ×2 (vulnerabilidade). Fogo ▸ Fogo = ×0,5 (resistência).'],
  ]],
  ['Módulos avançados',[
    ['escolha','Ponto de escolha','Um "escolha N de M" que aparece no assistente do jogador ao atingir um degrau. Subclasse, trilha, talento e dom são todos a mesma peça, com nomes diferentes.','"Subclasse" no degrau 3, escolhe 1 de 4.'],
    ['repetivel','Escolha repetível','Permite que o mesmo ponto de escolha volte a aparecer em degraus posteriores, como talentos que se ganham várias vezes.','"Talento" repetível a cada 4 degraus.'],
    ['reqopcao','Pré-requisito de opção','Trava uma opção até o personagem cumprir a condição: degrau mínimo, atributo mínimo ou ter escolhido outra opção antes. Serve para árvores de talento.','"Golpe Duplo" exige Força 3+ e a opção "Combate Marcial" já escolhida.'],
    ['condicaoniveis','Condição com níveis','Uma condição que empilha em degraus cumulativos, cada nível somando o efeito. É como se faz exaustão.','Exaustão com 6 níveis: cada nível aplica o efeito de novo.'],
    ['condicaocomposta','Condição composta','Uma condição feita de outras. Ligar a composta liga tudo que está dentro dela.','Fatigado = Fraco + Vulnerável.'],
    ['nostack','Não empilhar','Impede que a mesma condição seja aplicada duas vezes somando efeito. Ligado, aplicar de novo não muda nada.','Envenenado com "não empilhar": dois venenos não dobram a penalidade.'],
    ['tier','Tier de técnica','Um degrau de poder do construtor de técnicas. Cada tier define o teto de dano e a fórmula de custo — é o orçamento dentro do qual o jogador inventa a habilidade dele.','Tier 1: teto "2d6", custo "2 + extras".'],
    ['tetodano','Teto de dano','O máximo de dano que uma técnica daquele tier pode ter. O app compara a média da expressão do jogador com a média do teto e bloqueia se passar.','Teto "2d6" (média 7) recusa uma técnica de "3d6" (média 10,5).'],
  ]],
  ['Editor de ficha',[
    ['bloco','Bloco','Cada caixa da ficha: atributos, perícias, foto, texto. Você posiciona livremente no papel e escolhe o que ele mostra.','O bloco "Atributos" pode virar hexágonos em roseta ou uma tabela simples.'],
    ['snap','Encaixe (snap)','Ao arrastar, o bloco gruda na grade e no alinhamento dos outros blocos, com uma guia amarela mostrando o encaixe.','Desligue o snap quando quiser posição livre ao pixel.'],
    ['guiafixa','Guia fixa','Uma linha azul que você prende no papel para alinhar vários blocos. Clique nela para remover.','Uma guia vertical em x=430 divide a ficha em duas colunas.'],
    ['nexus','Arquivo .nexus','Seu sistema inteiro em um arquivo JSON: atributos, regras, classes, itens e o layout da ficha. Serve para levar para outro computador ou compartilhar com outro mestre.','Exportar gera "minha_campanha.nexus".'],
  ]],
];
const GLOSS_MAP=(()=>{ const m={}; GLOSSARIO.forEach(([,itens])=>itens.forEach(v=>{ m[v[0]]={t:v[1],d:v[2],ex:v[3]}; })); return m; })();
/* botão "?" — hover mostra o resumo, clique abre o verbete */
function aj(chave){
  const v=GLOSS_MAP[chave];
  if(!v) return null;
  return h('button',{class:'aj',type:'button',title:v.t+' — '+v.d,
    onclick:e=>{ e.preventDefault(); e.stopPropagation(); S.ui.gloss={termo:chave}; render(); }},'?');
}
/* título de card com "?" ao lado */
function tit(txt,chave){ return h('span',{},txt,aj(chave)); }
function glossItem(v){
  return h('div',{class:'gl-i'}, h('div',{class:'gl-t'},v.t), h('div',{class:'gl-d'},v.d),
    v.ex?h('div',{class:'gl-ex'},'Ex.: '+v.ex):null);
}
function glossOverlay(){
  const g=S.ui.gloss||{};
  const fechar=()=>{ S.ui.gloss=null; render(); };
  const um=g.termo&&GLOSS_MAP[g.termo];
  const busca=h('input',{class:'in',placeholder:'Filtrar verbetes…',value:g.q||'',
    oninput:e=>{ S.ui.gloss.q=e.target.value; lista.innerHTML=''; montar(e.target.value); }});
  const lista=h('div',{});
  const montar=termo=>{
    const t=semAcento((termo||'').trim());
    let achou=0;
    GLOSSARIO.forEach(([cat,itens])=>{
      const vis=itens.filter(v=>!t||semAcento(v[1]+' '+v[2]).includes(t));
      if(!vis.length) return;
      achou+=vis.length;
      lista.appendChild(h('div',{class:'gl-cat'},cat));
      vis.forEach(v=>lista.appendChild(glossItem({t:v[1],d:v[2],ex:v[3]})));
    });
    if(!achou) lista.appendChild(h('div',{class:'busca-vazio'},'Nenhum verbete com “'+termo+'”.'));
  };
  if(!um) montar(g.q||'');
  return h('div',{class:'busca-bg',onclick:e=>{ if(e.target.classList.contains('busca-bg')) fechar(); }},
    h('div',{class:'gl-cx'},
      h('div',{class:'gl-top'},
        h('h3',{}, um?('📖 '+um.t):'📖 Glossário'),
        h('div',{class:'row'},
          um?h('button',{class:'btn sm ghost',onclick:()=>{S.ui.gloss={q:''};render();}},'ver todos'):null,
          h('button',{class:'btn sm ghost',onclick:fechar},'✕ fechar'))),
      h('div',{class:'gl-body'},
        um ? h('div',{}, h('div',{class:'gl-d'},um.d), um.ex?h('div',{class:'gl-ex'},'Ex.: '+um.ex):null)
           : h('div',{}, busca, h('div',{style:{marginTop:'10px'}}, lista)))));
}

