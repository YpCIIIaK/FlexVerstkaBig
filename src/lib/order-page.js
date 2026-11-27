(function () {
  "use strict";

  const root = document.querySelector("[data-order-page]");
  if (!root || !window.flexOrders) return;

  const { T, P, money, date, find } = window.flexOrders;
  const KZ = /^\/kz(\/|$)/.test(location.pathname);
  const S = KZ ? {
    created: "Тапсырыс жасалды", built: "Тапсырыс жиналды", courier: "Курьерге берілді", delivered: "Жеткізілді", canceled: "Тапсырыс тоқтатылды", waiting: "Күтілуде",
    inway: "Жолда", device: "FLEX құрылғысы", stick: "FAIIM стиктері", color: "Түсі:", taste: "Дәмі:", store: "FLEX дүкені",
  } : {
    created: "Заказ создан", built: "Заказ собран", courier: "Передан курьеру", delivered: "Доставлен", canceled: "Заказ отменён", waiting: "Ожидается",
    inway: "В пути", device: "Устройство FLEX", stick: "Стики FAIIM", color: "Цвет:", taste: "Вкус:", store: "Магазин FLEX",
  };

  const id = new URLSearchParams(location.search).get("id");
  const o = find(id);
  if (!o) { location.replace("/purchases"); return; }

  const $ = (s) => root.querySelector(s);
  const time = (iso, h) => `${date(iso)}, ${h}`;
  const shift = (iso, d) => { const x = new Date(iso); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

  const items = o.items.map((k) => P[k]).filter(Boolean);
  const goods = items.reduce((s, p) => s + p.price, 0);
  const delivery = o.channel === "online" ? 980 : 0;

  $("[data-op-title]").textContent = T.order + o.id;
  $("[data-op-meta]").innerHTML = `${date(o.date)}<span class="order__channel">${o.channel === "online" ? T.online : T.store}</span>`;
  const st = $("[data-op-status]");
  st.textContent = T.status[o.status] || "";
  st.className = `order__status order__status--${o.status}`;

  $("[data-op-count]").textContent = `(${items.length})`;
  $("[data-op-items]").innerHTML = items.map((p) => `
    <li class="op-item">
      <img class="op-item__img op-item__img--${p.kind}" src="${p.img}" alt="" loading="lazy" />
      <div class="op-item__info">
        <h3>${p.kind === "device" ? S.device : S.stick}</h3>
        <p>${p.kind === "device" ? S.color : S.taste} <span${p.kind === "stick" ? ' class="op-upper"' : ""}>${p.name}</span></p>
      </div>
      <strong class="op-item__price">${money(p.price)}</strong>
    </li>`).join("");
  $("[data-op-qty]").textContent = items.length;
  $("[data-op-goods]").textContent = money(goods);
  $("[data-op-delivery]").textContent = money(delivery);
  $("[data-op-delivery-row]").hidden = !delivery;
  $("[data-op-total]").textContent = money(goods + delivery);

  const ship = root.querySelector("[data-op-ship]");
  const store = root.querySelector("[data-op-store]");
  if (o.channel === "store") {
    ship.hidden = true;
    store.hidden = false;
    $("[data-op-store-name]").textContent = S.store;
    $("[data-op-store-address]").textContent = KZ ? "Алматы қ., Абай к-сі, 25" : "г. Алматы, ул. Абая, 25";
    $("[data-op-store-date]").textContent = time(o.date, "12:45");
  } else {
    const steps = [
      { t: S.created, d: time(o.date, "12:45"), on: true },
      { t: S.built, d: time(shift(o.date, 1), "10:20"), on: true },
    ];
    let badge = S.inway;
    let badgeCls = "courier";
    if (o.status === "canceled") {
      steps.push({ t: S.canceled, d: time(shift(o.date, 1), "11:00"), cancel: true });
      badge = T.status.canceled;
      badgeCls = "canceled-plain";
    } else if (o.status === "received") {
      steps.push({ t: S.courier, d: time(shift(o.date, 2), "09:30"), on: true }, { t: S.delivered, d: time(shift(o.date, 2), "16:15"), on: true });
      badge = S.delivered;
    } else {
      steps.push({ t: S.courier, d: time(shift(o.date, 2), "09:30"), current: true }, { t: S.delivered, d: S.waiting });
    }
    $("[data-op-steps]").innerHTML = steps.map((s) => `
      <li class="op-step${s.on ? " is-done" : ""}${s.current ? " is-current" : ""}${s.cancel ? " is-cancel" : ""}">
        <span class="op-step__dot" aria-hidden="true"></span>
        <span class="op-step__title">${s.t}</span>
        <span class="op-step__date">${s.d}</span>
      </li>`).join("");
    const b = $("[data-op-ship-status]");
    b.textContent = badge;
    b.className = `order__status order__status--${badgeCls}`;
    $("[data-op-address]").textContent = KZ ? "Алматы қ., Абай к-сі, 25, 12-пәтер" : "г. Алматы, ул. Абая, 25, кв. 12";
  }

  $("[data-op-pay-method]").textContent = "Visa •••• 7788";
  $("[data-op-pay-date]").textContent = time(o.date, "12:47");
  if (o.status === "canceled") {
    const ps = $("[data-op-pay-status]");
    ps.textContent = KZ ? "Қайтарылды" : "Возвращено";
    ps.className = "order__status";
  }
})();
