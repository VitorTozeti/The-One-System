/* ============================================================ ÍCONES SVG ============================================================
   Conjunto único de ícones de traço (24×24, herdam a cor do texto) no lugar dos emojis de interface.
   Funciona como uma passada pós-render (iconPass): troca só os emojis mapeados abaixo, em nós de texto
   da interface. NÃO mexe em: campos de formulário, conteúdo dos blocos da ficha (.blk-body, texto do
   usuário), chips de condição (ícone escolhido pelo usuário) nem em emojis que não estão no mapa
   (esses são escolhas de conteúdo — ex.: ☠️ 🔥 numa condição). Acessibilidade: o SVG é decorativo; se o
   botão ficar sem texto, recebe aria-label com o nome do ícone. */
const _c=(x,y,r)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'"/>';
const _dot=(x,y)=>'<circle cx="'+x+'" cy="'+y+'" r="1.1" fill="currentColor" stroke="none"/>';
const _FILE='<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>';
const _PENCIL='<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>';
const _EYEOFF='<path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 4.2A10 10 0 0 1 12 4c6.4 0 10 8 10 8a17 17 0 0 1-3.2 4.3M6.6 6.6A17 17 0 0 0 2 12s3.6 8 10 8c1.8 0 3.4-.5 4.8-1.2"/>';
const _CHECK='<path d="M20 6 9 17l-5-5"/>';
const _X='<path d="M18 6 6 18M6 6l12 12"/>';
const _HELP='<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>';
const _STAR='<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>';
const _LEAF='<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.5 6-7"/>';
/* emoji → [nome acessível, conteúdo do <svg>] */
const ICONES={
  '🎲':['dados','<rect x="3" y="3" width="18" height="18" rx="3"/>'+_dot(8.5,8.5)+_dot(15.5,8.5)+_dot(12,12)+_dot(8.5,15.5)+_dot(15.5,15.5)],
  '⚔':['espadas','<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6M16 16l4 4M19 21l2-2"/><path d="M14.5 6.5 18 3h3v3l-3.5 3.5"/><path d="m5 14 4 4M7 17l-3 3M3 19l2 2"/>'],
  '👁':['ver','<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/>'+_c(12,12,3)],
  '📖':['livro','<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>'],
  '💾':['salvar','<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>'],
  '🐉':['bestiário',''+_c(6,10,2)+_c(10,5.5,2)+_c(15,5.5,2)+_c(19,10,2)+'<path d="M12 11c-3 0-6 4-6 7 0 2 2 2.5 4 2 1.5-.4 2.5-.4 4 0 2 .5 4 0 4-2 0-3-3-7-6-7z"/>'],
  '🧍':['personagem','<circle cx="12" cy="7" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>'],
  '🧑':['pessoa','<circle cx="12" cy="7" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>'],
  '🎭':['classes',_c(12,12,10)+'<path d="M8 14s1.5 2 4 2 4-2 4-2"/>'+_dot(9,9.5)+_dot(15,9.5)],
  '⬆':['enviar','<path d="M12 19V5M5 12l7-7 7 7"/>'],
  '⬇':['baixar','<path d="M12 5v14M5 12l7 7 7-7"/>'],
  '⬅':['esquerda','<path d="M19 12H5M12 5l-7 7 7 7"/>'],
  '➡':['direita','<path d="M5 12h14M12 5l7 7-7 7"/>'],
  '⬌':['trocar','<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>'],
  '🔒':['bloqueado','<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'],
  '🔓':['liberado','<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>'],
  '🖼':['ficha','<rect x="3" y="3" width="18" height="18" rx="2"/>'+_c(9,9,2)+'<path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>'],
  '📝':['anotações',_PENCIL],
  '✏':['editar',_PENCIL],
  '🗺':['mapa','<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'],
  '⭐':['favorito',_STAR],
  '★':['estrela',_STAR],
  '🛡':['defesa','<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'],
  '📍':['local','<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/>'+_c(12,10,3)],
  '⏳':['tempo','<path d="M5 22h14M5 2h14M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4a2 2 0 0 0 .6-1.4V2"/>'],
  '🛠':['ferramentas','<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>'],
  '🎒':['itens','<path d="M5 21V9a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v12z"/><path d="M9 21v-6h6v6M9 4V2h6v2"/>'],
  '📜':['texto',_FILE], '📄':['documento',_FILE], '📋':['lista',_FILE], '📓':['diário',_FILE],
  '🕘':['versões',_c(12,12,10)+'<path d="M12 6v6l4 2"/>'],
  '📥':['restaurar','<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'],
  '💪':['atributos','<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>'],
  '🎯':['perícias',_c(12,12,10)+_c(12,12,6)+_c(12,12,2)],
  '🩸':['condições','<path d="M12 2.7S5 10 5 15a7 7 0 0 0 14 0c0-5-7-12.3-7-12.3z"/>'],
  '📦':['pacote','<path d="m7.5 4.3 9 5.2M21 8v8l-9 5-9-5V8l9-5z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>'],
  '🔎':['buscar',_c(11,11,7)+'<path d="m21 21-4.3-4.3"/>'],
  '🗑':['excluir','<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'],
  '🧭':['início',_c(12,12,10)+'<path d="m16 8-2 6-6 2 2-6z"/>'],
  '💡':['sugestão','<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.4 1 2.3h6c0-.9.3-1.7 1-2.3A7 7 0 0 0 12 2z"/>'],
  '❓':['ajuda',_HELP], '❔':['ajuda',_HELP],
  '📁':['pasta','<path d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'],
  '⏹':['parar','<rect x="5" y="5" width="14" height="14" rx="2"/>'],
  '📚':['biblioteca','<path d="m16 6 4 14M12 6v14M8 8v12M4 4v16"/>'],
  '❤':['vida','<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 12 6a5.5 5.5 0 0 0-10 2.5c0 2.3 1.5 4 3 5.5l7 7z"/>'],
  '✨':['modelo','<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M17 5h4M5 17v4M3 19h4"/>'],
  '🌀':['técnicas','<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4"/>'],
  '🌿':['escolhas',_LEAF], '🌱':['origem',_LEAF],
  '🏷':['tags','<path d="M12 2H2v10l9.3 9.3a1 1 0 0 0 1.4 0l8.6-8.6a1 1 0 0 0 0-1.4z"/>'+_c(7,7,1)],
  '⚙':['regras',_c(12,12,3)+'<path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'],
  '📷':['foto','<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>'+_c(12,13,4)],
  '🎨':['cores',_c(13.5,6.5,1)+_c(17.5,10.5,1)+_c(8.5,7.5,1)+_c(6.5,12.5,1)+'<path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4a4.7 4.7 0 0 0 4.6-4.7C22 6 17.5 2 12 2z"/>'],
  '🧹':['limpar','<path d="m7 21-4-4 10-10 6 6-8 8zM12 12l4 4"/>'],
  '📈':['progressão','<path d="m22 7-8.5 8.5-5-5L2 17M16 7h6v6"/>'],
  '☰':['menu','<path d="M4 6h16M4 12h16M4 18h16"/>'],
  '🌙':['descanso longo','<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>'],
  '🧪':['poção','<path d="M9 2h6M10 2v6L4 20a1.5 1.5 0 0 0 1.3 2h13.4a1.5 1.5 0 0 0 1.3-2l-6-12V2M7 15h10"/>'],
  '⚠':['atenção','<path d="m10.3 3.9-8.5 14.7A2 2 0 0 0 3.5 21.6h17a2 2 0 0 0 1.7-3l-8.5-14.7a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>'],
  '✔':['ok',_CHECK], '✓':['ok',_CHECK],
  '✕':['fechar',_X],
  '📺':['tela dos jogadores','<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'],
  '🙈':['oculto',_EYEOFF], '🤫':['secreto',_EYEOFF],
  '👤':['conta','<circle cx="12" cy="7" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>'],
  '🤝':['jogadores','<circle cx="9" cy="7" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M17 3.1a4 4 0 0 1 0 7.8M22 21v-1a6 6 0 0 0-4-5.7"/>'],
  '🏗':['fundação','<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>'],
  '🌍':['mundo','<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/>'],
  '📤':['saída','<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>'],
  '🗂':['pasta','<path d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'],
  '🧰':['kit','<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'],
};
const _icRx=new RegExp('('+Object.keys(ICONES).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')\\uFE0F?','g');
/* ícones de classe/origem/traço e rótulos de efeito são CONTEÚDO escolhido pelo Mestre: ficam como emoji */
const _icSkip='input,textarea,select,option,script,style,svg,.blk-body,.cond-chip,[data-noicon],.arq-ic,.arq-ic-b,.arq-pick-t,.car-chip,.pv-chip,.tg-fx,.hab-res,.arq-l';
function iconSvg(emoji){
  const d=ICONES[emoji]; if(!d) return null;
  const s=document.createElement('span'); s.className='ic'; s.setAttribute('aria-hidden','true');
  s.innerHTML='<svg viewBox="0 0 24 24" focusable="false">'+d[1]+'</svg>';
  return s;
}
/* Troca os emojis mapeados por SVG dentro de `raiz`. Idempotente: SVGs não são nós de texto. */
function iconPass(raiz){
  if(!raiz||!raiz.nodeType) return;
  const w=document.createTreeWalker(raiz,NodeFilter.SHOW_TEXT,{acceptNode:n=>{
    if(!n.nodeValue||!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
    _icRx.lastIndex=0; if(!_icRx.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
    const p=n.parentElement; if(!p||p.closest(_icSkip)) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT; }});
  const nos=[]; while(w.nextNode()) nos.push(w.currentNode);
  nos.forEach(n=>{
    const txt=n.nodeValue, frag=document.createDocumentFragment(); let ult=0, m, nomes=[];
    _icRx.lastIndex=0;
    while((m=_icRx.exec(txt))){
      if(m.index>ult) frag.appendChild(document.createTextNode(txt.slice(ult,m.index)));
      frag.appendChild(iconSvg(m[1])); nomes.push(ICONES[m[1]][0]); ult=m.index+m[0].length;
    }
    if(ult<txt.length) frag.appendChild(document.createTextNode(txt.slice(ult)));
    const p=n.parentElement; n.replaceWith(frag);
    /* botão/link que ficou só com ícone: mantém um nome acessível */
    const alvo=p&&p.closest('button,a,[role="button"]');
    if(alvo&&!alvo.getAttribute('aria-label')&&!alvo.textContent.trim()) alvo.setAttribute('aria-label',alvo.title||nomes.join(' '));
  });
}
/* overlays/diálogos/toasts são anexados direto ao <body>, fora do #root */
(function(){
  iconPass(document.body);
  let agendado=false;
  const rodar=()=>{ agendado=false; iconPass(document.body); };
  new MutationObserver(()=>{ if(!agendado){ agendado=true; setTimeout(rodar,30); } })
    .observe(document.body,{childList:true});
})();
