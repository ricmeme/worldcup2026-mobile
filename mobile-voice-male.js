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

function wc26SaveMaleVoiceSettings(settings){
  localStorage.setItem(WC26_MALE_VOICE_KEY, JSON.stringify(settings));
}

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
  const preferredLocale = {
    auto: null,
    latam: /es[-_](419|MX|US|CO|AR|CL|PE|UY)/i,
    chile: /es[-_]CL/i,
    mexico: /es[-_]MX/i,
    espana: /es[-_]ES/i
  }[profile] || null;

  const byLocale = preferredLocale ? pool.filter(v => preferredLocale.test(`${v.lang} ${v.name}`)) : pool;
  const candidates = byLocale.length ? byLocale : pool;
  return candidates.find(v => maleWords.test(`${v.name} ${v.lang}`)) || candidates[0] || null;
}

wc26GoalPhrase = function(match, goal){
  return wc26SportsPhrase(match, goal);
};

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
  }catch{
    wc26Beep();
  }
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
  select.addEventListener('change', e => {
    wc26SaveMaleVoiceSettings({voiceProfile:e.target.value});
    updateHint();
  });
  if('speechSynthesis' in window){
    window.speechSynthesis.onvoiceschanged = updateHint;
  }
  setTimeout(updateHint, 400);
}

window.addEventListener('DOMContentLoaded', () => setTimeout(wc26WireMaleVoiceControls, 50));
