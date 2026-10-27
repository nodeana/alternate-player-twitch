"use strict";

(function () {
  if (window.top !== window) {
    const strsPart = location.pathname.split("/");
    const isChat =
      (strsPart[1] === "embed" || strsPart[1] === "popout") &&
      strsPart[2] &&
      strsPart[3] === "chat";
    if (!isChat) {
      return;
    }
  }
  let stableButton = null;
  let stableSince = 0;
  let lastClick = 0;

  setInterval(() => {
    const icon = document.querySelector(".claimable-bonus__icon");
    if (!icon) {
      stableButton = null;
      stableSince = 0;
      return;
    }
    const button = icon.closest("button") || icon;
    if (button.getAttribute("aria-disabled") === "true") {
      return;
    }
    if (button !== stableButton) {
      stableButton = button;
      stableSince = Date.now();
      return;
    }
    if (Date.now() - lastClick < 20000 || Date.now() - stableSince < 1500) {
      return;
    }
    lastClick = Date.now();
    button.click();
  }, 500);
})();
