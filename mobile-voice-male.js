/* Voz masculina deportiva para goles.
   No imita voces reales de ESPN/Fox: usa la voz masculina disponible del sistema Android/Chrome. */
const WC26_MALE_VOICE_KEY = 'wc26_mobile_male_voice_v1';

function wc26MaleVoiceSettings(){
  try{
    return Object.assign({voiceProfile:'auto'}, JSON.parse(localStorage.getItem(WC26_MALE_VOICE_KEY)||'{}'));
  }catch{
    return {voiceProfile:'auto'};
  }
}
function wc26SaveMaleVoiceSettings(settings){ localStorage.setItem(WC26_MALE_VOICE_KEY, JSON.stringify(settings)); }
function wc26SportsPhrase(match, goal){
  const score = goal?.score ? ` Marcador ${goal.score}.` : '';
  const team = goal?.scoringTeam ? ` de ${goal.scoringTeam}` : '';
  const phrases = {
    latam:`¡Gooooool${team}! ¡Golazo, señoras y señores! ¡Lo canta el estadio entero!${score}`,
    estadio:`¡Gol, gol, gol${team}! ¡Explota la tribuna, explota la cancha!${score}`,
    radial:`¡Atención, atención! ¡Se rompe el cero! ¡Gooooool${team}!${score}`,
    neutro:`Gol${team}.${score}`
  };
  return phrases[wc26NotifySettings?.sound] || phrases.latam;
}
function wc26PickMaleSpanishVoice(profile='auto'){
  if(!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if(!voices.length) return null;
  const spanish = voices.filter(v => /(^es[-_])|spanish|español/i.test(`${v.lang} ${v.name}`));
  const pool = spanish.length ? spanish : voices;
  const maleWords = /male|masculin|hombre|man|pablo|jorge|diego|juan|carlos|miguel|raul|pedro|luis|antonio|google español/i;
  const preferredLocale = {auto:null,latam:/es[-_](419|MX|US|CO|AR|CL|PE|UY)/i,chile:/es[-_]CL/i,mexico:/es[-_]MX/i,espana:/es[-_]ES/i}[profile] || null;
  const byLocale = preferredLocale ? pool.filter(v => preferredLocale.test(`${v.lang} ${v.name}`)) : pool;
  const candidates = byLocale.length ? byLocale : pool;
  return candidates.find(v => maleWords.test(`${v.name} ${v.lang}`)) || candidates[0] || null;
}
wc26GoalPhrase = function(match, goal){ return wc26SportsPhrase(match, goal); };
wc26Speak = function(text){
  try{
    if(!('speechSynthesis' in window)) return wc26Beep();
    window.speechSynthesis.cancel();
    const maleSettings = wc26MaleVoiceSettings();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = maleSettings.voiceProfile === 'chile' ? 'es-CL' : maleSettings.voiceProfile === 'mexico' ? 'es-MX' : maleSettings.voiceProfile === 'espana' ? 'es-ES' : 'es-419';
    utterance.rate = wc26NotifySettings?.sound === 'radial' ? 1.12 : 1.04;
    utterance.pitch = wc26NotifySettings?.sound === 'estadio' ? 0.82 : 0.72;
    utterance.volume = 1;
    const voice = wc26PickMaleSpanishVoice(maleSettings.voiceProfile || 'auto');
    if(voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  }catch{ wc26Beep(); }
};
function wc26WireMaleVoiceControls(){
  const select = document.getElementById('maleVoiceProfileSelect');
  const hint = document.getElementById('maleVoiceHint');
  if(!select) return;
  const settings = wc26MaleVoiceSettings();
  select.value = settings.voiceProfile || 'auto';
  const updateHint = () => {
    const voice = wc26PickMaleSpanishVoice(select.value);
    if(hint) hint.textContent = voice ? `Voz usada por Android/Chrome: ${voice.name} (${voice.lang}).` : 'No se pudo leer lista de voces todavía. Toca probar sonido.';
  };
  select.addEventListener('change', e => { wc26SaveMaleVoiceSettings({voiceProfile:e.target.value}); updateHint(); });
  if('speechSynthesis' in window){ window.speechSynthesis.onvoiceschanged = updateHint; }
  setTimeout(updateHint, 400);
}

/* API robusta: evita caer a local si falla una sola fecha de ESPN. */
(function(){
  function d2(n){ return String(n).padStart(2,'0'); }
  function ymdDash(date){ return date.getFullYear() + '-' + d2(date.getMonth()+1) + '-' + d2(date.getDate()); }
  function ymd(date){ return '' + date.getFullYear() + d2(date.getMonth()+1) + d2(date.getDate()); }
  function dateRange(startDash,endDash){
    const out=[]; const start=new Date(startDash+'T12:00:00-04:00'); const end=new Date(endDash+'T12:00:00-04:00');
    for(const d=new Date(start); d<=end; d.setDate(d.getDate()+1)) out.push(ymd(d));
    return out;
  }
  fetchEspnWindow = async function(){
    const today=new Date(); const todayDash=ymdDash(today); const start='2026-06-11'; const end='2026-07-19';
    let fromDash, toDash;
    if(!window.wc26HistoricalHydrated && todayDash >= start){ fromDash=start; const p=ymdDash(addDays(today,8)); toDash=p>end?end:p; }
    else { fromDash=ymdDash(addDays(today,-2)); const p=ymdDash(addDays(today,8)); toDash=p>end?end:p; }
    const dates=dateRange(fromDash,toDash); const events=[]; let okDates=0; let failedDates=0; const failed=[];
    for(const d of dates){
      try{
        const url='https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates='+d;
        const res=await fetch(url,{cache:'no-store'});
        if(!res.ok) throw new Error('HTTP '+res.status);
        const data=await res.json(); okDates += 1; (data.events||[]).forEach(ev=>events.push(ev));
      }catch(err){ failedDates += 1; if(failed.length<3) failed.push(d+':'+(err && err.message ? err.message : 'error')); }
    }
    window.wc26HistoricalHydrated=true;
    if(typeof wc26ApiStats !== 'undefined'){
      wc26ApiStats.range=fromDash+' → '+toDash; wc26ApiStats.events=events.length; wc26ApiStats.okDates=okDates; wc26ApiStats.failedDates=failedDates; wc26ApiStats.failedSample=failed.join(', ');
    }
    if(events.length===0 && okDates===0) throw new Error('ESPN sin fechas OK; fallidas='+failedDates+'; '+failed.join(', '));
    return events.map(normalizeEspnEvent).filter(Boolean);
  };
})();

window.addEventListener('DOMContentLoaded', () => setTimeout(wc26WireMaleVoiceControls, 50));
