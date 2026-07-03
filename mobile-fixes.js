/* Patches móviles: banderas robustas y filtro real de rondas en bracket. */
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
