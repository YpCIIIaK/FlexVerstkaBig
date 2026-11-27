(function () {
  "use strict";

  const KZ = /^\/kz(\/|$)/.test(location.pathname);
  const COPIED = KZ ? "Көшірілді" : "Скопировано";

  const copy = async (text, btn) => {
    try { await navigator.clipboard.writeText(text); } catch (e) {}
    if (!btn) return;
    const prev = btn.innerHTML;
    if (btn.classList.contains("button")) btn.textContent = COPIED;
    btn.classList.add("is-copied");
    setTimeout(() => { btn.innerHTML = prev; btn.classList.remove("is-copied"); }, 1500);
  };

  const notify = document.querySelector("[data-notify-toggle]");
  if (notify) {
    try { notify.checked = localStorage.getItem("flex_notify") !== "0"; } catch (e) {}
    notify.addEventListener("change", () => {
      try { localStorage.setItem("flex_notify", notify.checked ? "1" : "0"); } catch (e) {}
      document.dispatchEvent(new CustomEvent("flex:notify", { detail: { subscribed: notify.checked } }));
    });
  }

  const code = document.querySelector("[data-ref-code]");
  if (code) {
    const value = () => code.textContent.trim();
    document.querySelector("[data-ref-copy]").addEventListener("click", (e) => copy(value(), e.currentTarget));
    document.querySelector("[data-ref-share]").addEventListener("click", async (e) => {
      const text = (KZ ? "FLEX рефералдық кодым: " : "Мой реферальный код FLEX: ") + value();
      if (navigator.share) {
        try { await navigator.share({ title: "FLEX", text, url: location.origin + "/referral" }); return; } catch (err) { return; }
      }
      copy(text, e.currentTarget);
    });
    document.querySelectorAll("[data-copy-text]").forEach((b) => b.addEventListener("click", () => copy(b.dataset.copyText, b)));

    const list = document.querySelector("[data-vouchers]");
    const empty = document.querySelector("[data-vouchers-empty]");
    const activate = document.querySelector("[data-vouchers-activate]");
    if (new URLSearchParams(location.search).get("vouchers") === "empty") list.innerHTML = "";
    const none = !list.children.length;
    empty.hidden = !none;
    list.hidden = none;
    activate.hidden = none;
  }
})();
