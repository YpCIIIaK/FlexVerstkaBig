(function () {
  "use strict";

  const KEY = "flex_session";

  const ERRORS = {
    INVALID_PHONE: "Введите номер телефона в формате +7 7XX XXX XX XX",
    OTP_INVALID: "Неверный или истёкший код",
    INVALID_VERIFY_TOKEN: "Время подтверждения истекло. Запросите код заново.",
  };

  const errorText = (data) => {
    const code = data.code || "";
    const detail = typeof data.detail === "string" ? data.detail : "";
    if (ERRORS[code]) return ERRORS[code];
    if (/ALREADY|EXISTS|TAKEN|DUPLICATE/.test(code) || /занят|уже (есть|существ|зарегистр)|already|exists/i.test(detail)) return "Пользователь уже создан";
    if (/IIN/.test(code) && code !== "IIN_NOT_FOUND") return "ИИН указан неверно";
    if (/курильщ|smoker/i.test(detail)) return "";
    return /[а-яё]/i.test(detail) ? detail : "";
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
    localStorage.removeItem(KEY);
    fetch("/api/v1/logout", { method: "POST" }).finally(() => location.replace("login.html"));
  };

  const login = async (verifyToken) => {
    const s = await api("/cabinet/session", { verify_token: verifyToken });
    localStorage.setItem(KEY, s.token);
  };

  const initLogin = (ui) => {
    let verifyToken = "";
    const alertText = document.querySelector("[data-auth-alert-text]").textContent;
    const iinError = document.querySelector("[data-iin-error]").textContent;
    const codeForm = document.querySelector("[data-code-form]");

    document.querySelector("[data-auth-form]").addEventListener("auth:submit", async (e) => {
      ui.setLoading(true);
      try {
        await api("/phone", { phone: e.detail.phone });
        ui.setLoading(false);
        ui.showCode();
      } catch (err) {
        ui.setLoading(false);
        ui.showError(err.detail || alertText);
      }
    });

    codeForm.addEventListener("auth:resend", (e) => {
      api("/phone", { phone: e.detail.phone }).catch(() => ui.setCodeState("server"));
    });

    codeForm.addEventListener("auth:verify", async (e) => {
      ui.setLoading(true);
      try {
        const res = await api("/otp/verify", { phone: e.detail.phone, code: e.detail.code });
        verifyToken = res.verify_token;
        if (!res.registered) return ui.showRegistration();
        ui.setLoading(false);
        ui.showLoginProgress();
        await login(verifyToken);
        location.href = "index.html";
      } catch (err) {
        ui.setCodeState(err.status < 500 ? "wrong" : "server");
      }
    });

    document.querySelector("[data-iin-form]").addEventListener("auth:register", async (e) => {
      ui.setLoading(true);
      try {
        await api("/register", { verify_token: verifyToken, iin: e.detail.iin });
        await login(verifyToken);
        ui.showComplete({ href: "index.html" });
      } catch (err) {
        ui.setLoading(false);
        ui.setIinError(err.detail || iinError);
      }
    });
  };

  const date = (v) => (v ? new Date(v).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }).replace(" г.", "") : "");

  const initAccount = async () => {
    document.querySelectorAll("[data-logout]").forEach((el) => el.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    }));
    try {
      const { profile: p } = await api("/cabinet/me");
      const set = (sel, v) => { document.querySelector(sel).value = v || ""; };
      set("[data-profile-name]", p.name);
      set("[data-profile-phone]", p.phone);
      set("[data-profile-birthdate]", date(p.birthdate));
      set("[data-profile-registered]", date(p.registered_at));
      set("[data-email]", p.email);
    } catch (err) {
      if (err.status === 401 || err.status === 404) logout();
    }
  };

  const loggedIn = Boolean(localStorage.getItem(KEY));

  if (document.querySelector("[data-auth-form]")) initLogin(window.flexAuth);

  if (document.querySelector("[data-profile]")) {
    if (loggedIn) initAccount();
    else logout();
  }
})();
