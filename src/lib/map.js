(function () {
  "use strict";

  const root = document.querySelector("[data-stores]");
  if (!root) return;

  const cards = [...root.querySelectorAll("[data-store]")];
  const search = root.querySelector("[data-store-search]");
  const empty = root.querySelector("[data-store-empty]");
  const mapEl = root.querySelector("[data-map]");
  const tooltip = root.querySelector("[data-map-tooltip]");
  const text = (card, sel) => card.querySelector(sel)?.textContent || "";
  const lngLat = (el) => el.dataset.coords.split(",").map(Number);
  const CITIES = { "Алматы": [76.9286, 43.238], "Астана": [71.4304, 51.1282], "Шымкент": [69.596, 42.3417] };
  let city = root.querySelector(".select__option.is-selected").textContent.trim();

  const openStatus = (hours) => {
    const m = hours.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!m) return hours;
    const mins = new Date().getHours() * 60 + new Date().getMinutes();
    return mins >= m[1] * 60 + +m[2] && mins < m[3] * 60 + +m[4] ? (/^\/kz(\/|$)/.test(location.pathname) ? "Ашық" : "Открыто") : (/^\/kz(\/|$)/.test(location.pathname) ? "Жабық" : "Закрыто");
  };

  let activeId = (cards.find((c) => c.classList.contains("is-active")) || cards[0]).dataset.store;
  let map = null;
  const points = {};

  const paint = () => Object.entries(points).forEach(([id, p]) => {
    const on = id === activeId;
    p.pin.classList.toggle("is-active", on);
    if (on && tooltip.parentElement !== p.el) p.el.append(tooltip);
    if (p.on !== on) {
      p.on = on;
      p.marker.update({ zIndex: on ? 10 : 0 });
    }
  });

  const listEl = root.querySelector("[data-store-list]");
  const fitScroll = () => listEl.parentElement.classList.toggle("is-fit", listEl.scrollHeight <= listEl.clientHeight + 1);
  window.addEventListener("resize", fitScroll);

  const render = () => {
    fitScroll();
    if (!map) return;
    cards.forEach((c) => {
      const p = points[c.dataset.store];
      const show = !c.parentElement.hidden;
      if (show && !p.shown) map.addChild(p.marker);
      if (!show && p.shown) map.removeChild(p.marker);
      p.shown = show;
    });
  };

  const select = (id, fromMap) => {
    const card = cards.find((c) => c.dataset.store === id);
    if (!card) return;
    activeId = id;
    cards.forEach((c) => {
      c.classList.toggle("is-active", c === card);
      c.setAttribute("aria-pressed", String(c === card));
    });
    tooltip.hidden = false;
    tooltip.querySelector("[data-tooltip-name]").textContent = text(card, ".store__name");
    tooltip.querySelector("[data-tooltip-address]").textContent = text(card, ".store__address");
    const meta = [text(card, ".store__distance"), openStatus(text(card, ".store__hours"))].filter(Boolean).join(" • ");
    tooltip.querySelector("[data-tooltip-meta]").textContent = meta;
    tooltip.querySelector("[data-tooltip-meta]").hidden = !meta;
    paint();
    if (fromMap) {
      const list = root.querySelector("[data-store-list]");
      list.scrollTo({ top: card.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop - 16, behavior: "smooth" });
    }
    if (map) map.update({ location: { center: lngLat(card), zoom: Math.max(map.zoom, 14), duration: 400 } });
  };

  cards.forEach((card) => card.addEventListener("click", () => select(card.dataset.store)));

  tooltip.querySelector("[data-tooltip-close]").addEventListener("click", (e) => {
    e.stopPropagation();
    tooltip.hidden = true;
  });

  const filter = () => {
    const q = search.value.trim().toLowerCase();
    cards.forEach((card) => { card.parentElement.hidden = card.dataset.city !== city || !card.textContent.toLowerCase().includes(q); });
    const first = cards.find((c) => !c.parentElement.hidden);
    empty.hidden = Boolean(first);
    if (first && (q || cards.find((c) => c.dataset.store === activeId).parentElement.hidden)) select(first.dataset.store, true);
    render();
  };

  search.addEventListener("input", filter);

  root.querySelectorAll(".select__option").forEach((o) => o.addEventListener("click", () => {
    city = o.textContent.trim();
    filter();
    if (map) map.update({ location: { center: CITIES[city], zoom: 12, duration: 400 } });
  }));

  select(activeId);
  filter();

  if (!window.ymaps3) return;

  ymaps3.ready.then(() => {
    const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } = ymaps3;
    tooltip.remove();
    mapEl.querySelector(".map__image")?.remove();

    map = new YMap(mapEl, { location: { center: CITIES[city], zoom: 12 } });
    map.addChild(new YMapDefaultSchemeLayer({ theme: "dark" }));
    map.addChild(new YMapDefaultFeaturesLayer());

    cards.forEach((c) => {
      const id = c.dataset.store;
      const el = document.createElement("div");
      el.className = "map__point";
      const pin = document.createElement("button");
      pin.type = "button";
      pin.className = "map__pin";
      pin.setAttribute("aria-label", text(c, ".store__name"));
      pin.addEventListener("click", () => select(id, true));
      el.append(pin);
      points[id] = { el, pin, marker: new YMapMarker({ coordinates: lngLat(c) }, el), shown: false, on: null };
    });

    render();
    select(activeId);
  }).catch((e) => console.error("map", e));
})();
