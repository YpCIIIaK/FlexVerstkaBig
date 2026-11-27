(function () {
  "use strict";

  const KZ = /^\/kz(\/|$)/.test(location.pathname);
  const base = KZ ? "/kz" : "";
  const KEY = "flex_cart";

  const T = KZ ? {
    device: "FLEX құрылғысы", stick: "FAIIM стиктері", set: "Бастапқы жиынтық", color: "Түсі:", taste: "Дәмі:", setOf: "Жиынтық құрамы:",
    remove: "Жою", pack: (n) => `${n} қорап`, items: (n) => `${n} тауар`, added: "Себетке қосылды",
    calc: "рәсімдеу кезінде есептеледі", free: "Тегін",
    tierHigh: "4 000 ₸ дейінгі тапсырыс үшін жеткізудің жоғары тарифі қолданылады.",
    tierStd: "4 000 ₸ бастап 11 999 ₸ дейінгі тапсырыс үшін жеткізудің стандартты тарифі қолданылады.",
    tierFree: "12 000 ₸ бастап тапсырыс үшін жеткізу тегін.",
    setNote: "Бастапқы жиынтыққа құрылғы кіреді. Тапсырыстағы екінші құрылғы қайта сатып алу бағасымен: 11 900 ₸.",
  } : {
    device: "Устройство FLEX", stick: "Стики FAIIM", set: "Стартовый набор", color: "Цвет:", taste: "Вкус:", setOf: "Состав набора:",
    remove: "Удалить", pack: (n) => `${n} ${n === 1 ? "пачка" : n < 5 ? "пачки" : "пачек"}`,
    items: (n) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "товар" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "товара" : "товаров"}`,
    added: "Добавлено в корзину", calc: "рассчитывается при оформлении", free: "Бесплатно",
    tierHigh: "При заказе до 4 000 ₸ действует повышенный тариф доставки.",
    tierStd: "При заказе от 4 000 ₸ до 11 999 ₸ действует стандартный тариф доставки.",
    tierFree: "При заказе от 12 000 ₸ доставка бесплатная.",
    setNote: "Стартовый набор уже включает устройство. Второе устройство в заказе по цене повторной покупки: 11 900 ₸.",
  };

  const DEVICES = {
    violet: { name: "Фиолетовый Песок", img: "/assets/images/device-violet-002.webp" },
    blue: { name: "Синий Металлик", img: "/assets/images/device-blue-002.webp" },
    gray: { name: "Серый Металлик", img: "/assets/images/device-silver-002.webp" },
    beige: { name: "Бежевый Песок", img: "/assets/images/device-beige-002.webp" },
  };
  const STICKS = {
    sunshine: { name: "Sunshine Mix", img: "/assets/images/sunshine-mix-1.webp" },
    purple: { name: "Purple Mix", img: "/assets/images/purple-mix-1.webp" },
    yellow: { name: "Yellow Mix", img: "/assets/images/yellow-mix-1.webp" },
    skygreen: { name: "Skygreen", img: "/assets/images/skygreen-1.webp" },
  };
  const PRICE = { device: 21990, deviceSecond: 11900, stick: 1290, set: 6900 };
  const DELIVERY = { high: 2000, std: 1080 };

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} badge(); };

  const count = (cart) => cart.reduce((s, i) => s + i.qty, 0);

  const badge = () => {
    const n = count(read());
    document.querySelectorAll("[data-cart-count]").forEach((b) => { b.textContent = n; b.hidden = !n; });
  };

  const add = (item) => {
    const cart = read();
    const id = item.kind + ":" + item.key + (item.pack ? ":" + item.pack : "");
    const found = cart.find((i) => i.id === id);
    if (found) found.qty += 1;
    else cart.push({ id, qty: 1, ...item });
    write(cart);
  };

  const flash = (btn) => {
    const prev = btn.innerHTML;
    btn.textContent = T.added;
    btn.disabled = true;
    setTimeout(() => { btn.innerHTML = prev; btn.disabled = false; }, 1200);
  };

  const param = (n) => new URLSearchParams(location.search).get(n);
  const activeSwatch = () => document.querySelector(".swatch.is-active")?.dataset.flavour;

  document.querySelectorAll('.header__cart').forEach((a) => a.setAttribute("href", `${base}/cart`));

  document.querySelectorAll("[data-add-to-cart]").forEach((btn) => btn.addEventListener("click", () => {
    const isDevice = Boolean(document.querySelector(".device")) && !document.querySelector(".set-page");
    const key = activeSwatch() || param(isDevice ? "color" : "flavour") || (isDevice ? "violet" : "sunshine");
    add({ kind: isDevice ? "device" : "stick", key });
    flash(btn);
  }));

  document.querySelectorAll(".set-cta__cart, .set-cta__buy").forEach((btn) => btn.addEventListener("click", () => {
    const pack = document.querySelector("[data-pack] .is-active")?.dataset.packValue || "purple";
    add({ kind: "set", key: activeSwatch() || param("color") || "violet", pack });
    if (btn.classList.contains("set-cta__buy")) location.href = `${base}/cart`;
    else flash(btn);
  }));

  badge();
  window.addEventListener("storage", (e) => { if (e.key === KEY) badge(); });

  const priced = (cart) => {
    const hasSet = cart.some((i) => i.kind === "set");
    return cart.map((i) => {
      const unit = i.kind === "device" && hasSet ? PRICE.deviceSecond : PRICE[i.kind];
      return { ...i, unit, total: unit * i.qty };
    });
  };
  const totals = (cart) => {
    const ls = priced(cart);
    const goods = ls.reduce((s, i) => s + i.total, 0);
    const hasSet = cart.some((i) => i.kind === "set");
    let delivery = 0;
    let tier = "";
    if (!hasSet && goods < 4000) { delivery = DELIVERY.high; tier = T.tierHigh; }
    else if (!hasSet && goods < 12000) { delivery = DELIVERY.std; tier = T.tierStd; }
    else if (!hasSet) tier = T.tierFree;
    return { lines: ls, qty: count(cart), goods, delivery, tier, hasSet, total: goods + delivery };
  };
  window.flexCart = { read, write, totals, DEVICES, STICKS, T };

  const page = document.querySelector("[data-cart-page]");
  if (!page) return;

  const demo = param("cart");
  if (demo === "empty") write([]);
  if (demo === "filled") write([
    { id: "device:violet", kind: "device", key: "violet", qty: 1 },
    { id: "device:blue", kind: "device", key: "blue", qty: 1 },
    { id: "stick:skygreen", kind: "stick", key: "skygreen", qty: 1 },
  ]);
  if (demo === "set") write([
    { id: "set:violet:purple", kind: "set", key: "violet", pack: "purple", qty: 1 },
    { id: "device:blue", kind: "device", key: "blue", qty: 1 },
  ]);
  if (demo === "sticks") write([{ id: "stick:purple", kind: "stick", key: "purple", qty: 2 }]);

  const money = (n) => n.toLocaleString("ru-RU").replace(/ /g, " ") + " ₸";
  const $ = (s) => page.querySelector(s);
  const list = $("[data-cart-list]");

  const lines = (cart) => {
    const hasSet = cart.some((i) => i.kind === "set");
    return cart.map((i) => {
      let unit = PRICE[i.kind];
      if (i.kind === "device" && hasSet) unit = PRICE.deviceSecond;
      return { ...i, unit, total: unit * i.qty };
    });
  };

  const setParts = (i) => {
    const packs = { sunshine: 1, purple: 1, yellow: 1, skygreen: 1 };
    packs[i.pack] = (packs[i.pack] || 0) + 1;
    return [`${T.device}, ${DEVICES[i.key].name}`, ...Object.keys(STICKS).map((k) => `${T.stick} ${STICKS[k].name}, ${T.pack(packs[k])}`)];
  };

  const itemHtml = (i) => {
    const d = i.kind === "stick" ? STICKS[i.key] : DEVICES[i.key];
    const img = i.kind === "set" ? "/assets/images/starter-set-hero.webp?v=2" : d.img;
    const title = i.kind === "set" ? T.set : i.kind === "device" ? T.device : T.stick;
    const sub = i.kind === "set"
      ? `<p class="cart-item__sub">${T.setOf}</p><ul class="cart-item__parts">${setParts(i).map((p) => `<li>${p}</li>`).join("")}</ul>`
      : `<p class="cart-item__sub">${i.kind === "device" ? T.color : T.taste} ${d.name}</p>`;
    return `
      <article class="cart-item" data-id="${i.id}">
        <div class="cart-item__media cart-item__media--${i.kind}"><img src="${img}" alt="" /></div>
        <div class="cart-item__info">
          <h3 class="cart-item__title">${title}</h3>
          ${sub}
          <button class="cart-item__remove" type="button" data-remove>${T.remove}</button>
        </div>
        <div class="cart-item__side">
          <strong class="cart-item__price">${money(i.total)}</strong>
          <div class="qty">
            <button class="qty__btn" type="button" aria-label="−" data-dec><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" /></svg></button>
            <span class="qty__value">${i.qty}</span>
            <button class="qty__btn" type="button" aria-label="+" data-inc><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M8 3v10" /></svg></button>
          </div>
        </div>
      </article>`;
  };

  const render = () => {
    const cart = read();
    const ls = lines(cart);
    const n = count(cart);
    const goods = ls.reduce((s, i) => s + i.total, 0);
    const hasSet = cart.some((i) => i.kind === "set");
    $("[data-cart-empty]").hidden = n > 0;
    $("[data-cart-full]").hidden = n === 0;
    $("[data-cart-count-title]").textContent = n ? T.items(n) : "";
    if (!n) return;
    $("[data-cart-set-note]").hidden = !(hasSet && cart.some((i) => i.kind === "device"));
    $("[data-cart-set-note]").textContent = T.setNote;
    list.innerHTML = ls.map(itemHtml).join("");

    let delivery = 0;
    let tier = "";
    if (hasSet) { tier = ""; }
    else if (goods < 4000) { delivery = DELIVERY.high; tier = T.tierHigh; }
    else if (goods < 12000) { delivery = DELIVERY.std; tier = T.tierStd; }
    else { tier = T.tierFree; }

    $("[data-sum-qty]").textContent = n;
    $("[data-sum-goods]").textContent = money(goods);
    $("[data-sum-delivery]").textContent = hasSet ? T.calc : delivery ? money(delivery) : T.free;
    $("[data-sum-tier]").hidden = !tier;
    $("[data-sum-tier-text]").textContent = tier;
    $("[data-sum-total]").textContent = money(goods + delivery);
  };

  list.addEventListener("click", (e) => {
    const row = e.target.closest("[data-id]");
    if (!row) return;
    const cart = read();
    const i = cart.find((x) => x.id === row.dataset.id);
    if (!i) return;
    if (e.target.closest("[data-inc]")) i.qty += 1;
    else if (e.target.closest("[data-dec]")) i.qty = Math.max(1, i.qty - 1);
    else if (e.target.closest("[data-remove]")) cart.splice(cart.indexOf(i), 1);
    else return;
    write(cart);
    render();
  });

  const offer = $("[data-cart-offer]");
  const submit = $("[data-cart-submit]");
  offer.addEventListener("change", () => { submit.disabled = !offer.checked; });
  submit.addEventListener("click", () => { location.href = `${base}/checkout`; });

  render();
})();
