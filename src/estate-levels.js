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

  global.LYGL_ESTATE = {
    MAX_LEVEL: MAX_LEVEL,
    LEVEL_COLORS: LEVEL_COLORS,
    levelColor: levelColor,
    legendItems: legendItems
  };
})(window);
