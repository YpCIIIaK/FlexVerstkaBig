(function () {
  "use strict";

  const root = document.querySelector("[data-checkout]");
  if (!root || !window.flexCart) return;

  const KZ = /^\/kz(\/|$)/.test(location.pathname);
  const base = KZ ? "/kz" : "";
  const { read, write, totals, DEVICES, STICKS, T } = window.flexCart;
  const L = KZ ? {
    main: "Негізгі", online: "Банк картасымен онлайн төлеу", other: "Басқа картамен төлеу", cash: "Алған кезде төлеу", pcs: "дана",
    free: "Тегін", calc: "рәсімдеу кезінде есептеледі", set: "Бастапқы жиынтық",
  } : {
    main: "Основной", online: "Онлайн-оплата банковской картой", other: "Оплатить другой картой", cash: "Оплата при получении", pcs: "шт.",
    free: "Бесплатно", calc: "рассчитывается при оформлении", set: "Стартовый набор",
  };

  const param = new URLSearchParams(location.search).get("checkout");
  const json = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const DEMO_ADDR = [
    { id: "a1", title: "Дом", city: "Алматы", street: "ул. Абая", house: "25", flat: "12", main: true },
    { id: "a2", title: "Работа", city: "Алматы", street: "пр. Достык", house: "100", flat: "офис 5", main: false },
  ];
  const DEMO_CARDS = [
    { id: "c1", brand: "visa", last4: "7788", main: true },
    { id: "c2", brand: "mastercard", last4: "4455", main: false },
  ];
  const DEMO_USER = { name: "Илья Миненко", phone: "+7 707 125-25-26", email: "ilya.minenko@example.com" };

  if (!read().length) write([
    { id: "device:violet", kind: "device", key: "violet", qty: 1 },
    { id: "device:blue", kind: "device", key: "blue", qty: 1 },
  ]);

  const known = param === "filled" || (param !== "new" && json("flex_addresses", []).length > 0);
  const addresses = param === "filled" ? DEMO_ADDR : param === "new" ? [] : json("flex_addresses", []);
  const cards = param === "new" ? [] : param === "filled" ? DEMO_CARDS : json("flex_cards", []).length ? json("flex_cards", []) : DEMO_CARDS;
  const user = DEMO_USER;

  const $ = (s) => root.querySelector(s);
  const money = (n) => n.toLocaleString("ru-RU").replace(/ /g, " ") + " ₸";
  const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const form = $("[data-co-form]");

  const contactsForm = $("[data-co-contacts-form]");
  if (user) {
    Object.entries(user).forEach(([k, v]) => { if (form.elements[k]) form.elements[k].value = v; });
    contactsForm.hidden = true;
    const sum = $("[data-co-contacts-summary]");
    sum.hidden = false;
    sum.innerHTML = [user.name, user.phone, user.email].filter(Boolean).map((v) => `<span>${esc(v)}</span>`).join("");
    const edit = $("[data-co-contacts-edit]");
    edit.hidden = false;
    edit.addEventListener("click", () => { contactsForm.hidden = false; sum.hidden = true; edit.hidden = true; });
  }

  const radio = (name, value, checked, body, cls = "") => `
    <label class="co-option ${cls}">
      <input class="co-option__input" type="radio" name="${name}" value="${value}"${checked ? " checked" : ""} />
      <span class="co-option__body">${body}</span>
      <span class="co-option__mark" aria-hidden="true"></span>
    </label>`;

  const addrForm = $("[data-co-addr-form]");
  const addrList = $("[data-co-addresses]");
  const addBtn = $("[data-co-addr-add]");
  const line = (a) => [a.city, a.street + (a.house ? ", " + a.house : ""), a.flat && (/^\d/.test(a.flat) ? "кв. " + a.flat : a.flat)].filter(Boolean).join(", ");
  if (addresses.length) {
    $("[data-co-addr-hint]").hidden = true;
    addrForm.hidden = true;
    addBtn.hidden = false;
    addrList.innerHTML = addresses.map((a) => radio("address", a.id, a.main,
      `<b>${esc(a.title)}${a.main ? ` · ${L.main}` : ""}</b><small>${esc(line(a))}</small>`)).join("");
    addBtn.addEventListener("click", () => {
      addrForm.hidden = false;
      addBtn.hidden = true;
      addrList.querySelectorAll("input").forEach((i) => { i.checked = false; });
      form.elements.title.focus();
    });
    addrList.addEventListener("change", () => { addrForm.hidden = true; addBtn.hidden = false; });
  }

  const logo = (b) => `<span class="co-card-logo"><img src="/assets/images/card-${b}.svg" alt="${b === "visa" ? "Visa" : "Mastercard"}" /></span>`;
  const cardRows = cards.map((c, i) => radio("pay", "card:" + c.id, i === 0,
    `${logo(c.brand)}<span class="co-option__num">•••• ${esc(c.last4)}</span>${c.main ? `<span class="saved-item__badge">${L.main}</span>` : ""}`, "co-option--card")).join("");
  $("[data-co-pay]").innerHTML = (cards.length ? "" : radio("pay", "online", true, `<b>${L.online}</b>`))
    + cardRows
    + `<label class="co-plain"><input class="co-option__input" type="radio" name="pay" value="other" /><span class="co-option__mark" aria-hidden="true"></span>${L.other}</label>`
    + radio("pay", "cash", false, `<b>${L.cash}</b>`);

  const t = totals(read());
  $("[data-co-items]").innerHTML = t.lines.map((i) => {
    const d = i.kind === "stick" ? STICKS[i.key] : DEVICES[i.key];
    const img = i.kind === "set" ? "/assets/images/starter-set-hero.webp?v=2" : d.img;
    const title = i.kind === "set" ? L.set : i.kind === "device" ? T.device : T.stick;
    const sub = i.kind === "stick" ? `${T.taste} ${d.name}` : `${T.color} ${DEVICES[i.key].name}`;
    return `<li class="co-item"><span class="co-item__img"><img src="${img}" alt="" /></span><span class="co-item__info"><b>${title}</b><small>${sub}</small><small>${i.qty} ${L.pcs}</small></span></li>`;
  }).join("");
  $("[data-sum-qty]").textContent = t.qty;
  $("[data-sum-goods]").textContent = money(t.goods);
  $("[data-sum-delivery]").textContent = t.hasSet ? L.calc : t.delivery ? money(t.delivery) : L.free;
  $("[data-sum-total]").textContent = money(t.total);

  const offer = $("[data-co-offer]");
  const submit = $("[data-co-submit]");
  offer.addEventListener("change", () => { submit.disabled = !offer.checked; });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const need = [...form.querySelectorAll("[required]")].filter((i) => !i.closest("[hidden]") && !i.value.trim());
    form.querySelectorAll(".field.is-error").forEach((f) => f.classList.remove("is-error"));
    if (need.length) {
      need.forEach((i) => i.closest(".field").classList.add("is-error"));
      need[0].focus();
      return;
    }
    document.dispatchEvent(new CustomEvent("flex:checkout", { detail: Object.fromEntries(new FormData(form)) }));
  });
})();
