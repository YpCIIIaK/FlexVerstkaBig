(function () {
  "use strict";

  const root = document.querySelector("[data-stores]");
  if (!root) return;

  const cards = [...root.querySelectorAll("[data-store]")];
  const search = root.querySelector("[data-store-search]");
  const empty = root.querySelector("[data-store-empty]");
  const mapEl = root.querySelector("[data-map]");
  const tooltip = root.querySelector("[data-map-tooltip]");
  const text = (card, sel) => card.querySelector(sel).textContent;
  const lngLat = (el) => el.dataset.coords.split(",").map(Number);
  const CITIES = { "Алматы": [76.9286, 43.238], "Астана": [71.4304, 51.1282], "Шымкент": [69.596, 42.3417] };
  let city = root.querySelector(".select__option.is-selected").textContent.trim();

  const openStatus = (hours) => {
    const m = hours.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!m) return hours;
    const mins = new Date().getHours() * 60 + new Date().getMinutes();
    return mins >= m[1] * 60 + +m[2] && mins < m[3] * 60 + +m[4] ? "Открыто" : "Закрыто";
  };

  let activeId = (cards.find((c) => c.classList.contains("is-active")) || cards[0]).dataset.store;
  let map = null;
  let clusterer = null;
  const points = {};

  const paint = () => Object.entries(points).forEach(([id, p]) => {
    const on = id === activeId;
    p.pin.classList.toggle("is-active", on);
    if (on) p.el.append(tooltip);
    p.marker.update({ zIndex: on ? 10 : 0 });
  });

  const visible = () => cards.filter((c) => !c.parentElement.hidden).map((c) => ({
    type: "Feature",
    id: c.dataset.store,
    geometry: { type: "Point", coordinates: lngLat(c) },
    properties: {},
  }));

  const render = () => { if (clusterer) clusterer.update({ features: visible() }); };

  const select = (id, fromMap) => {
    const card = cards.find((c) => c.dataset.store === id);
    if (!card) return;
    activeId = id;
    cards.forEach((c) => {
      c.classList.toggle("is-active", c === card);
      c.setAttribute("aria-pressed", String(c === card));
    });
    tooltip.querySelector("[data-tooltip-name]").textContent = text(card, ".store__name");
    tooltip.querySelector("[data-tooltip-address]").textContent = text(card, ".store__address");
    tooltip.querySelector("[data-tooltip-meta]").textContent = text(card, ".store__distance") + " • " + openStatus(text(card, ".store__hours"));
    paint();
    if (fromMap) card.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (map) map.update({ location: { center: lngLat(card), zoom: Math.max(map.zoom, 14), duration: 400 } });
  };

  cards.forEach((card) => card.addEventListener("click", () => select(card.dataset.store)));

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

  select(activeId, true);
  filter();

  if (!window.ymaps3) return;

  ymaps3.ready.then(async () => {
    const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } = ymaps3;
    ymaps3.import.registerCdn("https://cdn.jsdelivr.net/npm/{package}", "@yandex/ymaps3-clusterer@0.0.12");
    const { YMapClusterer, clusterByGrid } = await ymaps3.import("@yandex/ymaps3-clusterer");

    tooltip.remove();
    mapEl.querySelector(".map__image")?.remove();

    map = new YMap(mapEl, { location: { center: CITIES[city], zoom: 12 } });
    map.addChild(new YMapDefaultSchemeLayer({ theme: "dark" }));
    map.addChild(new YMapDefaultFeaturesLayer());

    const marker = (f) => {
      const el = document.createElement("div");
      el.className = "map__point";
      const pin = document.createElement("button");
      pin.type = "button";
      pin.className = "map__pin";
      pin.setAttribute("aria-label", text(cards.find((c) => c.dataset.store === f.id), ".store__name"));
      pin.addEventListener("click", () => select(f.id, true));
      el.append(pin);
      const m = new YMapMarker({ coordinates: f.geometry.coordinates }, el);
      points[f.id] = { el, pin, marker: m };
      paint();
      return m;
    };

    const cluster = (coordinates, features) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "map__cluster";
      el.textContent = features.length;
      el.addEventListener("click", () => map.update({ location: { center: coordinates, zoom: map.zoom + 2, duration: 400 } }));
      return new YMapMarker({ coordinates }, el);
    };

    clusterer = new YMapClusterer({ method: clusterByGrid({ gridSize: 64 }), features: visible(), marker, cluster });
    map.addChild(clusterer);
    select(activeId);
  }).catch((e) => console.error("map", e));
})();
