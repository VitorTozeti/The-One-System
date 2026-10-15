/* ============================================================ TÉCNICAS / MAGIAS — MODELOS, USO E ATIVAÇÃO ============================================================
   Técnica e magia são a mesma coisa aqui: uma habilidade com efeitos mecânicos.
   Este arquivo faz criar uma delas ser rápido e dá poder de "jogar" com ela na ficha:
     • MODELOS prontos (cura, buff de defesa, voo, recurso especial…) — um clique cria a técnica com ícone, texto, efeitos e custo
     • USO (aba 🪄 Usar no cartão): custo em um recurso (Mana…), efeito em um recurso (cura/dano com dados) ou LIGA/DESLIGA
         - Instantânea: botão "✨ Usar" na ficha — paga o custo e aplica a fórmula num recurso (ex.: cura 2d8 + Nível na Vida)
         - Ativa: botão liga/desliga — os efeitos (defesa +3, voo…) só valem enquanto ligada; ligar paga o custo
   Os efeitos do cartão continuam sendo os de sempre (effectRow): recursos, rolagem, resistência, capacidade, código…
   Depende de: classes-origens.js (helpers _rol/_res/_cap, _recPor, _V/_M), master-pieces.js (campoFormula), icon-picker.js. */

/* ---------- modelos ---------- */
const _DEF_NOMES=['Defesa','CA','Armadura','Classe de Armadura'], _EST_NOMES=['Estamina','Vigor','Energia','PA','Pontos de Ação'];
const _fx=(o)=>Object.assign({id:uid(),targetId:'',value:0,text:'',charType:'tag',mods:[]},o);
/* c=categoria · ic=ícone · d=descrição · efs(sys)=efeitos · uso(sys)=configuração de uso (rec: nomes de recurso) */
const MODELOS_TECNICA=[
  {c:'Cura e vida',n:'Cura',ic:'💚',d:'Fecha ferimentos de si mesmo ou de um aliado.',
   uso:s=>({modo:'instantaneo',custo:['3',_M],alvo:_V,formula:'2d8 + Nível',texto:'Uma luz suave fecha os ferimentos.'})},
  {c:'Cura e vida',n:'Vigor ampliado',ic:'❤️',d:'Aumenta a Vida máxima, cada vez mais com o nível.',
   efs:s=>[_efRecF(s,_V,'Nível * 2')]},
  {c:'Cura e vida',n:'Regeneração',ic:'🌿',d:'Recupera um pouco de Vida ao usar, sem custo.',
   uso:s=>({modo:'instantaneo',custo:['0',_M],alvo:_V,formula:'1d6 + 1',texto:'O corpo se recompõe devagar.'})},
  {c:'Defesa',n:'Escudo arcano',ic:'🛡️',d:'Uma barreira de energia: enquanto ligada, aumenta a Defesa.',
   efs:s=>[_rol('defesa',4)],uso:s=>({modo:'ativa',custo:['3',_M]})},
  {c:'Defesa',n:'Pele de pedra',ic:'🪨',d:'Defesa maior e golpes físicos machucam menos.',
   efs:s=>[_rol('defesa',2),_res('Físico','reduz',2)]},
  {c:'Defesa',n:'Postura defensiva',ic:'🧱',d:'Enquanto ligada: +3 de defesa, mas ataca com −2.',
   efs:s=>[_rol('defesa',3),_rol('ataque',-2)],uso:s=>({modo:'ativa',custo:['0',_EST_NOMES]})},
  {c:'Defesa',n:'Resistência ao fogo',ic:'🔥',d:'Chamas pouco machucam.',efs:s=>[_res('Fogo','reduz',5)]},
  {c:'Defesa',n:'Imunidade a veneno',ic:'☠️',d:'Nenhum veneno faz efeito.',efs:s=>[_res('Veneno','imune')]},
  {c:'Ataque',n:'Golpe poderoso',ic:'💥',d:'Troca precisão por força bruta: mais dano nos golpes.',efs:s=>[_rol('dano',2)]},
  {c:'Ataque',n:'Fúria',ic:'😡',d:'Enquanto ligada: mais dano e resistência física, gastando estamina ao ligar.',
   efs:s=>[_rol('dano',2),_res('Físico','reduz',3)],uso:s=>({modo:'ativa',custo:['2',_EST_NOMES]})},
  {c:'Ataque',n:'Mira certeira',ic:'🎯',d:'Seus ataques acertam com mais facilidade.',efs:s=>[_rol('ataque',2)]},
  {c:'Ataque',n:'Bola de fogo',ic:'🔥',d:'Explosão em área. Gasta Mana; role o dano na ficha.',
   uso:s=>({modo:'instantaneo',custo:['5',_M],alvo:null,formula:'',texto:'Dano de fogo em área: 6d6 (teste de esquiva reduz à metade).'})},
  {c:'Ataque',n:'Ataque furtivo',ic:'🗡️',d:'Dano extra contra quem está desprevenido.',efs:s=>[_dad('dano',1)]},
  {c:'Poder e magia',n:'Mente afiada',ic:'🧠',d:'Mais Mana, crescendo com o nível.',efs:s=>[_efRecF(s,_M,'Nível * 2')]},
  {c:'Poder e magia',n:'Voo',ic:'🪽',d:'Enquanto ligada, o personagem voa.',efs:s=>[_cap('Voo',9)],uso:s=>({modo:'ativa',custo:['2',_M]})},
  {c:'Poder e magia',n:'Visão no escuro',ic:'👁️',d:'Enxerga no escuro.',efs:s=>[_cap('Visão no escuro',18)]},
  {c:'Poder e magia',n:'Bênção',ic:'🙏',d:'Mais sorte e precisão em tudo.',efs:s=>[_rol('todos',1)],uso:s=>({modo:'ativa',custo:['2',_M]})},
  {c:'Poder e magia',n:'Dom do atributo',ic:'💪',d:'+2 no primeiro atributo do sistema.',efs:s=>[_efAttr(s,[((s.attributes||[])[0]||{}).name||'Força'],2)]},
  {c:'Recursos especiais',n:'Reserva de poder',ic:'⚡',d:'Cria uma barra de 3 cargas que recarrega no descanso longo.',
   efs:s=>[_fx({kind:'recursoNovo',text:'Cargas',value:3,icon:'⚡',recarga:'longo',color:'#f59e0b'})]},
  {c:'Recursos especiais',n:'Fúria acumulada',ic:'🔥',d:'Uma barra de Fúria que cresce com o nível (código: tudo em uma linha).',
   efs:s=>[_fx({kind:'codigo',text:'Fúria acumulada',code:'// Barra de Fúria: 2 + 1 a cada 3 níveis\nfx.novoRecurso("Fúria", 2 + Math.floor(fx.nivel / 3), { icone: "🔥", cor: "#ef4444", recarga: "curto" });'})]},
  {c:'Recursos especiais',n:'Poder que escala (código)',ic:'⌨️',d:'Exemplo de efeito por código que cresce com o nível.',
   efs:s=>[_fx({kind:'codigo',text:'Poder que escala',code:CODIGO_EXEMPLO})]},
];
function modeloEmHab(sys,m,nivel){
  const ab={id:uid(),name:m.n,description:m.d||'',icon:m.ic||'',req:{level:nivel||0,attrs:[]},effects:(m.efs?m.efs(sys):[]).filter(Boolean).map(_ef)};
  sanitizarUsoHab(ab);
  if(m.uso){
    const u=m.uso(sys); const cr=u.custo?_recPor(sys,Array.isArray(u.custo[1])?u.custo[1]:[u.custo[1]]):null;
    const al=u.alvo?_recPor(sys,Array.isArray(u.alvo)?u.alvo:[u.alvo]):null;
    Object.assign(ab.uso,{on:true,modo:u.modo||'instantaneo',custoId:cr?cr.id:'',custo:cr?u.custo[0]:'',alvoId:al?al.id:'',formula:al?(u.formula||''):'',texto:u.texto||''});
  }
  return ab;
}
/* select agrupado + chips das mais comuns; adiciona a técnica pronta na lista */
function modelosTecnica(sys,arr,nivel,aoAdicionar){
  const add=m=>{ const ab=modeloEmHab(sys,m,nivel); arr.push(ab); S.ui.open[ab.id]=true; if(aoAdicionar) aoAdicionar(ab); render(); };
  const sel=h('select',{class:'in rec-sel','aria-label':'Criar a partir de um modelo pronto',style:{maxWidth:'260px'},onchange:e=>{ const m=MODELOS_TECNICA[+e.target.value]; if(m) add(m); }},
    h('option',{value:''},'✨ Criar a partir de um modelo…'));
  [...new Set(MODELOS_TECNICA.map(m=>m.c))].forEach(c=>{ const g=h('optgroup',{label:c});
    MODELOS_TECNICA.forEach((m,i)=>{ if(m.c===c) g.appendChild(h('option',{value:String(i)},m.ic+' '+m.n)); }); sel.appendChild(g); });
  return {sel,add};
}
function modelosRapidos(sys,arr,nivel,titulo){
  const {sel,add}=modelosTecnica(sys,arr,nivel);
  const top=['Cura','Escudo arcano','Fúria','Voo','Vigor ampliado','Reserva de poder','Resistência ao fogo','Golpe poderoso'].map(n=>MODELOS_TECNICA.find(m=>m.n===n)).filter(Boolean);
  return h('div',{class:'modelos'},
    titulo?h('div',{class:'fx-grp'},titulo):null,
    h('div',{class:'row wrapf'},...top.map(m=>h('button',{type:'button',class:'chip',title:m.d,onclick:()=>add(m)},m.ic+' '+m.n)),sel));
}

/* ---------- editor de USO (dentro do cartão) ---------- */
function usoHabResumo(sys,ab){
  const us=ab.uso||{}; if(!us.on) return '';
  const rc=(sys.resources||[]).find(r=>r.id===us.custoId), ra=(sys.resources||[]).find(r=>r.id===us.alvoId);
  const p=[us.modo==='ativa'?'⏻ liga/desliga':'✨ usável'];
  if(rc&&String(us.custo||'').trim()&&String(us.custo).trim()!=='0') p.push('custa '+us.custo.trim()+' '+rc.name);
  if(ra&&String(us.formula||'').trim()&&us.modo!=='ativa') p.push(ra.name+' '+(/^\s*-/.test(us.formula)?'':'+')+us.formula.trim());
  return p.join(' · ');
}
function usoHabEditor(sys,ab){
  sanitizarUsoHab(ab); const us=ab.uso;
  const resSel=(chave,vazio,w)=>{ const s=h('select',{class:'in',style:{maxWidth:w||'200px'},'aria-label':vazio,onchange:e=>{us[chave]=e.target.value;render();}});
    s.appendChild(h('option',{value:''},vazio));
    (sys.resources||[]).filter(r=>(r.type||'barra')!=='valor').forEach(r=>{const o=h('option',{value:r.id},r.name);if(r.id===us[chave])o.selected=true;s.appendChild(o);}); return s; };
  const modoBtn=(v,rot,tit)=>h('button',{type:'button',class:'btn sm '+(us.modo===v?'emerald':'ghost'),title:tit,'aria-pressed':us.modo===v?'true':'false',onclick:()=>{us.modo=v;render();}},(us.modo===v?'✓ ':'')+rot);
  const media=()=>{ if(!String(us.formula||'').trim()) return 'Sem fórmula: só mostra o texto ao usar.';
    const v=mediaExpr(us.formula,varsNoDegrau(sys,Math.max(1,sys.maxLevel||1))); return Number.isNaN(v)?'⚠ fórmula inválida (ex.: 2d8 + 4, 5, Nível * 2)':('Média ≈ '+(Math.round(v*10)/10)+' no '+levelLabel(sys,Math.max(1,sys.maxLevel||1))+'.'); };
  return h('div',{class:'req-box uso-hab'},
    h('div',{class:'lbl'},'🪄 USAR NA FICHA (opcional)'),
    h('div',{class:'row wrapf'},
      h('button',{type:'button',class:'btn sm '+(us.on?'emerald':'ghost'),'aria-pressed':us.on?'true':'false',onclick:()=>{us.on=!us.on;render();}},(us.on?'✓ ':'')+'Pode ser usada'),
      h('span',{class:'hint'},us.on?'O jogador ganha um botão nesta técnica, na ficha.':'Ligue para magias com custo, curas ou poderes que se liga e desliga.')),
    us.on?h('div',{style:{marginTop:'10px'}},
      h('div',{class:'row wrapf'},modoBtn('instantaneo','✨ Instantânea','Clica em Usar: paga o custo e aplica o efeito uma vez'),
        modoBtn('ativa','⏻ Liga/desliga','Os efeitos só valem enquanto estiver ligada; ligar paga o custo')),
      h('div',{class:'grid g2',style:{marginTop:'10px'}},
        field('Custo — recurso',resSel('custoId','— sem custo —')),
        field('Custo — quanto (fórmula)',us.custoId?campoFormula(sys,us,'custo',{tipo:'custo',placeholder:'3',aoMudar:()=>render()}):h('div',{class:'hint'},'Escolha o recurso (ex.: Mana).'))),
      us.modo==='ativa'
        ?h('div',{class:'hint',style:{marginTop:'8px'}},'Ligada: aplica todos os efeitos acima. Desligada: eles não valem. O custo é pago ao ligar.')
        :h('div',{style:{marginTop:'10px'}},
          h('div',{class:'grid g2'},
            field('Mexe em qual recurso (cura/dano)',resSel('alvoId','— nenhum (só texto) —')),
            field('Quanto (aceita dados; negativo = dano)',h('input',{class:'in mono',value:us.formula||'',placeholder:'2d8 + Nível   ou   -1d6',spellcheck:'false',
              oninput:e=>{us.formula=e.target.value;persist();},onchange:()=>render()}))),
          h('div',{class:'hint',style:{marginTop:'4px'}},media())),
      h('div',{style:{marginTop:'10px'}},field('Texto ao usar (opcional)',h('input',{class:'in',value:us.texto||'',placeholder:'Ex.: Uma luz suave fecha os ferimentos.',oninput:e=>{us.texto=e.target.value;persist();}}))),
      h('div',{class:'hint',style:{marginTop:'8px'}},'Resumo: '+(usoHabResumo(sys,ab)||'—')))
    :null);
}

/* ---------- usar / ligar na ficha ---------- */
function _custoDe(ctx,us){
  const r=us.custoId?ctx.allRes.find(x=>x.id===us.custoId):null;
  let custo=0;
  if(r&&String(us.custo||'').trim()){ const c=evalFormula(us.custo,ctx.varsTotal); custo=Number.isNaN(c)?0:Math.max(0,Math.round(c)); }
  return {r,custo};
}
function usarHabilidade(sys,d,ctx,ab){
  const us=ab.uso; if(!us||!us.on) return;
  const {r:rc,custo}=_custoDe(ctx,us);
  if(us.modo==='ativa'){
    if(!d.ativas) d.ativas={};
    if(d.ativas[ab.id]){ delete d.ativas[ab.id]; render(); return showToast(ab.name+' desligada.'); }
    if(rc&&custo>0){ if(rc.cur<custo) return showToast('Sem '+rc.name+' para ligar “'+ab.name+'”: custa '+custo+', você tem '+rc.cur+'.'); d.resCurrent[rc.id]=rc.cur-custo; }
    d.ativas[ab.id]=true; render(); return showToast(ab.name+' ligada'+(rc&&custo>0?(' (−'+custo+' '+rc.name+')'):'')+'.');
  }
  if(rc&&custo>0&&rc.cur<custo) return showToast('Sem '+rc.name+' suficiente para “'+ab.name+'”: custa '+custo+', você tem '+rc.cur+'.');
  const partes=[];
  const cur={}; ctx.allRes.forEach(x=>cur[x.id]=x.cur);
  if(rc&&custo>0){ cur[rc.id]=rc.cur-custo; d.resCurrent[rc.id]=cur[rc.id]; partes.push('−'+custo+' '+rc.name); }
  const ra=us.alvoId?ctx.allRes.find(x=>x.id===us.alvoId):null;
  let msg=us.texto||('Usou '+ab.name);
  if(ra&&String(us.formula||'').trim()){
    const rl=rollExpr(us.formula,ctx.varsTotal); const v=rl.erro?NaN:rl.total;
    if(Number.isNaN(v)) msg='A fórmula de “'+ab.name+'” está inválida — avise o Mestre.';
    else{
      const teto=Number.isNaN(ra.max)?Infinity:ra.max, antes=cur[ra.id];
      const novo=Math.max(0,Math.min(teto,antes+v)); d.resCurrent[ra.id]=novo;
      partes.push(ra.name+' '+sign(v)+' ('+antes+' → '+novo+')');
    }
  }
  render(); showToast(ab.name+(partes.length?(': '+partes.join(' · ')):'')+(us.texto&&partes.length?(' — '+us.texto):''));
}
/* botão que a ficha mostra numa habilidade/técnica usável */
function botaoUsoHab(sys,d,ctx,ab,ligada){
  const us=ab.uso; if(!us||!us.on) return null;
  const {r:rc,custo}=_custoDe(ctx,us);
  const semRec=rc&&custo>0&&rc.cur<custo&&!(us.modo==='ativa'&&ligada);
  const tit=usoHabResumo(sys,ab);
  if(us.modo==='ativa') return h('button',{type:'button',class:'btn sm '+(ligada?'emerald':'ghost'),title:tit,'aria-pressed':ligada?'true':'false',disabled:semRec||null,
    onclick:()=>usarHabilidade(sys,d,ctx,ab)},ligada?'⏻ Ligada':('⏻ Ligar'+(rc&&custo>0?(' · '+custo+' '+rc.name):'')));
  return h('button',{type:'button',class:'btn sm primary',title:tit,disabled:semRec||null,
    onclick:()=>usarHabilidade(sys,d,ctx,ab)},'✨ Usar'+(rc&&custo>0?(' · '+custo+' '+rc.name):''));
}
