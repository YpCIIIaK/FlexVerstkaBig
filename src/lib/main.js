(function () {
  "use strict";

  const initAuth = () => {
    const form = document.querySelector("[data-auth-form]");
    if (!form) return;

    const codeForm = document.querySelector("[data-code-form]");
    const loader = document.querySelector("[data-loader]");
    const loginProgress = document.querySelector("[data-login-progress]");

    const field = form.querySelector("[data-field]");
    const input = form.querySelector("[data-phone]");
    const fieldError = form.querySelector("[data-field-error]");
    const alert = form.querySelector("[data-auth-alert]");
    const alertText = form.querySelector("[data-auth-alert-text]");
    const submit = form.querySelector("[data-auth-submit]");

    const digits = [...codeForm.querySelectorAll(".code__digit")];
    const codeSubmit = codeForm.querySelector("[data-code-submit]");
    const codePhone = codeForm.querySelector("[data-code-phone]");
    const resend = codeForm.querySelector("[data-resend]");
    const resendTimer = codeForm.querySelector("[data-resend-timer]");
    const changePhone = codeForm.querySelector("[data-change-phone]");
    const codeBox = codeForm.querySelector(".code");
    const codeError = codeForm.querySelector("[data-code-error]");
    const codeAlert = codeForm.querySelector("[data-code-alert]");

    const CODE_STATES = {
      wrong: { error: "Неверный код. Попробуйте ещё раз." },
      expired: { error: "Срок действия кода истёк", button: "Получить новый код", clear: true },
      server: { alert: true, button: "Попробовать ещё раз" },
    };
    let codeState = "";

    const RESEND_SECONDS = 59;
    let phone = "";
    let timerId = 0;

    const digitsOf = (value) => {
      let d = value.replace(/\D/g, "");
      if (d.length > 10 && (d[0] === "7" || d[0] === "8")) d = d.slice(1);
      else if (value.trim().startsWith("+7")) d = d.slice(1);
      return d.slice(0, 10);
    };

    const format = (d) => {
      if (!d) return "";
      let out = "+7 (" + d.slice(0, 3);
      if (d.length >= 3) out += ") " + d.slice(3, 6);
      if (d.length >= 6) out += "-" + d.slice(6, 8);
      if (d.length >= 8) out += "-" + d.slice(8, 10);
      return out;
    };

    const isValid = (d) => d.length === 10 && d[0] === "7";

    const setError = (on) => {
      field.classList.toggle("is-error", on);
      fieldError.hidden = !on;
      input.setAttribute("aria-invalid", on ? "true" : "false");
    };

    const setAlert = (text) => {
      if (text) alertText.textContent = text;
      alert.hidden = !text;
    };

    const setLoading = (on) => { loader.hidden = !on; };

    const update = () => {
      const d = digitsOf(input.value);
      input.value = format(d);
      submit.disabled = !isValid(d);
      if (isValid(d)) setError(false);
      setAlert("");
    };

    input.addEventListener("input", update);

    input.addEventListener("blur", () => {
      const d = digitsOf(input.value);
      setError(d.length > 0 && !isValid(d));
    });

    const startTimer = () => {
      clearInterval(timerId);
      let left = RESEND_SECONDS;
      resend.disabled = true;
      resendTimer.textContent = " (через " + left + " сек)";
      timerId = setInterval(() => {
        left -= 1;
        if (left > 0) {
          resendTimer.textContent = " (через " + left + " сек)";
          return;
        }
        clearInterval(timerId);
        resendTimer.textContent = "";
        resend.disabled = false;
      }, 1000);
    };

    const isCodeFull = () => digits.every((el) => el.value);

    const setCodeState = (name) => {
      const s = CODE_STATES[name] || {};
      codeState = CODE_STATES[name] ? name : "";
      setLoading(false);
      if (s.clear) digits.forEach((el) => { el.value = ""; });
      codeBox.classList.toggle("is-error", name === "wrong");
      codeError.hidden = !s.error;
      codeError.textContent = s.error || "";
      codeAlert.hidden = !s.alert;
      codeSubmit.textContent = s.button || "Продолжить";
      codeSubmit.disabled = s.button ? false : name === "wrong" || !isCodeFull();
      resend.hidden = Boolean(s.button);
      if (s.button) clearInterval(timerId);
    };

    const showCode = () => {
      codePhone.textContent = "+7 ••• ••• •• " + phone.slice(-2);
      digits.forEach((el) => { el.value = ""; });
      setCodeState("");
      form.hidden = true;
      codeForm.hidden = false;
      startTimer();
      digits[0].focus();
    };

    const showPhone = () => {
      clearInterval(timerId);
      codeForm.hidden = true;
      form.hidden = false;
      input.focus();
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const d = digitsOf(input.value);
      if (!isValid(d)) { setError(true); return; }
      phone = "+7" + d;
      form.dispatchEvent(new CustomEvent("auth:submit", { detail: { phone } }));
    });

    const codeValue = () => digits.map((el) => el.value).join("");

    const fillFrom = (start, text) => {
      const chars = text.replace(/\D/g, "").split("");
      let i = start;
      chars.forEach((ch) => { if (i < digits.length) digits[i++].value = ch; });
      digits[Math.min(i, digits.length - 1)].focus();
      if (codeState === "wrong" || codeState === "expired") setCodeState("");
      codeSubmit.disabled = codeState !== "server" && !isCodeFull();
    };

    digits.forEach((el, i) => {
      el.addEventListener("input", () => {
        const v = el.value;
        el.value = "";
        fillFrom(i, v);
      });

      el.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !el.value && i > 0) {
          digits[i - 1].value = "";
          digits[i - 1].focus();
          if (codeState === "wrong") setCodeState("");
          codeSubmit.disabled = codeState !== "server";
          e.preventDefault();
        }
        if (e.key === "ArrowLeft" && i > 0) digits[i - 1].focus();
        if (e.key === "ArrowRight" && i < digits.length - 1) digits[i + 1].focus();
      });

      el.addEventListener("paste", (e) => {
        e.preventDefault();
        fillFrom(i, (e.clipboardData || window.clipboardData).getData("text"));
      });

      el.addEventListener("focus", () => el.select());
    });

    codeForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (codeState === "expired") { requestNewCode(); return; }
      const code = codeValue();
      if (code.length !== digits.length) return;
      setCodeState("");
      codeForm.dispatchEvent(new CustomEvent("auth:verify", { detail: { phone, code } }));
    });

    const requestNewCode = () => {
      setCodeState("");
      startTimer();
      digits[0].focus();
      codeForm.dispatchEvent(new CustomEvent("auth:resend", { detail: { phone } }));
    };

    resend.addEventListener("click", requestNewCode);

    changePhone.addEventListener("click", showPhone);

    window.flexAuth = { showError: setAlert, showCode, showPhone, setLoading, setCodeState };

    form.addEventListener("auth:submit", () => {
      setLoading(true);
      setTimeout(() => { setLoading(false); showCode(); }, 800);
    });

    const showLoginProgress = () => {
      clearInterval(timerId);
      form.hidden = true;
      codeForm.hidden = true;
      loginProgress.hidden = false;
    };

    window.flexAuth.showLoginProgress = showLoginProgress;

    codeForm.addEventListener("auth:verify", () => {
      showLoginProgress();
      setTimeout(() => showRegistration(), 1200);
    });

    const iinForm = document.querySelector("[data-iin-form]");
    const iinField = iinForm.querySelector("[data-iin-field]");
    const iinInput = iinForm.querySelector("[data-iin]");
    const iinError = iinForm.querySelector("[data-iin-error]");
    const iinSubmit = iinForm.querySelector("[data-iin-submit]");
    const IIN_ERROR = iinError.textContent;

    const iinChecksum = (d, w) => d.slice(0, 11).split("").reduce((s, n, i) => s + n * w[i], 0) % 11;

    const isValidIin = (d) => {
      if (!/^\d{12}$/.test(d)) return false;
      let c = iinChecksum(d, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
      if (c === 10) c = iinChecksum(d, [3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2]);
      return c !== 10 && c === Number(d[11]);
    };

    const setIinError = (text) => {
      iinField.classList.toggle("is-error", Boolean(text));
      iinError.hidden = !text;
      iinError.textContent = text || IIN_ERROR;
      iinInput.setAttribute("aria-invalid", text ? "true" : "false");
      if (text) iinSubmit.disabled = true;
    };

    const showRegistration = () => {
      clearInterval(timerId);
      form.hidden = true;
      codeForm.hidden = true;
      loginProgress.hidden = true;
      iinForm.hidden = false;
      setLoading(false);
      iinInput.focus();
    };

    iinInput.addEventListener("input", () => {
      iinInput.value = iinInput.value.replace(/\D/g, "").slice(0, 12);
      setIinError("");
      iinSubmit.disabled = !isValidIin(iinInput.value);
    });

    iinInput.addEventListener("blur", () => {
      const v = iinInput.value;
      if (v.length === 12 && !isValidIin(v)) setIinError(IIN_ERROR);
    });

    iinForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!isValidIin(iinInput.value)) { setIinError(IIN_ERROR); return; }
      iinForm.dispatchEvent(new CustomEvent("auth:register", { detail: { phone, iin: iinInput.value } }));
    });

    iinForm.addEventListener("auth:register", () => {
      setLoading(true);
      setTimeout(() => showComplete(), 800);
    });

    const complete = document.querySelector("[data-complete]");
    const completeLink = complete.querySelector("[data-complete-link]");
    const completeSpinner = complete.querySelector("[data-complete-spinner]");

    const showComplete = (opts = {}) => {
      clearInterval(timerId);
      setLoading(false);
      [form, codeForm, iinForm, loginProgress].forEach((el) => { el.hidden = true; });
      complete.hidden = false;
      if (opts.href) completeLink.href = opts.href;
      completeLink.hidden = Boolean(opts.redirecting);
      completeSpinner.hidden = !opts.redirecting;
      complete.classList.toggle("is-redirecting", Boolean(opts.redirecting));
    };

    completeLink.addEventListener("click", (e) => {
      e.preventDefault();
      const href = completeLink.getAttribute("href");
      showComplete({ redirecting: true });
      if (href && href !== "#") setTimeout(() => { location.href = href; }, 600);
    });

    Object.assign(window.flexAuth, { showRegistration, setIinError, showComplete });

    const state = new URLSearchParams(location.search).get("state");
    if (state === "error") { input.value = "+7 (407) 123-45-0"; update(); setError(true); }
    if (state === "sms-error") { input.value = "+7 (707) 123-45-67"; update(); setAlert(alertText.textContent); }
    if (state === "correct") { input.value = "+7 (775) 715-45-90"; update(); }
    if (state && state.startsWith("code") || state === "loading") {
      phone = "+77757154500";
      showCode();
      if (state === "code-typing") fillFrom(0, "5");
      else if (state === "code-wrong") { fillFrom(0, "528419"); setCodeState("wrong"); }
      else if (state === "code-expired") setCodeState("expired");
      else if (state === "code-server") { fillFrom(0, "853194"); setCodeState("server"); }
      else fillFrom(0, "530156");
      if (state === "loading") setLoading(true);
    }
    if (state === "login") showLoginProgress();
    if (state === "complete") showComplete();
    if (state === "complete-redirect") showComplete({ redirecting: true });
    if (state && state.startsWith("iin")) {
      showRegistration();
      const fill = (v) => { iinInput.value = v; iinInput.dispatchEvent(new Event("input")); };
      if (state === "iin-typing") fill("040823");
      if (state === "iin-error") { fill("040823650651"); setIinError(IIN_ERROR); iinInput.blur(); }
      if (state === "iin-correct") { fill("040823650651"); iinInput.blur(); }
    }
  };

  const initFaq = () => {
    const list = document.querySelector("[data-faq]");
    if (!list) return;

    list.addEventListener("click", (e) => {
      const toggle = e.target.closest(".faq__toggle");
      if (!toggle) return;
      const item = toggle.closest(".faq__item");
      const open = !item.classList.contains("is-open");
      item.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
  };

  const initSelect = (root, onChange) => {
    const trigger = root.querySelector("[data-select-trigger]");
    const menu = root.querySelector("[data-select-menu]");
    const value = root.querySelector("[data-select-value]");
    const options = [...menu.querySelectorAll(".select__option")];

    const setOpen = (open) => {
      menu.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
    };

    trigger.addEventListener("click", () => setOpen(menu.hidden));

    options.forEach((option) => {
      option.addEventListener("click", () => {
        options.forEach((o) => {
          const on = o === option;
          o.classList.toggle("is-selected", on);
          o.setAttribute("aria-selected", String(on));
        });
        value.textContent = option.textContent;
        setOpen(false);
        trigger.focus();
        if (onChange) onChange(option.textContent);
      });
    });

    document.addEventListener("click", (e) => {
      if (!root.contains(e.target)) setOpen(false);
    });

    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !menu.hidden) { setOpen(false); trigger.focus(); }
    });
  };

  const initStores = () => {
    const root = document.querySelector("[data-stores]");
    if (!root) return;

    const cards = [...root.querySelectorAll("[data-store]")];
    const pins = [...root.querySelectorAll("[data-pin]")];
    const search = root.querySelector("[data-store-search]");
    const empty = root.querySelector("[data-store-empty]");
    const tooltip = root.querySelector("[data-map-tooltip]");
    const tipName = tooltip.querySelector("[data-tooltip-name]");
    const tipAddress = tooltip.querySelector("[data-tooltip-address]");
    const tipMeta = tooltip.querySelector("[data-tooltip-meta]");

    const pinFor = (id) => pins.find((p) => p.dataset.pin.split(",").includes(id));

    const placeTooltip = (pin) => {
      const gap = pin.offsetWidth + 6;
      let left = pin.offsetLeft + gap;
      if (left + tooltip.offsetWidth > pin.offsetParent.clientWidth) left = pin.offsetLeft - tooltip.offsetWidth - 6;
      tooltip.style.left = left + "px";
      tooltip.style.top = Math.max(0, pin.offsetTop - 28) + "px";
    };

    const select = (id, scroll) => {
      const card = cards.find((c) => c.dataset.store === id);
      if (!card) return;
      cards.forEach((c) => {
        const on = c === card;
        c.classList.toggle("is-active", on);
        c.setAttribute("aria-pressed", String(on));
      });
      const pin = pinFor(id);
      pins.forEach((p) => p.classList.toggle("is-active", p === pin));

      tipName.textContent = card.querySelector(".store__name").textContent;
      tipAddress.textContent = card.querySelector(".store__address").textContent;
      tipMeta.textContent = card.querySelector(".store__distance").textContent + " • " + card.querySelector(".store__hours").textContent;
      if (pin) placeTooltip(pin);

      if (scroll) card.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };

    cards.forEach((card) => card.addEventListener("click", () => select(card.dataset.store)));
    pins.forEach((pin) => pin.addEventListener("click", () => select(pin.dataset.pin.split(",")[0], true)));

    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      let shown = 0;
      cards.forEach((card) => {
        const match = !q || card.textContent.toLowerCase().includes(q);
        card.parentElement.hidden = !match;
        if (match) shown += 1;
      });
      empty.hidden = shown > 0;
    });


    const active = cards.find((c) => c.classList.contains("is-active"));
    const relayout = () => { if (active) select(root.querySelector(".store.is-active").dataset.store); };
    relayout();
    window.addEventListener("resize", relayout);
  };

  const initProfile = () => {
    const modal = document.querySelector("[data-email-modal]");
    const emailField = document.querySelector("[data-email]");
    const openBtn = document.querySelector("[data-email-edit]");
    if (!modal || !emailField || !openBtn) return;

    const steps = [...modal.querySelectorAll("[data-email-step]")];
    const current = modal.querySelector("[data-email-current]");
    const newInput = modal.querySelector("[data-email-new]");
    const newField = newInput.closest(".field");
    const error = modal.querySelector("[data-email-error]");
    const digits = [...modal.querySelectorAll(".otp__digit")];
    const confirm = modal.querySelector("[data-email-confirm]");
    const timerText = modal.querySelector("[data-email-timer]");
    const resend = modal.querySelector("[data-email-resend]");
    const saved = modal.querySelector("[data-email-saved]");

    const RESEND_SECONDS = 60;
    let timerId = 0;

    const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

    const showStep = (name) => {
      steps.forEach((s) => { s.hidden = s.dataset.emailStep !== name; });
      const target = steps.find((s) => s.dataset.emailStep === name);
      const focusable = target.querySelector("input:not([readonly]), button[type=submit], button:not([data-modal-close])");
      if (focusable) focusable.focus();
    };

    const setError = (on) => {
      newField.classList.toggle("is-error", on);
      error.hidden = !on;
      newInput.setAttribute("aria-invalid", String(on));
    };

    const pad = (n) => String(n).padStart(2, "0");

    const startTimer = () => {
      clearInterval(timerId);
      let left = RESEND_SECONDS;
      const render = () => { timerText.textContent = "Отправить повторно через " + pad(Math.floor(left / 60)) + ":" + pad(left % 60); };
      timerText.hidden = false;
      resend.hidden = true;
      render();
      timerId = setInterval(() => {
        left -= 1;
        if (left > 0) { render(); return; }
        clearInterval(timerId);
        timerText.hidden = true;
        resend.hidden = false;
      }, 1000);
    };

    const codeValue = () => digits.map((d) => d.value).join("");

    const fillFrom = (start, text) => {
      let i = start;
      text.replace(/\D/g, "").split("").forEach((ch) => { if (i < digits.length) digits[i++].value = ch; });
      digits[Math.min(i, digits.length - 1)].focus();
      confirm.disabled = codeValue().length !== digits.length;
    };

    digits.forEach((el, i) => {
      el.addEventListener("input", () => { const v = el.value; el.value = ""; fillFrom(i, v); });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !el.value && i > 0) {
          digits[i - 1].value = "";
          digits[i - 1].focus();
          confirm.disabled = true;
          e.preventDefault();
        }
      });
      el.addEventListener("paste", (e) => { e.preventDefault(); fillFrom(i, e.clipboardData.getData("text")); });
      el.addEventListener("focus", () => el.select());
    });

    const open = () => {
      current.value = emailField.value;
      newInput.value = "";
      setError(false);
      digits.forEach((d) => { d.value = ""; });
      confirm.disabled = true;
      modal.showModal();
      showStep("edit");
    };

    const close = () => {
      clearInterval(timerId);
      modal.close();
    };

    openBtn.addEventListener("click", open);
    modal.querySelectorAll("[data-modal-close]").forEach((b) => b.addEventListener("click", close));
    modal.addEventListener("close", () => clearInterval(timerId));
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

    newInput.addEventListener("input", () => setError(false));

    modal.querySelector('[data-email-step="edit"]').addEventListener("submit", (e) => {
      e.preventDefault();
      const v = newInput.value.trim();
      if (!isEmail(v) || v === current.value) { setError(true); newInput.focus(); return; }
      newInput.value = v;
      modal.dispatchEvent(new CustomEvent("profile:email-request", { detail: { email: v } }));
      digits.forEach((d) => { d.value = ""; });
      confirm.disabled = true;
      showStep("code");
      startTimer();
    });

    modal.querySelector("[data-email-back]").addEventListener("click", () => {
      clearInterval(timerId);
      showStep("edit");
    });

    resend.addEventListener("click", () => {
      modal.dispatchEvent(new CustomEvent("profile:email-request", { detail: { email: newInput.value } }));
      startTimer();
      digits[0].focus();
    });

    modal.querySelector('[data-email-step="code"]').addEventListener("submit", (e) => {
      e.preventDefault();
      if (codeValue().length !== digits.length) return;
      clearInterval(timerId);
      modal.dispatchEvent(new CustomEvent("profile:email-confirm", { detail: { email: newInput.value, code: codeValue() } }));
      emailField.value = newInput.value;
      saved.textContent = newInput.value;
      showStep("done");
    });
  };

  const initProductCards = () => {
    document.querySelectorAll("[data-product]").forEach((card) => {
      const imgs = [...card.querySelectorAll(".product-card__img")];
      const dots = [...card.querySelectorAll(".product-card__dot")];
      if (imgs.length < 2) return;

      const show = (index) => {
        imgs.forEach((img, i) => img.classList.toggle("is-active", i === index));
        dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
      };

      card.addEventListener("mouseenter", () => show(1));
      card.addEventListener("mouseleave", () => show(0));
      dots.forEach((dot, i) => dot.addEventListener("click", () => show(i)));
    });

    document.querySelectorAll("[data-fav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const on = !btn.classList.contains("is-active");
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", String(on));
        btn.setAttribute("aria-label", on ? "Убрать из избранного" : "Добавить в избранное");
        btn.dispatchEvent(new CustomEvent("product:favorite", { bubbles: true, detail: { favorite: on } }));
      });
    });
  };

  const initProductSwipers = () => {
    if (!window.Swiper) return;
    document.querySelectorAll("[data-products-swiper]").forEach((el) => {
      new Swiper(el, {
        slidesPerView: "auto",
        spaceBetween: 24 * (window.innerWidth / 1440),
        grabCursor: true,
        on: {
          resize(swiper) {
            swiper.params.spaceBetween = 24 * (window.innerWidth / 1440);
            swiper.update();
          },
        },
      });
    });
  };

  initAuth();
  initFaq();
  initStores();
  initProfile();
  initProductCards();
  initProductSwipers();
  document.querySelectorAll("[data-select]").forEach((el) => initSelect(el));
})();
