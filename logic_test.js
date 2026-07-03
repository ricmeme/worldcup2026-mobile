
const logic = require('./app.js');
function assert(c,m){ if(!c){ throw new Error(m); } }
const future = {date:'2026-07-03', time_CLT:'21:30', team1:'Colombia', team2:'Ghana', score_team1:'0', score_team2:'0', api_status:'live'};
assert(logic.normalizeStatus('live', future, new Date('2026-07-03T19:00:00-04:00')) !== 'live', 'Futuro no debe marcar live');
const ph = {date:'2026-07-07', time_CLT:'12:00', team1:'Ganador del Partido 86', team2:'Ganador del Partido 88', score_team1:'0', score_team2:'0', api_status:'live'};
assert(logic.normalizeStatus('live', ph, new Date('2026-07-07T12:30:00-04:00')) !== 'live', 'Placeholder no debe marcar live');
const live = {date:'2026-07-03', time_CLT:'14:00', team1:'Australia', team2:'Egipto', score_team1:'1', score_team2:'1', api_status:'live'};
assert(logic.normalizeStatus('live', live, new Date('2026-07-03T15:20:00-04:00')) === 'live', 'Dentro de ventana debe marcar live');
console.log('logic tests OK');
