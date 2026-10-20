/* ============================================================ COMBATE — TÉCNICAS NOS ALVOS, MORTE, FASES, INVOCAÇÕES ============================================================
   Liga as fichas (jogadores importados e inimigos do bestiário) ao rastreador de iniciativa:
     • ✨ técnica → escolhe os alvos → rola ataque contra a Defesa de cada um OU o teste de resistência
       de cada um → aplica dano/cura (metade se passar), condição e recursos extras → registra no log
     • invocações entram na ordem (logo depois de quem invocou) e saem com ✕
     • regra de morte do sistema (sys.morte) para jogadores e inimigos marcados; fases do chefe; ações lendárias;
       lembrete de concentração ao sofrer dano
   Estado no combatente: x.morte {estado,suc,fal,rodadas}, x.concentrando, x.fasesVistas[], x.lendUsadas, x.invocDe.
   Depende de initiative.js, bestiario-extra.js (varsInimigo), conjuracao.js e tecnicas-editor.js. */

function cbFonte(x){
  if(x.kind==='enemy'){ const sb=S.campaign.bestiary.enemies.find(s=>s.id===x.refId); return sb?{sb:sbExtras(sb)}:null; }
  if(x.kind==='player'){ const p=S.campaign.players.find(pp=>pp.id===x.refId); if(!p||!p.sheet) return null;
    const d=sanitizeDraft(JSON.parse(JSON.stringify(p.sheet)),S.system); return {p,d,ctx:computeSheet(S.system,d)}; }
  return null;
}
function cbTecnicas(x){
  const f=cbFonte(x); if(!f) return [];
  if(f.sb) return f.sb.habs.filter(a=>a.uso&&a.uso.on);
  return (f.ctx.eff.active||[]).filter(a=>a.ab&&a.ab.uso&&a.ab.uso.on&&a.tipo!=='traco').map(a=>a.ab);
}
function cbVarsTotais(x){
  const f=cbFonte(x);
  if(f&&f.sb) return varsInimigo(f.sb);
  if(f&&f.ctx) return f.ctx.varsTotal;
  return Object.assign({'Nível':1,'Nivel':1,'Proficiência':2,'Proficiencia':2},x.vars||{});
}
function cbDefesa(x){
  const f=cbFonte(x);
  if(f&&f.sb){ const n=parseInt(f.sb.defesa); return Number.isNaN(n)?null:n; }
  if(f&&f.ctx){ const r=f.ctx.allRes.find(r=>r.ehDefesa||/^(defesa|ca|armadura|classe de armadura)$/i.test(r.name)); return r&&!Number.isNaN(r.max)?r.max:null; }
  const n=parseInt(x.defesa); return Number.isNaN(n)?null:n;
}
function cbSalvaguarda(x,attr){
  const v=cbVarsTotais(x); const b=(attr&&v[attr]!=null)?v[attr]:0;
  const rr=rollExpr((S.system.rollBase&&/d\d/i.test(S.system.rollBase)?S.system.rollBase:'1d20')+' + '+b,{});
  return rr.erro?0:rr.total;
}

/* ---------- botões dentro da linha expandida ---------- */
function cbAcoesExtra(x){
  const ui=cmp(), tecs=cbTecnicas(x), f=cbFonte(x), sys=S.system;
  const blocos=[];
  if(tecs.length) blocos.push(h('div',{class:'row wrapf'},h('span',{class:'hint'},'Técnicas:'),
    ...tecs.map(ab=>h('button',{type:'button',class:'btn sm',style:{'--tc':tipoInfo(usoTipo(ab.uso)).cor},title:usoHabResumo(sys,ab),
      onclick:()=>{ ui.cbUsar={de:x.id,abId:ab.id,alvos:{},extra:0}; render(); focarPainel('combate'); }},(ab.icon||tipoInfo(usoTipo(ab.uso)).ic)+' '+ab.name))));
  if(f&&f.sb&&f.sb.lendarias&&f.sb.lendarias.n){ const n=f.sb.lendarias.n, u=x.lendUsadas||0;
    blocos.push(h('div',{class:'row wrapf'},h('span',{class:'hint',title:f.sb.lendarias.texto||''},'👑 Ações lendárias: '+(n-u)+'/'+n),
      h('button',{type:'button',class:'btn mini',disabled:u>=n?true:null,onclick:()=>{x.lendUsadas=u+1;cbLog(x.name+' usou uma ação lendária');render();}},'usar'),
      h('button',{type:'button',class:'btn mini ghost',onclick:()=>{x.lendUsadas=0;render();}},'↻'),
      f.sb.lendarias.texto?h('span',{class:'hint'},f.sb.lendarias.texto):null)); }
  if(f&&f.sb&&(f.sb.tracos||f.sb.resist||f.sb.mov)) blocos.push(h('div',{class:'hint'},[f.sb.mov?('🦶 '+f.sb.mov):'',f.sb.resist?('🛡 '+f.sb.resist):'',f.sb.tracos?('📜 '+f.sb.tracos):''].filter(Boolean).join(' · ')));
  if(x.invocAtk) blocos.push(h('div',{class:'row wrapf'},h('button',{type:'button',class:'btn sm primary',onclick:()=>{
    const a=rollExpr(x.invocAtk.acerto,{}), d=rollExpr(x.invocAtk.dano,{});
    cbLog(x.name+' ataca: acerto '+(a.erro?'?':a.total)+', dano '+(d.erro?'?':d.total)); showToast('🐾 '+x.name+': acerto '+(a.erro?'?':a.total)+' · dano '+(d.erro?'?':d.total)); render(); }},'🎲 Atacar ('+x.invocAtk.dano+')')));
  if(x.concentrando) blocos.push(h('div',{class:'row wrapf'},h('span',{class:'mv-chip txt'},'🧠 '+x.concentrando),h('button',{type:'button',class:'btn mini ghost',onclick:()=>{cbLog(x.name+' encerrou a concentração em '+x.concentrando);x.concentrando=null;render();}},'encerrar')));
  const m=x.morte;
  if(m&&m.estado!=='ok'){
    const r=sys.morte||{};
    blocos.push(h('div',{class:'row wrapf rg-morte rg-'+m.estado,style:{padding:'6px 8px'}},
      h('b',{},{caido:'💫 Caído',estavel:'🛌 Estável',morto:'☠ Morto'}[m.estado]),
      m.estado==='caido'&&r.modo==='testes'?h('span',{class:'hint'},'✔ '+m.suc+'/'+r.testes.sucessos+' · ✖ '+m.fal+'/'+r.testes.falhas):null,
      m.estado==='caido'&&r.modo==='contagem'?h('span',{class:'hint'},(r.contagem.nome||'Morrendo')+': '+m.rodadas+' rodada(s)'):null,
      m.estado==='caido'&&r.modo==='testes'?h('button',{type:'button',class:'btn mini primary',onclick:()=>cbMorteTeste(x)},'🎲 Teste contra a morte'):null,
      m.estado==='caido'&&r.modo==='contagem'?h('button',{type:'button',class:'btn mini',onclick:()=>cbMorteRodada(x)},'⏭ Passou uma rodada'):null,
      m.estado==='caido'?h('button',{type:'button',class:'btn mini',onclick:()=>{m.estado='estavel';cbLog(x.name+' foi estabilizado');render();}},'🤝 Estabilizar'):null));
  }
  return blocos.length?h('div',{class:'cb-acoes'},...blocos):null;
}

/* ---------- painel "usar técnica" (escolher alvos) ---------- */
function cbPainelUsar(){
  const ui=cmp(), u=ui.cbUsar; if(!u) return null;
  const cb=cbSt(), x=cb.order.find(o=>o.id===u.de); if(!x){ ui.cbUsar=null; return null; }
  const ab=cbTecnicas(x).find(a=>a.id===u.abId); if(!ab){ ui.cbUsar=null; return null; }
  const sys=S.system, us=ab.uso, tipo=usoTipo(us), tp=tipoInfo(tipo);
  /* lado: invocação fica do lado de quem invocou; NPC sem dono conta como do grupo */
  const lado=o=>{ if(o.invocDe){ const dono=cb.order.find(q=>q.id===o.invocDe); if(dono&&dono!==o) return lado(dono); } return o.kind==='enemy'?'inimigos':'grupo'; };
  const amigo=o=>lado(o)===lado(x);
  const ajuda=tipo==='cura'||tipo==='buff';
  if(!u.iniciou){ u.iniciou=true; cb.order.forEach(o=>{ if(o!==x&&!cbCaido(o)&&(ajuda?amigo(o):!amigo(o))) u.alvos[o.id]=!(us.alvos==='1'&&Object.values(u.alvos).some(Boolean)); }); if(ajuda&&us.alcance==='si') u.alvos={[x.id]:true}; }
  const v=cbVarsTotais(x), mxAum=(us.aumenta&&us.aumenta.formula)?maxAumento(us,v):0;
  const precisaAlvo=!us.invoc&&us.alcance!=='si'||ajuda;
  return h('div',{class:'card cb-usar',style:{'--tc':tp.cor}},
    h('div',{class:'row between'},h('h3',{},(ab.icon||tp.ic)+' '+x.name+' usa '+ab.name),h('button',{type:'button',class:'btn sm ghost','aria-label':'Cancelar',onclick:()=>{ui.cbUsar=null;render();}},'✕')),
    h('div',{class:'hint'},usoHabResumo(sys,ab)),
    precisaAlvo?h('div',{},h('div',{class:'uso-sec-t',style:{marginTop:'8px'}},'Alvos'+(us.alcance==='area'?' (todos na área)':us.alvos&&us.alvos!=='todos'?(' (até '+us.alvos+')'):'')),
      h('div',{class:'row wrapf'},...cb.order.map(o=>h('label',{class:'chip'+(u.alvos[o.id]?' on':'')},
        h('input',{type:'checkbox',checked:!!u.alvos[o.id],onchange:e=>{u.alvos[o.id]=e.target.checked;render();}}),' '+cbIcone(o)+' '+o.name+(cbDefesa(o)!=null?(' · Def '+cbDefesa(o)):'')+(cbCaido(o)?' (caído)':''))))):null,
    mxAum?h('div',{class:'row wrapf',style:{marginTop:'8px'}},h('span',{class:'hint'},'⬆ Aumentar (+'+us.aumenta.formula+' cada):'),
      h('input',{class:'in',type:'number',min:'0',max:String(mxAum),style:{width:'70px'},value:u.extra,onchange:e=>{u.extra=Math.max(0,Math.min(mxAum,parseInt(e.target.value)||0));render();}})):null,
    h('div',{class:'row',style:{marginTop:'10px',justifyContent:'flex-end'}},
      h('button',{type:'button',class:'btn primary',onclick:()=>cbAplicarTecnica(x,ab,u)},'✓ Aplicar')));
}

function cbAplicarTecnica(x,ab,u){
  const sys=S.system, us=ab.uso, tipo=usoTipo(us), v=cbVarsTotais(x), extra=u.extra||0, ui=cmp();
  const alvos=cbSt().order.filter(o=>u.alvos[o.id]);
  const log=[];
  /* custo */
  if(us.custoId&&String(us.custo||'').trim()){
    let c=evalFormula(us.custo,v); c=(Number.isNaN(c)?0:Math.round(c))+custoAumento(us,v,extra);
    const r=(sys.resources||[]).find(rr=>rr.id===us.custoId);
    if(c>0&&r){ const a=(x.res||{})[r.id];
      if(a){ if(a.cur<c) return showToast('Sem '+r.name+': custa '+c+', tem '+a.cur+'.'); a.cur-=c; log.push('−'+c+' '+r.name); }
      else if(cbResVida()&&r.id===cbResVida().id){ cbSetHp(x,(cbHp(x)||0)-c); log.push('−'+c+' '+r.name); } }
  }
  if(us.concentracao){ if(x.concentrando&&x.concentrando!==ab.name) log.push('encerra concentração em '+x.concentrando); x.concentrando=ab.name; }
  const formula=formulaComAumento(us.formula,us,extra);
  const temF=!!String(formula||'').trim();
  const base=temF?rollExpr(formula,v):null; if(base&&base.erro) return showToast('⚠ Fórmula inválida em '+ab.name);
  const cd=us.teste&&us.teste.attr?evalFormula(us.teste.cd||'10',v):NaN;
  const cond=_cond(sys,us.condId);
  alvos.forEach(t=>{
    let n=base?Math.abs(base.total):0, txt=t.name+': ', aplicaCond=true;
    if(us.ataque&&us.ataque.on){
      const a=rolarAtaqueMagia(sys,us,v), def=cbDefesa(t);
      const acertou=a.total!=null&&!a.falha&&(a.crit||def==null||a.total>=def);
      txt+='acerto '+a.total+(def!=null?(' vs '+def):'')+(a.crit?' ★':'')+(acertou?' ✔ ':' ✖ errou ');
      if(!acertou){ n=0; aplicaCond=false; }
      else if(a.crit&&temF){ const rc=rollExpr(formula,v,{crit:true,critMult:2}); if(!rc.erro) n=Math.abs(rc.total); }
    }
    if(us.teste&&us.teste.attr&&!Number.isNaN(cd)){
      const s=cbSalvaguarda(t,us.teste.attr), passou=s>=Math.round(cd);
      txt+='teste '+us.teste.attr+' '+s+' vs '+Math.round(cd)+(passou?' ✔ ':' ✖ ');
      if(passou){ if(us.teste.sucesso==='metade') n=Math.floor(n/2); else if(us.teste.sucesso==='nada') n=0; aplicaCond=false; }
    }
    if(n&&temF){
      if(tipo==='cura'){ cbHpDelta(t,n,false,true); txt+='+'+n+' cura'; }
      else if(usoAplicaEm(us)==='alvo'||tipo==='dano'||tipo==='debuff'){ cbHpDelta(t,-n,false,true); txt+=n+' de dano'+(us.tipoDano?(' '+us.tipoDano):''); }
    }
    (us.extras||[]).filter(e=>e.quem==='alvo'&&e.resId).forEach(e=>{ const rr=rollExpr(e.formula,v); const r=(sys.resources||[]).find(q=>q.id===e.resId);
      if(!rr.erro&&r){ if(cbResVida()&&r.id===cbResVida().id) cbHpDelta(t,rr.total,false,true); else { if(!t.res) cbIniciaRecursos(t); cbResDelta(t,r,rr.total); } txt+=' · '+r.name+' '+sign(rr.total); } });
    if(cond&&us.condEm!=='eu'&&aplicaCond){ if(!t.conds.includes(cond.name)) t.conds.push(cond.name); txt+=' · fica '+cond.name+(us.duracao?(' ('+us.duracao+')'):''); }
    log.push(txt);
  });
  if(cond&&us.condEm==='eu'&&!x.conds.includes(cond.name)){ x.conds.push(cond.name); log.push(x.name+' fica '+cond.name); }
  (us.extras||[]).filter(e=>e.quem==='eu'&&e.resId).forEach(e=>{ const rr=rollExpr(e.formula,v); const r=(sys.resources||[]).find(q=>q.id===e.resId);
    if(!rr.erro&&r){ if(cbResVida()&&r.id===cbResVida().id) cbHpDelta(x,rr.total,false,true); else cbResDelta(x,r,rr.total); log.push(x.name+': '+r.name+' '+sign(rr.total)); } });
  if(us.invoc) log.push(cbInvocar(x,ab,v));
  if(!alvos.length&&base&&!us.invoc) log.push('resultado '+base.total);
  cbLog('✨ '+x.name+' — '+ab.name+(extra?(' (+'+extra+')'):'')+': '+log.join(' | '));
  ui.cbUsar=null; render();
  showToast('✨ '+ab.name+': '+(log.slice(0,3).join(' | ')||'usado'),6000);
}
function cbInvocar(x,ab,v){
  const iv=ab.uso.invoc, cb=cbSt(), q=Math.max(1,Math.min(12,_avalia(iv.qtd,v,1)));
  const pos=cb.order.indexOf(x)+1, novos=[];
  for(let i=0;i<q;i++){
    const hp=Math.max(1,_avalia(iv.vida,v,10));
    const n=cbNovo({name:(iv.icone||'🐾')+' '+iv.nome+(q>1?(' '+(i+1)):''),kind:'npc',hp,hpMax:hp,init:x.init!=null?x.init-0.01:null,invocDe:x.id,defesa:String(_avalia(iv.defesa,v,10)),
      vars:{'Nível':v['Nível']||1},invocAtk:{acerto:'1d20 '+(String(iv.ataque||'+0').trim().match(/^[+\-]/)?iv.ataque:('+ '+iv.ataque)),dano:iv.dano}});
    novos.push(n);
  }
  cb.order.splice(pos,0,...novos);
  return 'invocou '+q+'× '+iv.nome;
}

/* ---------- regra de morte e fases ---------- */
function cbAposDano(x,antes,depois,delta){
  const sys=S.system, f=cbFonte(x), mx=cbHpMax(x);
  if(x.concentrando&&delta<0) cbLog('🧠 '+x.name+' está concentrado em '+x.concentrando+': teste de concentração (CD '+Math.max(10,Math.floor(-delta/2))+')');
  if(f&&f.sb&&mx){ x.fasesVistas=x.fasesVistas||[];
    (f.sb.fases||[]).forEach(fs=>{ const lim=mx*fs.pct/100;
      if(antes>lim&&depois<=lim&&!x.fasesVistas.includes(fs.id)){ x.fasesVistas.push(fs.id); cbLog('👑 '+x.name+' — fase ('+fs.pct+'%): '+fs.texto); showToast('👑 '+x.name+': '+fs.texto,7000); } }); }
  const r=sys.morte, usa=r&&r.on&&(x.kind==='player'||(f&&f.sb&&f.sb.usaMorte));
  if(!usa) return;
  x.morte=x.morte||{estado:'ok',suc:0,fal:0,rodadas:0};
  if(depois>0){ if(x.morte.estado!=='ok'){ x.morte={estado:'ok',suc:0,fal:0,rodadas:0}; cbLog('🙂 '+x.name+' está de pé'); } return; }
  if(antes>0){
    if(r.modo==='instantanea'){ x.morte.estado='morto'; cbLog('☠ '+x.name+' morreu'); return; }
    x.morte={estado:'caido',suc:0,fal:0,rodadas:r.modo==='contagem'?Math.max(1,_avalia(r.contagem.rodadas,cbVarsTotais(x),3)):0};
    if(!x.conds.includes('Caído')) x.conds.push('Caído');
    cbLog('💫 '+x.name+' caiu'+(r.modo==='contagem'?(' — '+(r.contagem.nome||'Morrendo')+' ('+x.morte.rodadas+' rodadas)'):''));
  } else if(delta<0&&(x.morte.estado==='caido'||x.morte.estado==='estavel')){
    x.morte.estado='caido';
    if(r.modo==='testes'){ x.morte.fal+=r.testes.danoCaido||1; if(x.morte.fal>=r.testes.falhas){ x.morte.estado='morto'; cbLog('☠ '+x.name+' morreu'); } }
    if(r.modo==='contagem'){ x.morte.rodadas=Math.max(0,x.morte.rodadas-1); if(x.morte.rodadas<=0){ x.morte.estado='morto'; cbLog('☠ '+x.name+' morreu'); } }
  }
}
function cbMorteTeste(x){
  const t=S.system.morte.testes, m=x.morte;
  const rr=rollExpr(t.dado||'1d20',{}); const nat=((rr.detalhes||[])[0]||{}).usados?rr.detalhes[0].usados[0]:0, faces=((rr.detalhes||[])[0]||{}).faces;
  const cd=_avalia(t.cd,cbVarsTotais(x),10); let txt;
  if(t.natMax&&nat===faces){ cbSetHp(x,1); x.morte={estado:'ok',suc:0,fal:0,rodadas:0}; txt='máximo natural — levanta com 1!'; }
  else if(t.natMin&&nat===1){ m.fal+=2; txt='1 natural — duas falhas'; }
  else if(rr.total>=cd){ m.suc++; txt='sucesso'; } else { m.fal++; txt='falha'; }
  if(m.estado==='caido'&&m.suc>=t.sucessos){ m.estado='estavel'; txt+=' · estável'; }
  if(m.estado==='caido'&&m.fal>=t.falhas){ m.estado='morto'; txt+=' · morreu'; }
  cbLog('🎲 '+x.name+' — teste contra a morte: '+rr.total+' ('+txt+')'); showToast('🎲 '+x.name+': '+rr.total+' — '+txt); render();
}
function cbMorteRodada(x){ const m=x.morte; m.rodadas=Math.max(0,m.rodadas-1); if(m.rodadas<=0){ m.estado='morto'; cbLog('☠ '+x.name+' morreu'); } render(); }
function cbChipsExtras(x){
  const c=[]; if(x.morte&&x.morte.estado==='morto') c.push(h('span',{class:'mv-chip txt'},'☠ morto'));
  else if(x.morte&&x.morte.estado==='estavel') c.push(h('span',{class:'mv-chip txt'},'🛌 estável'));
  if(x.concentrando) c.push(h('span',{class:'mv-chip txt',title:'Concentração'},'🧠'));
  if(x.invocDe) c.push(h('span',{class:'mv-chip txt'},'invocação'));
  return c;
}
