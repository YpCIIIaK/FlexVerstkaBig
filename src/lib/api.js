(function () {
  "use strict";

  const API = "/api/v1";
  const SESSION_KEY = "flex_session";
  const AFTER_LOGIN = "account.html";

  class ApiError extends Error {
    constructor(status, code, detail) {
      super(detail || code || "Request failed");
      this.status = status;
      this.code = code || "";
      this.detail = detail || "";
    }
  }

  const request = async (method, path, body, token) => {
    const headers = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = "Bearer " + token;
    let res;
    try {
      res = await fetch(API + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (e) {
      throw new ApiError(0, "NETWORK");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data.code, typeof data.detail === "string" ? data.detail : "");
    return data;
  };

  const saveSession = (s) => {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify({ token: s.token, expires_at: s.expires_at })); } catch (e) {}
  };

  const getSession = () => {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY));
      if (s && new Date(s.expires_at) > new Date()) return s;
    } catch (e) {}
    return null;
  };

  const clearSession = () => {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  };

  const authed = (method, path, body) => {
    const s = getSession();
    if (!s) return Promise.reject(new ApiError(401, "NO_SESSION"));
    return request(method, path, body, s.token);
  };

  const flexApi = {
    sendCode: (phone) => request("POST", "/phone", { phone }),
    verifyCode: (phone, code) => request("POST", "/otp/verify", { phone, code }),
    register: (verifyToken, iin) => request("POST", "/register", { verify_token: verifyToken, iin }),
    openSession: (verifyToken) => request("POST", "/cabinet/session", { verify_token: verifyToken }),
    me: () => authed("GET", "/cabinet/me"),
    getSession,
    saveSession,
    clearSession,
    ApiError,
  };

  window.flexApi = flexApi;

  const initLogin = () => {
    const ui = window.flexAuth;
    const form = document.querySelector("[data-auth-form]");
    const codeForm = document.querySelector("[data-code-form]");
    const iinForm = document.querySelector("[data-iin-form]");
    if (!ui || !form || !codeForm || !iinForm) return;

    let verifyToken = "";
    const alertText = () => form.querySelector("[data-auth-alert-text]").textContent;
    const iinErrorText = iinForm.querySelector("[data-iin-error]").textContent;

    const isServerError = (e) => e.status === 0 || e.status >= 500 || e.status === 429;

    const login = async () => {
      const session = await flexApi.openSession(verifyToken);
      saveSession(session);
      return session;
    };

    form.addEventListener("auth:submit", async (e) => {
      ui.setLoading(true);
      try {
        await flexApi.sendCode(e.detail.phone);
        ui.setLoading(false);
        ui.showCode();
      } catch (err) {
        ui.setLoading(false);
        ui.showError(err.detail || alertText());
      }
    });

    codeForm.addEventListener("auth:resend", async (e) => {
      try {
        await flexApi.sendCode(e.detail.phone);
      } catch (err) {
        ui.setCodeState("server");
      }
    });

    codeForm.addEventListener("auth:verify", async (e) => {
      ui.setLoading(true);
      let res;
      try {
        res = await flexApi.verifyCode(e.detail.phone, e.detail.code);
      } catch (err) {
        if (isServerError(err)) ui.setCodeState("server");
        else ui.setCodeState(/EXPIRED/.test(err.code) ? "expired" : "wrong");
        return;
      }
      verifyToken = res.verify_token;
      if (!res.registered) {
        ui.showRegistration();
        return;
      }
      ui.setLoading(false);
      ui.showLoginProgress();
      try {
        await login();
        location.href = AFTER_LOGIN;
      } catch (err) {
        location.reload();
      }
    });

    iinForm.addEventListener("auth:register", async (e) => {
      ui.setLoading(true);
      try {
        await flexApi.register(verifyToken, e.detail.iin);
        await login();
        ui.showComplete({ href: AFTER_LOGIN });
      } catch (err) {
        ui.setLoading(false);
        ui.setIinError(err.detail || iinErrorText);
      }
    });
  };

  const formatPhone = (p) => {
    const d = (p || "").replace(/\D/g, "").slice(-10);
    return d.length === 10 ? "+7 " + d.slice(0, 3) + " " + d.slice(3, 6) + "-" + d.slice(6, 8) + "-" + d.slice(8) : p || "";
  };

  const formatDate = (v) => (v ? new Date(v).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }).replace(/\s*г\.$/, "") : "");

  const logout = () => {
    clearSession();
    location.replace("login.html");
  };

  const initAccount = async () => {
    const profile = document.querySelector("[data-profile]");
    if (!profile) return;
    document.querySelectorAll("[data-logout]").forEach((el) => el.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    }));
    if (!getSession()) return logout();
    let me;
    try {
      me = await flexApi.me();
    } catch (err) {
      if (err.status === 401 || err.status === 404) logout();
      return;
    }
    const p = me.profile;
    const set = (sel, v) => { const el = document.querySelector(sel); if (el) el.value = v || ""; };
    set("[data-profile-name]", p.name);
    set("[data-profile-phone]", formatPhone(p.phone));
    set("[data-profile-birthdate]", formatDate(p.birthdate));
    set("[data-profile-registered]", formatDate(p.registered_at));
    set("[data-email]", p.email);
  };

  const init = () => {
    if (document.querySelector("[data-auth-form]") && getSession()) return location.replace(AFTER_LOGIN);
    initLogin();
    initAccount();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
