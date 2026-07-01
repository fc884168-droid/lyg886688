(function () {
  "use strict";

  var CITY_ORDER = ["弓箭手村", "魔法森林", "勇士之村", "墮落城市", "維多利亞港", "奇幻村", "黃金海岸"];
  var CITY_COLORS = {
    "弓箭手村": "#7db25a",
    "魔法森林": "#5e88d8",
    "勇士之村": "#d97736",
    "墮落城市": "#9b6bd3",
    "維多利亞港": "#c9576e",
    "奇幻村": "#4a9bc4",
    "黃金海岸": "#d6aa36"
  };

  var LANDS = [];
  var activeDistrict = "全部";
  var activeOwner = "";
  var activeLand = "";
  var OWNER_COLORS = {};

  var tabs = document.getElementById("tabs");
  var pins = document.getElementById("pins");
  var rank = document.getElementById("rank");
  var detail = document.getElementById("detail");
  var legend = document.getElementById("legend");
  var tip = document.getElementById("tip");

  boot();

  async function boot() {
    try {
      LANDS = await loadLands();
      var meta = document.getElementById("estateUpdated");
      if (meta) meta.textContent = "共 " + LANDS.length + " 塊地段 · 資料來源：遊戲端 estate_lands";
      buildLegend();
      buildTabs();
      buildPins();
      buildRank();
      applyFilter();
      await syncOccupation();
      setInterval(syncOccupation, 60000);
    } catch (err) {
      console.error(err);
      if (detail) {
        detail.innerHTML = "<small>地段詳情</small><h4>載入失敗</h4><p class=\"empty\">無法讀取地段資料，請確認 data/estate_lands.json 存在。</p>";
      }
    }

    var resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
      resetBtn.onclick = function () {
        activeOwner = "";
        activeLand = "";
        document.querySelectorAll(".rankBtn,.pin").forEach(function (el) {
          el.classList.remove("active");
        });
        renderOwnerDetail("");
        applyFilter();
      };
    }
  }

  async function loadLands() {
    var baseRes = await fetch("./data/estate_lands.json", { cache: "no-store" });
    if (!baseRes.ok) throw new Error("estate_lands.json load failed");
    var baseData = await baseRes.json();
    var baseRows = Array.isArray(baseData) ? baseData : baseData.lands || [];
    var baseById = {};
    baseRows.forEach(function (row) {
      baseById[Number(row.pointIndex ?? row.landId)] = row;
    });

    var occRows = [];
    try {
      var occRes = await fetch("./data/lands_occupation.json", { cache: "no-store" });
      if (occRes.ok) {
        var occData = await occRes.json();
        occRows = occData.lands || [];
      }
    } catch (e) {}

    var source = occRows.length ? occRows : baseRows;
    return source.map(function (row, index) {
      var pointIndex = Number(row.landId ?? row.pointIndex ?? index);
      var base = baseById[pointIndex] || {};
      var city = row.city || row.city_name || row.district || base.city || base.district || "";
      return {
        id: base.id || row.id || ("wm010-" + pointIndex),
        pointIndex: pointIndex,
        mapId: Number(row.mapId || base.mapId || 0),
        name: row.name || row.land_name || base.name || "",
        mapName: row.mapName || row.map_name || base.mapName || row.name || "",
        district: city,
        city: city,
        x: Number(row.x ?? row.x_pct ?? base.x ?? 0),
        y: Number(row.y ?? row.y_pct ?? base.y ?? 0),
        type: row.type || row.land_type || base.type || "野區地段",
        owner: row.owner || row.current_owner_name || "",
        ownerKey: String(row.owner || row.current_owner_name || "").trim(),
        level: Number(row.level ?? row.current_level ?? 0),
        income: 0
      };
    }).sort(function (a, b) {
      return a.pointIndex - b.pointIndex;
    });
  }

  function esc(v) {
    return String(v ?? "").replace(/[&<>"]/g, function (s) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[s];
    });
  }

  function cityColor(d) {
    return CITY_COLORS[d] || "#d9a94c";
  }

  function levelColor(l) {
    return LYGL_ESTATE.levelColor(l);
  }

  function pinLevel(l) {
    if (!l.ownerKey) return 0;
    var lv = Number(l.level || 0);
    if (lv < 1) lv = 1;
    return Math.min(lv, LYGL_ESTATE.MAX_LEVEL);
  }

  function ownerColor(k) {
    return OWNER_COLORS[k] || "#7a6a48";
  }

  function ownerName(l) {
    return l.ownerKey || "未收購";
  }

  function isVisible(l) {
    return (activeDistrict === "全部" || l.district === activeDistrict) && (!activeOwner || l.ownerKey === activeOwner);
  }

  function buildLegend() {
    if (!legend) return;
    legend.innerHTML = "";
    LYGL_ESTATE.legendItems().forEach(function (x) {
      var e = document.createElement("span");
      e.className = "leg";
      e.innerHTML = '<i style="--c:' + levelColor(x.level) + '"></i>' + x.label;
      legend.appendChild(e);
    });
  }

  function buildTabs() {
    if (!tabs) return;
    tabs.innerHTML = "";
    var all = document.createElement("button");
    all.className = "tab active";
    all.innerHTML = '<i style="--c:#d9a94c"></i>全部';
    all.onclick = function () { setDistrict("全部"); };
    tabs.appendChild(all);

    CITY_ORDER.forEach(function (city) {
      var b = document.createElement("button");
      b.className = "tab";
      b.dataset.district = city;
      b.innerHTML = '<i style="--c:' + cityColor(city) + '"></i>' + esc(city);
      b.onclick = function () { setDistrict(city); };
      tabs.appendChild(b);
    });
  }

  function applyPinState(pinEl, l) {
    if (!pinEl) return;
    var owned = !!l.ownerKey;
    var lvl = pinLevel(l);
    pinEl.className = "pin " + (owned ? "owned" : "unowned");
    pinEl.dataset.owner = l.ownerKey || "";
    pinEl.dataset.level = String(lvl);
    pinEl.style.setProperty("--lvl", levelColor(lvl));
    pinEl.style.setProperty("--lvl-ring", String(Math.min(lvl * 2, 12)) + "px");
    pinEl.style.setProperty("--lvl-core", String(Math.min(Math.max(lvl - 1, 0), 6)) + "px");
    pinEl.style.setProperty("--owner", ownerColor(l.ownerKey));
    pinEl.style.setProperty("--city", cityColor(l.district));
    var tag = pinEl.querySelector(".ownerTag");
    if (tag) tag.textContent = ownerName(l);
  }

  function buildPins() {
    if (!pins) return;
    pins.innerHTML = "";
    LANDS.forEach(function (l) {
      var b = document.createElement("button");
      b.dataset.id = l.id;
      b.dataset.district = l.district;
      b.style.setProperty("--x", l.x + "%");
      b.style.setProperty("--y", l.y + "%");
      b.innerHTML = '<span class="ownerTag">' + esc(ownerName(l)) + '</span><i></i>';
      applyPinState(b, l);
      b.onclick = function () { selectLand(l.id); };
      b.onmouseenter = function () { showTip(l); };
      b.onmouseleave = hideTip;
      pins.appendChild(b);
    });
  }

  function refreshAllPins() {
    LANDS.forEach(function (l) {
      applyPinState(document.querySelector('.pin[data-id="' + l.id + '"]'), l);
    });
  }

  function buildRank() {
    if (!rank) return;
    rank.innerHTML = "";
    var list = getRankList();
    if (!list.length) {
      rank.innerHTML = '<div class="empty">目前尚無領主登榜，第一位拿下地契的玩家將會出現在這裡。</div>';
      return;
    }
    list.forEach(function (r, idx) {
      var rankNum = idx + 1;
      var rankClass = rankNum <= 3 ? " top" + rankNum : "";
      var b = document.createElement("button");
      b.className = "rankBtn";
      b.dataset.owner = r.name;
      b.dataset.rank = String(rankNum);
      b.style.setProperty("--owner", r.color);
      b.innerHTML =
        '<span class="rnkBanner' + rankClass + '" aria-label="第 ' + rankNum + ' 名">' + rankNum + "</span>" +
        '<span class="rflag"></span>' +
        '<span class="rbody"><span class="rname">' + esc(r.name) + '</span><span class="rmeta">土地 ' + r.count + " 塊 · 等級總和 " + r.levels + "</span></span>" +
        '<span class="rscore">' + r.count + "<small>塊</small></span>";
      b.onclick = function () { selectOwner(r.name); };
      rank.appendChild(b);
    });
    buildResDistr();
  }

  function getRankList() {
    var map = new Map();
    LANDS.filter(function (l) { return l.ownerKey; }).forEach(function (l) {
      var r = map.get(l.ownerKey) || { name: l.ownerKey, count: 0, levels: 0, income: 0, color: ownerColor(l.ownerKey) };
      r.count++;
      r.levels += Number(l.level || 0);
      r.income += Number(l.income || 0);
      map.set(l.ownerKey, r);
    });
    return Array.from(map.values()).sort(function (a, b) {
      return b.count - a.count || b.levels - a.levels || a.name.localeCompare(b.name, "zh-Hant");
    });
  }

  function getOwnerRank(name) {
    var list = getRankList();
    for (var i = 0; i < list.length; i++) {
      if (list[i].name === name) return i + 1;
    }
    return 0;
  }

  function setDistrict(d) {
    activeDistrict = d;
    document.querySelectorAll(".tab").forEach(function (b) {
      b.classList.toggle("active", (b.dataset.district || "全部") === d);
    });
    applyFilter();
  }

  function selectOwner(o) {
    activeOwner = activeOwner === o ? "" : o;
    activeLand = "";
    document.querySelectorAll(".rankBtn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.owner === activeOwner);
    });
    renderOwnerDetail(activeOwner);
    applyFilter();
  }

  function selectLand(id) {
    activeLand = id;
    var l = LANDS.find(function (x) { return x.id === id; });
    document.querySelectorAll(".pin").forEach(function (p) {
      p.classList.toggle("active", p.dataset.id === id);
    });
    if (l) renderLandDetail(l);
  }

  function applyFilter() {
    LANDS.forEach(function (l) {
      var dim = !isVisible(l);
      var p = document.querySelector('.pin[data-id="' + l.id + '"]');
      if (p) {
        p.classList.toggle("dim", dim);
        p.classList.toggle("focus", !dim && activeOwner && l.ownerKey === activeOwner);
      }
    });
  }

  function renderOwnerDetail(o) {
    if (!detail) return;
    if (!o) {
      detail.innerHTML = '<small>地段詳情</small><h4>選擇地段或玩家</h4><p class="empty">目前顯示全部地權。點選排行榜玩家後，地圖會只高亮他的地段。</p>';
      return;
    }
    var owned = LANDS.filter(function (l) { return l.ownerKey === o; });
    var c = ownerColor(o);
    var rankNo = getOwnerRank(o);
    detail.style.setProperty("--owner", c);
    detail.innerHTML =
      "<small>玩家詳情</small><h4>" + esc(o) + "</h4>" +
      (rankNo ? '<div class="row"><span>排行榜名次</span><b class="rankBadge">第 ' + rankNo + " 名</b></div>" : "") +
      '<div class="row"><span>持有地段</span><b>' + owned.length + " 塊</b></div>" +
      '<div class="row"><span>等級總和</span><b>' + owned.reduce(function (s, l) { return s + Number(l.level || 0); }, 0) + "</b></div>" +
      '<div class="row"><span>主要城市</span><b>' + esc(topDistrict(owned)) + "</b></div>";
  }

  function renderLandDetail(l) {
    if (!detail) return;
    detail.style.setProperty("--owner", ownerColor(l.ownerKey));
    var rewards = LYGL_ESTATE.calcFragmentRewards(LANDS, l);
    var rewardHtml = rewards
      .filter(function (r) { return r.qty > 0; })
      .map(function (r) {
        return '<div class="row fragRow"><span><img class="fragIcon" src="' + r.icon + '" alt="' + esc(r.name) + '">' + esc(r.name) + "</span><b>× " + r.qty + " / 日</b></div>";
      })
      .join("");
    detail.innerHTML =
      "<small>地段詳情</small><h4>" + esc(l.name) + "</h4>" +
      '<div class="row"><span>持有者</span><b><span class="status ' + (l.ownerKey ? "owned" : "") + '">' + esc(ownerName(l)) + "</span></b></div>" +
      '<div class="row"><span>土地等級</span><b>' + (l.level ? "LV" + l.level : "未收購") + "</b></div>" +
      '<div class="row"><span>隸屬城市</span><b>' + esc(l.district) + "</b></div>" +
      '<div class="row"><span>地圖代碼</span><b>' + l.mapId + "</b></div>" +
      '<div class="row"><span>地段類型</span><b>' + esc(l.type) + "</b></div>" +
      '<div class="fragSection"><small>每日產出</small>' + rewardHtml + "</div>";
  }

  function topDistrict(list) {
    var m = new Map();
    list.forEach(function (l) {
      m.set(l.district, (m.get(l.district) || 0) + 1);
    });
    var entries = Array.from(m.entries()).sort(function (a, b) { return b[1] - a[1]; });
    return entries[0] ? entries[0][0] : "-";
  }

  function buildResDistr() {
    var resDistrEl = document.getElementById("resDistr");
    if (!resDistrEl) return;
    var totals = {};
    LANDS.filter(function (l) { return l.ownerKey && Number(l.level) > 0; }).forEach(function (l) {
      LYGL_ESTATE.calcFragmentRewards(LANDS, l).forEach(function (r) {
        if (!r.qty) return;
        if (!totals[r.itemId]) totals[r.itemId] = { name: r.name, icon: r.icon, qty: 0 };
        totals[r.itemId].qty += r.qty;
      });
    });
    var entries = Object.keys(totals).map(function (k) { return totals[k]; })
      .sort(function (a, b) { return b.qty - a.qty; });
    if (!entries.length) {
      resDistrEl.innerHTML = '<div class="resDHead">資源分布</div><p class="empty resDistrEmpty">暫無持有地段</p>';
      return;
    }
    var maxQty = entries[0].qty;
    var html = '<div class="resDHead">資源分布</div>';
    entries.forEach(function (e) {
      var pct = Math.round(e.qty / maxQty * 100);
      html += '<div class="resRow">' +
        '<img class="fragIcon" src="' + e.icon + '" alt="' + esc(e.name) + '">' +
        '<span class="resName">' + esc(e.name) + '</span>' +
        '<div class="resBar"><div class="resFill" style="width:' + pct + '%"></div></div>' +
        '<span class="resQty">' + e.qty + '/日</span>' +
        '</div>';
    });
    resDistrEl.innerHTML = html;
  }

  function showTip(l) {
    if (!tip) return;
    tip.style.setProperty("--owner", ownerColor(l.ownerKey));
    var fragHtml = "";
    if (l.ownerKey && Number(l.level) > 0) {
      var rewards = LYGL_ESTATE.calcFragmentRewards(LANDS, l);
      fragHtml = '<div class="tipFrag">' +
        rewards.filter(function (r) { return r.qty > 0; }).map(function (r) {
          return '<span><img class="fragIcon" src="' + r.icon + '" alt="' + esc(r.name) + '">' +
            esc(r.name) + " \xd7" + r.qty + "/日</span>";
        }).join("") +
        "</div>";
    }
    tip.innerHTML =
      "<strong>" + esc(l.name) + "</strong>" +
      "<div><span>持有者</span><b>" + esc(ownerName(l)) + "</b></div>" +
      "<div><span>等級</span><b>" + (l.level ? "LV" + l.level : "未收購") + "</b></div>" +
      "<div><span>城市</span><b>" + esc(l.district) + "</b></div>" +
      fragHtml;
    tip.classList.add("show");
  }

  function hideTip() {
    if (tip) tip.classList.remove("show");
  }

  document.addEventListener("mousemove", function (e) {
    if (!tip || !tip.classList.contains("show")) return;
    var pad = 18;
    var w = tip.offsetWidth;
    var h = tip.offsetHeight;
    var x = e.clientX + pad;
    var y = e.clientY - h - 10;
    if (x + w > innerWidth - 10) x = e.clientX - w - pad;
    if (y < 10) y = e.clientY + pad;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  });

  async function syncOccupation() {
    try {
      var res = await fetch("./data/lands_occupation.json", { cache: "no-store" });
      if (!res.ok) return;
      var data = await res.json();
      var rows = data.lands || [];
      var byMap = new Map(rows.map(function (r) { return [r.mapId, r]; }));
      var byId = new Map(rows.map(function (r) { return [r.landId, r]; }));

      LANDS.forEach(function (l) {
        var o = byId.get(l.pointIndex) || byMap.get(l.mapId);
        if (!o) return;
        l.level = Number(o.level || 0);
        l.owner = o.owner || "";
        l.ownerKey = String(o.owner || "").trim();
        if (o.city) {
          l.district = o.city;
          l.city = o.city;
        }
      });

      var meta = document.getElementById("estateUpdated");
      if (meta && data.updatedAt) meta.textContent = "戰況更新：" + data.updatedAt;
      if (pins && pins.children.length === LANDS.length) {
        refreshAllPins();
      } else {
        buildPins();
      }
      buildRank();
      applyFilter();
      if (activeLand) selectLand(activeLand);
      else if (activeOwner) renderOwnerDetail(activeOwner);
    } catch (e) {}
  }
})();
