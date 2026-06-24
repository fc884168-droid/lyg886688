const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });
}

const currentPage = location.pathname.split("/").pop() || "index.html";
document.querySelectorAll(".nav-links a").forEach((link) => {
  if (link.getAttribute("href")?.endsWith(currentPage)) {
    link.classList.add("active");
  }
});

async function loadJson(path, fallback) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) return fallback;
    return await response.json();
  } catch (_) {
    return fallback;
  }
}

function renderEstate(lands) {
  const overlay = document.getElementById("landOverlay");
  const panel = document.getElementById("landPanel");
  const tabs = document.getElementById("districtTabs");
  const roster = document.getElementById("landRoster");
  if (!overlay || !Array.isArray(lands) || lands.length === 0) return;

  let currentDistrict = "全部";
  let activeId = null;
  overlay.innerHTML = "";

  function ownerText(land) {
    return land.owner ? land.owner : "尚未占領";
  }

  function levelText(land) {
    return land.level ? `Lv.${land.level}` : "未開發";
  }

  function updatePanel(land) {
    if (!panel) return;
    panel.classList.add("land-card");
    panel.innerHTML = `<span>${land.district || "維多利亞島"}</span>
      <h2>${land.name || "未命名地段"}</h2>
      <p>${land.desc || "可競標地段，開發後能提高每日產出、稀有獎勵與土地價值。"}</p>
      <span class="land-status">${land.status || "首季準備中"}</span>
      <dl>
        <div><dt>占領者</dt><dd>${ownerText(land)}</dd></div>
        <div><dt>土地等級</dt><dd>${levelText(land)}</dd></div>
        <div><dt>地段類型</dt><dd>${land.type || "野區"}</dd></div>
      </dl>`;
  }

  function setActive(id) {
    activeId = id;
    document.querySelectorAll(".land-marker, .land-roster button").forEach((node) => {
      node.classList.toggle("active", node.dataset.id === id);
    });
    const land = lands.find((item) => item.id === id);
    if (land) updatePanel(land);
  }

  function applyFilter(district) {
    currentDistrict = district;
    tabs?.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.district === district);
    });
    document.querySelectorAll(".land-marker, .land-roster button").forEach((node) => {
      const show = district === "全部" || node.dataset.district === district;
      node.classList.toggle("dimmed", !show);
      if (node.classList.contains("land-marker")) return;
      node.hidden = !show;
    });
  }

  if (tabs) {
    const districts = Array.from(new Set(lands.map((land) => land.district).filter(Boolean)));
    districts.forEach((district) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.district = district;
      button.textContent = district;
      button.addEventListener("click", () => applyFilter(district));
      tabs.appendChild(button);
    });
    tabs.querySelector('[data-district="全部"]')?.addEventListener("click", () => applyFilter("全部"));
  }

  if (roster) roster.innerHTML = "";

  lands.forEach((land, index) => {
    if (typeof land.x !== "number" || typeof land.y !== "number") return;

    const marker = document.createElement("button");
    marker.className = "land-marker";
    marker.type = "button";
    marker.dataset.id = land.id || `land-${index}`;
    marker.dataset.district = land.district || "";
    marker.style.left = `${land.x}%`;
    marker.style.top = `${land.y}%`;

    const dot = document.createElement("span");
    dot.className = "land-dot";
    if (land.color) dot.style.background = land.color;
    marker.appendChild(dot);

    if (land.owner) {
      const owner = document.createElement("span");
      owner.className = "land-owner";
      owner.textContent = land.owner;
      marker.appendChild(owner);
    }

    const tooltip = document.createElement("span");
    tooltip.className = "land-tooltip";
    tooltip.innerHTML = `<strong>${land.name || "未命名地段"}</strong>
      <span>${land.district || "維多利亞島"} · ${land.type || "野區"}</span>
      <span>占領者：${ownerText(land)}</span>
      <span>土地等級：${levelText(land)}</span>`;
    marker.appendChild(tooltip);

    marker.addEventListener("mouseenter", () => updatePanel(land));
    marker.addEventListener("click", () => setActive(marker.dataset.id));

    overlay.appendChild(marker);

    if (roster) {
      const row = document.createElement("button");
      row.type = "button";
      row.dataset.id = marker.dataset.id;
      row.dataset.district = marker.dataset.district;
      row.innerHTML = `<strong>${land.name || "未命名地段"}</strong><span>${land.district || "維多利亞島"} · ${ownerText(land)}</span>`;
      row.addEventListener("mouseenter", () => updatePanel(land));
      row.addEventListener("click", () => setActive(row.dataset.id));
      roster.appendChild(row);
    }
  });

  applyFilter(currentDistrict);
  if (lands[0]) setActive(lands[0].id || "land-0");
}

function renderMarket(rows) {
  const canvas = document.getElementById("stockChart");
  const empty = document.getElementById("stockEmpty");
  const price = document.getElementById("marketPrice");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.clientWidth || 680;
  const height = canvas.clientHeight || 320;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(220,168,79,0.16)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i += 1) {
    const y = 28 + (height - 56) * (i / 5);
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(width - 20, y);
    ctx.stroke();
  }

  if (!Array.isArray(rows) || rows.length < 2) {
    if (price) price.textContent = "--";
    ctx.fillStyle = "#dca84f";
    ctx.font = "700 18px Microsoft JhengHei, sans-serif";
    ctx.fillText("行情看板準備中", 28, 54);
    if (empty) empty.hidden = false;
    return;
  }

  if (empty) empty.hidden = true;
  const values = rows.map((row) => Number(row.value)).filter(Number.isFinite);
  if (price) price.textContent = values.at(-1)?.toLocaleString("zh-TW") || "--";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);

  ctx.strokeStyle = "#f1c36c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  values.forEach((value, index) => {
    const x = 28 + (width - 56) * (index / Math.max(values.length - 1, 1));
    const y = height - 28 - ((value - min) / span) * (height - 72);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function normalizeWzLandPoint(point) {
  if (!point) return null;
  const percent = point.percent || {};
  const x = typeof percent.x === "number" ? percent.x : point.x;
  const y = typeof percent.y === "number" ? percent.y : point.y;
  if (typeof x !== "number" || typeof y !== "number") return null;

  return {
    id: point.id || `wm010-${point.pointIndex}`,
    name: point.name || point.primaryMapName || `地段 ${point.pointIndex}`,
    district: point.region || "維多利亞島",
    type: point.typeLabel || "地段",
    status: point.status || "首季準備中",
    desc: point.primaryStreetName
      ? `${point.primaryStreetName} · ${point.primaryMapName || "可競標地段"}`
      : "維多利亞島可競標地段",
    mapId: point.primaryMapId || "",
    x,
    y,
    owner: point.owner || "",
    level: point.level || 0,
    color: point.color || ""
  };
}

loadJson("./data/victoria_worldmap010_points.json", { points: [] }).then((data) => {
  const source = Array.isArray(data) ? data : data.points;
  renderEstate((source || []).map(normalizeWzLandPoint).filter(Boolean));
});
loadJson("./data/stocks.json", []).then(renderMarket);

document.querySelectorAll(".system-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.system;
    document.querySelectorAll(".system-tab").forEach((item) => {
      item.classList.toggle("active", item === tab);
    });
    document.querySelectorAll(".system-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `system-${target}`);
    });
  });
});
