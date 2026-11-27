(function () {
  "use strict";

  const root = document.querySelector("[data-devices]");
  if (!root) return;

  const KZ = /^\/kz(\/|$)/.test(location.pathname);
  const T = KZ ? {
    title: "FLEX құрылғысы", color: "Түсі:", serial: "Сериялық нөмір:", warranty: "Кепілдік мерзімі:", until: "дейін", diag: "Диагностика", del: "Жою",
  } : {
    title: "Устройство FLEX", color: "Цвет:", serial: "Серийный номер:", warranty: "Гарантийный срок:", until: "до", diag: "Диагностика", del: "Удалить",
  };

  const COLORS = {
    violet: { name: KZ ? "Күлгін құм" : "Фиолетовый Песок", img: "/assets/images/device-violet-002.webp" },
    blue: { name: KZ ? "Көк металлик" : "Синий Металлик", img: "/assets/images/device-blue-002.webp" },
    gray: { name: KZ ? "Сұр металлик" : "Серый Металлик", img: "/assets/images/device-silver-002.webp" },
    beige: { name: KZ ? "Бежевый құм" : "Бежевый Песок", img: "/assets/images/device-beige-002.webp" },
  };

  const KEY = "flex_devices";
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} };

  const api = window.flexDevicesApi || {
    list: async () => read(),
    register: async (serial) => {
      await new Promise((r) => setTimeout(r, 400));
      if (!/^FLX\d{8}$/i.test(serial) || /0000$/.test(serial)) throw { code: "NOT_FOUND" };
      const keys = Object.keys(COLORS);
      const color = keys[Number(serial.slice(-1)) % keys.length];
      const list = read();
      list.push({ id: serial.toUpperCase(), serial: serial.toUpperCase(), color, warranty: "2028-12-29" });
      write(list);
    },
    remove: async (id) => write(read().filter((d) => d.id !== id)),
  };

  const demo = new URLSearchParams(location.search).get("devices");
  if (demo === "empty") write([]);
  if (demo === "filled") write([{ id: "FLX12345678", serial: "FLX12345678", color: "violet", warranty: "2028-12-29" }]);

  const list = root.querySelector("[data-dev-list]");
  const addBtn = root.querySelector("[data-dev-add]");

  const date = (v) => {
    const d = new Date(v);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  };

  const row = (label, value) => `<div class="device-item__row"><dt>${label}</dt><dd>${value}</dd></div>`;

  const render = (devices) => {
    list.querySelectorAll(".device-item").forEach((n) => n.remove());
    devices.forEach((d) => {
      const c = COLORS[d.color] || COLORS.violet;
      const item = document.createElement("article");
      item.className = "device-item";
      item.innerHTML = `
        <img class="device-item__img" src="${c.img}" alt="" width="600" height="798" loading="lazy" />
        <div class="device-item__info">
          <h3 class="device-item__title">${T.title}</h3>
          <dl class="device-item__list">
            ${row(T.color, c.name)}
            ${row(T.serial, d.serial)}
            ${row(T.warranty, `${KZ ? "" : T.until + " "}${date(d.warranty)}${KZ ? " " + T.until : ""}`)}
          </dl>
        </div>
        <div class="device-item__actions">
          <a class="saved-item__link" href="/help">${T.diag}</a>
          <button class="saved-item__link saved-item__link--danger" type="button">${T.del}</button>
        </div>`;
      item.querySelector("button").addEventListener("click", () => askRemove(d, c));
      list.append(item);
    });
  };

  const refresh = async () => render(await api.list());

  const bindClose = (dlg) => {
    dlg.querySelectorAll("[data-modal-close]").forEach((b) => b.addEventListener("click", () => dlg.close()));
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  };

  const modal = document.querySelector("[data-dev-modal]");
  const form = modal.querySelector("[data-dev-form]");
  const input = modal.querySelector("[data-dev-serial]");
  const error = modal.querySelector("[data-dev-error]");
  const save = modal.querySelector("[data-dev-save]");
  const field = input.closest(".field");
  bindClose(modal);

  const setError = (on) => {
    error.hidden = !on;
    field.classList.toggle("is-error", on);
    input.setAttribute("aria-invalid", String(on));
  };

  input.addEventListener("input", () => {
    input.value = input.value.toUpperCase().replace(/\s+/g, "");
    setError(false);
    save.disabled = input.value.length < 4;
  });

  addBtn.addEventListener("click", () => {
    form.reset();
    setError(false);
    save.disabled = true;
    modal.showModal();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    save.disabled = true;
    try {
      await api.register(input.value.trim());
      modal.close();
      refresh();
    } catch (err) {
      setError(true);
    }
  });

  const delModal = document.querySelector("[data-dev-del-modal]");
  const delName = delModal.querySelector("[data-dev-del-name]");
  bindClose(delModal);
  let pending = null;

  const askRemove = (d, c) => {
    pending = d;
    delName.textContent = c.name;
    delModal.showModal();
  };

  delModal.querySelector("[data-dev-del-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!pending) return;
    await api.remove(pending.id);
    pending = null;
    delModal.close();
    refresh();
  });

  refresh();
})();
