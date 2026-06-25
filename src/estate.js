(function () {
  'use strict';

  const DISTRICT_COLORS = {
    '全部': '#d9a94c',
    '勇士之村': '#d77430',
    '墮落城市': '#8b63bd',
    '弓箭手村': '#4aa865',
    '魔法森林': '#4f73c6',
    '奇幻村': '#c35b6c',
    '遺跡發掘地': '#9b7b4a',
    '維多利亞港': '#3b8dc9',
    '鯨魚號': '#2f9e9e',
    '黃金海岸': '#d7aa2f'
  };

  let DISTRICTS = [
    '弓箭手村',
    '魔法森林',
    '勇士之村',
    '墮落城市',
    '維多利亞港',
    '奇幻村',
    '黃金海岸'
  ];

  const CITY_ORDER = [
    '弓箭手村',
    '魔法森林',
    '勇士之村',
    '墮落城市',
    '維多利亞港',
    '奇幻村',
    '黃金海岸'
  ];

  const DISTRICT_AREAS = [
    { district: '勇士之村', x: 47, y: 23, w: 34, h: 24 },
    { district: '墮落城市', x: 17, y: 48, w: 20, h: 25 },
    { district: '弓箭手村', x: 52, y: 76, w: 27, h: 26 },
    { district: '魔法森林', x: 72, y: 56, w: 25, h: 24 },
    { district: '奇幻村', x: 40, y: 48, w: 22, h: 28 },
    { district: '維多利亞港', x: 18, y: 78, w: 22, h: 18 },
    { district: '鯨魚號', x: 75, y: 83, w: 16, h: 14 },
    { district: '黃金海岸', x: 88, y: 64, w: 17, h: 18 }
  ];

  let lands = [];
  let activeId = null;
  let activeDistrict = '全部';
  let globalTip = null;
  const POINT_CENTER_OFFSET = { x: 0, y: 0 };

  boot();

  async function boot() {
    globalTip = ensureTip();
    const [landData, occupationData] = await Promise.all([
      loadJson('./data/estate_lands.json'),
      loadJson('./data/lands_occupation.json')
    ]);

    lands = normalizeLands(landData, occupationData);
    DISTRICTS = collectDistricts(lands);
    buildTabs();
    clearDistrictLayer();
    buildPins();
    buildCards();
    buildLeaderboard();
    refreshCount();
    updatePanel(null);
  }

  async function loadJson(url) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(response.statusText);
      return await response.json();
    } catch {
      return null;
    }
  }

  function normalizeLands(landData, occupationData) {
    const source = Array.isArray(landData) ? landData : (landData && landData.lands) || [];
    const rows = (occupationData && occupationData.lands) || (occupationData && occupationData.occupations) || [];
    const occupations = rows.reduce((map, item) => {
      if (item.landId) map.byLandId.set(String(item.landId), item);
      if (item.mapId) map.byMapId.set(Number(item.mapId), item);
      return map;
    }, { byLandId: new Map(), byMapId: new Map() });

    return source
      .map((item, index) => {
        const mapId = Number(item.mapId || item.primaryMapId || 0);
        const occupation = occupations.byLandId.get(String(item.pointIndex ?? index)) || occupations.byLandId.get(String(item.id)) || occupations.byMapId.get(mapId);
        const district = normalizeDistrict(Object.assign({}, item, occupation || {}), mapId);
        const owner = occupation ? cleanOwnerName(occupation.owner || occupation.guildName || '') : (item.owner || '');
        const level = occupation ? Number(occupation.level || 0) : Number(item.level || 0);

        return {
          id: item.id || `wm010-${item.pointIndex ?? index}`,
          pointIndex: Number(item.pointIndex ?? index),
          name: item.name || item.mapName || item.primaryMapName || `地段 ${index + 1}`,
          district,
          originalRegion: item.originalRegion || item.region || district,
          type: item.type || item.typeLabel || '地段',
          status: owner ? '已占領' : '待競標',
          mapId,
          streetName: item.streetName || item.primaryStreetName || '',
          mapName: item.mapName || item.primaryMapName || '',
          x: clamp(Number(item.x ?? item.percent?.x) + POINT_CENTER_OFFSET.x, 1, 99),
          y: clamp(Number(item.y ?? item.percent?.y) + POINT_CENTER_OFFSET.y, 1, 99),
          owner,
          level,
          occupied: !!owner
        };
      })
      .filter(item => Number.isFinite(item.x) && Number.isFinite(item.y))
      .sort((a, b) => a.pointIndex - b.pointIndex);
  }

  function normalizeDistrict(item, mapId) {
    if (item.city) return item.city;
    if (item.district) return item.district;
    if (item.region) return item.region;
    return '維多利亞島';
  }

  function collectDistricts(list) {
    const seen = new Set();
    const result = [];
    CITY_ORDER.forEach(function (city) {
      if (list.some(function (item) { return item.district === city; })) {
        seen.add(city);
        result.push(city);
      }
    });
    list.forEach(function (item) {
      const district = item.district || '維多利亞島';
      if (!seen.has(district)) {
        seen.add(district);
        result.push(district);
      }
    });
    return result;
  }

  function cleanOwnerName(name) {
    const value = String(name || '').trim();
    return value || '';
  }

  function ensureTip() {
    let tip = document.getElementById('globalTip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'globalTip';
      document.body.appendChild(tip);
    }
    document.addEventListener('mousemove', (event) => {
      if (!tip.classList.contains('visible')) return;
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      let left = event.clientX + 18;
      let top = event.clientY - th - 12;
      if (left + tw > window.innerWidth - 10) left = event.clientX - tw - 18;
      if (top < 10) top = event.clientY + 18;
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    });
    return tip;
  }

  function buildTabs() {
    const wrap = document.getElementById('districtTabs');
    if (!wrap) return;
    wrap.innerHTML = '';
    wrap.appendChild(makeTab('全部', DISTRICT_COLORS['全部'], true));
    DISTRICTS.forEach(district => wrap.appendChild(makeTab(district, DISTRICT_COLORS[district], false)));
  }

  function makeTab(label, color, active) {
    const button = document.createElement('button');
    button.className = `est-tab${active ? ' active' : ''}`;
    button.type = 'button';
    button.dataset.d = label;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', active ? 'true' : 'false');
    if (color) {
      const dot = document.createElement('span');
      dot.className = 'tdot';
      dot.style.background = color;
      button.appendChild(dot);
    }
    button.appendChild(document.createTextNode(label));
    button.addEventListener('click', () => switchDistrict(label, button));
    return button;
  }

  function clearDistrictLayer() {
    const svg = document.getElementById('districtSvg');
    if (!svg) return;
    svg.innerHTML = '';
  }

  function buildDistrictLayer() {
    const svg = document.getElementById('districtSvg');
    if (!svg) return;
    svg.innerHTML = '';
    const ns = 'http://www.w3.org/2000/svg';

    DISTRICT_AREAS.forEach(area => {
      const color = DISTRICT_COLORS[area.district] || '#d9a94c';
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('class', 'd-poly');
      rect.setAttribute('x', area.x - area.w / 2);
      rect.setAttribute('y', area.y - area.h / 2);
      rect.setAttribute('width', area.w);
      rect.setAttribute('height', area.h);
      rect.setAttribute('rx', 4);
      rect.style.setProperty('--dc', color);
      rect.dataset.d = area.district;
      rect.addEventListener('mouseenter', () => showDistrictTip(area.district, color));
      rect.addEventListener('mouseleave', hideTip);
      rect.addEventListener('click', event => {
        event.stopPropagation();
        const tab = document.querySelector(`#districtTabs .est-tab[data-d="${cssEscape(area.district)}"]`);
        if (tab) switchDistrict(area.district, tab);
      });
      svg.appendChild(rect);
    });
  }

  function showDistrictTip(district, color) {
    const list = lands.filter(item => item.district === district);
    const owned = list.filter(item => item.occupied).length;
    globalTip.innerHTML = `
      <span class="tt-name">${esc(district)}</span>
      <div class="tt-row"><span>地段</span><b>${list.length} 個</b></div>
      <div class="tt-row"><span>已占領</span><b>${owned} / ${list.length}</b></div>
    `;
    globalTip.style.setProperty('--dc', color);
    globalTip.classList.add('visible');
  }

  function buildPins() {
    const overlay = document.getElementById('mapOverlay');
    if (!overlay) return;
    overlay.innerHTML = '';

    lands.forEach(land => {
      const color = DISTRICT_COLORS[land.district] || '#d9a94c';
      const pin = document.createElement('button');
      pin.className = `land-pin ${land.occupied ? 'claimed' : 'open'}`;
      pin.type = 'button';
      pin.style.left = `${land.x}%`;
      pin.style.top = `${land.y}%`;
      pin.style.setProperty('--dc', color);
      pin.dataset.id = land.id;
      pin.dataset.d = land.district;
      pin.setAttribute('aria-label', land.name);

      const wrap = document.createElement('span');
      wrap.className = 'pin-wrap';
      const label = document.createElement('span');
      label.className = 'pin-owner-tag';
      label.textContent = land.occupied ? land.owner : '待競標';
      wrap.appendChild(label);
      const orb = document.createElement('span');
      orb.className = 'pin-orb';
      wrap.appendChild(orb);
      pin.appendChild(wrap);

      pin.addEventListener('mouseenter', () => showLandTip(land, color));
      pin.addEventListener('mouseleave', hideTip);
      pin.addEventListener('focus', () => showLandTip(land, color));
      pin.addEventListener('blur', hideTip);
      pin.addEventListener('click', () => selectLand(land.id));
      overlay.appendChild(pin);
    });
  }

  function showLandTip(land, color) {
    globalTip.innerHTML = `
      <span class="tt-name">${esc(land.name)}</span>
      <div class="tt-row"><span>區域</span><b>${esc(land.district)}</b></div>
      <div class="tt-row"><span>地圖</span><b>${esc(land.mapId || '-')}</b></div>
      <div class="tt-row"><span>狀態</span><b>${land.occupied ? esc(land.owner) : '尚未占領'}</b></div>
      <span class="tt-badge ${land.occupied ? 'taken' : 'open'}">${land.occupied ? '已占領' : '待競標'}</span>
    `;
    globalTip.style.setProperty('--dc', color);
    globalTip.classList.add('visible');
  }

  function hideTip() {
    globalTip.classList.remove('visible');
  }

  function switchDistrict(district, button) {
    activeDistrict = district;
    document.querySelectorAll('#districtTabs .est-tab').forEach(tab => {
      tab.classList.toggle('active', tab === button);
      tab.setAttribute('aria-selected', tab === button ? 'true' : 'false');
    });
    applyFilter();
    refreshCount();
  }

  function applyFilter() {
    const all = activeDistrict === '全部';
    document.querySelectorAll('.land-pin').forEach(pin => {
      pin.classList.toggle('dimmed', !all && pin.dataset.d !== activeDistrict);
    });
    document.querySelectorAll('.lc-btn').forEach(card => {
      card.classList.toggle('dimmed', !all && card.dataset.d !== activeDistrict);
    });
    document.querySelectorAll('.d-poly').forEach(area => {
      area.classList.toggle('dimmed', !all && area.dataset.d !== activeDistrict);
      area.classList.toggle('is-active', !all && area.dataset.d === activeDistrict);
    });
  }

  function selectLand(id) {
    activeId = id;
    document.querySelectorAll('.land-pin').forEach(pin => pin.classList.toggle('is-active', pin.dataset.id === id));
    document.querySelectorAll('.lc-btn').forEach(card => card.classList.toggle('is-active', card.dataset.id === id));
    updatePanel(lands.find(land => land.id === id) || null);
  }

  function updatePanel(land) {
    const title = document.getElementById('panelTitle');
    const hint = document.getElementById('panelHint');
    const detail = document.getElementById('panelDetail');
    if (!title || !hint || !detail) return;

    if (!land) {
      title.textContent = '選擇一塊地段';
      hint.textContent = '滑過地圖上的地段即可查看區域、占領狀態與地圖代碼。';
      hint.style.display = 'block';
      detail.style.display = 'none';
      return;
    }

    const color = DISTRICT_COLORS[land.district] || '#d9a94c';
    title.textContent = land.name;
    hint.style.display = 'none';
    detail.style.display = 'block';

    const badge = document.getElementById('panelBadge');
    const dot = document.getElementById('badgeDot');
    const badgeText = document.getElementById('badgeText');
    if (badge) badge.style.setProperty('--dc', color);
    if (dot) dot.style.background = color;
    if (badgeText) badgeText.textContent = land.district;

    const statusText = land.occupied ? land.owner : '尚未占領';
    const statusClass = land.occupied ? 'taken' : 'open';
    const rows = document.getElementById('panelRows');
    if (rows) {
      rows.innerHTML = `
        <div class="panel-row"><span class="row-k">狀態</span><span class="row-v"><span class="p-status ${statusClass}">${esc(statusText)}</span></span></div>
        <div class="panel-row"><span class="row-k">區域</span><span class="row-v">${esc(land.district)}</span></div>
        <div class="panel-row"><span class="row-k">地圖代碼</span><span class="row-v">${esc(land.mapId || '-')}</span></div>
        <div class="panel-row"><span class="row-k">地圖名稱</span><span class="row-v">${esc(land.mapName || land.name)}</span></div>
        <div class="panel-row"><span class="row-k">土地等級</span><span class="row-v">${land.level ? `Lv.${land.level}` : '未開發'}</span></div>
      `;
    }
  }

  function buildCards() {
    const grid = document.getElementById('landsCards');
    if (!grid) return;
    grid.innerHTML = '';
    lands.forEach(land => {
      const color = DISTRICT_COLORS[land.district] || '#d9a94c';
      const button = document.createElement('button');
      button.className = `lc-btn ${land.occupied ? 'claimed' : 'open'}`;
      button.type = 'button';
      button.dataset.id = land.id;
      button.dataset.d = land.district;
      button.style.setProperty('--dc', color);
      button.innerHTML = `
        <span class="lc-name">${esc(land.name)}</span>
        <span class="lc-meta"><span class="lc-dot" style="background:${color}"></span>${esc(land.district)} · ${land.occupied ? esc(land.owner) : '待競標'}</span>
      `;
      button.addEventListener('click', () => selectLand(land.id));
      grid.appendChild(button);
    });
  }

  function buildLeaderboard() {
    const grid = document.getElementById('lbGrid');
    if (!grid) return;
    grid.innerHTML = '';
    DISTRICTS.forEach(district => {
      const color = DISTRICT_COLORS[district] || '#d9a94c';
      const list = lands.filter(land => land.district === district);
      const owned = list.filter(land => land.occupied).length;
      const pct = list.length ? Math.round((owned / list.length) * 100) : 0;
      const card = document.createElement('div');
      card.className = 'lb-card';
      card.style.setProperty('--dc', color);
      card.innerHTML = `
        <div class="lb-dname"><span class="lb-ddot"></span>${esc(district)}</div>
        <div class="lb-bar-bg"><div class="lb-bar-fill" style="width:${pct}%"></div></div>
        <div class="lb-stat"><div><div class="lb-owned-num">${owned}</div><div class="lb-total-txt">/ ${list.length} 地段</div></div><div class="lb-pct-txt">${pct}%</div></div>
      `;
      grid.appendChild(card);
    });
  }

  function refreshCount() {
    const target = document.getElementById('landCount');
    if (!target) return;
    const list = activeDistrict === '全部' ? lands : lands.filter(land => land.district === activeDistrict);
    const owned = list.filter(land => land.occupied).length;
    target.textContent = `${list.length} 個地段 · 已占領 ${owned}`;
  }

  function clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/"/g, '\\"');
  }

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
