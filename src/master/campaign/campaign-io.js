/* ============================================================ CAMPANHA — EXPORTAR / IMPORTAR / BACKUP ============================================================
   Arquivo .campanha = JSON versionado:
     { app:'nexus-rpg', formato:'nexus-campanha', versao:1, exportadoEm, nome, campanha:{…}, sistema:{…}|null }
   Importar valida o arquivo, mostra o que há dentro e deixa escolher entre
   MESCLAR (só adiciona o que ainda não existe, por id) e SUBSTITUIR (baixa um
   backup da campanha atual antes). Também mantém o lembrete de backup:
   c.meta.changes conta renders desde o último backup (ver dashboard.js). */

const CAMP_FORMATO='nexus-campanha', CAMP_VERSAO=1, CAMP_LIMITE=48*1024*1024;
const BACKUP_ALTERACOES=120, BACKUP_MINUTOS=30;

function nomeArquivoCampanha(sufixo){
  const nome=(S.campaign.name||S.system.campaignName||'campanha').replace(/[^\w\-]+/g,'_').slice(0,40)||'campanha';
  return nome+(sufixo?'-'+sufixo:'')+'-'+hojeISO()+'.campanha';
}
function campanhaPacote(incluirSistema){
  const copia=JSON.parse(JSON.stringify(S.campaign));
  copia.present.live=false;
  return { app:'nexus-rpg', formato:CAMP_FORMATO, versao:CAMP_VERSAO, exportadoEm:new Date().toISOString(),
    nome:S.campaign.name||S.system.campaignName||'', campanha:copia,
    sistema:incluirSistema?JSON.parse(JSON.stringify(S.system)):null };
}
function campanhaExportar(incluirSistema,sufixo){
  persist();
  downloadJSON(campanhaPacote(incluirSistema!==false), nomeArquivoCampanha(sufixo));
  S.campaign.meta.lastBackup=Date.now(); S.campaign.meta.changes=0;
  showToast('💾 Campanha exportada');
}

/* ---------- Validação ---------- */
const LISTAS_CAMPANHA=[['players','jogadores'],['loot','itens'],['maps','mapas'],['sessions','sessões'],['notebook','notas'],['handouts','handouts'],['clocks','relógios'],['resources','recursos'],['tables','tabelas']];
function campanhaValidar(o){
  const erros=[], avisos=[];
  if(!o||typeof o!=='object'||Array.isArray(o)) return {ok:false, erros:['O arquivo não contém uma campanha do Nexus.']};
  if(o.app==='nexus-rpg'&&o.dados&&!o.campanha) return {ok:false, erros:['Este arquivo é um BACKUP da conta (todos os personagens), não uma campanha. Use “Restaurar backup” na tela de personagens.']};
  let camp=o.campanha;
  if(o.formato!==CAMP_FORMATO){
    if(camp&&typeof camp==='object') avisos.push('Arquivo sem identificação de formato; tentando ler mesmo assim.');
    else return {ok:false, erros:['O arquivo não parece uma campanha do Nexus (formato desconhecido).']};
  }
  if(typeof o.versao!=='number') avisos.push('Arquivo sem número de versão.');
  else if(o.versao>CAMP_VERSAO) return {ok:false, erros:['Esta campanha foi exportada por uma versão mais nova do Nexus (v'+o.versao+'). Atualize o app para abri-la.']};
  if(!camp||typeof camp!=='object'||Array.isArray(camp)) return {ok:false, erros:['O arquivo não traz os dados da campanha.']};
  LISTAS_CAMPANHA.forEach(([k,nome])=>{
    if(camp[k]!==undefined && !Array.isArray(camp[k])) erros.push('O campo “'+nome+'” está corrompido (esperava uma lista).');
    else (camp[k]||[]).forEach((it,i)=>{ if(!it||typeof it!=='object') erros.push('Item inválido em “'+nome+'” (#'+(i+1)+').'); });
  });
  if(camp.bestiary!==undefined){
    if(!camp.bestiary||typeof camp.bestiary!=='object') erros.push('O bestiário está corrompido.');
    else ['enemies','npcs'].forEach(k=>{ if(camp.bestiary[k]!==undefined&&!Array.isArray(camp.bestiary[k])) erros.push('O bestiário (“'+k+'”) está corrompido.'); });
  }
  (camp.maps||[]).forEach((m,i)=>{ if(m&&typeof m==='object'){ ['tokens','pins','props'].forEach(k=>{ if(m[k]!==undefined&&!Array.isArray(m[k])) erros.push('Mapa #'+(i+1)+': “'+k+'” corrompido.'); }); } });
  if(erros.length) return {ok:false, erros:erros.slice(0,6)};
  let san;
  try{ san=sanitizeCampaign(JSON.parse(JSON.stringify(camp))); }catch(e){ return {ok:false, erros:['Não foi possível interpretar a campanha: '+e.message]}; }
  san.activeSessionId=san.sessions.some(s=>s.id===san.activeSessionId)?san.activeSessionId:null;
  const cont={ jogadores:san.players.length, inimigos:san.bestiary.enemies.length, npcs:san.bestiary.npcs.length, mapas:san.maps.length,
    itens:san.loot.length, sessões:san.sessions.length, notas:san.notebook.length, handouts:san.handouts.length };
  return {ok:true, avisos, camp:san, sistema:(o.sistema&&typeof o.sistema==='object')?o.sistema:null, nome:o.nome||san.name||'', exportadoEm:o.exportadoEm||'', cont};
}

/* ---------- Mesclar / substituir ---------- */
function campanhaMesclar(dest,src){
  const add=(a,b)=>{ let n=0; const ids=new Set(a.map(x=>x.id)); b.forEach(x=>{ if(!ids.has(x.id)){ a.push(x); ids.add(x.id); n++; } }); return n; };
  const r={};
  r.jogadores=add(dest.players,src.players); r.inimigos=add(dest.bestiary.enemies,src.bestiary.enemies); r.npcs=add(dest.bestiary.npcs,src.bestiary.npcs);
  r.mapas=add(dest.maps,src.maps); r.itens=add(dest.loot,src.loot); r.notas=add(dest.notebook,src.notebook); r.handouts=add(dest.handouts,src.handouts);
  add(dest.clocks,src.clocks); add(dest.resources,src.resources); add(dest.tables,src.tables);
  /* sessões: renumera as novas depois das existentes (a ativa nunca é importada) */
  let n=dest.sessions.reduce((m,s)=>Math.max(m,s.n||0),0); r.sessões=0;
  const ids=new Set(dest.sessions.map(s=>s.id));
  src.sessions.forEach(s=>{ if(ids.has(s.id)) return; if(!s.endedAt) s.endedAt=s.startedAt||Date.now(); n++; if(/^Sess[ãa]o \d+$/.test(s.title)) s.title='Sessão '+n; s.n=n; dest.sessions.push(s); r.sessões++; });
  if(!dest.currentMapId&&dest.maps.length) dest.currentMapId=dest.maps[0].id;
  if(!dest.name&&src.name) dest.name=src.name;
  if(!dest.summary&&src.summary) dest.summary=src.summary;
  return r;
}
function campanhaSubstituir(dest,src){
  Object.keys(dest).forEach(k=>delete dest[k]);
  Object.assign(dest,src);
  dest.meta.changes=0;
}

/* ---------- Fluxo de importação ---------- */
function campanhaEscolherArquivo(){
  const inp=h('input',{type:'file', accept:'.campanha,.json', class:'hide', onchange:e=>{
    const f=e.target.files[0]; if(!f) return;
    if(f.size>CAMP_LIMITE) return cAlert('O arquivo é grande demais ('+(f.size/1048576).toFixed(1)+' MB). O limite é '+(CAMP_LIMITE/1048576)+' MB.');
    const rd=new FileReader();
    rd.onload=()=>{
      let o; try{ o=lerJSONSeguro(String(rd.result)); }catch(err){ return cAlert('O arquivo não é um .campanha válido (JSON quebrado ou incompleto).'); }
      const v=campanhaValidar(o);
      if(!v.ok) return cAlert('Não foi possível importar:\n\n• '+v.erros.join('\n• '));
      cmp().imp=v; render();
    };
    rd.onerror=()=>cAlert('Não foi possível ler o arquivo.');
    rd.readAsText(f);
  }});
  document.body.appendChild(inp); inp.click(); setTimeout(()=>inp.remove(),1500);
}
function campanhaImportarAplicar(modo){
  const ui=cmp(), v=ui.imp; if(!v) return;
  const c=S.campaign;
  if(modo==='mesclar'){
    const r=campanhaMesclar(c, v.camp);
    showToast('Mesclado: +'+r.jogadores+' jog., +'+r.inimigos+' inim., +'+r.npcs+' NPCs, +'+r.mapas+' mapas, +'+r.sessões+' sessões');
  } else {
    campanhaExportar(true,'antes-da-importacao');   /* rede de segurança */
    campanhaSubstituir(c, v.camp);
    if(ui.impSistema&&v.sistema){
      const rs=importarSistemaTexto(JSON.stringify(v.sistema));
      if(rs.sys){ Object.keys(S.system).forEach(k=>delete S.system[k]); Object.assign(S.system, rs.sys); }
      else cAlert('A campanha foi importada, mas o sistema não pôde ser aplicado: '+rs.erro);
    }
    showToast('Campanha substituída ✔');
  }
  ui.imp=null; render();
}
/* Janela de decisão (fora do #root não: reconstruída a cada render, lê cmp().imp). */
function importOverlay(){
  const ui=cmp(), v=ui.imp; if(!v) return null;
  const lista=Object.keys(v.cont).filter(k=>v.cont[k]).map(k=>h('span',{class:'chip'}, v.cont[k]+' '+k));
  return h('div',{class:'busca-bg', onclick:e=>{ if(e.target.classList.contains('busca-bg')){ ui.imp=null; render(); } }},
    h('div',{class:'busca-cx mv-imp', role:'dialog', 'aria-modal':'true', 'aria-label':'Importar campanha'},
      h('h3',{style:{margin:'0 0 4px'}},'📥 Importar campanha'),
      h('div',{class:'hint'}, (v.nome?('“'+v.nome+'” · '):'')+(v.exportadoEm?('exportada em '+new Date(v.exportadoEm).toLocaleString()):'')),
      h('div',{class:'row wrapf', style:{margin:'10px 0'}}, lista.length?lista:h('span',{class:'hint'},'Arquivo vazio.')),
      (v.avisos||[]).map(a=>h('div',{class:'hint', style:{color:'var(--amber)'}}, '⚠ '+a)),
      v.sistema?h('label',{class:'chk'}, h('input',{type:'checkbox', checked:!!ui.impSistema, onchange:e=>{ui.impSistema=e.target.checked;}}),' Ao substituir, aplicar também o sistema de regras do arquivo'):null,
      h('div',{class:'mv-imp-modos'},
        h('button',{class:'btn primary', onclick:()=>campanhaImportarAplicar('mesclar')}, h('b',{},'Mesclar'), h('small',{},'Adiciona só o que ainda não existe (por id). Nada é apagado.')),
        h('button',{class:'btn danger', onclick:async()=>{ if(await cConfirm('Substituir TODA a campanha atual? Um backup dela será baixado antes.',{perigo:true,okText:'Substituir'})) campanhaImportarAplicar('substituir'); }},
          h('b',{},'Substituir tudo'), h('small',{},'Troca a campanha inteira (baixa um backup antes).'))),
      h('div',{class:'row', style:{justifyContent:'flex-end', marginTop:'8px'}}, h('button',{class:'btn ghost', onclick:()=>{ui.imp=null;render();}},'Cancelar'))));
}

/* ---------- Lembrete de backup ---------- */
function backupPrecisa(){
  const m=S.campaign&&S.campaign.meta; if(!m) return false;
  if(m.remind) return true;                       /* pedido explícito (fim de sessão) */
  const min=(Date.now()-(m.lastBackup||0))/60000;
  return m.changes>=BACKUP_ALTERACOES && (min>=BACKUP_MINUTOS || !m.lastBackup);
}
function backupLembrar(sim){ if(S.campaign&&S.campaign.meta) S.campaign.meta.remind=!!sim; }
function backupAgora(){ campanhaExportar(true); S.campaign.meta.remind=false; render(); }
/* Faixa de aviso (aparece na barra da Mesa ao vivo quando é hora de salvar). */
function backupFaixa(){
  if(!backupPrecisa()) return null;
  const m=S.campaign.meta;
  return h('div',{class:'mv-backup', role:'status'},
    h('span',{}, m.remind?'📖 Sessão encerrada — salve um backup da campanha.':'💾 Já são '+m.changes+' alterações desde o último backup.'),
    h('button',{class:'btn sm amber', onclick:backupAgora},'Baixar backup'),
    h('button',{class:'btn sm ghost', onclick:()=>{ m.remind=false; m.changes=0; m.lastBackup=Date.now()-(BACKUP_MINUTOS-10)*60000; render(); }},'Depois'));
}

/* ---------- Painel "Backup" (Ferramentas) ---------- */
function backupPanel(){
  const c=S.campaign, m=c.meta;
  return h('div',{},
    card('Exportar campanha','Gera um arquivo .campanha com mapas, bestiário, NPCs, itens, jogadores, sessões, notas e handouts (e o sistema de regras).',null,
      h('div',{class:'row wrapf'},
        h('button',{class:'btn primary', onclick:()=>{campanhaExportar(true);render();}},'💾 Exportar campanha + sistema'),
        h('button',{class:'btn', onclick:()=>{campanhaExportar(false);render();}},'Só a campanha')),
      h('div',{class:'hint', style:{marginTop:'8px'}}, m.lastBackup?('Último backup: '+new Date(m.lastBackup).toLocaleString()+' · '+m.changes+' alterações desde então.'):'Nenhum backup feito ainda nesta campanha.')),
    card('Importar campanha','Escolha um arquivo .campanha. Você poderá mesclar com a atual ou substituir.',null,
      h('button',{class:'btn amber', onclick:campanhaEscolherArquivo},'📥 Importar arquivo .campanha')),
    card('Lembrete de backup',null,null,
      h('div',{class:'hint'},'A Mesa ao vivo avisa quando houver '+BACKUP_ALTERACOES+'+ alterações (e '+BACKUP_MINUTOS+' min) sem backup, e sempre que uma sessão termina. Os dados ficam no navegador: um backup é o seu seguro.')));
}
