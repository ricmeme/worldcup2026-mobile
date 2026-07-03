/* Notificaciones móviles para Android/PWA.
   Nota: en una PWA estática no hay push real sin backend; esto notifica mientras la app está viva/abierta. */
const WC26_NOTIFY_KEY = 'wc26_mobile_notify_v1';
let wc26NotificationsArmed = false;
let wc26WakeLock = null;
let wc26NotifySettings = wc26LoadNotifySettings();

function wc26LoadNotifySettings(){
  try{
    return Object.assign({enabled:false, goals:true, matchStart:false, matchEnd:false, sound:'latam', wakeLock:false}, JSON.parse(localStorage.getItem(WC26_NOTIFY_KEY)||'{}'));
  }catch{
    return {enabled:false, goals:true, matchStart:false, matchEnd:false, sound:'latam', wakeLock:false};
  }
}

function wc26SaveNotifySettings(){
  localStorage.setItem(WC26_NOTIFY_KEY, JSON.stringify(wc26NotifySettings));
}

function wc26NotifyEl(id){ return document.getElementById(id); }

function wc26NotificationSupported(){
  return 'Notification' in window && 'serviceWorker' in navigator;
}

async function wc26RequestNotificationPermission(){
  if(!wc26NotificationSupported()){
    alert('Este navegador no soporta notificaciones PWA. Usa Chrome en Android.');
    return false;
  }
  if(Notification.permission === 'granted') return true;
  if(Notification.permission === 'denied'){
    alert('Las notificaciones están bloqueadas. Actívalas desde Ajustes de sitio en Chrome/Android.');
    return false;
  }
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

async function wc26ShowNotification(title, body, tag='wc26-event'){
  if(!wc26NotifySettings.enabled) return;
  if(!wc26NotificationSupported()) return;
  if(Notification.permission !== 'granted') return;
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    body,
    tag,
    renotify:true,
    icon:'icons/icon-192.png',
    badge:'icons/icon-96.png',
    vibrate:[250,120,250,120,350],
    data:{url:'./index.html'}
  });
}

function wc26IsFavoriteMatch(match){
  return !!state.favoriteTeam && (key(match.team1)===key(state.favoriteTeam) || key(match.team2)===key(state.favoriteTeam));
}

function wc26ShouldNotifyMatch(match){
  if(state.favoriteAlerts && !wc26IsFavoriteMatch(match)) return false;
  return true;
}

function wc26NumberScore(value){
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function wc26GoalDiff(prev, current){
  const p1 = wc26NumberScore(scoreShown(prev.score_team1));
  const p2 = wc26NumberScore(scoreShown(prev.score_team2));
  const c1 = wc26NumberScore(scoreShown(current.score_team1));
  const c2 = wc26NumberScore(scoreShown(current.score_team2));
  if(p1 === null || p2 === null || c1 === null || c2 === null) return {changed:false};
  const d1 = c1 - p1;
  const d2 = c2 - p2;
  if(d1 <= 0 && d2 <= 0) return {changed:false};
  const scoringTeam = d1 > 0 ? clean(current.team1) : clean(current.team2);
  return {changed:true, scoringTeam, score:`${c1}-${c2}`};
}

function wc26GoalPhrase(match, goal){
  const score = goal?.score ? ` Marcador ${goal.score}.` : '';
  const team = goal?.scoringTeam ? ` de ${goal.scoringTeam}` : '';
  const phrases = {
    latam:`¡Gooooool${team}! ¡Lo grita todo el estadio!${score}`,
    estadio:`¡Gol, gol, gol${team}! ¡Explota la cancha!${score}`,
    radial:`¡Atención, atención! ¡Se mueve el marcador! ¡Gol${team}!${score}`,
    neutro:`Gol${team}.${score}`
  };
  return phrases[wc26NotifySettings.sound] || phrases.latam;
}

function wc26Speak(text){
  try{
    if(!('speechSynthesis' in window)) return wc26Beep();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CL';
    utterance.rate = wc26NotifySettings.sound === 'latam' ? 1.08 : 1;
    utterance.pitch = wc26NotifySettings.sound === 'estadio' ? 1.15 : 1;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const spanish = voices.find(v => /es[-_]/i.test(v.lang)) || voices.find(v => /spanish|español/i.test(v.name));
    if(spanish) utterance.voice = spanish;
    window.speechSynthesis.speak(utterance);
  }catch{
    wc26Beep();
  }
}

function wc26Beep(){
  try{
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.6);
  }catch{}
}

function wc26NotifyGoal(match, goal){
  const phrase = wc26GoalPhrase(match, goal);
  wc26ShowNotification('¡GOL!', `${clean(match.team1)} ${scoreShown(match.score_team1)}-${scoreShown(match.score_team2)} ${clean(match.team2)}`, `goal-${match.match_id}`);
  wc26Speak(phrase);
}

const wc26OriginalDetectEvents = detectEvents;
detectEvents = function(before, after){
  const previous = Object.fromEntries(before.map(m => [String(m.match_id), m]));
  wc26OriginalDetectEvents(before, after);

  if(!wc26NotificationsArmed){
    wc26NotificationsArmed = true;
    return;
  }
  if(!wc26NotifySettings.enabled) return;

  after.forEach(match => {
    if(!isRealMatch(match) || !wc26ShouldNotifyMatch(match)) return;
    const prev = previous[String(match.match_id)];
    if(!prev) return;
    const st = normalizeStatus(null, match);
    const pst = normalizeStatus(null, prev);

    if(wc26NotifySettings.matchStart && st === 'live' && pst !== 'live'){
      wc26ShowNotification('Partido en vivo', `${clean(match.team1)} vs ${clean(match.team2)}`, `start-${match.match_id}`);
    }
    if(wc26NotifySettings.matchEnd && st === 'final' && pst !== 'final'){
      wc26ShowNotification('Partido finalizado', `${clean(match.team1)} ${scoreShown(match.score_team1)}-${scoreShown(match.score_team2)} ${clean(match.team2)}`, `final-${match.match_id}`);
    }
    if(wc26NotifySettings.goals && (st === 'live' || st === 'final')){
      const goal = wc26GoalDiff(prev, match);
      if(goal.changed) wc26NotifyGoal(match, goal);
    }
  });
};

async function wc26RequestWakeLock(){
  if(!('wakeLock' in navigator)) return false;
  try{
    wc26WakeLock = await navigator.wakeLock.request('screen');
    wc26WakeLock.addEventListener('release', () => { wc26WakeLock = null; });
    return true;
  }catch{
    return false;
  }
}

async function wc26ApplyWakeLock(){
  if(wc26NotifySettings.wakeLock && document.visibilityState === 'visible'){
    await wc26RequestWakeLock();
  }else if(wc26WakeLock){
    try{ await wc26WakeLock.release(); }catch{}
    wc26WakeLock = null;
  }
}

document.addEventListener('visibilitychange', () => {
  wc26ApplyWakeLock();
  if(document.visibilityState === 'visible') refreshScores();
});

function wc26WireNotificationControls(){
  const notificationsCheck = wc26NotifyEl('notificationsCheck');
  const notifyGoalsCheck = wc26NotifyEl('notifyGoalsCheck');
  const notifyStartCheck = wc26NotifyEl('notifyStartCheck');
  const notifyEndCheck = wc26NotifyEl('notifyEndCheck');
  const goalSoundSelect = wc26NotifyEl('goalSoundSelect');
  const testNotificationBtn = wc26NotifyEl('testNotificationBtn');
  const testGoalSoundBtn = wc26NotifyEl('testGoalSoundBtn');
  const keepAwakeCheck = wc26NotifyEl('keepAwakeCheck');
  const notificationSupportText = wc26NotifyEl('notificationSupportText');

  if(!notificationsCheck) return;

  notificationsCheck.checked = !!wc26NotifySettings.enabled;
  notifyGoalsCheck.checked = !!wc26NotifySettings.goals;
  notifyStartCheck.checked = !!wc26NotifySettings.matchStart;
  notifyEndCheck.checked = !!wc26NotifySettings.matchEnd;
  goalSoundSelect.value = wc26NotifySettings.sound || 'latam';
  keepAwakeCheck.checked = !!wc26NotifySettings.wakeLock;

  if(notificationSupportText){
    notificationSupportText.textContent = wc26NotificationSupported()
      ? 'Android puede mostrar notificaciones mientras la PWA esté abierta o viva en segundo plano. Para alertas con la app cerrada se necesita backend push.'
      : 'Este navegador no soporta notificaciones PWA completas.';
  }

  notificationsCheck.addEventListener('change', async e => {
    if(e.target.checked){
      const ok = await wc26RequestNotificationPermission();
      wc26NotifySettings.enabled = ok;
      notificationsCheck.checked = ok;
    }else{
      wc26NotifySettings.enabled = false;
    }
    wc26SaveNotifySettings();
  });
  notifyGoalsCheck.addEventListener('change', e => { wc26NotifySettings.goals = e.target.checked; wc26SaveNotifySettings(); });
  notifyStartCheck.addEventListener('change', e => { wc26NotifySettings.matchStart = e.target.checked; wc26SaveNotifySettings(); });
  notifyEndCheck.addEventListener('change', e => { wc26NotifySettings.matchEnd = e.target.checked; wc26SaveNotifySettings(); });
  goalSoundSelect.addEventListener('change', e => { wc26NotifySettings.sound = e.target.value; wc26SaveNotifySettings(); });
  keepAwakeCheck.addEventListener('change', async e => { wc26NotifySettings.wakeLock = e.target.checked; wc26SaveNotifySettings(); await wc26ApplyWakeLock(); });

  testNotificationBtn.addEventListener('click', async () => {
    const ok = await wc26RequestNotificationPermission();
    if(!ok) return;
    wc26NotifySettings.enabled = true;
    notificationsCheck.checked = true;
    wc26SaveNotifySettings();
    await wc26ShowNotification('Prueba WorldCup 2026', 'Las notificaciones emergentes están funcionando.', 'test-wc26');
  });

  testGoalSoundBtn.addEventListener('click', () => {
    wc26Speak(wc26GoalPhrase({team1:'Argentina', team2:'Brasil', score_team1:'1', score_team2:'0'}, {scoringTeam:'Argentina', score:'1-0'}));
  });

  wc26ApplyWakeLock();
}

window.addEventListener('DOMContentLoaded', () => setTimeout(wc26WireNotificationControls, 0));
