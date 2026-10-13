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
   Os geradores produzem OBJETOS editáveis (m.objs: salas, paredes, portas, casas, rios,
   estradas, fronteiras…) + peças/locais/reinos, tudo marcado `gen:true` (regenerar troca só
   o que ainda é gerado). Só o relevo do mundo e a grama da vila continuam como imagem de
   fundo (m.image), que pode ser convertida em terreno pintável. */

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

/* Aplica o resultado de um gerador ao mapa. O fundo (m.image) agora é só o relevo/papel
   quando há um (mundo, vila); salas, paredes, portas, casas, rios, estradas e fronteiras
   vêm como OBJETOS editáveis (extra.objs). Tudo que é gerado leva gen:true — regenerar
   troca só o que ainda é gerado (o que o usuário editou perde o gen e fica). */
function aplicarGerado(m, canvas, extra){
  m.image=canvas?canvas.toDataURL('image/jpeg',0.88):null;
  m.terrain=null; if(typeof terrainReset==='function') terrainReset();
  m.pins=(m.pins||[]).filter(p=>!p.gen);
  m.props=(m.props||[]).filter(p=>!p.gen);
  m.objs=(m.objs||[]).filter(o=>!o.gen);
  if(m.world) m.world.kingdoms=(m.world.kingdoms||[]).filter(k=>!k.gen);
  (extra.objs||[]).forEach(o=>{ o.gen=true; m.objs.push(o); });
  (extra.pins||[]).forEach(p=>{ p.gen=true; m.pins.push(p); });
  (extra.props||[]).forEach(p=>{ p.gen=true; m.props.push(p); });
  (extra.kingdoms||[]).forEach(k=>{ k.gen=true; m.world.kingdoms.push(k); });
  if(extra.note!=null) m.note=extra.note;
  m.bg=extra.bg||null; m.fx=extra.fx||null;
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

  /* ---- 3) rios → OBJETOS editáveis (polilinhas suaves, da nascente à foz) ---- */
  const objs=[], UC=1000/GW;
  const cu=i=>[ (i%GW+.5)*UC, (((i/GW)|0)+.5)*UC ];
  const jit=(p,k)=>[p[0]+(rnd()-.5)*UC*k, p[1]+(rnd()-.5)*UC*k];
  const ehRio=i=>terra(i)&&fluxo[i]>=limRio&&desce[i]>=0;
  const recebe=new Set(); for(let i=0;i<N;i++) if(ehRio(i)) recebe.add(desce[i]);
  const viu=new Uint8Array(N);
  for(let i=0;i<N;i++){ if(!ehRio(i)||recebe.has(i)) continue;
    const cad=[]; let k=i, g=0, fmax=0;
    while(k>=0 && g++<700){ cad.push(k); if(ehRio(k)) fmax=Math.max(fmax,fluxo[k]); if(viu[k]||!ehRio(k)) break; viu[k]=1; k=desce[k]; }
    if(cad.length<4) continue;
    const pts=cad.filter((_,n)=>n%2===0||n===cad.length-1).map((c,n,arr)=>(n===0||n===arr.length-1)?cu(c):jit(cu(c),.5));
    objs.push(mkObj(m,'path','river',{pts,closed:false,smooth:true,stroke:'#3f7fb8',sw:Math.round((1.6+Math.min(3.4,Math.sqrt(fmax/limRio)*.9))*10)/10,edge:null,edgew:0,label:'Rio'}));
  }

  /* ---- 4) fronteiras entre reinos → polilinhas ---- */
  const segs=[];
  for(let y=0;y<GH-1;y++) for(let x=0;x<GW-1;x++){ const i=y*GW+x; if(!terra(i)) continue;
    const r=i+1, d=i+GW;
    if(terra(r)&&exp.dono[r]!==exp.dono[i]) segs.push([[x+1,y],[x+1,y+1]]);
    if(terra(d)&&exp.dono[d]!==exp.dono[i]) segs.push([[x,y+1],[x+1,y+1]]); }
  { const key=(p)=>p[0]*1000+p[1], adj=new Map(), usado=new Uint8Array(segs.length);
    segs.forEach((sg,ix)=>{ sg.forEach(p=>{ const kk=key(p); if(!adj.has(kk)) adj.set(kk,[]); adj.get(kk).push(ix); }); });
    const estende=(linha,fim)=>{ for(;;){ const pt=fim?linha[linha.length-1]:linha[0], cand=(adj.get(key(pt))||[]).find(ix=>!usado[ix]); if(cand==null) break;
        usado[cand]=1; const sg=segs[cand], outro=(key(sg[0])===key(pt))?sg[1]:sg[0]; if(fim) linha.push(outro); else linha.unshift(outro); } };
    for(let ix=0;ix<segs.length;ix++){ if(usado[ix]) continue; usado[ix]=1;
      const linha=[segs[ix][0],segs[ix][1]]; estende(linha,true); estende(linha,false);
      const simp=linha.filter((p,n)=>{ if(n===0||n===linha.length-1) return true; const a=linha[n-1], b=linha[n+1]; return !((p[0]-a[0])*(b[1]-p[1])===(p[1]-a[1])*(b[0]-p[0])); });
      if(simp.length<2) continue;
      objs.push(mkObj(m,'path','border',{pts:simp.map((p,n)=>{ const q=[p[0]*UC,p[1]*UC]; return (n===0||n===simp.length-1)?q:jit(q,.4); }),closed:false,smooth:true,stroke:'#6b2e2e',sw:1.6,dash:'dash',label:'Fronteira'})); } }

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
    es.cidades.forEach(c=>{ const caminho=[]; for(let k=c;k>=0&&caminho.length<500;k=rota.prev[k]) caminho.push(k);
      if(caminho.length<2) return;
      const pts=caminho.filter((_,n)=>n%3===0||n===caminho.length-1).map((k,n,arr)=>(n===0||n===arr.length-1)?cu(k):jit(cu(k),.6));
      objs.push(mkObj(m,'path','road',{pts,closed:false,smooth:true,stroke:'#704824',sw:2.4,edge:null,edgew:0,dash:'dash',label:'Estrada de '+es.nome})); });
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
  aplicarGerado(m,cv,{objs,pins,kingdoms:reinos,note:nota.join('\n'),meta:{g:'mundo',seed:o.seed},
    grid:{on:false}});
  m.world.continent.shape='none';
}

/* ============================ PEQUENA ESCALA: masmorra / caverna / interior ============================
   Tudo vira OBJETOS: salas e corredores (role 'floor', fundidos numa planta só), portas, números de
   sala, casas, árvores, rios. As hachuras e a sombra são desenhadas pelo renderizador de objetos
   (m.fx), então continuam certas depois de mover/apagar qualquer sala. */
function paletaMapa(theme){
  if(theme==='sombrio') return {bg:'#1a1722',floor:'#3b364a',grid:'#4a4560',ink:'#07060b',hatch:'#6d678a',wall:'#58526f',txt:'#e8e2ff',door:'#7a5a3a'};
  if(theme==='futurista') return {bg:'#06121f',floor:'#0f2a44',grid:'#1b476c',ink:'#22d3ee',hatch:'#1b6a86',wall:'#134a6e',txt:'#cffafe',door:'#0e7490'};
  if(theme==='natural') return {bg:'#c9cfa8',floor:'#efe8cc',grid:'#d3cba6',ink:'#2b3a1f',hatch:'#3f5130',wall:'#a39d78',txt:'#2b3a1f',door:'#7b5a2e'};
  return {bg:'#e9dcc0',floor:'#f8f1dc',grid:'#dccfa9',ink:'#2a2118',hatch:'#3a2d20',wall:'#b9a883',txt:'#2a2118',door:'#8b5a2b'};
}
const CONTEUDO_SALA=[
  ['vazia','Sala vazia, com poeira e eco. Vale uma checagem de percepção.'],
  ['inimigos','Inimigos de guarda (use o Bestiário). Pode haver emboscada.'],
  ['armadilha','Armadilha escondida no piso — veja a peça oculta no mapa.'],
  ['tesouro','Tesouro: baú com itens ou moedas (veja o baú no mapa).'],
  ['enigma','Enigma ou mecanismo que abre outra passagem.'],
  ['descanso','Local seguro para descansar, com sinais de acampamento antigo.'],
];
/* peça (prop) posicionada em unidades de mapa */
function propAt(k,ux,uy,extra){ const p=newProp(k,ux/10,uy/6.25); if(extra) Object.assign(p,extra); return p; }
/* objetos de piso/porta/número a partir de células (x,y,w,h em células de tamanho cu) */
function pisoRect(m,x,y,w,h,cu,label,ell){
  return mkObj(m,ell?'ellipse':'rect','floor',{cx:(x+w/2)*cu,cy:(y+h/2)*cu,w:w*cu,h:h*cu,label:label||'Sala'});
}
function portaObj(m,x,y,cu,v){ return mkObj(m,'door','plain',{cx:(x+.5)*cu,cy:(y+.5)*cu,w:cu*0.9,rot:v?90:0,fill:paletaMapa(m.theme).door,stroke:paletaMapa(m.theme).ink,label:'Porta'}); }
function numeroObj(m,n,x,y,cu){ const pal=paletaMapa(m.theme);
  return mkObj(m,'text','plain',{x:x*cu,y:y*cu,text:String(n),size:Math.max(9,Math.round(cu*.62)),color:pal.txt,bold:true,halo:false,badge:true,bgc:pal.floor,label:'Sala '+n}); }

function genMasmorra(m,o){
  const rnd=rngSeed('masmorra:'+o.seed), GW=60, GH=37, cu=1000/GW, g=new Uint8Array(GW*GH);
  const alvo=Math.max(4,Math.min(24,o.salas||12)), salas=[];
  for(let t=0;t<900&&salas.length<alvo;t++){
    const w=4+((rnd()*7)|0), h=3+((rnd()*5)|0), x=2+((rnd()*(GW-w-4))|0), y=2+((rnd()*(GH-h-4))|0);
    if(salas.some(r=>x<r.x+r.w+2&&x+w+2>r.x&&y<r.y+r.h+2&&y+h+2>r.y)) continue;
    salas.push({x,y,w,h,cx:(x+w/2)|0,cy:(y+h/2)|0,redonda:rnd()<.18&&w>=5&&h>=5});
  }
  salas.forEach(r=>{ for(let yy=r.y;yy<r.y+r.h;yy++) for(let xx=r.x;xx<r.x+r.w;xx++){
    if(r.redonda){ const dx=(xx+.5-(r.x+r.w/2))/(r.w/2), dy=(yy+.5-(r.y+r.h/2))/(r.h/2); if(dx*dx+dy*dy>1.05) continue; }
    g[yy*GW+xx]=1; } });
  const lig=[], dentro=new Set([0]); while(dentro.size<salas.length){
    let bi=-1,bj=-1,bd=Infinity; dentro.forEach(i=>{ salas.forEach((s,j)=>{ if(dentro.has(j)) return; const d=Math.hypot(salas[i].cx-s.cx,salas[i].cy-s.cy); if(d<bd){ bd=d; bi=i; bj=j; } }); });
    lig.push([bi,bj]); dentro.add(bj); }
  for(let k=0;k<Math.floor(salas.length/4);k++){ const a=(rnd()*salas.length)|0, b=(rnd()*salas.length)|0; if(a!==b) lig.push([a,b]); }
  const objs=[], corr=[];
  const corredor=(a,b)=>{ let x=a.cx,y=a.cy; const horizPrimeiro=rnd()<.5;
    const passo=(hz)=>{ const x0=x,y0=y;
      if(hz){ while(x!==b.cx){ x+=Math.sign(b.cx-x); if(!g[y*GW+x]) g[y*GW+x]=2; } corr.push([Math.min(x0,x),y,Math.abs(x-x0)+1,1]); }
      else { while(y!==b.cy){ y+=Math.sign(b.cy-y); if(!g[y*GW+x]) g[y*GW+x]=2; } corr.push([x,Math.min(y0,y),1,Math.abs(y-y0)+1]); } };
    passo(horizPrimeiro); passo(!horizPrimeiro); };
  lig.forEach(([a,b])=>corredor(salas[a],salas[b]));
  salas.forEach((r,i)=>objs.push(pisoRect(m,r.x,r.y,r.w,r.h,cu,'Sala '+(i+1),r.redonda)));
  corr.forEach(c=>objs.push(pisoRect(m,c[0],c[1],c[2],c[3],cu,'Corredor')));
  for(let y=1;y<GH-1;y++) for(let x=1;x<GW-1;x++){ if(g[y*GW+x]!==2) continue;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
      if(g[(y+dy)*GW+x+dx]===1&&g[(y-dy)*GW+x-dx]===2&&!g[(y+dx)*GW+x+dy]&&!g[(y-dx)*GW+x-dy]) objs.push(portaObj(m,x,y,cu,dx!==0)); }); }
  salas.forEach((r,i)=>objs.push(numeroObj(m,i+1,r.x+r.w/2,r.y+r.h/2,cu)));
  const pal=paletaMapa(m.theme);
  const pc=(k,cx_,cy_,extra)=>propAt(k,(cx_+.5)*cu,(cy_+.5)*cu,extra);
  const props=[], nota=['# Masmorra — semente '+o.seed,'','1 = entrada · '+salas.length+' = covil final',''];
  salas.forEach((r,i)=>{
    const ultima=i===salas.length-1, primeira=i===0, sorte=primeira?'vazia':(ultima?'inimigos':CONTEUDO_SALA[(rnd()*CONTEUDO_SALA.length)|0][0]);
    const texto=(CONTEUDO_SALA.find(c=>c[0]===sorte)||CONTEUDO_SALA[0])[1];
    if(primeira) props.push(pc('escada',r.cx,r.cy,{label:'Entrada'}));
    if(sorte==='tesouro'||ultima) props.push(pc('bau',r.cx+((rnd()*2)|0),r.cy));
    if(sorte==='armadilha') props.push(pc('armadilha',r.cx,r.cy+1>=r.y+r.h?r.cy:r.cy+1,{hidden:true}));
    if(sorte==='enigma') props.push(pc('altar',r.cx,r.cy));
    if(rnd()<.5) props.push(pc('tocha',r.x,r.y));
    nota.push((i+1)+'. '+r.w+'×'+r.h+' — '+(ultima?'**Covil final.** ':primeira?'**Entrada.** ':'')+texto);
  });
  aplicarGerado(m,null,{objs,props,note:nota.join('\n'),bg:pal.bg,fx:{hatch:pal.hatch},meta:{g:'masmorra',seed:o.seed},grid:{on:true,size:cu,snap:true}});
}

function genCaverna(m,o){
  const rnd=rngSeed('caverna:'+o.seed), GW=100, GH=62, cu=10; let g=new Uint8Array(GW*GH);
  for(let y=0;y<GH;y++) for(let x=0;x<GW;x++) g[y*GW+x]=(x<2||y<2||x>=GW-2||y>=GH-2)?0:(rnd()<.46?0:1);
  for(let it=0;it<5;it++){ const n=new Uint8Array(g.length);
    for(let y=1;y<GH-1;y++) for(let x=1;x<GW-1;x++){ let w=0; for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) if(!g[(y+dy)*GW+x+dx]) w++; n[y*GW+x]=w>=5?0:1; }
    g=n; }
  const seen=new Uint8Array(g.length); let melhor=[];
  for(let s=0;s<g.length;s++){ if(!g[s]||seen[s]) continue; const fila=[s], reg=[]; seen[s]=1;
    while(fila.length){ const i=fila.pop(); reg.push(i); [i+1,i-1,i+GW,i-GW].forEach(j=>{ if(j>=0&&j<g.length&&g[j]&&!seen[j]){ seen[j]=1; fila.push(j); } }); }
    if(reg.length>melhor.length) melhor=reg; }
  g=new Uint8Array(g.length); melhor.forEach(i=>{ g[i]=1; });
  /* cobre as células de piso com poucos retângulos (guloso); o filtro "goo" arredonda o contorno */
  const usado=new Uint8Array(g.length), objs=[];
  for(let y=0;y<GH;y++) for(let x=0;x<GW;x++){ const i=y*GW+x; if(!g[i]||usado[i]) continue;
    let w=1; while(x+w<GW&&g[i+w]&&!usado[i+w]) w++;
    let hh=1; for(;y+hh<GH;hh++){ let ok=true; for(let k=0;k<w;k++){ const j=(y+hh)*GW+x+k; if(!g[j]||usado[j]){ ok=false; break; } } if(!ok) break; }
    for(let yy=0;yy<hh;yy++) for(let k=0;k<w;k++) usado[(y+yy)*GW+x+k]=1;
    const r=pisoRect(m,x,y,w,hh,cu,'Galeria'); r.sw=2.5; objs.push(r); }
  const pal=paletaMapa(m.theme);
  const pc=(k,i,extra)=>propAt(k,((i%GW)+.5)*cu,(((i/GW)|0)+.5)*cu,extra);
  const livres=melhor.slice(); const sorteia=()=>livres.splice((rnd()*livres.length)|0,1)[0];
  const props=[]; const ent=sorteia(); props.push(pc('escada',ent,{label:'Entrada'}));
  const nBau=2+((rnd()*3)|0), nArm=2+((rnd()*3)|0);
  for(let k=0;k<nBau;k++) props.push(pc('bau',sorteia()));
  for(let k=0;k<nArm;k++) props.push(pc('armadilha',sorteia(),{hidden:true}));
  for(let k=0;k<6;k++) props.push(pc(rnd()<.5?'pedra':'tocha',sorteia()));
  aplicarGerado(m,null,{objs,props,note:'# Caverna — semente '+o.seed+'\n\n'+melhor.length+' células de piso. '+nBau+' baús e '+nArm+' armadilhas ocultas espalhados.',
    bg:pal.bg,fx:{hatch:pal.hatch,goo:true,hatchW:30},meta:{g:'caverna',seed:o.seed},grid:{on:false,size:cu*5,snap:true}});
}

function genInterior(m,o){
  const rnd=rngSeed('interior:'+o.seed), GW=60, GH=37, cu=1000/GW, g=new Uint8Array(GW*GH);
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
    if(cand.length){ const [x,y]=cand[(rnd()*cand.length)|0]; portas.push({x,y,v:!p.v}); } });
  const ex=R.x+4+((rnd()*(R.w-8))|0), ey=R.y+R.h; portas.push({x:ex,y:ey,v:false});
  const pal=paletaMapa(m.theme), objs=[];
  const parede=mkObj(m,'rect','wall',{cx:(R.x-1+(R.w+2)/2)*cu,cy:(R.y-1+(R.h+2)/2)*cu,w:(R.w+2)*cu,h:(R.h+2)*cu,label:'Paredes externas'}); parede.sw=3.2; objs.push(parede);
  const NOMES=['Sala de estar','Cozinha','Quarto','Despensa','Escritório','Oficina','Salão','Adega','Quarto de hóspedes','Biblioteca'];
  const nota=['# Interior — semente '+o.seed,''], nomes=folhas.map(()=>sorteiaDe(rnd,NOMES));
  folhas.forEach((f,i)=>{ objs.push(pisoRect(m,f.x,f.y,f.w,f.h,cu,nomes[i])); nota.push((i+1)+'. '+nomes[i]+' ('+f.w+'×'+f.h+')'); });
  portas.forEach(d=>{ objs.push(pisoRect(m,d.x,d.y,1,1,cu,'Vão da porta')); });
  portas.forEach(d=>objs.push(portaObj(m,d.x,d.y,cu,d.v)));
  folhas.forEach((f,i)=>objs.push(numeroObj(m,i+1,f.x+f.w/2,f.y+f.h/2,cu)));
  const MOVEIS=['mesa','barril','bau','mesa','bandeira'], props=[];
  folhas.forEach(f=>{ const n=1+((rnd()*3)|0); for(let k=0;k<n;k++) props.push(propAt(sorteiaDe(rnd,MOVEIS),(f.x+1+((rnd()*(f.w-2))|0)+.5)*cu,(f.y+1+((rnd()*(f.h-2))|0)+.5)*cu)); });
  aplicarGerado(m,null,{objs,props,note:nota.join('\n'),bg:pal.bg,fx:null,meta:{g:'interior',seed:o.seed},grid:{on:true,size:cu,snap:true}});
}

/* ============================ LOCAL: vila / cidade ============================ */
function genVila(m,o){
  const rnd=rngSeed('vila:'+o.seed), nz=makeNoise(rnd), OW=1200, OH=750, K=1000/OW, cv=mkCanvas(OW,OH), cx=cv.getContext('2d');
  const nat=m.theme!=='sombrio'&&m.theme!=='futurista', verde=m.theme==='sombrio'?[34,46,40]:m.theme==='futurista'?[10,28,40]:[118,156,92];
  const im=cx.createImageData(OW,OH), D=im.data;
  for(let y=0;y<OH;y++) for(let x=0;x<OW;x++){ const n=nz.fbm(x*.008,y*.008,4), r=(nz.n2(x*.4,y*.4)-.5)*14, k=.8+n*.5, p=(y*OW+x)*4;
    D[p]=verde[0]*k+r; D[p+1]=verde[1]*k+r; D[p+2]=verde[2]*k+r; D[p+3]=255; }
  cx.putImageData(im,0,0);
  const tam=Math.max(2,Math.min(5,o.tamanho||3));
  const rio=o.rio!==false&&rnd()<.8, rioY=OH*(.25+rnd()*.5), rioAmp=40+rnd()*50;
  const rioPts=[]; for(let x=-20;x<=OW+20;x+=20) rioPts.push([x,rioY+Math.sin(x*.006+rnd()*.2)*rioAmp+(nz.n2(x*.01,3)-.5)*60]);
  const ruas=[];
  const curva=(a,b,flex)=>{ const pts=[], mx=(a[0]+b[0])/2+(rnd()-.5)*flex, my=(a[1]+b[1])/2+(rnd()-.5)*flex;
    for(let t=0;t<=1.0001;t+=.05) pts.push([(1-t)*(1-t)*a[0]+2*(1-t)*t*mx+t*t*b[0],(1-t)*(1-t)*a[1]+2*(1-t)*t*my+t*t*b[1]]); return pts; };
  const cxm=OW/2+(rnd()-.5)*120, cym=OH/2+(rnd()-.5)*80;
  ruas.push(curva([-20,cym+(rnd()-.5)*160],[OW+20,cym+(rnd()-.5)*160],120));
  ruas.push(curva([cxm+(rnd()-.5)*200,-20],[cxm+(rnd()-.5)*200,OH+20],120));
  for(let k=0;k<tam;k++){ const base=ruas[(rnd()*ruas.length)|0], p=base[(3+rnd()*(base.length-6))|0];
    const ang=rnd()*6.28, l=160+rnd()*160; ruas.push(curva(p,[p[0]+Math.cos(ang)*l,p[1]+Math.sin(ang)*l],60)); }
  const sobreRio=(x,y)=>rio&&rioPts.some(p=>Math.hypot(p[0]-x,p[1]-y)<26);
  const casas=[], cores=m.theme==='sombrio'?['#4a3b52','#3a4a5e','#5a3a3a']:m.theme==='futurista'?['#1d6f8f','#2d4a8f','#2a7f77']:['#a8553a','#8c6a3c','#b4743f','#7a4a3a','#9a5a46'];
  const casaOk=(x,y,r)=>x>30&&y>30&&x<OW-30&&y<OH-30&&!sobreRio(x,y)&&!casas.some(c=>Math.hypot(c.x-x,c.y-y)<c.r+r)&&!ruas.some(rr=>rr.some(p=>Math.hypot(p[0]-x,p[1]-y)<r+10));
  const alvoCasas=18+tam*14;
  for(let t=0;t<4000&&casas.length<alvoCasas;t++){
    const rua=ruas[(rnd()*ruas.length)|0], i=(rnd()*(rua.length-1))|0, a=rua[i], b=rua[i+1];
    const ang=Math.atan2(b[1]-a[1],b[0]-a[0]), lado=rnd()<.5?1:-1, w=26+rnd()*26, hh=18+rnd()*16, dist=22+hh/2+rnd()*30;
    const x=a[0]+Math.cos(ang+lado*1.5708)*dist, y=a[1]+Math.sin(ang+lado*1.5708)*dist, r=Math.max(w,hh)*.62;
    if(!casaOk(x,y,r)) continue; casas.push({x,y,r,w,h:hh,ang,cor:sorteiaDe(rnd,cores)}); }
  const objs=[], P=p=>[p[0]*K,p[1]*K];
  if(rio) objs.push(mkObj(m,'path','river',{pts:rioPts.filter((_,i)=>i%2===0).map(P),closed:false,smooth:true,sw:Math.round(30*K),edge:'#2c5f94',edgew:3,label:'Rio'}));
  ruas.forEach((r,i)=>objs.push(mkObj(m,'path','road',{pts:r.filter((_,n)=>n%2===0||n===r.length-1).map(P),closed:false,smooth:true,sw:Math.round((i<2?22:13)*K),label:i<2?'Rua principal':'Rua'})));
  const px=cxm*K, py=cym*K;
  objs.push(mkObj(m,'ellipse','plaza',{cx:px,cy:py,w:52*K*1.2,h:52*K*1.2,label:'Praça'}));
  objs.push(mkObj(m,'ellipse','water',{cx:px,cy:py,w:16*K*1.2,h:16*K*1.2,fill:'#4b8fcf',stroke:'#2a1c12',sw:1.6,op:1,label:'Poço'}));
  casas.forEach((c,n)=>objs.push(mkObj(m,'rect','house',{cx:c.x*K,cy:c.y*K,w:c.w*K,h:c.h*K,rot:Math.round(c.ang*180/Math.PI*10)/10,fill:c.cor,label:'Casa '+(n+1)})));
  for(let k=0;k<170;k++){ const x=rnd()*OW, y=rnd()*OH; if(!casaOk(x,y,6)) continue;
    const d=(5+rnd()*3)*2*K; objs.push(mkObj(m,'ellipse','tree',{cx:x*K,cy:y*K,w:d,h:d,fill:nat?'#2f6b3a':'#1c3a30',stroke:'#14301c',label:'Árvore'})); }
  const TIPOS=[['🍺','Taverna','Taverna'],['⚒️','Ferreiro','Forja'],['⛪','Templo','Templo'],['🏪','Mercado','Mercado'],['🏰','Mansão','Solar do senhor'],['📜','Guilda','Sede da guilda']];
  const pins=[], usadas=new Set(), nota=['# Vila — semente '+o.seed,'',casas.length+' construções.',''];
  TIPOS.forEach(([ic,tipo,lbl])=>{ if(!casas.length) return; let c,t=0; do{ c=(rnd()*casas.length)|0; t++; }while(usadas.has(c)&&t<40); usadas.add(c);
    const p=newPin(casas[c].x/OW*100,casas[c].y/OH*100,ic); p.label=nomeProc(rnd,'cidade').replace(/^./,s=>s.toUpperCase())+' · '+lbl; p.note=tipo+' (gerado)'; pins.push(p); nota.push('- '+ic+' '+p.label); });
  aplicarGerado(m,cv,{objs,pins,note:nota.join('\n'),meta:{g:'vila',seed:o.seed},grid:{on:false}});
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
