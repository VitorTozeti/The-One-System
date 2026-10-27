/* ============================================================ CAIXAS, RELÓGIOS E ASPECTOS ============================================================
   • Recurso com r.visual = 'caixas' (estresse do Fate/Blades: quadradinhos marcáveis) ou 'relogio'
     (relógio de N segmentos, Blades/PbtA). É a MESMA barra por baixo (cur/max), então gatilhos,
     morte e descanso continuam valendo — só muda o desenho e o clique.
   • Aspectos (Fate): sys.aspectos = {on, nome, fixos:[{id,nome}], livres, bonus, recursoId}.
     Na ficha: d.aspectos = {slotId: texto} e d.aspLivres = [{id,t}]. "Invocar" gasta 1 do recurso
     escolhido (Pontos de Destino) e soma +bônus na última rolagem, ou rola de novo.
   Depende de player.js/regras-extra.js em tempo de execução. */

/* ---------------- recurso desenhado como caixas ou relógio ---------------- */
const VISUAIS_RECURSO=[['barra','📊 Barra'],['caixas','☐ Caixas marcáveis'],['relogio','🕒 Relógio']];
function visualDoRecurso(r){ return (r.type||'barra')==='valor'?'barra':(VISUAIS_RECURSO.some(v=>v[0]===r.visual)?r.visual:'barra'); }
/* caixas: clicar na caixa N marca até ela; clicar na última marcada desmarca */
function caixasInner(r,setRes,ctrl){
  const max=Number.isNaN(r.max)?0:Math.max(0,Math.min(40,r.max));
  if(!max) return h('div',{class:'hint'},'Máximo 0 — confira a fórmula de '+r.name+'.');
  return h('div',{class:'cx-linha',role:'group','aria-label':r.name+': '+r.cur+' de '+max+' marcadas'},
    ...Array.from({length:max},(_,i)=>{
      const on=i<r.cur;
      return h('button',{type:'button',class:'cx'+(on?' on':''),style:on?{background:r.color,borderColor:r.color}:{borderColor:r.color},
        'aria-pressed':on?'true':'false','aria-label':'Caixa '+(i+1),disabled:!ctrl,
        onclick:()=>setRes(r.id,(i+1===r.cur)?i:i+1,r.max)},on?'✕':'');
    }));
}
/* relógio: pizza com N fatias; clique avança, botão volta */
function relogioInner(r,setRes,ctrl){
  const n=Number.isNaN(r.max)?0:Math.max(0,Math.min(24,r.max));
  if(n<2) return h('div',{class:'hint'},'Um relógio precisa de 2 a 24 segmentos (máximo de '+r.name+').');
  const NS='http://www.w3.org/2000/svg', svg=document.createElementNS(NS,'svg');
  svg.setAttribute('viewBox','-1.1 -1.1 2.2 2.2'); svg.setAttribute('class','relogio');
  svg.setAttribute('role','img'); svg.setAttribute('aria-label',r.name+': '+r.cur+' de '+n+' segmentos');
  for(let i=0;i<n;i++){
    const a0=(i/n)*2*Math.PI-Math.PI/2, a1=((i+1)/n)*2*Math.PI-Math.PI/2;
    const p=document.createElementNS(NS,'path');
    p.setAttribute('d','M0 0 L'+Math.cos(a0)+' '+Math.sin(a0)+' A1 1 0 0 1 '+Math.cos(a1)+' '+Math.sin(a1)+' Z');
    p.setAttribute('fill',i<r.cur?(r.color||'#ef4444'):'transparent');
    p.setAttribute('stroke','currentColor'); p.setAttribute('stroke-width','0.04');
    svg.appendChild(p);
  }
  return h('div',{class:'relogio-box'},
    h('button',{type:'button',class:'relogio-btn',disabled:!ctrl,title:'Clique para marcar mais um segmento',
      onclick:()=>setRes(r.id,r.cur+1,r.max)},svg),
    h('div',{},
      h('div',{class:'hint'},r.cur>=n?'⏰ Completo!':(n-r.cur)+' para completar'),
      ctrl?h('div',{class:'row',style:{marginTop:'4px'}},
        h('button',{class:'btn sm',type:'button',onclick:()=>setRes(r.id,r.cur-1,r.max)},'−1'),
        h('button',{class:'btn sm',type:'button',onclick:()=>setRes(r.id,r.cur+1,r.max)},'+1'),
        h('button',{class:'btn sm ghost',type:'button',onclick:()=>setRes(r.id,0,r.max)},'Zerar')):null));
}
/* botões "Mostrar como" no editor do recurso */
function botoesVisualRecurso(r){
  if((r.type||'barra')==='valor') return null;
  const v=visualDoRecurso(r);
  return h('div',{class:'row wrapf',style:{marginTop:'6px'}}, h('span',{class:'hint'},'Mostrar na ficha como:'),
    ...VISUAIS_RECURSO.map(([k,l])=>h('button',{type:'button',class:'btn sm '+(v===k?'emerald':'ghost'),'aria-pressed':v===k?'true':'false',
      title:k==='caixas'?'Quadradinhos que o jogador marca (estresse, trauma). Começa vazio.':k==='relogio'?'Pizza dividida em segmentos que vão sendo preenchidos. Começa vazio.':'Barra com valor atual e máximo',
      onclick:()=>{ r.visual=k; if(k!=='barra'){ r.contador=true; r.start='0'; } render(); }},(v===k?'✓ ':'')+l)));
}

/* ---------------- aspectos ---------------- */
function sanitizarAspectos(sys){
  const a=(sys.aspectos&&typeof sys.aspectos==='object')?sys.aspectos:{};
  a.on=!!a.on;
  a.nome=(typeof a.nome==='string'&&a.nome.trim())?a.nome.slice(0,30):'Aspectos';
  a.fixos=(Array.isArray(a.fixos)?a.fixos:[]).filter(x=>x&&typeof x==='object').slice(0,12)
    .map(x=>({id:typeof x.id==='string'?x.id:uid(), nome:String(x.nome||'Aspecto').slice(0,40)}));
  a.livres=Math.max(0,Math.min(12,parseInt(a.livres)||0));
  a.bonus=Math.max(1,Math.min(20,parseInt(a.bonus)||2));
  a.recursoId=typeof a.recursoId==='string'?a.recursoId:'';
  sys.aspectos=a; return a;
}
function sanitizarAspectosFicha(d){
  if(!d.aspectos||typeof d.aspectos!=='object'||Array.isArray(d.aspectos)) d.aspectos={};
  if(!Array.isArray(d.aspLivres)) d.aspLivres=[];
}
/* última rolagem que dá para refazer (perícia ou bloco Dados) — guardada em memória, não no save */
let _refazerRolagem=null;
function guardarRolagem(fn){ _refazerRolagem=fn; }
function invocarAspecto(sys,d,ctx,texto,como){
  const a=sys.aspectos;
  const rec=a.recursoId&&ctx.allRes.find(r=>r.id===a.recursoId);
  const res=S.dice.result;
  if(como==='bonus'&&(!res||res.total==null)) return showToast('Role primeiro — a invocação soma +'+a.bonus+' na última rolagem.',3500);
  if(como==='rerrolar'&&!_refazerRolagem) return showToast('Role primeiro — a invocação rola de novo a última rolagem.',3500);
  if(rec){
    if(rec.cur<=0) return showToast('Sem '+rec.name+' para invocar.',3000);
    d.resCurrent[rec.id]=rec.cur-1;
  }
  const gasto=rec?(' (−1 '+rec.name+')'):'';
  if(como==='bonus'){
    res.total+=a.bonus;
    const rot=typeof faixaDe==='function'?faixaDe(sys,res.total):null;
    if(rot) res.titulo=String(res.titulo||'Rolagem')+'  → '+rot.ic+' '+rot.t;
    res.sub=(res.sub||'')+'   +'+a.bonus+' invocando “'+texto+'”';
    avisaResultado(res);
  } else {
    _refazerRolagem();
    if(S.dice.result) S.dice.result.sub=(S.dice.result.sub||'')+'   (rerrolado invocando “'+texto+'”)';
    render();
  }
  if(gasto) showToast('🏷 Invocou “'+texto+'”'+gasto,3500);
}
function aspectosInner(sys,d,ctx,b,mode){
  const a=sanitizarAspectos(sys); sanitizarAspectosFicha(d);
  if(!a.on) return h('div',{class:'hint'},'Aspectos desligados (Mestre → Dados → Aspectos).');
  const joga=mode==='play';
  const linha=(rotulo,valor,onTexto,onRemover)=>h('div',{class:'asp-lin'},
    rotulo?h('div',{class:'asp-rot'},rotulo):null,
    h('div',{class:'row',style:{gap:'6px',alignItems:'center'}},
      h('input',{class:'in asp-in',value:valor||'',placeholder:'escreva uma frase marcante…',maxlength:'80','aria-label':rotulo||'Aspecto',
        oninput:e=>{onTexto(e.target.value);persist();}}),
      joga&&(valor||'').trim()?h('button',{type:'button',class:'btn sm emerald',title:'Soma +'+a.bonus+' na última rolagem',
        onclick:()=>invocarAspecto(sys,d,ctx,valor.trim(),'bonus')},'+'+a.bonus):null,
      joga&&(valor||'').trim()?h('button',{type:'button',class:'btn sm ghost',title:'Rola de novo a última rolagem',
        onclick:()=>invocarAspecto(sys,d,ctx,valor.trim(),'rerrolar')},'↻'):null,
      onRemover?h('button',{type:'button',class:'btn sm danger','aria-label':'Remover aspecto',onclick:onRemover},'✕'):null));
  const rec=a.recursoId&&ctx.allRes.find(r=>r.id===a.recursoId);
  return h('div',{},
    joga?h('div',{class:'hint',style:{marginBottom:'6px'}},'Role um dado e depois invoque um aspecto: +'+a.bonus+' ou ↻ rolar de novo'+(rec?(' (gasta 1 '+rec.name+': '+rec.cur+' sobrando)'):'')+'.'):null,
    ...a.fixos.map(f=>linha(f.nome,d.aspectos[f.id],v=>{d.aspectos[f.id]=v;},null)),
    ...d.aspLivres.map((x,i)=>linha(null,x.t,v=>{x.t=v;},()=>{d.aspLivres.splice(i,1);render();})),
    d.aspLivres.length<a.livres?h('button',{type:'button',class:'btn sm ghost',style:{marginTop:'4px'},
      onclick:()=>{d.aspLivres.push({id:uid(),t:''});render();}},'+ Aspecto ('+d.aspLivres.length+'/'+a.livres+')'):null);
}
/* config do mestre (aba Dados) */
function cardAspectos(sys){
  const a=sanitizarAspectos(sys);
  const recs=(sys.resources||[]).filter(r=>(r.type||'barra')!=='valor');
  const recSel=h('select',{class:'in',onchange:e=>{a.recursoId=e.target.value;render();}},
    h('option',{value:''},'não gasta nada'),
    ...recs.map(r=>{const o=h('option',{value:r.id},(r.icon?r.icon+' ':'')+r.name); if(r.id===a.recursoId) o.selected=true; return o;}));
  return card('🏷 Aspectos','Frases que definem o personagem (“Ex-soldado assombrado pela guerra”). O jogador invoca uma para ganhar +'+a.bonus+' ou rolar de novo — estilo Fate.',
    h('button',{class:'btn sm '+(a.on?'emerald':'ghost'),'aria-pressed':a.on?'true':'false',onclick:()=>{ a.on=!a.on; if(a.on){ if(!a.fixos.length) a.fixos=[{id:uid(),nome:'Conceito'},{id:uid(),nome:'Dificuldade'}]; if(!a.livres) a.livres=3; garantirBlocoFicha(sys,'aspectos'); } render(); }},a.on?'✓ Ligado':'Desligado'),
    a.on?h('div',{},
      h('div',{class:'grid g2'},
        field('Nome na ficha',h('input',{class:'in',value:a.nome,maxlength:'30',oninput:e=>{a.nome=e.target.value;persist();},onchange:()=>render()})),
        field('Bônus ao invocar',h('input',{class:'in',type:'number',min:'1',max:'20',value:a.bonus,onchange:e=>{a.bonus=Math.max(1,parseInt(e.target.value)||2);render();}})),
        field('Invocar gasta 1 de',recSel),
        field('Aspectos livres (o jogador escreve)',h('input',{class:'in',type:'number',min:'0',max:'12',value:a.livres,onchange:e=>{a.livres=Math.max(0,Math.min(12,parseInt(e.target.value)||0));render();}}))),
      h('div',{class:'hint',style:{margin:'8px 0 4px'}},'Aspectos com nome fixo (todo personagem tem):'),
      ...a.fixos.map((f,i)=>h('div',{class:'row',style:{gap:'6px',marginBottom:'6px'}},
        h('input',{class:'in',style:{flex:'1'},value:f.nome,maxlength:'40','aria-label':'Nome do aspecto fixo',oninput:e=>{f.nome=e.target.value;persist();}}),
        h('button',{type:'button',class:'btn sm danger','aria-label':'Remover',onclick:()=>{a.fixos.splice(i,1);render();}},'✕'))),
      h('button',{type:'button',class:'btn sm ghost',onclick:()=>{a.fixos.push({id:uid(),nome:'Novo aspecto'});render();}},'+ Aspecto fixo'),
      h('div',{class:'hint',style:{marginTop:'6px'}},'Dica: consequências do Fate podem ser aspectos fixos (“Consequência leve (2)”). O bloco “Aspectos” já foi posto na ficha.'))
    :h('div',{class:'hint'},'Desligado: a ficha não mostra aspectos.'));
}
/* põe um bloco na ficha se ele ainda não estiver lá (abaixo de tudo) */
function garantirBlocoFicha(sys,key){
  const sh=sys.sheet; if(!sh||!Array.isArray(sh.blocks)||sh.blocks.some(b=>b.key===key)) return;
  const fundo=sh.blocks.reduce((m,b)=>Math.max(m,(b.y||0)+(b.h||0)),0);
  sh.blocks.push(blk(key,10,fundo+10));
  if(typeof sh.canvasH==='number'&&sh.canvasH<fundo+10+(BLOCK_TYPES[key].h||200)+20) sh.canvasH=fundo+10+(BLOCK_TYPES[key].h||200)+20;
}
/* cria (ou reaproveita pelo nome) um recurso de caixas/relógio — usado pelos estilos prontos */
function garantirRecursoVisual(sys,nome,max,visual,cor,icone){
  let r=(sys.resources||[]).find(x=>x.name.trim().toLowerCase()===nome.toLowerCase());
  if(!r){ r={id:uid(),name:nome,type:'barra',formula:String(max),color:cor||'#ef4444',icon:icone||'',recharge:{trig:'nunca',amt:'tudo',formula:''},perRound:''}; sys.resources.push(r); }
  r.visual=visual; r.contador=visual!=='barra'; if(r.contador) r.start='0'; r.formula=String(max);
  return r;
}
