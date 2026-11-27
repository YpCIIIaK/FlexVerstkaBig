(function () {
  "use strict";

  const KZ = /^\/kz(\/|$)/.test(location.pathname);
  const base = KZ ? "/kz" : "";
  const T = KZ ? {
    placeholder: "Сайт бойынша іздеу", all: "Барлық іздеу нәтижелері", empty: "Ештеңе табылмады", close: "Жабу", clear: "Тазалау",
    device: "FLEX құрылғысы", stick: "FAIIM стиктері", color: "Түсі:", taste: "Дәмі:", found: (n) => `${n} нәтиже табылды`,
    goods: "Тауарлар", news: "Жаңалықтар", showAll: (n) => `Барлығын көрсету (${n})`, nothing: "Сұрау бойынша ештеңе табылмады. Басқа сөзді байқап көріңіз.",
  } : {
    placeholder: "Поиск по сайту", all: "Все результаты поиска", empty: "Ничего не найдено", close: "Закрыть", clear: "Очистить",
    device: "Устройство FLEX", stick: "Стики FAIIM", color: "Цвет:", taste: "Вкус:",
    found: (n) => `Найдено ${n} ${n % 10 === 1 && n % 100 !== 11 ? "результат" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "результата" : "результатов"}`,
    goods: "Товары", news: "Новости", showAll: (n) => `Показать все (${n})`, nothing: "По вашему запросу ничего не найдено. Попробуйте другой запрос.",
  };

  const PRODUCTS = [
    { kind: "device", name: "Фиолетовый Песок", key: "violet", img: "/assets/images/device-violet-002.webp", price: 21990, href: "/device?color=violet" },
    { kind: "device", name: "Синий Металлик", key: "blue", img: "/assets/images/device-blue-002.webp", price: 21990, href: "/device?color=blue" },
    { kind: "device", name: "Серый Металлик", key: "gray", img: "/assets/images/device-silver-002.webp", price: 21990, href: "/device?color=gray" },
    { kind: "device", name: "Бежевый Песок", key: "beige", img: "/assets/images/device-beige-002.webp", price: 21990, href: "/device?color=beige" },
    { kind: "stick", name: "Sunshine Mix", key: "sunshine", img: "/assets/images/sunshine-mix-1.webp", price: 1290, href: "/stick?flavour=sunshine", text: "Табачный бленд с нотами тропических фруктов и капсулой" },
    { kind: "stick", name: "Purple Mix", key: "purple", img: "/assets/images/purple-mix-1.webp", price: 1290, href: "/stick?flavour=purple", text: "Табачный бленд с ягодными нотами и капсулой с ментолом" },
    { kind: "stick", name: "Yellow Mix", key: "yellow", img: "/assets/images/yellow-mix-1.webp", price: 1290, href: "/stick?flavour=yellow", text: "Табачный бленд с фруктовыми нотами и цитрусовой капсулой" },
    { kind: "stick", name: "Skygreen", key: "skygreen", img: "/assets/images/skygreen-1.webp", price: 1290, href: "/stick?flavour=skygreen", text: "Классический табачный бленд с мятным акцентом" },
  ];

  const NEWS = [
    { tag: "Новости компании", date: "16 ноября 2026", title: "Первый в мире флагманский магазин", text: "Казахстан стал первой страной, где бренд FLEX представил собственное официальное пространство.", img: "/assets/images/newsImg/actual-1.webp", href: "/news/flagship-almaty" },
    { tag: "Новости компании", date: "16 ноября 2026", title: "FLEX на SPEKTO", text: "В ноябре FLEX стал частью одного из самых ожидаемых музыкальных событий сезона - фестиваля SPEKTO.", img: "/assets/images/newsImg/news-5.webp", href: "/news/flex-spekto" },
    { tag: "Бренд", date: "", title: "Минимализм как философия: история создания уникального дизайна FLEX", text: "Улучшенная стабильность температуры позволяет раскрывать оттенки вкуса еще мягче и насыщеннее.", img: "/assets/images/newsImg/stub-2.webp", href: "" },
    { tag: "Дизайн", date: "", title: "Искусство простоты: как FLEX сочетает функциональность и эстетику в одном продукте", text: "Инновационные материалы и продуманные формы обеспечивают долговечность и комфорт использования в любых условиях.", img: "/assets/images/newsImg/stub-3.webp", href: "" },
    { tag: "Технологии", date: "", title: "Передовые решения FLEX для идеального баланса температуры и вкуса", text: "Интеллектуальные датчики и адаптивные алгоритмы гарантируют стабильность и точность в каждом применении.", img: "/assets/images/newsImg/stub-4.webp", href: "" },
  ];

  const norm = (s) => s.toLowerCase().replace(/ё/g, "е").trim();
  const words = (p) => norm([p.name, p.kind === "device" ? "устройство flex флекс девайс" : "стики faiim фаим стик", p.text || ""].join(" "));

  const api = window.flexSearchApi || {
    search: async (q) => {
      const n = norm(q);
      if (!n) return { products: [], news: [] };
      const parts = n.split(/\s+/);
      const hit = (s) => parts.every((w) => s.includes(w));
      return {
        products: PRODUCTS.filter((p) => hit(words(p))),
        news: NEWS.filter((x) => hit(norm(`${x.title} ${x.text} ${x.tag} flex`))),
      };
    },
  };

  const money = (n) => n.toLocaleString("ru-RU").replace(/ /g, " ") + " ₸";
  const url = (q) => `${base}/search?q=${encodeURIComponent(q)}`;
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const icon = '<img src="/assets/images/search.svg" alt="" width="20" height="20" />';
  const cross = '<img src="/assets/images/close.svg" alt="" width="20" height="20" />';

  const panel = document.createElement("div");
  panel.className = "mini-search";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", T.placeholder);
  panel.innerHTML = `
    <form class="mini-search__bar" role="search">
      <div class="search-field">
        ${icon}
        <input class="search-field__input" type="search" name="q" autocomplete="off" placeholder="${T.placeholder}" aria-label="${T.placeholder}" />
      </div>
      <button class="mini-search__close" type="button" aria-label="${T.close}">${cross}</button>
    </form>
    <ul class="mini-search__list"></ul>
    <p class="mini-search__empty" hidden>${T.empty}</p>
    <a class="mini-search__all" href="#" hidden>${T.all}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg></a>`;
  document.body.append(panel);

  const backdrop = document.createElement("div");
  backdrop.className = "mini-search__backdrop";
  backdrop.hidden = true;
  document.body.append(backdrop);

  const form = panel.querySelector("form");
  const input = panel.querySelector("input");
  const list = panel.querySelector(".mini-search__list");
  const empty = panel.querySelector(".mini-search__empty");
  const all = panel.querySelector(".mini-search__all");
  let active = -1;
  let req = 0;

  const row = (p) => `
    <li><a class="mini-search__item" href="${base}${p.href}">
      <img class="mini-search__img mini-search__img--${p.kind}" src="${p.img}" alt="" />
      <span class="mini-search__info"><b>${p.kind === "device" ? T.device : T.stick}</b><small>${p.kind === "device" ? T.color : T.taste} ${esc(p.name)}</small></span>
      <span class="mini-search__price">${money(p.price)}</span>
    </a></li>`;

  const highlight = (i) => {
    const items = [...list.querySelectorAll(".mini-search__item")];
    active = items.length ? (i + items.length) % items.length : -1;
    items.forEach((a, k) => a.classList.toggle("is-active", k === active));
  };

  const run = async () => {
    const q = input.value;
    const id = ++req;
    const r = await api.search(q);
    if (id !== req) return;
    const show = norm(q).length > 0;
    list.innerHTML = r.products.slice(0, 3).map(row).join("");
    empty.hidden = !show || r.products.length + r.news.length > 0;
    all.hidden = !show || r.products.length + r.news.length === 0;
    all.href = url(q.trim());
    highlight(0);
  };

  let timer = 0;
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(run, 150); });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); highlight(active + 1); }
    if (e.key === "ArrowUp") { e.preventDefault(); highlight(active - 1); }
    if (e.key === "Escape") close();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const items = list.querySelectorAll(".mini-search__item");
    if (active >= 0 && items[active] && input.dataset.nav === "1") { location.href = items[active].href; return; }
    if (input.value.trim()) location.href = url(input.value.trim());
  });
  input.addEventListener("keydown", (e) => { input.dataset.nav = e.key === "ArrowDown" || e.key === "ArrowUp" ? "1" : input.dataset.nav === "1" && e.key === "Enter" ? "1" : "0"; }, true);

  const open = () => {
    panel.hidden = false;
    backdrop.hidden = false;
    input.focus();
    input.select();
    if (input.value) run();
  };
  const close = () => { panel.hidden = true; backdrop.hidden = true; };

  panel.querySelector(".mini-search__close").addEventListener("click", close);
  backdrop.addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) close(); });
  document.querySelectorAll("[data-search-open]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); open(); }));

  const page = document.querySelector("[data-search-page]");
  if (!page) return;

  const pInput = page.querySelector("[data-search-input]");
  const pClear = page.querySelector("[data-search-clear]");
  const count = page.querySelector("[data-search-count]");
  const goods = page.querySelector("[data-search-goods]");
  const news = page.querySelector("[data-search-news]");
  const none = page.querySelector("[data-search-none]");
  const pForm = page.querySelector("[data-search-form]");

  const card = (p) => `
    <article class="product-card${p.kind === "device" ? " product-card--device" : ""}">
      <div class="product-card__gallery"><img class="product-card__img is-active" src="${p.img}" alt="${esc(p.name)}" loading="lazy" /></div>
      <div class="product-card__info">
        <h3 class="product-card__title${p.kind === "device" ? " product-card__title--plain" : ""}"><a href="${base}${p.href}">${esc(p.name)}</a></h3>
        ${p.text ? `<p class="product-card__text">${esc(p.text)}</p>` : ""}
      </div>
    </article>`;

  const newsCard = (n) => `
    <article class="search-news">
      <img class="search-news__img" src="${n.img}" alt="" loading="lazy" />
      <div class="search-news__body">
        <div class="search-news__meta"><span class="search-news__tag">${esc(n.tag)}</span><span>${esc(n.date)}</span></div>
        <h3 class="search-news__title">${n.href ? `<a href="${base}${n.href}">${esc(n.title)}</a>` : esc(n.title)}</h3>
        <p class="search-news__text">${esc(n.text)}</p>
      </div>
    </article>`;

  const section = (el, title, items, render, limit) => {
    el.hidden = !items.length;
    if (!items.length) return;
    el.querySelector("h2").textContent = title;
    const more = el.querySelector("[data-search-more]");
    more.hidden = items.length <= limit;
    more.querySelector("span").textContent = T.showAll(items.length);
    const grid = el.querySelector("[data-search-grid]");
    const draw = (n) => { grid.innerHTML = items.slice(0, n).map(render).join(""); };
    draw(limit);
    more.onclick = () => { draw(items.length); more.hidden = true; };
  };

  const render = async () => {
    const q = pInput.value.trim();
    pClear.hidden = !q;
    const r = await api.search(q);
    const total = r.products.length + r.news.length;
    count.textContent = q ? T.found(total) : "";
    none.hidden = !q || total > 0;
    section(goods, T.goods, r.products, card, 4);
    section(news, T.news, r.news, newsCard, 3);
  };

  pInput.value = new URLSearchParams(location.search).get("q") || "";
  pForm.addEventListener("submit", (e) => {
    e.preventDefault();
    history.replaceState(null, "", url(pInput.value.trim()));
    render();
  });
  let t2 = 0;
  pInput.addEventListener("input", () => { clearTimeout(t2); t2 = setTimeout(() => { history.replaceState(null, "", url(pInput.value.trim())); render(); }, 250); });
  pClear.addEventListener("click", () => { pInput.value = ""; render(); pInput.focus(); });
  render();
})();
