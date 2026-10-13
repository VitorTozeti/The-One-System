/* ============================================================ CAMPANHA — GERADORES DE MAPA ============================================================
   Geradores procedurais com SEMENTE (mesma semente = mesmo mapa), 100% offline.
   Inspirados em ferramentas de referência (estudadas com o REA):
     • Mapas GRANDES (mundo/região) — ideias do Azgaar's Fantasy Map Generator:
       relevo por ruído + máscara de terra, % de água por quantil, clima (temperatura
       × umidade) → biomas, rios por acúmulo de fluxo, reinos por expansão de custo
       (Dijkstra), capitais/cidades/portos, estradas por menor custo, nomes procedurais.
     • Mapas PEQUENOS — ideias do One Page Dungeon (Watabou) / Dungeon Scrawl:
       masmorra em salas+corredores com portas, hachuras nas paredes, caverna orgânica,
       interior (planta de casa por BSP) e vila com ruas e casas.
   Todo gerador desenha uma imagem (m.image, JPEG) — o pincel pinta POR CIMA — e cria
   peças/locais/reinos marcados com `gen:true` (regenerar remove só o que foi gerado). */

/* ---------- Base: PRNG com semente, ruído, nomes ---------- */
function hashStr(s){ let h=2166136261; s=String(s); for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function rngSeed(seed){
  let a=hashStr(seed)||1;
  return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
}
function novaSemente(){ return Math.random().toString(36).slice(2,8); }
function makeNoise(rnd){
  const N=256, v=new Float32Array(N*N); for(let i=0;i<v.length;i++) v[i]=rnd();
  const g=(a,b)=>v[((b&255)*N)+(a&255)], sm=t=>t*t*(3-2*t);
  const n2=(x,y)=>{ const xi=Math.floor(x), yi=Math.floor(y), u=sm(x-xi), w=sm(y-yi);
    return (g(xi,yi)*(1-u)+g(xi+1,yi)*u)*(1-w)+(g(xi,yi+1)*(1-u)+g(xi+1,yi+1)*u)*w; };
  const fbm=(x,y,o)=>{ let a=.5,f=1,s=0,t=0; for(let i=0;i<(o||4);i++){ s+=n2(x*f,y*f)*a; t+=a; a*=.5; f*=2.03; } return s/t; };
  return {n2,fbm};
}
function mkCanvas(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
const sorteiaDe=(rnd,a)=>a[Math.floor(rnd()*a.length)];
const NOME_A=['Val','Dor','Kar','Ael','Thal','Mor','Eld','Vor','Nor','Syl','Bra','Cal','Gal','Ith','Ren','Ast','Dun','Fen','Hal','Ker'];
const NOME_B=['an','or','en','ar','ul','is','ev','ad','on'];
const NOME_REINO=['dia','mark','heim','ria','land','vale','gard','thos','mir','nia','dor'];
const NOME_CIDADE=['burgo','porto','ford','haven','ton','stad','polis','cairn','dale','mere','wick','ir'];
function nomeProc(rnd, tipo){
  const base=sorteiaDe(rnd,NOME_A)+(rnd()<.55?sorteiaDe(rnd,NOME_B):'');
  return base+sorteiaDe(rnd,tipo==='reino'?NOME_REINO:NOME_CIDADE);
}
function lerpC(a,b,t){ return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }

/* Fila de prioridade (heap binário) e Dijkstra multi-origem sobre uma grade. */
function Heap(){ this.d=[]; this.i=[]; }
Heap.prototype.push=function(p,v){ const d=this.d,i=this.i; let k=d.length; d.push(p); i.push(v);
  while(k>0){ const par=(k-1)>>1; if(d[par]<=d[k]) break; [d[par],d[k]]=[d[k],d[par]]; [i[par],i[k]]=[i[k],i[par]]; k=par; } };
Heap.prototype.pop=function(){ const d=this.d,i=this.i; const top=[d[0],i[0]]; const ld=d.pop(), li=i.pop();
  if(d.length){ d[0]=ld; i[0]=li; let k=0; for(;;){ let l=2*k+1,r=l+1,s=k;
    if(l<d.length&&d[l]<d[s]) s=l; if(r<d.length&&d[r]<d[s]) s=r; if(s===k) break;
    [d[s],d[k]]=[d[k],d[s]]; [i[s],i[k]]=[i[k],i[s]]; k=s; } } return top; };
Heap.prototype.size=function(){ return this.d.length; };
function dijkstraGrade(GW,GH,fontes,custo){
  const n=GW*GH, dist=new Float32Array(n).fill(Infinity), prev=new Int32Array(n).fill(-1), dono=new Int32Array(n).fill(-1);
  const hp=new Heap();
  fontes.forEach(([idx,id])=>{ dist[idx]=0; dono[idx]=id; hp.push(0,idx); });
  while(hp.size()){ const [d,i]=hp.pop(); if(d>dist[i]) continue;
    const x=i%GW, y=(i/GW)|0;
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ if(!dx&&!dy) continue;
      const nx=x+dx, ny=y+dy; if(nx<0||ny<0||nx>=GW||ny>=GH) continue;
      const j=ny*GW+nx, c=custo(i,j); if(c==null) continue;
      const nd=d+c*((dx&&dy)?1.414:1); if(nd<dist[j]){ dist[j]=nd; prev[j]=i; dono[j]=dono[i]; hp.push(nd,j); } } }
  return {dist,prev,dono};
}

/* Aplica o resultado de um gerador ao mapa: imagem + peças/locais/reinos gerados. */
function aplicarGerado(m, canvas, extra){
  m.image=canvas.toDataURL('image/jpeg',0.88);
  m.terrain=null; if(typeof terrainReset==='function') terrainReset();
  m.pins=(m.pins||[]).filter(p=>!p.gen);
  m.props=(m.props||[]).filter(p=>!p.gen);
  if(m.world) m.world.kingdoms=(m.world.kingdoms||[]).filter(k=>!k.gen);
  (extra.pins||[]).forEach(p=>{ p.gen=true; m.pins.push(p); });
  (extra.props||[]).forEach(p=>{ p.gen=true; m.props.push(p); });
  (extra.kingdoms||[]).forEach(k=>{ k.gen=true; m.world.kingdoms.push(k); });
  if(extra.note!=null) m.note=extra.note;
  m.genMeta=extra.meta||null;
  if(extra.grid) m.grid=Object.assign(m.grid||{},extra.grid);
}

/* ============================ MUNDO / REGIÃO (grande escala) ============================ */
function biomaRGB(t,mo,e){
  if(e>0.74) return t<.5?[238,242,246]:[150,142,130];
  if(e>0.52) return [132,122,106];
  if(t<.16) return [228,236,240];
  if(t<.30) return mo>.5?[98,130,106]:[160,170,152];
  if(mo<.28) return t>.62?[224,198,140]:[198,188,132];
  if(mo<.46) return t>.62?[186,178,102]:[152,178,98];
  if(mo<.64) return [106,154,86];
  return t>.62?[52,120,70]:[64,122,78];
}
function genMundo(m,o){
  const rnd=rngSeed('mundo:'+o.seed), nz=makeNoise(rnd), nzM=makeNoise(rnd), nzD=makeNoise(rnd);
  const GW=200, GH=125, OW=1200, OH=750, cell=OW/GW, N=GW*GH;
  const tipo=o.tipo||'continente', agua=Math.max(15,Math.min(85,o.agua==null?55:o.agua));
  const blobs=tipo==='arquipelago'?Array.from({length:8},()=>({x:.12+rnd()*.76,y:.14+rnd()*.72,r:.07+rnd()*.13})):null;
  const H=new Float32Array(N);
  for(let y=0;y<GH;y++) for(let x=0;x<GW;x++){
    const nx=x/GW, ny=y/GH, n=nz.fbm(nx*5,ny*3.2,5);
    let mask;
    if(tipo==='arquipelago'){ mask=0; blobs.forEach(b=>{ const d=Math.hypot((nx-b.x)*1.6,(ny-b.y))/b.r; mask=Math.max(mask,1-d); }); mask=Math.max(0,mask); }
    else { const k=tipo==='pangeia'?[.52,.5]:[.44,.42]; const d=Math.hypot((nx-.5)/k[0],(ny-.5)/k[1]); mask=Math.max(0,1-d*d); }
    H[y*GW+x]=n*(tipo==='arquipelago'?.75:.85)+mask*.7;
  }
  /* nível do mar por quantil: garante a % de água pedida */
  const ord=Array.from(H).sort((a,b)=>a-b), thr=ord[Math.floor(ord.length*agua/100)], mn=ord[0], mx=ord[ord.length-1];
  const Hn=new Float32Array(N);
  for(let i=0;i<N;i++) Hn[i]=H[i]>thr?0.5+(H[i]-thr)/(mx-thr)*0.5:0.5-(thr-H[i])/(thr-mn)*0.5;
  /* relevo por RANKING entre as células de terra: só ~12% viram montanha (e>0.5) */
  const E=new Float32Array(N), terraOrd=ord.slice(Math.floor(ord.length*agua/100)+1), nT=Math.max(1,terraOrd.length);
  for(let i=0;i<N;i++){ if(Hn[i]<=0.5) continue; let lo=0,hi=nT-1; while(lo<hi){ const mid=(lo+hi)>>1; if(terraOrd[mid]<H[i]) lo=mid+1; else hi=mid; }
    E[i]=Math.pow(lo/nT,5); }
  const M=new Float32Array(N), T=new Float32Array(N);
  for(let y=0;y<GH;y++) for(let x=0;x<GW;x++){ const i=y*GW+x, nx=x/GW, ny=y/GH;
    M[i]=nzM.fbm(nx*4+50,ny*2.6+50,4);
    T[i]=Math.max(0,Math.min(1,1-Math.abs(ny-.5)*1.9-E[i]*.45+(nzM.n2(nx*3,ny*3)-.5)*.2)); }
  const terra=i=>Hn[i]>0.5;

  /* rios: preenche depressões, aponta cada célula para o vizinho mais baixo e acumula o fluxo */
  const Hf=Float32Array.from(Hn), viz8=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  for(let pass=0;pass<4;pass++) for(let y=1;y<GH-1;y++) for(let x=1;x<GW-1;x++){ const i=y*GW+x; if(!terra(i)) continue;
    let mi=9; viz8.forEach(([dx,dy])=>{ mi=Math.min(mi,Hf[i+dy*GW+dx]); }); if(Hf[i]<=mi) Hf[i]=mi+0.0004; }
  const desce=new Int32Array(N).fill(-1);
  for(let y=1;y<GH-1;y++) for(let x=1;x<GW-1;x++){ const i=y*GW+x; if(!terra(i)) continue;
    let best=-1,bh=Hf[i]; viz8.forEach(([dx,dy])=>{ const j=i+dy*GW+dx; if(Hf[j]<bh){ bh=Hf[j]; best=j; } }); desce[i]=best; }
  const fluxo=new Float32Array(N), ordemTerra=[]; for(let i=0;i<N;i++) if(terra(i)) ordemTerra.push(i);
  ordemTerra.forEach(i=>{ fluxo[i]=.2+M[i]; }); ordemTerra.sort((a,b)=>Hf[b]-Hf[a]);
  ordemTerra.forEach(i=>{ if(desce[i]>=0) fluxo[desce[i]]+=fluxo[i]; });
  const fs=ordemTerra.map(i=>fluxo[i]).sort((a,b)=>a-b), limRio=fs[Math.floor(fs.length*0.965)]||9;

  /* ---- 1) pixels: água com profundidade, terra por bioma, relevo sombreado ---- */
  const cv=mkCanvas(OW,OH), cx=cv.getContext('2d'), img=cx.createImageData(OW,OH), D=img.data;
  const bil=(arr,gx,gy)=>{ gx=gx<0?0:gx>GW-1.001?GW-1.001:gx; gy=gy<0?0:gy>GH-1.001?GH-1.001:gy;
    const x0=gx|0,y0=gy|0,fx=gx-x0,fy=gy-y0,i=y0*GW+x0;
    return arr[i]*(1-fx)*(1-fy)+arr[i+1]*fx*(1-fy)+arr[i+GW]*(1-fx)*fy+arr[i+GW+1]*fx*fy; };
  for(let py=0;py<OH;py++) for(let px=0;px<OW;px++){
    const gx=px/cell-.5, gy=py/cell-.5, dt=(nzD.n2(px*.045,py*.045)-.5)*.028+(nzD.n2(px*.2,py*.2)-.5)*.008;
    const h=bil(Hn,gx,gy)+dt; let c; const o4=(py*OW+px)*4;
    if(h<=0.5){ c=lerpC([112,172,210],[44,100,154],Math.min(1,(0.5-h)*2.6)); }
    else{
      const e=bil(E,gx,gy); c=biomaRGB(bil(T,gx,gy),bil(M,gx,gy),e);
      const sh=Math.max(-.3,Math.min(.3,(bil(E,gx-.6,gy-.6)-bil(E,gx+.6,gy+.6))*5));
      const gr=(nzD.n2(px*.35,py*.35)-.5)*14;
      c=[c[0]*(1+sh)+gr, c[1]*(1+sh)+gr, c[2]*(1+sh)+gr];
      if(h<0.508) c=lerpC(c,[236,226,184],.55);                 /* faixa de praia */
      if(h<0.5035) c=[84,92,96];                                  /* linha de costa */
    }
    D[o4]=c[0]; D[o4+1]=c[1]; D[o4+2]=c[2]; D[o4+3]=255;
  }
  cx.putImageData(img,0,0);
  const cc=i=>[ (i%GW+.5)*cell, (((i/GW)|0)+.5)*cell ];

  /* ---- 2) reinos: capitais bem espaçadas + expansão por custo ---- */
  const K=Math.max(2,Math.min(12,o.reinos||6));
  const score=i=>{ const x=i%GW,y=(i/GW)|0; if(x<4||y<4||x>GW-5||y>GH-5||!terra(i)) return -1;
    const e=E[i]; if(e>.5) return -1;
    let costa=false; [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{ if(!terra(i+dy*GW+dx)) costa=true; });
    return (costa?.7:0)+(fluxo[i]>limRio*.35?.8:0)+(1-Math.abs(e-.12)*2)+(1-Math.abs(T[i]-.55))+rnd()*.5; };
  const cand=[]; for(let t=0;t<2500;t++){ const i=((rnd()*GH)|0)*GW+((rnd()*GW)|0); if(score(i)>1.2) cand.push(i); }
  const caps=[];
  while(caps.length<K && cand.length){
    let bi=-1,bd=-1; for(let t=0;t<cand.length;t++){ const i=cand[t]; let dm=Infinity;
      caps.forEach(c=>{ dm=Math.min(dm,Math.hypot((i%GW)-(c%GW),((i/GW)|0)-((c/GW)|0))); }); if(!caps.length) dm=rnd()*10;
      if(dm>bd){ bd=dm; bi=t; } }
    caps.push(cand.splice(bi,1)[0]);
  }
  const exp=dijkstraGrade(GW,GH,caps.map((c,k)=>[c,k]),(i,j)=>{ if(!terra(j)) return null;
    return 1+Math.abs(E[j]-E[i])*40+(E[j]>.5?7:0)+(fluxo[j]>limRio?1.5:0); });
  const cores=KINGDOM_COLORS.slice(), estados=caps.map((c,k)=>({ idx:k, cap:c, cor:cores[k%cores.length], nome:nomeProc(rnd,'reino') }));

  /* faixa de cor suave de cada reino (camada pequena ampliada com suavização) */
  const wash=mkCanvas(GW,GH), wx=wash.getContext('2d');
  for(let i=0;i<N;i++){ const d=exp.dono[i]; if(d<0||!terra(i)) continue;
    wx.fillStyle=hexA(estados[d].cor,.26); wx.fillRect(i%GW,(i/GW)|0,1,1); }
  cx.imageSmoothingEnabled=true; cx.imageSmoothingQuality='high'; cx.drawImage(wash,0,0,OW,OH);

  /* ---- 3) rios ---- */
  cx.lineCap='round'; cx.lineJoin='round';
  for(let i=0;i<N;i++){ if(!terra(i)||fluxo[i]<limRio||desce[i]<0) continue;
    const a=cc(i), b=cc(desce[i]), mx=(a[0]+b[0])/2+(rnd()-.5)*cell*.7, my=(a[1]+b[1])/2+(rnd()-.5)*cell*.7;
    cx.strokeStyle='#3f7fb8'; cx.lineWidth=1+Math.min(3.4,Math.sqrt(fluxo[i]/limRio)*.9);
    cx.beginPath(); cx.moveTo(a[0],a[1]); cx.quadraticCurveTo(mx,my,b[0],b[1]); cx.stroke(); }

  /* ---- 4) fronteiras entre reinos ---- */
  cx.strokeStyle='rgba(60,30,30,.7)'; cx.lineWidth=1.6; cx.setLineDash([5,3]);
  for(let y=0;y<GH-1;y++) for(let x=0;x<GW-1;x++){ const i=y*GW+x; if(!terra(i)) continue;
    const r=i+1, d=i+GW;
    if(terra(r)&&exp.dono[r]!==exp.dono[i]){ const px=(x+1)*cell+(rnd()-.5)*1.5; cx.beginPath(); cx.moveTo(px,y*cell); cx.lineTo(px,(y+1)*cell); cx.stroke(); }
    if(terra(d)&&exp.dono[d]!==exp.dono[i]){ const py=(y+1)*cell+(rnd()-.5)*1.5; cx.beginPath(); cx.moveTo(x*cell,py); cx.lineTo((x+1)*cell,py); cx.stroke(); } }
  cx.setLineDash([]);

  /* ---- 5) cidades + estradas (menor custo a partir da capital de cada reino) ---- */
  const burgos=[], reinosPin=[], propsNone=[];
  const longe=(i,min)=>burgos.every(b=>Math.hypot((i%GW)-(b%GW),((i/GW)|0)-((b/GW)|0))>=min);
  estados.forEach(es=>{ burgos.push(es.cap); es.cidades=[]; });
  estados.forEach(es=>{
    const proprios=[]; for(let i=0;i<N;i++) if(exp.dono[i]===es.idx&&terra(i)&&score(i)>1.4) proprios.push(i);
    proprios.sort((a,b)=>score(b)-score(a));
    const alvo=1+((rnd()*2)|0);
    for(let t=0;t<proprios.length&&es.cidades.length<alvo;t++){ const i=proprios[t]; if(longe(i,13)){ burgos.push(i); es.cidades.push(i); } }
    const rota=dijkstraGrade(GW,GH,[[es.cap,0]],(i,j)=>{ if(!terra(j)) return null; return 1+Math.abs(E[j]-E[i])*50+(E[j]>.5?9:0)+(fluxo[j]>limRio?4:0); });
    cx.strokeStyle='rgba(112,72,36,.85)'; cx.lineWidth=1.5; cx.setLineDash([4,3]);
    es.cidades.forEach(c=>{ const caminho=[]; for(let k=c;k>=0&&caminho.length<500;k=rota.prev[k]) caminho.push(k);
      if(caminho.length<2) return; cx.beginPath(); caminho.forEach((k,n)=>{ const p=cc(k); n?cx.lineTo(p[0]+(rnd()-.5)*2,p[1]+(rnd()-.5)*2):cx.moveTo(p[0],p[1]); }); cx.stroke(); });
    cx.setLineDash([]);
  });

  /* ---- 6) montanhas e árvores (símbolos de cartografia) ---- */
  for(let y=1;y<GH-1;y++) for(let x=1;x<GW-1;x++){ const i=y*GW+x; if(!terra(i)) continue;
    const e=E[i], p=cc(i); if(fluxo[i]>=limRio) continue;
    if(e>.5&&rnd()<.16){ const s=cell*(.75+e*.55), px=p[0]+(rnd()-.5)*cell, py=p[1]+(rnd()-.5)*cell;
      cx.fillStyle=e>.74?'#f4f6f8':'#a99f8c'; cx.strokeStyle='#4a4338'; cx.lineWidth=1;
      cx.beginPath(); cx.moveTo(px-s,py+s*.6); cx.lineTo(px,py-s); cx.lineTo(px+s,py+s*.6); cx.closePath(); cx.fill(); cx.stroke();
      cx.fillStyle='rgba(40,34,26,.35)'; cx.beginPath(); cx.moveTo(px,py-s); cx.lineTo(px+s,py+s*.6); cx.lineTo(px,py+s*.6); cx.closePath(); cx.fill(); }
    else if(e<.45&&M[i]>.62&&T[i]>.25&&rnd()<.16){ const px=p[0]+(rnd()-.5)*cell, py=p[1]+(rnd()-.5)*cell;
      cx.fillStyle='#2c6a3c'; cx.strokeStyle='#17391f'; cx.lineWidth=.8; cx.beginPath(); cx.arc(px,py,2.6,0,6.3); cx.fill(); cx.stroke(); } }

  /* ---- peças geradas: capitais, cidades, portos e reinos ---- */
  const pins=[], reinos=[];
  const costeira=i=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!terra(i+dy*GW+dx));
  const nota=['# '+(o.tipo==='arquipelago'?'Arquipélago':'Mundo')+' — semente '+o.seed,''];
  estados.forEach(es=>{
    let sx=0,sy=0,n=0; for(let i=0;i<N;i++) if(exp.dono[i]===es.idx&&terra(i)){ sx+=i%GW; sy+=(i/GW)|0; n++; }
    const k=newKingdom(sx/Math.max(1,n)/GW*100, sy/Math.max(1,n)/GH*100); k.name=es.nome; k.color=es.cor; k.radius=8; k.note='Capital: '+es.nome+' (gerado)';
    reinos.push(k);
    const capNome=nomeProc(rnd,'cidade'); const cp=newPin((es.cap%GW+.5)/GW*100,(((es.cap/GW)|0)+.5)/GH*100,'🏰'); cp.label=capNome; cp.note='Capital de '+es.nome;
    pins.push(cp); nota.push('- **'+es.nome+'** — capital '+capNome+', '+(es.cidades.length+1)+' povoados');
    es.cidades.forEach(c=>{ const porto=costeira(c); const p=newPin((c%GW+.5)/GW*100,(((c/GW)|0)+.5)/GH*100,porto?'⚓':'🏘️'); p.label=nomeProc(rnd,'cidade'); p.note=(porto?'Porto de ':'Povoado de ')+es.nome; pins.push(p); });
  });
  aplicarGerado(m,cv,{pins,kingdoms:reinos,note:nota.join('\n'),meta:{g:'mundo',seed:o.seed},
    grid:{on:false}});
  m.world.continent.shape='none';
}

/* ============================ PEQUENA ESCALA: masmorra / caverna / interior ============================ */
function paletaMapa(theme){
  if(theme==='sombrio') return {bg:'#1a1722',floor:'#3b364a',grid:'#4a4560',ink:'#07060b',hatch:'#6d678a',wall:'#58526f',txt:'#e8e2ff',door:'#7a5a3a'};
  if(theme==='futurista') return {bg:'#06121f',floor:'#0f2a44',grid:'#1b476c',ink:'#22d3ee',hatch:'#1b6a86',wall:'#134a6e',txt:'#cffafe',door:'#0e7490'};
  if(theme==='natural') return {bg:'#c9cfa8',floor:'#efe8cc',grid:'#d3cba6',ink:'#2b3a1f',hatch:'#3f5130',wall:'#a39d78',txt:'#2b3a1f',door:'#7b5a2e'};
  return {bg:'#e9dcc0',floor:'#f8f1dc',grid:'#dccfa9',ink:'#2a2118',hatch:'#3a2d20',wall:'#b9a883',txt:'#2a2118',door:'#8b5a2b'};
}
/* Desenha uma grade de células (0 parede, 1 sala, 2 corredor, 3 porta) com sombra, hachura e muros. */
function desenharGrade(cx,g,GW,GH,cs,pal,rnd,op){
  const OW=GW*cs, OH=GH*cs, piso=i=>g[i]>0;
  cx.fillStyle=pal.bg; cx.fillRect(0,0,OW,OH);
  /* granulado do papel */
  for(let k=0;k<OW*OH/260;k++){ cx.fillStyle='rgba(0,0,0,'+(rnd()*.05)+')'; cx.fillRect(rnd()*OW,rnd()*OH,1.4,1.4); }
  /* distância (até 3) das paredes ao piso mais próximo */
  const dist=new Uint8Array(GW*GH).fill(9);
  for(let i=0;i<g.length;i++) if(piso(i)) dist[i]=0;
  for(let d=1;d<=3;d++) for(let y=0;y<GH;y++) for(let x=0;x<GW;x++){ const i=y*GW+x; if(dist[i]<9) continue;
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ const nx=x+dx, ny=y+dy; if(nx<0||ny<0||nx>=GW||ny>=GH) continue; if(dist[ny*GW+nx]===d-1) dist[i]=d; } }
  /* miolo das paredes (interior): preenchido, sem hachura */
  if(op.paredeCheia){ cx.fillStyle=pal.wall; for(let y=0;y<GH;y++) for(let x=0;x<GW;x++){ const i=y*GW+x;
    if(!piso(i)&&op.dentro(x,y)) cx.fillRect(x*cs,y*cs,cs,cs); } }
  else { /* hachuras */
    cx.strokeStyle=pal.hatch; cx.lineCap='round';
    for(let y=0;y<GH;y++) for(let x=0;x<GW;x++){ const d=dist[y*GW+x]; if(d<1||d>3) continue;
      const n=d===1?3:d===2?2:1; cx.lineWidth=d===1?1.1:.9; cx.globalAlpha=d===1?.7:d===2?.5:.35;
      for(let k=0;k<n;k++){ const px=x*cs+rnd()*cs, py=y*cs+rnd()*cs, a=-0.8+rnd()*.5, l=cs*(.35+rnd()*.35);
        cx.beginPath(); cx.moveTo(px,py); cx.lineTo(px+Math.cos(a)*l,py+Math.sin(a)*l); cx.stroke(); } }
    cx.globalAlpha=1; }
  /* sombra projetada + piso */
  cx.fillStyle='rgba(0,0,0,.22)'; for(let i=0;i<g.length;i++) if(piso(i)) cx.fillRect((i%GW)*cs+3,((i/GW)|0)*cs+4,cs,cs);
  cx.fillStyle=pal.floor; for(let i=0;i<g.length;i++) if(piso(i)) cx.fillRect((i%GW)*cs,((i/GW)|0)*cs,cs,cs);
  /* ladrilhos / tábuas */
  cx.strokeStyle=pal.grid; cx.lineWidth=1; cx.beginPath();
  for(let i=0;i<g.length;i++){ if(!piso(i)) continue; const x=(i%GW)*cs, y=((i/GW)|0)*cs;
    if(op.tabuas){ cx.moveTo(x,y+cs/2); cx.lineTo(x+cs,y+cs/2); cx.moveTo(x,y); cx.lineTo(x+cs,y); }
    else { cx.moveTo(x,y); cx.lineTo(x+cs,y); cx.moveTo(x,y); cx.lineTo(x,y+cs); } }
  cx.stroke();
  /* contorno das paredes (traço de tinta tremido) */
  cx.strokeStyle=pal.ink; cx.lineWidth=op.paredeCheia?3.4:3; cx.lineCap='round';
  const seg=(x1,y1,x2,y2)=>{ cx.beginPath(); cx.moveTo(x1+(rnd()-.5)*1.2,y1+(rnd()-.5)*1.2); cx.lineTo(x2+(rnd()-.5)*1.2,y2+(rnd()-.5)*1.2); cx.stroke(); };
  for(let y=0;y<GH;y++) for(let x=0;x<GW;x++){ const i=y*GW+x; if(!piso(i)) continue;
    if(y===0||!piso(i-GW)) seg(x*cs,y*cs,(x+1)*cs,y*cs);
    if(y===GH-1||!piso(i+GW)) seg(x*cs,(y+1)*cs,(x+1)*cs,(y+1)*cs);
    if(x===0||!piso(i-1)) seg(x*cs,y*cs,x*cs,(y+1)*cs);
    if(x===GW-1||!piso(i+1)) seg((x+1)*cs,y*cs,(x+1)*cs,(y+1)*cs); }
  /* portas */
  (op.portas||[]).forEach(d=>{ const x=d.x*cs, y=d.y*cs;
    cx.fillStyle=pal.door; cx.strokeStyle=pal.ink; cx.lineWidth=1.8;
    if(d.v){ cx.fillRect(x+cs*.3,y+cs*.05,cs*.4,cs*.9); cx.strokeRect(x+cs*.3,y+cs*.05,cs*.4,cs*.9); }
    else { cx.fillRect(x+cs*.05,y+cs*.3,cs*.9,cs*.4); cx.strokeRect(x+cs*.05,y+cs*.3,cs*.9,cs*.4); } });
  /* números de sala */
  (op.numeros||[]).forEach(r=>{ cx.fillStyle=pal.floor; cx.strokeStyle=pal.ink; cx.lineWidth=1.6;
    cx.beginPath(); cx.arc(r.x*cs,r.y*cs,cs*.62,0,6.3); cx.fill(); cx.stroke();
    cx.fillStyle=pal.txt; cx.font='bold '+Math.round(cs*.7)+'px sans-serif'; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText(String(r.n),r.x*cs,r.y*cs+1); });
}
const CONTEUDO_SALA=[
  ['vazia','Sala vazia, com poeira e eco. Vale uma checagem de percepção.'],
  ['inimigos','Inimigos de guarda (use o Bestiário). Pode haver emboscada.'],
  ['armadilha','Armadilha escondida no piso — veja a peça oculta no mapa.'],
  ['tesouro','Tesouro: baú com itens ou moedas (veja o baú no mapa).'],
  ['enigma','Enigma ou mecanismo que abre outra passagem.'],
  ['descanso','Local seguro para descansar, com sinais de acampamento antigo.'],
];
function propEm(k,cx_,cy_,GW,GH,extra){ const p=newProp(k,(cx_+.5)/GW*100,(cy_+.5)/GH*100); if(extra) Object.assign(p,extra); return p; }

function genMasmorra(m,o){
  const rnd=rngSeed('masmorra:'+o.seed), GW=60, GH=37, cs=20, g=new Uint8Array(GW*GH);
  const alvo=Math.max(4,Math.min(24,o.salas||12)), salas=[];
  for(let t=0;t<900&&salas.length<alvo;t++){
    const w=4+((rnd()*7)|0), h=3+((rnd()*5)|0), x=2+((rnd()*(GW-w-4))|0), y=2+((rnd()*(GH-h-4))|0);
    if(salas.some(r=>x<r.x+r.w+2&&x+w+2>r.x&&y<r.y+r.h+2&&y+h+2>r.y)) continue;
    salas.push({x,y,w,h,cx:(x+w/2)|0,cy:(y+h/2)|0,redonda:rnd()<.18&&w>=5&&h>=5});
  }
  salas.forEach(r=>{ for(let yy=r.y;yy<r.y+r.h;yy++) for(let xx=r.x;xx<r.x+r.w;xx++){
    if(r.redonda){ const dx=(xx+.5-(r.x+r.w/2))/(r.w/2), dy=(yy+.5-(r.y+r.h/2))/(r.h/2); if(dx*dx+dy*dy>1.05) continue; }
    g[yy*GW+xx]=1; } });
  /* conecta com árvore geradora mínima (Prim) + alguns atalhos */
  const lig=[], dentro=new Set([0]); while(dentro.size<salas.length){
    let bi=-1,bj=-1,bd=Infinity; dentro.forEach(i=>{ salas.forEach((s,j)=>{ if(dentro.has(j)) return; const d=Math.hypot(salas[i].cx-s.cx,salas[i].cy-s.cy); if(d<bd){ bd=d; bi=i; bj=j; } }); });
    lig.push([bi,bj]); dentro.add(bj); }
  for(let k=0;k<Math.floor(salas.length/4);k++){ const a=(rnd()*salas.length)|0, b=(rnd()*salas.length)|0; if(a!==b) lig.push([a,b]); }
  const corredor=(a,b)=>{ let x=a.cx,y=a.cy; const horizPrimeiro=rnd()<.5;
    const passo=(h)=>{ if(h){ while(x!==b.cx){ x+=Math.sign(b.cx-x); if(!g[y*GW+x]) g[y*GW+x]=2; } } else { while(y!==b.cy){ y+=Math.sign(b.cy-y); if(!g[y*GW+x]) g[y*GW+x]=2; } } };
    passo(horizPrimeiro); passo(!horizPrimeiro); };
  lig.forEach(([a,b])=>corredor(salas[a],salas[b]));
  /* portas: célula de corredor com sala de um lado e corredor reto do lado oposto */
  const portas=[];
  for(let y=1;y<GH-1;y++) for(let x=1;x<GW-1;x++){ if(g[y*GW+x]!==2) continue;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
      if(g[(y+dy)*GW+x+dx]===1&&g[(y-dy)*GW+x-dx]===2&&!g[(y+dx)*GW+x+dy]&&!g[(y-dx)*GW+x-dy]) portas.push({x,y,v:dx!==0}); }); }
  const numeros=salas.map((r,i)=>({n:i+1,x:r.x+r.w/2,y:r.y+r.h/2}));
  const pal=paletaMapa(m.theme), cv=mkCanvas(GW*cs,GH*cs), cx=cv.getContext('2d');
  desenharGrade(cx,g,GW,GH,cs,pal,rnd,{portas,numeros});
  /* conteúdo das salas: peças + anotações para o Mestre */
  const props=[], nota=['# Masmorra — semente '+o.seed,'', '1 = entrada · '+salas.length+' = covil final',''];
  salas.forEach((r,i)=>{
    const ultima=i===salas.length-1, primeira=i===0, sorte=primeira?'vazia':(ultima?'inimigos':CONTEUDO_SALA[(rnd()*CONTEUDO_SALA.length)|0][0]);
    const texto=(CONTEUDO_SALA.find(c=>c[0]===sorte)||CONTEUDO_SALA[0])[1];
    if(primeira) props.push(propEm('escada',r.cx,r.cy,GW,GH,{label:'Entrada'}));
    if(sorte==='tesouro'||ultima) props.push(propEm('bau',r.cx+((rnd()*2)|0),r.cy,GW,GH));
    if(sorte==='armadilha') props.push(propEm('armadilha',r.cx,r.cy+1>=r.y+r.h?r.cy:r.cy+1,GW,GH,{hidden:true}));
    if(sorte==='enigma') props.push(propEm('altar',r.cx,r.cy,GW,GH));
    if(rnd()<.5) props.push(propEm('tocha',r.x,r.y,GW,GH));
    nota.push((i+1)+'. '+r.w+'×'+r.h+' — '+(ultima?'**Covil final.** ':primeira?'**Entrada.** ':'')+texto);
  });
  aplicarGerado(m,cv,{props,note:nota.join('\n'),meta:{g:'masmorra',seed:o.seed},grid:{on:true,size:cs/ (cv.width/1000) ,snap:true}});
}

function genCaverna(m,o){
  const rnd=rngSeed('caverna:'+o.seed), GW=100, GH=62, cs=12; let g=new Uint8Array(GW*GH);
  for(let y=0;y<GH;y++) for(let x=0;x<GW;x++) g[y*GW+x]=(x<2||y<2||x>=GW-2||y>=GH-2)?0:(rnd()<.46?0:1);
  for(let it=0;it<5;it++){ const n=new Uint8Array(g.length);
    for(let y=1;y<GH-1;y++) for(let x=1;x<GW-1;x++){ let w=0; for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) if(!g[(y+dy)*GW+x+dx]) w++; n[y*GW+x]=w>=5?0:1; }
    g=n; }
  /* mantém só a maior região conectada */
  const seen=new Uint8Array(g.length); let melhor=[];
  for(let s=0;s<g.length;s++){ if(!g[s]||seen[s]) continue; const fila=[s], reg=[]; seen[s]=1;
    while(fila.length){ const i=fila.pop(); reg.push(i); [i+1,i-1,i+GW,i-GW].forEach(j=>{ if(j>=0&&j<g.length&&g[j]&&!seen[j]){ seen[j]=1; fila.push(j); } }); }
    if(reg.length>melhor.length) melhor=reg; }
  g=new Uint8Array(g.length); melhor.forEach(i=>{ g[i]=1; });
  const OW=GW*cs, OH=GH*cs, pal=paletaMapa(m.theme), cv=mkCanvas(OW,OH), cx=cv.getContext('2d');
  cx.fillStyle=pal.bg; cx.fillRect(0,0,OW,OH);
  for(let k=0;k<OW*OH/260;k++){ cx.fillStyle='rgba(0,0,0,'+(rnd()*.05)+')'; cx.fillRect(rnd()*OW,rnd()*OH,1.4,1.4); }
  /* máscara suave: piso desenhado, borrado e binarizado → contorno orgânico */
  const mk=mkCanvas(OW,OH), mx=mk.getContext('2d'); mx.fillStyle='#fff';
  g.forEach((v,i)=>{ if(v) mx.fillRect((i%GW)*cs,((i/GW)|0)*cs,cs,cs); });
  const bl=mkCanvas(OW,OH), bx=bl.getContext('2d'); bx.filter='blur(8px)'; bx.drawImage(mk,0,0); bx.filter='none';
  const id=bx.getImageData(0,0,OW,OH), D=id.data; for(let i=3;i<D.length;i+=4) D[i]=D[i]>110?255:0; bx.putImageData(id,0,0);
  const tinta=(src,cor)=>{ const c=mkCanvas(OW,OH), x=c.getContext('2d'); x.drawImage(src,0,0); x.globalCompositeOperation='source-in'; x.fillStyle=cor; x.fillRect(0,0,OW,OH); return c; };
  /* hachuras fora da caverna, perto da borda */
  cx.strokeStyle=pal.hatch; cx.lineCap='round';
  for(let y=0;y<GH;y++) for(let x=0;x<GW;x++){ let perto=false;
    for(let dy=-3;dy<=3&&!perto;dy++) for(let dx=-3;dx<=3;dx++){ const nx=x+dx, ny=y+dy; if(nx>=0&&ny>=0&&nx<GW&&ny<GH&&g[ny*GW+nx]){ perto=true; break; } }
    if(!perto||g[y*GW+x]) continue;
    for(let k=0;k<2;k++){ const px=x*cs+rnd()*cs, py=y*cs+rnd()*cs; if(D[((py|0)*OW+(px|0))*4+3]) continue;
      cx.lineWidth=1; cx.globalAlpha=.55; cx.beginPath(); cx.moveTo(px,py); cx.lineTo(px+cs*.45,py-cs*.3); cx.stroke(); } }
  cx.globalAlpha=1;
  cx.globalAlpha=.25; cx.drawImage(tinta(bl,'#000'),4,5); cx.globalAlpha=1;
  const ink=tinta(bl,pal.ink); for(let a=0;a<8;a++) cx.drawImage(ink,Math.cos(a*.785)*3.2,Math.sin(a*.785)*3.2);
  cx.drawImage(tinta(bl,pal.floor),0,0);
  /* pedrinhas e manchas no piso */
  for(let k=0;k<420;k++){ const px=rnd()*OW, py=rnd()*OH; if(!D[((py|0)*OW+(px|0))*4+3]) continue;
    cx.fillStyle=pal.grid; cx.beginPath(); cx.arc(px,py,1+rnd()*2.4,0,6.3); cx.fill(); }
  /* peças: entrada, baús, armadilhas, tochas em células de piso */
  const livres=melhor.slice(); const sorteia=()=>livres.splice((rnd()*livres.length)|0,1)[0];
  const props=[]; const ent=sorteia(); props.push(propEm('escada',ent%GW,(ent/GW)|0,GW,GH,{label:'Entrada'}));
  const nBau=2+((rnd()*3)|0), nArm=2+((rnd()*3)|0);
  for(let k=0;k<nBau;k++){ const i=sorteia(); props.push(propEm('bau',i%GW,(i/GW)|0,GW,GH)); }
  for(let k=0;k<nArm;k++){ const i=sorteia(); props.push(propEm('armadilha',i%GW,(i/GW)|0,GW,GH,{hidden:true})); }
  for(let k=0;k<6;k++){ const i=sorteia(); props.push(propEm(rnd()<.5?'pedra':'tocha',i%GW,(i/GW)|0,GW,GH)); }
  aplicarGerado(m,cv,{props,note:'# Caverna — semente '+o.seed+'\n\n'+melhor.length+' células de piso. '+nBau+' baús e '+nArm+' armadilhas ocultas espalhados.',
    meta:{g:'caverna',seed:o.seed},grid:{on:true,size:cs/(OW/1000)*1,snap:true}});
}

function genInterior(m,o){
  const rnd=rngSeed('interior:'+o.seed), GW=60, GH=37, cs=20, g=new Uint8Array(GW*GH);
  const R={x:8,y:5,w:44,h:27}, folhas=[], paredes=[];
  const corta=(x,y,w,h,d)=>{
    const pode=(w>=10||h>=10)&&d<5&&(d<2||rnd()<.8);
    if(!pode){ folhas.push({x,y,w,h}); return; }
    const vert=w>h*1.15?true:(h>w*1.15?false:rnd()<.5);
    if(vert){ const s=3+((rnd()*(w-7))|0); paredes.push({v:true,x:x+s,y,len:h}); corta(x,y,s,h,d+1); corta(x+s+1,y,w-s-1,h,d+1); }
    else { const s=3+((rnd()*(h-7))|0); paredes.push({v:false,x,y:y+s,len:w}); corta(x,y,w,s,d+1); corta(x,y+s+1,w,h-s-1,d+1); } };
  corta(R.x,R.y,R.w,R.h,0);
  folhas.forEach(f=>{ for(let yy=f.y;yy<f.y+f.h;yy++) for(let xx=f.x;xx<f.x+f.w;xx++) g[yy*GW+xx]=1; });
  const portas=[];
  paredes.forEach(p=>{ const cand=[]; for(let k=2;k<p.len-2;k++){ const x=p.v?p.x:p.x+k, y=p.v?p.y+k:p.y;
      const a=p.v?g[y*GW+x-1]:g[(y-1)*GW+x], b=p.v?g[y*GW+x+1]:g[(y+1)*GW+x]; if(a===1&&b===1) cand.push([x,y]); }
    if(cand.length){ const [x,y]=cand[(rnd()*cand.length)|0]; g[y*GW+x]=3; portas.push({x,y,v:!p.v}); } });
  /* porta de entrada no muro externo (lado de baixo) */
  const ex=R.x+4+((rnd()*(R.w-8))|0), ey=R.y+R.h; g[ey*GW+ex]=3; portas.push({x:ex,y:ey,v:false});
  const pal=paletaMapa(m.theme), cv=mkCanvas(GW*cs,GH*cs), cx=cv.getContext('2d');
  const dentro=(x,y)=>x>=R.x-1&&x<=R.x+R.w&&y>=R.y-1&&y<=R.y+R.h+1;
  const numeros=folhas.map((f,i)=>({n:i+1,x:f.x+f.w/2,y:f.y+f.h/2}));
  desenharGrade(cx,g,GW,GH,cs,pal,rnd,{portas,numeros,paredeCheia:true,tabuas:true,dentro});
  const NOMES=['Sala de estar','Cozinha','Quarto','Despensa','Escritório','Oficina','Salão','Adega','Quarto de hóspedes','Biblioteca'];
  const MOVEIS=['mesa','barril','bau','mesa','bandeira'];
  const props=[], nota=['# Interior — semente '+o.seed,''];
  folhas.forEach((f,i)=>{ nota.push((i+1)+'. '+sorteiaDe(rnd,NOMES)+' ('+f.w+'×'+f.h+')');
    const n=1+((rnd()*3)|0); for(let k=0;k<n;k++) props.push(propEm(sorteiaDe(rnd,MOVEIS),f.x+1+((rnd()*(f.w-2))|0),f.y+1+((rnd()*(f.h-2))|0),GW,GH)); });
  aplicarGerado(m,cv,{props,note:nota.join('\n'),meta:{g:'interior',seed:o.seed},grid:{on:true,size:cs/(cv.width/1000),snap:true}});
}

/* ============================ LOCAL: vila / cidade ============================ */
function genVila(m,o){
  const rnd=rngSeed('vila:'+o.seed), nz=makeNoise(rnd), OW=1200, OH=750, cv=mkCanvas(OW,OH), cx=cv.getContext('2d');
  const nat=m.theme!=='sombrio'&&m.theme!=='futurista', verde=m.theme==='sombrio'?[34,46,40]:m.theme==='futurista'?[10,28,40]:[118,156,92];
  const im=cx.createImageData(OW,OH), D=im.data;
  for(let y=0;y<OH;y++) for(let x=0;x<OW;x++){ const n=nz.fbm(x*.008,y*.008,4), r=(nz.n2(x*.4,y*.4)-.5)*14, k=.8+n*.5, p=(y*OW+x)*4;
    D[p]=verde[0]*k+r; D[p+1]=verde[1]*k+r; D[p+2]=verde[2]*k+r; D[p+3]=255; }
  cx.putImageData(im,0,0);
  const tam=Math.max(2,Math.min(5,o.tamanho||3));
  /* rio opcional */
  const rio=o.rio!==false&&rnd()<.8, rioY=OH*(.25+rnd()*.5), rioAmp=40+rnd()*50;
  const rioPts=[]; for(let x=-20;x<=OW+20;x+=20) rioPts.push([x,rioY+Math.sin(x*.006+rnd()*.2)*rioAmp+(nz.n2(x*.01,3)-.5)*60]);
  const ruas=[]; /* cada rua: lista de pontos */
  const curva=(a,b,flex)=>{ const pts=[], mx=(a[0]+b[0])/2+(rnd()-.5)*flex, my=(a[1]+b[1])/2+(rnd()-.5)*flex;
    for(let t=0;t<=1.0001;t+=.05) pts.push([(1-t)*(1-t)*a[0]+2*(1-t)*t*mx+t*t*b[0],(1-t)*(1-t)*a[1]+2*(1-t)*t*my+t*t*b[1]]); return pts; };
  const cxm=OW/2+(rnd()-.5)*120, cym=OH/2+(rnd()-.5)*80;
  ruas.push(curva([-20,cym+(rnd()-.5)*160],[OW+20,cym+(rnd()-.5)*160],120));
  ruas.push(curva([cxm+(rnd()-.5)*200,-20],[cxm+(rnd()-.5)*200,OH+20],120));
  for(let k=0;k<tam;k++){ const base=ruas[(rnd()*ruas.length)|0], p=base[(3+rnd()*(base.length-6))|0];
    const ang=rnd()*6.28, l=160+rnd()*160; ruas.push(curva(p,[p[0]+Math.cos(ang)*l,p[1]+Math.sin(ang)*l],60)); }
  const tracar=(pts,larg,cor)=>{ cx.strokeStyle=cor; cx.lineWidth=larg; cx.lineCap='round'; cx.lineJoin='round'; cx.beginPath(); pts.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1])); cx.stroke(); };
  if(rio){ tracar(rioPts,36,'#2c5f94'); tracar(rioPts,30,'#4b8fcf'); tracar(rioPts,12,'rgba(255,255,255,.18)'); }
  ruas.forEach((r,i)=>{ tracar(r,i<2?24:15,'#5c4630'); tracar(r,i<2?20:11,'#b79a6e'); });
  /* pontes onde a rua cruza o rio */
  const sobreRio=(x,y)=>rio&&rioPts.some(p=>Math.hypot(p[0]-x,p[1]-y)<26);
  /* casas ao longo das ruas */
  const casas=[], cores=m.theme==='sombrio'?['#4a3b52','#3a4a5e','#5a3a3a']:m.theme==='futurista'?['#1d6f8f','#2d4a8f','#2a7f77']:['#a8553a','#8c6a3c','#b4743f','#7a4a3a','#9a5a46'];
  const casaOk=(x,y,r)=>x>30&&y>30&&x<OW-30&&y<OH-30&&!sobreRio(x,y)&&!casas.some(c=>Math.hypot(c.x-x,c.y-y)<c.r+r)&&!ruas.some(rr=>rr.some(p=>Math.hypot(p[0]-x,p[1]-y)<r+10));
  const alvoCasas=18+tam*14;
  for(let t=0;t<4000&&casas.length<alvoCasas;t++){
    const rua=ruas[(rnd()*ruas.length)|0], i=(rnd()*(rua.length-1))|0, a=rua[i], b=rua[i+1];
    const ang=Math.atan2(b[1]-a[1],b[0]-a[0]), lado=rnd()<.5?1:-1, w=26+rnd()*26, hh=18+rnd()*16, dist=22+hh/2+rnd()*30;
    const x=a[0]+Math.cos(ang+lado*1.5708)*dist, y=a[1]+Math.sin(ang+lado*1.5708)*dist, r=Math.max(w,hh)*.62;
    if(!casaOk(x,y,r)) continue; casas.push({x,y,r,w,h:hh,ang,cor:sorteiaDe(rnd,cores)}); }
  casas.forEach(c=>{ cx.save(); cx.translate(c.x,c.y); cx.rotate(c.ang);
    cx.fillStyle='rgba(0,0,0,.28)'; cx.fillRect(-c.w/2+3,-c.h/2+4,c.w,c.h);
    cx.fillStyle=c.cor; cx.fillRect(-c.w/2,-c.h/2,c.w,c.h);
    cx.fillStyle='rgba(0,0,0,.2)'; cx.fillRect(-c.w/2,0,c.w,c.h/2);
    cx.strokeStyle='#2a1c12'; cx.lineWidth=1.8; cx.strokeRect(-c.w/2,-c.h/2,c.w,c.h);
    cx.beginPath(); cx.moveTo(-c.w/2,0); cx.lineTo(c.w/2,0); cx.stroke(); cx.restore(); });
  /* árvores e campos nas bordas */
  for(let k=0;k<260;k++){ const x=rnd()*OW, y=rnd()*OH; if(!casaOk(x,y,6)) continue;
    cx.fillStyle='rgba(0,0,0,.25)'; cx.beginPath(); cx.arc(x+2,y+3,6,0,6.3); cx.fill();
    cx.fillStyle=nat?'#2f6b3a':'#1c3a30'; cx.strokeStyle='#14301c'; cx.lineWidth=1; cx.beginPath(); cx.arc(x,y,5+rnd()*3,0,6.3); cx.fill(); cx.stroke(); }
  /* praça + poço */
  const px=cxm, py=cym; cx.fillStyle='#c7ad7e'; cx.strokeStyle='#5c4630'; cx.lineWidth=2; cx.beginPath(); cx.arc(px,py,26,0,6.3); cx.fill(); cx.stroke();
  cx.fillStyle='#4b8fcf'; cx.beginPath(); cx.arc(px,py,8,0,6.3); cx.fill(); cx.strokeStyle='#2a1c12'; cx.stroke();
  /* locais de interesse sobre casas sorteadas */
  const TIPOS=[['🍺','Taverna','Taverna'],['⚒️','Ferreiro','Forja'],['⛪','Templo','Templo'],['🏪','Mercado','Mercado'],['🏰','Mansão','Solar do senhor'],['📜','Guilda','Sede da guilda']];
  const pins=[], usadas=new Set(), nota=['# Vila — semente '+o.seed,'', casas.length+' construções.',''];
  TIPOS.forEach(([ic,tipo,lbl])=>{ if(!casas.length) return; let c,t=0; do{ c=(rnd()*casas.length)|0; t++; }while(usadas.has(c)&&t<40); usadas.add(c);
    const p=newPin(casas[c].x/OW*100,casas[c].y/OH*100,ic); p.label=nomeProc(rnd,'cidade').replace(/^./,s=>s.toUpperCase())+' · '+lbl; p.note=tipo+' (gerado)'; pins.push(p); nota.push('- '+ic+' '+p.label); });
  aplicarGerado(m,cv,{pins,note:nota.join('\n'),meta:{g:'vila',seed:o.seed},grid:{on:false}});
}

/* ---------- Escolha do gerador conforme o tipo do mapa ---------- */
function geradoresDoMapa(kind){
  if(kind==='mundo'||kind==='regiao') return [{k:'mundo',ic:'🌍',nome:'Mundo / região'}];
  if(kind==='local') return [{k:'vila',ic:'🏘️',nome:'Vila / cidade'}];
  if(kind==='interior') return [{k:'interior',ic:'🏠',nome:'Planta de casa'}];
  return [{k:'masmorra',ic:'🕳️',nome:'Masmorra'},{k:'caverna',ic:'🦇',nome:'Caverna'}];
}
function gerarMapa(m,g,o){
  ({mundo:genMundo,masmorra:genMasmorra,caverna:genCaverna,interior:genInterior,vila:genVila})[g](m,o);
}
