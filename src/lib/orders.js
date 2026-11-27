(function () {
  "use strict";

  const root = document.querySelector("[data-orders]");
  if (!root) return;

  const KZ = /^\/kz(\/|$)/.test(location.pathname);
  const T = KZ ? {
    order: "Тапсырыс №", online: "Онлайн", store: "Дүкенде сатып алу", total: "Тапсырыс сомасы", repeat: "Тапсырысты қайталау", receipt: "Чекті көрсету", more: "Толығырақ",
    status: { courier: "Курьерге берілді", received: "Алынды", canceled: "Тоқтатылды", processing: "Өңделуде" },
  } : {
    order: "Заказ №", online: "Онлайн", store: "Покупка в магазине", total: "Сумма заказа", repeat: "Повторить заказ", receipt: "Показать чек", more: "Подробнее",
    status: { courier: "Передан курьеру", received: "Получен", canceled: "Отменён", processing: "В обработке" },
  };

  const P = {
    violet: { name: "Фиолетовый Песок", img: "/assets/images/device-violet-002.webp", price: 21990, kind: "device" },
    blue: { name: "Синий Металлик", img: "/assets/images/device-blue-002.webp", price: 21990, kind: "device" },
    gray: { name: "Серый Металлик", img: "/assets/images/device-silver-002.webp", price: 21990, kind: "device" },
    beige: { name: "Бежевый Песок", img: "/assets/images/device-beige-002.webp", price: 21990, kind: "device" },
    sunshine: { name: "Sunshine Mix", img: "/assets/images/sunshine-mix-1.webp", price: 1290, kind: "stick" },
    purple: { name: "Purple Mix", img: "/assets/images/purple-mix-1.webp", price: 1290, kind: "stick" },
    yellow: { name: "Yellow Mix", img: "/assets/images/yellow-mix-1.webp", price: 1290, kind: "stick" },
    skygreen: { name: "Skygreen", img: "/assets/images/skygreen-1.webp", price: 1290, kind: "stick" },
  };

  const KEY = "flex_orders";
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} };

  const DEMO = [
    { id: "10458", date: "2026-11-08", channel: "online", status: "courier", items: ["gray", "yellow"] },
    { id: "10457", date: "2026-08-23", channel: "store", status: "received", items: ["violet", "sunshine", "purple", "yellow"] },
    { id: "10456", date: "2026-11-08", channel: "online", status: "canceled", items: ["beige", "violet", "skygreen", "yellow", "purple"] },
  ];

  const demo = new URLSearchParams(location.search).get("orders");
  if (demo === "empty") write([]);
  if (demo === "filled") write(DEMO);

  const api = window.flexOrdersApi || { list: async () => read() };

  const money = (n) => n.toLocaleString("ru-RU").replace(/ /g, " ") + " ₸";
  const date = (v) => new Date(v).toLocaleDateString(KZ ? "kk-KZ" : "ru-RU", { day: "numeric", month: "long", year: "numeric" }).replace(" г.", "");

  const list = root.querySelector("[data-orders-list]");
  const empty = root.querySelector("[data-orders-empty]");
  const tabs = [...root.querySelectorAll("[data-orders-filter]")];
  let orders = [];
  let filter = "all";

  const card = (o) => {
    const items = o.items.map((k) => P[k]).filter(Boolean);
    const sum = items.reduce((s, p) => s + p.price, 0);
    const el = document.createElement("article");
    el.className = "order";
    el.innerHTML = `
      <header class="order__head">
        <div>
          <h3 class="order__title">${T.order}${o.id}</h3>
          <p class="order__meta">${date(o.date)}<span class="order__channel">${o.channel === "online" ? T.online : T.store}</span></p>
        </div>
        <span class="order__status order__status--${o.status}">${T.status[o.status] || ""}</span>
      </header>
      <ul class="order__items">
        ${items.map((p) => `<li class="order-item order-item--${p.kind}"><img src="${p.img}" alt="" loading="lazy" /><span class="order-item__name">${p.name}</span><span class="order-item__price">${money(p.price)}</span></li>`).join("")}
      </ul>
      <footer class="order__foot">
        <div class="order__sum"><span>${T.total}</span><strong>${money(sum)}</strong></div>
        <div class="order__actions">
          <button class="button button--ghost button--auto" type="button" data-order-repeat>${T.repeat}</button>
          <button class="button button--ghost button--auto" type="button" data-order-receipt>${T.receipt}</button>
          <a class="button button--auto" href="#">${T.more}</a>
        </div>
      </footer>`;
    return el;
  };

  const render = () => {
    const shown = orders.filter((o) => filter === "all" || o.channel === filter);
    list.innerHTML = "";
    shown.forEach((o) => list.append(card(o)));
    empty.hidden = shown.length > 0;
  };

  tabs.forEach((t) => t.addEventListener("click", () => {
    filter = t.dataset.ordersFilter;
    tabs.forEach((x) => {
      const on = x === t;
      x.classList.toggle("is-active", on);
      x.setAttribute("aria-selected", String(on));
    });
    render();
  }));

  api.list().then((o) => { orders = o; render(); });
})();
