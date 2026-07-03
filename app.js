/* WorldCup 2026 Mobile PWA - mobile-first app for Android/S21 Ultra */
'use strict';

const CLT_OFFSET = '-04:00'; // Junio/julio en Chile continental.
const CACHE_KEY = 'wc26_mobile_state_v1';
const API_CACHE_KEY = 'wc26_mobile_api_cache_v1';
const KNOCKOUT_DEPENDENCIES = {
  '89':['74','77'], '90':['73','75'], '91':['76','78'], '92':['79','80'],
  '93':['83','84'], '94':['81','82'], '95':['86','88'], '96':['85','87'],
  '97':['89','90'], '98':['93','94'], '99':['91','92'], '100':['95','96'],
  '101':['97','98'], '102':['99','100'], '103':['101','102'], '104':['101','102']
};
const ROUNDS = [
  ['R32','Ronda de 32',73,88], ['R16','Octavos',89,96], ['QF','Cuartos',97,100],
  ['SF','Semifinal',101,102], ['3P','3er puesto',103,103], ['F','Final',104,104]
];
const TEAM_TO_FLAG = {
  'Alemania':'de','Arabia Saudí':'sa','Argelia':'dz','Argentina':'ar','Australia':'au','Austria':'at','Bosnia y Herzegovina':'ba','Brasil':'br','Bélgica':'be','Cabo Verde':'cv','Canadá':'ca','Catar':'qa','Chequia':'cz','Colombia':'co','Congo DR':'cd','Corea del Sur':'kr','Costa de Marfil':'ci','Croacia':'hr','Curazao':'cw','Ecuador':'ec','Egipto':'eg','Escocia':'gb-sct','España':'es','Estados Unidos':'us','Francia':'fr','Ghana':'gh','Haití':'ht','Inglaterra':'gb-eng','Irak':'iq','Irán':'ir','Japón':'jp','Jordania':'jo','Marruecos':'ma','México':'mx','Noruega':'no','Nueva Zelanda':'nz','Panamá':'pa','Paraguay':'py','Países Bajos':'nl','Portugal':'pt','RD Congo':'cd','Senegal':'sn','Sudáfrica':'za','Suecia':'se','Suiza':'ch','Túnez':'tn','Türkiye':'tr','Uruguay':'uy','Uzbekistán':'uz'
};
const ESPN_ABBR_TO_ES = {
  GER:'Alemania', KSA:'Arabia Saudí', ALG:'Argelia', ARG:'Argentina', AUS:'Australia', AUT:'Austria', BIH:'Bosnia y Herzegovina', BRA:'Brasil', BEL:'Bélgica', CPV:'Cabo Verde', CAN:'Canadá', QAT:'Catar', CZE:'Chequia', COL:'Colombia', COD:'RD Congo', DRC:'RD Congo', KOR:'Corea del Sur', CIV:'Costa de Marfil', CRO:'Croacia', CUW:'Curazao', ECU:'Ecuador', EGY:'Egipto', SCO:'Escocia', ESP:'España', USA:'Estados Unidos', FRA:'Francia', GHA:'Ghana', HAI:'Haití', ENG:'Inglaterra', IRQ:'Irak', IRN:'Irán', JPN:'Japón', JOR:'Jordania', MAR:'Marruecos', MEX:'México', NED:'Países Bajos', NZL:'Nueva Zelanda', NOR:'Noruega', PAN:'Panamá', PAR:'Paraguay', POR:'Portugal', SEN:'Senegal', RSA:'Sudáfrica', ZAF:'Sudáfrica', SWE:'Suecia', SUI:'Suiza', CHE:'Suiza', TUN:'Túnez', TUR:'Türkiye', URU:'Uruguay', UZB:'Uzbekistán'
};
const ESPN_NAME_TO_ES = {
  'germany':'Alemania','saudi arabia':'Arabia Saudí','algeria':'Argelia','argentina':'Argentina','australia':'Australia','austria':'Austria','bosnia and herzegovina':'Bosnia y Herzegovina','brazil':'Brasil','belgium':'Bélgica','cape verde':'Cabo Verde','cape verde islands':'Cabo Verde','canada':'Canadá','qatar':'Catar','czechia':'Chequia','czech republic':'Chequia','colombia':'Colombia','congo dr':'Congo DR','dr congo':'RD Congo','democratic republic of congo':'RD Congo','south korea':'Corea del Sur','ivory coast':'Costa de Marfil','cote d\'ivoire':'Costa de Marfil','croatia':'Croacia','curacao':'Curazao','curaçao':'Curazao','ecuador':'Ecuador','egypt':'Egipto','scotland':'Escocia','spain':'España','united states':'Estados Unidos','usa':'Estados Unidos','france':'Francia','ghana':'Ghana','haiti':'Haití','england':'Inglaterra','iraq':'Irak','iran':'Irán','japan':'Japón','jordan':'Jordania','morocco':'Marruecos','mexico':'México','netherlands':'Países Bajos','holland':'Países Bajos','new zealand':'Nueva Zelanda','norway':'Noruega','panama':'Panamá','paraguay':'Paraguay','portugal':'Portugal','senegal':'Senegal','south africa':'Sudáfrica','sweden':'Suecia','switzerland':'Suiza','tunisia':'Túnez','turkiye':'Türkiye','turkey':'Türkiye','uruguay':'Uruguay','uzbekistan':'Uzbekistán'
};

const $ = (id)=>document.getElementById(id);
const state = {
  baseMatches: [], matches: [], lastEvents: [], lastScores: {}, activeTab: 'today', activeRound: 'R32',
  favoriteTeam: '', noSpoilers: false, onlyFavorite: false, favoriteAlerts: false,
  refreshMs: 15000, refreshTimer: null, lastAttempt: null, lastOk: null, dataSource: 'local', liveCount: 0, installPrompt: null
};

function clean(s){ return (s ?? '').toString().replace(/\u00a0/g,' ').trim(); }
function key(s){ return clean(s).toLocaleLowerCase('es-CL'); }
function hasPlaceholderTeam(team){ const v=key(team); return !v || v.includes('ganador del partido') || v.includes('perdedor del partido') || v.includes('tbd') || v.includes('winner of') || v.includes('loser of'); }
function isRealMatch(m){ return !hasPlaceholderTeam(m.team1) && !hasPlaceholderTeam(m.team2); }
function scoreShown(v){ const s=clean(v); return (!s || ['nan','none','null'].includes(s.toLowerCase())) ? '-' : s; }
function cltDateTime(m){ return new Date(`${m.date}T${m.time_CLT}:00${CLT_OFFSET}`); }
function fmtDate(dateStr){ const d=new Date(`${dateStr}T12:00:00${CLT_OFFSET}`); return new Intl.DateTimeFormat('es-CL',{weekday:'short',day:'2-digit',month:'short'}).format(d); }
function nowCLT(){ return new Date(); }
function timeNow(){ return new Intl.DateTimeFormat('es-CL',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date()); }
function todayCLT(){
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const obj = Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return `${obj.year}-${obj.month}-${obj.day}`;
}
function yyyymmdd(date){ const y=date.getFullYear(); const m=String(date.getMonth()+1).padStart(2,'0'); const d=String(date.getDate()).padStart(2,'0'); return `${y}${m}${d}`; }
function addDays(date, days){ const d=new Date(date); d.setDate(d.getDate()+days); return d; }
function normalizeStatus(raw, m, now=new Date()){
  const status = key(raw || m.api_status || m.status || '');
  const kickoff = cltDateTime(m).getTime(); const t=now.getTime();
  const minutesFromKick = (t-kickoff)/60000;
  if(!isRealMatch(m)) return 'scheduled';
  if(status.includes('final') || status.includes('complete') || status.includes('post') || status.includes('full time')) return 'final';
  const apiSaysLive = status.includes('live') || status.includes('in progress') || status==='in' || status.includes('halftime') || status.includes('half time');
  if(apiSaysLive && minutesFromKick >= -10 && minutesFromKick <= 240) return 'live';
  if(t < kickoff) return 'scheduled';
  if(apiSaysLive) return 'scheduled'; // protección anti falsos EN VIVO fuera de ventana horaria.
  return status.includes('scheduled') || status.includes('pre') || status.includes('not started') ? 'scheduled' : (m.score_team1 !== '-' && m.score_team2 !== '-' ? 'unknown' : 'scheduled');
}
function statusLabel(st){ return st==='live'?'EN VIVO':st==='final'?'FINAL':st==='unknown'?'SIN DATO':'PENDIENTE'; }
function teamFlag(team){ const slug = TEAM_TO_FLAG[clean(team)]; return slug ? `data/flags/${slug}.png` : ''; }
function scoreForDisplay(m){ if(state.noSpoilers && normalizeStatus(null,m)!=='scheduled') return ['•','•']; return [scoreShown(m.score_team1), scoreShown(m.score_team2)]; }
function matchSort(a,b){ return (a.date+a.time_CLT+String(a.match_id).padStart(3,'0')).localeCompare(b.date+b.time_CLT+String(b.match_id).padStart(3,'0')); }
function pairKey(a,b){ const arr=[key(a),key(b)].sort(); return arr.join('|'); }
function cloneMatches(rows){ return rows.map((m)=>({...m, api_status:m.api_status||'scheduled', source:m.source||'local'})); }
function readSettings(){ try{ return JSON.parse(localStorage.getItem(CACHE_KEY)||'{}'); }catch{return{};} }
function saveSettings(){ localStorage.setItem(CACHE_KEY, JSON.stringify({favoriteTeam:state.favoriteTeam,noSpoilers:state.noSpoilers,onlyFavorite:state.onlyFavorite,favoriteAlerts:state.favoriteAlerts,refreshMs:state.refreshMs})); }

function statusPillClass(st){ return st==='live'?'status live':st==='final'?'status final':'status'; }
function renderTeam(team){ const flag=teamFlag(team); return `<span class="team-name ${hasPlaceholderTeam(team)?'placeholder':''}">${flag?`<img class="flag" src="${flag}" alt="">`:''}<span>${clean(team)}</span></span>`; }
function renderMatchCard(m, compact=false){
  const st=normalizeStatus(null,m); const [s1,s2]=scoreForDisplay(m); const fav = state.favoriteTeam && (key(m.team1)===key(state.favoriteTeam)||key(m.team2)===key(state.favoriteTeam));
  return `<article class="match-card ${fav?'favorite':''} ${state.noSpoilers?'spoiler-hidden':''}" data-match="${m.match_id}">
    <div class="match-top"><div class="match-meta">#${m.match_id} · ${fmtDate(m.date)} · ${m.time_CLT} · ${clean(m.city)}</div><span class="${statusPillClass(st)}">${statusLabel(st)}</span></div>
    <div class="teams">
      <div class="team-row">${renderTeam(m.team1)}<span class="score">${s1}</span></div>
      <div class="team-row">${renderTeam(m.team2)}<span class="score">${s2}</span></div>
    </div>
    ${compact?'':`<div class="match-meta" style="margin-top:9px">${clean(m.stage)}</div>`}
  </article>`;
}
function openMatch(m){
  const st=normalizeStatus(null,m); const [s1,s2]=scoreForDisplay(m);
  $('matchDialogContent').innerHTML = `<h2>Match Center</h2>${renderMatchCard(m)}
    <div class="event-card"><p><b>Estado:</b> ${statusLabel(st)}</p><p><b>Horario Chile:</b> ${fmtDate(m.date)} ${m.time_CLT}</p><p><b>Marcador:</b> ${s1} - ${s2}</p><p><b>Fuente:</b> ${m.source||state.dataSource}</p></div>`;
  $('matchDialog').showModal();
}
function renderToday(){
  const t=todayCLT(); $('todayDate').textContent = fmtDate(t); const today=state.matches.filter(m=>m.date===t).sort(matchSort);
  $('todayCards').innerHTML = today.length ? today.map(m=>renderMatchCard(m,true)).join('') : `<div class="empty">No hay partidos programados para hoy en el fixture local.</div>`;
  $('eventsList').innerHTML = state.lastEvents.slice(-5).map(e=>`<div class="event-card"><span class="event-time">${e.time}</span>${e.text}</div>`).join('');
}
function renderFilters(){
  const dates=[...new Set(state.baseMatches.map(m=>m.date))].sort();
  $('dateFilter').innerHTML = `<option value="">Todas las fechas</option>` + dates.map(d=>`<option value="${d}">${fmtDate(d)}</option>`).join('');
  const teams=[...new Set(state.baseMatches.flatMap(m=>[clean(m.team1),clean(m.team2)]).filter(t=>t&&!hasPlaceholderTeam(t)))].sort((a,b)=>a.localeCompare(b,'es'));
  const opts=`<option value="">Todos los equipos</option>` + teams.map(t=>`<option value="${t}">${t}</option>`).join('');
  $('teamFilter').innerHTML=opts; $('favoriteTeam').innerHTML=`<option value="">Sin favorito</option>`+teams.map(t=>`<option value="${t}">${t}</option>`).join(''); $('routeTeam').innerHTML=opts;
  const stages=[...new Set(state.baseMatches.map(m=>clean(m.stage)))]; $('stageFilter').innerHTML=`<option value="">Todas las fases</option>`+stages.map(s=>`<option value="${s}">${s}</option>`).join('');
  $('favoriteTeam').value=state.favoriteTeam; $('routeTeam').value=state.favoriteTeam || teams[0] || '';
}
function filteredMatches(){
  const q=key($('searchInput').value), df=$('dateFilter').value, tf=$('teamFilter').value, sf=$('stageFilter').value;
  return state.matches.filter(m=>{
    if(df && m.date!==df) return false; if(tf && key(m.team1)!==key(tf) && key(m.team2)!==key(tf)) return false; if(sf && clean(m.stage)!==sf) return false;
    if(state.onlyFavorite && state.favoriteTeam && key(m.team1)!==key(state.favoriteTeam) && key(m.team2)!==key(state.favoriteTeam)) return false;
    if(q){ const text=key([m.match_id,m.date,m.time_CLT,m.team1,m.team2,m.stage,m.city].join(' ')); if(!text.includes(q)) return false; }
    return true;
  }).sort(matchSort);
}
function renderFixture(){ const rows=filteredMatches(); $('matchList').innerHTML = rows.length ? rows.map(m=>renderMatchCard(m)).join('') : `<div class="empty">Sin partidos para esos filtros.</div>`; }
function renderBracket(){
  $('roundTabs').innerHTML = ROUNDS.map(([id,name])=>`<button class="${state.activeRound===id?'active':''}" data-round="${id}">${name}</button>`).join('');
  const rounds = ROUNDS.map(([id,name,start,end])=>({id,name,matches:state.matches.filter(m=>Number(m.match_id)>=start && Number(m.match_id)<=end).sort(matchSort)}));
  $('bracketBoard').innerHTML = rounds.map(r=>`<div class="round-col"><div class="round-title">${r.name}</div>${r.matches.map(m=>`<div class="bracket-card" data-match="${m.match_id}">${renderMatchCard(m,true)}</div>`).join('')}</div>`).join('');
  $('bracketInfo').textContent='Actualizado automáticamente';
}
function renderRoute(){
  const team=$('routeTeam').value || state.favoriteTeam; if(!team){ $('routeList').innerHTML='<div class="empty">Elige un equipo.</div>'; return; }
  const start=state.matches.find(m=>key(m.team1)===key(team)||key(m.team2)===key(team));
  if(!start){ $('routeList').innerHTML='<div class="empty">No encontré ese equipo en el fixture.</div>'; return; }
  const path=[]; let current=start; let guard=0;
  while(current && guard++<8){
    path.push(current);
    const nextId = Object.entries(KNOCKOUT_DEPENDENCIES).find(([next, prev])=>prev.includes(String(current.match_id)))?.[0];
    current = nextId ? state.matches.find(m=>String(m.match_id)===nextId) : null;
  }
  $('routeList').innerHTML = path.map((m,i)=>`<div class="route-card"><strong>${i===0?'Inicio':'Si avanza'} · Partido ${m.match_id}</strong><br>${clean(m.stage)} · ${fmtDate(m.date)} ${m.time_CLT}<br>${clean(m.team1)} vs ${clean(m.team2)}</div>`).join('');
}
function updateStatus(){
  const live=state.matches.filter(m=>normalizeStatus(null,m)==='live').length; state.liveCount=live;
  $('liveStatus').textContent=`En vivo: ${live}`; $('liveStatus').className=`pill ${live?'live':''}`;
  $('apiStatus').textContent=`API: ${state.dataSource}`; $('apiStatus').className=`pill ${state.dataSource==='ESPN'?'ok':state.dataSource==='local'?'warn':'warn'}`;
  $('lastAttempt').textContent=state.lastAttempt || '-'; $('lastOk').textContent=state.lastOk || '-';
  $('refreshStatus').textContent=state.refreshMs?`Refresh: ${Math.round(state.refreshMs/1000)}s`:'Refresh: manual';
}
function renderAll(){ document.body.classList.toggle('spoiler-hidden', state.noSpoilers); renderToday(); renderFixture(); renderBracket(); renderRoute(); updateStatus(); }
function addEvent(text){ state.lastEvents.push({time:timeNow(), text}); state.lastEvents = state.lastEvents.slice(-5); }
function detectEvents(before, after){
  const prev=Object.fromEntries(before.map(m=>[m.match_id,m]));
  after.forEach(m=>{
    if(!isRealMatch(m)) return; const p=prev[m.match_id]; if(!p) return;
    const st=normalizeStatus(null,m), pst=normalizeStatus(null,p);
    if(st==='live' && pst!=='live') addEvent(`Comenzó/en vivo: ${clean(m.team1)} vs ${clean(m.team2)}`);
    if(st==='final' && pst!=='final') addEvent(`Finalizó: ${clean(m.team1)} ${scoreShown(m.score_team1)}-${scoreShown(m.score_team2)} ${clean(m.team2)}`);
    if(scoreShown(m.score_team1)!==scoreShown(p.score_team1) || scoreShown(m.score_team2)!==scoreShown(p.score_team2)){
      if(st==='live' || st==='final') addEvent(`Marcador actualizado: ${clean(m.team1)} ${scoreShown(m.score_team1)}-${scoreShown(m.score_team2)} ${clean(m.team2)}`);
    }
  });
}

function espnTeamToEs(c){
  const abbr=clean(c?.team?.abbreviation).toUpperCase(); if(ESPN_ABBR_TO_ES[abbr]) return ESPN_ABBR_TO_ES[abbr];
  const display=key(c?.team?.displayName || c?.team?.shortDisplayName || c?.team?.name); return ESPN_NAME_TO_ES[display] || clean(c?.team?.displayName || c?.team?.name || abbr);
}
function normalizeEspnEvent(ev){
  const comp=ev.competitions?.[0]; const comps=comp?.competitors || []; if(comps.length<2) return null;
  const a=comps[0], b=comps[1]; const st=ev.status?.type || {}; const rawStatus = st.state || st.description || st.name || '';
  return { teamA: espnTeamToEs(a), teamB: espnTeamToEs(b), scoreA: clean(a.score || '-'), scoreB: clean(b.score || '-'), rawStatus, completed: !!st.completed, date: ev.date };
}
async function fetchEspnWindow(){
  const today=new Date(); const dates=[]; for(let i=-2;i<=8;i++) dates.push(yyyymmdd(addDays(today,i)));
  const events=[];
  for(const d of dates){
    const url=`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${d}`;
    const res=await fetch(url, {cache:'no-store'}); if(!res.ok) throw new Error(`ESPN HTTP ${res.status}`);
    const data=await res.json(); (data.events||[]).forEach(ev=>events.push(ev));
  }
  return events.map(normalizeEspnEvent).filter(Boolean);
}
function mergeApiEvents(base, apiEvents, now=new Date()){
  const matches=cloneMatches(base);
  for(const ev of apiEvents){
    const pk=pairKey(ev.teamA, ev.teamB);
    const m=matches.find(x=>isRealMatch(x) && pairKey(x.team1,x.team2)===pk);
    if(!m) continue;
    const aIsTeam1=key(m.team1)===key(ev.teamA); m.score_team1 = aIsTeam1?ev.scoreA:ev.scoreB; m.score_team2 = aIsTeam1?ev.scoreB:ev.scoreA;
    m.api_status = ev.completed ? 'final' : ev.rawStatus;
    const st=normalizeStatus(m.api_status,m,now); m.status=st; m.source='ESPN';
  }
  return matches;
}
async function refreshScores(){
  state.lastAttempt=timeNow(); updateStatus(); const before=cloneMatches(state.matches);
  try{
    const apiEvents=await fetchEspnWindow(); const merged=mergeApiEvents(state.baseMatches, apiEvents, new Date());
    state.matches=merged; state.dataSource='ESPN'; state.lastOk=timeNow(); localStorage.setItem(API_CACHE_KEY, JSON.stringify({ts:Date.now(), matches:state.matches})); detectEvents(before,state.matches);
  }catch(err){
    console.warn('API fallback local:', err);
    state.dataSource='local/cache';
    try{ const cache=JSON.parse(localStorage.getItem(API_CACHE_KEY)||'{}'); if(cache.matches?.length){ state.matches=cache.matches; state.dataSource='cache'; } }catch{}
  }
  renderAll(); scheduleRefresh();
}
function scheduleRefresh(){ if(state.refreshTimer) clearTimeout(state.refreshTimer); if(state.refreshMs>0) state.refreshTimer=setTimeout(refreshScores,state.liveCount?Math.min(state.refreshMs,15000):state.refreshMs); }
function exportIcs(){
  const rows=filteredMatches(); const esc=s=>clean(s).replace(/,/g,'\\,');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//WorldCup2026Mobile//ES'];
  rows.forEach(m=>{ const dt=cltDateTime(m); const end=new Date(dt.getTime()+2*60*60*1000); const toICS=d=>d.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z'; lines.push('BEGIN:VEVENT',`UID:wc2026-${m.match_id}@mobile`, `DTSTAMP:${toICS(new Date())}`, `DTSTART:${toICS(dt)}`, `DTEND:${toICS(end)}`, `SUMMARY:${esc(m.team1)} vs ${esc(m.team2)}`, `DESCRIPTION:${esc(m.stage)} - ${esc(m.city)} - Hora Chile`, 'END:VEVENT'); });
  lines.push('END:VCALENDAR'); const blob=new Blob([lines.join('\r\n')],{type:'text/calendar'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='Mundial_2026_Hora_Chile.ics'; a.click(); URL.revokeObjectURL(url);
}
function wireEvents(){
  document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));btn.classList.add('active');$(btn.dataset.tab).classList.add('active');state.activeTab=btn.dataset.tab;}));
  document.body.addEventListener('click',e=>{ const card=e.target.closest('[data-match]'); if(card){ const m=state.matches.find(x=>String(x.match_id)===String(card.dataset.match)); if(m) openMatch(m); } const r=e.target.closest('[data-round]'); if(r){state.activeRound=r.dataset.round; renderBracket();} });
  ['searchInput','dateFilter','teamFilter','stageFilter'].forEach(id=>$(id).addEventListener('input',renderFixture));
  $('onlyFavoriteCheck').addEventListener('change',e=>{state.onlyFavorite=e.target.checked; saveSettings(); renderFixture();});
  $('favoriteTeam').addEventListener('change',e=>{state.favoriteTeam=e.target.value; $('routeTeam').value=state.favoriteTeam; saveSettings(); renderAll();});
  $('routeTeam').addEventListener('change',renderRoute); $('noSpoilersCheck').addEventListener('change',e=>{state.noSpoilers=e.target.checked; saveSettings(); renderAll();});
  $('favoriteAlertsCheck').addEventListener('change',e=>{state.favoriteAlerts=e.target.checked; saveSettings();});
  $('refreshInterval').addEventListener('change',e=>{state.refreshMs=Number(e.target.value); saveSettings(); scheduleRefresh(); updateStatus();});
  $('refreshBtn').addEventListener('click',refreshScores); $('closeDialog').addEventListener('click',()=>$('matchDialog').close()); $('exportIcsBtn').addEventListener('click',exportIcs);
  $('clearCacheBtn').addEventListener('click',()=>{localStorage.removeItem(API_CACHE_KEY); state.lastEvents=[]; alert('Cache local limpiado.'); renderAll();});
  $('shareBtn').addEventListener('click',async()=>{ const data={title:'WorldCup 2026 Mobile',text:'Fixture y bracket del Mundial 2026',url:location.href}; if(navigator.share) await navigator.share(data); else navigator.clipboard?.writeText(location.href); });
  const scroller=$('bracketScroller'); let dragging=false, startX=0,startY=0,scrollLeft=0,scrollTop=0;
  scroller.addEventListener('pointerdown',e=>{dragging=true;scroller.setPointerCapture(e.pointerId);startX=e.clientX;startY=e.clientY;scrollLeft=scroller.scrollLeft;scrollTop=scroller.scrollTop;});
  scroller.addEventListener('pointermove',e=>{if(!dragging)return;scroller.scrollLeft=scrollLeft-(e.clientX-startX);scroller.scrollTop=scrollTop-(e.clientY-startY);});
  scroller.addEventListener('pointerup',()=>dragging=false); scroller.addEventListener('pointercancel',()=>dragging=false);
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installPrompt=e;$('installBtn').classList.remove('hidden');});
  $('installBtn').addEventListener('click',async()=>{if(state.installPrompt){state.installPrompt.prompt(); await state.installPrompt.userChoice; state.installPrompt=null;$('installBtn').classList.add('hidden');}});
}
async function init(){
  const settings=readSettings(); Object.assign(state, settings); $('noSpoilersCheck').checked=!!state.noSpoilers; $('onlyFavoriteCheck').checked=!!state.onlyFavorite; $('favoriteAlertsCheck').checked=!!state.favoriteAlerts; $('refreshInterval').value=String(state.refreshMs??15000);
  const res=await fetch('data/schedule.json'); const data=await res.json(); state.baseMatches=cloneMatches(data); state.matches=cloneMatches(data).sort(matchSort); renderFilters(); wireEvents(); renderAll(); refreshScores();
}
if(typeof window!=='undefined') window.addEventListener('DOMContentLoaded',init);
if(typeof module!=='undefined') module.exports={clean,key,hasPlaceholderTeam,isRealMatch,normalizeStatus,mergeApiEvents,scoreShown,pairKey,cltDateTime};
