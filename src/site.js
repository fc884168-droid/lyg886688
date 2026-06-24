(function () {
  "use strict";

  var DISCORD = "https://discord.gg/5g3F68rqRX";
  var page = location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll(".links a[data-page]").forEach(function (link) {
    var href = link.getAttribute("href") || "";
    if (href.endsWith(page) || (page === "" && link.dataset.page === "index")) {
      link.classList.add("active");
    }
  });

  document.querySelectorAll(".btn-discord").forEach(function (btn) {
    if (!btn.getAttribute("href")) btn.setAttribute("href", DISCORD);
  });

  window.LYGL = window.LYGL || {};
  window.LYGL.fetchJson = async function (path) {
    var res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error("load failed");
    return res.json();
  };

  document.querySelectorAll(".system-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      var target = tab.dataset.system;
      document.querySelectorAll(".system-tab").forEach(function (item) {
        item.classList.toggle("active", item === tab);
      });
      document.querySelectorAll(".system-panel").forEach(function (panel) {
        panel.classList.toggle("active", panel.id === "system-" + target);
      });
    });
  });

  if (location.hash.length > 1) {
    var hashTarget = location.hash.slice(1);
    var hashTab = document.querySelector('.system-tab[data-system="' + hashTarget + '"]');
    if (hashTab) hashTab.click();
  }
})();
