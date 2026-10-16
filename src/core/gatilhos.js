/* ============================================================ GATILHOS DE RECURSO ============================================================
   Regras de EVENTO sem código: "quando [recurso] chegar a 0 / ao máximo → [efeitos]".
   Ficam em  recurso.gatilhos = [{id, quando:'zero'|'cheio', acoes:[{k,alvo,n,modo,texto}]}]
   Ações:  restaurar (alvo = recurso ou '*' = todos; modo = 'max' | 'inicio')
           somar     (alvo = recurso; n = quanto, pode ser negativo)
           aviso     (texto mostrado ao jogador)
   Rodam quando o jogador altera o recurso na ficha (−1, +1, Dano 5, Cheio…).
   Um gatilho NÃO dispara outros gatilhos (evita laços). Depende de: computeSheet, showToast, evalFormula. */

const GATILHO_QUANDO=[['zero','chegar a 0'],['cheio','chegar ao máximo']];
const GATILHO_ACOES=[['restaurar','Restaurar um recurso'],['somar','Somar (ou tirar) de um recurso'],['aviso','Mostrar um aviso']];

/* Valor inicial do recurso: campo "Começa em" (fórmula) ou o máximo. */
function recursoInicio(r,vars,max){
  const f=String(r&&r.start||'').trim();
  if(!f) return max;
  const v=evalFormula(f,vars||{});
  if(Number.isNaN(v)) return max;
  return Number.isNaN(max)?v:Math.max(0,Math.min(v,max));
}

/* Chamado depois de mudar d.resCurrent[id]. Devolve o que foi feito (lista de frases). */
function executarGatilhos(sys,d,id,antes,depois){
  const r=(sys.resources||[]).find(x=>x.id===id);
  if(!r||!(r.gatilhos||[]).length||antes===depois) return [];
  const ctx=computeSheet(sys,d), por={}; ctx.allRes.forEach(x=>{ por[x.id]=x; });
  const me=por[id]; if(!me) return [];
  const feitos=[];
  r.gatilhos.forEach(g=>{
    const dispara=g.quando==='cheio' ? (antes<me.max && depois>=me.max) : (antes>0 && depois<=0);
    if(!dispara) return;
    (g.acoes||[]).forEach(a=>{
      if(a.k==='aviso'){ if(a.texto) feitos.push(a.texto); return; }
      const alvos=(a.alvo==='*')?ctx.allRes.filter(x=>(x.type||'barra')!=='valor'):[por[a.alvo]].filter(Boolean);
      alvos.forEach(t=>{
        if((t.type||'barra')==='valor'||Number.isNaN(t.max)) return;
        const cur=d.resCurrent[t.id]==null?t.cur:d.resCurrent[t.id];
        if(a.k==='restaurar'){
          const alvoV=a.modo==='inicio'?recursoInicio(t,ctx.varsTotal,t.max):t.max;
          d.resCurrent[t.id]=alvoV; feitos.push(t.name+(a.modo==='inicio'?' voltou ao início':' voltou ao máximo'));
        } else if(a.k==='somar'){
          const n=Number(a.n)||0; d.resCurrent[t.id]=Math.max(0,Math.min(t.max,cur+n));
          feitos.push(t.name+' '+(n>=0?'+':'')+n);
        }
      });
    });
  });
  return feitos;
}

/* ---------- Editor (aba "⚡ Gatilhos" do recurso) ---------- */
function gatilhoNovo(){ return {id:uid(),quando:'zero',acoes:[{k:'aviso',texto:''}]}; }
function gatilhoModeloMorte(sys,r){
  const acha=re=>(sys.resources||[]).find(x=>x!==r&&re.test(x.name||''));
  const acoes=[{k:'restaurar',alvo:r.id,modo:'max'}];
  const san=acha(/sanid|mente|raz[aã]o/i), marca=acha(/marca|retorn|corrup|maldi/i);
  if(san) acoes.push({k:'somar',alvo:san.id,n:-5});
  if(marca) acoes.push({k:'somar',alvo:marca.id,n:1});
  acoes.push({k:'aviso',texto:'☠️ Você morreu… e voltou ao ponto de salvamento.'});
  return {id:uid(),quando:'zero',acoes};
}
function gatilhosEditor(sys,r){
  r.gatilhos=Array.isArray(r.gatilhos)?r.gatilhos:[];
  const sel=(opcoes,val,on)=>{ const s=h('select',{class:'in',style:{width:'auto',minWidth:'120px'},onchange:e=>{on(e.target.value);}});
    opcoes.forEach(([v,l])=>{ const o=h('option',{value:v},l); if(v===val) o.selected=true; s.appendChild(o); }); return s; };
  const recs=[['*','todos os recursos'],...(sys.resources||[]).filter(x=>(x.type||'barra')!=='valor').map(x=>[x.id,x.name])];
  const recsSem=recs.filter(x=>x[0]!=='*');
  const acaoLinha=(g,a)=>{
    const partes=[sel(GATILHO_ACOES,a.k,v=>{ a.k=v; if(v!=='aviso'&&!a.alvo) a.alvo=r.id; persist(); render(); })];
    if(a.k==='restaurar') partes.push(sel(recs,a.alvo||r.id,v=>{a.alvo=v;persist();render();}),
      sel([['max','ao máximo'],['inicio','ao valor inicial']],a.modo||'max',v=>{a.modo=v;persist();}));
    else if(a.k==='somar') partes.push(sel(recsSem,a.alvo||r.id,v=>{a.alvo=v;persist();render();}),
      h('input',{class:'in',type:'number',style:{width:'80px'},value:a.n==null?1:a.n,title:'Quanto somar (negativo tira)',oninput:e=>{a.n=Number(e.target.value)||0;persist();}}));
    else partes.push(h('input',{class:'in',style:{flex:'1',minWidth:'200px'},value:a.texto||'',placeholder:'Texto que o jogador vê',oninput:e=>{a.texto=e.target.value;persist();}}));
    partes.push(h('button',{class:'btn mini ghost',type:'button',title:'Remover esta ação',onclick:()=>{g.acoes=g.acoes.filter(x=>x!==a);persist();render();}},'✕'));
    return h('div',{class:'row wrapf',style:{marginBottom:'6px'}},...partes);
  };
  const cartao=g=>h('div',{class:'arq-l',style:{display:'block',marginBottom:'10px',padding:'10px'}},
    h('div',{class:'row wrapf',style:{marginBottom:'8px',alignItems:'center'}},
      h('b',{},'Quando '+r.name+' '),
      sel(GATILHO_QUANDO,g.quando,v=>{g.quando=v;persist();render();}),
      h('button',{class:'btn mini ghost',type:'button',style:{marginLeft:'auto'},onclick:()=>{r.gatilhos=r.gatilhos.filter(x=>x!==g);persist();render();}},'✕ Remover gatilho')),
    h('div',{class:'hint',style:{marginBottom:'6px'}},'então:'),
    ...(g.acoes||[]).map(a=>acaoLinha(g,a)),
    h('button',{class:'btn sm ghost',type:'button',onclick:()=>{ g.acoes.push({k:'aviso',texto:''}); persist(); render(); }},'+ ação'));
  return h('div',{},
    h('div',{class:'hint',style:{marginBottom:'10px'}},'Regras de evento sem código: quando o jogador mexer em “'+r.name+'” e ela chegar ao ponto escolhido, o app aplica as ações sozinho — ex.: morrer e voltar, colapso mental, subir a Marca.'),
    r.gatilhos.length?h('div',{},...r.gatilhos.map(cartao)):h('div',{class:'vazio'},h('div',{class:'vazio-t'},'Nenhum gatilho ainda'),h('div',{class:'hint'},'Sem gatilho, zerar o recurso não faz nada além de esvaziar a barra.')),
    h('div',{class:'row wrapf',style:{marginTop:'10px'}},
      h('button',{class:'btn sm primary',type:'button',onclick:()=>{ r.gatilhos.push(gatilhoNovo()); persist(); render(); }},'+ Novo gatilho'),
      h('button',{class:'btn sm',type:'button',title:'Ao chegar a 0: restaura este recurso, tira Sanidade, sobe a Marca (se existirem) e avisa',
        onclick:()=>{ r.gatilhos.push(gatilhoModeloMorte(sys,r)); persist(); render(); }},'✨ Modelo: Retorno pela Morte')));
}
