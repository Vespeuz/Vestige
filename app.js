(function () {
  "use strict";

  var CACHE_KEY_PREFIX = "vestige";
  var API_BASE_URL = "https://en.wikipedia.org/api/rest_v1/feed/onthisday/all";
  var EXPIRY_MS = 24 * 60 * 60 * 1000;
  var MAX_CARDS_PER_CAROUSEL = 20;

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
    var now = new Date();
    var month = String(now.getMonth() + 1).padStart(2, "0");
    var day = String(now.getDate()).padStart(2, "0");
    return { month: month, day: day };
  }

  function cacheKey(month, day) {
    return CACHE_KEY_PREFIX + "-" + month + "-" + day;
  }

  function getCached(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp > EXPIRY_MS) return null;
      return parsed.data;
    } catch (_e) {
      return null;
    }
  }

  function setCached(key, data) {
    try {
      var payload = { timestamp: Date.now(), data: data };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (_e) {}
  }

  function cleanExpiredCaches() {
    try {
      var keys = Object.keys(localStorage);
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
    } catch (_e) {}
  }

  async function fetchOnThisDay(month, day) {
    var url = API_BASE_URL + "/" + month + "/" + day;
    var response = await fetch(url);
    if (!response.ok) {
      throw new Error("API returned status " + response.status);
    }
    return response.json();
  }

  async function fetchPageImage(title) {
    if (!title) return null;
    try {
      var encoded = encodeURIComponent(title);
      var url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + encoded;
      var res = await fetch(url);
      if (!res.ok) return null;
      var data = await res.json();
      if (data.thumbnail && data.thumbnail.source) {
        return data.thumbnail.source;
      }
      if (data.originalimage && data.originalimage.source) {
        return data.originalimage.source;
      }
      return null;
    } catch (_e) {
      return null;
    }
  }

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function renderPage(data, showBadge) {
    var app = document.getElementById("app");
    app.innerHTML = "";

    if (showBadge) {
      var badge = el("span", "cached-badge", "[cached]");
      app.appendChild(badge);
    }

    var headerWrap = el("div", "page-header");

    var titleRow = el("div", "title-row");
    var title = el("h1", "page-title");
    title.appendChild(document.createTextNode("Vestige"));
    var dateSpan = el("span", "page-date", getTodayDateString());
    title.appendChild(dateSpan);
    titleRow.appendChild(title);

    var shareBtn = el("button", "share-btn", "SHARE");
    shareBtn.setAttribute("aria-label", "Copy page link to clipboard");
    shareBtn.addEventListener("click", function () {
      copyToClipboard(window.location.href);
      shareBtn.textContent = "COPIED";
      shareBtn.classList.add("share-btn--copied");
      setTimeout(function () {
        shareBtn.textContent = "SHARE";
        shareBtn.classList.remove("share-btn--copied");
      }, 2000);
    });
    titleRow.appendChild(shareBtn);
    headerWrap.appendChild(titleRow);

    var ornament = document.createElement("hr");
    ornament.className = "title-ornament";
    headerWrap.appendChild(ornament);

    app.appendChild(headerWrap);

    var hasEvents = data.events && data.events.length > 0;
    var hasBirths = data.births && data.births.length > 0;
    var hasDeaths = data.deaths && data.deaths.length > 0;
    var hasAny = hasEvents || hasBirths || hasDeaths;

    if (!hasAny) {
      var emptyMsg = el("p", "all-empty-message", "Nothing notable recorded for this date.");
      var retryBtn = el("button", "retry-btn", "RETRY");
      retryBtn.addEventListener("click", init);
      app.appendChild(emptyMsg);
      app.appendChild(retryBtn);
      return;
    }

    renderCarousel(app, "Events", data.events);
    renderCarousel(app, "Births", data.births);
    renderCarousel(app, "Deaths", data.deaths);
  }

  function renderCarousel(parent, label, items) {
    var section = el("section", "carousel-section");

    var header = el("h2", "carousel-header", label);
    section.appendChild(header);

    if (!items || items.length === 0) {
      var empty = el("p", "empty-message", "No notable " + label.toLowerCase() + " recorded for this date.");
      section.appendChild(empty);
      parent.appendChild(section);
      return;
    }

    var wrapper = el("div", "carousel-wrapper");
    var carouselEl = el("div", "carousel");

    var limit = Math.min(items.length, MAX_CARDS_PER_CAROUSEL);
    var imageQueue = [];

    for (var i = 0; i < limit; i++) {
      var item = items[i];
      var thumbnailUrl = getThumbnailUrl(item);
      var pageTitle = getPageTitle(item);
      var cardResult = createCard(item, i);
      var cell = el("div", "carousel-cell");
      cell.appendChild(cardResult.card);
      carouselEl.appendChild(cell);

      if (thumbnailUrl) {
        cardResult.img.src = thumbnailUrl;
        if (cardResult.img.complete) {
          cardResult.onImageReady();
        }
      } else if (cardResult.img && pageTitle) {
        imageQueue.push({ img: cardResult.img, pageTitle: pageTitle, onImageReady: cardResult.onImageReady });
      }
    }

    wrapper.appendChild(carouselEl);

    var arrowLeft = el("button", "carousel-arrow carousel-arrow--left", "\u2039");
    arrowLeft.setAttribute("aria-label", "Scroll " + label.toLowerCase() + " left");
    var arrowRight = el("button", "carousel-arrow carousel-arrow--right", "\u203A");
    arrowRight.setAttribute("aria-label", "Scroll " + label.toLowerCase() + " right");

    wrapper.appendChild(arrowLeft);
    wrapper.appendChild(arrowRight);

    section.appendChild(wrapper);
    parent.appendChild(section);

    requestAnimationFrame(function () {
      var flickityAvailable = typeof Flickity !== "undefined";
      if (!flickityAvailable) {
        return;
      }

      var flkty = new Flickity(carouselEl, {
        cellAlign: "center",
        contain: false,
        wrapAround: limit >= 4,
        pageDots: false,
        prevNextButtons: false,
        draggable: true,
        freeScroll: false,
        selectedAttraction: 0.025,
        friction: 0.28
      });

      arrowLeft.addEventListener("click", function () {
        flkty.previous();
      });
      arrowRight.addEventListener("click", function () {
        flkty.next();
      });
    });

    fetchImageBatch(imageQueue);
  }

  function getThumbnailUrl(item) {
    if (item.pages && item.pages.length > 0) {
      var page = item.pages[0];
      if (page.thumbnail && page.thumbnail.source) {
        return page.thumbnail.source;
      }
      if (page.originalimage && page.originalimage.source) {
        return page.originalimage.source;
      }
    }
    return null;
  }

  function getPageTitle(item) {
    if (item.pages && item.pages.length > 0 && item.pages[0].title) {
      return item.pages[0].title;
    }
    return null;
  }

  function createCard(item, index) {
    var card = el("article", "card");
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "group");
    card.setAttribute("aria-label", "Event from " + item.year);

    var inner = el("div", "card-inner");
    inner.style.animationDelay = (index * 0.05) + "s";

    var media = el("div", "card-media");

    var fallback = el("div", "card-media-fallback");
    var lines = el("div", "card-media-fallback-lines");
    for (var k = 0; k < 5; k++) {
      lines.appendChild(el("span"));
    }
    fallback.appendChild(lines);
    media.appendChild(fallback);

    var img = document.createElement("img");
    img.className = "card-media-img";
    img.alt = "";

    function onImageReady() {
      img.classList.add("loaded");
      fallback.classList.add("hidden");
    }

    img.addEventListener("load", onImageReady);
    img.addEventListener("error", function () {
      img.remove();
    });

    media.appendChild(img);

    inner.appendChild(media);

    var body = el("div", "card-body");
    var year = el("span", "card-year", String(item.year));
    body.appendChild(year);

    var text = el("p", "card-text");
    text.innerHTML = sanitizeAndLinkify(item.text);
    body.appendChild(text);
    inner.appendChild(body);

    card.appendChild(inner);

    return { card: card, img: img, onImageReady: onImageReady };
  }

  function fetchImageBatch(queue) {
    var limit = Math.min(queue.length, 12);
    for (var i = 0; i < limit; i++) {
      var entry = queue[i];
      fetchPageImage(entry.pageTitle).then(function (imageUrl) {
        if (imageUrl) {
          entry.img.src = imageUrl;
          if (entry.img.complete) {
            entry.onImageReady();
          }
        }
      });
    }
  }

  function getTodayDateString() {
    var now = new Date();
    return now.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  }

  function renderError() {
    var app = document.getElementById("app");
    app.innerHTML = "";

    var msg = el("p", "error-message", "Couldn't load today's history.");
    var btn = el("button", "retry-btn", "RETRY");
    btn.addEventListener("click", init);
    app.appendChild(msg);
    app.appendChild(btn);
  }

  function renderSkeleton() {
    var app = document.getElementById("app");
    app.innerHTML = "";

    var title = el("h1", "page-title skeleton-text", "VESTIGE");
    app.appendChild(title);

    for (var i = 0; i < 3; i++) {
      var section = el("section", "carousel-section");

      var header = el("div", "carousel-header");
      var headerText = el("span", "skeleton-text");
      headerText.style.width = "60px";
      headerText.style.height = "11px";
      header.appendChild(headerText);
      section.appendChild(header);

      var carouselEl = el("div", "carousel");
      for (var j = 0; j < 4; j++) {
        var cell = el("div", "carousel-cell");
        var card = el("div", "card");
        card.style.animation = "none";
        card.style.opacity = "1";

        var inner = el("div", "card-inner");
        inner.style.borderColor = "rgba(231, 222, 209, 0.1)";

        var media = el("div", "card-media");
        media.style.borderBottomColor = "rgba(231, 222, 209, 0.1)";
        var skBlock = el("div");
        skBlock.style.width = "100%";
        skBlock.style.height = "100%";
        skBlock.style.background = "#1a1a1a";
        skBlock.style.animation = "shimmer 2s ease-in-out infinite";
        media.appendChild(skBlock);
        inner.appendChild(media);

        var body = el("div", "card-body");
        var yr = el("div", "skeleton-text");
        yr.style.width = "30px";
        yr.style.height = "9px";
        yr.style.marginBottom = "5px";
        body.appendChild(yr);
        var l1 = el("div", "skeleton-text");
        l1.style.width = "90%";
        l1.style.height = "10px";
        l1.style.marginBottom = "4px";
        body.appendChild(l1);
        var l2 = el("div", "skeleton-text");
        l2.style.width = "75%";
        l2.style.height = "10px";
        l2.style.marginBottom = "4px";
        body.appendChild(l2);
        var l3 = el("div", "skeleton-text");
        l3.style.width = "50%";
        l3.style.height = "10px";
        body.appendChild(l3);

        inner.appendChild(body);
        card.appendChild(inner);
        cell.appendChild(card);
        carouselEl.appendChild(cell);
      }
      section.appendChild(carouselEl);
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
