/* GYEOP weather-to-clothing rules. Private beta: explanatory heuristics, not a clinical or safety guarantee. */
(function (root, factory) {
  const lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib;
  root.GyeopLogic = lib;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const round = n => Math.round(Number(n));
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  function classifyTemperature(effective) {
    if (effective <= -6) return 'deepWinter';
    if (effective <= 2) return 'winter';
    if (effective <= 9) return 'chilly';
    if (effective <= 15) return 'cool';
    if (effective <= 21) return 'mild';
    if (effective <= 27) return 'warm';
    return 'hot';
  }

  const outfits = {
    deepWinter: {
      title: '두꺼운 패딩과 보온 이너',
      description: '바깥 공기가 매우 차가워요. 특히 손과 목, 발의 보온도 챙기는 편이 좋습니다.',
      layers: [['보온 이너','메리노울·발열 내의','🧦'],['니트·플리스','울 혼방·플리스','🧶'],['롱패딩','다운·방풍 겉감','🧥']],
      materials: [['메리노울','땀이 나도 비교적 쾌적하고 보온에 도움을 줍니다.'],['다운·합성 충전재','가벼운 두께 대비 보온을 확보하기 좋습니다.'],['방풍 나일론','바람에 열을 빼앗기지 않도록 돕습니다.']],
      tips: '바깥에 오래 있으면 장갑·머플러도 챙기세요.'
    },
    winter: {
      title: '패딩 안에 가벼운 보온층',
      description: '패딩과 얇은 보온 이너의 조합이 유용해요. 실내에 오래 머무르면 안쪽 두께를 조절하세요.',
      layers: [['긴팔 이너','메리노울·기능성 소재','👕'],['니트·스웨트','울 혼방·플리스','🧶'],['패딩','다운·합성 충전재','🧥']],
      materials: [['얇은 메리노','실내외 이동 때 땀과 체온을 관리하는 데 유용해요.'],['플리스','가볍고 세탁·건조가 비교적 편리합니다.'],['다운','패딩 자체의 충전량에 따라 따뜻함이 달라집니다.']],
      tips: '두꺼운 패딩을 입어도 밖에서 움직임이 적다면 반팔 한 장만으로는 추울 수 있어요.'
    },
    chilly: {
      title: '니트에 외투 한 겹',
      description: '아침과 저녁에는 제법 차가워요. 벗을 수 있는 겉옷을 준비해 주세요.',
      layers: [['긴팔 티셔츠','면 혼방·메리노','👕'],['가벼운 니트','울·코튼 니트','🧶'],['코트·경량 패딩','울·합성 충전재','🧥']],
      materials: [['울 혼방','봄·가을의 낮은 체감온도에 적합합니다.'],['코튼 니트','실내에서 활동하기 편한 중간층이에요.'],['경량 충전재','필요하면 쉽게 벗고 들고 다니기 좋습니다.']],
      tips: '두꺼운 패딩을 선택한다면 안쪽을 얇게 입고 쉽게 벗을 수 있게 해요.'
    },
    cool: {
      title: '가벼운 재킷이나 가디건',
      description: '긴팔에 가벼운 겉옷이면 대부분의 이동을 무난하게 시작할 수 있어요.',
      layers: [['긴팔 상의','면·텐셀 혼방','👕'],['가디건','면·얇은 울','🧶'],['얇은 재킷','코튼·나일론','🧥']],
      materials: [['면','일상용으로 편안하고 피부에 닿는 촉감이 자연스러워요.'],['얇은 울','실내외 온도 차이에 대비하기 좋습니다.'],['나일론','가벼운 바람을 막는 외투에 자주 쓰여요.']],
      tips: '햇빛 아래와 그늘의 차이가 있으니 겉옷을 쉽게 벗을 수 있게 해요.'
    },
    mild: {
      title: '긴팔 한 장과 선택형 겉옷',
      description: '활동하기 편한 날씨예요. 저녁 일정이 있다면 얇은 겉옷을 더하세요.',
      layers: [['얇은 긴팔','면·텐셀·리오셀','👕'],['가벼운 셔츠','코튼·린넨 혼방','👔'],['얇은 아우터','필요할 때만','🧥']],
      materials: [['면','가벼운 활동에 편안해요.'],['텐셀·리오셀','부드러운 촉감과 유연한 드레이프가 특징입니다.'],['린넨 혼방','통기성이 필요한 환경에서 활용하기 좋아요.']],
      tips: '해가 지거나 강바람이 불면 체감이 달라질 수 있습니다.'
    },
    warm: {
      title: '통기성 좋은 가벼운 옷',
      description: '두꺼운 옷은 덥게 느껴질 수 있어요. 얇고 바람이 통하는 옷을 추천해요.',
      layers: [['반팔 상의','면·린넨 혼방','👕'],['편한 하의','면·얇은 폴리','👖'],['얇은 셔츠','냉방 대비용','👔']],
      materials: [['면','일상에서 무난하지만 땀이 많이 나면 젖은 상태가 오래갈 수 있어요.'],['린넨','통기성이 높아 더운 날씨에 활용하기 좋습니다.'],['흡습속건 원단','많이 걷거나 땀이 많을 때 유용해요.']],
      tips: '강한 냉방 공간에는 얇은 긴팔 셔츠를 챙기세요.'
    },
    hot: {
      title: '시원하고 빨리 마르는 소재',
      description: '과열을 피하고 땀을 말리는 게 중요해요. 몸에 붙지 않는 가벼운 옷이 좋아요.',
      layers: [['여유로운 반팔','린넨·속건 소재','👕'],['얇은 하의','린넨·경량 원단','🩳'],['햇빛 차단','모자·얇은 셔츠','🧢']],
      materials: [['린넨','통기성이 좋고 덥고 습한 날에 유용합니다.'],['흡습속건 폴리에스터','땀을 빠르게 이동·건조시키는 제품이 있습니다.'],['얇은 면','편안하지만 장시간 땀에 젖어 있지 않게 관리하세요.']],
      tips: '수분 섭취와 직사광선 회피도 중요합니다.'
    }
  };

  function recommendation(weather, prefs = {}) {
    const feels = Number.isFinite(+weather.feels) ? +weather.feels : +weather.temp;
    if (!Number.isFinite(feels)) throw new Error('체감온도를 알 수 없습니다.');
    const sensitivity = prefs.sensitivity || 'normal';
    const activity = prefs.activity || 'normal';
    const outer = prefs.outer || 'auto';
    const personal = sensitivity === 'cold' ? -3 : sensitivity === 'hot' ? 3 : 0;
    const mobility = activity === 'walk' ? 2 : activity === 'indoor' ? 3 : 0;
    const effective = feels + personal + mobility;
    const band = classifyTemperature(effective);
    const base = outfits[band];
    const layers = base.layers.map(([name, material, emoji]) => ({name,material,emoji}));
    const notes = [base.tips];
    let title = base.title;
    let description = base.description;
    if (outer === 'puffer') {
      layers[2] = {name:'선택한 패딩',material:'충전량·방풍 성능 확인',emoji:'🧥'};
      if (effective >= 8) {
        layers[0] = {name:'얇은 반팔',material:'면·속건 소재',emoji:'👕'};
        layers[1] = {name:'추가 보온층 생략',material:'실내에서는 패딩 벗기',emoji:'✦'};
        title = '패딩 안은 가볍게';
        description = '패딩을 입기로 했다면 안쪽을 얇게 조절하세요. 다만 이 날씨에는 패딩 자체가 더울 수 있어요.';
        notes.unshift('실내 중심일 때 반팔도 가능하지만 야외에 오래 머무는 일정이라면 긴팔을 준비하세요.');
      } else if (effective > 2) {
        layers[0] = {name:'긴팔 또는 얇은 반팔',material:'개인 체감에 맞게',emoji:'👕'};
        layers[1] = {name:'얇은 보온층',material:'필요하면 더하기',emoji:'🧶'};
        title = '패딩 안은 조절 가능한 이너';
        notes.unshift('패딩이 두꺼워도 바깥 활동이 길면 얇은 반팔만으로는 부족할 수 있어요.');
      }
    } else if (outer === 'coat') {
      layers[2] = {name:'선택한 코트',material:'울·합성 혼방',emoji:'🧥'};
      if (effective < 2) notes.unshift('강추위에는 코트만으로 부족할 수 있으니 보온 이너·머플러도 고려하세요.');
      if (effective >= 18) notes.unshift('현재 체감에서는 코트가 더울 수 있어요.');
    } else if (outer === 'light') {
      layers[2] = {name:'선택한 재킷',material:'바람을 막는 겉감',emoji:'🧥'};
      if (effective < 5) notes.unshift('가벼운 재킷만으로는 추울 수 있어요. 두꺼운 보온층이나 외투 변경을 고려하세요.');
    } else if (outer === 'none') {
      layers[2] = {name:'겉옷 생략',material:'필요 시 휴대용 겉옷',emoji:'✦'};
      if (effective <= 15) notes.unshift('겉옷 없이 외출하면 특히 아침·저녁에 추울 수 있어요.');
    }
    const code = Number(weather.code);
    const pop = Number(weather.pop ?? 0);
    const rain = Number(weather.precip ?? 0) > .1 || pop >= 50 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
    const windy = +weather.wind >= 25;
    if (rain) notes.unshift('비 예보가 있어 발수 겉옷이나 작은 우산을 추천해요.');
    if (windy) notes.unshift('바람이 강해 얇은 옷 여러 장보다 방풍 외투가 유용해요.');
    if (+weather.humidity >= 80 && feels >= 22) notes.unshift('습도가 높아 땀이 잘 마르지 않을 수 있어요. 속건 소재를 고려하세요.');
    const materials = base.materials.map(([name,reason])=>({name,reason}));
    if (rain && !materials.some(x=>x.name==='발수 겉감')) materials.unshift({name:'발수 겉감',reason:'비 예보가 있으면 겉옷이나 우산으로 젖는 것을 줄이세요.'});
    return {band,title,description,layers,materials,tip:notes[0],tips:notes,effective:round(effective),realFeel:round(feels),rain,windy};
  }

  function localDateString(date) {
    const year = date.getFullYear();
    return `${year}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }
  function addDays(isoDate, days) {
    const [y,m,d] = isoDate.split('-').map(Number);
    if (!y || !m || !d) throw new Error('날짜 형식이 올바르지 않습니다.');
    return new Date(Date.UTC(y,m-1,d+days)).toISOString().slice(0,10);
  }
  function dateRange(start,end,max=31) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) throw new Error('날짜를 확인해 주세요.');
    const dates=[];
    for(let i=0;i<=max;i++) {const date=addDays(start,i); if(date>end) return dates; dates.push(date);}
    throw new Error('여행 기간은 31일까지 선택해 주세요.');
  }
  function dayWeather(forecast, date) {
    if (!forecast || !forecast.daily) return null;
    const index=(forecast.daily.time||[]).indexOf(date);
    if (index < 0) return null;
    const hourly=forecast.hourly || {};
    const relevant=(hourly.time||[]).map((time,i)=>({time,i})).filter(({time})=>time.startsWith(date) && (+time.slice(11,13) >= 9) && (+time.slice(11,13) <= 20));
    const feels = relevant.map(({i})=>hourly.apparent_temperature?.[i]).filter(Number.isFinite);
    const winds = relevant.map(({i})=>hourly.wind_speed_10m?.[i]).filter(Number.isFinite);
    const low = forecast.daily.temperature_2m_min?.[index];
    const high = forecast.daily.temperature_2m_max?.[index];
    if(!Number.isFinite(low) || !Number.isFinite(high))return null;
    return {temp:(low+high)/2,feels:feels.length?feels.reduce((a,b)=>a+b,0)/feels.length:(low+high)/2,
      wind:winds.length?Math.max(...winds):0,precip:0,pop:forecast.daily.precipitation_probability_max?.[index]??0,
      code:forecast.daily.weather_code?.[index]??0,low,high};
  }
  function packingList(dates, knownDays) {
    const days = dates.length;
    if(days === 0) return [];
    const items=[{id:'underwear',name:'속옷',qty:days},{id:'socks',name:'양말',qty:days},{id:'tops',name:'상의',qty:clamp(Math.ceil(days/2)+1,1,days)},{id:'bottoms',name:'하의',qty:Math.max(1,Math.ceil(days/3))}];
    if(knownDays.length === 0){items.push({id:'unknown',name:'출발 직전 날씨 확인',qty:1});return items;}
    const bands=knownDays.map(w=>classifyTemperature(w.feels));
    if(bands.some(b=>['deepWinter','winter','chilly','cool'].includes(b)))items.push({id:'outer',name:'보온 겉옷',qty:1});
    if(bands.some(b=>['deepWinter','winter','chilly'].includes(b)))items.push({id:'knit',name:'따뜻한 중간층',qty:1});
    if(bands.some(b=>['deepWinter','winter'].includes(b)))items.push({id:'thermal',name:'보온 이너',qty:Math.max(1,Math.ceil(days/3))});
    if(knownDays.some(w=>w.pop>=40))items.push({id:'umbrella',name:'접이식 우산 또는 발수 겉옷',qty:1});
    if(bands.some(b=>['warm','hot'].includes(b)))items.push({id:'cooling',name:'가벼운 통기성 상의',qty:Math.max(1,Math.ceil(days/3))});
    if(bands.some(b=>b==='hot'))items.push({id:'sun',name:'모자·선크림',qty:1});
    items.push({id:'pajamas',name:'잠옷',qty:Math.max(1,Math.ceil(days/5))});
    return items;
  }
  function sky(code) {
    code=Number(code);
    if(code<=1)return {name:'맑음',symbol:'☀️'};
    if(code===2)return {name:'구름 조금',symbol:'🌤️'};
    if(code===3)return {name:'흐림',symbol:'☁️'};
    if(code===45||code===48)return {name:'안개',symbol:'🌫️'};
    if((code>=51&&code<=67)||(code>=80&&code<=82))return {name:'비',symbol:'🌧️'};
    if((code>=71&&code<=77)||(code>=85&&code<=86))return {name:'눈',symbol:'🌨️'};
    if(code>=95)return {name:'뇌우',symbol:'⛈️'};
    return {name:'구름',symbol:'☁️'};
  }
  return {classifyTemperature,recommendation,localDateString,addDays,dateRange,dayWeather,packingList,sky};
});
