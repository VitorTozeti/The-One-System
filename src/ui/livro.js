/* ============================================================ LIVRO DE REGRAS (PDF / .DOC) ============================================================
   Todo sistema de RPG circula como livro: capa, sumário, capítulos, tabelas, ilustrações.
   Esta aba monta esse livro a partir do próprio sistema (atributos, recursos, perícias, classes, origens, itens,
   técnicas, condições, escolhas) e deixa o Mestre:
     • escolher e REORDENAR capítulos, trocar títulos, escrever texto de abertura e inserir IMAGENS em qualquer capítulo;
     • criar capítulos livres (lore, regras da casa, tabelas de encontro…);
     • ver o resultado como PÁGINAS de documento — na visão do JOGADOR (sem código, sem notas do Mestre) ou do MESTRE;
     • exportar: PDF (diálogo de impressão do navegador → "Salvar como PDF"), .doc (abre no Word/LibreOffice/Google Docs) e .html.
   Tudo offline: o documento é uma string HTML (livroDocumento) usada na prévia, na impressão e nos arquivos.
   Dados em sys.livro (ver sanitizarLivro). Depende de: master-detail não (layout próprio), effectLabel, levelLabel, itemCatLabel… */

const LIVRO_CAPS=[
  ['regras','Regras gerais'],['atributos','Atributos'],['recursos','Recursos'],['pericias','Perícias'],['classes','Classes'],
  ['origens','Origens e raças'],['itens','Itens e equipamento'],['tecnicas','Técnicas e magias'],['condicoes','Condições'],['escolhas','Escolhas e talentos'],
];
const LIVRO_LARG=[['pequena','Pequena (35%)'],['media','Média (60%)'],['cheia','Largura total']];
function sanitizarLivro(sys){
  const L=(sys.livro&&typeof sys.livro==='object')?sys.livro:(sys.livro={});
  if(typeof L.titulo!=='string') L.titulo=sys.campaignName||sys.name||'Meu sistema de RPG';
  ['subtitulo','autor','capa','rodape'].forEach(k=>{ if(typeof L[k]!=='string') L[k]=''; });
  if(typeof L.cor!=='string') L.cor='#4f46e5';
  if(!['serif','sans'].includes(L.fonte)) L.fonte='serif';
  if(typeof L.sumario!=='boolean') L.sumario=true;
  if(!Array.isArray(L.secoes)) L.secoes=[];
  L.secoes.forEach(s=>{ if(!s.id) s.id=uid(); if(!Array.isArray(s.imgs)) s.imgs=[]; if(typeof s.texto!=='string') s.texto=''; if(typeof s.titulo!=='string') s.titulo=''; if(typeof s.ativa!=='boolean') s.ativa=true;
    s.imgs.forEach(i=>{ if(!i.id) i.id=uid(); if(!LIVRO_LARG.some(l=>l[0]===i.larg)) i.larg='media'; if(typeof i.legenda!=='string') i.legenda=''; }); });
  LIVRO_CAPS.forEach(([k,t])=>{ if(!L.secoes.some(s=>s.tipo==='auto'&&s.key===k)) L.secoes.push({id:uid(),tipo:'auto',key:k,titulo:t,ativa:true,texto:'',imgs:[]}); });
  return L;
}

/* ---------- pedaços de HTML ---------- */
const _e=s=>esc(String(s==null?'':s));
function livroTxt(t){            /* parágrafos por linha em branco; "- " vira lista; "# " vira subtítulo */
  const blocos=String(t||'').replace(/\r/g,'').split(/\n{2,}/); let out='';
  blocos.forEach(b=>{
    const ls=b.split('\n').filter(l=>l.trim()); if(!ls.length) return;
    if(ls.every(l=>/^\s*[-•*]\s+/.test(l))) out+='<ul>'+ls.map(l=>'<li>'+_e(l.replace(/^\s*[-•*]\s+/,''))+'</li>').join('')+'</ul>';
    else if(/^#\s+/.test(ls[0])) out+='<h3>'+_e(ls[0].replace(/^#\s+/,''))+'</h3>'+(ls.length>1?'<p>'+ls.slice(1).map(_e).join('<br>')+'</p>':'');
    else out+='<p>'+ls.map(_e).join('<br>')+'</p>';
  });
  return out;
}
const _tb=(cab,linhas)=>'<table><thead><tr>'+cab.map(c=>'<th>'+_e(c)+'</th>').join('')+'</tr></thead><tbody>'+linhas.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
const _pill=t=>'<span class="pill">'+_e(t)+'</span>';
function _efs(sys,lista,modo){
  return (lista||[]).map(ef=>{ if(ef.kind==='codigo'&&modo==='jogador') return '⌨ '+(String(ef.text||'').trim()||'efeito especial'); return effectLabel(sys,ef); }).filter(Boolean);
}
function _habHTML(sys,a,modo,comNivel){
  const lv=(a.req&&a.req.level)||0, fx=_efs(sys,a.effects,modo), uso=(a.uso&&a.uso.on&&typeof usoHabResumo==='function')?usoHabResumo(sys,a):'';
  return '<div class="card"><b>'+_e((a.icon?a.icon+' ':'')+(a.name||'(sem nome)'))+'</b>'+(comNivel&&lv?(' <span class="nv">'+_e(levelLabel(sys,lv))+'</span>'):'')
    +(a.description?'<p>'+_e(a.description)+'</p>':'')+(uso?'<p class="mini">'+_e(uso)+'</p>':'')+(fx.length?'<p class="mini">'+fx.map(_pill).join(' ')+'</p>':'')+'</div>';
}
const _attrNome=(sys,id)=>{ const a=(sys.attributes||[]).find(x=>x.id===id); return a?a.name:'—'; };
const _recNome=(sys,id)=>{ const r=(sys.resources||[]).find(x=>x.id===id); return r?r.name:'—'; };

/* ---------- conteúdo automático de cada capítulo ---------- */
const LIVRO_AUTO={
  regras:(sys,modo)=>{
    const N=sys.levelName||'Nível', linhas=[];
    if(sys.campaignName) linhas.push(['Campanha',_e(sys.campaignName)]);
    linhas.push(['Sistema',_e(sys.name||'—')]);
    linhas.push([N+'s',_e((sys.startLevel||1)+' a '+(sys.maxLevel||1))]);
    linhas.push(['Atributos',_e('valor inicial '+(sys.startAttrValue||0)+', máximo '+(sys.attrMax||0)+(sys.attributePoints?(', '+sys.attributePoints+' ponto(s) para distribuir'):''))]);
    if(sys.skillChoices) linhas.push(['Perícias',_e(sys.skillChoices+' escolhida(s) na criação')]);
    if(sys.profMode&&sys.profMode!=='nenhum'){ linhas.push(['Proficiência',_e((sys.profMode==='mult'?'multiplicador':'bônus fixo')+(sys.profFormula?(' — '+sys.profFormula):''))]);
      if((sys.profTiers||[]).length) linhas.push(['Graus',_e(sys.profTiers.map(t=>t.name).join(', '))]); }
    if(sys.cargaFormula&&modo!=='jogador') linhas.push(['Carga máxima',_e(sys.cargaFormula)]);
    else if(sys.cargaFormula) linhas.push(['Carga máxima','calculada pela sua ficha']);
    return ((sys.themes||[]).length?'<p>'+(sys.themes||[]).map(_pill).join(' ')+'</p>':'')+_tb(['Regra','Valor'],linhas);
  },
  atributos:(sys)=>(sys.attributes||[]).length?_tb(['Atributo','Sigla','Descrição'],sys.attributes.map(a=>['<b>'+_e(a.name)+'</b>',_e(a.abbr||''),_e(a.desc||a.description||'')])):'',
  recursos:(sys,modo)=>(sys.resources||[]).length?_tb(['Recurso','Tipo','Máximo','Recarga','Para que serve'],sys.resources.map(r=>{
    const rc=r.recharge||{}; const rec=(r.type||'barra')==='valor'?'—':({curto:'descanso curto',longo:'descanso longo',nunca:'não recarrega'}[rc.trig]||'—');
    return [(r.icon?_e(r.icon)+' ':'')+'<b>'+_e(r.name)+'</b>',(r.type||'barra')==='valor'?'valor':'barra',modo==='jogador'?'calculado pela ficha':'<code>'+_e(r.formula||'')+'</code>',_e(rec),_e(r.desc||'')];
  })):'',
  pericias:(sys)=>(sys.skills||[]).length?_tb(['Perícia','Atributo','Descrição'],sys.skills.map(s=>['<b>'+_e(s.name)+'</b>'+(s.auto?' <span class="mini">(todos têm)</span>':''),_e(_attrNome(sys,s.linkedAttrId)),_e(s.description||'')])):'',
  classes:(sys,modo)=>(sys.classes||[]).map(c=>{
    const rec=(c.recursos||[]).filter(x=>String(x.formula||'').trim()).map(x=>'<li>'+_e(_recNome(sys,x.resId))+': '+(modo==='jogador'?(x.modo==='soma'?'recebe um adicional da classe':'calculado de forma própria pela classe'):'<code>'+_e(x.formula)+'</code> ('+(x.modo==='soma'?'soma':'substitui')+')')+'</li>').join('');
    const hab=(c.abilities||[]).slice().sort((a,b)=>((a.req||{}).level||0)-((b.req||{}).level||0));
    const t=c.tecnicas||{}, ops=(t.opcoes||[]).slice().sort((a,b)=>((a.req||{}).level||0)-((b.req||{}).level||0));
    return '<div class="bloco"><h3>'+_e((c.icon?c.icon+' ':'')+c.name)+'</h3>'+(c.description?'<p>'+_e(c.description)+'</p>':'')+(rec?'<h4>Recursos</h4><ul>'+rec+'</ul>':'')
      +(hab.length?'<h4>Habilidades de classe</h4>'+hab.map(a=>_habHTML(sys,a,modo,true)).join(''):'')
      +(ops.length?'<h4>'+_e(t.nome||'Técnicas')+(modo==='jogador'||!t.formula?'':' <span class="mini">(escolhe: '+_e(t.formula)+')</span>')+'</h4>'+ops.map(a=>_habHTML(sys,a,modo,true)).join(''):'')+'</div>';
  }).join(''),
  origens:(sys,modo)=>(sys.origins||[]).map(o=>{
    const v=o.visual||{}, tam=(typeof TAMANHOS!=='undefined'&&v.tamanho&&v.tamanho!=='medio')?((TAMANHOS.find(x=>x[0]===v.tamanho)||[])[1]):'';
    return '<div class="bloco"><h3>'+_e((o.icon?o.icon+' ':'')+o.name)+'</h3>'+(o.description?'<p>'+_e(o.description)+'</p>':'')
      +((v.aparencia||tam)?'<p class="mini"><b>Aparência:</b> '+_e([v.aparencia,tam?('tamanho '+tam.toLowerCase()):''].filter(Boolean).join(' · '))+'</p>':'')
      +((o.traits||[]).length?'<h4>Traços</h4>'+o.traits.map(a=>_habHTML(sys,a,modo,false)).join(''):'')
      +((o.abilities||[]).length?'<h4>Habilidades</h4>'+o.abilities.map(a=>_habHTML(sys,a,modo,true)).join(''):'')+'</div>';
  }).join(''),
  itens:(sys,modo)=>{
    const itens=(sys.items||[]); if(!itens.length) return '';
    return ITEM_CATS.map(([k,l])=>{ const li=itens.filter(i=>(i.categoria||'outro')===k); if(!li.length) return '';
      return '<h3>'+_e(l.replace(/^\S+\s/,''))+'</h3>'+li.map(i=>{
        const at=i.attack&&i.attack.on?('Ataque: '+(i.attack.dano||'?')+(i.attack.alcance?(', '+i.attack.alcance):'')):'', ar=i.armor&&i.armor.on?('Defesa: '+(modo==='jogador'?'definida pela armadura':(i.armor.formula||'?'))):'';
        const us=(i.uso&&i.uso.on)?('Uso: '+usoResumo(sys,i)):'';
        const fx=_efs(sys,i.effects,modo), rar=raridadeInfo(i.raridade);
        return '<div class="card"><b>'+_e((i.icon?i.icon+' ':'')+i.name)+'</b> <span class="mini" style="color:'+_e(rar[2])+'">'+_e(rar[1])+'</span>'+(i.weight?' <span class="mini">· peso '+_e(i.weight)+'</span>':'')
          +(i.description?'<p>'+_e(i.description)+'</p>':'')+[at,ar,us].filter(Boolean).map(t=>'<p class="mini">'+_e(t)+'</p>').join('')+(fx.length?'<p class="mini">'+fx.map(_pill).join(' ')+'</p>':'')+'</div>'; }).join(''); }).join('');
  },
  tecnicas:(sys,modo)=>{
    if(!sys.techAtivo||!(sys.techTiers||[]).length) return '';
    const rec=_recNome(sys,sys.techRecursoId);
    return '<p>O jogador cria '+_e((sys.techNome||'técnicas').toLowerCase())+' próprias dentro de um orçamento por tier'+(rec!=='—'?(', pagando com '+_e(rec)):'')+'.</p>'
      +_tb(['Tier','Libera em','Teto de dano','Custo base','Descrição'],sys.techTiers.map(t=>[(t.icon?_e(t.icon)+' ':'')+'<b>'+_e(t.name)+'</b>',t.reqLevel?_e(levelLabel(sys,t.reqLevel)):'início',_e(t.danoMax||'—'),modo==='jogador'?'—':'<code>'+_e(t.custoFormula||'')+'</code>',_e(t.desc||'')]))
      +'<p class="mini">Custos extras: ação complexa +'+_e(sys.techCustoAcaoComplexa||0)+', ação simples +'+_e(sys.techCustoAcaoSimples||0)+', cada característica extra +'+_e(sys.techCustoExtra||0)+'.</p>';
  },
  condicoes:(sys,modo)=>(sys.conditions||[]).map(c=>{ const fx=_efs(sys,c.effects,modo);
    return '<div class="card"><b>'+_e((c.icon?c.icon+' ':'')+c.name)+'</b>'+(c.description?'<p>'+_e(c.description)+'</p>':'')+(fx.length?'<p class="mini">'+fx.map(_pill).join(' ')+'</p>':'')+'</div>'; }).join(''),
  escolhas:(sys,modo)=>(sys.choices||[]).map(c=>'<div class="bloco"><h3>'+_e(c.name)+'</h3><p class="mini">'+_e(levelLabel(sys,c.level||1))+' · escolhe '+_e(c.count||1)+(c.repetivel?' (pode repetir)':'')+'</p>'+(c.hint?'<p>'+_e(c.hint)+'</p>':'')
    +(c.options||[]).map(o=>_habHTML(sys,o,modo,true)).join('')+'</div>').join(''),
};

/* ---------- o documento ---------- */
const LIVRO_CSS=`
@page{size:A4;margin:20mm 18mm 22mm}
@page{@bottom-center{content:counter(page);font:9pt sans-serif;color:#777}}
*{box-sizing:border-box}
body{margin:0;color:#1b1b22;font:11pt/1.5 var(--f)}
h1,h2,h3,h4{font-family:var(--h);line-height:1.25}
.capa{min-height:250mm;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:20mm;page-break-after:always;border-top:14mm solid var(--c);border-bottom:14mm solid var(--c)}
.capa img{max-width:100%;max-height:120mm;margin-bottom:12mm;border-radius:4px}
.capa h1{font-size:34pt;margin:0 0 4mm;color:var(--c)}
.capa .sub{font-size:15pt;color:#555;margin:0 0 10mm}
.capa .aut{font-size:11pt;color:#777;letter-spacing:.08em;text-transform:uppercase}
.sumario{page-break-after:always}
.sumario h2{border-bottom:2px solid var(--c);padding-bottom:3mm}
.sumario ol{list-style:none;padding:0;margin:0}
.sumario li{display:flex;gap:8px;padding:2.2mm 0;border-bottom:1px dotted #bbb;font-size:12pt}
.sumario a{color:inherit;text-decoration:none;flex:1}
.cap{page-break-before:always}
.cap:first-of-type{page-break-before:auto}
.cap>h2{font-size:22pt;color:var(--c);border-bottom:3px solid var(--c);padding-bottom:2mm;margin:0 0 6mm}
.cap>h2 .n{opacity:.55;margin-right:6px}
h3{font-size:14pt;margin:7mm 0 2mm;color:var(--c)}
h4{font-size:11pt;margin:5mm 0 1.5mm;text-transform:uppercase;letter-spacing:.05em;color:#555}
p{margin:0 0 3mm}
ul{margin:0 0 3mm;padding-left:6mm}
table{width:100%;border-collapse:collapse;margin:3mm 0 5mm;font-size:10pt}
th{background:var(--c);color:#fff;text-align:left;padding:2mm 3mm}
td{padding:2mm 3mm;border-bottom:1px solid #ddd;vertical-align:top}
tr:nth-child(even) td{background:#f5f5f8}
tr{page-break-inside:avoid}
code{font-family:Consolas,monospace;font-size:9.5pt;background:#eef;padding:0 3px;border-radius:3px}
.card{border:1px solid #d8d8e2;border-left:4px solid var(--c);border-radius:4px;padding:2.5mm 4mm;margin:0 0 3mm;page-break-inside:avoid;background:#fafafd}
.card p{margin:1mm 0 0}
.bloco{margin-bottom:6mm}
.mini{font-size:9.5pt;color:#555}
.pill{display:inline-block;border:1px solid #c9c9d6;border-radius:10px;padding:0 6px;font-size:9pt;margin:0 2px 2px 0;background:#fff}
.nv{font-size:9pt;color:#fff;background:var(--c);border-radius:8px;padding:0 6px;margin-left:4px}
figure{margin:4mm auto;text-align:center;page-break-inside:avoid}
figure img{max-width:100%;border-radius:3px}
figure.pequena img{width:35%}figure.media img{width:60%}figure.cheia img{width:100%}
figcaption{font-size:9pt;color:#666;margin-top:1.5mm;font-style:italic}
`;
const LIVRO_PREVIA=`html{background:#7b8096}body{max-width:210mm;margin:12px auto;padding:14mm 18mm 18mm;background:#fff;box-shadow:0 6px 24px rgba(0,0,0,.45)}
.capa{min-height:230mm;padding:14mm}.cap{border-top:1px dashed #c9c9d6;margin-top:12mm;padding-top:8mm}.cap:first-of-type{border-top:0;margin-top:0;padding-top:0}.sumario{margin-bottom:12mm}`;
function livroImgs(imgs){ return (imgs||[]).filter(i=>i.src).map(i=>'<figure class="'+_e(i.larg)+'"><img src="'+_e(i.src)+'" alt="'+_e(i.legenda||'ilustração')+'">'+(i.legenda?'<figcaption>'+_e(i.legenda)+'</figcaption>':'')+'</figure>').join(''); }
/* lista dos capítulos que vão para o livro (com conteúdo) */
function livroCapitulos(sys,modo){
  const L=sanitizarLivro(sys); const out=[];
  L.secoes.forEach(s=>{
    if(!s.ativa) return;
    if(modo==='jogador'&&s.soMestre) return;
    let corpo='', titulo=s.titulo&&s.titulo.trim();
    if(s.tipo==='auto'){ titulo=titulo||(LIVRO_CAPS.find(c=>c[0]===s.key)||[,s.key])[1]; try{ corpo=LIVRO_AUTO[s.key](sys,modo)||''; }catch(e){ corpo='<p class="mini">Não foi possível montar esta seção.</p>'; } }
    const abre=livroTxt(s.texto)+livroImgs(s.imgs);
    if(s.tipo==='auto'&&!corpo&&!abre) return;
    out.push({id:s.id,titulo:titulo||'Capítulo',html:(s.tipo==='auto'?(abre+corpo):abre)});
  });
  return out;
}
function livroDocumento(sys,modo,paraDoc,previa){
  const L=sanitizarLivro(sys), caps=livroCapitulos(sys,modo);
  const fam=L.fonte==='sans'?'Segoe UI,Arial,sans-serif':'Georgia,"Times New Roman",serif';
  const capa='<section class="capa">'+(L.capa?'<img src="'+_e(L.capa)+'" alt="capa">':'')+'<h1>'+_e(L.titulo)+'</h1>'+(L.subtitulo?'<p class="sub">'+_e(L.subtitulo)+'</p>':'')+(L.autor?'<p class="aut">'+_e(L.autor)+'</p>':'')
    +(modo==='mestre'?'<p class="aut" style="margin-top:8mm">Edição do Mestre</p>':'')+'</section>';
  const sum=(L.sumario&&caps.length)?'<section class="sumario"><h2>Sumário</h2><ol>'+caps.map((c,i)=>'<li><a href="#cap-'+_e(c.id)+'">'+(i+1)+'. '+_e(c.titulo)+'</a></li>').join('')+'</ol></section>':'';
  const corpo=caps.map((c,i)=>'<section class="cap" id="cap-'+_e(c.id)+'"><h2><span class="n">'+(i+1)+'.</span>'+_e(c.titulo)+'</h2>'+c.html+'</section>').join('')||'<section class="cap"><p>Nenhum capítulo ativo.</p></section>';
  return '<!doctype html><html lang="pt-BR"'+(paraDoc?' xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"':'')+'><head><meta charset="utf-8"><title>'+_e(L.titulo)+'</title>'
    +'<style>:root{--c:'+_e(L.cor)+';--f:'+fam+';--h:'+fam+'}'+LIVRO_CSS+(previa?LIVRO_PREVIA:'')+'</style></head><body>'+capa+sum+corpo+(L.rodape?'<p class="mini" style="text-align:center;margin-top:10mm">'+_e(L.rodape)+'</p>':'')+'</body></html>';
}
const _nomeArq=(sys,ext)=>((sys.livro&&sys.livro.titulo)||sys.campaignName||sys.name||'sistema').replace(/[^\w\-À-ÿ ]+/g,'').trim().replace(/\s+/g,'_')+ext;
function livroBaixar(sys,modo,ext){
  const html=livroDocumento(sys,modo,ext==='.doc');
  const blob=new Blob(['﻿'+html],{type:ext==='.doc'?'application/msword':'text/html'});
  const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=_nomeArq(sys,ext); a.click();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}
function livroImprimir(sys,modo){
  const f=document.createElement('iframe'); f.setAttribute('aria-hidden','true'); f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  f.srcdoc=livroDocumento(sys,modo);
  f.onload=()=>setTimeout(()=>{ try{ f.contentWindow.focus(); f.contentWindow.print(); }catch(e){ uiAlert('O navegador não deixou abrir a impressão. Use “Baixar .html” e imprima o arquivo.',{titulo:'Exportar PDF'}); } setTimeout(()=>f.remove(),90000); },350);
  document.body.appendChild(f);
  showToast('Na janela que abrir, escolha “Salvar como PDF” como destino.');
}
/* imagem do livro: reduz para ~1100px (JPEG) para caber no armazenamento do navegador */
function lerImagemLivro(file,cb,max){
  if(!file) return;
  if(!/^image\//.test(file.type)) return uiAlert('Selecione um arquivo de imagem (JPG, PNG, WebP…).',{titulo:'Imagem inválida'});
  const rd=new FileReader(); rd.onerror=()=>uiAlert('Não foi possível ler o arquivo.',{titulo:'Imagem inválida'});
  rd.onload=()=>{ const img=new Image(); img.onerror=()=>uiAlert('Imagem inválida ou corrompida.',{titulo:'Imagem inválida'});
    img.onload=()=>{ const M=max||1100, sc=Math.min(1,M/Math.max(img.width,img.height)); const c=document.createElement('canvas');
      c.width=Math.max(1,Math.round(img.width*sc)); c.height=Math.max(1,Math.round(img.height*sc));
      const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.drawImage(img,0,0,c.width,c.height); cb(c.toDataURL('image/jpeg',0.82)); };
    img.src=rd.result; };
  rd.readAsDataURL(file);
}

/* ---------- a aba ---------- */
function tabLivro(sys){
  const L=sanitizarLivro(sys);
  const modo=S.ui.livroModo==='mestre'?'mestre':'jogador';
  let tmr=null;
  const frame=h('iframe',{class:'lv-frame',title:'Prévia do livro',sandbox:'allow-same-origin'});
  const pinta=()=>{ frame.srcdoc=livroDocumento(sys,modo,false,true); };
  const previa=()=>{ clearTimeout(tmr); tmr=setTimeout(pinta,350); };
  const salvar=()=>{ persist(); previa(); };
  frame.addEventListener('load',()=>{ try{ const w=frame.clientWidth||600, z=Math.min(1,Math.max(.35,(w-8)/830)); frame.contentDocument.body.style.zoom=String(z); }catch(e){} });
  pinta();
  const imgIn=(aoLer,max)=>{ const i=h('input',{type:'file',accept:'image/*',class:'hide',onchange:e=>{ lerImagemLivro(e.target.files[0],aoLer,max); e.target.value=''; }}); return i; };

  /* capa e título */
  const capaIn=imgIn(d=>{ L.capa=d; persist(); render(); },900);
  const capaBox=card('Capa e estilo','O que aparece na primeira página.',null,
    h('div',{class:'grid g2'},
      field('Título do livro',h('input',{class:'in',value:L.titulo,oninput:e=>{L.titulo=e.target.value;salvar();}})),
      field('Subtítulo',h('input',{class:'in',value:L.subtitulo,placeholder:'Ex.: Livro do Jogador',oninput:e=>{L.subtitulo=e.target.value;salvar();}})),
      field('Autor / créditos',h('input',{class:'in',value:L.autor,placeholder:'Seu nome ou mesa',oninput:e=>{L.autor=e.target.value;salvar();}})),
      field('Rodapé (última página)',h('input',{class:'in',value:L.rodape,placeholder:'Ex.: © 2026 — uso na mesa',oninput:e=>{L.rodape=e.target.value;salvar();}}))),
    h('div',{class:'row wrapf',style:{marginTop:'10px',alignItems:'center'}},
      h('label',{class:'row'},h('span',{class:'hint'},'Cor'),h('input',{type:'color',class:'arq-cor',style:{width:'46px',height:'30px'},value:L.cor,oninput:e=>{L.cor=e.target.value;salvar();}})),
      h('button',{type:'button',class:'btn sm '+(L.fonte==='serif'?'emerald':'ghost'),onclick:()=>{L.fonte='serif';persist();render();}},'Letra com serifa'),
      h('button',{type:'button',class:'btn sm '+(L.fonte==='sans'?'emerald':'ghost'),onclick:()=>{L.fonte='sans';persist();render();}},'Letra simples'),
      h('button',{type:'button',class:'btn sm '+(L.sumario?'emerald':'ghost'),'aria-pressed':L.sumario?'true':'false',onclick:()=>{L.sumario=!L.sumario;persist();render();}},(L.sumario?'✓ ':'')+'Sumário'),
      h('button',{type:'button',class:'btn sm',onclick:()=>capaIn.click()},L.capa?'📷 Trocar imagem da capa':'📷 Imagem da capa'),
      L.capa?h('button',{type:'button',class:'btn sm danger',onclick:()=>{L.capa='';persist();render();}},'✕ Tirar imagem'):null, capaIn));

  /* capítulos */
  const mover=(s,d)=>{ const a=L.secoes,i=a.indexOf(s),j=i+d; if(j<0||j>=a.length) return; a[i]=a[j]; a[j]=s; persist(); render(); };
  const capCard=s=>{
    const aberto=!!S.ui.open['lv:'+s.id], auto=s.tipo==='auto';
    const padrao=auto?((LIVRO_CAPS.find(c=>c[0]===s.key)||[,''])[1]):'';
    let n=''; if(auto){ try{ const x=LIVRO_AUTO[s.key](sys,modo)||''; n=x?'automático':'vazio'; }catch(e){ n=''; } }
    const imgsIn=imgIn(d=>{ s.imgs.push({id:uid(),src:d,legenda:'',larg:'media'}); persist(); S.ui.open['lv:'+s.id]=true; render(); });
    const cab=h('div',{class:'hab-cab',onclick:e=>{ if(e.target.closest('input,button,select,label')) return; S.ui.open['lv:'+s.id]=!aberto; render(); }},
      h('span',{class:'acc-caret'},aberto?'▼':'▶'),
      h('input',{type:'checkbox',checked:s.ativa?'checked':null,title:'Incluir no livro','aria-label':'Incluir '+(s.titulo||padrao),onchange:e=>{s.ativa=e.target.checked;persist();render();}}),
      h('input',{class:'in hab-nome',value:s.titulo,placeholder:padrao||'Título do capítulo','aria-label':'Título',oninput:e=>{s.titulo=e.target.value;salvar();}}),
      h('span',{class:'hint'},(auto?n:'capítulo livre')+(s.imgs.length?(' · '+s.imgs.length+' img'):'')),
      h('button',{type:'button',class:'btn sm ghost',disabled:L.secoes.indexOf(s)===0,'aria-label':'Subir',onclick:()=>mover(s,-1)},'▲'),
      h('button',{type:'button',class:'btn sm ghost',disabled:L.secoes.indexOf(s)===L.secoes.length-1,'aria-label':'Descer',onclick:()=>mover(s,1)},'▼'),
      auto?null:h('button',{type:'button',class:'btn sm danger','aria-label':'Excluir',onclick:()=>comDesfazer('Capítulo “'+(s.titulo||'sem título')+'” excluído',()=>{ L.secoes.splice(L.secoes.indexOf(s),1); })},'✕'));
    const corpo=aberto?h('div',{class:'hab-corpo'},
      field(auto?'Texto de abertura (aparece antes do conteúdo automático)':'Texto do capítulo',h('textarea',{class:'in',rows:auto?'3':'8',value:s.texto,placeholder:'Parágrafos separados por linha em branco. “- ” cria lista; “# ” cria subtítulo.',oninput:e=>{s.texto=e.target.value;salvar();}})),
      auto?null:h('div',{class:'row'},h('button',{type:'button',class:'btn sm '+(s.soMestre?'amber':'ghost'),onclick:()=>{s.soMestre=!s.soMestre;persist();render();}},(s.soMestre?'🔒 Só na edição do Mestre':'Visível aos jogadores')),
        h('span',{class:'hint'},'Segredos e regras da casa ficam fora do livro dos jogadores.')),
      h('div',{class:'sub-h2'},'Imagens'),
      ...s.imgs.map((im,k)=>h('div',{class:'lv-img'},
        h('img',{src:im.src,alt:'',class:'lv-th'}),
        h('div',{class:'lv-img-c'},
          h('input',{class:'in',value:im.legenda,placeholder:'Legenda (opcional)','aria-label':'Legenda',oninput:e=>{im.legenda=e.target.value;salvar();}}),
          h('div',{class:'row wrapf'},
            (()=>{ const sel=h('select',{class:'in',style:{maxWidth:'180px'},'aria-label':'Tamanho',onchange:e=>{im.larg=e.target.value;persist();previa();}});
              LIVRO_LARG.forEach(([v,l])=>{const o=h('option',{value:v},l);if(v===im.larg)o.selected=true;sel.appendChild(o);}); return sel; })(),
            h('button',{type:'button',class:'btn sm ghost',disabled:k===0,'aria-label':'Mover para cima',onclick:()=>{ s.imgs.splice(k,1); s.imgs.splice(k-1,0,im); persist(); render(); }},'▲'),
            h('button',{type:'button',class:'btn sm ghost',disabled:k===s.imgs.length-1,'aria-label':'Mover para baixo',onclick:()=>{ s.imgs.splice(k,1); s.imgs.splice(k+1,0,im); persist(); render(); }},'▼'),
            h('button',{type:'button',class:'btn sm danger','aria-label':'Tirar imagem',onclick:()=>{ s.imgs.splice(k,1); persist(); render(); }},'✕'))))),
      h('div',{class:'row'},h('button',{type:'button',class:'btn sm',onclick:()=>imgsIn.click()},'📷 + Imagem'),imgsIn)):null;
    return h('div',{class:'hab'+(aberto?' on':'')+(s.ativa?'':' lv-off')},cab,corpo);
  };
  const lista=card('Capítulos','Marque o que entra, arrume a ordem, escreva e coloque imagens. Os capítulos automáticos se atualizam sozinhos quando você muda o sistema.',null,
    h('div',{},...L.secoes.map(capCard)),
    h('div',{class:'row wrapf',style:{marginTop:'10px'}},
      h('button',{type:'button',class:'btn primary sm',onclick:()=>{ const s={id:uid(),tipo:'texto',key:'',titulo:'Novo capítulo',ativa:true,texto:'',imgs:[]}; L.secoes.push(s); S.ui.open['lv:'+s.id]=true; persist(); render(); }},'+ Capítulo livre'),
      h('button',{type:'button',class:'btn sm ghost',onclick:()=>{ L.secoes.forEach(s=>{S.ui.open['lv:'+s.id]=true;}); render(); }},'▼ Abrir todos'),
      h('button',{type:'button',class:'btn sm ghost',onclick:()=>{ L.secoes.forEach(s=>{delete S.ui.open['lv:'+s.id];}); render(); }},'▶ Fechar todos')));

  const modoBtn=(m,rot,tit)=>h('button',{type:'button',class:'btn sm '+(modo===m?'emerald':'ghost'),title:tit,'aria-pressed':modo===m?'true':'false',onclick:()=>{S.ui.livroModo=m;render();}},(modo===m?'✓ ':'')+rot);
  const barra=h('div',{class:'lv-barra'},
    h('div',{class:'row wrapf'},h('span',{class:'hint'},'Ver como:'),modoBtn('jogador','👥 Jogadores','Sem código, sem fórmulas internas e sem capítulos “só do Mestre”'),modoBtn('mestre','🛠 Mestre','Tudo, com fórmulas e notas')),
    h('div',{class:'row wrapf'},
      h('button',{type:'button',class:'btn sm primary',title:'Abre a impressão do navegador: escolha “Salvar como PDF”',onclick:()=>livroImprimir(sys,modo)},'📄 Exportar PDF'),
      h('button',{type:'button',class:'btn sm',title:'Arquivo que abre no Word, LibreOffice e Google Docs',onclick:()=>livroBaixar(sys,modo,'.doc')},'📝 Baixar .doc'),
      h('button',{type:'button',class:'btn sm ghost',onclick:()=>livroBaixar(sys,modo,'.html')},'🌐 .html')));
  return h('div',{class:'lv'},
    h('div',{class:'lv-col'},capaBox,lista),
    h('div',{class:'lv-prev'},barra,h('div',{class:'lv-paper'},frame),
      h('div',{class:'hint',style:{marginTop:'6px'}},'Prévia em páginas A4. O PDF usa o mesmo documento, com sumário clicável e número de página.')));
}
