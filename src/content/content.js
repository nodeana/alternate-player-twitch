"use strict";

const KEEP_STATE_CHANNEL = 2e4;

let g_oParsedAddress = null;

let g_sMethodTaskAddress = "";

let g_nLastCheck = 0;

let g_oRequest = null;

let g_sCodeChannel = "";

let g_isRunningBroadcast = false;

const m_Debug = {
  FinishWorkAndShowMessage: finishWork,
  CaughtException: finishWork,
};

function finishWork(pExceptionOrCodeMessage) {
  if (!g_isWorkFinished) {
    console.error(pExceptionOrCodeMessage);
    try {
      g_isWorkFinished = true;
      m_Log.Ok("[content.js] Work finished");
    } catch (_) {}
  }
  throw void 0;
}

function setAddressPage(sAddress, isReplace = false) {
  location[isReplace ? "replace" : "assign"](sAddress);
}

function thisAddressCanRedirect(oAddress) {
  return !oAddress.search.includes(ADDRESS_NOT_REDIRECT);
}

function getNoredirectAddress(oAddress) {
  return `${oAddress.protocol}//${oAddress.host}${oAddress.pathname}${oAddress.search.length > 1 ? `${oAddress.search}&${ADDRESS_NOT_REDIRECT}` : `?${ADDRESS_NOT_REDIRECT}`}${oAddress.hash}`;
}

function forbidAutoredirectThisPage() {
  if (thisAddressCanRedirect(location)) {
    history.replaceState(history.state, "", getNoredirectAddress(location));
  }
}

parseAddress.THIS_NOT_CODE_CHANNEL = new Set([
  "directory",
  "embed",
  "friends",
  "inventory",
  "login",
  "logout",
  "manager",
  "messages",
  "payments",
  "popout",
  "search",
  "settings",
  "signup",
  "subscriptions",
  "team",
]);

function parseAddress(oAddress) {
  let isMobileVersion = false;
  let sPage = "UNKNOWN";
  let sCodeChannel = "";
  let isCanRedirect = false;
  if (
    oAddress.protocol === "https:" &&
    (oAddress.host === "www.twitch.tv" || oAddress.host === "m.twitch.tv")
  ) {
    isMobileVersion = oAddress.host === "m.twitch.tv";
    const strsPart = oAddress.pathname.split("/");
    if (strsPart.length <= 3 && strsPart[1] && !strsPart[2]) {
      if (!parseAddress.THIS_NOT_CODE_CHANNEL.has(strsPart[1])) {
        sPage = "POSSIBLE_LIVE_BROADCAST";
        sCodeChannel = decodeURIComponent(strsPart[1]);
        isCanRedirect = thisAddressCanRedirect(oAddress);
      }
    } else if (
      (strsPart[1] === "embed" || strsPart[1] === "popout") &&
      strsPart[2] &&
      strsPart[3] === "chat"
    ) {
      sPage = "CHAT_CHANNEL";
      sCodeChannel = decodeURIComponent(strsPart[2]);
    }
  }
  m_Log.Ok(
    `[content.js] Address parsed: Page=${sPage} CodeChannel=${sCodeChannel} CanRedirect=${isCanRedirect}`,
  );
  return {
    isMobileVersion,
    sPage,
    sCodeChannel,
    isCanRedirect,
  };
}

function requestStateChannel(oParsedAddress) {
  if (
    !oParsedAddress.isCanRedirect ||
    !m_Settings.Get("isAutoredirectAllowed")
  ) {
    return;
  }
  if (
    !g_oRequest &&
    g_sCodeChannel === oParsedAddress.sCodeChannel &&
    performance.now() - g_nLastCheck < KEEP_STATE_CHANNEL
  ) {
    return;
  }
  if (g_oRequest && g_sCodeChannel === oParsedAddress.sCodeChannel) {
    return;
  }
  cancelRequest();
  g_sCodeChannel = oParsedAddress.sCodeChannel;
  g_nLastCheck = -1;
  sendRequest();
}

function changedAddressPage(sMethod) {
  g_oParsedAddress = parseAddress(location);
  g_sMethodTaskAddress = sMethod;
  if (
    !g_oParsedAddress.isCanRedirect ||
    !m_Settings.Get("isAutoredirectAllowed")
  ) {
    if (g_nLastCheck === -2) {
      g_nLastCheck = -1;
    }
    return;
  }
  if (
    !g_oRequest &&
    g_sCodeChannel === g_oParsedAddress.sCodeChannel &&
    performance.now() - g_nLastCheck < KEEP_STATE_CHANNEL
  ) {
    if (g_isRunningBroadcast) {
      redirectOnOurPlayer(g_sCodeChannel);
    }
    return;
  }
  if (g_oRequest && g_sCodeChannel === g_oParsedAddress.sCodeChannel) {
    g_nLastCheck = -2;
    return;
  }
  cancelRequest();
  g_sCodeChannel = g_oParsedAddress.sCodeChannel;
  g_nLastCheck = -2;
  sendRequest();
}

function cancelRequest() {
  if (g_oRequest) {
    m_Log.Ok("[content.js] Cancelling unfinished request");
    g_oRequest.abort();
  }
}

function sendRequest() {
  m_Log.Ok(`[content.js] Sending request for channel ${g_sCodeChannel}`);
  g_oRequest = new XMLHttpRequest();
  g_oRequest.addEventListener("loadend", handleResponse);
  g_oRequest.open("POST", "https://gql.twitch.tv/gql#origin=twilight");
  g_oRequest.responseType = "json";
  g_oRequest.timeout = 15e3;
  g_oRequest.setRequestHeader("Accept-Language", "en-US");
  g_oRequest.setRequestHeader("Client-ID", "kimne78kx3ncx6brgo4mv6wki5h1ko");
  g_oRequest.setRequestHeader("Content-Type", "text/plain; charset=UTF-8");
  if (sendRequest._strsIdDevice === void 0) {
    sendRequest._strsIdDevice = document.cookie.match(
      /(?:^|;[ \t]?)unique_id=([^;]+)/,
    );
  }
  if (sendRequest._strsIdDevice) {
    g_oRequest.setRequestHeader("X-Device-ID", sendRequest._strsIdDevice[1]);
  }
  g_oRequest.send(
    createBodyRequestGql(
      `query($login: String!) {
			user(login: $login) {
				stream {
					isEncrypted
				}
				watchParty {
					session {
						state
					}
				}
			}
		}`,
      {
        login: g_sCodeChannel,
      },
    ),
  );
}

function handleResponse({ target: oRequest }) {
  g_oRequest = null;
  if (
    oRequest.status >= 200 &&
    oRequest.status < 300 &&
    ThisObject(oRequest.response)
  ) {
    const isRedirect = g_nLastCheck === -2;
    g_nLastCheck = performance.now();
    let isBroadcastFinishedOrEncoded = true,
      isJointWatch = false;
    try {
      isBroadcastFinishedOrEncoded =
        oRequest.response.data.user.stream.isEncrypted === true;
      isJointWatch =
        oRequest.response.data.user.watchParty.session.state === "IN_PROGRESS";
    } catch (_) {}
    g_isRunningBroadcast = !isBroadcastFinishedOrEncoded && !isJointWatch;
    if (g_isRunningBroadcast && isRedirect) {
      redirectOnOurPlayer(g_sCodeChannel);
    }
  } else {
    g_nLastCheck = 0;
  }
}

function startOurPlayer(sCodeChannel) {
  const sAddressPlayer = GetAddressOurPlayer(sCodeChannel);
  if (!sAddressPlayer) {
    return;
  }
  m_Log.Ok(`[content.js] Going on page ${sAddressPlayer}`);
  forbidAutoredirectThisPage();
  setAddressPage(sAddressPlayer);
}

function redirectOnOurPlayer(sCodeChannel) {
  const sAddressPlayer = GetAddressOurPlayer(sCodeChannel);
  if (!sAddressPlayer) {
    return;
  }
  m_Log.Ok(
    `[content.js] Changing address page2 s ${location.href} on ${sAddressPlayer}`,
  );
  document.documentElement.setAttribute("data-tw5-redirect", sAddressPlayer);
  setAddressPage(sAddressPlayer, true);
}

function handlePointerDownAndClick(oEvent) {
  if (g_oParsedAddress) {
    const nodeLink = oEvent.target.closest("a[href]");
    if (
      nodeLink &&
      oEvent.isPrimary !== false &&
      oEvent.button === LEFT_BUTTON &&
      !oEvent.shiftKey &&
      !oEvent.ctrlKey &&
      !oEvent.altKey &&
      !oEvent.metaKey
    ) {
      m_Log.Ok(
        `[content.js] Happened event ${oEvent.type} at links ${nodeLink.href}`,
      );
      requestStateChannel(parseAddress(nodeLink));
    }
  }
}

function handlePopState(oEvent) {
  if (g_oParsedAddress) {
    m_Log.Ok(`[content.js] Happened event popstate ${location.href}`);
    if (getVersionEngineBrowser() < 67) {
      document.title = "Twitch";
    }
    changedAddressPage("POPSTATE");
    if (document.documentElement.hasAttribute("data-tw5-redirect")) {
      m_Log.Ok("[content.js] Hiding event popstate");
      oEvent.stopImmediatePropagation();
    }
  }
}

function handlePushState(oEvent) {
  m_Log.Ok(`[content.js] Happened event tw5-pushstate ${location.href}`);
  changedAddressPage("PUSHSTATE");
}

function handleStartOurPlayer(oEvent) {
  oEvent.preventDefault();
  if (
    oEvent.button === LEFT_BUTTON &&
    g_oParsedAddress.sPage === "POSSIBLE_LIVE_BROADCAST"
  ) {
    startOurPlayer(g_oParsedAddress.sCodeChannel);
  } else {
    m_Log.Ok(
      `[content.js] Not start player Button=${oEvent.button} Page=${g_oParsedAddress.sPage}`,
    );
  }
}

function handleSwitchAutoredirect(oEvent) {
  oEvent.preventDefault();
  const is = !m_Settings.Get("isAutoredirectAllowed");
  m_Log.Ok(`[content.js] Autoredirect allowed: ${is}`);
  m_Settings.Change("isAutoredirectAllowed", is);
  updateOurButton();
}

function handleCloseHelp(oEvent) {
  oEvent.preventDefault();
  m_Log.Ok("[content.js] Closing help");
  oEvent.currentTarget.classList.remove("tw5-help2");
  oEvent.currentTarget.removeEventListener("mouseover", handleCloseHelp);
  oEvent.currentTarget.removeEventListener("touchstart", handleCloseHelp, {
    passive: false,
  });
  m_Settings.Change("isAutoredirectNoticed", true);
}

function getOurButton() {
  return document.getElementById("tw5-autoredirect");
}

function updateOurButton() {
  getOurButton().classList.toggle(
    "tw5-forbidden",
    !m_Settings.Get("isAutoredirectAllowed"),
  );
}

function insertOurButton() {
  if (g_oParsedAddress.isMobileVersion) {
    const nodeWhereInsert = document.querySelector(
      ".top-nav__menu > div:last-child > div:first-child",
    );
    if (!nodeWhereInsert) {
      return false;
    }
    m_Log.Ok("[content.js] Inserting our button for mobile site");
    nodeWhereInsert.insertAdjacentHTML(
      "afterend",
      `
		<div class="tw5-autoredirect tw5-js-remove">
			<button id="tw5-autoredirect">
				<svg viewBox="0 0 128 128">
					<g>
						<path d="M64 53h-19.688l-1.313-15.225h57l1.313-14.7h-74.55l3.937 44.888h51.712l-1.8 19.162-16.6 4.463l-16.8-4.463-1.1-11.813h-14.7l1.838 23.362 30.713 8.4l30.45-8.4 4.2-45.675z"/>
					</g>
				</svg>
			</button>
			<style>
				.tw5-autoredirect
				{
					flex: 0 0;
					margin: 0 0 0 .5rem;
				}
				.tw5-autoredirect button
				{
					align-items: center;
					background-color: transparent;
					border-radius: .4rem;
					color: #0e0e10;
					display: inline-flex;
					height: 3.6rem;
					justify-content: center;
					width: 3.6rem;
				}
				.tw-root--theme-dark .tw5-autoredirect button
				{
					color: #efeff1;
				}
				.tw5-autoredirect button:active
				{
					background-color: rgba(0, 0, 0, 0.05);
				}
				.tw-root--theme-dark .tw5-autoredirect button:active
				{
					background-color: rgba(255, 255, 255, 0.15);
				}
				.tw5-autoredirect svg
				{
					fill: currentColor;
					width: 75%;
				}
				.tw5-forbidden svg
				{
					opacity: .4;
				}
			</style>
		</div>
		`,
    );
  } else {
    const nodeWhereInsert = document.querySelector(
      ".top-nav__menu > div:last-child > div:first-child",
    );
    if (!nodeWhereInsert) {
      return false;
    }
    m_Log.Ok("[content.js] Inserting our button");
    nodeWhereInsert.insertAdjacentHTML(
      "afterend",
      `
		<div class="tw5-autoredirect tw5-js-remove">
			<button id="tw5-autoredirect">
				<svg viewBox="0 0 128 128">
					<g>
						<path d="M64 53h-19.688l-1.313-15.225h57l1.313-14.7h-74.55l3.937 44.888h51.712l-1.8 19.162-16.6 4.463l-16.8-4.463-1.1-11.813h-14.7l1.838 23.362 30.713 8.4l30.45-8.4 4.2-45.675z"/>
					</g>
				</svg>
			</button>
			<div class="tw5-tooltip">
				${m_i18n.GetMessage("F0600")}
			</div>
			<style>
				.tw5-autoredirect
				{
					flex: 0 0;
					margin: 0 .5rem;
					position: relative;
				}
				.tw5-autoredirect button
				{
					align-items: center;
					background-color: var(--color-background-button-text-default);
					border-radius: var(--border-radius-medium);
					color: var(--color-fill-button-icon);
					display: inline-flex;
					height: var(--button-size-default);
					justify-content: center;
					width: var(--button-size-default);
				}
				.tw5-autoredirect button:hover
				{
					background-color: var(--color-background-button-text-hover);
					color: var(--color-fill-button-icon-hover);
				}
				.tw5-autoredirect button:active
				{
					background-color: var(--color-background-button-text-active);
					color: var(--color-fill-button-icon-active);
				}
				.tw5-autoredirect svg
				{
					fill: currentColor;
					width: 75%;
				}
				.tw5-forbidden svg
				{
					opacity: .4;
				}
				.tw5-tooltip
				{
					background-color: var(--color-background-tooltip);
					border-radius: var(--border-radius-medium);
					color: var(--color-text-tooltip);
					display: none;
					font-size: var(--font-size-6);
					font-weight: var(--font-weight-semibold);
					left: 50%;
					line-height: var(--line-height-heading);
					margin-top: 6px;
					padding: 3px 6px;
					pointer-events: none;
					position: absolute;
					text-align: left;
					top: 100%;
					transform: translateX(-50%);
					user-select: none;
					white-space: nowrap;
					z-index: var(--z-index-balloon);
				}
				.tw5-tooltip::after
				{
					background-color: inherit;
					content: "";
					height: 6px;
					left: 50%;
					position: absolute;
					top: 0;
					transform: rotate(45deg) translateX(-68%);
					width: 6px;
					z-index: var(--z-index-below);
				}
				.tw5-autoredirect:hover .tw5-tooltip
				{
					display: block;
				}
				.tw5-help2 .tw5-tooltip
				{
					background: #f00000;
					color: #fff;
					cursor: pointer;
					display: block;
					pointer-events: auto;
				}
			</style>
		</div>
		`,
    );
  }
  const nodeButton = getOurButton();
  nodeButton.addEventListener("click", handleStartOurPlayer);
  nodeButton.addEventListener("contextmenu", handleSwitchAutoredirect);
  if (
    !g_oParsedAddress.isMobileVersion &&
    !m_Settings.Get("isAutoredirectNoticed")
  ) {
    nodeButton.parentNode.classList.add("tw5-help2");
    nodeButton.parentNode.addEventListener("mouseover", handleCloseHelp);
    nodeButton.parentNode.addEventListener("touchstart", handleCloseHelp, {
      passive: false,
    });
  }
  updateOurButton();
  return true;
}

function insertOurButtonIfNeed() {
  return Boolean(getOurButton()) || insertOurButton();
}

function insertOurButtonInFirstTimes() {
  insertOurButton();
  if (g_oParsedAddress.isMobileVersion) {
    new MutationObserver((objsRecording) => {
      insertOurButtonIfNeed();
    }).observe(document.head || document.documentElement, {
      childList: true,
      subtree: true,
    });
  } else {
    window.addEventListener("tw5-changedHeader", insertOurButtonIfNeed);
  }
}

function waitLoadHome() {
  return new Promise((fnExecute) => {
    if (document.readyState !== "loading") {
      fnExecute();
    } else {
      document.addEventListener("DOMContentLoaded", function HandleLoadHome() {
        document.removeEventListener("DOMContentLoaded", HandleLoadHome);
        fnExecute();
      });
    }
  });
}

function waitLoadPage() {
  return new Promise((fnExecute) => {
    if (document.readyState === "complete") {
      fnExecute();
    } else {
      window.addEventListener("load", function HandleLoadPage() {
        window.removeEventListener("load", HandleLoadPage);
        fnExecute();
      });
    }
  });
}

function insertThirdpartyExtension() {
  // Native BTTV/FFZ do not inject into twitch.tv iframes whose parent is chrome-extension://
  // https://bugs.chromium.org/p/chromium/issues/detail?id=599167
  chrome.runtime.sendMessage(
    {
      request: "InsertThirdPartyExtensions",
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          `[content.js] Failed to send request for third-party extensions: ${chrome.runtime.lastError.message}`,
        );
      }
    },
  );
}

function changeStyleChat() {
  const sAddress = GetURLResourceExtension("src/content/content.css");
  if (!sAddress) {
    return;
  }
  const nodeStyle = document.createElement("link");
  nodeStyle.rel = "stylesheet";
  nodeStyle.href = sAddress;
  nodeStyle.className = "tw5-js-remove";
  (document.head || document.documentElement).appendChild(nodeStyle);
}

function sendTrackingForWatch(oMessage) {
  if (
    !ThisNonemptyString(oMessage.sAddress) ||
    !ThisNonemptyString(oMessage.sBody)
  ) {
    return;
  }
  if (
    !/^https:\/\/(?:[^/]+\.)?(?:twitch\.tv|ttvnw\.net)\//.test(
      oMessage.sAddress,
    )
  ) {
    return;
  }
  const sBody = `data=${encodeURIComponent(oMessage.sBody)}`;
  const oBlob = new Blob([sBody], {
    type: "application/x-www-form-urlencoded;charset=UTF-8",
  });
  if (navigator.sendBeacon(oMessage.sAddress, oBlob)) {
    return;
  }
  fetch(oMessage.sAddress, {
    method: "POST",
    mode: "no-cors",
    credentials: "include",
    body: sBody,
  }).catch(NOOP);
}

function watchChatChannelAndTheme() {
  const isDarkWanted = Boolean(m_Settings.Get("isDarkenChat"));
  let sReported = "";
  let nThemeTimer = 0;
  function isChannelLogin(sCode) {
    return (
      /^[a-z0-9]\w{2,24}$/i.test(sCode) &&
      !parseAddress.THIS_NOT_CODE_CHANNEL.has(sCode.toLowerCase())
    );
  }
  function channelFromPage() {
    const oAddress = parseAddress(location);
    return oAddress.sPage === "CHAT_CHANNEL" &&
      isChannelLogin(oAddress.sCodeChannel)
      ? oAddress.sCodeChannel
      : "";
  }
  function channelFromHeader() {
    const nodeHeader = document.querySelector(".stream-chat-header");
    if (!nodeHeader) {
      return "";
    }
    for (const nodeLink of nodeHeader.querySelectorAll("a[href]")) {
      let oUrl;
      try {
        oUrl = new URL(nodeLink.getAttribute("href"), location.origin);
      } catch (_) {
        continue;
      }
      if (oUrl.host !== "www.twitch.tv" && oUrl.host !== "m.twitch.tv") {
        continue;
      }
      const strsPart = oUrl.pathname.split("/").filter(Boolean);
      const sCode =
        strsPart[0] === "popout" && strsPart[2] === "chat"
          ? strsPart[1]
          : strsPart.length === 1
            ? strsPart[0]
            : "";
      if (isChannelLogin(sCode)) {
        return sCode;
      }
    }
    return "";
  }
  function reportChannel(sCode) {
    if (!sCode) {
      return;
    }
    const sKey = sCode.toLowerCase();
    if (sKey === sReported) {
      return;
    }
    sReported = sKey;
    chrome.runtime.sendMessage({ request: "chat-channel", channel: sCode }, () => {
      void chrome.runtime.lastError;
    });
  }
  function checkChannel() {
    const sFromPage = channelFromPage();
    const sFromHeader = channelFromHeader();
    if (
      sFromHeader &&
      sFromPage &&
      sFromHeader.toLowerCase() !== sFromPage.toLowerCase()
    ) {
      reportChannel(sFromHeader);
      return;
    }
    reportChannel(sFromPage);
  }
  function checkTheme() {
    const nodeHtml = document.documentElement;
    const isDark = nodeHtml.classList.contains("tw-root--theme-dark");
    const isLight = nodeHtml.classList.contains("tw-root--theme-light");
    if (isDark === isDarkWanted || (!isDark && !isLight)) {
      return;
    }
    const sCode = channelFromPage();
    const sFromHeader = channelFromHeader();
    if (!sCode || (sFromHeader && sFromHeader.toLowerCase() !== sCode.toLowerCase())) {
      return;
    }
    let sPrevious = "";
    try {
      sPrevious = sessionStorage.getItem("tw5-theme-reload") || "";
    } catch (_) {}
    const [sPreviousChannel, sPreviousTime] = sPrevious.split(":");
    if (
      sPreviousChannel === sCode.toLowerCase() &&
      Date.now() - Number(sPreviousTime) < 2e4
    ) {
      return;
    }
    try {
      sessionStorage.setItem(
        "tw5-theme-reload",
        `${sCode.toLowerCase()}:${Date.now()}`,
      );
    } catch (_) {}
    chrome.runtime.sendMessage({ request: "chat-theme", channel: sCode }, () => {
      void chrome.runtime.lastError;
    });
  }
  function scheduleTheme() {
    clearTimeout(nThemeTimer);
    nThemeTimer = setTimeout(checkTheme, 600);
  }
  window.addEventListener("tw5-pushstate", () => {
    checkChannel();
    scheduleTheme();
  });
  window.addEventListener("popstate", () => {
    checkChannel();
    scheduleTheme();
  });
  new MutationObserver(scheduleTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  setInterval(checkChannel, 1000);
  checkChannel();
  scheduleTheme();
}

function changeBehaviorChat() {
  window.addEventListener(
    "click",
    (oEvent) => {
      if (oEvent.button !== LEFT_BUTTON) {
        return;
      }
      if (
        oEvent.target.closest(
          '[class*="bttv-"],[class*="ffz-"],#bttv-settings,#ffz-settings',
        )
      ) {
        return;
      }
      const nodeLink = oEvent.target.closest(
        'a[href^="http:"],a[href^="https:"],a[href]:not([href=""]):not([href^="#"]):not([href*=":"]):not([href$="/not-a-location"])',
      );
      if (!nodeLink) {
        return;
      }
      m_Log.Ok(
        `[content.js] Opening link in new tab: ${nodeLink.getAttribute("href")}`,
      );
      nodeLink.target = "_blank";
      oEvent.stopImmediatePropagation();
    },
    true,
  );
  const oObserver = new MutationObserver((objsRecording) => {
    const els = document.getElementsByClassName("channel-leaderboard");
    if (els.length !== 0) {
      els[0].parentElement.parentElement.classList.add(
        "tw5-parent-channel-leaderboard",
      );
      oObserver.disconnect();
    }
  });
  oObserver.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });
  setTimeout(() => oObserver.disconnect(), 6e4);
}

function removeLeftoversOldVersion() {}

AddHandlerExceptions(() => {
  try {
    sessionStorage.removeItem("tw5-reloading-extension");
  } catch (_) {}
  m_Log.Ok(
    `[content.js] Started ${performance.now().toFixed()}strs ${location.href}`,
  );
  if (parseAddress(location).sPage === "CHAT_CHANNEL") {
    chrome.runtime.sendMessage({ request: "RegisterChatFrame" }, () => {
      void chrome.runtime.lastError;
    });
    chrome.runtime.onMessage.addListener((oMessage, oSender, fnReply) => {
      if (!oMessage || !oMessage.sRequest) {
        return;
      }
      if (oMessage.sRequest === "chat-ping") {
        fnReply({ status: "ok" });
        return true;
      }
      if (oMessage.sRequest === "minute-watched") {
        sendTrackingForWatch(oMessage);
        fnReply({ status: "sent" });
        return true;
      }
      if (oMessage.sRequest === "fetch-drops") {
        const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        let finished2 = false;
        const finish = (oResult) => {
          if (finished2) {
            return;
          }
          finished2 = true;
          document.removeEventListener("tw5-drops-fetch-result", handleResult);
          fnReply(oResult);
        };
        const handleResult = (oEvent) => {
          const oDetails = oEvent && oEvent.detail;
          if (!oDetails || oDetails.requestId !== requestId) {
            return;
          }
          finish(oDetails);
        };
        document.addEventListener("tw5-drops-fetch-result", handleResult);
        document.dispatchEvent(
          new CustomEvent("tw5-drops-fetch", {
            bubbles: true,
            detail: {
              requestId,
              channelID: oMessage.channelID,
              channelLogin: oMessage.channelLogin || "",
              authToken: oMessage.authToken || "",
              deviceId: oMessage.deviceId || "",
            },
          }),
        );
        setTimeout(() => finish({ error: "timeout" }), 3e4);
        return true;
      }
      if (oMessage.sRequest === "update-drops-cache") {
        const oDetails = {
          availResult: oMessage.availResult,
          sessionResult: oMessage.sessionResult,
        };
        document.dispatchEvent(
          new CustomEvent("tw5-drops-cache-update", {
            bubbles: true,
            detail: oDetails,
          }),
        );
        fnReply({ status: "ok" });
        return true;
      }
    });
    if (window.top !== window) {
      insertThirdpartyExtension();
      changeStyleChat();
      changeBehaviorChat();
    }
    m_Settings.Restore().then(watchChatChannelAndTheme).catch(NOOP);
    return;
  }
  removeLeftoversOldVersion();
  const sEvent = window.PointerEvent ? "pointerdown" : "mousedown";
  window.addEventListener(sEvent, handlePointerDownAndClick, true);
  window.addEventListener("click", handlePointerDownAndClick, true);
  window.addEventListener("popstate", handlePopState);
  m_Settings
    .Restore()
    .then(() => {
      // pagehook.js (MAIN world) dispatches tw5-pushstate on SPA navigations
      window.addEventListener("tw5-pushstate", handlePushState);
      changedAddressPage("LOAD");
      const address = parseAddress(location);
      if (
        address.sPage === "CHAT_CHANNEL" ||
        address.sPage === "POSSIBLE_LIVE_BROADCAST"
      ) {
        if (address.sPage === "POSSIBLE_LIVE_BROADCAST") {
          setTimeout(() => insertOurButtonInFirstTimes(), 1000);
        } else {
          insertOurButtonInFirstTimes();
        }
      }
    })
    .catch(m_Debug.CaughtException);
})();
