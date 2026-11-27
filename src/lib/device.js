(function () {
  "use strict";

  const buy = new URLSearchParams(location.search).get("buy") === "2" ? "2" : "1";
  document.querySelectorAll("[data-buy]").forEach((el) => { el.hidden = el.dataset.buy !== buy; });

  const fav = document.querySelector("[data-device-fav]");
  if (fav) fav.addEventListener("click", () => {
    const on = fav.getAttribute("aria-pressed") !== "true";
    fav.setAttribute("aria-pressed", String(on));
    fav.classList.toggle("is-active", on);
  });
})();
