(function () {
  "use strict";

  const KEY = "flex_session";

  const KZ = /^\/kz(\/|$)/.test(location.pathname);

  const ERRORS = KZ ? {
    INVALID_PHONE: "Телефон нөмірін +7 7XX XXX XX XX пішімінде енгізіңіз",
    OTP_INVALID: "Код қате немесе мерзімі өткен",
    INVALID_VERIFY_TOKEN: "Растау уақыты аяқталды. Кодты қайта сұратыңыз.",
    OTP_TOO_MANY_ATTEMPTS: "Тым көп әрекет. Кодты қайта сұратыңыз.",
  } : {
    INVALID_PHONE: "Введите номер телефона в формате +7 7XX XXX XX XX",
    OTP_INVALID: "Неверный или истёкший код",
    INVALID_VERIFY_TOKEN: "Время подтверждения истекло. Запросите код заново.",
    OTP_TOO_MANY_ATTEMPTS: "Слишком много попыток. Запросите код заново.",
  };

  const errorText = (data) => {
    const code = data.code || "";
    const detail = typeof data.detail === "string" ? data.detail : "";
    if (ERRORS[code]) return ERRORS[code];
    if (/ALREADY|EXISTS|TAKEN|DUPLICATE/.test(code) || /занят|уже (есть|существ|зарегистр)|already|exists/i.test(detail)) return KZ ? "Пайдаланушы бұрыннан тіркелген" : "Пользователь уже создан";
    if (/IIN/.test(code) && code !== "IIN_NOT_FOUND") return KZ ? "ЖСН қате көрсетілген" : "ИИН указан неверно";
    if (/курильщ|smoker/i.test(detail)) return "";
    return !KZ && /[а-яё]/i.test(detail) ? detail : "";
  };

  const api = async (path, body) => {
    const headers = { "Content-Type": "application/json" };
    const token = localStorage.getItem(KEY);
    if (token) headers.Authorization = "Bearer " + token;
    const res = await fetch("/api/v1" + path, { method: body ? "POST" : "GET", headers, body: body && JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, code: data.code || "", detail: errorText(data) };
    return data;
  };

  const logout = () => {
    ["flex_favorites", "flex_favorites_synced"].forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(KEY);
    fetch("/api/v1/logout", { method: "POST" }).finally(() => location.replace("login"));
  };

  const EMAIL_LOGIN = false;

  const saveToken = (token) => { if (token) localStorage.setItem(KEY, token); };

  const live = () => {
    let phoneMode = "login";
    let verifyToken = "";

    const session = async () => saveToken((await api("/cabinet/session", { verify_token: verifyToken })).token);

    return {
      email: EMAIL_LOGIN,

      async sendCode({ channel, value, purpose }) {
        if (channel === "email") return api("/email/code", { email: value, purpose, verify_token: verifyToken || undefined });
        if (purpose === "contact") return api("/phone", { phone: value, verify_token: verifyToken });
        try {
          await api("/cabinet/login/code", { phone: value });
          phoneMode = "login";
        } catch (err) {
          if (err.code !== "SITE_LOGIN_CLIENT_NOT_FOUND") throw err;
          await api("/phone", { phone: value });
          phoneMode = "register";
        }
      },

      async verifyCode({ channel, value, code, purpose }) {
        if (purpose === "contact") {
          const path = channel === "email" ? "/email/verify" : "/otp/verify";
          const res = await api(path, { [channel]: value, code, verify_token: verifyToken });
          if (res.verify_token) verifyToken = res.verify_token;
          return { next: "iin" };
        }
        if (channel === "email") {
          const res = await api("/email/verify", { email: value, code });
          verifyToken = res.verify_token || "";
          if (res.token) { saveToken(res.token); return { next: "done" }; }
          return { next: "contact" };
        }
        if (phoneMode === "login") {
          saveToken((await api("/cabinet/login/verify", { phone: value, code })).token);
          return { next: "done" };
        }
        const res = await api("/otp/verify", { phone: value, code });
        verifyToken = res.verify_token;
        if (res.registered) { await session(); return { next: "done" }; }
        return { next: EMAIL_LOGIN ? "contact" : "iin" };
      },

      async register({ iin }) {
        await api("/register", { verify_token: verifyToken, iin });
        await session();
      },
    };
  };

  const initLogin = (ui, backend) => {
    const other = { email: "phone", phone: "email" };
    const startForm = document.querySelector("[data-auth-form]");
    const codeForm = document.querySelector("[data-code-form]");
    const contactForm = document.querySelector("[data-contact-form]");
    const iinForm = document.querySelector("[data-iin-form]");
    const iinError = document.querySelector("[data-iin-error]").textContent;
    const done = () => { ui.showLoginProgress(); location.href = "./"; };
    const codeError = (err) => ui.setCodeState(err.code === "OTP_EXPIRED" ? "expired" : err.status && err.status < 500 ? "wrong" : "server");
    let firstChannel = "phone";

    if (backend.email) ui.enableEmail();

    startForm.addEventListener("auth:submit", async (e) => {
      ui.setLoading(true);
      try {
        await backend.sendCode({ ...e.detail, purpose: "login" });
        firstChannel = e.detail.channel;
        ui.showCode({ ...e.detail, purpose: "login" });
      } catch (err) {
        ui.setLoading(false);
        ui.showError();
      }
    });

    contactForm.addEventListener("auth:contact", async (e) => {
      ui.setLoading(true);
      try {
        await backend.sendCode({ ...e.detail, purpose: "contact" });
        ui.showCode({ ...e.detail, purpose: "contact" });
      } catch (err) {
        ui.setLoading(false);
        ui.setContactError(err.code === "CONTACT_TAKEN" ? "taken" : "send");
      }
    });

    codeForm.addEventListener("auth:resend", (e) => {
      backend.sendCode(e.detail).catch(() => ui.setCodeState("server"));
    });

    codeForm.addEventListener("auth:verify", async (e) => {
      ui.setLoading(true);
      try {
        const { next } = await backend.verifyCode(e.detail);
        if (next === "done") return done();
        if (next === "contact") return ui.showContact(other[firstChannel]);
        ui.showRegistration();
      } catch (err) {
        codeError(err);
      }
    });

    iinForm.addEventListener("auth:register", async (e) => {
      ui.setLoading(true);
      try {
        await backend.register(e.detail);
        ui.showComplete({ href: "./" });
      } catch (err) {
        ui.setLoading(false);
        ui.setIinError(err.detail || iinError);
      }
    });
  };

  const date = (v) => (v ? new Date(v).toLocaleDateString(KZ ? "kk-KZ" : "ru-RU", { day: "numeric", month: "long", year: "numeric" }).replace(" г.", "") : "");

  const initAccount = async () => {
    document.querySelectorAll("[data-logout]").forEach((el) => el.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    }));
    const local = async () => {
      const r = await fetch("/api/local/profile", { credentials: "same-origin" });
      if (!r.ok) throw { status: r.status };
      return (await r.json()).profile || {};
    };
    const set = (sel, v) => { const el = document.querySelector(sel); if (el) el.value = v || ""; };
    const fill = (p) => {
      set("[data-profile-name]", p.name);
      set("[data-profile-phone]", p.phone);
      set("[data-profile-birthdate]", date(p.birthdate));
      set("[data-profile-registered]", date(p.registered_at));
      set("[data-email]", p.email);
    };
    if (MOCK) return fill({ name: "Миненко Илья Александрович", phone: "+7 707 125-25-26", birthdate: "1992-09-12", registered_at: "2024-05-18", email: "alexey.morozov@gmail.com" });
    try {
      let p;
      try {
        ({ profile: p } = await api("/cabinet/me"));
      } catch (err) {
        if (err.status !== 401 && err.status !== 404) throw err;
        p = await local();
      }
      fill(p);
    } catch (err) {
      if (err.status === 401 || err.status === 404) logout();
    }
  };

  const MOCK = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !new URLSearchParams(location.search).has("live");

  const loggedIn = MOCK || Boolean(localStorage.getItem(KEY));

  if (document.querySelector("[data-auth-form]")) initLogin(window.flexAuth, window.flexAuthMock || live());

  if (document.querySelector("[data-profile]")) {
    if (loggedIn) initAccount();
    else logout();
  }
})();
