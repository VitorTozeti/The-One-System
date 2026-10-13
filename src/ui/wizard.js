/* ============================================================ ASSISTENTE DE CRIAÇÃO DE SISTEMA ============================================================
   3 passos curtos: (1) escolher um modelo → (2) nome, temas, atributos e recursos →
   (3) revisar e criar. Vive em document.body (fora do #root), com estado próprio,
   então digitar não dispara render() nem perde o foco.
   Uso: abrirAssistenteSistema({titulo, nomeInicial, okRotulo, aoCriar(sistema, info)})
   Depende de: sistema-modelos.js, dialogs.js, helpers (h), accounts (listTemplates). */

function abrirAssistenteSistema(opts){
  opts=opts||{};
  if(document.getElementById('wiz-bg')) return;
  const antes=document.activeElement;
  const modelosSalvos=(typeof listTemplates==='function')?listTemplates():[];
  const st={ passo:0, modelo:'fantasia', tpl:'', camp:'', sis:'', themes:null, attrNames:[], resOn:{}, tocouCamp:false };

  function aplicaModelo(k){
    const m=modeloSistema(k); st.modelo=k; st.tpl='';
    if(!st.tocouCamp) st.camp=opts.nomeInicial||m.camp;
    st.sis=m.sis; st.themes=m.themes.slice();
    st.attrNames=m.attrs.map(a=>a[0]); st.resOn={}; m.res.forEach(r=>{ st.resOn[r.n]=true; });
  }
  aplicaModelo('fantasia');
  if(opts.nomeInicial){ st.camp=opts.nomeInicial; st.tocouCamp=true; }

  const idT='wiz-t';
  const corpo=h('div',{class:'wiz-corpo'});
  const rodape=h('div',{class:'wiz-rod'});
  const passosEl=h('ol',{class:'wiz-passos','aria-label':'Passos do assistente'});
  const caixa=h('div',{class:'wiz-cx', role:'dialog','aria-modal':'true','aria-labelledby':idT, tabindex:'-1'},
    h('div',{class:'wiz-cab'},
      h('h2',{id:idT}, opts.titulo||'Criar um sistema'),
      h('button',{type:'button',class:'toast-x','aria-label':'Fechar assistente',onclick:()=>fechar()},'✕')),
    passosEl, corpo, rodape);
  const bg=h('div',{id:'wiz-bg',class:'dlg-bg wiz-bg'}, caixa);

  function fechar(){
    document.removeEventListener('keydown',onKey,true); bg.remove();
    if(antes&&antes.isConnected&&antes.focus){ try{antes.focus();}catch(e){} }
  }
  function onKey(e){
    if(!bg.isConnected) return;
    if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); fechar(); return; }
    if(e.key==='Enter' && e.target && e.target.tagName==='INPUT'){ e.preventDefault(); avancar(); return; }
    if(e.key==='Tab'){
      const foc=[...caixa.querySelectorAll('button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled&&x.offsetParent!==null);
      if(!foc.length) return;
      const i=foc.indexOf(document.activeElement);
      if(e.shiftKey&&i<=0){ e.preventDefault(); foc[foc.length-1].focus(); }
      else if(!e.shiftKey&&(i===foc.length-1||i<0)){ e.preventDefault(); foc[0].focus(); }
    }
  }

  const ROT=['Modelo','Personalizar','Revisar'];
  function desenhaPassos(){
    passosEl.innerHTML='';
    ROT.forEach((r,i)=>passosEl.appendChild(h('li',{class:'wiz-p'+(i===st.passo?' on':'')+(i<st.passo?' ok':''),'aria-current':i===st.passo?'step':null},
      h('span',{class:'wiz-n'}, i<st.passo?'✔':String(i+1)), h('span',{},r))));
  }

  /* ---- passo 1: modelo ---- */
  function passoModelo(){
    const grid=h('div',{class:'wiz-modelos', role:'radiogroup','aria-label':'Modelo de partida'});
    MODELOS_SISTEMA.forEach(m=>{
      const sel=!st.tpl&&st.modelo===m.k;
      grid.appendChild(h('button',{type:'button',class:'wiz-mod'+(sel?' on':''),role:'radio','aria-checked':sel?'true':'false',
        onclick:()=>{ aplicaModelo(m.k); desenha(); },
        ondblclick:()=>{ aplicaModelo(m.k); st.passo=1; desenha(); }},
        h('span',{class:'wiz-mod-ic'},m.ic),
        h('b',{},m.nome),
        h('span',{class:'wiz-mod-d'},m.desc),
        h('span',{class:'wiz-mod-t'}, m.k==='branco'?m.tempo:(m.attrs.length+' atributos · '+m.res.length+' recursos · '+m.per.length+' perícias · '+m.cls.length+' classes'))));
    });
    corpo.appendChild(h('p',{class:'wiz-intro'},'Escolha um ponto de partida. Tudo pode ser editado depois — nada aqui é definitivo.'));
    corpo.appendChild(grid);
    if(modelosSalvos.length){
      const sel=h('select',{class:'in',id:'wiz-tpl','aria-label':'Usar um sistema salvo como modelo',onchange:e=>{ st.tpl=e.target.value; desenha(); }},
        h('option',{value:''},'— escolher —'),
        modelosSalvos.map(t=>h('option',{value:t.id,selected:st.tpl===t.id?'':null},t.nome)));
      corpo.appendChild(h('div',{class:'wiz-tpl'}, h('span',{},'Ou comece de um sistema que você já salvou:'), sel));
    }
  }

  /* ---- passo 2: personalizar ---- */
  function passoPersonalizar(){
    const m=modeloSistema(st.modelo);
    if(st.tpl){
      corpo.appendChild(h('p',{class:'wiz-intro'},'Você vai começar de uma cópia do sistema salvo. Só falta dar o nome da campanha.'));
    } else {
      corpo.appendChild(h('p',{class:'wiz-intro'},'Tudo já vem preenchido — mude só o que quiser.'));
    }
    const inpCamp=h('input',{class:'in',id:'wiz-camp',value:st.camp,placeholder:'ex.: A Marca do Dragão',maxlength:'60',
      oninput:e=>{ st.camp=e.target.value; st.tocouCamp=true; erroCamp.textContent=''; inpCamp.removeAttribute('aria-invalid'); }});
    const erroCamp=h('div',{class:'dlg-erro',role:'alert',id:'wiz-camp-e'});
    corpo.appendChild(h('div',{class:'wiz-grid2'},
      h('label',{class:'f'},h('span',{},'Nome da campanha *'),inpCamp,erroCamp),
      st.tpl?null:h('label',{class:'f'},h('span',{},'Nome do sistema (regras)'),
        h('input',{class:'in',value:st.sis,maxlength:'60',oninput:e=>{ st.sis=e.target.value; }}))));
    if(st.tpl) return;
    /* temas */
    corpo.appendChild(h('div',{class:'wiz-sec'},h('b',{},'Temas'),h('span',{class:'hint'},' (combine à vontade)')));
    const temas=h('div',{class:'row wrapf'});
    THEME_PRESETS.forEach(t=>{
      const on=st.themes.includes(t);
      temas.appendChild(h('button',{type:'button',class:'btn sm '+(on?'emerald':'ghost'),'aria-pressed':on?'true':'false',
        onclick:()=>{ on?(st.themes=st.themes.filter(x=>x!==t)):st.themes.push(t); desenha(); }},(on?'✓ ':'')+t));
    });
    corpo.appendChild(temas);
    /* atributos */
    if(m.attrs.length){
      corpo.appendChild(h('div',{class:'wiz-sec'},h('b',{},'Atributos'),h('span',{class:'hint'},' — renomeie se quiser; as fórmulas se ajustam sozinhas')));
      corpo.appendChild(h('div',{class:'wiz-attrs'},st.attrNames.map((n,i)=>
        h('input',{class:'in',value:n,maxlength:'24','aria-label':'Nome do atributo '+(i+1),placeholder:m.attrs[i][0],
          oninput:e=>{ st.attrNames[i]=e.target.value; }}))));
      corpo.appendChild(h('div',{class:'wiz-sec'},h('b',{},'Recursos'),h('span',{class:'hint'},' — desmarque o que não quiser')));
      corpo.appendChild(h('div',{class:'row wrapf'},m.res.map(r=>{
        const on=st.resOn[r.n]!==false;
        return h('button',{type:'button',class:'btn sm '+(on?'emerald':'ghost'),'aria-pressed':on?'true':'false',
          onclick:()=>{ st.resOn[r.n]=!on; desenha(); }},(on?'✓ ':'')+r.n+(r.tipo==='valor'?' (valor)':''));
      })));
    }
    setTimeout(()=>{ try{ inpCamp.focus(); inpCamp.select(); }catch(e){} },0);
  }

  /* ---- passo 3: revisar ---- */
  let previa=null;
  function passoRevisar(){
    previa=construirDoEstado();
    const s=previa;
    corpo.appendChild(h('p',{class:'wiz-intro'},'Tudo certo? Ao criar, você cai direto na aba Início, que mostra o que falta para o sistema ficar jogável.'));
    const resumo=h('div',{class:'wiz-resumo'},
      h('div',{class:'wiz-camp'},h('span',{class:'hint'},'Campanha'),h('b',{},s.campaignName)),
      h('div',{class:'wiz-num'},
        ...[['💪',s.attributes.length,'atributos'],['❤️',s.resources.length,'recursos'],['🎯',s.skills.length,'perícias'],['🎭',s.classes.length,'classes'],['🌱',s.origins.length,'origens']]
          .map(([ic,n,l])=>h('div',{class:'wiz-stat'},h('span',{},ic),h('b',{},String(n)),h('small',{},l)))),
      s.themes.length?h('div',{class:'row wrapf'},s.themes.map(t=>h('span',{class:'badge ok'},t))):null);
    corpo.appendChild(resumo);
    const falta=[];
    if(!s.attributes.length) falta.push('atributos');
    if(!s.resources.length) falta.push('recursos');
    if(!s.skills.length) falta.push('perícias');
    if(!s.classes.length||!s.origins.length) falta.push('classe e origem');
    corpo.appendChild(falta.length
      ? h('div',{class:'wiz-aviso'},'ℹ️ Ainda faltará criar: '+falta.join(', ')+'. A aba Início vai te levar a cada um.')
      : h('div',{class:'wiz-aviso ok'},'✔ Esse modelo já tem o essencial para um jogador criar personagem.'));
  }
  function construirDoEstado(){
    if(st.tpl){
      const t=modelosSalvos.find(x=>x.id===st.tpl);
      const base=t&&migrateSystem(JSON.parse(JSON.stringify(t.system)));
      if(base){ base.campaignName=(st.camp||'').trim()||base.campaignName; return base; }
    }
    return construirSistema(st.modelo,{campaignName:st.camp,name:st.sis,themes:st.themes,attrNames:st.attrNames,resOn:st.resOn});
  }

  function avancar(){
    if(st.passo===1){
      const v=(st.camp||'').trim();
      if(!v){
        const i=document.getElementById('wiz-camp'), e=document.getElementById('wiz-camp-e');
        if(e) e.textContent='Dê um nome à campanha para continuar.';
        if(i){ i.setAttribute('aria-invalid','true'); i.setAttribute('aria-describedby','wiz-camp-e'); i.focus(); }
        return;
      }
    }
    if(st.passo<2){ st.passo++; desenha(); return; }
    const sys=previa||construirDoEstado();
    fechar();
    try{ opts.aoCriar&&opts.aoCriar(sys,{modelo:st.modelo,campanha:sys.campaignName}); }catch(err){ console.error(err); uiAlert('Não foi possível criar o sistema: '+(err&&err.message||err)); }
  }

  function desenha(){
    corpo.innerHTML=''; rodape.innerHTML=''; desenhaPassos();
    if(st.passo===0) passoModelo(); else if(st.passo===1) passoPersonalizar(); else passoRevisar();
    rodape.appendChild(st.passo>0
      ? h('button',{type:'button',class:'btn ghost',onclick:()=>{ st.passo--; desenha(); }},'← Voltar')
      : h('button',{type:'button',class:'btn ghost',onclick:()=>fechar()},'Cancelar'));
    rodape.appendChild(h('span',{class:'hint wiz-hint'},'Enter avança · Esc fecha'));
    rodape.appendChild(h('button',{type:'button',class:'btn '+(st.passo===2?'emerald':'primary'),id:'wiz-go',
      onclick:avancar},
      st.passo===0?'Próximo: personalizar →':st.passo===1?'Próximo: revisar →':(opts.okRotulo||'✔ Criar sistema')));
    if(st.passo!==1) setTimeout(()=>{ const b=document.getElementById('wiz-go'); try{ b&&b.focus(); }catch(e){} },0);
  }
  document.addEventListener('keydown',onKey,true);
  document.body.appendChild(bg);
  desenha();
}
