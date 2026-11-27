(function () {
  "use strict";

  const root = document.querySelector("[data-addresses]");
  if (!root) return;

  const KZ = /^\/kz(\/|$)/.test(location.pathname);
  const T = KZ ? {
    main: "Негізгі", makeMain: "Негізгі ету", edit: "Өзгерту", del: "Жою", entrance: "кіреберіс", floor: "қабат", flat: "пәтер", house: "үй", rename: "Атауын өзгерту", cardName: "Карта атауы",
  } : {
    main: "Основной", makeMain: "Сделать основным", edit: "Изменить", del: "Удалить", entrance: "Подъезд", floor: "этаж", flat: "кв.", house: "д.", rename: "Переименовать", cardName: "Название карты",
  };

  const store = (key) => ({
    read: () => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } },
    write: (v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} },
  });

  const mock = {
    addresses: store("flex_addresses"),
    cards: store("flex_cards"),
  };

  const api = window.flexProfileApi || {
    listAddresses: async () => mock.addresses.read(),
    saveAddresses: async (list) => mock.addresses.write(list),
    listCards: async () => mock.cards.read(),
    saveCards: async (list) => mock.cards.write(list),
    addCard: async () => {
      const list = mock.cards.read();
      const brand = list.length % 2 ? "mastercard" : "visa";
      list.push({ id: Date.now().toString(36), brand, last4: String(1000 + Math.floor(Math.random() * 9000)), name: T.cardName, main: !list.length });
      mock.cards.write(list);
    },
  };

  const demo = new URLSearchParams(location.search).get("profile");
  if (demo === "empty") { mock.addresses.write([]); mock.cards.write([]); }
  if (demo === "filled") {
    mock.addresses.write([
      { id: "a1", title: "Дом", city: "Алматы", street: "ул. Абая", house: "150", flat: "24", entrance: "2", floor: "6", comment: "", main: true },
      { id: "a2", title: "Работа", city: "Алматы", street: "пр. Достык", house: "192/2", flat: "офис 305", entrance: "", floor: "3", comment: "", main: false },
    ]);
    mock.cards.write([
      { id: "c1", brand: "visa", last4: "7788", name: T.cardName, main: true },
      { id: "c2", brand: "mastercard", last4: "4455", name: T.cardName, main: false },
    ]);
  }

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const line = (a) => {
    const flat = a.flat ? (/^\d/.test(a.flat) ? `${T.flat} ${a.flat}` : a.flat) : "";
    return [a.city, a.street, a.house && `${T.house} ${a.house}`, flat].filter(Boolean).join(", ");
  };
  const extra = (a) => [a.entrance && `${T.entrance} ${a.entrance}`, a.floor && `${T.floor} ${a.floor}`].filter(Boolean).join(", ").replace(/^./, (c) => c.toUpperCase());

  const addrList = root.querySelector("[data-addr-list]");
  const addrEmpty = root.querySelector("[data-addr-empty]");
  const addrNote = root.querySelector("[data-addr-note]");
  const cardsRoot = document.querySelector("[data-cards]");
  const cardList = cardsRoot.querySelector("[data-card-list]");
  const cardEmpty = cardsRoot.querySelector("[data-card-empty]");
  const cardNote = cardsRoot.querySelector("[data-card-note]");

  const link = (text, cls, fn) => {
    const b = el("button", "saved-item__link" + (cls ? " " + cls : ""), text);
    b.type = "button";
    b.addEventListener("click", fn);
    return b;
  };

  let addresses = [];
  let cards = [];

  const renderAddresses = () => {
    addrList.innerHTML = "";
    addrEmpty.hidden = addresses.length > 0;
    addrNote.hidden = addresses.length === 0;
    addresses.forEach((a) => {
      const li = el("li", "saved-item");
      const head = el("div", "saved-item__head");
      head.append(el("h3", "saved-item__title", a.title));
      if (a.main) head.append(el("span", "saved-item__badge", T.main));
      const foot = el("div", "saved-item__foot");
      foot.append(el("p", "saved-item__meta", extra(a)));
      const actions = el("div", "saved-item__actions");
      if (!a.main) actions.append(link(T.makeMain, "saved-item__link--accent", () => setMainAddress(a.id)));
      actions.append(link(T.edit, "", () => openAddress(a)));
      actions.append(link(T.del, "saved-item__link--danger", () => confirmDelete("addr", a)));
      foot.append(actions);
      li.append(head, el("p", "saved-item__text", line(a)), foot);
      addrList.append(li);
    });
  };

  const renderCards = () => {
    cardList.innerHTML = "";
    cardEmpty.hidden = cards.length > 0;
    cardNote.hidden = cards.length === 0;
    cards.forEach((c) => {
      const li = el("li", "saved-item saved-item--card");
      const logo = el("span", "saved-card__logo");
      const img = el("img");
      img.src = `/assets/images/card-${c.brand}.svg`;
      img.alt = c.brand === "visa" ? "Visa" : "Mastercard";
      logo.append(img);
      const info = el("div", "saved-card__info");
      const nameRow = el("div", "saved-card__name-row");
      const name = el("span", "saved-card__name", c.name);
      const pen = el("button", "saved-card__rename");
      pen.type = "button";
      pen.setAttribute("aria-label", T.rename);
      pen.innerHTML = '<img src="/assets/images/edit.svg" alt="" width="16" height="16" />';
      pen.addEventListener("click", () => renameCard(c, name));
      nameRow.append(name, pen);
      info.append(nameRow, el("span", "saved-card__num", "•••• " + c.last4));
      const actions = el("div", "saved-item__actions");
      actions.append(link(T.del, "saved-item__link--danger", () => confirmDelete("card", c)));
      li.append(logo, info, actions);
      cardList.append(li);
    });
  };

  const renameCard = (c, nameEl) => {
    const input = el("input", "saved-card__input");
    input.value = c.name;
    input.maxLength = 30;
    nameEl.replaceWith(input);
    input.focus();
    input.select();
    const done = (save) => {
      if (save && input.value.trim()) c.name = input.value.trim();
      api.saveCards(cards);
      renderCards();
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") done(true);
      if (e.key === "Escape") done(false);
    });
    input.addEventListener("blur", () => done(true));
  };

  const setMainAddress = (id) => {
    addresses.forEach((a) => { a.main = a.id === id; });
    addresses.sort((a, b) => b.main - a.main);
    api.saveAddresses(addresses);
    renderAddresses();
  };

  const bindClose = (dlg) => dlg.querySelectorAll("[data-modal-close]").forEach((b) => b.addEventListener("click", () => dlg.close()));

  const addrModal = document.querySelector("[data-addr-modal]");
  const addrForm = addrModal.querySelector("[data-addr-form]");
  const addrSave = addrModal.querySelector("[data-addr-save]");
  bindClose(addrModal);
  let editing = null;

  const refreshSave = () => { addrSave.disabled = [...addrForm.querySelectorAll("[required]")].some((i) => !i.value.trim()); };
  addrForm.addEventListener("input", refreshSave);

  const openAddress = (a) => {
    editing = a || null;
    addrModal.querySelectorAll("[data-addr-mode]").forEach((s) => { s.hidden = s.dataset.addrMode !== (a ? "edit" : "add"); });
    addrForm.reset();
    if (a) Object.entries(a).forEach(([k, v]) => {
      const f = addrForm.elements[k];
      if (!f) return;
      if (f.type === "checkbox") f.checked = Boolean(v);
      else f.value = v;
    });
    if (!a && !addresses.length) addrForm.elements.main.checked = true;
    refreshSave();
    addrModal.showModal();
  };

  addrForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(["title", "city", "street", "house", "flat", "entrance", "floor", "comment"].map((k) => [k, addrForm.elements[k].value.trim()]));
    data.main = addrForm.elements.main.checked || addresses.length === 0 || (editing && editing.main && addresses.length === 1);
    if (editing) Object.assign(editing, data);
    else addresses.push({ id: Date.now().toString(36), ...data });
    const target = editing || addresses[addresses.length - 1];
    if (data.main) addresses.forEach((a) => { a.main = a === target; });
    if (!addresses.some((a) => a.main)) addresses[0].main = true;
    addresses.sort((a, b) => b.main - a.main);
    api.saveAddresses(addresses);
    renderAddresses();
    addrModal.close();
  });

  root.querySelector("[data-addr-add]").addEventListener("click", () => openAddress(null));

  const confirmModal = document.querySelector("[data-confirm-modal]");
  bindClose(confirmModal);
  let pending = null;

  const confirmDelete = (kind, item) => {
    pending = { kind, item };
    confirmModal.querySelectorAll("[data-confirm-kind]").forEach((s) => { s.hidden = s.dataset.confirmKind !== kind; });
    const label = confirmModal.querySelector("[data-confirm-label]");
    label.textContent = kind === "addr" ? item.title : "";
    label.hidden = kind !== "addr";
    confirmModal.querySelector("[data-confirm-text]").textContent = kind === "addr"
      ? line(item)
      : `${item.brand === "visa" ? "Visa" : "Mastercard"} · •••• ${item.last4}`;
    confirmModal.showModal();
  };

  confirmModal.querySelector("[data-confirm-form]").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!pending) return;
    if (pending.kind === "addr") {
      addresses = addresses.filter((a) => a !== pending.item);
      if (addresses.length && !addresses.some((a) => a.main)) addresses[0].main = true;
      api.saveAddresses(addresses);
      renderAddresses();
    } else {
      cards = cards.filter((c) => c !== pending.item);
      if (cards.length && !cards.some((c) => c.main)) cards[0].main = true;
      api.saveCards(cards);
      renderCards();
    }
    pending = null;
    confirmModal.close();
  });

  const cardModal = document.querySelector("[data-card-modal]");
  bindClose(cardModal);
  cardsRoot.querySelector("[data-card-add]").addEventListener("click", () => cardModal.showModal());
  cardModal.querySelector("[data-card-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    await api.addCard();
    cards = await api.listCards();
    renderCards();
    cardModal.close();
  });

  [addrModal, confirmModal, cardModal].forEach((dlg) => dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); }));

  Promise.all([api.listAddresses(), api.listCards()]).then(([a, c]) => {
    addresses = a;
    cards = c;
    renderAddresses();
    renderCards();
  });
})();
