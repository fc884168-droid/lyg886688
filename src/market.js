(function () {
  "use strict";

  var stocks = [];
  var klineSeries = {};
  var activeId = null;
  var chart = null;
  var candleSeries = null;

  var sidebar = document.getElementById("stockSidebar");
  var tableBody = document.getElementById("stockTableBody");
  var profitRankBody = document.getElementById("profitRankBody");
  var holdingsRankBody = document.getElementById("holdingsRankBody");
  var meta = document.getElementById("marketUpdated");
  var empty = document.getElementById("marketEmpty");
  var host = document.getElementById("stockChartHost");
  var chartEmpty = document.getElementById("chartEmpty");

  if (!tableBody || !host) return;

  function fmt(n) {
    return Number(n || 0).toLocaleString("zh-TW");
  }

  function pct(open, cur) {
    if (!open) return 0;
    return ((cur - open) * 100) / open;
  }

  function stockChange(stock) {
    if (stock.change_percent != null && stock.change_percent !== "") {
      return Number(stock.change_percent);
    }
    return pct(stock.today_open, stock.current_price);
  }

  function cls(p) {
    if (p > 0) return "market-up";
    if (p < 0) return "market-down";
    return "market-flat";
  }

  function normalizeBars(raw) {
    if (!raw || !raw.length) return [];
    return raw.map(function (b) {
      return {
        time: Number(b.t || b.time),
        open: Number(b.o || b.open),
        high: Number(b.h || b.high),
        low: Number(b.l || b.low),
        close: Number(b.c || b.close),
        volume: Number(b.v || b.volume || 0)
      };
    }).filter(function (b) {
      return b.time > 0 && b.open > 0 && b.close > 0;
    }).sort(function (a, b) { return a.time - b.time; });
  }

  function getBars(stock) {
    return normalizeBars(klineSeries[String(stock.id)]);
  }

  function toChartData(bars) {
    return bars.map(function (b) {
      return { time: b.time, open: b.open, high: b.high, low: b.low, close: b.close };
    });
  }

  function ensureChart() {
    if (chart || typeof LightweightCharts === "undefined") return;
    chart = LightweightCharts.createChart(host, {
      width: host.clientWidth,
      height: host.clientHeight || 400,
      layout: {
        background: { color: "#121820" },
        textColor: "#9aa4b2",
        fontFamily: '"Segoe UI", "Microsoft JhengHei", sans-serif',
        fontSize: 12
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#243041" }
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Magnet,
        vertLine: { visible: false, labelVisible: false },
        horzLine: {
          color: "#6e7681",
          labelBackgroundColor: "#d97706"
        }
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.08, bottom: 0.08 }
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 4,
        barSpacing: 11,
        minBarSpacing: 5
      },
      localization: {
        locale: "zh-TW",
        priceFormatter: function (p) { return fmt(Math.round(p)); }
      }
    });

    candleSeries = chart.addCandlestickSeries({
      upColor: "#ef5350",
      downColor: "#43a047",
      borderUpColor: "#ef5350",
      borderDownColor: "#43a047",
      wickUpColor: "#ef5350",
      wickDownColor: "#43a047"
    });

    window.addEventListener("resize", function () {
      if (!chart) return;
      chart.applyOptions({ width: host.clientWidth, height: host.clientHeight || 400 });
    });
  }

  function updateQuote(stock) {
    var change = stockChange(stock);
    document.getElementById("quoteName").textContent = stock.name;
    document.getElementById("quotePrice").textContent = fmt(stock.current_price);
    var delta = document.getElementById("quoteDelta");
    delta.textContent = (change > 0 ? "+" : "") + change.toFixed(2) + "%";
    delta.className = "delta " + cls(change);
    document.getElementById("quoteOpen").textContent = fmt(stock.today_open);
    document.getElementById("quoteHigh").textContent = fmt(stock.today_high);
    document.getElementById("quoteLow").textContent = fmt(stock.today_low);
    document.getElementById("quoteVol").textContent = fmt(stock.volume_24h);
  }

  function renderRankTable(tbody, rows, type) {
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!rows.length) {
      var emptyTr = document.createElement("tr");
      emptyTr.className = "rank-empty";
      emptyTr.innerHTML = '<td colspan="4">尚無資料</td>';
      tbody.appendChild(emptyTr);
      return;
    }
    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      var topClass = row.rank <= 3 ? " top" + row.rank : "";
      tr.className = topClass;
      if (type === "profit") {
        tr.innerHTML =
          '<td class="rnk">' + row.rank + "</td>" +
          '<td class="player">' + esc(row.player) + "</td>" +
          '<td class="num">' + fmt(row.realized_profit) + "</td>" +
          '<td class="num">' + fmt(row.available_fund) + "</td>";
      } else {
        tr.innerHTML =
          '<td class="rnk">' + row.rank + "</td>" +
          '<td class="player">' + esc(row.player) + "</td>" +
          '<td class="num">' + fmt(row.market_value) + "</td>" +
          '<td class="num">' + fmt(row.total_shares) + "</td>";
      }
      tbody.appendChild(tr);
    });
  }

  function esc(v) {
    return String(v || "").replace(/[&<>"]/g, function (s) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[s];
    });
  }

  function renderChart(stock) {
    var bars = getBars(stock);
    var hasData = bars.length > 0;

    if (!hasData) {
      if (chart) {
        chart.remove();
        chart = null;
        candleSeries = null;
      }
      host.hidden = true;
      if (chartEmpty) {
        chartEmpty.hidden = false;
        chartEmpty.textContent = "尚無 K 線資料（股價更新後，每 10 分鐘同步一次就會開始顯示）";
      }
      return;
    }

    host.hidden = false;
    if (chartEmpty) chartEmpty.hidden = true;
    ensureChart();
    if (!chart || !candleSeries) return;
    candleSeries.setData(toChartData(bars));
    chart.timeScale().fitContent();
  }

  function selectStock(id) {
    activeId = id;
    var stock = stocks.find(function (s) { return s.id === id; });
    if (!stock) return;
    document.querySelectorAll(".stock-pick").forEach(function (btn) {
      btn.classList.toggle("active", Number(btn.dataset.id) === id);
    });
    updateQuote(stock);
    renderChart(stock);
  }

  function renderSidebar() {
    if (!sidebar) return;
    sidebar.innerHTML = '<div class="market-sidebar-head">股票列表</div>';
    stocks.forEach(function (stock) {
      var change = stockChange(stock);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "stock-pick" + (stock.id === activeId ? " active" : "");
      btn.dataset.id = String(stock.id);
      btn.innerHTML =
        '<span class="stock-pick-name">' + stock.name + "</span>" +
        '<span class="stock-pick-price">' + fmt(stock.current_price) + "</span>" +
        '<span class="stock-pick-change ' + cls(change) + '">' +
        (change > 0 ? "+" : "") + change.toFixed(2) + "%</span>";
      btn.onclick = function () { selectStock(stock.id); };
      sidebar.appendChild(btn);
    });
  }

  function renderTable() {
    tableBody.innerHTML = "";
    stocks.forEach(function (row) {
      var tr = document.createElement("tr");
      var change = stockChange(row);
      tr.style.cursor = "pointer";
      tr.innerHTML =
        "<td><strong>" + row.name + "</strong></td>" +
        "<td>" + fmt(row.current_price) + "</td>" +
        "<td>" + fmt(row.today_open) + "</td>" +
        "<td>" + fmt(row.today_high) + " / " + fmt(row.today_low) + "</td>" +
        '<td class="' + cls(change) + '">' + (change > 0 ? "+" : "") + change.toFixed(2) + "%</td>" +
        "<td>" + fmt(row.volume_24h) + "</td>";
      tr.onclick = function () { selectStock(row.id); };
      tableBody.appendChild(tr);
    });
  }

  function renderAll() {
    if (!stocks.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    if (activeId == null) activeId = stocks[0].id;
    renderSidebar();
    renderTable();
    selectStock(activeId);
  }

  async function refresh() {
    try {
      var stockRes = await LYGL.fetchJson("./data/stocks.json");
      stocks = Array.isArray(stockRes) ? stockRes : (stockRes.stocks || []);
      try {
        var klineRes = await LYGL.fetchJson("./data/stock_klines.json");
        klineSeries = klineRes.series || {};
      } catch (e2) {
        klineSeries = {};
      }
      try {
        var rankRes = await LYGL.fetchJson("./data/stock_rankings.json");
        renderRankTable(profitRankBody, rankRes.profit || [], "profit");
        renderRankTable(holdingsRankBody, rankRes.holdings || [], "holdings");
      } catch (e3) {
        renderRankTable(profitRankBody, [], "profit");
        renderRankTable(holdingsRankBody, [], "holdings");
      }
      renderAll();
      if (meta) {
        var t = stockRes.updatedAt || stockRes._meta && stockRes._meta.generated_at;
        meta.textContent = t ? ("更新 " + t + " · 行情來自資料庫") : "已同步 · 行情來自資料庫";
      }
    } catch (e) {
      if (meta) meta.textContent = "行情同步中，請稍後再試";
      if (empty) empty.hidden = false;
    }
  }

  refresh();
  setInterval(refresh, 60000);
})();
