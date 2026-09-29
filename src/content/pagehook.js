"use strict";

// Runs in the page MAIN world (see manifest content_scripts.world).
// Patches history/title so SPA channel changes notify the isolated content script.

(function captureFunction() {
  let _isNotCapture = false;
  window.addEventListener("tw5-nocapture", () => {
    _isNotCapture = true;
  });
  const oTitleDescriptor = Object.getOwnPropertyDescriptor(
    Document.prototype,
    "title",
  );
  Object.defineProperty(document, "title", {
    configurable: oTitleDescriptor.configurable,
    enumerable: oTitleDescriptor.enumerable,
    get() {
      return oTitleDescriptor.get.call(this);
    },
    set(title) {
      if (_isNotCapture) {
        oTitleDescriptor.set.call(this, title);
      } else if (this.documentElement.hasAttribute("data-tw5-redirect")) {
      } else {
        oTitleDescriptor.set.call(this, title);
        window.dispatchEvent(new CustomEvent("tw5-changedHeader"));
      }
    },
  });
  function notifySwitchPath(sWas) {
    if (sWas !== location.pathname) {
      oTitleDescriptor.set.call(document, "Twitch");
      window.dispatchEvent(new CustomEvent("tw5-pushstate"));
    }
  }
  const fPushState = History.prototype.pushState;
  History.prototype.pushState = function (state, title, url) {
    if (
      _isNotCapture ||
      document.documentElement.hasAttribute("data-tw5-redirect")
    ) {
      return fPushState.apply(this, arguments);
    }
    const sWas = location.pathname;
    const result = fPushState.apply(this, arguments);
    notifySwitchPath(sWas);
    return result;
  };
  const fReplaceState = History.prototype.replaceState;
  History.prototype.replaceState = function (state, title, url) {
    if (
      _isNotCapture ||
      document.documentElement.hasAttribute("data-tw5-redirect")
    ) {
      return fReplaceState.apply(this, arguments);
    }
    const sWas = location.pathname;
    const result = fReplaceState.apply(this, arguments);
    notifySwitchPath(sWas);
    return result;
  };
})();

(function allowWorkChat() {
  const strsPart = location.pathname.split("/");
  const isChat =
    (strsPart[1] === "embed" || strsPart[1] === "popout") &&
    strsPart[2] &&
    strsPart[3] === "chat";
  if (!isChat) {
    return;
  }
  const fGetItem = Storage.prototype.getItem;
  Storage.prototype.getItem = function (sName) {
    let sValue = fGetItem.apply(this, arguments);
    if (sName === "TwitchCache:Layout" && sValue) {
      sValue = sValue.replace(
        '"isRightColumnClosedByUserAction":true',
        '"isRightColumnClosedByUserAction":false',
      );
    }
    return sValue;
  };
})();
