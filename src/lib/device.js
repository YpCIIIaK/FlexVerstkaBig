(function () {
  "use strict";

  const buy = new URLSearchParams(location.search).get("buy") === "2" ? "2" : "1";
  document.querySelectorAll("[data-buy]").forEach((el) => { el.hidden = el.dataset.buy !== buy; });

  document.querySelectorAll("[data-pack]").forEach((group) => {
    const chips = [...group.querySelectorAll("[data-pack-value]")];
    chips.forEach((chip) => chip.addEventListener("click", () => {
      chips.forEach((c) => {
        const on = c === chip;
        c.classList.toggle("is-active", on);
        c.setAttribute("aria-checked", String(on));
      });
      group.dataset.selected = chip.dataset.packValue;
    }));
  });

  const fav = document.querySelector("[data-device-fav]");
  if (fav) fav.addEventListener("click", () => {
    const on = fav.getAttribute("aria-pressed") !== "true";
    fav.setAttribute("aria-pressed", String(on));
    fav.classList.toggle("is-active", on);
  });
})();
