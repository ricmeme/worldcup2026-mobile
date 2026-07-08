/* Patches móviles: proveedor robusto worldcup26 + ESPN, banderas, bracket filtrado y estado correcto. */
const WC26_FLAG_EMOJI = {
  'Alemania':'🇩🇪','Arabia Saudí':'🇸🇦','Argelia':'🇩🇿','Argentina':'🇦🇷','Australia':'🇦🇺','Austria':'🇦🇹','Bosnia y Herzegovina':'🇧🇦','Brasil':'🇧🇷','Bélgica':'🇧🇪','Cabo Verde':'🇨🇻','Canadá':'🇨🇦','Catar':'🇶🇦','Chequia':'🇨🇿','Colombia':'🇨🇴','Congo DR':'🇨🇩','RD Congo':'🇨🇩','Corea del Sur':'🇰🇷','Costa de Marfil':'🇨🇮','Croacia':'🇭🇷','Curazao':'🇨🇼','Ecuador':'🇪🇨','Egipto':'🇪🇬','Escocia':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','España':'🇪🇸','Estados Unidos':'🇺🇸','Francia':'🇫🇷','Ghana':'🇬🇭','Haití':'🇭🇹','Inglaterra':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Irak':'🇮🇶','Irán':'🇮🇷','Japón':'🇯🇵','Jordania':'🇯🇴','Marruecos':'🇲🇦','México':'🇲🇽','Noruega':'🇳🇴','Nueva Zelanda':'🇳🇿','Panamá':'🇵🇦','Paraguay':'🇵🇾','Países Bajos':'🇳🇱','Portugal':'🇵🇹','Senegal':'🇸🇳','Sudáfrica':'🇿🇦','Suecia':'🇸🇪','Suiza':'🇨🇭','Túnez':'🇹🇳','Türkiye':'🇹🇷','Uruguay':'🇺🇾','Uzbekistán':'🇺🇿'
};
const WC26_EN_TO_ES = {'mexico':'México','south africa':'Sudáfrica','south korea':'Corea del Sur','czech republic':'Chequia','czechia':'Chequia','canada':'Canadá','bosnia and herzegovina':'Bosnia y Herzegovina','united states':'Estados Unidos','paraguay':'Paraguay','haiti':'Haití','scotland':'Escocia','australia':'Australia','turkey':'Türkiye','turkiye':'Türkiye','brazil':'Brasil','morocco':'Marruecos','qatar':'Catar','switzerland':'Suiza','ivory coast':'Costa de Marfil','cote d’ivoire':'Costa de Marfil','ecuador':'Ecuador','germany':'Alemania','curacao':'Curazao','curaçao':'Curazao','netherlands':'Países Bajos','japan':'Japón','sweden':'Suecia','tunisia':'Túnez','iran':'Irán','new zealand':'Nueva Zelanda','belgium':'Bélgica','egypt':'Egipto','saudi arabia':'Arabia Saudí','uruguay':'Uruguay','spain':'España','cape verde':'Cabo Verde','cape verde islands':'Cabo Verde','france':'Francia','senegal':'Senegal','iraq':'Irak','norway':'Noruega','argentina':'Argentina','algeria':'Argelia','austria':'Austria','jordan':'Jordania','ghana':'Ghana','panama':'Panamá','england':'Inglaterra','croatia':'Croacia','portugal':'Portugal','democratic republic of the congo':'RD Congo','dr congo':'RD Congo','congo dr':'Congo DR','uzbekistan':'Uzbekistán','colombia':'Colombia'};

let wc26HistoricalHydrated = false;
let wc26LastEspnAt = 0;
let wc26EspnCache = [];
let wc26ApiStats = {range:'-', events:0, matched:0, okDates:0, failedDates:0, failedSample:'', wEvents:0, wMatched:0, eEvents:0, eMatched:0};
const wc26OriginalUpdateStatus = updateStatus;
const wc26OriginalNormalizeStatus = normalizeStatus;

(function injectMobileFixStyles(){
  const css = `.flag-emoji{width:24px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-size:18px;line-height:1;filter:saturate(1.1)}.selected-round{width:min(86vw,360px)}.bracket-board{min-width:0}.round-col.selected-round{max-width:100%}.status.unknown{background:#4b3b12;color:#ffe08a}`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

function wc26D2(n){ return String(n).padStart(2,'0'); }
function wc26Ymd(date){ return '' + date.getFullYear() + wc26D2(date.getMonth()+1) + wc26D2(date.getDate()); }
function wc26YmdDash(date){ return date.getFullYear() + '-' + wc26D2(date.getMonth()+1) + '-' + wc26D2(date.getDate()); }
function wc26DateRange(startDash, endDash){ const out=[]; const s=new Date(startDash+'T12:00:00-04:00'); const e=new Date(endDash+'T12:00:00-04:00'); for(const d=new Date(s); d<=e; d.setDate(d.getDate()+1)) out.push(wc26Ymd(d)); return out; }
function wc26EsName(name){ const raw=clean(name); return ESPN_NAME_TO_ES[key(raw)] || WC26_EN_TO_ES[key(raw)] || raw; }
function wc26SafeScore(v){ const s=clean(v); return (!s || ['null','none','nan','undefined'].includes(s.toLowerCase())) ? '-' : s; }
function wc26GameStatus(g, m, now=new Date()){
  const raw = key([g.finished,g.status,g.time_elapsed,g.state].join(' '));
  if(raw.includes('true') || raw.includes('finished') || raw.includes('final') || raw.includes('complete')) return 'final';
  const elapsed = Number(String(g.time_elapsed || g.elapsed || g.minute || '').replace(/[^0-9.]/g,''));
  if(Number.isFinite(elapsed) && elapsed > 0 && elapsed < 130) return 'live';
  return normalizeStatus(raw, m, now);
}

normalizeStatus = function(raw, m, now=new Date()){
  const st = wc26OriginalNormalizeStatus(raw, m, now);
  if(st === 'scheduled' && isRealMatch(m)){
    const minutesFromKick = (now.getTime() - cltDateTime(m).getTime()) / 60000;
    if(minutesFromKick >= -2 && minutesFromKick <= 140) return 'live';
    if(minutesFromKick > 240 && scoreShown(m.score_team1) === '-' && scoreShown(m.score_team2) === '-') return 'unknown';
  }
  return st;
};
statusPillClass = function(st){ return st==='live'?'status live':st==='final'?'status final':st==='unknown'?'status unknown':'status'; };
updateStatus = function(){
  wc26OriginalUpdateStatus();
  const api=$('apiStatus');
  if(!api) return;
  const ds=clean(state.dataSource);
  if(ds.startsWith('OK')){ api.textContent='API: '+ds; api.className='pill ok'; api.title=`W:${wc26ApiStats.wMatched}/${wc26ApiStats.wEvents}; ESPN:${wc26ApiStats.eMatched}/${wc26ApiStats.eEvents}; fechas OK:${wc26ApiStats.okDates}; fallidas:${wc26ApiStats.failedDates}; ${wc26ApiStats.failedSample}`; }
};
function wc26FlagEmoji(team){ return WC26_FLAG_EMOJI[clean(team)] || ''; }
renderTeam = function(team){ const emoji=wc26FlagEmoji(team); const flag=emoji ? `<span class="flag-emoji" aria-hidden="true">${emoji}</span>` : ''; return `<span class="team-name ${hasPlaceholderTeam(team)?'placeholder':''}">${flag}<span>${clean(team)}</span></span>`; };
renderBracket = function(){ $('roundTabs').innerHTML = ROUNDS.map(([id,name])=>`<button class="${state.activeRound===id?'active':''}" data-round="${id}">${name}</button>`).join(''); const selected=ROUNDS.find(([id])=>id===state.activeRound)||ROUNDS[0]; const [id,name,start,end]=selected; const matches=state.matches.filter(m=>Number(m.match_id)>=start&&Number(m.match_id)<=end).sort(matchSort); $('bracketBoard').innerHTML=`<div class="round-col selected-round"><div class="round-title">${name}</div>${matches.map(m=>`<div class="bracket-card" data-match="${m.match_id}">${renderMatchCard(m,true)}</div>`).join('')}</div>`; $('bracketInfo').textContent=`Mostrando: ${name}`; };

normalizeEspnEvent = function(ev){ const comp=ev.competitions?.[0]; const comps=comp?.competitors||[]; if(comps.length<2) return null; const a=comps[0], b=comps[1]; const st=ev.status?.type||{}; const teamA=espnTeamToEs(a), teamB=espnTeamToEs(b); return {teamA, teamB, scoreA:wc26SafeScore(a.score), scoreB:wc26SafeScore(b.score), rawStatus:st.state||st.description||st.name||'', completed:!!st.completed, winnerTeam:a.winner?teamA:(b.winner?teamB:''), loserTeam:a.winner?teamB:(b.winner?teamA:''), date:ev.date}; };
async function wc26FetchWorldcup26(){ const res=await fetch('https://worldcup26.ir/get/games',{cache:'no-store'}); if(!res.ok) throw new Error('worldcup26 HTTP '+res.status); const data=await res.json(); return Array.isArray(data) ? data : (data.games||data.data||[]); }
function wc26MergeWorldcup(base, games, now=new Date()){
  const matches=cloneMatches(base); let matched=0;
  for(const g of games){ const id=String(g.id || g.match_id || g.matchId || g.game_id || ''); if(!id) continue; const m=matches.find(x=>String(x.match_id)===id); if(!m) continue; matched+=1; const home=wc26EsName(g.home_team_name_en||g.home_team_name||g.home_name||g.homeTeamName||''); const away=wc26EsName(g.away_team_name_en||g.away_team_name||g.away_name||g.awayTeamName||''); if(home && !hasPlaceholderTeam(home)) m.team1=home; if(away && !hasPlaceholderTeam(away)) m.team2=away; const hs=wc26SafeScore(g.home_score); const as=wc26SafeScore(g.away_score); if(hs!=='-') m.score_team1=hs; if(as!=='-') m.score_team2=as; m.api_status=wc26GameStatus(g,m,now); m.status=m.api_status; m.source='worldcup26'; }
  wc26ApiStats.wEvents=games.length; wc26ApiStats.wMatched=matched; return {matches, matched};
}
async function fetchEspnWindow(){ return wc26FetchEspnCritical(true); }
async function wc26FetchEspnCritical(force=false){
  const now=Date.now(); const throttle=state.liveCount ? 15000 : 60000;
  if(!force && wc26EspnCache.length && now-wc26LastEspnAt < throttle) return wc26EspnCache;
  const dates=new Set(); dates.add(wc26Ymd(new Date())); const df=$('dateFilter')?.value; if(df) dates.add(df.replaceAll('-',''));
  const today=wc26YmdDash(new Date()); const yesterday=wc26YmdDash(addDays(new Date(),-1)); const tomorrow=wc26YmdDash(addDays(new Date(),1)); [today,yesterday,tomorrow].forEach(d=>dates.add(d.replaceAll('-','')));
  const events=[]; let okDates=0, failedDates=0; const failed=[];
  for(const d of dates){ try{ const url=`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${d}`; const res=await fetch(url,{cache:'no-store'}); if(!res.ok) throw new Error(`HTTP ${res.status}`); const data=await res.json(); okDates+=1; (data.events||[]).forEach(ev=>events.push(ev)); }catch(err){ failedDates+=1; if(failed.length<3) failed.push(`${d}:${err && err.message ? err.message : 'error'}`); } }
  wc26LastEspnAt=now; wc26EspnCache=events.map(normalizeEspnEvent).filter(Boolean); wc26ApiStats.eEvents=wc26EspnCache.length; wc26ApiStats.okDates=okDates; wc26ApiStats.failedDates=failedDates; wc26ApiStats.failedSample=failed.join(', '); return wc26EspnCache;
}
function wc26NumericScore(value){ const n=Number(String(value).replace(',','.')); return Number.isFinite(n)?n:null; }
function wc26WinnerFromScore(m){ const s1=wc26NumericScore(m.score_team1),s2=wc26NumericScore(m.score_team2); if(s1===null||s2===null||s1===s2)return ''; return s1>s2?clean(m.team1):clean(m.team2); }
function wc26LoserFromScore(m){ const s1=wc26NumericScore(m.score_team1),s2=wc26NumericScore(m.score_team2); if(s1===null||s2===null||s1===s2)return ''; return s1<s2?clean(m.team1):clean(m.team2); }
function wc26ResolvedWinner(m){ if(!m||normalizeStatus(null,m)!=='final')return ''; return clean(m.api_winner)||wc26WinnerFromScore(m); }
function wc26ResolvedLoser(m){ if(!m||normalizeStatus(null,m)!=='final')return ''; return clean(m.api_loser)||wc26LoserFromScore(m); }
function wc26ApplyKnockoutProgression(matches){ const byId=Object.fromEntries(matches.map(m=>[String(m.match_id),m])); Object.entries(KNOCKOUT_DEPENDENCIES).forEach(([nextId,prevIds])=>{ const next=byId[nextId]; if(!next)return; const a=byId[String(prevIds[0])], b=byId[String(prevIds[1])]; const isThird=String(nextId)==='103'; const teamA=isThird?wc26ResolvedLoser(a):wc26ResolvedWinner(a); const teamB=isThird?wc26ResolvedLoser(b):wc26ResolvedWinner(b); if(teamA)next.team1=teamA; if(teamB)next.team2=teamB; }); return matches; }
mergeApiEvents = function(base, apiEvents, now=new Date()){ const matches=cloneMatches(base); let matched=0; for(const ev of apiEvents){ const pk=pairKey(ev.teamA,ev.teamB); const m=matches.find(x=>isRealMatch(x)&&pairKey(x.team1,x.team2)===pk); if(!m)continue; matched+=1; const aIsTeam1=key(m.team1)===key(ev.teamA); m.score_team1=aIsTeam1?ev.scoreA:ev.scoreB; m.score_team2=aIsTeam1?ev.scoreB:ev.scoreA; m.api_status=ev.completed?'final':ev.rawStatus; m.api_winner=ev.winnerTeam||''; m.api_loser=ev.loserTeam||''; m.status=normalizeStatus(m.api_status,m,now); m.source='ESPN'; } wc26ApiStats.eMatched=matched; return wc26ApplyKnockoutProgression(matches); };

refreshScores = async function(evt){
  state.lastAttempt=timeNow(); updateStatus(); const before=cloneMatches(state.matches); let current=cloneMatches(state.baseMatches); let usedW=false, usedE=false;
  try{ const games=await wc26FetchWorldcup26(); const w=wc26MergeWorldcup(current,games,new Date()); current=w.matches; usedW=w.matched>0; }catch(err){ console.warn('worldcup26 fallback:',err); wc26ApiStats.wEvents=0; wc26ApiStats.wMatched=0; }
  try{ const e=await wc26FetchEspnCritical(!!evt && evt.type==='click'); if(e.length){ current=mergeApiEvents(current,e,new Date()); usedE=true; } }catch(err){ console.warn('ESPN fallback:',err); wc26ApiStats.eEvents=0; wc26ApiStats.eMatched=0; }
  if(usedW||usedE){ state.matches=wc26ApplyKnockoutProgression(current); state.dataSource=`OK W${wc26ApiStats.wMatched}+E${wc26ApiStats.eMatched}`; state.lastOk=timeNow(); localStorage.setItem(API_CACHE_KEY,JSON.stringify({ts:Date.now(),matches:state.matches})); detectEvents(before,state.matches); }
  else { try{ const cache=JSON.parse(localStorage.getItem(API_CACHE_KEY)||'{}'); if(cache.matches?.length){ state.matches=cache.matches; state.dataSource='cache'; } else { state.dataSource='local'; } }catch{ state.dataSource='local'; } }
  renderAll(); scheduleRefresh();
};
