(function (global) {
  "use strict";

  /** 與 scripts/special/地產大亨/地產大亨.js 的 MAX_LEVEL 保持一致 */
  var MAX_LEVEL = 7;

  var LEVEL_COLORS = {
    "0": "#ffb020",
    "1": "#86c96a",
    "2": "#4cc0a0",
    "3": "#55a3e8",
    "4": "#a36ce2",
    "5": "#f0b33f",
    "6": "#ff7043",
    "7": "#e53935"
  };

  function levelColor(level) {
    var key = String(level || 0);
    return LEVEL_COLORS[key] || LEVEL_COLORS[String(MAX_LEVEL)] || LEVEL_COLORS["0"];
  }

  function legendItems() {
    var items = [{ level: 0, label: "未收購" }];
    for (var i = 1; i <= MAX_LEVEL; i++) {
      items.push({ level: i, label: "LV" + i });
    }
    return items;
  }

  /** 以下與 scripts/special/地產大亨/地產大亨.js 的碎片產出邏輯保持一致（landId/mapId 決定型別，等級+壟斷決定數量） */
  var LEVEL_DAILY_QTY = [0, 20, 28, 38, 50, 65, 82, 100];
  var MONOPOLY_NORMAL_PCT = 150;
  var MONOPOLY_FULL_PCT = 200;
  var ADJ_DIST = 6.5;

  var FRAG_SCROLL = 4460101;
  var FRAG_POTION = 4460102;
  var FRAG_MONEY = 4460103;
  var FRAG_CHAIR = 4460104;
  var FRAG_MOUNT = 4460105;
  var FRAG_DONATE = 4460106;
  var FRAG_CRYSTAL = 4460107;
  var FRAG_SECRET = 4009024; // 秘笈系統 PAGE_ITEM，真正的秘笈殘頁

  var FRAG_NAMES = {};
  FRAG_NAMES[FRAG_SCROLL] = "卷軸碎片";
  FRAG_NAMES[FRAG_POTION] = "補品碎片";
  FRAG_NAMES[FRAG_MONEY] = "楓票碎片";
  FRAG_NAMES[FRAG_CHAIR] = "椅子碎片";
  FRAG_NAMES[FRAG_MOUNT] = "騎寵碎片";
  FRAG_NAMES[FRAG_DONATE] = "贊助碎片";
  FRAG_NAMES[FRAG_CRYSTAL] = "水晶碎片";
  FRAG_NAMES[FRAG_SECRET] = "秘笈殘頁";

  var FRAG_ICONS = {};
  FRAG_ICONS[FRAG_SCROLL] = "./assets/sys-icons/estate/卷軸碎片_32x32.png";
  FRAG_ICONS[FRAG_POTION] = "./assets/sys-icons/estate/補品碎片_32x32.png";
  FRAG_ICONS[FRAG_MONEY] = "./assets/sys-icons/estate/楓票碎片_32x32.png";
  FRAG_ICONS[FRAG_CHAIR] = "./assets/sys-icons/estate/椅子碎片_32x32.png";
  FRAG_ICONS[FRAG_MOUNT] = "./assets/sys-icons/estate/騎寵碎片_32x32.png";
  FRAG_ICONS[FRAG_DONATE] = "./assets/sys-icons/estate/贊助碎片_32x32.png";
  FRAG_ICONS[FRAG_CRYSTAL] = "./assets/sys-icons/estate/水晶碎片_32x32.png";
  FRAG_ICONS[FRAG_SECRET] = "./assets/sys-icons/secretbook/秘笈.png";

  function isMainTownMapId(mapId) {
    return mapId === 100000000 || mapId === 101000000 || mapId === 102000000 || mapId === 103000000 || mapId === 104000000 || mapId === 110000000;
  }

  function getLandFragmentTypes(land) {
    if (land.pointIndex === 5 || land.mapId === 105030000) {
      return [FRAG_DONATE, FRAG_CRYSTAL];
    }
    if (isMainTownMapId(land.mapId)) {
      var mainPairs = [
        [FRAG_MONEY, FRAG_SCROLL],
        [FRAG_MONEY, FRAG_POTION],
        [FRAG_MONEY, FRAG_CRYSTAL],
        [FRAG_MONEY, FRAG_CHAIR],
        [FRAG_MONEY, FRAG_MOUNT]
      ];
      return mainPairs[Math.abs(land.pointIndex) % mainPairs.length];
    }
    var pairs = [
      [FRAG_SCROLL, FRAG_POTION],
      [FRAG_CRYSTAL, FRAG_SCROLL],
      [FRAG_CHAIR, FRAG_CRYSTAL],
      [FRAG_MOUNT, FRAG_POTION],
      [FRAG_SCROLL, FRAG_CHAIR],
      [FRAG_CRYSTAL, FRAG_POTION],
      [FRAG_SECRET, FRAG_SCROLL],
      [FRAG_CHAIR, FRAG_MOUNT]
    ];
    return pairs[Math.abs(land.pointIndex) % pairs.length];
  }

  function landDist(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function isAdjacent(a, b) {
    return a.city === b.city && landDist(a, b) <= ADJ_DIST;
  }

  function getMonopolyPct(allLands, land) {
    if (!land.ownerKey) return 100;
    var i, cityTotal = 0, cityOwned = 0;
    for (i = 0; i < allLands.length; i++) {
      if (allLands[i].city !== land.city) continue;
      cityTotal++;
      if (allLands[i].ownerKey === land.ownerKey) cityOwned++;
    }
    if (cityTotal > 0 && cityTotal === cityOwned) return MONOPOLY_FULL_PCT;

    var byId = {};
    for (i = 0; i < allLands.length; i++) byId[allLands[i].pointIndex] = allLands[i];
    var visited = {};
    var queue = [land.pointIndex];
    visited[land.pointIndex] = true;
    var size = 0;
    while (queue.length > 0) {
      var id = queue.shift();
      size++;
      var cur = byId[id];
      for (var j = 0; j < allLands.length; j++) {
        var n = allLands[j];
        if (visited[n.pointIndex] || n.ownerKey !== land.ownerKey || !isAdjacent(cur, n)) continue;
        visited[n.pointIndex] = true;
        queue.push(n.pointIndex);
      }
    }
    return size >= 2 ? MONOPOLY_NORMAL_PCT : 100;
  }

  function calcDailyReward(allLands, land) {
    var lv = Math.max(1, Math.min(MAX_LEVEL, Number(land.level || 0) || 1));
    var base = LEVEL_DAILY_QTY[lv] || LEVEL_DAILY_QTY[1];
    var pct = getMonopolyPct(allLands, land);
    return Math.floor((base * pct) / 100);
  }

  function calcFragmentRewards(allLands, land) {
    var types = getLandFragmentTypes(land);
    var total = calcDailyReward(allLands, land);
    var mainQty = Math.floor((total * 80) / 100);
    var subQty = Math.max(0, total - mainQty);
    return [
      { itemId: types[0], qty: mainQty, name: FRAG_NAMES[types[0]], icon: FRAG_ICONS[types[0]] },
      { itemId: types[1], qty: subQty, name: FRAG_NAMES[types[1]], icon: FRAG_ICONS[types[1]] }
    ];
  }

  global.LYGL_ESTATE = {
    MAX_LEVEL: MAX_LEVEL,
    LEVEL_COLORS: LEVEL_COLORS,
    levelColor: levelColor,
    legendItems: legendItems,
    calcFragmentRewards: calcFragmentRewards
  };
})(window);
