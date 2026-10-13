/* ============================================================ CAMPANHA — TELA DOS JOGADORES ============================================================
   Modo apresentação 100% offline. O Mestre abre uma 2ª janela (mesma página com
   #tela-jogadores) e ela recebe, por BroadcastChannel (com fallback em
   localStorage + evento "storage"), um RETRATO filtrado do que os jogadores podem ver:
     • mapa atual SEM tokens/peças ocultos, SEM notas e SEM segredos;
     • handout escolhido pelo Mestre (c.present.handoutId);
     • ordem de iniciativa (sem combatentes ocultos; inimigos só mostram o estado
       "Ileso/Ferido/…", nunca o PV exato);
     • última rolagem pública (rolagens secretas NUNCA entram) e contadores marcados como visíveis.
   A janela dos jogadores nunca grava dados (persist é neutralizado) — só desenha o retrato.
   Para jogo online: compartilhe a janela "Tela dos jogadores" na videochamada. */

const TELA_HASH='#tela-jogadores', TELA_CANAL='nexus-tela-jogadores', TELA_LS='nexus-tela-snap', TELA_LS_IMG='nexus-tela-img';
function telaModo(){ return location.hash===TELA_HASH; }

/* ============================ LADO DO MESTRE ============================ */
let _telaCh=null, _telaTimer=null, _telaUltimo='', _telaChaveEnviada='', _telaJanela=null;
function telaCanal(){
  if(_telaCh||typeof BroadcastChannel==='undefined') return _telaCh;
  try{
    _telaCh=new BroadcastChannel(TELA_CANAL);
    _telaCh.onmessage=ev=>{ if(ev.data&&ev.data.t==='hello'&&!telaModo()) presEnviar(true); };
  }catch(e){ _telaCh=null; }
  return _telaCh;
}
function telaNomeToken(t){
  if(t.label && t.label!=='?') return t.label;
  try{ const i=tokenRefInfo(t); if(i&&i.name) return i.name; }catch(e){}
  return t.label||'';
}
/* Estado do inimigo em palavras (jogadores não veem o PV exato). */
function telaEstadoHp(x){
  const hp=cbHp(x), mx=cbHpMax(x); if(hp==null) return '';
  if(hp<=0) return 'Caído';
  if(!mx) return '';
  const p=hp/mx; return p>.75?'Ileso':p>.5?'Ferido':p>.25?'Machucado':'Quase morto';
}
function telaChaveMapa(m){
  const a=m.image||'', b=m.terrain||'';
  return m.id+'|'+a.length+':'+a.slice(-24)+'|'+b.length+':'+b.slice(-24);
}
function presMapa(m){
  const world=isWorldKind(m.kind);
  const cont=world&&m.world&&m.world.continent&&m.world.continent.shape!=='none'?m.world.continent:null;
  return { id:m.id, name:m.name, world, theme:m.theme, showLabels:m.showLabels!==false,
    grid:m.grid&&m.grid.on?{size:m.grid.size, type:m.grid.type||'square'}:null,
    tokens:m.tokens.filter(t=>!t.hidden).map(t=>({x:t.xPct,y:t.yPct,s:t.size||100,c:t.color,i:(t.icon||'').trim(),l:telaNomeToken(t),k:t.kind,m:(t.marks||[]).slice(0,4),turn:!!t.turn})),
    props:(m.props||[]).filter(p=>!p.hidden).map(p=>({x:p.xPct,y:p.yPct,shape:p.shape,w:p.w,h:p.h,rot:p.rot||0,fill:p.fill,icon:p.icon,s:p.size||100})),
    pins:(m.pins||[]).map(p=>({x:p.xPct,y:p.yPct,icon:p.icon||'📍',l:p.label||''})),
    kingdoms:world?((m.world&&m.world.kingdoms)||[]).map(k=>({x:k.xPct,y:k.yPct,r:k.radius,c:k.color,n:k.name})):[],
    continent:cont?{poly:worldShapeMeta(cont.shape).poly, color:cont.color, rot:cont.rot||0, scale:cont.scale||100}:null };
}
function presSnapshot(){
  const c=S.campaign, p=c.present, cb=c.combat, m=curMap();
  const hd=p.handoutId&&c.handouts.find(x=>x.id===p.handoutId);
  const snap={ t:'snap', ts:Date.now(), camp:c.name||S.system.campaignName||S.system.name||'Campanha',
    blank:!!p.blank, handout:hd?{title:hd.title,text:hd.text,image:hd.image||null}:null,
    map:null, init:null, roll:(p.showRoll&&p.lastRoll)?p.lastRoll:null, trackers:null };
  if(p.showMap&&m){ snap.map=presMapa(m); snap.map.key=telaChaveMapa(m); }
  if(p.showInit&&cb.on){
    const vis=cb.order.filter(x=>!x.hidden), cur=cb.order[cb.turn];
    snap.init={ round:cb.round, turn:vis.indexOf(cur),
      list:vis.map(x=>({n:x.name, k:x.kind, i:x.init,
        hp:x.kind==='player'?(cbHp(x)!=null?(cbHp(x)+(cbHpMax(x)!=null?'/'+cbHpMax(x):'')):''):telaEstadoHp(x),
        pc:cbHpMax(x)?Math.max(0,Math.min(100,cbHp(x)/cbHpMax(x)*100)):null,
        d:cbCaido(x), cd:[].concat(cbMarks(x), x.conds)})) };
  }
  if(p.showTrackers){
    const cl=c.clocks.filter(x=>x.shown).map(x=>({n:x.name,s:x.segs,f:x.filled}));
    const rs=c.resources.filter(x=>x.shown).map(x=>({n:x.name,ic:x.icon,q:x.qty}));
    if(cl.length||rs.length) snap.trackers={clocks:cl,res:rs};
  }
  return snap;
}
/* Envia o retrato. Imagens pesadas só vão quando mudam (key) ou sob pedido (force). */
function presEnviar(force){
  const c=S.campaign; if(!c||!c.present.live) return;
  const snap=presSnapshot(), m=snap.map;
  const leve=JSON.stringify(snap, (k,v)=>k==='ts'?undefined:v);
  if(!force&&leve===_telaUltimo) return;
  _telaUltimo=leve;
  let img=null;
  if(m&&(force||m.key!==_telaChaveEnviada)){
    const mm=curMap(); img={key:m.key, img:mm.image||null, terr:mm.terrain||null}; _telaChaveEnviada=m.key;
  }
  const ch=telaCanal();
  if(ch){ try{ ch.postMessage(Object.assign({}, snap, img?{imgs:img}:{})); }catch(e){} }
  /* fallback: localStorage (sem imagens no retrato; imagens em chave própria, se couber) */
  try{ localStorage.setItem(TELA_LS, JSON.stringify(snap)); }catch(e){}
  if(img){ try{ localStorage.setItem(TELA_LS_IMG, JSON.stringify(img)); }catch(e){ try{ localStorage.removeItem(TELA_LS_IMG); }catch(e2){} } }
}
function presAgendar(){
  const c=S.campaign; if(!c||!c.present.live||telaModo()) return;
  clearTimeout(_telaTimer); _telaTimer=setTimeout(()=>presEnviar(false),90);
}
function presAbrirTela(){
  const c=S.campaign; c.present.live=true;
  const url=location.href.split('#')[0]+TELA_HASH;
  try{ _telaJanela=window.open(url,'nexus-tela-jogadores','popup,width=1280,height=760'); }catch(e){ _telaJanela=null; }
  if(!_telaJanela) showToast('O navegador bloqueou a janela. Permita pop-ups ou use “Copiar link”.');
  telaCanal(); _telaUltimo=''; _telaChaveEnviada='';
  setTimeout(()=>presEnviar(true),700);
  render();
}
function presParar(){
  const c=S.campaign; c.present.live=false;
  const ch=telaCanal(); if(ch){ try{ ch.postMessage({t:'off'}); }catch(e){} }
  try{ localStorage.setItem(TELA_LS, JSON.stringify({t:'off',ts:Date.now()})); }catch(e){}
  render();
}
function presRolagemPublica(res,by){
  const p=S.campaign&&S.campaign.present; if(!p||!res||res.erro) return;
  p.lastRoll={expr:res.expr||'', total:res.total, by:by||'Mestre', ts:Date.now()};
}

/* Painel de controle do Mestre (aba "📺 Tela" das Ferramentas). */
function presentacaoPanel(){
  const c=S.campaign, p=c.present;
  const chk=(rot,k,dica)=>h('label',{class:'chk', title:dica||''}, h('input',{type:'checkbox', checked:!!p[k], onchange:e=>{p[k]=e.target.checked;render();}}),' '+rot);
  const status=h('div',{class:'mv-pres-st'+(p.live?' on':'')},
    h('span',{class:'mv-dot'}), p.live?'Transmitindo para a Tela dos jogadores':'Transmissão desligada');
  return h('div',{},
    card('📺 Tela dos jogadores','Uma janela separada (para o 2º monitor/projetor ou para compartilhar na chamada). Mostra só o que você permitir.',
      p.live?h('button',{class:'btn danger', onclick:presParar},'⏹ Parar'):h('button',{class:'btn emerald', onclick:presAbrirTela},'📺 Abrir tela dos jogadores'),
      status,
      h('div',{class:'row wrapf', style:{marginTop:'10px'}},
        h('button',{class:'btn sm ghost', onclick:()=>{ const u=location.href.split('#')[0]+TELA_HASH;
          if(navigator.clipboard) navigator.clipboard.writeText(u).then(()=>showToast('Link copiado — abra em outra janela do MESMO navegador'),()=>cAlert(u)); else cAlert(u); }},'🔗 Copiar link'),
        h('button',{class:'btn sm '+(p.blank?'amber':'ghost'), title:'Esconde tudo (cena de pausa)', onclick:()=>{p.blank=!p.blank;render();}}, p.blank?'▶ Voltar à cena':'⏸ Tela de pausa')),
      h('div',{class:'hint', style:{marginTop:'8px'}},'Funciona offline, entre janelas do mesmo navegador/computador. Itens e tokens “ocultos” do mapa nunca são enviados; inimigos aparecem só com o estado (Ileso, Ferido…), sem PV exato.')),
    card('O que mostrar',null,null,
      h('div',{class:'mv-pres-opts'},
        chk('🗺️ Mapa atual','showMap','O mapa aberto no editor, sem itens ocultos'),
        chk('⚔️ Ordem de iniciativa','showInit','Só durante um combate ativo'),
        chk('🎲 Última rolagem pública','showRoll','Rolagens secretas nunca aparecem'),
        chk('⏳ Relógios e recursos marcados','showTrackers','Só os que você marcou com 👁'))),
    card('Handout no ar','Escolha um handout para exibir sobre a cena.',
      p.handoutId?h('button',{class:'btn danger sm', onclick:()=>handoutMostrar(null)},'🙈 Ocultar'):null,
      c.handouts.length
        ? h('div',{class:'row wrapf'}, c.handouts.map(hd=>h('button',{class:'btn sm '+(p.handoutId===hd.id?'emerald':'ghost'), onclick:()=>handoutMostrar(p.handoutId===hd.id?null:hd)}, '📜 '+hd.title)))
        : h('div',{class:'hint'},'Nenhum handout ainda — crie em Notas → Handouts.')));
}

/* ============================ LADO DA TELA (janela dos jogadores) ============================ */
let _tela={snap:null, imgs:null, off:false}, _telaCache={key:null, img:null, terr:null};
function telaIniciar(){
  persist=function(){};            /* esta janela NUNCA grava dados */
  document.body.classList.add('tela-modo');
  document.title='Tela dos jogadores — Nexus RPG';
  render=function(){ telaRender(); };
  const aplicar=d=>{
    if(!d) return;
    if(d.t==='off'){ _tela.off=true; _tela.snap=null; telaRender(); return; }
    if(d.t!=='snap') return;
    _tela.off=false;
    if(d.imgs){ _telaCache={key:d.imgs.key, img:null, terr:null, srcImg:d.imgs.img, srcTerr:d.imgs.terr}; }
    else if(d.map && _telaCache.key!==d.map.key){          /* falta a imagem: tenta o localStorage, senão pede ao Mestre */
      let li=null; try{ li=JSON.parse(localStorage.getItem(TELA_LS_IMG)); }catch(e){}
      if(li&&li.key===d.map.key) _telaCache={key:li.key, img:null, terr:null, srcImg:li.img, srcTerr:li.terr};
      else { const ch=telaCanal(); if(ch) try{ ch.postMessage({t:'hello'}); }catch(e){} }
    }
    _tela.snap=d; telaRender();
  };
  const ch=telaCanal();
  if(ch) ch.addEventListener('message',ev=>aplicar(ev.data));
  window.addEventListener('storage',ev=>{ if(ev.key===TELA_LS&&ev.newValue){ try{ aplicar(JSON.parse(ev.newValue)); }catch(e){} } });
  try{ const ini=JSON.parse(localStorage.getItem(TELA_LS)); if(ini) aplicar(ini); }catch(e){}
  if(ch) try{ ch.postMessage({t:'hello'}); }catch(e){}
  window.addEventListener('resize',()=>{ clearTimeout(_telaRz); _telaRz=setTimeout(telaRender,120); });
  document.addEventListener('dblclick',()=>{ if(document.fullscreenElement) document.exitFullscreen(); else if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); });
  render();
}
let _telaRz=null;

function telaCarregaImgs(cb){
  const k=_telaCache; if(!k.key){ cb(); return; }
  let falta=0; const fim=()=>{ if(--falta<=0) cb(); };
  if(k.srcImg&&!k.img){ falta++; const im=new Image(); im.onload=()=>{k.img=im;fim();}; im.onerror=fim; im.src=k.srcImg; }
  if(k.srcTerr&&!k.terr){ falta++; const im=new Image(); im.onload=()=>{k.terr=im;fim();}; im.onerror=fim; im.src=k.srcTerr; }
  if(!falta) cb();
}
const TELA_FILL={wall:'#475569',floor:'rgba(203,213,225,.55)',water:'rgba(42,108,176,.75)',grass:'rgba(63,125,58,.7)',ice:'rgba(191,227,244,.7)'};
const TELA_BG={rustico:'#2a2118',natural:'#1b2a1c',futurista:'#0b1626',sombrio:'#14111a',limpo:'#0e1424'};
function telaDesenha(cv, m){
  const W=cv.width, H=cv.height, F=W/1000, cx=cv.getContext('2d'), px=p=>p/100*W, py=p=>p/100*H;
  cx.fillStyle=TELA_BG[m.theme]||'#0e1424'; cx.fillRect(0,0,W,H);
  const k=_telaCache;
  if(k.img){ const sc=Math.max(W/k.img.width,H/k.img.height), w=k.img.width*sc, hh=k.img.height*sc; cx.drawImage(k.img,(W-w)/2,(H-hh)/2,w,hh); }
  if(k.terr) cx.drawImage(k.terr,0,0,W,H);
  if(m.continent&&m.continent.poly){
    const pts=m.continent.poly.split(',').map(s=>s.trim().split(/\s+/).map(v=>parseFloat(v)));
    cx.save(); cx.translate(W/2,H/2); cx.rotate(m.continent.rot*Math.PI/180); cx.scale(m.continent.scale/100,m.continent.scale/100);
    cx.beginPath(); pts.forEach((q,i)=>{ const x=(q[0]-50)/100*W, y=(q[1]-50)/100*H; i?cx.lineTo(x,y):cx.moveTo(x,y); }); cx.closePath();
    cx.fillStyle=m.continent.color; cx.globalAlpha=.9; cx.fill(); cx.globalAlpha=1; cx.lineWidth=3*F; cx.strokeStyle='rgba(0,0,0,.35)'; cx.stroke(); cx.restore();
  }
  if(m.grid){ cx.strokeStyle='rgba(148,163,184,.4)'; cx.lineWidth=1; cx.beginPath(); const s=m.grid.size*F*(W/1000>0?1:1);
    if(m.grid.type==='hex'){ const hh=s, r=hh/Math.sqrt(3);
      const hex=(a,b)=>{ cx.moveTo(a+r,b); for(let q=1;q<=6;q++) cx.lineTo(a+r*Math.cos(q*Math.PI/3), b+r*Math.sin(q*Math.PI/3)); };
      for(let i=-1;i<W/(3*r)+1;i++) for(let j=-1;j<H/hh+1;j++){ hex(r+3*r*i,hh/2+hh*j); hex(2.5*r+3*r*i,hh*j); } }
    else { for(let x=0;x<=W;x+=s){ cx.moveTo(x,0); cx.lineTo(x,H); } for(let y=0;y<=H;y+=s){ cx.moveTo(0,y); cx.lineTo(W,y); } }
    cx.stroke(); }
  const emoji=(t,x,y,size)=>{ cx.font=size+'px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillStyle='#fff'; cx.fillText(t,x,y); };
  const rotulo=(t,x,y,cor)=>{ if(!t) return; cx.font='bold '+(11*F)+'px sans-serif'; cx.textAlign='center'; cx.textBaseline='middle';
    const w=cx.measureText(t).width+8*F; cx.fillStyle=cor||'rgba(11,16,32,.8)'; cx.fillRect(x-w/2,y-8*F,w,16*F); cx.fillStyle='#fff'; cx.fillText(t,x,y); };
  m.kingdoms.forEach(kg=>{ const r=px(kg.r), g=cx.createRadialGradient(px(kg.x),py(kg.y),0,px(kg.x),py(kg.y),r);
    g.addColorStop(0,kg.c+'6b'); g.addColorStop(.65,kg.c+'24'); g.addColorStop(1,'rgba(0,0,0,0)'); cx.fillStyle=g; cx.beginPath(); cx.arc(px(kg.x),py(kg.y),r,0,6.3); cx.fill();
    if(m.showLabels) rotulo(kg.n,px(kg.x),py(kg.y),kg.c); });
  m.props.forEach(p=>{ cx.save(); cx.translate(px(p.x),py(p.y)); cx.rotate((p.rot||0)*Math.PI/180);
    if(p.shape==='block'){ const w=px(p.w), hh=py(p.h); cx.fillStyle=TELA_FILL[p.fill]||'#64748b'; cx.fillRect(-w/2,-hh/2,w,hh); cx.strokeStyle='rgba(255,255,255,.3)'; cx.strokeRect(-w/2,-hh/2,w,hh); }
    else emoji(p.icon,0,0,30*F*(p.s||100)/100);
    cx.restore(); });
  m.pins.forEach(p=>{ emoji(p.icon,px(p.x),py(p.y)-10*F,22*F); if(p.l&&m.showLabels) rotulo(p.l,px(p.x),py(p.y)+8*F); });
  m.tokens.forEach(t=>{ const r=17*F*(t.s||100)/100, x=px(t.x), y=py(t.y);
    if(t.turn){ cx.beginPath(); cx.arc(x,y,r+7*F,0,6.3); cx.lineWidth=4*F; cx.strokeStyle='#fbbf24'; cx.shadowColor='#fbbf24'; cx.shadowBlur=14*F; cx.stroke(); cx.shadowBlur=0; }
    cx.fillStyle='#0e1424'; cx.beginPath(); cx.arc(x,y,r,0,6.3); cx.fill(); cx.lineWidth=2*F; cx.strokeStyle=t.c||'#94a3b8'; cx.stroke();
    emoji(t.i||((t.l||'?').trim().charAt(0)||'?'),x,y,r);
    if(t.m&&t.m.length) emoji(t.m.join(''),x,y-r-8*F,11*F);
    if(m.showLabels) rotulo(t.l,x,y+r+9*F); });
}

function telaRender(){
  const r=document.getElementById('root'); if(!r) return;
  r.innerHTML='';
  const s=_tela.snap;
  const raiz=h('div',{class:'tela'});
  if(!s){
    raiz.appendChild(h('div',{class:'tela-espera'}, h('div',{class:'tela-logo'},'⬡ NEXUS RPG'),
      h('div',{}, _tela.off?'Transmissão encerrada pelo Mestre.':'Aguardando o Mestre…'),
      h('div',{class:'tela-dica'},'Esta janela só exibe o que o Mestre liberar. Clique duas vezes para tela cheia.')));
    r.appendChild(raiz); return;
  }
  if(s.blank){
    raiz.appendChild(h('div',{class:'tela-espera'}, h('div',{class:'tela-logo'}, s.camp), h('div',{class:'tela-dica'},'⏸ Pausa')));
    r.appendChild(raiz); return;
  }
  const main=h('div',{class:'tela-main'});
  /* mapa */
  if(s.map){
    const wrap=h('div',{class:'tela-mapa'});
    const cv=document.createElement('canvas'); cv.width=1600; cv.height=1000; cv.className='tela-cv';
    wrap.appendChild(cv); wrap.appendChild(h('div',{class:'tela-mapa-nome'}, s.map.name));
    main.appendChild(wrap);
    telaCarregaImgs(()=>{ try{ telaDesenha(cv, s.map); }catch(e){ console.error(e); } });
  } else if(!s.init&&!s.handout){
    main.appendChild(h('div',{class:'tela-espera'}, h('div',{class:'tela-logo'}, s.camp)));
  }
  /* coluna lateral: iniciativa + contadores + rolagem */
  const lado=h('div',{class:'tela-lado'});
  if(s.init){
    lado.appendChild(h('div',{class:'tela-card'}, h('div',{class:'tela-h'},'⚔️ Combate · Rodada ', h('b',{},s.init.round)),
      s.init.list.map((x,i)=>h('div',{class:'tela-ini k-'+x.k+(i===s.init.turn?' cur':'')+(x.d?' down':'')},
        h('span',{class:'tela-ini-n'}, x.n),
        x.cd&&x.cd.length?h('span',{class:'tela-ini-c'}, x.cd.join(' ')):null,
        x.hp?h('span',{class:'tela-ini-hp'}, x.hp):null,
        x.pc!=null&&x.k==='player'?h('span',{class:'tela-ini-bar'}, h('i',{style:{width:x.pc+'%'}})):null))));
  }
  if(s.trackers){
    lado.appendChild(h('div',{class:'tela-card'},
      s.trackers.clocks.map(cl=>h('div',{class:'tela-clock'}, h('span',{}, '⏳ '+cl.n),
        h('span',{class:'tela-segs'}, Array.from({length:cl.s},(_,i)=>h('i',{class:i<cl.f?'on':''}))))),
      s.trackers.res.map(rs=>h('div',{class:'tela-res'}, h('span',{}, (rs.ic||'')+' '+rs.n), h('b',{}, rs.q)))));
  }
  if(s.roll){
    lado.appendChild(h('div',{class:'tela-card tela-roll'}, h('small',{}, s.roll.by+' rolou '+s.roll.expr), h('div',{class:'tela-roll-n'}, s.roll.total)));
  }
  if(lado.childNodes.length) main.appendChild(lado);
  raiz.appendChild(main);
  /* handout por cima de tudo */
  if(s.handout){
    raiz.appendChild(h('div',{class:'tela-hand'},
      h('div',{class:'tela-hand-cx'}, h('h2',{}, s.handout.title),
        s.handout.image?h('img',{src:s.handout.image, alt:''}):null,
        s.handout.text?h('div',{class:'tela-hand-t'}, s.handout.text):null)));
  }
  r.appendChild(raiz);
}

/* Se esta página foi aberta como Tela dos jogadores, assume o controle (antes do app.js). */
if(telaModo()) telaIniciar();
