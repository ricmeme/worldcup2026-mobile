/* Patches móviles: banderas robustas, bracket filtrado y resultados históricos. */
const WC26_FLAG_EMOJI = {
  'Alemania':'🇩🇪','Arabia Saudí':'🇸🇦','Argelia':'🇩🇿','Argentina':'🇦🇷','Australia':'🇦🇺','Austria':'🇦🇹',
  'Bosnia y Herzegovina':'🇧🇦','Brasil':'🇧🇷','Bélgica':'🇧🇪','Cabo Verde':'🇨🇻','Canadá':'🇨🇦','Catar':'🇶🇦',
  'Chequia':'🇨🇿','Colombia':'🇨🇴','Congo DR':'🇨🇩','RD Congo':'🇨🇩','Corea del Sur':'🇰🇷','Costa de Marfil':'🇨🇮',
  'Croacia':'🇭🇷','Curazao':'🇨🇼','Ecuador':'🇪🇨','Egipto':'🇪🇬','Escocia':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','España':'🇪🇸',
  'Estados Unidos':'🇺🇸','Francia':'🇫🇷','Ghana':'🇬🇭','Haití':'🇭🇹','Inglaterra':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Irak':'🇮🇶',
  'Irán':'🇮🇷','Japón':'🇯🇵','Jordania':'🇯🇴','Marruecos':'🇲🇦','México':'🇲🇽','Noruega':'🇳🇴',
  'Nueva Zelanda':'🇳🇿','Panamá':'🇵🇦','Paraguay':'🇵🇾','Países Bajos':'🇳🇱','Portugal':'🇵🇹','Senegal':'🇸🇳',
  'Sudáfrica':'🇿🇦','Suecia':'🇸🇪','Suiza':'🇨🇭','Túnez':'🇹🇳','Türkiye':'🇹🇷','Uruguay':'🇺🇾','Uzbekistán':'🇺🇿'
};

let wc26HistoricalHydrated = false;

(function injectMobileFixStyles(){
  const css = `.flag-emoji{width:24px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-size:18px;line-height:1;filter:saturate(1.1)}.selected-round{width:min(86vw,360px)}.bracket-board{min-width:0}.round-col.selected-round{max-width:100%}`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

function wc26FlagEmoji(team){
  return WC26_FLAG_EMOJI[clean(team)] || '';
}

renderTeam = function(team){
  const emoji = wc26FlagEmoji(team);
  const flag = emoji ? `<span class="flag-emoji" aria-hidden="true">${emoji}</span>` : '';
  return `<span class="team-name ${hasPlaceholderTeam(team)?'placeholder':''}">${flag}<span>${clean(team)}</span></span>`;
};

renderBracket = function(){
  $('roundTabs').innerHTML = ROUNDS.map(([id,name])=>`<button class="${state.activeRound===id?'active':''}" data-round="${id}">${name}</button>`).join('');
  const selected = ROUNDS.find(([id])=>id===state.activeRound) || ROUNDS[0];
  const [id,name,start,end] = selected;
  const matches = state.matches.filter(m=>Number(m.match_id)>=start && Number(m.match_id)<=end).sort(matchSort);
  $('bracketBoard').innerHTML = `<div class="round-col selected-round"><div class="round-title">${name}</div>${matches.map(m=>`<div class="bracket-card" data-match="${m.match_id}">${renderMatchCard(m,true)}</div>`).join('')}</div>`;
  $('bracketInfo').textContent = `Mostrando: ${name}`;
};

normalizeEspnEvent = function(ev){
  const comp = ev.competitions?.[0];
  const comps = comp?.competitors || [];
  if (comps.length < 2) return null;
  const a = comps[0], b = comps[1];
  const st = ev.status?.type || {};
  const rawStatus = st.state || st.description || st.name || '';
  const teamA = espnTeamToEs(a);
  const teamB = espnTeamToEs(b);
  const winnerRaw = a.winner ? teamA : (b.winner ? teamB : '');
  const loserRaw = a.winner ? teamB : (b.winner ? teamA : '');
  return {
    teamA,
    teamB,
    scoreA: clean(a.score || '-'),
    scoreB: clean(b.score || '-'),
    rawStatus,
    completed: !!st.completed,
    winnerTeam: winnerRaw,
    loserTeam: loserRaw,
    date: ev.date
  };
};

function wc26DateToYmd(date){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}${m}${d}`;
}

function wc26YmdDash(date){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

function wc26DateRange(startDash, endDash){
  const out = [];
  const start = new Date(`${startDash}T12:00:00-04:00`);
  const end = new Date(`${endDash}T12:00:00-04:00`);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) out.push(wc26DateToYmd(d));
  return out;
}

fetchEspnWindow = async function(){
  const today = new Date();
  const todayDash = wc26YmdDash(today);
  const tournamentStart = '2026-06-11';
  const tournamentEnd = '2026-07-19';
  let fromDash;
  let toDash;

  if (!wc26HistoricalHydrated && todayDash >= tournamentStart) {
    fromDash = tournamentStart;
    const plus8 = wc26YmdDash(addDays(today, 8));
    toDash = plus8 > tournamentEnd ? tournamentEnd : plus8;
  } else {
    fromDash = wc26YmdDash(addDays(today, -2));
    const plus8 = wc26YmdDash(addDays(today, 8));
    toDash = plus8 > tournamentEnd ? tournamentEnd : plus8;
  }

  const dates = wc26DateRange(fromDash, toDash);
  const events = [];
  for (const d of dates) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${d}`;
    const res = await fetch(url, {cache:'no-store'});
    if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`);
    const data = await res.json();
    (data.events || []).forEach(ev => events.push(ev));
  }
  wc26HistoricalHydrated = true;
  return events.map(normalizeEspnEvent).filter(Boolean);
};

function wc26NumericScore(value){
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function wc26WinnerFromScore(m){
  const s1 = wc26NumericScore(m.score_team1);
  const s2 = wc26NumericScore(m.score_team2);
  if (s1 === null || s2 === null || s1 === s2) return '';
  return s1 > s2 ? clean(m.team1) : clean(m.team2);
}

function wc26LoserFromScore(m){
  const s1 = wc26NumericScore(m.score_team1);
  const s2 = wc26NumericScore(m.score_team2);
  if (s1 === null || s2 === null || s1 === s2) return '';
  return s1 < s2 ? clean(m.team1) : clean(m.team2);
}

function wc26ResolvedWinner(m){
  if (!m || normalizeStatus(null, m) !== 'final') return '';
  return clean(m.api_winner) || wc26WinnerFromScore(m);
}

function wc26ResolvedLoser(m){
  if (!m || normalizeStatus(null, m) !== 'final') return '';
  return clean(m.api_loser) || wc26LoserFromScore(m);
}

function wc26ApplyKnockoutProgression(matches){
  const byId = Object.fromEntries(matches.map(m => [String(m.match_id), m]));
  Object.entries(KNOCKOUT_DEPENDENCIES).forEach(([nextId, prevIds]) => {
    const next = byId[nextId];
    if (!next) return;
    const a = byId[String(prevIds[0])];
    const b = byId[String(prevIds[1])];
    const isThirdPlace = String(nextId) === '103';
    const teamA = isThirdPlace ? wc26ResolvedLoser(a) : wc26ResolvedWinner(a);
    const teamB = isThirdPlace ? wc26ResolvedLoser(b) : wc26ResolvedWinner(b);
    if (teamA) next.team1 = teamA;
    if (teamB) next.team2 = teamB;
  });
  return matches;
}

mergeApiEvents = function(base, apiEvents, now=new Date()){
  const matches = cloneMatches(base);
  for (const ev of apiEvents) {
    const pk = pairKey(ev.teamA, ev.teamB);
    const m = matches.find(x => isRealMatch(x) && pairKey(x.team1,x.team2) === pk);
    if (!m) continue;
    const aIsTeam1 = key(m.team1) === key(ev.teamA);
    m.score_team1 = aIsTeam1 ? ev.scoreA : ev.scoreB;
    m.score_team2 = aIsTeam1 ? ev.scoreB : ev.scoreA;
    m.api_status = ev.completed ? 'final' : ev.rawStatus;
    m.api_winner = ev.winnerTeam || '';
    m.api_loser = ev.loserTeam || '';
    const st = normalizeStatus(m.api_status, m, now);
    m.status = st;
    m.source = 'ESPN';
  }
  return wc26ApplyKnockoutProgression(matches);
};
