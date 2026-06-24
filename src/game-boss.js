(function () {
  "use strict";

  var OPEN_IDS = {
    194: true, 195: true, 196: true, 197: true, 198: true, 199: true, 200: true,
    210: true, 221: true
  };
  var IMG_DIR = "./BOSS地圖傳送用圖/";

  var BOSS_MAP = {
    194: "拉圖斯", 195: "夢幻公園", 196: "殘暴炎魔", 197: "暗黑龍王",
    198: "皮卡啾", 199: "凡雷恩", 200: "希拉", 201: "史烏",
    202: "阿卡伊農", 203: "森蘭丸", 204: "梅格奈斯", 205: "薄毒",
    206: "頓凱爾", 207: "岱羅將軍", 208: "濃姬", 209: "彌弄姬",
    210: "黑道長老", 211: "比艾樂", 212: "斑斑", 213: "血腥皇后",
    214: "貝倫", 215: "雪蓮", 216: "威爾", 217: "桃樂絲",
    218: "明智光秀", 219: "庫洛斯", 220: "西格諾斯", 221: "真希拉",
    222: "培羅德", 223: "露希妲"
  };

  // 依遠征強度排序；210 黑道長老略強於 197 暗黑龍王
  var DISPLAY_ORDER = [
    194, 195, 196, 197, 210, 198, 199, 200, 221,
    201, 202, 203, 204, 205, 206, 207, 208, 209,
    211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 222, 223
  ];

  var host = document.getElementById("bossRoster");
  if (!host) return;

  function imgPath(id, name) {
    return IMG_DIR + id + "_" + name + "_Effect.wz__CharacterEff.img__10020191__" + id + "__0.png";
  }

  host.innerHTML = "";
  DISPLAY_ORDER.forEach(function (id) {
    var name = BOSS_MAP[id];
    if (!name) return;
    var open = !!OPEN_IDS[id];
    var fig = document.createElement("figure");
    fig.className = "boss-card " + (open ? "is-open" : "is-locked");
    fig.innerHTML =
      '<img src="' + imgPath(id, name) + '" alt="' + name + '" width="300" height="60" loading="lazy">' +
      (open ? "" : '<span class="boss-lock-tag">未開放</span>');
    host.appendChild(fig);
  });
})();
