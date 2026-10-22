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
      return d.replace(/^8+/, "").slice(0, 10);
    };

    const format = (d) => {
      if (!d) return "";
      let out = "+7 (" + d.slice(0, 3);
      if (d.length > 3) out += ") " + d.slice(3, 6);
      if (d.length > 6) out += "-" + d.slice(6, 8);
      if (d.length > 8) out += "-" + d.slice(8, 10);
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

    const caretAfter = (n) => {
      if (n === 0) return Math.min(4, input.value.length);
      let seen = 0;
      for (let i = 4; i < input.value.length; i++) {
        if (/\d/.test(input.value[i]) && ++seen === n) return i + 1;
      }
      return input.value.length;
    };

    input.addEventListener("keydown", (e) => {
      if (e.key !== "Backspace" || input.selectionStart !== input.selectionEnd) return;
      const pos = input.selectionStart;
      if (pos <= 4 || /\d/.test(input.value[pos - 1])) return;
      e.preventDefault();
      const d = digitsOf(input.value);
      const before = (input.value.slice(4, pos).match(/\d/g) || []).length;
      if (before === 0) return;
      const next = d.slice(0, before - 1) + d.slice(before);
      input.value = format(next);
      const caret = caretAfter(before - 1);
      input.setSelectionRange(caret, caret);
      submit.disabled = !isValid(next);
      setAlert("");
    });

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

    const showLoginProgress = () => {
      clearInterval(timerId);
      form.hidden = true;
      codeForm.hidden = true;
      loginProgress.hidden = false;
    };

    window.flexAuth.showLoginProgress = showLoginProgress;

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
    document.querySelectorAll("[data-faq]").forEach((list) => {
      list.addEventListener("click", (e) => {
        const toggle = e.target.closest(".faq__toggle");
        if (!toggle) return;
        const item = toggle.closest(".faq__item");
        const open = !item.classList.contains("is-open");
        item.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
      });
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
    menu.querySelectorAll("[data-select-close]").forEach((b) => b.addEventListener("click", () => { setOpen(false); trigger.focus(); }));

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

  const FAV_KEY = "flex_favorites";

  const readFavs = () => {
    try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch (e) { return []; }
  };

  const writeFavs = (list) => {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(list)); } catch (e) {}
  };

  const favId = (card) => card.querySelector(".product-card__title a")?.getAttribute("href") || card.dataset.name;

  const favSnapshot = (card) => {
    const el = card.cloneNode(true);
    el.classList.add("swiper-slide");
    el.removeAttribute("style");
    [".product-card__img", ".product-card__dot"].forEach((sel) => {
      el.querySelectorAll(sel).forEach((x, i) => x.classList.toggle("is-active", i === 0));
    });
    return el.outerHTML;
  };

  const initFavList = () => {
    const wrap = document.querySelector("[data-fav-list] .swiper-wrapper");
    if (!wrap) return;
    const favs = readFavs();
    wrap.innerHTML = favs.map((f) => f.html).join("");
    document.querySelector("[data-fav-empty]").hidden = favs.length > 0;
  };

  const initProductCards = () => {
    document.querySelectorAll("[data-product]").forEach((card) => {
      const imgs = [...card.querySelectorAll(".product-card__img")];
      const dots = [...card.querySelectorAll(".product-card__dot")];
      if (imgs.length < 2) return;

      let current = 0;
      let timer = 0;

      const show = (index) => {
        current = index;
        imgs.forEach((img, i) => img.classList.toggle("is-active", i === index));
        dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
      };

      const stop = () => { clearInterval(timer); timer = 0; };

      card.addEventListener("mouseenter", () => {
        stop();
        show(1);
        timer = setInterval(() => show((current + 1) % imgs.length), 1200);
      });

      card.addEventListener("mouseleave", () => {
        stop();
        show(0);
      });

      dots.forEach((dot, i) => dot.addEventListener("click", () => { stop(); show(i); }));
    });

    const setFav = (btn, on) => {
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", String(on));
      btn.setAttribute("aria-label", on ? "Убрать из избранного" : "Добавить в избранное");
    };

    const removeFavCard = (card, list, left) => {
      card.style.pointerEvents = "none";
      card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      card.style.opacity = "0";
      card.style.transform = "scale(0.95)";
      setTimeout(() => {
        const rest = [...list.querySelectorAll("[data-product]")].filter((c) => c !== card);
        const before = rest.map((c) => c.getBoundingClientRect());
        card.remove();
        list.swiper?.update();
        rest.forEach((c, i) => {
          const now = c.getBoundingClientRect();
          const dx = before[i].left - now.left;
          const dy = before[i].top - now.top;
          if (dx || dy) c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 450, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
        });
        document.querySelector("[data-fav-empty]").hidden = left > 0;
      }, 300);
    };

    const saved = new Set(readFavs().map((f) => f.id));

    document.querySelectorAll("[data-fav]").forEach((btn) => {
      const card = btn.closest("[data-product]");
      const id = favId(card);
      setFav(btn, saved.has(id));

      btn.addEventListener("click", () => {
        const on = !btn.classList.contains("is-active");
        setFav(btn, on);
        const favs = readFavs().filter((f) => f.id !== id);
        if (on) favs.push({ id, html: favSnapshot(card) });
        writeFavs(favs);

        const list = card.closest("[data-fav-list]");
        if (list && !on) removeFavCard(card, list, favs.length);
      });
    });
  };

  const initProductSwipers = () => {
    if (!window.Swiper) return;
    document.querySelectorAll("[data-products-swiper]").forEach((el) => {
      if (el.hasAttribute("data-fav-list") && window.matchMedia("(max-width: 767px)").matches) return;
      const arrow = (dir, d) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "stick-gallery__arrow stick-gallery__arrow--" + dir;
        btn.setAttribute("aria-label", dir === "prev" ? "Назад" : "Вперёд");
        btn.innerHTML = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${d}" /></svg>`;
        el.append(btn);
        return btn;
      };
      new Swiper(el, {
        navigation: { prevEl: arrow("prev", "M12.5 15L7.5 10L12.5 5"), nextEl: arrow("next", "M7.5 15L12.5 10L7.5 5") },
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

  const initTabs = () => {
    document.querySelectorAll("[data-tabs]").forEach((list) => {
      const tabs = [...list.querySelectorAll('[role="tab"]')];

      const select = (tab) => {
        tabs.forEach((t) => {
          const on = t === tab;
          t.classList.toggle("is-active", on);
          t.setAttribute("aria-selected", String(on));
          t.tabIndex = on ? 0 : -1;
          const panel = document.getElementById(t.getAttribute("aria-controls"));
          if (panel) panel.hidden = !on;
        });
      };

      tabs.forEach((tab, i) => {
        tab.addEventListener("click", () => select(tab));
        tab.addEventListener("keydown", (e) => {
          const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (!step) return;
          e.preventDefault();
          const next = tabs[(i + step + tabs.length) % tabs.length];
          select(next);
          next.focus();
        });
      });
    });
  };

  const initShades = () => {
    const el = document.querySelector("[data-shades]");
    if (!el) return;
    if (!("IntersectionObserver" in window)) { el.classList.add("is-active"); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        el.classList.add("is-active");
        io.disconnect();
      });
    }, { threshold: 0.35 });
    io.observe(el);
  };

  const initHeaderMenus = () => {
    const menus = [...document.querySelectorAll("[data-menu]")];
    if (!menus.length) return;
    const canHover = window.matchMedia("(hover: hover)").matches;

    const setOpen = (menu, open) => {
      const trigger = menu.querySelector("[data-menu-trigger]");
      const list = menu.querySelector("[data-menu-list]");
      clearTimeout(menu.closeTimer);
      list.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
    };

    menus.forEach((menu) => {
      const trigger = menu.querySelector("[data-menu-trigger]");

      trigger.addEventListener("click", () => {
        const open = trigger.getAttribute("aria-expanded") !== "true";
        menus.forEach((m) => { if (m !== menu) setOpen(m, false); });
        setOpen(menu, open);
      });

      if (canHover) {
        menu.addEventListener("mouseenter", () => setOpen(menu, true));
        menu.addEventListener("mouseleave", () => {
          menu.closeTimer = setTimeout(() => setOpen(menu, false), 150);
        });
      }

      menu.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        setOpen(menu, false);
        trigger.focus();
      });

      menu.addEventListener("focusout", (e) => {
        if (!menu.contains(e.relatedTarget)) setOpen(menu, false);
      });
    });

    document.addEventListener("click", (e) => {
      menus.forEach((m) => { if (!m.contains(e.target)) setOpen(m, false); });
    });
  };

  const initStick = () => {
    const root = document.querySelector("[data-stick]");
    const dataEl = document.getElementById("stick-data");
    if (!root || !dataEl) return;

    const flavours = JSON.parse(dataEl.textContent);
    const swatches = [...root.querySelectorAll("[data-flavour]")];
    const text = root.querySelector("[data-stick-text]");
    const metrics = [...root.querySelectorAll("[data-metric]")];
    const labels = ["Насыщенность", "Ментол"];

    const heading = root.querySelector("[data-stick-heading]");
    const param = root.dataset.param || "flavour";
    const titleTpl = root.dataset.title || "{name}";

    const apply = (key, push) => {
      const f = flavours[key];
      if (!f) return;
      root.querySelectorAll("[data-stick-name]").forEach((el) => { el.textContent = f.name; });
      if (text && f.text) text.textContent = f.text;
      if (heading && f.heading) heading.textContent = f.heading;
      if (f.metrics) {
        metrics.forEach((m, i) => {
          [...m.children].forEach((dot, k) => dot.classList.toggle("is-on", k < f.metrics[i]));
          m.setAttribute("aria-label", labels[i] + ": " + f.metrics[i] + " из 5");
        });
      }
      swatches.forEach((s) => {
        const on = s.dataset.flavour === key;
        s.classList.toggle("is-active", on);
        s.setAttribute("aria-checked", String(on));
      });
      document.title = titleTpl.replace("{name}", f.name);
      if (push) history.replaceState(null, "", "?" + param + "=" + key);
    };

    const makeSlides = (key) => {
      const f = flavours[key];
      if (!f || !Array.isArray(f.images)) return [];
      return f.images.map((src, index) => {
        const slide = document.createElement("div");
        slide.className = "swiper-slide stick-gallery__slide stick-gallery__slide--pack";
        if (f.glow) {
          slide.style.setProperty("--glow-from", f.glow[0]);
          slide.style.setProperty("--glow-to", f.glow[1]);
        }

        const img = document.createElement("img");
        img.src = src;
        img.alt = index === 0 ? f.name : f.name + ", другой ракурс";
        img.width = param === "color" ? 600 : 640;
        img.height = param === "color" ? 798 : 520;
        if (index > 0) img.loading = "lazy";
        slide.appendChild(img);
        return slide;
      });
    };

    const initial = new URLSearchParams(location.search).get(param);
    const fallback = swatches.find((s) => s.classList.contains("is-active"))?.dataset.flavour;
    const initialKey = initial && flavours[initial] ? initial : fallback;
    if (initialKey) apply(initialKey, false);

    const el = root.querySelector("[data-stick-gallery]");
    const dotsBox = root.querySelector("[data-stick-dots]");
    let gallery = null;
    if (!el || !window.Swiper) return;

    gallery = new Swiper(el, {
      rewind: true,
      speed: 500,
      grabCursor: true,
      navigation: {
        prevEl: root.querySelector("[data-stick-prev]"),
        nextEl: root.querySelector("[data-stick-next]"),
      },
      pagination: {
        el: dotsBox,
        clickable: true,
        bulletClass: "stick-gallery__dot",
        bulletActiveClass: "is-active",
        bulletElement: "button",
      },
    });

    const renderGallery = (key) => {
      const slides = makeSlides(key);
      if (!slides.length) return;
      gallery.removeAllSlides();
      gallery.appendSlide(slides);
      gallery.update();
      gallery.slideTo(0, 0);
    };

    if (initialKey) renderGallery(initialKey);

    swatches.forEach((s) => s.addEventListener("click", () => {
      const key = s.dataset.flavour;
      apply(key, true);
      renderGallery(key);
    }));
  };

  const initCatalog = () => {
    const root = document.querySelector("[data-catalog]");
    if (!root) return;

    const grid = root.querySelector("[data-catalog-grid]");
    const cards = [...grid.querySelectorAll("[data-category]")];
    const tabs = [...root.querySelectorAll("[data-filter]")];
    const more = root.querySelector("[data-catalog-more]");
    const empty = root.querySelector("[data-catalog-empty]");
    const promoCard = root.querySelector("[data-catalog-promo]");
    const PAGE = 8;
    let filter = "all";
    let limit = PAGE;

    const render = () => {
      const matching = [...grid.querySelectorAll("[data-category]")]
        .filter((c) => (filter === "all" || c.dataset.category === filter) && matchesFilters(c, applied));
      cards.forEach((c) => { c.hidden = true; });
      matching.forEach((c, i) => { c.hidden = i >= limit; });
      more.hidden = matching.length <= limit;
      empty.hidden = matching.length > 0;
      if (promoCard) {
        const plain = filter === "all" && !applied.notes.length && !applied.menthol && !applied.capsule;
        promoCard.hidden = !plain;
      }
    };

    const filterRoot = root.querySelector("[data-filter-root]");
    const filterPanel = root.querySelector("[data-filter-panel]");
    const filterTrigger = root.querySelector("[data-filter-trigger]");
    const filterBadge = root.querySelector("[data-filter-badge]");
    const filterApply = root.querySelector("[data-filter-apply]");

    const readFilters = () => {
      const data = new FormData(filterPanel);
      return { notes: data.getAll("notes"), menthol: data.get("menthol"), capsule: data.get("capsule") };
    };

    const matchesFilters = (card, f) => {
      if (!f.notes.length && !f.menthol && !f.capsule) return true;
      if (!("menthol" in card.dataset)) return false;
      if (f.notes.length && !f.notes.some((n) => card.dataset.notes.split(" ").includes(n))) return false;
      if (f.menthol && card.dataset.menthol !== f.menthol) return false;
      if (f.capsule && card.dataset.capsule !== f.capsule) return false;
      return true;
    };

    let applied = readFilters();

    const countFor = (f) => cards.filter((c) => (filter === "all" || c.dataset.category === filter) && matchesFilters(c, f)).length;

    const plural = (n) => {
      const m10 = n % 10;
      const m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return "товар";
      if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "товара";
      return "товаров";
    };

    const filterCount = root.querySelector("[data-filter-count]");
    const filterBackdrop = root.querySelector("[data-filter-backdrop]");

    const updatePreview = () => {
      const f = readFilters();
      const n = countFor(f);
      filterApply.textContent = "Показать " + n + " " + plural(n);
      const selected = f.notes.length + (f.menthol ? 1 : 0) + (f.capsule ? 1 : 0);
      filterCount.textContent = selected;
      filterCount.hidden = selected === 0;
    };

    const updateBadge = () => {
      const n = applied.notes.length + (applied.menthol ? 1 : 0) + (applied.capsule ? 1 : 0);
      filterBadge.textContent = n;
      filterBadge.hidden = n === 0;
    };

    const isSheet = () => window.matchMedia("(max-width: 767px)").matches;

    const setFilterOpen = (open) => {
      filterPanel.hidden = !open;
      filterBackdrop.hidden = !(open && isSheet());
      document.documentElement.style.overflow = open && isSheet() ? "hidden" : "";
      filterTrigger.setAttribute("aria-expanded", String(open));
      if (open) updatePreview();
    };

    filterBackdrop.addEventListener("click", () => setFilterOpen(false));

    filterTrigger.addEventListener("click", () => setFilterOpen(filterPanel.hidden));
    filterPanel.querySelectorAll('input[type="radio"]').forEach((radio) => {
      const label = radio.closest("label");
      label.addEventListener("pointerdown", () => { radio.dataset.wasChecked = radio.checked ? "1" : ""; });
      radio.addEventListener("click", () => {
        if (radio.dataset.wasChecked !== "1") return;
        radio.checked = false;
        radio.dataset.wasChecked = "";
        updatePreview();
      });
    });

    filterPanel.addEventListener("change", updatePreview);
    filterPanel.addEventListener("reset", () => setTimeout(updatePreview));

    filterPanel.addEventListener("submit", (e) => {
      e.preventDefault();
      applied = readFilters();
      limit = PAGE;
      updateBadge();
      render();
      setFilterOpen(false);
      filterTrigger.focus();
    });

    document.addEventListener("click", (e) => {
      if (!filterPanel.hidden && !filterRoot.contains(e.target)) setFilterOpen(false);
    });

    filterRoot.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !filterPanel.hidden) { setFilterOpen(false); filterTrigger.focus(); }
    });

    tabs.forEach((tab) => tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", String(on));
      });
      filter = tab.dataset.filter;
      limit = PAGE;
      render();
    }));

    more.addEventListener("click", () => {
      limit += PAGE;
      render();
    });

    root.querySelectorAll("[data-sort]").forEach((opt) => opt.addEventListener("click", () => {
      const sorted = opt.dataset.sort === "alpha"
        ? [...cards].sort((a, b) => a.dataset.name.localeCompare(b.dataset.name, "ru"))
        : cards;
      sorted.forEach((c) => grid.appendChild(c));
      render();
    }));

    render();

    const promo = root.querySelector("[data-promo]");
    if (promo && window.Swiper) {
      new Swiper(promo, {
        rewind: true,
        speed: 600,
        grabCursor: true,
        autoplay: { delay: 6000, disableOnInteraction: false, pauseOnMouseEnter: true },
        pagination: {
          el: root.querySelector("[data-promo-dots]"),
          clickable: true,
          bulletClass: "stick-gallery__dot",
          bulletActiveClass: "is-active",
          bulletElement: "button",
        },
      });
    }
  };

  const initCopy = () => {
    document.querySelectorAll("[data-copy]").forEach((root) => {
      const input = root.querySelector("[data-copy-value]");
      const btn = root.querySelector("[data-copy-btn]");
      const status = root.querySelector("[data-copy-status]");
      let timer = 0;

      const done = (text) => {
        status.textContent = text;
        status.classList.add("is-visible");
        clearTimeout(timer);
        timer = setTimeout(() => status.classList.remove("is-visible"), 2000);
      };

      btn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(input.value);
          done("Скопировано");
        } catch (e) {
          input.select();
          done("Нажмите Ctrl+C, чтобы скопировать");
        }
      });

      input.addEventListener("focus", () => input.select());
    });
  };

  const initHome = () => {
    const reveal = (el, threshold) => {
      if (!("IntersectionObserver" in window)) { el.classList.add("is-active"); return; }
      const io = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        el.classList.add("is-active");
        io.disconnect();
      }, { threshold });
      io.observe(el);
    };

    document.querySelectorAll("[data-lineup]").forEach((el) => {
      reveal(el, 0.3);
      const last = el.querySelector(".lineup__item:last-child");
      last.addEventListener("transitionend", (e) => {
        if (e.target === last && e.propertyName === "transform") el.classList.add("is-ready");
      });
    });

    document.querySelectorAll("[data-cycle]").forEach((el) => {
      const items = [...el.querySelectorAll("[data-cycle-item]")];
      if (items.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (el.closest("[data-showcase]") && window.matchMedia("(min-width: 768px)").matches) return;
      let i = 0;
      setInterval(() => {
        items[i].classList.remove("is-active");
        i = (i + 1) % items.length;
        items[i].classList.add("is-active");
      }, 4000);
    });
  };

  const initLangSwitch = () => {
    document.querySelectorAll(".lang-switch").forEach((group) => {
      const btns = [...group.querySelectorAll(".lang-switch__btn")];
      btns.forEach((b) => b.addEventListener("click", () => {
        btns.forEach((x) => {
          const on = x === b;
          x.classList.toggle("is-active", on);
          x.setAttribute("aria-checked", String(on));
        });
      }));
    });
  };

  const initMobileMenu = () => {
    const burger = document.querySelector("[data-burger]");
    const menu = document.querySelector("[data-mobile-menu]");
    if (!burger || !menu) return;

    const setOpen = (open) => {
      menu.hidden = !open;
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Закрыть меню" : "Меню");
      document.documentElement.style.overflow = open ? "hidden" : "";
    };

    burger.addEventListener("click", () => setOpen(menu.hidden));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) setOpen(false); });
    window.matchMedia("(min-width: 768px)").addEventListener("change", (e) => { if (e.matches) setOpen(false); });
  };

  const initMobileHome = () => {
    const features = document.querySelector("[data-features]");
    if (features && window.Swiper) {
      new Swiper(features, {
        slidesPerView: 1,
        spaceBetween: 12,
        autoHeight: true,
        grabCursor: true,
        autoplay: { delay: 5000, disableOnInteraction: true },
      });
    }

    const picker = document.querySelector("[data-picker]");
    if (!picker) return;
    const devices = [...picker.querySelectorAll("[data-picker-device]")];
    const buttons = [...picker.querySelectorAll("[data-picker-color]")];

    const select = (key) => {
      let slot = 1;
      devices.forEach((d) => {
        const on = d.dataset.pickerDevice === key;
        d.classList.toggle("is-active", on);
        if (on) d.removeAttribute("data-slot");
        else d.dataset.slot = String(slot++);
      });
      buttons.forEach((b) => {
        const on = b.dataset.pickerColor === key;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-checked", String(on));
      });
    };

    buttons.forEach((b) => b.addEventListener("click", () => select(b.dataset.pickerColor)));
    select(buttons[0].dataset.pickerColor);
  };

  const initReadMore = () => {
    document.querySelectorAll("[data-read-more]").forEach((box) => {
      const text = box.querySelector(".read-more__text");
      const btn = box.querySelector("[data-read-more-btn]");
      const label = btn.firstChild;

      const check = () => {
        if (box.classList.contains("is-open")) return;
        btn.hidden = text.scrollHeight <= text.clientHeight + 1;
      };

      btn.addEventListener("click", () => {
        const open = !box.classList.contains("is-open");
        box.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", String(open));
        label.textContent = open ? "Свернуть " : "Показать полностью ";
      });

      check();
      window.addEventListener("resize", check);
    });
  };

  const initShowcase = () => {
    const root = document.querySelector("[data-showcase]");
    if (!root || !window.matchMedia("(min-width: 768px)").matches) return;
    const pin = root.querySelector(".showcase__pin");
    const video = root.querySelector("video");
    const items = [...root.querySelectorAll("[data-cycle-item]")];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (video && !reduced) {
      video.removeAttribute("autoplay");
      video.loop = false;
      video.preload = "auto";
      const webm = video.dataset.scrubWebm;
      const alpha = webm && video.canPlayType('video/webm; codecs="vp9"') && !/^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      video.src = alpha ? webm : (video.dataset.scrubSrc || video.src);
      video.classList.toggle("is-alpha", Boolean(alpha));
      if (alpha) video.removeAttribute("poster");
      video.pause();
    }

    const fit = () => {
      const need = 664 * (window.innerWidth / 1440);
      root.style.setProperty("--fit", String(Math.min(1, pin.clientHeight / need)));
    };

    let ticking = false;
    const update = () => {
      ticking = false;
      const top = parseFloat(getComputedStyle(pin).top) || 0;
      const rect = root.getBoundingClientRect();
      const total = rect.height - pin.offsetHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, (top - rect.top) / total)) : 0;
      if (video && !reduced && video.duration) {
        const t = p * (video.duration - 0.05);
        if (Math.abs(video.currentTime - t) > 0.02) video.currentTime = t;
      }
      items.forEach((item, i) => item.classList.toggle("is-active", reduced || p >= (i + 1) / (items.length + 1)));
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    fit();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => { fit(); update(); });
    if (video) video.addEventListener("loadedmetadata", update);
  };

  const initLineupFit = () => {
    const el = document.querySelector("[data-lineup]");
    if (!el) return;
    const fit = () => {
      if (!window.matchMedia("(min-width: 768px)").matches) { el.style.removeProperty("--lf"); return; }
      const wm = window.innerWidth / 1440;
      const header = document.querySelector(".header");
      const head = el.querySelector(".lineup__head");
      const avail = window.innerHeight - (header ? header.offsetHeight : 80 * wm) - (head ? head.offsetHeight : 0) - 88 * wm;
      el.style.setProperty("--lf", String(Math.min(1, avail / (680 * wm))));
    };
    fit();
    window.addEventListener("resize", fit);
  };

  const initFlavoursFit = () => {
    document.querySelectorAll(".home-flavours, .home .programs, .home .stores, .help .stores").forEach((el) => fitSection(el));
  };

  const fitSection = (el) => {
    const fit = () => {
      el.style.setProperty("--ff", "1");
      if (!window.matchMedia("(min-width: 768px)").matches) return;
      const header = document.querySelector(".header");
      const avail = window.innerHeight - (header ? header.offsetHeight : 0);
      const style = getComputedStyle(el);
      const content = [...el.children].reduce((h, c) => h + c.offsetHeight, 0) + parseFloat(style.rowGap || 0) * (el.children.length - 1) + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      el.style.setProperty("--ff", String(Math.min(1, avail / content)));
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("load", fit);
  };

  document.documentElement.style.visibility = "visible";

  const initMobilePosters = () => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    document.querySelectorAll("video[data-mobile-poster]").forEach((v) => { v.poster = v.dataset.mobilePoster; });
  };

  const initHeaderHide = () => {
    const header = document.querySelector(".header");
    if (!header) return;
    let last = window.scrollY;
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const busy = header.querySelector('[aria-expanded="true"]');
      if (Math.abs(y - last) < 4) return;
      const hide = y > last && y > header.offsetHeight && !busy;
      header.classList.toggle("is-hidden", hide);
      document.documentElement.classList.toggle("is-header-hidden", hide);
      last = y;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
  };

  const initHeroScrollIndicator = () => {
    const indicator = document.querySelector("[data-hero-scroll]");
    if (!indicator) return;

    let ticking = false;
    const update = () => {
      ticking = false;
      indicator.classList.toggle("is-hidden", window.scrollY > 8);
    };

    update();
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
  };

  const initFooterAcc = () => {
    document.querySelectorAll("[data-footer-acc]").forEach((btn) => {
      const item = btn.closest(".footer__acc");
      const sub = item.querySelector(".footer__msub");
      btn.addEventListener("click", () => {
        const open = btn.getAttribute("aria-expanded") !== "true";
        btn.setAttribute("aria-expanded", String(open));
        item.classList.toggle("is-open", open);
        sub.hidden = !open;
      });
    });
  };

  initAuth();
  initFaq();
  initProfile();
  initFavList();
  initProductCards();
  initProductSwipers();
  initTabs();
  initShades();
  initHeaderMenus();
  initStick();
  initCatalog();
  initCopy();
  initHome();
  initShowcase();
  initLineupFit();
  initFlavoursFit();
  initMobileMenu();
  initLangSwitch();
  initReadMore();
  initFooterAcc();
  initHeaderHide();
  initHeroScrollIndicator();
  initMobilePosters();
  initMobileHome();
  document.querySelectorAll("[data-select]").forEach((el) => initSelect(el));
})();
