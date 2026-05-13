(function () {
  "use strict";

  const CACHE_KEY_PREFIX = "vestige";
  const API_BASE_URL = "https://en.wikipedia.org/api/rest_v1/feed/onthisday/all";
  const EXPIRY_MS = 24 * 60 * 60 * 1000;
  const ITEMS_PER_SECTION = 5;

  var purifyAvailable = typeof DOMPurify !== "undefined";
  if (purifyAvailable) {
    DOMPurify.addHook("afterSanitizeAttributes", function (node) {
      if (node.hasAttribute("href")) {
        var href = node.getAttribute("href");
        if (href.indexOf("/wiki/") === 0) {
          node.setAttribute("href", "https://en.wikipedia.org" + href);
        }
      }
    });
  }

  function sanitizeAndLinkify(rawHtml) {
    if (purifyAvailable) {
      return DOMPurify.sanitize(rawHtml);
    }
    var div = document.createElement("div");
    div.textContent = rawHtml;
    return div.innerHTML;
  }

  function copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(function () {});
    } else {
      var textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  }

  function getToday() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return { month, day };
  }

  function cacheKey(month, day) {
    return CACHE_KEY_PREFIX + "-" + month + "-" + day;
  }

  function getCached(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp > EXPIRY_MS) return null;
      return parsed.data;
    } catch {
      return null;
    }
  }

  function setCached(key, data) {
    try {
      const payload = { timestamp: Date.now(), data: data };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch { /* quota exceeded — silently skip */ }
  }

  function cleanExpiredCaches() {
    try {
      const keys = Object.keys(localStorage);
      for (var i = 0; i < keys.length; i++) {
        if (keys[i].indexOf(CACHE_KEY_PREFIX) === 0) {
          var raw = localStorage.getItem(keys[i]);
          if (raw) {
            var parsed = JSON.parse(raw);
            if (Date.now() - parsed.timestamp > EXPIRY_MS) {
              localStorage.removeItem(keys[i]);
            }
          }
        }
      }
    } catch { /* best-effort cleanup */ }
  }

  async function fetchOnThisDay(month, day) {
    const url = API_BASE_URL + "/" + month + "/" + day;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("API returned status " + response.status);
    }
    return response.json();
  }

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text) e.textContent = text;
    return e;
  }

  function renderPage(data, showBadge) {
    var app = document.getElementById("app");
    app.innerHTML = "";

    if (showBadge) {
      var badge = el("span", "cached-badge", "[cached]");
      app.appendChild(badge);
    }

    var titleRow = el("div", "title-row");
    var title = el("h1", "page-title", "Vestige — " + getTodayDateString());
    titleRow.appendChild(title);

    var shareBtn = el("button", "share-btn", "Share");
    shareBtn.setAttribute("aria-label", "Copy page link to clipboard");
    shareBtn.addEventListener("click", function () {
      copyToClipboard(window.location.href);
      shareBtn.textContent = "Copied!";
      shareBtn.classList.add("share-btn--copied");
      setTimeout(function () {
        shareBtn.textContent = "Share";
        shareBtn.classList.remove("share-btn--copied");
      }, 2000);
    });
    titleRow.appendChild(shareBtn);
    app.appendChild(titleRow);

    var hasEvents = data.events && data.events.length > 0;
    var hasBirths = data.births && data.births.length > 0;
    var hasDeaths = data.deaths && data.deaths.length > 0;
    var hasAny = hasEvents || hasBirths || hasDeaths;

    if (!hasAny) {
      var emptyMsg = el("p", "all-empty-message", "Nothing notable recorded for this date — check back tomorrow!");
      var retryBtn = el("button", "retry-btn", "Retry");
      retryBtn.addEventListener("click", init);
      app.appendChild(emptyMsg);
      app.appendChild(retryBtn);
      return;
    }

    renderSection(app, "Events", data.events);
    renderSection(app, "Births", data.births);
    renderSection(app, "Deaths", data.deaths);
  }

  function renderSection(parent, label, items) {
    var section = el("section", "category-section");
    var header = el("h2", "section-header", label);
    section.appendChild(header);

    if (!items || items.length === 0) {
      var empty = el("p", "empty-message", "No notable " + label.toLowerCase() + " recorded for this date.");
      section.appendChild(empty);
    } else {
      var list = el("ul", "event-list");
      var total = items.length;
      var visible = Math.min(total, ITEMS_PER_SECTION);
      var hidden = total - visible;

      for (var i = 0; i < total; i++) {
        var item = items[i];
        var li = el("li", "event-item");
        if (i >= visible) {
          li.setAttribute("hidden", "");
        }
        var year = el("span", "event-year", item.year);
        var text = el("span", "event-text");
        text.innerHTML = sanitizeAndLinkify(item.text);
        li.appendChild(year);
        li.appendChild(text);
        list.appendChild(li);
      }
      section.appendChild(list);

      if (hidden > 0) {
        var showMoreBtn = el("button", "show-more-btn", "Show +" + hidden + " more");
        showMoreBtn.setAttribute("aria-expanded", "false");
        showMoreBtn.setAttribute("aria-label", "Show " + hidden + " more " + label.toLowerCase() + " for " + getTodayDateString());
        showMoreBtn.addEventListener("click", function () {
          showMoreBtn.setAttribute("aria-expanded", "true");
          var hiddenItems = list.querySelectorAll(".event-item[hidden]");
          for (var j = 0; j < hiddenItems.length; j++) {
            hiddenItems[j].removeAttribute("hidden");
          }
          showMoreBtn.remove();
        });
        section.appendChild(showMoreBtn);
      }
    }

    parent.appendChild(section);
  }

  function getTodayDateString() {
    var now = new Date();
    return now.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  }

  function renderError() {
    var app = document.getElementById("app");
    app.innerHTML = "";

    var msg = el("p", "error-message", "Couldn't load today's history.");
    var btn = el("button", "retry-btn", "Retry");
    btn.addEventListener("click", init);
    app.appendChild(msg);
    app.appendChild(btn);
  }

  function renderSkeleton() {
    var app = document.getElementById("app");
    app.innerHTML = "";

    var title = el("h1", "page-title skeleton-text", "Vestige — " + getTodayDateString());
    app.appendChild(title);

    for (var i = 0; i < 3; i++) {
      var section = el("section", "category-section");
      var header = el("h2", "section-header skeleton-text", "Loading...");
      section.appendChild(header);

      var list = el("ul", "event-list");
      for (var j = 0; j < ITEMS_PER_SECTION; j++) {
        var li = el("li", "event-item");
        var year = el("span", "event-year skeleton-block", "");
        var text = el("span", "event-text skeleton-block", "");
        li.appendChild(year);
        li.appendChild(text);
        list.appendChild(li);
      }
      section.appendChild(list);
      app.appendChild(section);
    }
  }

  async function init() {
    var today = getToday();
    var key = cacheKey(today.month, today.day);
    cleanExpiredCaches();

    var cachedData = getCached(key);

    if (cachedData) {
      renderPage(cachedData, true);
    } else {
      renderSkeleton();
    }

    try {
      var data = await fetchOnThisDay(today.month, today.day);
      setCached(key, data);
      renderPage(data, false);
    } catch (_err) {
      if (!cachedData) {
        renderError();
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
