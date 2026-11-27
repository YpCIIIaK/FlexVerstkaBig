(function () {
  "use strict";

  const KEY = "flex_address";
  const CITIES = ["Алматы", "Астана", "Шымкент", "Караганда", "Актобе"];
  const STORE_CITIES = ["Алматы"];

  const mock = {
    async suggest(query) {
      await new Promise((r) => setTimeout(r, 250));
      const q = query.trim().replace(/\s+/g, " ");
      if (q.length < 3 || /9999/.test(q)) return [];
      const parts = q.split(",").map((s) => s.trim()).filter(Boolean);
      const city = CITIES.find((c) => c.toLowerCase().startsWith((parts.length > 1 ? parts[0] : "").toLowerCase()) && parts.length > 1) || "Алматы";
      const rest = (parts.length > 1 ? parts.slice(1).join(", ") : parts[0]).replace(/^(пр\.?|просп\.?|проспект)\s*/i, "");
      const m = rest.match(/^(.*?)[\s,]*(\d+)\s*$/);
      const street = (m ? m[1] : rest).trim();
      if (!street) return [];
      const name = "проспект " + street.charAt(0).toUpperCase() + street.slice(1);
      const num = m ? m[2] : "1";
      return [num, num + "А", num + "/1", num + "Б", num + "/2"].map((n) => `${city}, ${name}, ${n}`);
    },

    async nearestStore(address) {
      await new Promise((r) => setTimeout(r, 500));
      const city = address.split(",")[0].trim();
      if (!STORE_CITIES.includes(city)) return null;
      return { id: "0", name: "Магазин FLEX, ТРЦ Forum" };
    },
  };

  const api = window.flexAddressApi || mock;

  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
  };
  const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} };

  const short = (address) => address.split(",").slice(1).join(",").trim().replace(/^проспект /, "пр. ") || address;

  const pills = [...document.querySelectorAll("[data-address-pill]")];
  const renderPill = () => {
    const v = read();
    pills.forEach((p) => {
      p.hidden = !v;
      if (v) p.querySelector("[data-address-pill-text]").textContent = short(v.address);
    });
  };
  renderPill();

  const modal = document.querySelector("[data-address-modal]");

  pills.forEach((p) => p.addEventListener("click", (e) => {
    if (!modal) return;
    e.preventDefault();
    open();
  }));

  if (!modal) return;

  const form = modal.querySelector("[data-address-form]");
  const input = modal.querySelector("[data-address-input]");
  const field = modal.querySelector("[data-address-field]");
  const clear = modal.querySelector("[data-address-clear]");
  const list = modal.querySelector("[data-address-list]");
  const error = modal.querySelector("[data-address-error]");
  const submit = modal.querySelector("[data-address-submit]");
  const states = [...modal.querySelectorAll("[data-address-state]")];
  const T = {
    show: submit.textContent,
    change: modal.querySelector("[data-address-change-text]").textContent,
  };

  let chosen = "";
  let noStore = false;
  let items = [];
  let active = -1;
  let reqId = 0;
  let lastFocus = null;

  const setState = (name) => {
    noStore = name === "nostore";
    states.forEach((el) => { el.hidden = el.dataset.addressState !== name; });
    submit.textContent = noStore ? T.change : T.show;
    refresh();
  };

  const refresh = () => {
    clear.hidden = !input.value;
    submit.disabled = !noStore && !chosen;
  };

  const closeList = () => {
    list.hidden = true;
    list.innerHTML = "";
    items = [];
    active = -1;
    input.setAttribute("aria-expanded", "false");
    field.classList.remove("is-open");
  };

  const highlight = (i) => {
    active = i;
    [...list.children].forEach((li, k) => li.classList.toggle("is-active", k === i));
  };

  const choose = (text) => {
    chosen = text;
    input.value = text;
    closeList();
    error.hidden = true;
    refresh();
  };

  const showList = (found) => {
    items = found;
    list.innerHTML = "";
    found.forEach((text, i) => {
      const li = document.createElement("li");
      li.className = "address-modal__option";
      li.setAttribute("role", "option");
      li.id = "address-opt-" + i;
      li.textContent = text;
      li.addEventListener("mousedown", (e) => { e.preventDefault(); choose(text); });
      li.addEventListener("mousemove", () => highlight(i));
      list.appendChild(li);
    });
    const has = found.length > 0;
    list.hidden = !has;
    field.classList.toggle("is-open", has);
    input.setAttribute("aria-expanded", String(has));
    if (has) highlight(0);
  };

  let timer = 0;
  input.addEventListener("input", () => {
    chosen = "";
    if (noStore) setState("ask");
    refresh();
    clearTimeout(timer);
    const q = input.value;
    if (q.trim().length < 3) { closeList(); error.hidden = true; return; }
    timer = setTimeout(async () => {
      const id = ++reqId;
      const found = await api.suggest(q).catch(() => []);
      if (id !== reqId) return;
      error.hidden = found.length > 0;
      showList(found);
    }, 250);
  });

  input.addEventListener("keydown", (e) => {
    if (list.hidden) return;
    if (e.key === "ArrowDown") { e.preventDefault(); highlight((active + 1) % items.length); }
    if (e.key === "ArrowUp") { e.preventDefault(); highlight((active - 1 + items.length) % items.length); }
    if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(items[active]); }
  });

  input.addEventListener("blur", () => setTimeout(closeList, 100));

  clear.addEventListener("click", () => {
    input.value = "";
    chosen = "";
    error.hidden = true;
    closeList();
    if (noStore) setState("ask");
    refresh();
    input.focus();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (noStore) {
      setState("ask");
      clear.click();
      return;
    }
    if (!chosen) return;
    submit.disabled = true;
    const store = await api.nearestStore(chosen).catch(() => null);
    if (!store) { setState("nostore"); return; }
    save({ address: chosen, storeId: store.id, store: store.name });
    renderPill();
    close();
    document.dispatchEvent(new CustomEvent("flex:address", { detail: read() }));
  });

  const open = () => {
    lastFocus = document.activeElement;
    const v = read();
    input.value = v ? v.address : "";
    chosen = v ? v.address : "";
    error.hidden = true;
    closeList();
    setState("ask");
    modal.hidden = false;
    document.documentElement.classList.add("is-modal-open");
    setTimeout(() => input.focus(), 50);
  };

  const close = () => {
    modal.hidden = true;
    document.documentElement.classList.remove("is-modal-open");
    try { sessionStorage.setItem(KEY + "_asked", "1"); } catch (e) {}
    if (lastFocus) lastFocus.focus();
  };

  modal.querySelectorAll("[data-address-close]").forEach((b) => b.addEventListener("click", close));
  modal.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  window.flexAddress = { open, close, read, clear: () => { localStorage.removeItem(KEY); renderPill(); } };

  let asked = false;
  try { asked = sessionStorage.getItem(KEY + "_asked") === "1"; } catch (e) {}
  const params = new URLSearchParams(location.search);
  if (params.has("address") || (!read() && !asked)) open();
})();
