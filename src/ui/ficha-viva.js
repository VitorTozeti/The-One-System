/* ============================================================ FICHA AO VIVO ============================================================
   Gaveta à direita do editor do Mestre: mostra um herói de exemplo calculado com as
   regras ATUAIS (atributos, recursos, perícias). Toda edição reflete na hora, fechando o
   ciclo "ajustar → ver". Não bloqueia nada: se o sistema está incompleto, mostra o que há. */
function fichaVivaAberta(){
  if(S.view!=='mestre'||S.tab==='ficha') return false;
  /* sem preferência salva: em tela estreita começa recolhida (a gaveta cobriria o editor) */
  if(S.ui.live==null) return window.innerWidth>=1380;
  return S.ui.live!==false;
}
function fichaVivaNivel(sys){
  const lo=sys.startLevel||1, hi=Math.max(lo,sys.maxLevel||lo);
  const n=Math.round(+S.ui.liveLvl);
  return Math.min(hi,Math.max(lo,Number.isNaN(n)?lo:n));
}
function fichaVivaAlternar(){
  S.ui.live=!fichaVivaAberta(); store('nexus_live',!!S.ui.live); render();
}
function fichaVivaCorpo(sys){
  const lvl=fichaVivaNivel(sys), lo=sys.startLevel||1, hi=Math.max(lo,sys.maxLevel||lo);
  let d,ctx;
  try{ d=sampleDraft(sys,lvl); ctx=computeSheet(sys,d); }
  catch(e){ return h('div',{class:'hint'},'Não foi possível calcular a ficha de exemplo ainda — continue editando.'); }
  const sec=(t,...f)=>h('div',{class:'fv-sec'}, h('div',{class:'fv-t'},t), ...f);
  const vazio=txt=>h('div',{class:'fv-vazio'},txt);
  const nivel=h('div',{class:'fv-nivel'},
    h('span',{},(sys.levelName||'Nível')+' '),
    h('button',{class:'btn sm ghost','aria-label':'Diminuir nível',disabled:lvl<=lo,onclick:()=>{S.ui.liveLvl=lvl-1;render();}},'−'),
    h('b',{},String(lvl)),
    h('button',{class:'btn sm ghost','aria-label':'Aumentar nível',disabled:lvl>=hi,onclick:()=>{S.ui.liveLvl=lvl+1;render();}},'+'));
  const atrs=sys.attributes.length
    ? h('div',{class:'fv-atrs'}, sys.attributes.map(a=>{ const t=ctx.totals[a.id]||{};
        return h('div',{class:'fv-atr',title:a.name},h('small',{},attrAbbr(a)),h('b',{},String(t.eff==null?'—':t.eff))); }))
    : vazio('Sem atributos — crie na aba 💪 Atributos.');
  const recs=sys.resources.length
    ? sys.resources.map(r=>{ const x=ctx.allRes.find(q=>q.id===r.id)||r; const bar=(r.type||'barra')!=='valor';
        const ok=!Number.isNaN(x.max);
        return h('div',{class:'fv-rec'},
          h('div',{class:'row between'},h('span',{},r.name),h('b',{class:ok?'':'fv-erro',title:ok?'':'Fórmula inválida'},ok?(bar?x.cur+' / '+x.max:String(x.max)):'?')),
          bar?h('div',{class:'bar-t'},h('div',{class:'bar-f',style:{width:(ok&&x.max>0?100:0)+'%',background:r.color}})):null); })
    : [vazio('Sem recursos — crie na aba ❤️ Recursos.')];
  const sk=sys.skills.slice().sort((x,y)=>(x.name||'').localeCompare(y.name||'','pt-BR',{sensitivity:'base'}));
  const pericias=sk.length
    ? h('div',{class:'fv-pers'}, sk.slice(0,12).map(s=>{ const v=ctx.skillVal(s);
        return h('div',{class:'fv-per'+(d.skills.includes(s.id)||s.auto?' on':'')},h('span',{},s.name),h('b',{},(v>=0?'+':'')+v)); }),
        sk.length>12?h('div',{class:'hint'},'+ '+(sk.length-12)+' perícias…'):null)
    : vazio('Sem perícias — crie na aba 🎯 Perícias.');
  return h('div',{},
    h('div',{class:'row between'},h('b',{},d.name),nivel),
    sec('Atributos',atrs), sec('Recursos',...recs), sec('Perícias',pericias),
    h('div',{class:'row wrapf',style:{marginTop:'10px'}},
      h('button',{class:'btn sm ghost',onclick:()=>irParaAba('ficha')},'🖼️ Layout da ficha'),
      h('button',{class:'btn sm emerald',onclick:()=>{if(!S.draft)S.draft=initDraft(sys);S.view='jogador';render();window.scrollTo(0,0);}},'▶ Testar / Jogar')));
}
function fichaVivaView(){
  if(S.view!=='mestre'||S.tab==='ficha') return null;
  if(!fichaVivaAberta()) return h('button',{class:'fv-pill',title:'Mostrar a ficha de exemplo com as regras atuais',onclick:fichaVivaAlternar},'👁 Ficha ao vivo');
  return h('aside',{class:'fv',role:'complementary','aria-label':'Ficha de exemplo ao vivo'},
    h('div',{class:'fv-head'},h('b',{},'👁 Ficha ao vivo'),
      h('span',{class:'hint'},'atualiza enquanto você edita'),
      h('button',{class:'btn sm ghost','aria-label':'Recolher ficha ao vivo',onclick:fichaVivaAlternar},'✕')),
    fichaVivaCorpo(S.system));
}
