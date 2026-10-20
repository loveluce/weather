/* GYEOP GitHub Pages edition: weather reads public API; photos never leave the device. */
(() => {
  'use strict';
  const L = window.GyeopLogic;
  const $ = (id) => document.getElementById(id);
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const readJSON = (key, fallback) => { try {const result=JSON.parse(localStorage.getItem(key));return result ?? fallback;}catch{return fallback;} };
  const putJSON = (key,value) => {try{localStorage.setItem(key,JSON.stringify(value));}catch{ /* private browsing may restrict persistent storage */ }};
  const CITIES = [
    {name:'서울',country:'대한민국',latitude:37.5665,longitude:126.9780},
    {name:'도쿄',country:'일본',latitude:35.6895,longitude:139.6917},
    {name:'오사카',country:'일본',latitude:34.6937,longitude:135.5023},
    {name:'후쿠오카',country:'일본',latitude:33.5904,longitude:130.4017},
    {name:'삿포로',country:'일본',latitude:43.0618,longitude:141.3545},
    {name:'교토',country:'일본',latitude:35.0116,longitude:135.7681},
    {name:'타이베이',country:'대만',latitude:25.0330,longitude:121.5654},
    {name:'방콕',country:'태국',latitude:13.7563,longitude:100.5018},
    {name:'싱가포르',country:'싱가포르',latitude:1.3521,longitude:103.8198},
    {name:'하노이',country:'베트남',latitude:21.0285,longitude:105.8542},
    {name:'런던',country:'영국',latitude:51.5074,longitude:-0.1278},
    {name:'파리',country:'프랑스',latitude:48.8566,longitude:2.3522},
    {name:'뉴욕',country:'미국',latitude:40.7128,longitude:-74.006},
    {name:'시드니',country:'호주',latitude:-33.8688,longitude:151.2093}
  ];
  const validCity = (c) => c && Number.isFinite(+c.latitude) && Number.isFinite(+c.longitude) && typeof c.name === 'string' && typeof c.country === 'string';
  const defaults = {city:CITIES[0],tripCity:CITIES[1],sensitivity:'normal',activity:'normal',outer:'auto',defaultTab:'today'};
  const persisted = readJSON('gyeop_user_v1',{});
  const state = {
    ...defaults,
    city: validCity(persisted.city) ? persisted.city : defaults.city,
    tripCity: validCity(persisted.tripCity) ? persisted.tripCity : defaults.tripCity,
    sensitivity:['cold','normal','hot'].includes(persisted.sensitivity)?persisted.sensitivity:'normal',
    activity:['indoor','normal','walk'].includes(persisted.activity)?persisted.activity:'normal',
    outer:['auto','puffer','coat','light','none'].includes(persisted.outer)?persisted.outer:'auto',
    defaultTab:['today','journal'].includes(persisted.defaultTab)?persisted.defaultTab:'today',
    weather:null,tripForecast:null,searchTarget:'today',weatherRequest:0,photoBlob:null,photoUrl:null,
    journalUrls:[],activeTab:'today',lastTrip:readJSON('gyeop_last_trip',null),toastTimer:null
  };
  function savePreferences(){putJSON('gyeop_user_v1',{city:state.city,tripCity:state.tripCity,sensitivity:state.sensitivity,activity:state.activity,outer:state.outer,defaultTab:state.defaultTab});}
  function toast(message){const el=$('toast');el.textContent=message;el.hidden=false;clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>{el.hidden=true;},3400);}
  function showTab(name){
    if(!['today','trip','journal','settings'].includes(name))return;
    state.activeTab=name;
    for(const el of document.querySelectorAll('.tab-panel')){const isActive=el.id===`${name}Tab`;el.hidden=!isActive;el.classList.toggle('active',isActive);}
    for(const el of document.querySelectorAll('[data-tab]')){const active=el.dataset.tab===name;el.classList.toggle('active',active);el.setAttribute('aria-current',active?'page':'false');}
    if(name==='journal')renderJournalList();
    if(name==='trip' && state.lastTrip){
      const t=state.lastTrip;
      if(validCity(t.city)){state.tripCity=t.city;$('tripCityName').textContent=`${t.city.name}, ${t.city.country}`;}
      if(typeof t.start==='string')$('tripStart').value=t.start;
      if(typeof t.end==='string')$('tripEnd').value=t.end;
      renderTripFromSaved();
    }
    window.scrollTo({top:0,behavior:'instant'});
  }
  function setSegments(controlId, key, value){
    state[key]=value;savePreferences();
    for(const b of $(controlId).querySelectorAll('button')){const selected=b.dataset.value===value;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected?'true':'false');}
    if(['sensitivity','activity'].includes(key))renderRecommendation();
  }
  function setCity(city,target){
    if(!validCity(city))return;
    if(target==='trip'){
      state.tripCity=city;$('tripCityName').textContent=`${city.name}, ${city.country}`;
      state.tripForecast=null;
      $('tripResults').innerHTML='<div class="empty-card">도시를 변경했어요. 여행 날짜를 선택하고 짐 목록을 만들어주세요.</div>';
    }else{
      state.city=city;$('cityName').textContent=`${city.name}, ${city.country}`;
      loadToday();
    }
    savePreferences();closeDialog($('cityDialog'));
  }
  const dialogOpen = (dialog) => { if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open',''); };
  const closeDialog = (dialog) => { if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open'); };
  function openCity(target){
    state.searchTarget=target;$('citySearch').value='';renderCityOptions(CITIES);dialogOpen($('cityDialog'));
    setTimeout(()=>$('citySearch').focus(),70);
  }
  function renderCityOptions(cities,otherText){
    $('cityResults').innerHTML = cities.length ? cities.map((c,i)=>`<button type="button" class="city-option" data-city-index="${i}"><span><strong>${safe(c.name)}</strong><small>${safe(c.admin1?c.admin1+' · ':'')}${safe(c.country)}</small></span><span>→</span></button>`).join('') : `<p class="no-results">${safe(otherText||'검색 결과가 없어요. 다른 도시 이름으로 검색해 주세요.')}</p>`;
    $('cityResults').querySelectorAll('[data-city-index]').forEach((b)=>b.addEventListener('click',()=>setCity(cities[+b.dataset.cityIndex],state.searchTarget)));
  }
  function fetchJson(url,timeoutMs=14500){
    const controller = new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    return fetch(url,{method:'GET',headers:{'Accept':'application/json'},signal:controller.signal,credentials:'omit'})
      .then(async (res)=>{if(!res.ok){if(res.status===429)throw new Error('날씨 제공처의 요청이 몰렸어요. 잠시 후 다시 시도해 주세요.');throw new Error(`요청 실패 (${res.status})`);}return res.json();})
      .finally(()=>clearTimeout(timer));
  }
  function searchCities(query){
    const lower=query.trim().toLocaleLowerCase();
    const local=CITIES.filter((c)=>`${c.name} ${c.country}`.toLowerCase().includes(lower));
    const url=`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=12&language=ko&format=json`;
    return fetchJson(url).then((data)=>{
      const fromApi=(data.results||[]).map((r)=>({name:r.name,country:r.country||r.country_code||'',admin1:r.admin1||'',latitude:r.latitude,longitude:r.longitude})).filter(validCity);
      const all=[...local,...fromApi];
      return all.filter((c,i)=>all.findIndex((x)=>Math.abs(x.latitude-c.latitude)<.005&&Math.abs(x.longitude-c.longitude)<.005)===i);
    }).catch(()=>local);
  }
  let searchSerial=0,searchTimer=null;
  $('citySearch').addEventListener('input',(event)=>{
    const q=event.target.value.trim();const serial=++searchSerial;clearTimeout(searchTimer);
    if(!q){renderCityOptions(CITIES);return;}
    if(q.length<2){renderCityOptions(CITIES.filter(x=>x.name.includes(q)), '도시 이름을 2자 이상 입력해 주세요.');return;}
    $('cityResults').innerHTML='<p class="no-results">도시를 검색하고 있어요…</p>';
    searchTimer=setTimeout(async()=>{const matches=await searchCities(q);if(serial!==searchSerial)return;renderCityOptions(matches);},340);
  });
  function cityKey(c){return `gyeop_forecast_${(+c.latitude).toFixed(3)}_${(+c.longitude).toFixed(3)}`;}
  async function getForecast(city){
    const key=cityKey(city);const cached=readJSON(key,null);
    if(cached && Date.now()-cached.at<15*60*1000 && cached.data?.current?.temperature_2m!=null)return {...cached,fromCache:true,stale:false};
    const url=new URL('https://api.open-meteo.com/v1/forecast');
    const params={latitude:(+city.latitude).toFixed(4),longitude:(+city.longitude).toFixed(4),
      current:'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
      hourly:'temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m',
      daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',forecast_days:16,timezone:'auto'};
    Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,String(v)));
    try {
      const data=await fetchJson(url.toString(),18000);
      if(!data.current || !Array.isArray(data.daily?.time))throw new Error('날씨 자료가 올바르지 않아요.');
      const result={at:Date.now(),data,fromCache:false,stale:false};putJSON(key,result);return result;
    }catch(err){
      if(cached?.data?.current?.temperature_2m!=null && Date.now()-cached.at<24*3600*1000)return {...cached,fromCache:true,stale:true};
      throw err;
    }
  }
  function nowWeather(data){
    const c=data.current;
    const hourIndex=(data.hourly?.time||[]).indexOf((c.time||'').slice(0,13)+':00');
    return {temp:c.temperature_2m,feels:c.apparent_temperature,humidity:c.relative_humidity_2m,
      wind:c.wind_speed_10m,precip:c.precipitation,pop:data.hourly?.precipitation_probability?.[hourIndex]??0,code:c.weather_code};
  }
  function displayWeatherMessage(message){
    $('weatherTemp').innerHTML='--<small>°</small>';$('weatherLabel').textContent='날씨 확인 필요';$('weatherUpdated').textContent='연결 실패';
    $('weatherFeels').textContent='현재 날씨를 확인하지 못했습니다.';
    $('weatherWind').textContent='바람 —';$('weatherHumidity').textContent='습도 —';$('weatherRain').textContent='강수 —';
    $('weatherError').hidden=false;$('weatherError').firstChild.textContent=message+' ';
    $('recommendationWrap').innerHTML='<div class="loading-card">실제 날씨가 없어 추천을 표시하지 않습니다. 재시도해 주세요.</div>';
    $('hourlyTimeline').innerHTML='<div class="loading-card">현재 사용할 수 있는 시간대별 예보가 없습니다.</div>';
  }
  async function loadToday(){
    const serial=++state.weatherRequest;
    state.weather=null;
    $('weatherError').hidden=true;$('weatherLabel').textContent='날씨를 불러오는 중';
    $('weatherUpdated').textContent='조회 중';
    $('recommendationWrap').innerHTML='<div class="loading-card">소재와 옷 조합을 찾고 있어요…</div>';
    $('cityName').textContent=`${state.city.name}, ${state.city.country}`;
    try {
      const loaded=await getForecast(state.city);if(serial!==state.weatherRequest)return;
      state.weather=loaded;renderWeather();renderRecommendation();renderHourly();
      if(loaded.stale)toast('이전 날씨를 표시 중입니다. 최신 날씨를 불러오지 못했어요.');
    }catch(error){if(serial!==state.weatherRequest)return;displayWeatherMessage(error.message || '네트워크를 확인해 주세요.');}
  }
  function renderWeather(){
    const result=state.weather;
    if(!result)return;
    const w=nowWeather(result.data);
    const {name,symbol}=L.sky(w.code);
    $('weatherLabel').textContent=name;
    $('weatherSymbol').textContent=symbol;
    $('weatherTemp').innerHTML=`${Math.round(w.temp)}<small>°</small>`;
    $('weatherFeels').textContent=`체감 ${Math.round(w.feels)}° · ${state.city.name} 현지 기준`;
    $('weatherWind').textContent=`바람 ${Math.round(w.wind)} km/h`;
    $('weatherHumidity').textContent=`습도 ${Math.round(w.humidity)}%`;
    $('weatherRain').textContent=`강수 확률 ${Math.round(w.pop)}%`;
    const d=new Date(result.at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
    $('weatherUpdated').textContent=result.stale?`마지막 조회 ${d} · 최신 아님`:`${d} 확인`;
    $('weatherError').hidden=true;
  }
  function renderRecommendation(){
    if(!state.weather)return;
    const w=nowWeather(state.weather.data);
    let rec;try{rec=L.recommendation(w,state);}catch{return;}
    const card=`<article class="outfit-card"><span class="recommended-badge">✦ ${safe(state.activity==='walk'?'많이 걷는 날 추천':state.activity==='indoor'?'실내 활동 추천':'오늘의 추천')}</span>
      <h3>${safe(rec.title)}</h3><p class="outfit-description">${safe(rec.description)}</p>
      <div class="layer-stack">${rec.layers.map(x=>`<div class="layer-item"><span class="layer-icon" aria-hidden="true">${safe(x.emoji)}</span><div class="layer-name">${safe(x.name)}</div><small class="layer-sub">${safe(x.material)}</small></div>`).join('')}</div>
      <div class="reason-note"><strong>TIP</strong><span>${safe(rec.tip)}</span></div></article>`;
    const mat=`<aside class="material-card"><h3 class="material-title">오늘의 소재 가이드</h3><p class="material-subtitle">온도뿐 아니라 활동에 어울리는 소재</p>
      ${rec.materials.slice(0,3).map(m=>`<span class="material-tag">${safe(m.name)}</span>`).join('')}
      <ul class="material-list">${rec.materials.slice(0,3).map(m=>`<li><strong>${safe(m.name)}</strong>${safe(m.reason)}</li>`).join('')}</ul></aside>`;
    $('recommendationWrap').innerHTML=card+mat;
  }
  function renderHourly(){
    if(!state.weather)return;
    const data=state.weather.data;const date=(data.current?.time||'').slice(0,10);
    const points=[['오전 9시','09'],['오후 2시','14'],['저녁 7시','19']];
    $('hourlyTimeline').innerHTML=points.map(([name,hour])=>{
      const i=(data.hourly?.time||[]).indexOf(`${date}T${hour}:00`);
      if(i===-1)return `<div class="timeline-card"><div class="timeline-label">${name}</div><p class="timeline-desc">자료 없음</p></div>`;
      const temp=data.hourly.temperature_2m[i];const sym=L.sky(data.hourly.weather_code[i]);
      return `<div class="timeline-card"><div class="timeline-label">${name}</div><div class="timeline-symbol">${sym.symbol}</div><div class="timeline-temp">${Math.round(temp)}°</div><p class="timeline-desc">체감 ${Math.round(data.hourly.apparent_temperature[i])}°</p></div>`;
    }).join('');
  }
  function setDefaultDates(){
    const now=new Date();const start=L.localDateString(now);const end=L.addDays(start,3);
    $('tripStart').value=start;$('tripEnd').value=end;
    $('tripStart').min=start;$('tripEnd').min=start;
  }
  async function renderTripFromSaved(){
    if(!state.lastTrip || state.activeTab!=='trip')return;
    const t=state.lastTrip;
    if(!validCity(t.city)||!t.start||!t.end)return;
    await calculateTrip(t.city,t.start,t.end,false);
  }
  async function createTrip(){
    const start=$('tripStart').value,end=$('tripEnd').value;
    if(!start||!end){toast('여행 날짜를 선택해 주세요.');return;}
    if(end<start){toast('귀국일은 출발일보다 빠를 수 없어요.');return;}
    const today=L.localDateString(new Date());
    if(start<today){toast('과거 날짜 대신 오늘 이후 날짜를 선택해 주세요.');return;}
    await calculateTrip(state.tripCity,start,end,true);
  }
  async function calculateTrip(city,start,end,save){
    let dates;
    try{dates=L.dateRange(start,end);}catch(error){toast(error.message);return;}
    if(!dates.length){toast('여행 날짜를 확인해 주세요.');return;}
    const button=$('createTrip');button.disabled=true;
    $('tripResults').innerHTML='<div class="loading-card">여행 도시의 실제 예보를 확인하고 있어요…</div>';
    try{
      const loaded=await getForecast(city);
      if(state.tripCity.latitude!==city.latitude || state.tripCity.longitude!==city.longitude)return;
      state.tripForecast=loaded;
      if(save){state.lastTrip={city,start,end};putJSON('gyeop_last_trip',state.lastTrip);}
      renderTrip(dates,loaded.data,city,start,end,loaded.stale);
    }catch(error){
      $('tripResults').innerHTML=`<div class="empty-card">날씨를 불러오지 못했어요. ${safe(error.message)}<br />잠시 후 다시 시도해 주세요.</div>`;
    }finally{button.disabled=false;}
  }
  function renderTrip(dates,forecast,city,start,end,stale){
    const days=dates.map(date=>({date,w:L.dayWeather(forecast,date)}));
    const known=days.filter(x=>x.w).map(x=>x.w);
    const lows=known.map(w=>w.low),highs=known.map(w=>w.high);
    const limits=known.length?`${Math.round(Math.min(...lows))}~${Math.round(Math.max(...highs))}°`:'예보 범위 밖';
    const pDays=known.filter(w=>w.pop>=40).length;
    const pack=L.packingList(dates,known);
    const tripKey=`gyeop_packing_${(+city.latitude).toFixed(3)}_${(+city.longitude).toFixed(3)}_${start}_${end}`;
    const checked=readJSON(tripKey,{});
    const result=`<section class="trip-section"><p class="eyebrow">YOUR TRIP OVERVIEW</p><h2>${safe(city.name)} · ${dates.length}일 여행</h2>
      <p class="trip-hint">${safe(start)} ~ ${safe(end)} · ${known.length}일에 대한 실제 예보${stale?' (마지막 조회 자료, 최신 아님)':''}</p>
      <div class="trip-summary"><div class="trip-stat"><strong>${safe(limits)}</strong><span>예상 기온 범위</span></div><div class="trip-stat"><strong>${known.length}/${dates.length}일</strong><span>날씨 확인 완료</span></div><div class="trip-stat"><strong>${pDays}일</strong><span>비 가능성 40% 이상</span></div></div></section>
      <section class="trip-section"><h2>날짜별 옷차림</h2><p class="trip-hint">실제 기온·체감온도·강수확률을 참고합니다. 먼 날짜는 예측하지 않습니다.</p>
      ${days.map(({date,w})=>w?`<div class="day-row"><div class="day-date">${safe(date.slice(5))}<br /><span>${L.sky(w.code).symbol}</span></div><div class="day-rec">${safe(L.recommendation(w,{sensitivity:state.sensitivity,activity:'normal',outer:'auto'}).title)}</div><div class="day-temp">${Math.round(w.low)}° ~ ${Math.round(w.high)}°</div></div>`:`<div class="day-row"><div class="day-date">${safe(date.slice(5))}</div><div class="day-rec missing-forecast">예보 범위 밖 · 출발 전 다시 확인하세요.</div><div class="day-temp">—</div></div>`).join('')}</section>
      <section class="trip-section"><h2>내 여행 짐 체크리스트</h2><p class="trip-hint">기본 수량은 여행일 기준이며, 세탁 여부·개인 습관에 따라 조절하세요. <strong>예보가 없는 날의 방한용품은 예측하지 않았습니다.</strong></p>
      ${pack.map(i=>`<div class="pack-row ${checked[i.id]?'done':''}"><label><input type="checkbox" data-pack-id="${safe(i.id)}" ${checked[i.id]?'checked':''} /><span>${safe(i.name)}</span></label><span class="pack-qty">${i.qty}개</span></div>`).join('')}</section>`;
    $('tripResults').innerHTML=result;
    $('tripResults').querySelectorAll('[data-pack-id]').forEach(el=>el.addEventListener('change',()=>{
      const updated=readJSON(tripKey,{});updated[el.dataset.packId]=el.checked;putJSON(tripKey,updated);
      el.closest('.pack-row').classList.toggle('done',el.checked);
    }));
  }
  function requestLocation(){
    if(!navigator.geolocation){toast('이 브라우저는 위치 기능을 지원하지 않아요.');return;}
    $('locateButton').disabled=true;
    navigator.geolocation.getCurrentPosition(({coords})=>{
      $('locateButton').disabled=false;
      setCity({name:'내 위치',country:'현재 좌표',latitude:+coords.latitude.toFixed(2),longitude:+coords.longitude.toFixed(2)},'today');
    },(error)=>{ $('locateButton').disabled=false;toast(error.code===1?'위치 권한이 허용되지 않았어요. 도시 검색을 이용해 주세요.':'위치를 확인할 수 없어요. 도시 검색을 이용해 주세요.');}, {enableHighAccuracy:false,timeout:11000,maximumAge:20*60*1000});
  }
  function openDB(){
    if(!('indexedDB' in window))return Promise.reject(new Error('이 브라우저에서는 로컬 사진 저장이 지원되지 않습니다.'));
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open('gyeop_local_journal_v1',1);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('entries'))req.result.createObjectStore('entries',{keyPath:'id',autoIncrement:true});};
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('기기 저장소를 사용할 수 없습니다.'));
      req.onblocked=()=>reject(new Error('저장소가 다른 탭에서 사용 중입니다.'));
    });
  }
  async function transact(mode,fn){
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      let finished=false, result;
      const tx=db.transaction('entries',mode);const store=tx.objectStore('entries');
      try { const req=fn(store);req.onsuccess=()=>{result=req.result;};req.onerror=()=>{ /* transaction error handles this */}; }
      catch(err){finished=true;db.close();reject(err);return;}
      tx.oncomplete=()=>{if(finished)return;finished=true;db.close();resolve(result);};
      tx.onerror=()=>{if(finished)return;finished=true;db.close();reject(tx.error||new Error('기기 저장소 오류'));};
      tx.onabort=()=>{if(finished)return;finished=true;db.close();reject(tx.error||new Error('저장하지 못했습니다.'));};
    });
  }
  const entriesAll=()=>transact('readonly',s=>s.getAll());
  const addEntry=(entry)=>transact('readwrite',s=>s.add(entry));
  const deleteEntry=(id)=>transact('readwrite',s=>s.delete(id));
  const clearEntries=()=>transact('readwrite',s=>s.clear());
  function cleanPhoto(){state.photoBlob=null;if(state.photoUrl){URL.revokeObjectURL(state.photoUrl);state.photoUrl=null;} $('photoPreview').removeAttribute('src');$('photoPreview').hidden=true;$('photoPlaceholder').hidden=false;}
  function openJournal(){
    cleanPhoto();$('journalForm').reset();$('journalNote').value='';$('photoInput').value='';
    dialogOpen($('journalDialog'));
  }
  function compressPhoto(file){
    return new Promise((resolve,reject)=>{
      if(!file.type.startsWith('image/')){reject(new Error('이미지 파일만 선택할 수 있어요.'));return;}
      if(file.size>25*1024*1024){reject(new Error('25MB 이하 사진을 선택해 주세요.'));return;}
      const objectUrl=URL.createObjectURL(file);const img=new Image();
      img.onload=()=>{
        try{
          const max=1150,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
          const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
          const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('사진을 변환할 수 없어요.');
          ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
          canvas.toBlob((blob)=>{
            URL.revokeObjectURL(objectUrl);
            if(!blob)return reject(new Error('사진을 저장할 형식으로 만들지 못했어요.'));
            if(blob.size>3*1024*1024)return reject(new Error('압축한 사진도 너무 큽니다. 다른 사진을 골라주세요.'));
            resolve(blob);},'image/jpeg',.76);
        }catch(err){URL.revokeObjectURL(objectUrl);reject(err);}
      };
      img.onerror=()=>{URL.revokeObjectURL(objectUrl);reject(new Error('사진을 읽을 수 없어요. 다른 사진을 선택해 주세요.'));};
      img.src=objectUrl;
    });
  }
  async function onPhotoSelected(event){
    const file=event.target.files?.[0];if(!file)return;
    $('photoPlaceholder').hidden=false;$('photoPlaceholder').innerHTML='<span class="photo-plus">…</span><strong>사진을 준비하고 있어요</strong><small>촬영 정보 제거 중</small>';
    try{
      state.photoBlob=await compressPhoto(file);
      if(state.photoUrl)URL.revokeObjectURL(state.photoUrl);
      state.photoUrl=URL.createObjectURL(state.photoBlob);
      $('photoPreview').src=state.photoUrl;$('photoPreview').hidden=false;$('photoPlaceholder').hidden=true;
    }catch(error){cleanPhoto();$('photoPlaceholder').innerHTML='<span class="photo-plus">＋</span><strong>착장 사진 추가</strong><small>사진은 기기에만 비공개 저장돼요</small>';toast(error.message);}
  }
  async function onJournalSave(event){
    event.preventDefault();
    const feeling=$('journalForm').querySelector('input[name="feeling"]:checked')?.value;
    if(!state.photoBlob){toast('먼저 옷차림 사진을 찍거나 선택해 주세요.');return;}
    if(!feeling){toast('추웠는지, 적당했는지, 더웠는지 선택해 주세요.');return;}
    const button=$('journalSubmit');button.disabled=true;
    try{
      const conditions=state.weather?.data ? nowWeather(state.weather.data) : null;
      await addEntry({createdAt:new Date().toISOString(),city:state.city.name,country:state.city.country,feeling,note:$('journalNote').value.trim().slice(0,180),weather:conditions,photo:state.photoBlob});
      closeDialog($('journalDialog'));cleanPhoto();$('photoInput').value='';toast('이 기기에 비공개로 저장했어요.');showTab('journal');
    }catch(error){toast(`저장하지 못했어요: ${error.message||'브라우저 저장소를 확인해 주세요.'}`);}
    finally{button.disabled=false;}
  }
  async function renderJournalList(){
    for(const url of state.journalUrls)URL.revokeObjectURL(url);state.journalUrls=[];
    try{
      const all=(await entriesAll()).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
      if(!all.length){$('journalList').innerHTML='<div class="empty-card">아직 기록이 없어요. 오늘의 옷차림 사진을 남겨보세요.</div>';return;}
      const labels={cold:'🥶 추웠어요',good:'😊 딱 좋았어요',hot:'🥵 더웠어요'};
      $('journalList').innerHTML=all.map(x=>{
        const img=x.photo instanceof Blob?URL.createObjectURL(x.photo):'';
        if(img)state.journalUrls.push(img);
        const date=new Date(x.createdAt).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});
        return `<article class="journal-item">${img?`<img class="journal-thumb" src="${img}" alt="비공개 옷차림 기록 사진" />`:'<div class="journal-thumb"></div>'}
          <div class="journal-body"><div class="journal-date">${safe(date)} · ${safe(x.city)}</div>
          <div class="journal-feeling">${safe(labels[x.feeling]||'옷차림 기록')}</div>
          <p class="journal-note">${safe(x.note||'메모 없음')}</p>
          <div class="journal-meta">${x.weather?.feels!=null?`체감 ${Math.round(x.weather.feels)}° · `:''}나만 보기</div></div>
          <button class="journal-delete" type="button" aria-label="기록 삭제" data-delete-id="${Number(x.id)}">삭제</button></article>`;
      }).join('');
      $('journalList').querySelectorAll('[data-delete-id]').forEach(button=>button.addEventListener('click',async()=>{
        if(!confirm('이 기록과 사진을 기기에서 삭제할까요?'))return;
        try{await deleteEntry(Number(button.dataset.deleteId));toast('삭제했어요.');renderJournalList();}catch(e){toast('삭제하지 못했어요.');}
      }));
    }catch(error){$('journalList').innerHTML=`<div class="empty-card">이 브라우저에서는 사진 저장소를 열 수 없어요. ${safe(error.message)}</div>`;}
  }
  async function exportJournal(){
    try{
      const all=await entriesAll();
      const plain=all.map(({id,createdAt,city,country,feeling,note,weather})=>({id,createdAt,city,country,feeling,note,weather}));
      const blob=new Blob([JSON.stringify({app:'GYEOP',exportedAt:new Date().toISOString(),notice:'사진은 포함되지 않습니다.',entries:plain},null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`gyeop-records-${L.localDateString(new Date())}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
      toast('기록 파일을 만들었어요. (사진은 제외)');
    }catch(error){toast('기록 내보내기를 할 수 없어요.');}
  }
  async function clearJournal(){
    if(!confirm('기기에 저장된 모든 기록과 사진을 삭제할까요? 되돌릴 수 없습니다.'))return;
    try{await clearEntries();toast('저장된 기록을 모두 삭제했어요.');renderJournalList();}
    catch(error){toast('기록을 삭제하지 못했어요.');}
  }
  function init(){
    $('cityName').textContent=`${state.city.name}, ${state.city.country}`;
    $('tripCityName').textContent=`${state.tripCity.name}, ${state.tripCity.country}`;
    setDefaultDates();
    setSegments('sensitivityControl','sensitivity',state.sensitivity);
    setSegments('activityControl','activity',state.activity);
    setSegments('defaultTabControl','defaultTab',state.defaultTab);
    $('outerSelect').value=state.outer;
    $('brandButton').addEventListener('click',()=>showTab('today'));
    $('settingsShortcut').addEventListener('click',()=>showTab('settings'));
    $('tripCta').addEventListener('click',()=>showTab('trip'));
    document.querySelectorAll('.nav-button').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
    $('cityButton').addEventListener('click',()=>openCity('today'));
    $('tripCityButton').addEventListener('click',()=>openCity('trip'));
    $('closeCity').addEventListener('click',()=>closeDialog($('cityDialog')));
    $('closeJournal').addEventListener('click',()=>{closeDialog($('journalDialog'));cleanPhoto();});
    $('locateButton').addEventListener('click',requestLocation);
    $('retryWeather').addEventListener('click',loadToday);
    $('createTrip').addEventListener('click',createTrip);
    $('newJournal').addEventListener('click',openJournal);
    $('photoInput').addEventListener('change',onPhotoSelected);
    $('journalForm').addEventListener('submit',onJournalSave);
    $('exportJournal').addEventListener('click',exportJournal);
    $('exportSettings').addEventListener('click',exportJournal);
    $('clearJournal').addEventListener('click',clearJournal);
    $('outerSelect').addEventListener('change',e=>{state.outer=e.target.value;savePreferences();renderRecommendation();});
    for(const [id,key] of [['sensitivityControl','sensitivity'],['activityControl','activity'],['defaultTabControl','defaultTab']]){
      $(id).querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>setSegments(id,key,b.dataset.value)));
    }
    for(const d of [$('cityDialog'),$('journalDialog')]){
      d.addEventListener('click',(e)=>{if(e.target===d)closeDialog(d);});
      d.addEventListener('close',()=>{if(d===$('journalDialog'))cleanPhoto();});
    }
    loadToday();showTab(state.defaultTab);
    if('serviceWorker' in navigator && location.protocol==='https:'){
      window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
    }
  }
  init();
})();
