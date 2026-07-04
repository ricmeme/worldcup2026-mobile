/* Robustez API móvil: no botar todo el refresh si una fecha ESPN falla. */
(function(){
  function d2(n){ return String(n).padStart(2,'0'); }
  function ymdDash(date){ return date.getFullYear() + '-' + d2(date.getMonth()+1) + '-' + d2(date.getDate()); }
  function ymd(date){ return '' + date.getFullYear() + d2(date.getMonth()+1) + d2(date.getDate()); }
  function range(startDash, endDash){
    var out = [];
    var start = new Date(startDash + 'T12:00:00-04:00');
    var end = new Date(endDash + 'T12:00:00-04:00');
    for(var d = new Date(start); d <= end; d.setDate(d.getDate()+1)) out.push(ymd(d));
    return out;
  }
  if (typeof wc26ApiStats === 'undefined') window.wc26ApiStats = {range:'-',events:0,matched:0,okDates:0,failedDates:0,failedSample:''};
  fetchEspnWindow = async function(){
    var today = new Date();
    var todayDash = ymdDash(today);
    var tournamentStart = '2026-06-11';
    var tournamentEnd = '2026-07-19';
    var fromDash, toDash;
    if(!window.wc26HistoricalHydrated && todayDash >= tournamentStart){
      fromDash = tournamentStart;
      var plus8 = ymdDash(addDays(today,8));
      toDash = plus8 > tournamentEnd ? tournamentEnd : plus8;
    }else{
      fromDash = ymdDash(addDays(today,-2));
      var plus8b = ymdDash(addDays(today,8));
      toDash = plus8b > tournamentEnd ? tournamentEnd : plus8b;
    }
    var dates = range(fromDash,toDash);
    var events = [];
    var okDates = 0;
    var failedDates = 0;
    var failed = [];
    for (var i=0; i<dates.length; i++){
      var d = dates[i];
      try{
        var url = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=' + d;
        var res = await fetch(url, {cache:'no-store'});
        if(!res.ok) throw new Error('HTTP ' + res.status);
        var data = await res.json();
        okDates += 1;
        (data.events || []).forEach(function(ev){ events.push(ev); });
      }catch(err){
        failedDates += 1;
        if(failed.length < 3) failed.push(d + ':' + (err && err.message ? err.message : 'error'));
      }
    }
    window.wc26HistoricalHydrated = true;
    wc26ApiStats.range = fromDash + ' → ' + toDash;
    wc26ApiStats.events = events.length;
    wc26ApiStats.okDates = okDates;
    wc26ApiStats.failedDates = failedDates;
    wc26ApiStats.failedSample = failed.join(', ');
    if(events.length === 0 && okDates === 0) throw new Error('ESPN sin fechas OK; fallidas=' + failedDates + '; ' + wc26ApiStats.failedSample);
    return events.map(normalizeEspnEvent).filter(Boolean);
  };
})();
