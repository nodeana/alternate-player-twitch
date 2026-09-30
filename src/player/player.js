"use strict";

const VERSION_EXTENSION = chrome.runtime.getManifest().version;

const LOAD_METADATA_NOT_LONGER = 15e3;

const LOAD_LIST_VARIANTS_NOT_LONGER = 15e3;

const LOAD_LIST_SEGMENTS_NOT_LONGER = 6e3;

const HANDLING_WAITING_LOAD = 1;

const HANDLING_LOADING = 2;

const HANDLING_LOADED = 3;

const HANDLING_CONVERTED = 4;

const STATE_START = 1;

const STATE_START_BROADCAST = 2;

const STATE_FINISH_BROADCAST = 3;

const STATE_LOAD = 4;

const STATE_START_PLAYBACK = 5;

const STATE_PLAYBACK = 6;

const STATE_STOP = 7;

const STATE_REPLAY = 8;

const STATE_SWITCH_VARIANT = 9;

const FOLLOW_UPDATING = -1;

const FOLLOW_UNAVAILABLE = 0;

const FOLLOW_UNFOLLOWED = 1;

const FOLLOW_NONOTIFY = 2;

const FOLLOW_NOTIFY = 3;

const CODE_RESPONSE = "Server returned code ";

let g_nExactTime = NaN;
let g_nLatencyBroadcast = NaN;
function showLatencyOnPanel(nLatency) {
  const node = byId("latency");
  if (!Number.isFinite(nLatency) || nLatency <= 0 || nLatency >= 600) {
    g_nLatencyBroadcast = NaN;
    node.hidden = true;
    node.textContent = "";
    return;
  }
  node.hidden = false;
  node.textContent = `${nLatency.toFixed(1)} ${Text("F0672")}`;
}

if (!navigator.clipboard) {
  navigator.clipboard = {};
}

if (!navigator.clipboard.writeText) {
  navigator.clipboard.writeText = function (sText) {
    Assert(typeof sText == "string");
    return new Promise(
      AddHandlerExceptions((fnExecute, fnGiveup) => {
        const nodeText = document.createElement("input");
        nodeText.type = "text";
        nodeText.readOnly = true;
        nodeText.value = sText;
        nodeText.style.position = "fixed";
        nodeText.style.left = "-100500px";
        document.body.appendChild(nodeText);
        nodeText.select();
        const isSucceeded = document.execCommand("copy");
        nodeText.remove();
        if (isSucceeded) {
          fnExecute();
        } else {
          fnGiveup();
        }
      }),
    );
  };
}

function Text(sCode, sSubstitution) {
  return m_i18n.GetMessage(sCode, sSubstitution);
}

function Round(nValue, nPrecision) {
  Assert(
    typeof nValue == "number" &&
      Number.isInteger(nPrecision) &&
      nPrecision >= 0 &&
      nPrecision <= 20,
  );
  if (nPrecision === 0) {
    return Math.round(nValue);
  }
  const n = Math.pow(10, nPrecision);
  return Math.round(nValue * n) / n;
}

function Clamp(nValue, nMinimum, nMaximum) {
  Assert(
    Number.isFinite(nValue) &&
      Number.isFinite(nMinimum) &&
      Number.isFinite(nMaximum) &&
      nMinimum <= nMaximum,
  );
  return Math.min(Math.max(nValue, nMinimum), nMaximum);
}

function chain(pObject, ...strsProperty) {
  Assert(strsProperty.length !== 0);
  for (const sProperty of strsProperty) {
    if (!ThisObject(pObject)) {
      return null;
    }
    Assert(ThisNonemptyString(sProperty));
    pObject = pObject[sProperty];
  }
  return pObject;
}

function ResolveRelativeUrl(sRelativeUrl, sAbsoluteBaseUrl) {
  return new URL(sRelativeUrl, sAbsoluteBaseUrl).href;
}

function ChangeHeaderDocument(sHeader) {
  history.replaceState(null, "");
  document.title = sHeader;
}

function assertPermissionExtension() {
  return new Promise((fnExecute) => {
    chrome.permissions.contains(
      {
        origins: chrome.runtime
          .getManifest()
          .permissions.filter((sResolution) => sResolution.includes(":")),
      },
      (isAllowed) => {
        if (chrome.runtime.lastError) {
          console.error(
            "permissions.contains",
            chrome.runtime.lastError.message,
          );
          m_Debug.FinishWorkAndShowMessage("J0221");
        }
        if (!isAllowed) {
          m_Debug.FinishWorkAndShowMessage("J0215");
        }
        fnExecute();
      },
    );
  });
}

getCurrentTab.nIdTab = NaN;

getCurrentTab.cStorageCookies = "";

function getCurrentTab() {
  return new Promise((fnExecute) => {
    chrome.tabs.getCurrent(
      AddHandlerExceptions((oTab) => {
        if (
          chrome.runtime.lastError ||
          !ThisObject(oTab) ||
          !Number.isSafeInteger(oTab.id) ||
          oTab.id === chrome.tabs.TAB_ID_NONE
        ) {
          console.error(
            "tabs.getCurrent",
            chrome.runtime.lastError && chrome.runtime.lastError.message,
          );
          m_Debug.FinishWorkAndShowMessage("J0221");
        }
        getCurrentTab.nIdTab = oTab.id;
        fnExecute();
      }),
    );
  });
}

function getAllCookie(sAddress) {
  return new Promise((fnExecute) => {
    const oParameters = {
      url: sAddress,
    };
    if (getCurrentTab.cStorageCookies) {
      oParameters.storeId = getCurrentTab.cStorageCookies;
    }
    chrome.cookies.getAll(
      oParameters,
      AddHandlerExceptions((objsCookie) => {
        if (!chrome.runtime.lastError && Array.isArray(objsCookie)) {
          m_Log.Here(`[API] Count cookies: ${objsCookie.length}`);
          fnExecute(objsCookie);
        } else {
          console.error(
            "cookies.getAll",
            chrome.runtime.lastError && chrome.runtime.lastError.message,
          );
          m_Debug.FinishWorkAndShowMessage("J0221");
        }
      }),
    );
  });
}

function removeCookie(sName, sAddress) {
  return new Promise((fnExecute) => {
    chrome.cookies.remove(
      {
        name: sName,
        url: sAddress,
      },
      AddHandlerExceptions(() => {
        if (chrome.runtime.lastError) {
          console.error("cookies.remove", chrome.runtime.lastError.message);
          m_Debug.FinishWorkAndShowMessage("J0221");
        }
        fnExecute();
      }),
    );
  });
}

function OpenAddressInNewTab(sAddress) {
  window.open(sAddress);
}

function WriteTextInLocalFile(sText, sTypeData, sNameFile) {
  Assert(
    typeof sText == "string" &&
      ThisNonemptyString(sTypeData) &&
      ThisNonemptyString(sNameFile),
  );
  const nodeLink = document.createElement("a");
  nodeLink.href = URL.createObjectURL(
    new Blob([sText], {
      type: sTypeData,
    }),
  );
  nodeLink.download = sNameFile;
  nodeLink.dispatchEvent(new MouseEvent("click"));
}

function createHandlerEventsElement(fnCall) {
  return AddHandlerExceptions((oEvent) => {
    if (oEvent.target.nodeType === Node.ELEMENT_NODE) {
      fnCall(oEvent);
    }
  });
}

function ThisEventForLinks(oEvent) {
  return !!oEvent.target.closest("a[href]");
}

function ElementInThisPointCanScroll(x, y) {
  for (
    let nodeElement = document.elementFromPoint(x, y);
    nodeElement;
    nodeElement = nodeElement.parentElement
  ) {
    if (ThisElementCanScroll(nodeElement)) {
      return true;
    }
  }
  return false;
}

function ThisElementCanScroll(nodeElement) {
  const oStyle = getComputedStyle(nodeElement);
  return (
    (oStyle.overflowY === "scroll" || oStyle.overflowY === "auto") &&
    nodeElement.clientHeight < nodeElement.scrollHeight
  );
}

function thisElementFullyScrolled(elElement) {
  return (
    elElement.scrollHeight - elElement.scrollTop - elElement.clientHeight < 2
  );
}

function ShowElement(pElement, isShow) {
  const nodeElement = byId(pElement);
  if (isShow) {
    nodeElement.removeAttribute("hidden");
  } else {
    nodeElement.setAttribute("hidden", "");
  }
  return nodeElement;
}

function ElementShown(pElement) {
  return !byId(pElement).hasAttribute("hidden");
}

function ChangeButton(pButton, pState) {
  const nodeButton = byId(pButton);
  const nState = Number(pState);
  const nodesState = nodeButton.getElementsByTagName("use");
  Assert(nState >= 0 && nState < nodesState.length);
  for (let idx = 0; idx < nodesState.length; ++idx) {
    if (idx === nState) {
      const sTooltip = nodesState[idx].getAttributeNS(
        "http://www.w3.org/1999/xlink",
        "title",
      );
      if (sTooltip) {
        nodeButton.title = Text(sTooltip);
      }
      nodesState[idx].removeAttribute("display");
    } else {
      nodesState[idx].setAttribute("display", "none");
    }
  }
  return nodeButton;
}

const m_Debug = (() => {
  const MAX_LENGTH_STRING_REPORT = 15e4;
  const CODES_AUTORELOAD = new Set(["J0200", "J0206", "J0208"]);
  const SECONDS_UNTIL_AUTORELOAD = 10;
  const MAX_AUTORELOADS = 5;
  const KEY_COUNTER_AUTORELOAD = "tw5Autoreload";
  let _sTokenBroadcast = "";
  let _sTokenBroadcastWithoutAd = "";
  let _sListVariants = "";
  let _strsListsSegments = [];
  function getCounterAutoreload() {
    try {
      const current = sessionStorage.getItem(KEY_COUNTER_AUTORELOAD);
      if (current != null) {
        return Math.max(0, Number(current) || 0);
      }
      return Math.max(
        0,
        Number(sessionStorage.getItem("tw5Автоперезагрузка")) || 0,
      );
    } catch (_) {
      return 0;
    }
  }
  function increaseCounterAutoreload() {
    try {
      sessionStorage.setItem(
        KEY_COUNTER_AUTORELOAD,
        String(getCounterAutoreload() + 1),
      );
      sessionStorage.removeItem("tw5Автоперезагрузка");
    } catch (_) {}
  }
  function resetCounterAutoreload() {
    try {
      sessionStorage.removeItem(KEY_COUNTER_AUTORELOAD);
      sessionStorage.removeItem("tw5Автоперезагрузка");
    } catch (_) {}
  }
  function startAutoreload(oDocument) {
    if (getCounterAutoreload() >= MAX_AUTORELOADS) {
      m_Log.Oops(
        `[Debug] Autoreload disabled: reached limit ${MAX_AUTORELOADS}`,
      );
      return;
    }
    const elBlock = oDocument.getElementById("debug-autoreload");
    const elText = oDocument.getElementById("debug-autoreload-text");
    const elCancel = oDocument.getElementById("debug-autoreload-cancel");
    if (!elBlock || !elText || !elCancel) {
      return;
    }
    ShowElement(elBlock, true);
    let nLeft = SECONDS_UNTIL_AUTORELOAD;
    let nTimer = 0;
    const updateText = () => {
      elText.textContent = Text("J0230", String(nLeft));
    };
    const stop = () => {
      if (nTimer !== 0) {
        clearInterval(nTimer);
        nTimer = 0;
      }
    };
    elCancel.addEventListener("click", () => {
      stop();
      elText.textContent = Text("J0231");
      ShowElement(elCancel, false);
    });
    updateText();
    nTimer = setInterval(() => {
      --nLeft;
      if (nLeft <= 0) {
        stop();
        increaseCounterAutoreload();
        window.location.reload();
        return;
      }
      updateText();
    }, 1e3);
  }
  function InsertLinksForDownloadFiles(nodeForm) {}
  function ShowPage() {
    try {
      m_FullscreenMode.Disable();
    } catch (_) {}
    document.body.textContent = "";
    for (let node of document.querySelectorAll(
      'link[rel="stylesheet"], style',
    )) {
      node.remove();
    }
    for (let node of [document.documentElement, document.body]) {
      node.removeAttribute("class");
      node.removeAttribute("style");
      node.removeAttribute("hidden");
    }
    return new Promise((fnExecute) => {
      const node = document.createElement("iframe");
      node.src = "report.html";
      node.style.position = "fixed";
      node.style.top = "0";
      node.style.left = "0";
      node.style.width = "100%";
      node.style.height = "100%";
      node.style.zIndex = "100500";
      node.style.border = "0";
      node.addEventListener("load", () => {
        m_i18n.TranslateDocument(node.contentDocument);
        fnExecute(node.contentDocument);
      });
      document.body.appendChild(node);
    });
  }
  function ShowForm(oDocument, sIdForm, isConfigureBackground) {
    if (isConfigureBackground) {
      oDocument.documentElement.classList.add(sIdForm);
    }
    for (
      let nodeShowOrHide, nodesShowOrHide = oDocument.forms, idx = 0;
      (nodeShowOrHide = nodesShowOrHide[idx]);
      ++idx
    ) {
      if (nodeShowOrHide.id === sIdForm) {
        ShowElement(nodeShowOrHide, true);
        const nodeFocus = nodeShowOrHide.querySelector("[autofocus]");
        if (nodeFocus) {
          nodeFocus.focus();
        }
      } else {
        ShowElement(nodeShowOrHide, false);
      }
    }
  }
  function ShowMessage(sMessage, sCodeLinks, sAddressLinks, sCodeMessage) {
    ShowPage().then((oDocument) => {
      oDocument.getElementById("debug-messagetext").textContent = sMessage;
      if (sCodeLinks) {
        const elLink = oDocument.getElementById("debug-messagelink");
        elLink.textContent = Text(sCodeLinks);
        elLink.href = sAddressLinks;
      }
      ShowForm(oDocument, "debug-message", true);
      if (sCodeMessage && CODES_AUTORELOAD.has(sCodeMessage)) {
        startAutoreload(oDocument);
      }
    });
  }
  function ShowAndSendReport(oReport, bufSend) {
    ShowPage().then((oDocument) => {
      let nodeForm;
      if (oReport.ReasonFinishWork === "SEND FEEDBACK") {
        nodeForm = oDocument.getElementById("debug-feedback");
      } else {
        nodeForm = oDocument.getElementById("debug-error");
        InsertLinksForDownloadFiles(nodeForm);
      }
      nodeForm.elements["debug-report"].value = JSON.stringify(oReport);
      ShowForm(oDocument, nodeForm.id, true);
      oDocument.addEventListener("reset", (oEvent) => {
        oEvent.preventDefault();
        window.location.reload(true);
      });
      let oRequest, oData, nCode;
      oDocument.addEventListener("submit", (oEvent) => {
        oEvent.preventDefault();
        if (oEvent.target.id === "debug-sendprogress") {
          nCode = 200;
          oRequest.abort();
          return;
        }
        oDocument.getElementById("debug-sendprogress2").value = 0;
        ShowForm(oDocument, "debug-sendprogress", false);
        nCode = 0;
        if (!oRequest) {
          oRequest = new XMLHttpRequest();
          oRequest.upload.addEventListener("progress", (oEvent) => {
            oDocument.getElementById("debug-sendprogress2").value =
              oEvent.loaded / oEvent.total;
          });
          oRequest.addEventListener("load", () => {
            nCode = oRequest.status;
          });
          oRequest.addEventListener("loadend", () => {
            if (nCode >= 200 && nCode <= 299) {
              window.location.reload(true);
            } else if (nCode === 474) {
              showForm("debug-browseroutdated", true);
            } else if (nCode >= 400 && nCode <= 499) {
              ShowForm(oDocument, "debug-versionoutdated", true);
            } else {
              ShowForm(oDocument, "debug-sendfailed", true);
            }
          });
          oData = new FormData(nodeForm);
          if (bufSend) {
            oData.append(
              "debug-transportStream-0",
              new Blob([bufSend], {
                type: "video/mp2t",
              }),
            );
          }
        }
        //! This request sends a crash report or user feedback to the extension developer. The user can
        //! view the contents of oReport and refuse to send it. See https://coolcmd.github.io/privacy.html
        oRequest.open("POST", "http://r90354g8.beget.tech/tw5/report3.php");
        oRequest.send(oData);
      });
    });
  }
  function saveTokenBroadcast(sTokenBroadcast, isWithoutAd) {
    sTokenBroadcast = ClampLengthString(
      sTokenBroadcast,
      MAX_LENGTH_STRING_REPORT,
    );
    if (isWithoutAd) {
      _sTokenBroadcastWithoutAd = sTokenBroadcast;
    } else {
      _sTokenBroadcast = sTokenBroadcast;
    }
  }
  function SaveListVariants(sListVariants) {
    _sListVariants = sListVariants;
  }
  function SaveListSegments(sListSegments) {
    if (_strsListsSegments.length === 10) {
      _strsListsSegments.shift();
    }
    _strsListsSegments.push(sListSegments);
  }
  function SaveTransportStream(oSegment) {}
  function SaveConvertedSegment(oSegment) {}
  function compressList(sList) {
    return ClampLengthString(
      sList.replace(
        /^(?:https?:\/\/|#EXT-X-TWITCH-PREFETCH:).+$/gm,
        (sString) => ClampLengthString(sString, 100),
      ),
      MAX_LENGTH_STRING_REPORT,
    );
  }
  function ProbeCpuAndRam(fnCall) {
    const oCpuAndRam = {
      capacity: navigator.deviceMemory,
      numOfProcessors: navigator.hardwareConcurrency,
    };
    if (performance.memory) {
      oCpuAndRam.jsHeapSizeLimit = Math.round(
        performance.memory.jsHeapSizeLimit / 1024 / 1024,
      );
      oCpuAndRam.totalJSHeapSize = Math.round(
        performance.memory.totalJSHeapSize / 1024 / 1024,
      );
      oCpuAndRam.usedJSHeapSize = Math.round(
        performance.memory.usedJSHeapSize / 1024 / 1024,
      );
    }
    try {
      chrome.system.memory.getInfo((oRam) => {
        try {
          oCpuAndRam.capacity = Round(oRam.capacity / 1024 / 1024 / 1024, 1);
          oCpuAndRam.availableCapacity = Round(
            oRam.availableCapacity / 1024 / 1024 / 1024,
            1,
          );
          chrome.system.cpu.getInfo((oCpu) => {
            try {
              oCpuAndRam.numOfProcessors = oCpu.numOfProcessors;
              oCpuAndRam.modelName = oCpu.modelName;
              oCpuAndRam.archName = oCpu.archName;
            } catch (_) {}
            fnCall(oCpuAndRam);
          });
        } catch (_) {
          fnCall(oCpuAndRam);
        }
      });
    } catch (_) {
      fnCall(oCpuAndRam);
    }
  }
  function ProbeGpu() {
    try {
      const oContext = document.createElement("canvas").getContext("webgl");
      const oExtension = oContext.getExtension("WEBGL_debug_renderer_info");
      return `${oContext.getParameter(oExtension.UNMASKED_VENDOR_WEBGL)} | ${oContext.getParameter(oExtension.UNMASKED_RENDERER_WEBGL)}`;
    } catch (_) {}
  }
  function getParametersConnection() {
    const oConnection = navigator.connection || {};
    return {
      online: navigator.onLine,
      effectiveType: oConnection.effectiveType,
      downlink: oConnection.downlink,
      rtt: oConnection.rtt,
      type: oConnection.type,
      downlinkMax: oConnection.downlinkMax,
    };
  }
  function GetLanguages() {
    try {
      return `${navigator.language} | ${navigator.languages} | ${Text("J0103")}`;
    } catch (_) {}
  }
  function GetInstallDate() {
    try {
      const oInstall = new Intl.DateTimeFormat().resolvedOptions();
      oInstall.timezoneOffset = new Date().getTimezoneOffset();
      return oInstall;
    } catch (_) {}
  }
  function CreateShowAndSendReport(sReasonFinishWork, bufSend) {
    ProbeCpuAndRam((oCpuAndRam) => {
      ShowAndSendReport(
        {
          ReasonFinishWork: sReasonFinishWork,
          VersionExtension: VERSION_EXTENSION,
          Useragent: navigator.userAgent,
          Time: new Date().toISOString(),
          Address: window.location.href,
          Incognito: chrome.extension.inIncognitoContext,
          Desync: Date.now() - performance.now() - g_nExactTime,
          Focus: m_Focus.GetState(),
          Pulse: m_Pulse.GetDataForReport(),
          Settings: m_Settings.GetDataForReport(),
          Stats: m_Stats.GetDataForReport(),
          Languages: GetLanguages(),
          InstallDate: GetInstallDate(),
          Connection: getParametersConnection(),
          Gpu: ProbeGpu(),
          CpuAndRam: oCpuAndRam,
          PointsTouch: navigator.maxTouchPoints,
          Screen: {
            top: window.screen.top,
            left: window.screen.left,
            width: window.screen.width,
            height: window.screen.height,
            availTop: window.screen.availTop,
            availLeft: window.screen.availLeft,
            availWidth: window.screen.availWidth,
            availHeight: window.screen.availHeight,
            colorDepth: window.screen.colorDepth,
            pixelDepth: window.screen.pixelDepth,
            orientation:
              typeof window.screen.orientation == "object"
                ? window.screen.orientation.type
                : void 0,
            screenX: window.screenX,
            screenY: window.screenY,
            outerWidth: window.outerWidth,
            outerHeight: window.outerHeight,
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio,
          },
          TokenBroadcast: _sTokenBroadcast,
          TokenBroadcastWithoutAd: _sTokenBroadcastWithoutAd,
          ListVariants: compressList(_sListVariants),
          ListsSegments: _strsListsSegments.map(compressList),
          Log: m_Log.GetDataForReport(),
        },
        bufSend,
      );
    });
  }
  function FinishWorkAndShowMessage(sCodeMessage, sCodeLinks, sAddressLinks) {
    if (!g_isWorkFinished) {
      console.error(sCodeMessage);
      FinishWork(false);
      ShowMessage(Text(sCodeMessage), sCodeLinks, sAddressLinks, sCodeMessage);
    }
    throw void 0;
  }
  function FinishWorkAndSendReport(sReasonFinishWork, bufSend) {
    if (!g_isWorkFinished) {
      console.error(sReasonFinishWork);
      sReasonFinishWork = ClampLengthString(
        String(sReasonFinishWork),
        MAX_LENGTH_STRING_REPORT,
      );
      if (sReasonFinishWork.includes("out of memory")) {
        FinishWorkAndShowMessage("J0200");
      }
      try {
        m_Player.ShowState("Here", "Finishing work");
        g_objsQueue.ShowState();
      } catch (_) {}
      FinishWork(false);
      CreateShowAndSendReport(sReasonFinishWork, bufSend);
    }
    throw void 0;
  }
  function CaughtException(pException) {
    FinishWorkAndSendReport(ConvertExceptionInString(pException));
  }
  function FinishWorkAndSendFeedback() {
    try {
      FinishWorkAndSendReport("SEND FEEDBACK");
    } catch (_) {}
  }
  return {
    CaughtException,
    FinishWorkAndShowMessage,
    FinishWorkAndSendReport,
    FinishWorkAndSendFeedback,
    resetCounterAutoreload,
    saveTokenBroadcast,
    SaveListVariants,
    SaveListSegments,
    SaveTransportStream,
    SaveConvertedSegment,
  };
})();

class CancelPromise {
  constructor() {
    this.isCancelled = false;
    this._fnHandler = null;
  }
  Cancel() {
    this.isCancelled = true;
    if (this._fnHandler) {
      this._fnHandler();
      this._fnHandler = null;
    }
  }
  ReplaceHandler(fnHandler) {
    Assert(!this.isCancelled);
    Assert(typeof fnHandler == "function" || fnHandler === null);
    this._fnHandler = fnHandler;
  }
}

CancelPromise.REASON = new Error("PROMISE_CANCELLED");

function Wait(oCancelPromise, nMilliseconds) {
  if (oCancelPromise && oCancelPromise.isCancelled) {
    return Promise.reject(CancelPromise.REASON);
  }
  if (nMilliseconds === -Infinity) {
    let oPromise = Promise.resolve();
    if (oCancelPromise) {
      oPromise = oPromise.then(() => {
        if (oCancelPromise.isCancelled) {
          throw CancelPromise.REASON;
        }
      });
    }
    return oPromise;
  }
  Assert(Number.isFinite(nMilliseconds));
  nMilliseconds = Math.round(nMilliseconds);
  Assert(nMilliseconds >= 0 && nMilliseconds <= 2147483647);
  if (oCancelPromise) {
    return new Promise((fnExecute, fnGiveup) => {
      const nTimer = setTimeout(() => {
        oCancelPromise.ReplaceHandler(null);
        fnExecute();
      }, nMilliseconds);
      oCancelPromise.ReplaceHandler(() => {
        clearTimeout(nTimer);
        fnGiveup(CancelPromise.REASON);
      });
    });
  }
  return new Promise((fnExecute) => {
    setTimeout(fnExecute, nMilliseconds);
  });
}

class Segment {
  constructor(nHandling, pData, nDuration, isDiscontinuity, nNumber) {
    Assert(
      typeof nHandling == "number" &&
        nHandling >= HANDLING_WAITING_LOAD &&
        nHandling <= HANDLING_CONVERTED,
    );
    Assert(
      (typeof pData == "number" && nHandling >= HANDLING_LOADED) ||
        (typeof pData == "string" && nHandling === HANDLING_WAITING_LOAD) ||
        (ThisObject(pData) && nHandling > HANDLING_WAITING_LOAD),
    );
    switch (arguments.length) {
      case 2:
        nDuration = 0;
        isDiscontinuity = true;

      case 4:
        Assert(Number.isFinite(nDuration) && nDuration >= 0);
        Assert(typeof isDiscontinuity == "boolean");
        nNumber = ++Segment._nNumber;

      case 5:
        Assert(Number.isFinite(nNumber));
        break;

      default:
        Assert(false);
    }
    if (typeof pData == "number") {
      m_Log.Ok(
        `[Queue] Added segment ${nNumber} State=${pData} Handling=${nHandling}`,
      );
    }
    this.nHandling = nHandling;
    this.pData = pData;
    this.nDuration = nDuration;
    this.isDiscontinuity = isDiscontinuity;
    this.nNumber = nNumber;
  }
  toString() {
    if (typeof this.pData == "number") {
      return `${this.nNumber}-${this.nHandling}-${this.pData}`;
    }
    if (this.isDiscontinuity) {
      return `${this.nNumber}-${this.nHandling}-R`;
    }
    return `${this.nNumber}-${this.nHandling}`;
  }
}

Segment._nNumber = 0;

let g_objsQueue = [];

let g_isFMP4 = false;
let g_sCodecsFMP4 = "";
let g_oInitFMP4 = null;
let g_bfInitFMP4 = null;
let g_sAddressLoadedInitFMP4 = "";
let g_oCancelLoadInitFMP4 = null;
let g_isExistsVideoFMP4 = false;
let g_isExistsAudioFMP4 = false;

function LoadInitFMP4() {
  if (!g_oInitFMP4 || g_oCancelLoadInitFMP4) {
    return;
  }
  const sAddress = g_oInitFMP4.sAddress;
  g_oCancelLoadInitFMP4 = new CancelPromise();
  m_Loader
    .Load(
      g_oCancelLoadInitFMP4,
      "GET",
      sAddress,
      15e3,
      null,
      null,
      "segment init",
      false,
      0,
    )
    .then(
      AddHandlerExceptions((buf) => {
        g_oCancelLoadInitFMP4 = null;
        if (!g_isFMP4 || !g_oInitFMP4 || g_oInitFMP4.sAddress !== sAddress) {
          return;
        }
        g_bfInitFMP4 = buf;
        g_sAddressLoadedInitFMP4 = sAddress;
        m_Log.Ok(`[fMP4] Loaded segment init ${buf.byteLength} byte`);
        m_Converter.ConvertNextSegment();
      }),
    )
    .catch(
      AddHandlerExceptions((pReason) => {
        g_oCancelLoadInitFMP4 = null;
        if (pReason !== CancelPromise.REASON) {
          throw pReason;
        }
      }),
    );
}

g_objsQueue.CountConvertedSegments = function () {
  let countCount = 0,
    nDuration = 0;
  for (
    ;
    countCount < this.length &&
    this[countCount].nHandling === HANDLING_CONVERTED;
    ++countCount
  ) {
    if (typeof this[countCount].pData != "number") {
      nDuration += this[countCount].nDuration;
    }
  }
  return {
    countCount,
    nDuration,
  };
};

g_objsQueue.Add = function (oSegment) {
  Assert(oSegment instanceof Segment);
  for (let o of this) {
    Assert(o.nNumber !== oSegment.nNumber);
  }
  if (oSegment.nHandling !== HANDLING_CONVERTED) {
    this.push(oSegment);
  } else {
    const { countCount, nDuration } = this.CountConvertedSegments();
    if (nDuration > OVERFLOW_BUFFER * 1.5) {
      m_Debug.FinishWorkAndShowMessage("J0208");
    }
    this.splice(countCount, 0, oSegment);
  }
  return oSegment;
};

g_objsQueue.Remove = function (pElement, countCount = 1) {
  if (countCount === 0) {
    return;
  }
  Assert(Number.isInteger(countCount) && countCount > 0);
  let nIndex;
  if (typeof pElement == "number") {
    Assert(Number.isInteger(pElement) && pElement >= 0);
    nIndex = pElement;
  } else if ((nIndex = this.indexOf(pElement)) === -1) {
    Assert(pElement instanceof Segment);
    return;
  }
  while (--countCount >= 0) {
    Assert(nIndex < this.length);
    switch (this[nIndex].nHandling) {
      case HANDLING_LOADING:
        if (ThisObject(this[nIndex].pData)) {
          m_Log.Here(`[Queue] Cancelling load ${this[nIndex]}`);
          this[nIndex].pData.Cancel();
        }
        break;

      case HANDLING_LOADED:
        m_Trash.Throw(this[nIndex].pData);
        break;

      case HANDLING_CONVERTED:
        if (ThisObject(this[nIndex].pData)) {
          m_Trash.Throw(this[nIndex].pData.mbSegmentInit);
          m_Trash.Throw(this[nIndex].pData.mbMediasegment);
        }
    }
    m_Log.Here(`[Queue] Removing ${this[nIndex]}`);
    this.splice(nIndex, 1);
  }
};

g_objsQueue.Clear = function () {
  this.Remove(0, this.length);
};

g_objsQueue.ShowState = function () {
  m_Log.Here(`[Queue] ${this.join(" ")}`);
};

class InputNumber {
  constructor(sNameSettings, nStep, nPrecision, sIdNode) {
    Assert(nPrecision >= 0 && ThisNonemptyString(sIdNode));
    this._sNameSettings = sNameSettings;
    this._nStep = nStep;
    this._nPrecision = nPrecision;
    this._nAdd = 0;
    this._countInterval = 0;
    this._nTimer = 0;
    m_Event.AddHandler(`draghandle-drag-${sIdNode}`, (oParameters) =>
      this._HandleDrag(oParameters),
    );
    this._nodeNumber = document.querySelector(
      `#${sIdNode} > .inputNumber-number`,
    );
    this.Update();
  }
  Update(nValue = m_Settings.Get(this._sNameSettings)) {
    this._nodeNumber.value =
      nValue === AUTOTUNE
        ? Text(m_Settings.GetParametersSettings(this._sNameSettings).sAutotune)
        : m_i18n.FormatNumber(nValue, this._nPrecision);
  }
  _HandleDrag(oParameters) {
    const INTERVAL_CHANGE_VALUE = 130;
    if (oParameters.nStep === 1) {
      this._nAdd = oParameters.nodePressed.classList.contains(
        "inputNumber-minus",
      )
        ? -this._nStep
        : this._nStep;
      this._countInterval = 0;
      this._nTimer = setInterval(
        () => this._HandleTimer(),
        INTERVAL_CHANGE_VALUE,
      );
      this._HandleTimer();
    }
    if (oParameters.nStep === 3) {
      clearInterval(this._nTimer);
    }
  }
}

InputNumber.prototype._HandleTimer = AddHandlerExceptions(function () {
  const LATENCY_CHANGE_VALUE = 3;
  if (
    ++this._countInterval == 1 ||
    this._countInterval > LATENCY_CHANGE_VALUE
  ) {
    const oParametersSettings = m_Settings.GetParametersSettings(
      this._sNameSettings,
    );
    const nValue = m_Settings.Get(this._sNameSettings);
    let nNewValue;
    if (
      (oParametersSettings.sAutotune &&
        this._nAdd < 0 &&
        nValue === oParametersSettings.nMinimum) ||
      (oParametersSettings.sAutotune &&
        this._nAdd > 0 &&
        nValue === oParametersSettings.nMaximum)
    ) {
      nNewValue = AUTOTUNE;
    } else if (nValue === AUTOTUNE && this._nAdd > 0) {
      nNewValue = oParametersSettings.nMinimum;
    } else if (nValue === AUTOTUNE && this._nAdd < 0) {
      nNewValue = oParametersSettings.nMaximum;
    } else {
      nNewValue = nValue + this._nAdd;
    }
    if (nNewValue !== AUTOTUNE) {
      nNewValue = Clamp(
        Round(nNewValue, this._nPrecision),
        oParametersSettings.nMinimum,
        oParametersSettings.nMaximum,
      );
    }
    if (nNewValue !== nValue) {
      m_Settings.Change(this._sNameSettings, nNewValue);
      this.Update(nNewValue);
      this.AfterChange(nNewValue);
    }
  }
});

InputNumber.prototype.AfterChange = NOOP;

const m_Event = (() => {
  let _mapHandlers = new Map();
  function AddHandler(sEvent, fnHandler) {
    Assert(ThisNonemptyString(sEvent));
    Assert(typeof fnHandler == "function" || ThisObject(fnHandler));
    let setHandlersEvent = _mapHandlers.get(sEvent);
    if (setHandlersEvent === void 0) {
      setHandlersEvent = new Set();
      _mapHandlers.set(sEvent, setHandlersEvent);
    }
    setHandlersEvent.add(fnHandler);
  }
  function RemoveHandler(sEvent, fnHandler) {
    Assert(ThisNonemptyString(sEvent));
    Assert(typeof fnHandler == "function" || ThisObject(fnHandler));
    const setHandlersEvent = _mapHandlers.get(sEvent);
    if (setHandlersEvent !== void 0) {
      setHandlersEvent.delete(fnHandler);
      if (setHandlersEvent.size === 0) {
        _mapHandlers.delete(sEvent);
      }
    }
  }
  function DispatchEvent(sEvent, pData) {
    Assert(ThisNonemptyString(sEvent));
    m_Log.Here(`[Event] Happened event ${sEvent}`);
    const setHandlersEvent = _mapHandlers.get(sEvent);
    if (setHandlersEvent !== void 0) {
      Assert(setHandlersEvent.size !== 0);
      let oEvent;
      for (let fnHandler of setHandlersEvent.values()) {
        if (typeof fnHandler == "function") {
          fnHandler(pData, sEvent);
        } else {
          if (oEvent === void 0) {
            oEvent = {
              type: sEvent,
              data: pData,
            };
          }
          fnHandler.handleEvent(oEvent);
        }
      }
    }
  }
  return {
    AddHandler,
    RemoveHandler,
    DispatchEvent,
  };
})();

const m_Trash = (() => {
  class TrashInChannelMessages {
    constructor() {
      this._oChannelMessages = null;
    }
    Throw(pJunk) {
      if (ThisObject(pJunk)) {
        const bufJunk = pJunk.buffer ? pJunk.buffer : pJunk;
        if (bufJunk.byteLength) {
          m_Log.Here(`[Trash] Throwing ${bufJunk.byteLength} bytes`);
          if (this._oChannelMessages === null) {
            this._oChannelMessages = new MessageChannel();
            this._oChannelMessages.port2.close();
          }
          this._oChannelMessages.port1.postMessage(bufJunk, [bufJunk]);
        }
      }
    }
    Burn() {}
  }
  class TrashInWorkingStream {
    constructor() {
      this._oWorkingStream = null;
      this._kbInTrash = 0;
      m_Event.AddHandler("controls-statechanged", (nState) => {
        if (
          nState === STATE_FINISH_BROADCAST ||
          nState === STATE_STOP ||
          nState === STATE_REPLAY
        ) {
          this.Burn();
        }
      });
    }
    Throw(pJunk) {
      const CAPACITY_TRASH = 1e7;
      if (ThisObject(pJunk)) {
        const bufJunk = pJunk.buffer ? pJunk.buffer : pJunk;
        if (bufJunk.byteLength) {
          m_Log.Here(`[Trash] Throwing ${bufJunk.byteLength} bytes`);
          if (this._oWorkingStream === null) {
            this._oWorkingStream = new Worker(
              chrome.runtime.getURL("src/player/recycler.js"),
            );
          }
          this._kbInTrash += bufJunk.byteLength;
          this._oWorkingStream.postMessage(bufJunk, [bufJunk]);
          if (this._kbInTrash > CAPACITY_TRASH) {
            this.Burn();
          }
        }
      }
    }
    Burn() {
      if (this._oWorkingStream !== null) {
        m_Log.Here(`[Trash] Burning ${this._kbInTrash} bytes`);
        this._oWorkingStream.postMessage(null);
        this._oWorkingStream = null;
        this._kbInTrash = 0;
      }
    }
  }
  if (thisMobileDevice()) {
    return {
      Throw: NOOP,
      Burn: NOOP,
    };
  }
  return getVersionEngineBrowser() < 67
    ? new TrashInWorkingStream()
    : new TrashInChannelMessages();
})();

const m_Focus = (() => {
  let _oState = GetNewState();
  function GetState() {
    return _oState;
  }
  function GetNewState() {
    const isShown = !document.hidden;
    const isActive = isShown && document.hasFocus();
    return {
      isShown,
      isActive,
    };
  }
  const HandleEvent = AddHandlerExceptions((oEvent) => {
    m_Log.Here(`[Focus] Event2 ${oEvent.type}, old state ${m_Log.O(_oState)}`);
    setTimeout(UpdateState);
  });
  const UpdateState = AddHandlerExceptions(() => {
    const oNewState = GetNewState();
    if (
      _oState.isShown !== oNewState.isShown ||
      _oState.isActive !== oNewState.isActive
    ) {
      m_Log.Ok(`[Focus] New state ${m_Log.O(oNewState)}`);
      _oState = oNewState;
      m_Event.DispatchEvent("focus-statechanged", oNewState);
    }
  });
  m_Log.Here(`[Focus] Initial state ${m_Log.O(_oState)}`);
  document.addEventListener("visibilitychange", HandleEvent);
  window.addEventListener("focus", HandleEvent);
  window.addEventListener("blur", HandleEvent);
  return {
    GetState,
  };
})();

const m_Pulse = (() => {
  const INTERVAL_CHECK = 970;
  const MIN_DEVIATION_TIME = -30;
  const MAX_DEVIATION_TIME = 200;
  const MAX_DEVIATION_DATE = 40;
  let _nMaximumDeviation = 0;
  let _nTimer = 0;
  let _nTime;
  let _nDate;
  const AssertPulse = AddHandlerExceptions(() => {
    const nTime = performance.now();
    const nDate = Date.now();
    const nDeviationTime = nTime - _nTime - INTERVAL_CHECK;
    const nDeviationDate = nDate - _nDate - (nTime - _nTime);
    if (
      nDeviationTime < MIN_DEVIATION_TIME ||
      nDeviationTime > MAX_DEVIATION_TIME ||
      Math.abs(nDeviationDate) > MAX_DEVIATION_DATE
    ) {
      m_Log.Oops(
        `[Pulse] ${m_Log.F0(nDeviationTime)} ${m_Log.F0(nDeviationDate)}`,
      );
    }
    _nMaximumDeviation = Math.max(_nMaximumDeviation, nDeviationTime);
    _nTime = nTime;
    _nDate = nDate;
    _nTimer = setTimeout(AssertPulse, INTERVAL_CHECK);
  });
  function HandleChangeState(nState) {
    if (
      nState === STATE_FINISH_BROADCAST ||
      nState === STATE_STOP ||
      nState === STATE_REPLAY
    ) {
      if (_nTimer !== 0) {
        m_Log.Here("[Pulse] Timer stopped");
        clearTimeout(_nTimer);
        _nTimer = 0;
      }
    } else if (_nTimer === 0) {
      m_Log.Here("[Pulse] Timer started");
      _nTime = performance.now();
      _nDate = Date.now();
      _nTimer = setTimeout(AssertPulse, INTERVAL_CHECK);
    }
  }
  function GetDataForReport() {
    return _nMaximumDeviation;
  }
  m_Event.AddHandler("controls-statechanged", HandleChangeState);
  return {
    GetDataForReport,
  };
})();

const m_Stats = (() => {
  const RATE_UPDATE_STATS = 3;
  const SIZE_HISTORY_LIST = 30;
  const SIZE_HISTORY_LOAD = 30;
  const SIZE_HISTORY_BUFFER = 30;
  const SIZE_HISTORY_AD = 15;
  const HIGHLIGHT_WAIT_RESPONSE = 1;
  const HIGHLIGHT_CONVERTED = 2;
  const HIGHLIGHT_NOT_WATCHED_MIN = 1;
  const HIGHLIGHT_NOT_WATCHED_MAX = 0.5;
  const HIGHLIGHT_SKIPPED_FRAMES = 100;
  const HIGHLIGHT_RATE_FRAMES = 0.85;
  const HIGHLIGHT_LOSS_VIDEO_REL = 1 / 5;
  const HIGHLIGHT_LOSS_VIDEO_ABS = 300;
  const HIGHLIGHT_EXHAUSTION_BUFFER = 5;
  let _nTimer = 0;
  let _nTargetDuration = 0;
  let _nMinDurationVideosample = -Infinity;
  let _nMaxDurationVideosample = +Infinity;
  let _oIntervalUpdate = null;
  let _oSegmentsAdded = null;
  let _oSecondsAdded = null;
  let _oBitrateSegment = null;
  let _oBitrateChannel = null;
  let _oWaitResponse = null;
  let _oNotWatched = null;
  let _countSourceSegments = 0;
  let _countRejectedSegments = 0;
  let _kbTotalDownloaded = 0;
  let _countErrorsLoad = 0;
  let _countSkippedSegments = 0;
  let _countUnloadedSegments = 0;
  let _countLossesVideo = 0;
  let _countLossesAudio = 0;
  let _countExhaustionsBuffer = 0;
  let _countExhaustionsBufferEarly = 0;
  let _countOverflowsBuffer = 0;
  let _nSkippedInBuffer = 0;
  let _countCountAd = 0;
  let _numsStartAd = [];
  let _numsEndAd = [];
  let _nTimeLastUpdate;
  function HighlightSegmentsAdded(nNumber2) {
    return nNumber2 !== 1 && nNumber2 !== 2;
  }
  function HighlightWaitResponse(nNumber2) {
    return nNumber2 >= HIGHLIGHT_WAIT_RESPONSE;
  }
  function HighlightNotWatched(nNumber2) {
    return (
      nNumber2 < HIGHLIGHT_NOT_WATCHED_MIN ||
      nNumber2 >=
        m_Settings.Get("nMaxSizeBuffer") +
          m_Settings.Get("nStretchBuffer") * HIGHLIGHT_NOT_WATCHED_MAX
    );
  }
  class Analysis {
    constructor(sIdNode, nSizeHistory, nPrecision) {
      Assert(nSizeHistory > 0 && nPrecision >= 0);
      this._nodeTable = byId(sIdNode);
      this._numsHistory = new Array(nSizeHistory);
      this._markHighlight = new Array(nSizeHistory);
      this._nPrecision = nPrecision;
      this._Clear();
    }
    Free() {
      this._nodeTable.textContent = "";
      this._nodeTable = null;
    }
    Clear() {
      if (this._countFilled !== 0) {
        this._Clear();
      }
    }
    GetLastNumber(nNoop) {
      return this._countFilled === 0 ? nNoop : this._numsHistory[this._nIndex];
    }
    AddNumber(nNumber2, pHighlight, pHighlightAverage) {
      const START_HISTORY = 5;
      const isHighlight = Boolean(
        typeof pHighlight == "function" ? pHighlight(nNumber2) : pHighlight,
      );
      if (this._countFilled !== 0) {
        this._nodeTable.children[START_HISTORY + this._nIndex].classList.add(
          "stats-detailed",
        );
      }
      if (this._countFilled !== this._numsHistory.length) {
        ++this._countFilled;
      }
      if (++this._nIndex === this._numsHistory.length) {
        this._nIndex = 0;
      }
      this._numsHistory[this._nIndex] = nNumber2;
      this._markHighlight[this._nIndex] = isHighlight;
      let nMinimumNumber = Infinity,
        isHighlightMinimum = false;
      let nMaximumNumber = -Infinity,
        isHighlightMaximum = false;
      let nAverageNumber = 0,
        countNumbers = 0;
      for (let idx = 0; idx < this._countFilled; ++idx) {
        if (Number.isFinite(this._numsHistory[idx])) {
          if (
            this._numsHistory[idx] < nMinimumNumber ||
            (this._numsHistory[idx] === nMinimumNumber &&
              this._markHighlight[idx])
          ) {
            nMinimumNumber = this._numsHistory[idx];
            isHighlightMinimum = this._markHighlight[idx];
          }
          if (
            this._numsHistory[idx] > nMaximumNumber ||
            (this._numsHistory[idx] === nMaximumNumber &&
              this._markHighlight[idx])
          ) {
            nMaximumNumber = this._numsHistory[idx];
            isHighlightMaximum = this._markHighlight[idx];
          }
          nAverageNumber += this._numsHistory[idx];
          ++countNumbers;
        }
      }
      let isHighlightAverage;
      if (countNumbers === 0) {
        nAverageNumber = NaN;
        isHighlightAverage = false;
      } else {
        nAverageNumber /= countNumbers;
        isHighlightAverage = Boolean(
          typeof pHighlightAverage == "function"
            ? pHighlightAverage(nAverageNumber)
            : pHighlightAverage,
        );
      }
      UpdateValue(
        this._nodeTable.children[0],
        this._InString(nMinimumNumber),
        isHighlightMinimum,
      );
      UpdateValue(
        this._nodeTable.children[2],
        this._InString(nAverageNumber),
        isHighlightAverage,
      );
      UpdateValue(
        this._nodeTable.children[4],
        this._InString(nMaximumNumber),
        isHighlightMaximum,
      );
      UpdateValue(
        this._nodeTable.children[START_HISTORY + this._nIndex],
        this._InString(nNumber2),
        isHighlight,
      ).classList.remove("stats-detailed");
      return nAverageNumber;
    }
    _Clear() {
      this._countFilled = 0;
      this._nIndex = -1;
      const nodeFragment = document.createDocumentFragment();
      nodeFragment.appendChild(document.createElement("td")).className =
        "analysis-minimum";
      nodeFragment.appendChild(document.createElement("td")).textContent =
        " < ";
      nodeFragment.lastChild.className = "stats-char";
      nodeFragment.appendChild(document.createElement("td")).className =
        "analysis-average";
      nodeFragment.appendChild(document.createElement("td")).textContent =
        " < ";
      nodeFragment.lastChild.className = "stats-char";
      nodeFragment.appendChild(document.createElement("td")).className =
        "analysis-maximum";
      for (let idx = this._numsHistory.length; --idx >= 0;) {
        nodeFragment.appendChild(document.createElement("td")).className =
          "analysis-history stats-detailed";
      }
      this._nodeTable.textContent = "";
      this._nodeTable.appendChild(nodeFragment);
    }
    _InString(nNumber2) {
      return Number.isFinite(nNumber2)
        ? nNumber2.toFixed(nNumber2 < 100 ? this._nPrecision : 0)
        : " ";
    }
  }
  function UpdateValue(pElement, pValue, isHighlight) {
    const nodeElement = byId(pElement);
    nodeElement.classList.toggle("stats-highlight", isHighlight);
    nodeElement.textContent = pValue;
    return nodeElement;
  }
  function GetTitleProfileH264(nProfileIndication, nConstraintSetFlag) {
    switch (nProfileIndication) {
      case 66:
        return (nConstraintSetFlag & 64) == 0
          ? "Baseline"
          : "Constrained Baseline";

      case 77:
        return "Main";

      case 88:
        return "Extended";

      case 100:
        switch (nConstraintSetFlag & 12) {
          case 8:
            return "Progressive High";

          case 12:
            return "Constrained High";
        }
        return "High";

      case 110:
        return (nConstraintSetFlag & 16) == 0 ? "High 10" : "High 10 Intra";

      case 122:
        return (nConstraintSetFlag & 16) == 0
          ? "High 4:2:2"
          : "High 4:2:2 Intra";

      case 244:
        return (nConstraintSetFlag & 16) == 0
          ? "High 4:4:4 Predictive"
          : "High 4:4:4 Intra";

      case 44:
        return "CAVLC 4:4:4 Intra";
    }
    m_Log.Oops(
      `[Stats] Unknown profile H.264 ProfileIndication=${nProfileIndication} ConstraintSetFlag=${nConstraintSetFlag}`,
    );
    return `P${nProfileIndication}C${nConstraintSetFlag}`;
  }
  function UpdateStats() {
    document.getElementById("stats-watchduration").textContent =
      m_i18n.ConvertSecondsInString(performance.now() / 1e3, true);
    const { droppedVideoFrames, totalVideoFrames } =
      m_Player.GetCountSkippedFrames();
    UpdateValue(
      "stats-skipped",
      droppedVideoFrames,
      droppedVideoFrames >= HIGHLIGHT_SKIPPED_FRAMES,
    ).nextElementSibling.nextElementSibling.textContent = totalVideoFrames;
    let nWaitingLoad = 0,
      nLoading = 0,
      countConverted = 0,
      nConverted = 0;
    for (let oSegment of g_objsQueue) {
      switch (oSegment.nHandling) {
        case HANDLING_WAITING_LOAD:
          nWaitingLoad += oSegment.nDuration;
          break;

        case HANDLING_LOADING:
        case HANDLING_LOADED:
          nLoading += oSegment.nDuration;
          break;

        case HANDLING_CONVERTED:
          countConverted++;
          nConverted += oSegment.nDuration;
          break;

        default:
          Assert(false);
      }
    }
    const { nWatched, nNotWatched } = m_Player.GetFillBuffer();
    let node = UpdateValue(
      "stats-queue",
      nWaitingLoad.toFixed(1),
      nWaitingLoad > m_Settings.Get("nMaxSizeBuffer"),
    );
    node = node.nextElementSibling.nextElementSibling;
    node.textContent = nLoading.toFixed(1);
    node = node.nextElementSibling;
    UpdateValue(
      node,
      nConverted.toFixed(1),
      countConverted >= HIGHLIGHT_CONVERTED,
    );
    node = node.nextElementSibling;
    UpdateValue(node, nNotWatched.toFixed(1), HighlightNotWatched(nNotWatched));
    node = node.nextElementSibling.nextElementSibling;
    node.textContent = nWatched.toFixed(1);
  }
  function WindowOpen() {
    return _nTimer !== 0;
  }
  function OpenWindow() {
    if (WindowOpen()) {
      return;
    }
    _oIntervalUpdate = new Analysis(
      "stats-updateinterval",
      SIZE_HISTORY_LIST,
      1,
    );
    _oSegmentsAdded = new Analysis("stats-segmentsAdded", SIZE_HISTORY_LIST, 0);
    _oSecondsAdded = new Analysis("stats-secondsAdded", SIZE_HISTORY_LIST, 1);
    _oBitrateSegment = new Analysis(
      "stats-segmentbitrate",
      SIZE_HISTORY_LOAD,
      1,
    );
    _oBitrateChannel = new Analysis(
      "stats-channelbitrate",
      SIZE_HISTORY_LOAD,
      1,
    );
    _oWaitResponse = new Analysis("stats-waitResponse", SIZE_HISTORY_LOAD, 1);
    _oNotWatched = new Analysis("stats-unwatched", SIZE_HISTORY_BUFFER, 1);
    _nTimeLastUpdate = NaN;
    byId("stats-adcount").textContent = _countCountAd;
    byId("stats-adrate").textContent = getRateAd();
    byId("stats-source").textContent = _countSourceSegments;
    UpdateValue(
      "stats-rejected",
      _countRejectedSegments,
      _countRejectedSegments !== 0,
    );
    UpdateValue("stats-errorsLoad", _countErrorsLoad, _countErrorsLoad !== 0);
    UpdateValue(
      "stats-skippedSegments",
      _countSkippedSegments,
      _countSkippedSegments !== 0,
    );
    byId("stats-unloadedSegments").textContent = _countUnloadedSegments;
    UpdateValue(
      "stats-lossesVideo",
      _countLossesVideo,
      _countLossesVideo !== 0,
    );
    UpdateValue(
      "stats-lossesAudio",
      _countLossesAudio,
      _countLossesAudio !== 0,
    );
    UpdateValue(
      "stats-exhausted",
      _countExhaustionsBuffer,
      _countExhaustionsBuffer >= HIGHLIGHT_EXHAUSTION_BUFFER,
    );
    UpdateValue(
      "stats-overflowed",
      _countOverflowsBuffer,
      _countOverflowsBuffer !== 0,
    ).nextElementSibling.nextElementSibling.textContent =
      _nSkippedInBuffer.toFixed(1);
    _nTimer = setInterval(
      AddHandlerExceptions(UpdateStats),
      1e3 / RATE_UPDATE_STATS,
    );
    UpdateStats();
    m_Event.AddHandler("draghandle-drag-stats", HandleDragWindow);
    ShowElement("stats", true);
    m_Settings.Change("isShowStats", true);
  }
  function CloseWindow() {
    if (!WindowOpen()) {
      return;
    }
    ShowElement("stats", false);
    _oIntervalUpdate.Free();
    _oIntervalUpdate = null;
    _oSegmentsAdded.Free();
    _oSegmentsAdded = null;
    _oSecondsAdded.Free();
    _oSecondsAdded = null;
    _oBitrateSegment.Free();
    _oBitrateSegment = null;
    _oBitrateChannel.Free();
    _oBitrateChannel = null;
    _oWaitResponse.Free();
    _oWaitResponse = null;
    _oNotWatched.Free();
    _oNotWatched = null;
    for (let node of document.querySelectorAll("[data-clear]")) {
      node.textContent = "";
    }
    clearInterval(_nTimer);
    _nTimer = 0;
    m_Settings.Change("isShowStats", false);
  }
  function HandleDragWindow(oParameters) {
    switch (oParameters.nStep) {
      case 1:
        const oStyle = getComputedStyle(oParameters.nodeDragged);
        oParameters._nInitialX = Number.parseInt(oStyle.left, 10);
        oParameters._nInitialY = Number.parseInt(oStyle.top, 10);
        break;

      case 2:
        oParameters.nodeDragged.style.setProperty(
          "--x",
          `${oParameters._nInitialX + oParameters.nChangeX}px`,
        );
        oParameters.nodeDragged.style.setProperty(
          "--y",
          `${oParameters._nInitialY + oParameters.nChangeY}px`,
        );
        break;

      case 3:
        break;

      default:
        Assert(false);
    }
  }
  function Start() {
    if (m_Settings.Get("isShowStats")) {
      OpenWindow();
    }
  }
  function ClearHistory() {
    if (_oIntervalUpdate !== null) {
      _oIntervalUpdate.Clear();
      _oSegmentsAdded.Clear();
      _oSecondsAdded.Clear();
      _oBitrateSegment.Clear();
      _oBitrateChannel.Clear();
      _oWaitResponse.Clear();
      _oNotWatched.Clear();
      _nTimeLastUpdate = NaN;
    }
    UpdateValue("stats-errorsLoad", (_countErrorsLoad = 0), false);
    UpdateValue("stats-skippedSegments", (_countSkippedSegments = 0), false);
    byId("stats-unloadedSegments").textContent = _countUnloadedSegments = 0;
    UpdateValue("stats-exhausted", (_countExhaustionsBuffer = 0), false);
    UpdateValue(
      "stats-overflowed",
      (_countOverflowsBuffer = 0),
      false,
    ).nextElementSibling.nextElementSibling.textContent =
      (_nSkippedInBuffer = 0).toFixed(1);
  }
  function GetTargetDuration() {
    return _nTargetDuration;
  }
  function GetDurationFrameInSeconds() {
    return {
      nMinimum3: Math.max(17, _nMinDurationVideosample) / 1e3,
      nMaximum3: Math.min(1e3 / 25, _nMaxDurationVideosample) / 1e3,
    };
  }
  function GetDataForReport() {
    return {
      ParametersVideo:
        byId("stats-videoresolution").textContent +
        " " +
        byId("stats-videocompression").textContent,
      ParametersAudio: byId("stats-audiocompression").textContent,
      RejectedSegments: _countRejectedSegments,
      SkippedSegments: _countSkippedSegments,
      ErrorsLoad: _countErrorsLoad,
      UnloadedSegments: _countUnloadedSegments,
      LossesVideo: _countLossesVideo,
      LossesAudio: _countLossesAudio,
      ExhaustionsBuffer: _countExhaustionsBuffer,
      ExhaustionsBufferEarly: _countExhaustionsBufferEarly,
      OverflowsBuffer: _countOverflowsBuffer,
      SkippedInBuffer: _nSkippedInBuffer,
      Ad: `${_countCountAd} ${getRateAd()}`,
    };
  }
  function ParsedListSegments(oList) {
    _nTargetDuration = oList.nTargetDuration;
    if (WindowOpen()) {
      if (oList.objsSegments.length !== 0) {
        byId("stats-server").textContent = new URL(
          oList.objsSegments[oList.objsSegments.length - 1].sAddress,
        ).host;
      }
      const nDurationList = oList.objsSegments.reduce(
        (nSum, { nDuration }) => nSum + nDuration,
        0,
      );
      byId("stats-list").textContent =
        `${oList.objsSegments.length} × ${(nDurationList / oList.objsSegments.length).toFixed(1)} = ${nDurationList.toFixed(1)} − ${oList.countAdSegments}`;
      byId("stats-targetduration").textContent = oList.nTargetDuration;
    }
  }
  function AddedSegmentsInQueue(countSegmentsAdded, countSecondsAdded) {
    if (WindowOpen()) {
      const nTime = performance.now();
      _oIntervalUpdate.AddNumber((nTime - _nTimeLastUpdate) / 1e3);
      _nTimeLastUpdate = nTime;
      _oSegmentsAdded.AddNumber(
        countSegmentsAdded,
        HighlightSegmentsAdded,
        HighlightSegmentsAdded,
      );
      _oSecondsAdded.AddNumber(countSecondsAdded);
    }
  }
  function ReceivedSourceSegment() {
    ++_countSourceSegments;
    if (WindowOpen()) {
      document.getElementById("stats-source").textContent =
        _countSourceSegments;
    }
  }
  function RejectedSegment() {
    ++_countRejectedSegments;
    if (WindowOpen()) {
      UpdateValue("stats-rejected", _countRejectedSegments, true);
    }
  }
  function DownloadedSomething(kbDownloaded) {
    if (Number.isFinite(kbDownloaded)) {
      _kbTotalDownloaded += kbDownloaded;
      if (WindowOpen()) {
        document.getElementById("stats-downloaded").textContent = (
          _kbTotalDownloaded /
          1024 /
          1024
        ).toFixed();
      }
    }
  }
  function LoadedSegment(
    nSizeSegment,
    nDurationSegment,
    nDurationLoad,
    nWaitResponse,
  ) {
    if (WindowOpen()) {
      const nAverageBitrateSegment = _oBitrateSegment.AddNumber(
        (nSizeSegment * 8) / 1e6 / nDurationSegment,
      );
      nDurationLoad /= 1e3;
      _oBitrateChannel.AddNumber(
        (nSizeSegment * 8) / 1e6 / nDurationLoad,
        nDurationLoad > nDurationSegment,
        (nNumber2) => nNumber2 < nAverageBitrateSegment,
      );
      _oWaitResponse.AddNumber(
        nWaitResponse / 1e3,
        HighlightWaitResponse,
        HighlightWaitResponse,
      );
    }
  }
  function NotLoadedSegments(countUnloadedSegments) {
    Assert(countUnloadedSegments > 0);
    _countErrorsLoad++;
    _countUnloadedSegments += countUnloadedSegments;
    if (WindowOpen()) {
      UpdateValue("stats-errorsLoad", _countErrorsLoad, true);
      byId("stats-unloadedSegments").textContent = _countUnloadedSegments;
    }
  }
  function skippedSegments2(countSkippedSegments) {
    Assert(countSkippedSegments > 0);
    _countSkippedSegments++;
    _countUnloadedSegments += countSkippedSegments;
    if (WindowOpen()) {
      UpdateValue("stats-skippedSegments", _countSkippedSegments, true);
      byId("stats-unloadedSegments").textContent = _countUnloadedSegments;
    }
  }
  function ReceivedConvertedSegment(oSegment) {
    const isWindowOpen = WindowOpen();
    const oData = oSegment.pData;
    if (oData.hasOwnProperty("mbMediasegment")) {
      if (oSegment.isDiscontinuity) {
        if (oData.isExistsVideo) {
          let sCompressionVideo =
            "H.264" +
            ` ${GetTitleProfileH264(oData.nProfileIndication, oData.nConstraintSetFlag)}` +
            ` L${(oData.nLevelIndication / 10).toFixed(1)}` +
            ` RF${oData.nMaxNumberReferenceFrames}`;
          if (oData.nRange !== -1) {
            sCompressionVideo += oData.nRange === 0 ? " 16-235" : " 0-255";
          }
          if (oData.isInterlaced) {
            sCompressionVideo += " interlaced";
          }
          if (oData.nRateFrames !== 0) {
            sCompressionVideo += ` ${oData.nRateFrames < 0 ? "≈" : ""}${Math.abs(oData.nRateFrames).toFixed(2)} ${Text("J0140")}`;
          }
          byId("stats-videocompression").textContent = sCompressionVideo;
          byId("stats-videoresolution").textContent =
            `${oData.nWidthPicture}x${oData.nHeightPicture}`;
        } else {
          byId("stats-videocompression").textContent = "—";
          byId("stats-videoresolution").textContent = "—";
        }
        byId("stats-framerate").textContent = "";
        if (oData.isExistsAudio) {
          byId("stats-audiocompression").textContent =
            ["AAC-Main", "AAC-LC", "AAC-SSR", "AAC-LTP"][
              oData.nAudioObjectType - 1
            ] +
            ` ${oData.nRateSamplerate} ${Text("J0141")}` +
            ` ${oData.nCountChannels} ${Text("J0142")}`;
        } else {
          byId("stats-audiocompression").textContent = "—";
        }
        byId("stats-audiobitrate").textContent = "";
      }
      if (Number.isFinite(oData.nAverageDurationVideoSample)) {
        _nMinDurationVideosample = oData.nMinDurationVideoSample;
        _nMaxDurationVideosample = oData.nMaxDurationVideoSample;
        Assert(_nMinDurationVideosample <= _nMaxDurationVideosample);
        const nRelativeDeviation =
          oData.nAverageDurationVideoSample / oData.nMaxDurationVideoSample;
        const nAbsoluteDeviation =
          oData.nMaxDurationVideoSample - oData.nAverageDurationVideoSample;
        if (
          nRelativeDeviation <= HIGHLIGHT_LOSS_VIDEO_REL &&
          nAbsoluteDeviation >= HIGHLIGHT_LOSS_VIDEO_ABS
        ) {
          m_Log.Oops(
            `[Stats] Exceeded deviation duration frame in segment2 ${oSegment.nNumber}` +
              ` AverageDurationFrame=${m_Log.F0(oData.nAverageDurationVideoSample)}strs` +
              ` AbsoluteDeviation=${m_Log.F0(nAbsoluteDeviation)}strs` +
              ` RelativeDeviation=${m_Log.F2(nRelativeDeviation)}`,
          );
          oData.isLossVideo = true;
        }
        if (isWindowOpen) {
          let sDeviation = `@${(1e3 / oData.nAverageDurationVideoSample).toFixed(1)}`;
          if (
            oData.nMaxDurationVideoSample - oData.nMinDurationVideoSample >
            2
          ) {
            sDeviation +=
              ` −${(100 - (oData.nAverageDurationVideoSample / oData.nMaxDurationVideoSample) * 100).toFixed()}%` +
              ` +${((oData.nAverageDurationVideoSample / oData.nMinDurationVideoSample) * 100 - 100).toFixed()}%`;
          }
          UpdateValue(
            "stats-framerate",
            sDeviation,
            nRelativeDeviation <= HIGHLIGHT_RATE_FRAMES,
          );
        }
      }
      if (Number.isFinite(oData.nBitrateAudio) && isWindowOpen) {
        byId("stats-audiobitrate").textContent =
          `${oData.nBitrateAudio.toFixed()} ${Text("J0143")}`;
      }
    }
    if (ThisNumber(oData.nConvertedFor) && isWindowOpen) {
      byId("stats-convertedFor").textContent = oData.nConvertedFor.toFixed();
    }
    if (oData.isRejected) {
      RejectedSegment();
    }
    if (oData.isLossVideo) {
      ++_countLossesVideo;
      if (isWindowOpen) {
        UpdateValue("stats-lossesVideo", _countLossesVideo, true);
      }
    }
    if (oData.isLossAudio) {
      ++_countLossesAudio;
      if (isWindowOpen) {
        UpdateValue("stats-lossesAudio", _countLossesAudio, true);
      }
    }
  }
  function updateFillBuffer(nNotWatched) {
    if (WindowOpen()) {
      _oNotWatched.AddNumber(
        nNotWatched,
        HighlightNotWatched,
        HighlightNotWatched,
      );
    }
  }
  function ExhaustedBufferPlayer(isEarly) {
    ++_countExhaustionsBuffer;
    if (isEarly) {
      ++_countExhaustionsBufferEarly;
    }
    if (WindowOpen()) {
      UpdateValue(
        "stats-exhausted",
        _countExhaustionsBuffer,
        _countExhaustionsBuffer >= HIGHLIGHT_EXHAUSTION_BUFFER,
      );
    }
  }
  function getRateAd() {
    let sResult = "";
    for (let idx = 0; idx < _numsStartAd.length; ++idx) {
      if (idx !== 0) {
        sResult += ` <${((_numsStartAd[idx] - _numsEndAd[idx - 1]) / 1e3).toFixed()}> `;
      }
      if (idx < _numsEndAd.length) {
        sResult += ((_numsEndAd[idx] - _numsStartAd[idx]) / 1e3).toFixed();
      } else {
        sResult += "?";
      }
    }
    return sResult;
  }
  m_Event.AddHandler("list-adstart", () => {
    Assert(_numsStartAd.length === _numsEndAd.length);
    _countCountAd++;
    _numsStartAd.push(performance.now());
    if (WindowOpen()) {
      byId("stats-adcount").textContent = _countCountAd;
      byId("stats-adrate").textContent = getRateAd();
    }
  });
  m_Event.AddHandler("list-adend", () => {
    if (_numsStartAd.length !== _numsEndAd.length) {
      if (_numsEndAd.length === SIZE_HISTORY_AD) {
        _numsStartAd.shift();
        _numsEndAd.shift();
      }
      _numsEndAd.push(performance.now());
      if (WindowOpen()) {
        byId("stats-adrate").textContent = getRateAd();
      }
    }
  });
  m_Event.AddHandler("player-bufferoverflowed", (nSkipped) => {
    ++_countOverflowsBuffer;
    _nSkippedInBuffer += nSkipped;
    if (WindowOpen()) {
      UpdateValue(
        "stats-overflowed",
        _countOverflowsBuffer,
        true,
      ).nextElementSibling.nextElementSibling.textContent =
        _nSkippedInBuffer.toFixed(1);
    }
  });
  m_Event.AddHandler("controls-statechanged", (nState) => {
    if (nState === STATE_START) {
      ClearHistory();
    }
  });
  m_Event.AddHandler("list-broadcastvariantchosen", ([objsVariants]) => {
    if (objsVariants) {
      ClearHistory();
    }
  });
  return {
    Start,
    WindowOpen,
    OpenWindow,
    CloseWindow,
    UpdateValue,
    ClearHistory,
    GetTargetDuration,
    GetDurationFrameInSeconds,
    GetDataForReport,
    ParsedListSegments,
    AddedSegmentsInQueue,
    ReceivedSourceSegment,
    RejectedSegment,
    DownloadedSomething,
    LoadedSegment,
    NotLoadedSegments,
    skippedSegments2,
    ReceivedConvertedSegment,
    updateFillBuffer,
    ExhaustedBufferPlayer,
  };
})();

const m_Window = (() => {
  function getOpen() {
    return document.body.getAttribute("data-window-open") || "";
  }
  function openWindow(sIdWindow) {
    const elWindow = byId(sIdWindow);
    Assert(elWindow.classList.contains("window"));
    elWindow.classList.add("windowopen", "animationWindow");
    document.body.setAttribute("data-window-open", sIdWindow);
    m_Event.DispatchEvent(`window-open-${sIdWindow}`);
  }
  function closeWindow(sIdWindow, isWithAnimation = true) {
    const elWindow = byId(sIdWindow);
    Assert(elWindow.classList.contains("window"));
    elWindow.classList.remove("windowopen");
    elWindow.classList.toggle("animationWindow", isWithAnimation);
    document.body.removeAttribute("data-window-open");
  }
  function open2(sIdWindow) {
    Assert(ThisNonemptyString(sIdWindow));
    const sIdOpenWindow = getOpen();
    if (sIdWindow === sIdOpenWindow) {
      return false;
    }
    if (sIdOpenWindow) {
      closeWindow(sIdOpenWindow);
    }
    openWindow(sIdWindow);
    return true;
  }
  function close(isWithAnimation = true) {
    const sIdOpenWindow = getOpen();
    if (sIdOpenWindow) {
      closeWindow(sIdOpenWindow, isWithAnimation);
    }
  }
  function toggle(sIdWindow) {
    open2(sIdWindow) || closeWindow(sIdWindow);
  }
  function configureIndicatorScroll(pScroll) {
    const elScroll = byId(pScroll);
    elScroll.scrollTop = 0;
    updateIndicatorScroll(elScroll);
  }
  function updateIndicatorScroll(elScroll) {
    const isShow = !thisElementFullyScrolled(elScroll);
    ShowElement(byId(`scrollindicator-${elScroll.id}`), isShow);
    elScroll[isShow ? "addEventListener" : "removeEventListener"](
      "scroll",
      handleScroll,
    );
  }
  const handleScroll = AddHandlerExceptions((oEvent) => {
    updateIndicatorScroll(oEvent.target);
  });
  m_Event.AddHandler("controls-leftclick", ({ target: elClick }) => {
    const sIdWindow = elClick.getAttribute("data-window-toggle");
    if (sIdWindow) {
      toggle(sIdWindow);
      return;
    }
    const sIdOpenWindow = getOpen();
    if (
      sIdOpenWindow &&
      !byId(sIdOpenWindow).contains(elClick) &&
      byId("player").contains(elClick)
    ) {
      closeWindow(sIdOpenWindow);
    }
  });
  return {
    open2,
    close,
    toggle,
    configureIndicatorScroll,
  };
})();

const m_Menu = (() => {
  function setAvailabilityItem(pItem, isAvailable) {
    byId(pItem).tabIndex = isAvailable ? 0 : -1;
  }
  byId("eye").addEventListener("contextmenu", (oEvent) => {
    oEvent.preventDefault();
    m_Window.toggle("mainmenu");
  });
  m_Event.AddHandler("controls-leftclick", (oEvent) => {
    if (oEvent.target.classList.contains("menu-item")) {
      m_Window.close(false);
    }
  });
  return {
    setAvailabilityItem,
  };
})();

const m_FullscreenMode = (() => {
  let _sRequestFullscreen = "requestFullscreen";
  let _sExitFullscreen = "exitFullscreen";
  let _sFullscreenElement = "fullscreenElement";
  let _sFullscreenchange = "fullscreenchange";
  if (!document.exitFullscreen) {
    _sRequestFullscreen = "webkitRequestFullscreen";
    _sExitFullscreen = "webkitExitFullscreen";
    _sFullscreenElement = "webkitFullscreenElement";
    _sFullscreenchange = "webkitfullscreenchange";
  }
  const HandleChangeMode = AddHandlerExceptions(() => {
    m_Event.DispatchEvent("fullscreenMode-changed", Update());
  });
  const HandleDoubleClick = AddHandlerExceptions((oEvent) => {
    if (oEvent.button === LEFT_BUTTON) {
      oEvent.preventDefault();
      Toggle();
    }
  });
  function GetElement() {
    return byId("playerandchat");
  }
  function Enabled() {
    return !!document[_sFullscreenElement];
  }
  function Update() {
    const isEnabled = Enabled();
    m_Log.Ok(`[FullscreenMode] Mode enabled: ${isEnabled}`);
    ChangeButton("togglefullscreen", isEnabled);
    return isEnabled;
  }
  function Enable() {
    if (Enabled()) {
      return false;
    }
    m_Log.Here("[FullscreenMode] Enabling mode");
    m_Autohide.Hide(false);
    m_PictureInPicture.disable();
    GetElement()[_sRequestFullscreen]();
    return true;
  }
  function Disable() {
    if (!Enabled()) {
      return false;
    }
    m_Log.Here("[FullscreenMode] Disabling mode");
    m_Autohide.Hide(false);
    document[_sExitFullscreen]();
    return true;
  }
  function Toggle() {
    Enable() || Disable();
  }
  document.addEventListener(_sFullscreenchange, HandleChangeMode);
  byId("eye").addEventListener("dblclick", HandleDoubleClick);
  Update();
  return {
    Enabled,
    Disable,
    Toggle,
    GetElement,
  };
})();

const m_PictureInPicture = (() => {
  let _oMediaElement = null;
  const handleChangeMode = AddHandlerExceptions(() => {
    update();
  });
  function enabled() {
    return Boolean(document.pictureInPictureElement);
  }
  function update() {
    const isEnabled = enabled();
    m_Log.Ok(`[PictureInPicture] Mode enabled: ${isEnabled}`);
    ChangeButton("togglepip", isEnabled);
  }
  function enable() {
    if (enabled()) {
      return false;
    }
    m_Log.Here("[PictureInPicture] Enabling mode");
    m_FullscreenMode.Disable();
    _oMediaElement.requestPictureInPicture();
    return true;
  }
  function disable() {
    if (!enabled()) {
      return false;
    }
    m_Log.Here("[PictureInPicture] Disabling mode");
    document.exitPictureInPicture();
    return true;
  }
  function toggle() {
    _oMediaElement &&
      !document.body.classList.contains("novideo") &&
      (enable() || disable());
  }
  function start2(oMediaElement) {
    if (
      !document.pictureInPictureEnabled ||
      oMediaElement.disablePictureInPicture
    ) {
      m_Log.Oops(
        `[PictureInPicture] pictureInPictureEnabled=${document.pictureInPictureEnabled} disablePictureInPicture=${oMediaElement.disablePictureInPicture}`,
      );
      return;
    }
    _oMediaElement = oMediaElement;
    oMediaElement.addEventListener("enterpictureinpicture", handleChangeMode);
    oMediaElement.addEventListener("leavepictureinpicture", handleChangeMode);
    update();
    ShowElement("togglepip", true);
  }
  return {
    start2,
    disable,
    toggle,
  };
})();

const m_Draghandle = (() => {
  const MIN_INTERVAL_DRAG = 45;
  let _nIdPointer = NaN;
  let _oParameters = null;
  let _nTimeLastDrag;
  let _nInitialX, _nInitialY;
  let _nLastX, _nLastY;
  function Parameters(nodePressed, nodeDragged) {
    this.nodePressed = nodePressed;
    this.nodeDragged = nodeDragged;
    this.nStep = 1;
    this.isCancel = false;
    this.isChangedX = false;
    this.isChangedY = false;
    this.nChangeX = 0;
    this.nChangeY = 0;
  }
  const HandlePointerDown = createHandlerEventsElement((oEvent) => {
    if (!Number.isNaN(_nIdPointer) || oEvent.button !== LEFT_BUTTON) {
      return;
    }
    const nodePressed = oEvent.target.closest("[data-draghandle]");
    if (nodePressed === null) {
      return;
    }
    _nIdPointer = oEvent.pointerId;
    _oParameters = new Parameters(
      nodePressed,
      byId(nodePressed.getAttribute("data-draghandle")),
    );
    _nTimeLastDrag = 0;
    _nInitialX = _nLastX = oEvent.clientX;
    _nInitialY = _nLastY = oEvent.clientY;
    m_Log.Ok(
      `[Draghandle] Starting drag2 ${_oParameters.nodeDragged.id} X=${_nInitialX} Y=${_nInitialY} id=${_nIdPointer} type=${oEvent.pointerType} primary=${oEvent.isPrimary}`,
    );
    document.addEventListener(
      "pointermove",
      HandlePointerMove,
      PASSIVE_HANDLER,
    );
    document.addEventListener(
      "pointerup",
      HandlePointerUpAndPointerCancel,
      PASSIVE_HANDLER,
    );
    document.addEventListener("pointercancel", HandlePointerUpAndPointerCancel);
    m_Event.AddHandler("focus-statechanged", HandleLeaveTab);
    m_FullscreenMode
      .GetElement()
      .style.setProperty(
        "cursor",
        getComputedStyle(nodePressed).cursor,
        "important",
      );
    m_FullscreenMode.GetElement().classList.add("draghandle-capture");
    _oParameters.nodeDragged.classList.add("draghandle");
    m_Event.DispatchEvent(
      `draghandle-drag-${_oParameters.nodeDragged.id}`,
      _oParameters,
    );
  });
  const HandlePointerMove = AddHandlerExceptions((oEvent) => {
    if (_nIdPointer === oEvent.pointerId) {
      if ((oEvent.buttons & PRESSED_LEFT_BUTTON) == 0) {
        FinishDrag("button2 released");
      } else {
        const nTime = performance.now();
        if (nTime - _nTimeLastDrag >= MIN_INTERVAL_DRAG) {
          _nTimeLastDrag = nTime;
          _oParameters.isChangedX = _nLastX !== oEvent.clientX;
          _oParameters.isChangedY = _nLastY !== oEvent.clientY;
          if (_oParameters.isChangedX || _oParameters.isChangedY) {
            _nLastX = oEvent.clientX;
            _nLastY = oEvent.clientY;
            _oParameters.nStep = 2;
            _oParameters.nChangeX = _nLastX - _nInitialX;
            _oParameters.nChangeY = _nLastY - _nInitialY;
            m_Event.DispatchEvent(
              `draghandle-drag-${_oParameters.nodeDragged.id}`,
              _oParameters,
            );
          }
        }
      }
    }
  });
  const HandlePointerUpAndPointerCancel = AddHandlerExceptions((oEvent) => {
    if (_nIdPointer === oEvent.pointerId) {
      FinishDrag(oEvent.type);
    }
  });
  function HandleLeaveTab({ isActive }) {
    if (!isActive) {
      FinishDrag("tab2 inactive");
    }
  }
  function CancelDrag(sIdNode) {
    Assert(sIdNode === void 0 || ThisNonemptyString(sIdNode));
    if (
      !Number.isNaN(_nIdPointer) &&
      (sIdNode === void 0 || sIdNode === _oParameters.nodeDragged.id)
    ) {
      _oParameters.isCancel = true;
      FinishDrag("operation cancelled");
    }
  }
  function FinishDrag(sReason) {
    if (_oParameters.nStep !== 3) {
      m_Log.Ok(
        `[Draghandle] Finishing2 drag: ${sReason} X=${_nLastX} Y=${_nLastY}`,
      );
      _oParameters.nStep = 3;
      m_Event.DispatchEvent(
        `draghandle-drag-${_oParameters.nodeDragged.id}`,
        _oParameters,
      );
      m_FullscreenMode.GetElement().style.removeProperty("cursor");
      m_FullscreenMode.GetElement().classList.remove("draghandle-capture");
      _oParameters.nodeDragged.classList.remove("draghandle");
      document.removeEventListener(
        "pointermove",
        HandlePointerMove,
        PASSIVE_HANDLER,
      );
      document.removeEventListener(
        "pointerup",
        HandlePointerUpAndPointerCancel,
        PASSIVE_HANDLER,
      );
      document.removeEventListener(
        "pointercancel",
        HandlePointerUpAndPointerCancel,
      );
      m_Event.RemoveHandler("focus-statechanged", HandleLeaveTab);
      _nIdPointer = NaN;
      _oParameters = null;
    }
  }
  document.addEventListener("pointerdown", HandlePointerDown, PASSIVE_HANDLER);
  return {
    CancelDrag,
  };
})();

const m_Autohide = (() => {
  const MIN_INTERVAL_MOTION = 150;
  const THRESHOLD_MOTION = 3;
  const _nodeAutohide = document.getElementById("player");
  let _nTimer = 0;
  let _nHideAfter = 0;
  let _nNotShowUntil = 0;
  let _nScreenX = 0,
    _nScreenY = 0;
  let _nClientX = 0,
    _nClientY = 0;
  let _nIdTimerChoiceSpeed = 0;
  function Show() {
    if (_nTimer === 0) {
      document.body.classList.remove("autohide");
      document.body.classList.add("animationPanel");
      _nTimer = setTimeout(
        handleTimer,
        m_Settings.Get("nIntervalAutohide") * 1e3,
      );
      _nHideAfter = _nNotShowUntil = 0;
    } else {
      _nHideAfter =
        performance.now() + m_Settings.Get("nIntervalAutohide") * 1e3;
    }
  }
  function Hide(isWithAnimation = true) {
    if (_nTimer !== 0) {
      clearTimeout(_nTimer);
      _nTimer = 0;
      document.body.classList.add("autohide");
    }
    document.body.classList.toggle("animationPanel", isWithAnimation);
    if (!isWithAnimation) {
      document.body.clientTop;
      document.body.classList.add("animationPanel");
      _nNotShowUntil = performance.now() + 500;
    }
  }
  const handleTimer = AddHandlerExceptions(() => {
    Assert(_nTimer !== 0);
    const nHideVia = _nHideAfter - performance.now();
    if (nHideVia > 50) {
      _nTimer = setTimeout(handleTimer, nHideVia);
      _nHideAfter = 0;
    } else {
      Hide();
    }
  });
  const handleMotionPointer = AddHandlerExceptions(
    ({ screenX, screenY, clientX, clientY }) => {
      _nodeAutohide.removeEventListener(
        "pointermove",
        handleMotionPointer,
        PASSIVE_HANDLER,
      );
      setTimeout(captureMotionPointer, MIN_INTERVAL_MOTION);
      if (
        (_nScreenX !== screenX || _nScreenY !== screenY) &&
        (_nClientX !== clientX || _nClientY !== clientY) &&
        (Math.abs(_nClientX - clientX) >= THRESHOLD_MOTION ||
          Math.abs(_nClientY - clientY) >= THRESHOLD_MOTION) &&
        performance.now() >= _nNotShowUntil
      ) {
        Show();
      }
      _nScreenX = screenX;
      _nScreenY = screenY;
      _nClientX = clientX;
      _nClientY = clientY;
    },
  );
  const captureMotionPointer = AddHandlerExceptions(() => {
    _nodeAutohide.addEventListener(
      "pointermove",
      handleMotionPointer,
      PASSIVE_HANDLER,
    );
  });
  const handleClick = AddHandlerExceptions(() => {
    Show();
  });
  const handleLeavePointer = AddHandlerExceptions(() => {
    Hide();
  });
  const handleChoiceSpeed = AddHandlerExceptions((oEvent) => {
    if (oEvent.button === LEFT_BUTTON) {
      if (_nIdTimerChoiceSpeed !== 0) {
        clearTimeout(_nIdTimerChoiceSpeed);
      }
      _nIdTimerChoiceSpeed = setTimeout(
        () => document.body.classList.remove("speedchoice"),
        5e3,
      );
      document.body.classList.add("speedchoice");
    }
  });
  function Start() {
    captureMotionPointer();
    _nodeAutohide.addEventListener("click", handleClick);
    _nodeAutohide.addEventListener("mouseleave", handleLeavePointer);
    byId("speed").addEventListener("pointerdown", handleChoiceSpeed);
  }
  return {
    Start,
    Show,
    Hide,
  };
})();

const m_MediaRequest = (() => {
  let _nTimer = -2;
  const update = AddHandlerExceptions(() => {
    Assert(_nTimer !== 0);
    _nTimer = 0;
    const elPlayer = byId("player");
    const nHeightPlayer =
      (elPlayer.clientHeight * 100) / m_Settings.Get("nSizeUi");
    Assert(nHeightPlayer > 0);
    elPlayer.classList.toggle("compressmainmenu", nHeightPlayer <= 460);
    elPlayer.classList.toggle("compresssettings", nHeightPlayer <= 412);
    const SIZE_FONT_MIN = 100;
    const SIZE_FONT_MAX = 124;
    const SIZE_FONT_STEP = 8;
    const oStylePanel = byId("toppanel").style;
    const elSpacer = byId("spacer");
    for (let nSizeFont = SIZE_FONT_MAX; ; nSizeFont -= SIZE_FONT_STEP) {
      oStylePanel.fontSize = `${nSizeFont}%`;
      if (nSizeFont === SIZE_FONT_MIN || elSpacer.clientWidth > 0) {
        break;
      }
    }
  });
  function updateFast() {
    if (_nTimer !== -1) {
      if (_nTimer > 0) {
        clearTimeout(_nTimer);
      }
      _nTimer = -1;
      requestAnimationFrame(update);
    }
  }
  function updateSlow() {
    if (_nTimer === -2 || _nTimer === 0) {
      _nTimer = setTimeout(update, 200);
      Assert(_nTimer > 0);
    }
  }
  window.addEventListener(
    "resize",
    AddHandlerExceptions(() => {
      if (_nTimer !== -2) {
        updateSlow();
      }
    }),
  );
  return {
    updateFast,
    updateSlow,
  };
})();

const m_Theme = (() => {
  const SELECTOR_BUTTON_COLOR = 'input[type="color"]';
  let _oOpacity = null;
  const HandleInputColor = AddHandlerExceptions((oEvent) => {
    if (oEvent.target.matches(SELECTOR_BUTTON_COLOR)) {
      UpdateStyles();
    }
  });
  const HandleChangeColor = AddHandlerExceptions((oEvent) => {
    if (oEvent.target.matches(SELECTOR_BUTTON_COLOR)) {
      m_Settings.Change(oEvent.target.id, oEvent.target.value);
    }
  });
  function HandleChangePresetTheme() {
    UpdateWindowSettings();
    UpdateStyles();
  }
  function UpdateWindowSettings() {
    for (let nodeButton of document.querySelectorAll(SELECTOR_BUTTON_COLOR)) {
      nodeButton.value = m_Settings.Get(nodeButton.id);
    }
    _oOpacity.Update();
  }
  function UpdateStyles() {
    const oStyle = document.documentElement.style;
    let nBrightnessBackground = 0;
    for (let nodeButton of document.querySelectorAll(SELECTOR_BUTTON_COLOR)) {
      const nR = Number.parseInt(nodeButton.value.slice(1, 3), 16);
      const nG = Number.parseInt(nodeButton.value.slice(3, 5), 16);
      const nB = Number.parseInt(nodeButton.value.slice(5, 7), 16);
      oStyle.setProperty(`--${nodeButton.id}`, `${nR},${nG},${nB}`);
      if (nodeButton.id === "sColorBackground") {
        nBrightnessBackground = (nR * 299 + nG * 587 + nB * 114) / 1e3 / 255;
      }
    }
    document.documentElement.classList.toggle(
      "lighttheme",
      nBrightnessBackground > 0.55,
    );
    const nOpacity = Round(1 - m_Settings.Get("nOpacity2") / 100, 2);
    oStyle.setProperty("--nOpacity", nOpacity);
    oStyle.setProperty("--nOpacityWindow", Clamp(nOpacity, 0.85, 1));
  }
  function ApplySizeUi() {
    document.documentElement.style.fontSize = `${(16 * m_Settings.Get("nSizeUi")) / 100}px`;
    m_MediaRequest.updateSlow();
  }
  function Start() {
    m_i18n.TranslateDocument(document);
    _oOpacity = new InputNumber("nOpacity2", 5, 0, "opacity");
    _oOpacity.AfterChange = UpdateStyles;
    document.addEventListener("input", HandleInputColor);
    document.addEventListener("change", HandleChangeColor);
    m_Event.AddHandler("settings-presetchanged-theme", HandleChangePresetTheme);
    HandleChangePresetTheme();
    new InputNumber("nSizeUi", 1, 0, "uisize").AfterChange = ApplySizeUi;
    ApplySizeUi();
    ShowElement(document.body, true);
  }
  return {
    Start,
  };
})();

const m_Notice = (() => {
  const SHOW_NOTICE = 2e3;
  let _nTimer = 0;
  function Show(sIdIcon, isFail) {
    Assert(document.getElementById(sIdIcon) && typeof isFail == "boolean");
    const nodeNotice = byId("notice");
    nodeNotice.classList.toggle("fail", isFail);
    ShowElement(nodeNotice, true);
    nodeNotice.firstElementChild.setAttributeNS(
      "http://www.w3.org/1999/xlink",
      "href",
      `#${sIdIcon}`,
    );
    if (_nTimer !== 0) {
      clearTimeout(_nTimer);
    }
    _nTimer = setTimeout(HideNotice, SHOW_NOTICE);
  }
  function ShowHappiness() {
    Show("svg-success", false);
  }
  function ShowFail() {
    Show("svg-fail", true);
  }
  const HideNotice = AddHandlerExceptions(() => {
    ShowElement("notice", false);
    _nTimer = 0;
  });
  return {
    Show,
    ShowHappiness,
    ShowFail,
  };
})();

const m_Scale = (() => {
  let _nStart = 0;
  let _nEnd = 0;
  let _nWatched;
  function ClampTime(nTime) {
    return Clamp(nTime, _nStart, _nEnd);
  }
  function Update() {
    Assert(
      Number.isFinite(_nStart) &&
        Number.isFinite(_nEnd) &&
        Number.isFinite(_nWatched),
    );
    byId("scale-watched").style.transform =
      `scaleX(${((_nWatched - _nStart) / (_nEnd - _nStart)).toFixed(4)})`;
  }
  const HandleClick = AddHandlerExceptions((oEvent) => {
    if (m_Controls.GetState() !== STATE_REPLAY) {
      return;
    }
    const oBorder = oEvent.currentTarget.getBoundingClientRect();
    const oStyle = getComputedStyle(oEvent.currentTarget);
    const nStartScale = Math.round(
      oBorder.left + Number.parseFloat(oStyle.paddingLeft),
    );
    const nEndScale = Math.round(
      oBorder.right - Number.parseFloat(oStyle.paddingRight),
    );
    const nPointer = oEvent.clientX + 1;
    const nSeekUntil = ClampTime(
      ((nPointer - nStartScale) / (nEndScale - nStartScale)) *
        (_nEnd - _nStart) +
        _nStart,
    );
    m_Log.Ok(`[Scale] Seeking until ${nSeekUntil}`);
    m_Player.SeekReplayUntil(nSeekUntil);
  });
  function SetStartAndEnd(nStart, nEnd) {
    Assert(nStart <= nEnd);
    _nStart = nStart;
    _nEnd = nEnd;
    document.getElementById("scale").addEventListener("click", HandleClick);
  }
  function SetWatched(nWatched) {
    _nWatched = ClampTime(nWatched);
    Update();
  }
  function GetStart() {
    return _nStart;
  }
  function GetEnd() {
    return _nEnd;
  }
  return {
    SetStartAndEnd,
    SetWatched,
    GetStart,
    GetEnd,
  };
})();

const m_News = (() => {
  const SHOW_ONE_TIMES = "2000.1.1";
  const SHOW_ALWAYS = "2000.2.2";
  const FULL_HELP = "2000.3.3";
  const FOR_TABLET = "2000.4.4";
  const _mNews = [
    ["2025.5.28", "J1010", "F1078"],
    ["2024.6.14", "J1010", "F1077"],
    ["2024.6.5", "J1010", "F1076"],
    ["2024.6.5", "J1010", "F1074"],
    ["2024.5.31", "F1072", "F1073"],
    ["2022.1.20", "J1513", "F1515"],
    ["2021.12.17", "J1066", "F1070", "F1514"],
    ["2021.12.17", "J1010", "F1069"],
    ["2021.3.7", "J1010", "F1068"],
    ["2020.10.30", "J1066", "F1067"],
    ["2020.10.5", "J1010", "F1065"],
    ["2019.10.9", "J1010", "F1064"],
    ["2019.3.17", "J1010", "F1063"],
    ["2018.10.28", "J1010", "F1062"],
    ["2018.8.17", "J1010", "F1060"],
    ["2018.7.30", "J1010", "F1059"],
    ["2018.6.27", "J1010", "F1058"],
    ["2018.6.12", "J1010", "F1057"],
    ["2018.5.18", "J1010", "F1049"],
    ["2018.4.24", "J1036", "F1048"],
    ["2018.4.6", "J1010", "F1047"],
    ["2018.3.17", "J1010", "F1046"],
    ["2018.3.4", "J1041", "F1042"],
    ["2018.2.17", "J1010", "F1044"],
    ["2018.1.7", "J1010", "F1043"],
    ["2017.11.6", "J1010", "F1037", "F1038"],
    ["2017.10.22", "J1010", "F1023"],
    ["2017.10.14", "J1010", "F1020"],
    ["2017.9.11", "J1010", "F1018"],
    ["2017.8.8", "J1035", "F1017"],
    ["2017.6.23", "J1010", "F1014"],
    ["2017.5.29", "J1010", "F1013"],
    ["2017.3.31", "J1031", "F1012"],
    ["2017.2.26", "J1030", "F1011"],
    [
      FULL_HELP,
      "J1500",
      "F1501",
      "F1503",
      "F1502",
      "F1575",
      "F1509",
      "F1573",
      "F1574",
      "F1504",
      "F1514",
      "F1507",
    ],
    [
      FULL_HELP,
      "J1513",
      "F1570",
      "F1571",
      "F1572",
      "F1515",
      "F1511",
      "F1506",
      "F1510",
    ],
    [SHOW_ONE_TIMES, "J1054", "F1501"],
    [FOR_TABLET, "J1055", "F1056"],
    [SHOW_ALWAYS, "J1003", "F1000"],
  ];
  function ConvertVersionInMilliseconds(sVersion) {
    const numsPart = /^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/.exec(sVersion);
    numsPart[1] |= 0;
    numsPart[2] |= 0;
    numsPart[3] |= 0;
    numsPart[4] |= 0;
    return Date.UTC(
      numsPart[1],
      numsPart[2] - 1,
      numsPart[3],
      0,
      0,
      0,
      numsPart[4],
    );
  }
  function ExistsNewsWithVersionOlder(sVersion) {
    const nVersion = ConvertVersionInMilliseconds(sVersion);
    return _mNews.some(
      (mNews) => ConvertVersionInMilliseconds(mNews[0]) > nVersion,
    );
  }
  function AddNews(nAddVersionOlder, sAddVersionHelp) {
    Assert(typeof nAddVersionOlder == "number" && nAddVersionOlder >= 0);
    Assert(sAddVersionHelp === "" || sAddVersionHelp.startsWith("2000"));
    Assert(Number.isFinite(nAddVersionOlder) || sAddVersionHelp !== "");
    const elAddIn = byId("newstext");
    elAddIn.textContent = "";
    for (let mNews of _mNews) {
      const sVersion = mNews[0];
      if (sVersion.startsWith("2000")) {
        if (
          sVersion === sAddVersionHelp ||
          (sVersion === FOR_TABLET && thisMobileDevice()) ||
          sVersion === SHOW_ALWAYS
        ) {
          AddNews2(elAddIn, mNews, 0);
        }
      } else {
        const nVersion = ConvertVersionInMilliseconds(sVersion);
        if (nVersion > nAddVersionOlder) {
          AddNews2(elAddIn, mNews, nVersion);
        }
      }
    }
    m_Window.configureIndicatorScroll(elAddIn);
  }
  function AddNews2(elAddIn, mNews, nDateNews) {
    if (elAddIn.firstElementChild) {
      elAddIn.appendChild(document.createElement("hr"));
    }
    const nodeHeader = document.createElement("h4");
    if (nDateNews === 0) {
      nodeHeader.textContent = Text(mNews[1]);
    } else {
      nodeHeader.textContent = `${m_i18n.FormatDate(nDateNews)} · ${Text(mNews[1])}`;
    }
    elAddIn.appendChild(nodeHeader);
    if (Text("M0010") !== "ru") {
      const elLink = nodeHeader.appendChild(document.createElement("a"));
      elLink.className = "news-convert";
      elLink.href = "translate:";
      elLink.target = "_blank";
      elLink.title = Text("J0148");
    }
    for (let idx = 2; idx < mNews.length; ++idx) {
      m_i18n.InsertAdjacentHtmlMessage(elAddIn, "beforeend", mNews[idx]);
    }
  }
  function OpenWindow(isConfirmReading) {
    if (isConfirmReading) {
      m_i18n.InsertAdjacentHtmlMessage("closenews", "content", "F0619").title =
        Text("A0620");
      ShowElement("defernews", true);
    } else {
      m_i18n.InsertAdjacentHtmlMessage("closenews", "content", "F0663").title =
        "";
      ShowElement("defernews", false);
    }
    m_Event.AddHandler("controls-leftclick", HandleLeftClick);
    m_Window.open2("news2");
  }
  function HandleLeftClick(oEvent) {
    if (oEvent.sCallsign === "closenews" && ElementShown("defernews")) {
      ShowElement("opennews", false);
      m_Settings.Change("sPreviousVersion", VERSION_EXTENSION);
    } else if (oEvent.target.href === "translate:") {
      let sText = "";
      for (
        let elText = oEvent.target.parentElement;
        elText && elText.nodeName !== "HR";
        elText = elText.nextElementSibling
      ) {
        sText += `${elText.textContent}\n\n`;
      }
      oEvent.target.href = `https://translate.google.com/?op=translate&sl=${Text("M0010")}&text=${encodeURIComponent(sText)}`;
    }
  }
  function OpenHelp() {
    AddNews(Infinity, FULL_HELP);
    OpenWindow(false);
  }
  function OpenNews() {
    const { pCurrent: sPreviousVersion, pInitial: sInitialVersion } =
      m_Settings.GetParametersSettings("sPreviousVersion");
    if (sPreviousVersion === sInitialVersion) {
      AddNews(Infinity, SHOW_ONE_TIMES);
      OpenWindow(false);
      ShowElement("opennews", false);
      m_Settings.Change("sPreviousVersion", VERSION_EXTENSION);
    } else if (sPreviousVersion !== VERSION_EXTENSION) {
      AddNews(ConvertVersionInMilliseconds(sPreviousVersion), "");
      OpenWindow(true);
      byId("opennews").classList.remove("unread");
    } else {
      AddNews(0, "");
      OpenWindow(false);
    }
  }
  function assertUpdateExtension() {
    const INTERVAL_CHECK_UPDATE = 1e3 * 60 * 60 * 24 * 5;
    const TAKES_INSTALL_UPDATE = 1e3 * 60 * 60 * 24 * 3;
    const nNow = Date.now();
    let nLastCheck = m_Settings.Get("nLastCheckUpdateExtension");
    if (Math.abs(nNow - Math.abs(nLastCheck)) < INTERVAL_CHECK_UPDATE) {
      return;
    }
    Wait(null, 900)
      .then(() => {
        return m_Loader.LoadJson(
          null,
          `https://coolcmd.github.io/tw5/version.json?${nNow}`,
          3e4,
          "update2 extension",
          false,
        );
      })
      .then((oResult) => {
        let isUpdateAvailable = false;
        try {
          const oChrome =
            oResult["оПоддерживаемаяВерсия"] &&
            oResult["оПоддерживаемаяВерсия"]["оХромой"];
          const sVersionExtension = oChrome && oChrome["сВерсияРасширения"];
          const nVersionBrowser = oChrome && oChrome["чВерсияБраузера"];
          Assert(
            ThisNonemptyString(sVersionExtension) &&
              Number.isSafeInteger(nVersionBrowser),
          );
          isUpdateAvailable =
            getVersionEngineBrowser() >= nVersionBrowser &&
            ConvertVersionInMilliseconds(VERSION_EXTENSION) <
              ConvertVersionInMilliseconds(sVersionExtension);
        } catch (pException) {
          throw String(pException);
        }
        if (!isUpdateAvailable) {
          nLastCheck = nNow;
        } else if (nLastCheck >= 0) {
          nLastCheck = -(nNow - (INTERVAL_CHECK_UPDATE - TAKES_INSTALL_UPDATE));
        } else {
          nLastCheck = -nNow;
          m_Window.open2("extensionupdate");
        }
        m_Settings.Change("nLastCheckUpdateExtension", nLastCheck);
        m_Settings.SaveChange();
      })
      .catch(
        AddHandlerExceptions((pReason) => {
          if (typeof pReason == "string") {
            m_Log.Oops(
              `[News] Not succeeded assert update2 extension. ${pReason}`,
            );
            m_Settings.Change(
              "nLastCheckUpdateExtension",
              nLastCheck < 0 ? -nNow : nNow,
            );
            m_Settings.SaveChange();
          } else {
            throw pReason;
          }
        }),
      );
  }
  function Start() {
    const { pCurrent: sPreviousVersion, pInitial: sInitialVersion } =
      m_Settings.GetParametersSettings("sPreviousVersion");
    if (sPreviousVersion !== VERSION_EXTENSION) {
      m_Log.Ok(
        `[News] Version extension changed2 s ${sPreviousVersion} on ${VERSION_EXTENSION}`,
      );
      if (
        sPreviousVersion === sInitialVersion ||
        ExistsNewsWithVersionOlder(sPreviousVersion)
      ) {
        ShowElement("opennews", true).classList.add("unread");
      } else {
        m_Settings.Change("sPreviousVersion", VERSION_EXTENSION);
      }
    }
    assertUpdateExtension();
  }
  return {
    Start,
    OpenNews,
    OpenHelp,
  };
})();

const m_Controls = (() => {
  const SEEK_ARROWS_ON = 5;
  const REWIND_LIVE_AIR_ON = 10;
  const SEEK_BY_FRAMES_ON = 3;
  const TITLE_BROADCAST_UNKNOWN = "• • •";
  let _nState;
  let _oStartPlayback, _oSizeBuffer, _oStretchBuffer, _oDurationReplay;
  let _oIntervalAutohide;
  function startChangeVolumeWheel() {
    document.removeEventListener("pointerdown", handlePressWheel);
    document.removeEventListener("wheel", handleRotationWheel);
    if (m_Settings.Get("isChangeVolumeWheel")) {
      document.addEventListener("pointerdown", handlePressWheel);
      if (m_Settings.Get("nStepChangeVolumeWheel") !== 0) {
        document.addEventListener("wheel", handleRotationWheel, {
          passive: false,
        });
      }
    }
  }
  const handlePressWheel = createHandlerEventsElement((oEvent) => {
    if (!(
      oEvent.button !== AVERAGE_BUTTON ||
      oEvent.shiftKey ||
      oEvent.ctrlKey ||
      oEvent.altKey ||
      oEvent.metaKey ||
      ThisEventForLinks(oEvent)
    )) {
      oEvent.preventDefault();
      SaveAndApplyVolume(!m_Settings.Get("isMute"));
    }
  });
  const handleRotationWheel = AddHandlerExceptions((oEvent) => {
    if (!(
      oEvent.shiftKey ||
      oEvent.ctrlKey ||
      oEvent.altKey ||
      oEvent.metaKey ||
      ElementInThisPointCanScroll(oEvent.clientX, oEvent.clientY)
    )) {
      oEvent.preventDefault();
      m_Log.Here(
        `[Controls] Motion wheel deltaY=${oEvent.deltaY} deltaMode=${oEvent.deltaMode}`,
      );
      if (oEvent.deltaY !== 0) {
        SaveAndApplyVolume(
          void 0,
          Clamp(
            m_Settings.Get("nVolume2") -
              m_Settings.Get("nStepChangeVolumeWheel") *
                Math.sign(oEvent.deltaY),
            MINIMUM_VOLUME,
            MAXIMUM_VOLUME,
          ),
        );
      }
    }
  });
  function ApplyScaleImage() {
    byId("eye").classList.toggle("scale2", m_Settings.Get("isScaleImage"));
  }
  function ApplyAnimationUi() {
    document.body.classList.toggle(
      "uianimation",
      m_Settings.Get("isAnimationUi"),
    );
  }
  function StopWatchBroadcast() {
    if (_nState === STATE_STOP || _nState === STATE_REPLAY) {
      return false;
    }
    m_Log.Ok("[Controls] Stopping watch2 broadcast");
    m_List.Stop();
    m_Converter.Stop();
    g_objsQueue.Clear();
    g_objsQueue.Add(new Segment(HANDLING_CONVERTED, STATE_REPLAY));
    m_Player.AddNextSegment();
    return true;
  }
  function ToggleWatchBroadcast() {
    if (!StopWatchBroadcast()) {
      m_Log.Ok("[Controls] Starting watch2 broadcast");
      g_objsQueue.Clear();
      m_Player.Reload(STATE_START);
      m_List.Start();
    }
  }
  function ToggleWindowStats() {
    if (m_Stats.WindowOpen()) {
      m_Stats.CloseWindow();
    } else {
      m_Stats.OpenWindow();
    }
  }
  function ToggleCheckColor(oEvent) {
    if (document.body.classList.toggle("colortest")) {
      document.body.classList.toggle("colortestbg", !oEvent.shiftKey);
      m_News.OpenHelp();
    } else {
      document.body.classList.remove("colortestbg");
    }
  }
  function CopyTextInBufferClipboard(sText) {
    Assert(typeof sText == "string");
    if (sText === "") {
      m_Notice.ShowFail();
      return;
    }
    navigator.clipboard
      .writeText(sText)
      .then(
        () => {
          m_Log.Here("[Controls] Copy in buffer clipboard finished2");
          m_Notice.ShowHappiness();
        },
        (pReason) => {
          m_Log.Oops(
            `[Controls] Error at2 copy in buffer clipboard: ${pReason}`,
          );
          m_Notice.ShowFail();
        },
      )
      .catch(m_Debug.CaughtException);
  }
  function CopyAddressBroadcastInBufferClipboard() {
    if (CopyAddressBroadcastInBufferClipboard.isRunningExecution) {
      return;
    }
    CopyAddressBroadcastInBufferClipboard.isRunningExecution = true;
    m_Log.Ok("[Controls] Getting address broadcast for copy2");
    m_Twitch
      .GetAbsoluteAddressListVariants(null, true, false)
      .then((sResult) => {
        m_Log.Here("[Controls] Copying address broadcast in buffer clipboard");
        return navigator.clipboard.writeText(sResult).then(
          () => {
            CopyAddressBroadcastInBufferClipboard.isRunningExecution = false;
            m_Log.Here("[Controls] Copy in buffer clipboard finished2");
            m_Controls.StopWatchBroadcast();
            m_Notice.ShowHappiness();
          },
          (pReason) => {
            throw `Error at2 copy in buffer clipboard: ${pReason}`;
          },
        );
      })
      .catch(
        AddHandlerExceptions((pReason) => {
          CopyAddressBroadcastInBufferClipboard.isRunningExecution = false;
          if (typeof pReason == "string") {
            m_Log.Oops(
              `[Controls] Error at2 copy address2 broadcast in buffer clipboard: ${pReason}`,
            );
            m_Notice.ShowFail();
          } else {
            throw pReason;
          }
        }),
      );
  }
  const HandleChangeVolume = AddHandlerExceptions((oEvent) => {
    SaveAndApplyVolume(false, oEvent.target.valueAsNumber);
  });
  function SaveAndApplyVolume(isMute, nVolume) {
    Assert(isMute !== void 0 || nVolume !== void 0);
    if (document.body.classList.contains("noaudio")) {
      return;
    }
    if (isMute !== void 0) {
      m_Settings.Change("isMute", isMute);
    }
    if (nVolume !== void 0) {
      m_Settings.Change("nVolume2", Math.round(nVolume));
    }
    m_Player.ApplyVolume();
    UpdateVolume();
    m_Autohide.Show();
  }
  function UpdateVolume() {
    const nVolume = m_Settings.Get("nVolume2");
    const nodeVolume = byId("volume");
    nodeVolume.value = nVolume;
    nodeVolume.style.setProperty(
      "--width",
      `${((nVolume - MINIMUM_VOLUME) / (100 - MINIMUM_VOLUME)) * 100}%`,
    );
    ChangeButton("togglemute", m_Settings.Get("isMute"));
  }
  function UpdateCountTracks(isExistsVideo, isExistsAudio) {
    document.body.classList.toggle("novideo", !isExistsVideo);
    document.body.classList.toggle("noaudio", !isExistsAudio);
  }
  function ChangeFollowViewerOnChannel(nFollow) {
    if (
      !document.getElementById("viewer-follow").classList.contains("updating")
    ) {
      m_Twitch.ChangeFollowViewerOnChannel(nFollow);
    }
  }
  const HandleLeftClick = createHandlerEventsElement((oEvent) => {
    if (oEvent.button !== LEFT_BUTTON) {
      return;
    }
    const nodeClick = oEvent.target;
    let nodeCallsign = nodeClick;
    let sCallsign = nodeCallsign.id || nodeCallsign.name;
    if (!sCallsign && nodeClick.parentNode) {
      nodeCallsign = nodeClick.parentNode;
      sCallsign = nodeCallsign.id || nodeCallsign.name;
    }
    oEvent.nodeCallsign = nodeCallsign;
    oEvent.sCallsign = sCallsign;
    m_Event.DispatchEvent("controls-leftclick", oEvent);
    switch (sCallsign) {
      case "togglebroadcast":
        ToggleWatchBroadcast();
        break;

      case "togglepause":
        if (_nState === STATE_REPLAY) {
          m_Player.TogglePause();
        }
        break;

      case "togglemute":
        SaveAndApplyVolume(!m_Settings.Get("isMute"));
        break;

      case "togglechat":
        m_Chat.ToggleStatePanel();
        break;

      case "reloadchat":
        m_Chat.ReloadPanel();
        break;

      case "createclip":
        m_Twitch.CreateClip();
        break;

      case "togglepip":
        m_PictureInPicture.toggle();
        break;

      case "togglefullscreen":
        m_FullscreenMode.Toggle();
        break;

      case "concurrentloads":
        Assert(nodeClick.checked);
        m_Settings.Change(
          "countConcurrentLoads",
          Number.parseInt(nodeClick.value, 10),
        );
        m_Stats.ClearHistory();
        break;

      case "uianimation":
        m_Settings.Change("isAnimationUi", nodeClick.checked);
        ApplyAnimationUi();
        break;

      case "scaleimage":
        m_Settings.Change("isScaleImage", nodeClick.checked);
        ApplyScaleImage();
        break;

      case "chatautoposition":
        m_Settings.Change("isAutoPositionChat", nodeClick.checked);
        UpdateWindowSettings();
        m_Chat.ApplyPositionPanel();
        break;

      case "chathorizontalposition":
        Assert(nodeClick.checked);
        m_Settings.Change(
          "nHorizontalPositionChat",
          Number.parseInt(nodeClick.value, 10),
        );
        m_Chat.ApplyPositionPanel();
        break;

      case "chatverticalposition":
        Assert(nodeClick.checked);
        m_Settings.Change(
          "nVerticalPositionChat",
          Number.parseInt(nodeClick.value, 10),
        );
        m_Chat.ApplyPositionPanel();
        break;

      case "chatposition":
        Assert(nodeClick.checked);
        m_Settings.Change(
          "nPositionPanelChat",
          Number.parseInt(nodeClick.value, 10),
        );
        m_Chat.ApplyPositionPanel();
        break;

      case "closedchatstate":
        Assert(nodeClick.checked);
        m_Chat.SaveAndApplyStateClosedPanel(
          Number.parseInt(nodeClick.value, 10),
        );
        break;

      case "togglestats":
      case "position":
        ToggleWindowStats();
        break;

      case "opennews":
      case "opennews2":
        m_News.OpenNews();
        break;

      case "openhelp":
        m_News.OpenHelp();
        break;

      case "sendfeedback":
        m_Debug.FinishWorkAndSendFeedback();
        break;

      case "exportsettings":
        m_Settings.Export();
        break;

      case "importsettings":
        const node = document.getElementById("importsettingsfile");
        node.value = "";
        node.click();
        break;

      case "resetsettings":
        m_Settings.Reset();
        break;

      case "colortest":
        ToggleCheckColor(oEvent);
        break;

      case "viewer-follow2":
        ChangeFollowViewerOnChannel(FOLLOW_NOTIFY);
        break;

      case "viewer-unfollow":
        ChangeFollowViewerOnChannel(FOLLOW_UNFOLLOWED);
        break;

      case "viewer-notify":
        ChangeFollowViewerOnChannel(
          nodeClick.checked ? FOLLOW_NOTIFY : FOLLOW_NONOTIFY,
        );
        break;

      case "closestats":
        m_Stats.CloseWindow();
        break;

      case "copychanneladdress":
        m_Log.Here("[Controls] Copying address channel in buffer clipboard");
        CopyTextInBufferClipboard(m_Twitch.GetAddressChannel(false));
        break;

      case "copybroadcastaddress":
        CopyAddressBroadcastInBufferClipboard();
    }
  });
  const HandlePressAndReleaseKeyboard = AddHandlerExceptions((oEvent) => {
    const SHIFT_KEY = 1 << 16;
    const CTRL_KEY = 1 << 17;
    const ALT_KEY = 1 << 18;
    const META_KEY = 1 << 19;
    const isPress = oEvent.type === "keydown";
    const isPress1 = isPress && !oEvent.repeat;
    switch (
      oEvent.keyCode +
      oEvent.shiftKey * SHIFT_KEY +
      oEvent.ctrlKey * CTRL_KEY +
      oEvent.altKey * ALT_KEY +
      oEvent.metaKey * META_KEY
    ) {
      case 27:
        oEvent.preventDefault();
        if (isPress1) {
          getSelection().removeAllRanges();
          m_Window.close(false);
          m_Autohide.Hide(false);
        }
        break;

      case 70:
      case 13:
      case 13 + ALT_KEY:
        if (isPress1) {
          m_FullscreenMode.Toggle();
        }
        break;

      case 13 + SHIFT_KEY:
        if (isPress1) {
          m_PictureInPicture.toggle();
        }
        break;

      case 93:
        if (!isPress) {
          byId("eye").focus();
        }
        return;

      case 88:
        if (isPress1) {
          m_Window.toggle("mainmenu");
        }
        break;

      case 67:
        if (isPress1) {
          m_Chat.ToggleStatePanel();
        }
        break;

      case 67 + SHIFT_KEY:
        if (isPress1) {
          m_Chat.ReloadPanel();
        }
        break;

      case 86:
        if (isPress1) {
          m_Window.toggle("settings");
        }
        break;

      case 73:
        if (isPress1) {
          m_Window.toggle("channel2");
        }
        break;

      case 83:
        if (isPress1) {
          ToggleWindowStats();
        }
        break;

      case 112:
        if (isPress1) {
          m_News.OpenHelp();
        }
        break;

      case 65 + CTRL_KEY:
        break;

      case 85 + CTRL_KEY:
        if (isPress1) {
          m_Chat.TogglePositionPanel();
          UpdateWindowSettings();
        }
        break;

      case 32:
        if (isPress1) {
          ToggleWatchBroadcast();
          m_Autohide.Show();
        }
        break;

      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
      case 54:
      case 55:
      case 56:
      case 57:
      case 48:
        if (isPress1 && _nState === STATE_REPLAY) {
          setSpeedReplay(58 - (oEvent.keyCode === 48 ? 58 : oEvent.keyCode));
          m_Autohide.Show();
        }
        break;

      case 187:
      case 107:
      case 190:
        if (isPress1 && _nState === STATE_REPLAY) {
          setSpeedReplay(-Infinity);
          m_Autohide.Show();
        }
        break;

      case 189:
      case 109:
      case 188:
        if (isPress1 && _nState === STATE_REPLAY) {
          setSpeedReplay(Infinity);
          m_Autohide.Show();
        }
        break;

      case 75:
      case 12:
        if (isPress1 && _nState === STATE_REPLAY) {
          m_Player.TogglePause();
          m_Autohide.Show();
        }
        break;

      case 74:
      case 37:
        if (isPress) {
          if (_nState === STATE_REPLAY) {
            m_Log.Ok(`[Controls] Seeking on -${SEEK_ARROWS_ON}s`);
            m_Player.SeekReplayOn(false, -SEEK_ARROWS_ON);
          } else if (StopWatchBroadcast() && GetState() === STATE_REPLAY) {
            m_Log.Ok(`[Controls] Rewinding live air on ${REWIND_LIVE_AIR_ON}s`);
            m_Player.SeekReplayOn(false, -REWIND_LIVE_AIR_ON);
            m_Player.TogglePause();
          }
          m_Autohide.Show();
        }
        break;

      case 76:
      case 39:
        if (isPress && _nState === STATE_REPLAY) {
          m_Log.Ok(`[Controls] Seeking on +${SEEK_ARROWS_ON}s`);
          m_Player.SeekReplayOn(false, SEEK_ARROWS_ON);
          m_Autohide.Show();
        }
        break;

      case 74 + SHIFT_KEY:
      case 37 + SHIFT_KEY:
        if (isPress && _nState === STATE_REPLAY) {
          m_Log.Ok(`[Controls] Seeking on -${SEEK_BY_FRAMES_ON} frames`);
          m_Player.SeekReplayOn(true, -SEEK_BY_FRAMES_ON);
        }
        break;

      case 76 + SHIFT_KEY:
      case 39 + SHIFT_KEY:
        if (isPress && _nState === STATE_REPLAY) {
          m_Log.Ok(`[Controls] Seeking on +1 frame2`);
          m_Player.SeekReplayOn(true, 1);
        }
        break;

      case 38:
        if (isPress) {
          SaveAndApplyVolume(
            false,
            Math.min(
              m_Settings.Get("nVolume2") + STEP_INCREASE_VOLUME_KEYBOARD,
              MAXIMUM_VOLUME,
            ),
          );
        }
        break;

      case 40:
        if (isPress) {
          SaveAndApplyVolume(
            false,
            Math.max(
              m_Settings.Get("nVolume2") - STEP_DECREASE_VOLUME_KEYBOARD,
              MINIMUM_VOLUME,
            ),
          );
        }
        break;

      case 33:
        if (isPress1) {
          SaveAndApplyVolume(false);
        }
        break;

      case 34:
        if (isPress1) {
          SaveAndApplyVolume(true);
        }
        break;

      case 77:
        if (isPress1) {
          SaveAndApplyVolume(!m_Settings.Get("isMute"));
        }
        break;

      case 73 + CTRL_KEY:
        if (isPress1) {
          const isScaleImage = m_Settings.Get("isScaleImage");
          m_Settings.Change("isScaleImage", !isScaleImage);
          UpdateWindowSettings();
          ApplyScaleImage();
          m_Notice.Show(`svg-fullscreen-${isScaleImage}`, false);
        }
        break;

      case 88 + ALT_KEY:
        if (isPress1) {
          m_Twitch.CreateClip();
        }
        break;

      default:
        return;
    }
    oEvent.preventDefault();
  });
  function UpdateWindowSettings() {
    document.querySelector(
      `input[name="concurrentloads"][value="${m_Settings.Get("countConcurrentLoads")}"]`,
    ).checked = true;
    document.querySelector(
      `input[name="closedchatstate"][value="${m_Settings.Get("nStateClosedChat")}"]`,
    ).checked = true;
    byId("chataddress").selectedIndex =
      (m_Settings.Get("isFullChat") ? 0 : 2) +
      (m_Settings.Get("isDarkenChat") ? 1 : 0);
    byId("scaleimage").checked = m_Settings.Get("isScaleImage");
    byId("uianimation").checked = m_Settings.Get("isAnimationUi");
    byId("changewheelvolume").value = m_Settings.Get("isChangeVolumeWheel")
      ? m_Settings.Get("nStepChangeVolumeWheel")
      : "";
    const isAutoPosition = m_Settings.Get("isAutoPositionChat");
    byId("chatautoposition").checked = isAutoPosition;
    const nodesSide = document.querySelectorAll(".chatposition input");
    if (isAutoPosition) {
      const nHorizontalPosition = m_Settings.Get("nHorizontalPositionChat");
      const nVerticalPosition = m_Settings.Get("nVerticalPositionChat");
      let nodeHorizontalPosition, nodeVerticalPosition;
      for (let nodeSide of nodesSide) {
        const nSide = Number.parseInt(nodeSide.value, 10);
        if (nHorizontalPosition === nSide) {
          nodeHorizontalPosition = nodeSide;
        }
        if (nVerticalPosition === nSide) {
          nodeVerticalPosition = nodeSide;
        }
        nodeSide.name =
          nSide === RIGHT_SIDE || nSide === LEFT_SIDE
            ? "chathorizontalposition"
            : "chatverticalposition";
      }
      nodeHorizontalPosition.checked = nodeVerticalPosition.checked = true;
    } else {
      const nPosition = m_Settings.Get("nPositionPanelChat");
      let nodePosition;
      for (let nodeSide of nodesSide) {
        if (nPosition === Number.parseInt(nodeSide.value, 10)) {
          nodePosition = nodeSide;
        }
        nodeSide.name = "chatposition";
      }
      nodePosition.checked = true;
    }
    if (_oStartPlayback) {
      _oStartPlayback.Update();
      _oSizeBuffer.Update();
      _oStretchBuffer.Update();
      _oDurationReplay.Update();
      _oIntervalAutohide.Update();
    } else {
      _oStartPlayback = new InputNumber(
        "nStartPlayback",
        0.5,
        1,
        "playbackstart",
      );
      _oSizeBuffer = new InputNumber("nSizeBuffer", 0.5, 1, "buffersize");
      _oStretchBuffer = new InputNumber(
        "nStretchBuffer",
        0.5,
        1,
        "bufferstretch",
      );
      _oDurationReplay = new InputNumber(
        "nDurationReplay2",
        30,
        0,
        "replayduration",
      );
      _oStartPlayback.AfterChange =
        _oSizeBuffer.AfterChange =
        _oStretchBuffer.AfterChange =
          m_Stats.ClearHistory;
      _oIntervalAutohide = new InputNumber(
        "nIntervalAutohide",
        0.5,
        1,
        "intervalAutohide",
      );
    }
  }
  function HandleOpenMainMenu() {
    const elItem = byId("recordingaddress");
    const sAddress = m_Twitch.GetAddressRecordingForCurrentPosition();
    if (sAddress) {
      elItem.href = sAddress;
      m_Menu.setAvailabilityItem(elItem, true);
    } else {
      elItem.removeAttribute("href");
      m_Menu.setAvailabilityItem(elItem, false);
    }
  }
  function HandlePause(isPause) {
    ChangeButton("togglepause", isPause);
  }
  function HandleChangePresetBuffering() {
    UpdateWindowSettings();
    m_Stats.ClearHistory();
  }
  function getSpeedReplay() {
    const nodeSpeed = byId("speed");
    if (nodeSpeed.options[0].text === "") {
      for (const node of nodeSpeed.options) {
        node.text = node.defaultSelected
          ? "1x"
          : m_i18n.FormatNumber(node.value, 2);
      }
    }
    const nSpeed = Number.parseFloat(nodeSpeed.value);
    Assert(nSpeed > 0);
    return nSpeed;
  }
  function setSpeedReplay(nCode) {
    const nodeSpeed = byId("speed");
    if (!Number.isSafeInteger(nCode)) {
      Assert(
        nodeSpeed.selectedIndex >= 0 &&
          (nCode === -Infinity || nCode === Infinity),
      );
      nCode = nodeSpeed.selectedIndex + Math.sign(nCode);
    }
    if (nCode >= 0 && nCode < nodeSpeed.options.length) {
      nodeSpeed.selectedIndex = nCode;
      m_Player.SetSpeedReplay(getSpeedReplay());
    }
  }
  const HandleChangeSpeedPlayback = AddHandlerExceptions((oEvent) => {
    if (_nState === STATE_REPLAY) {
      m_Player.SetSpeedReplay(getSpeedReplay());
    }
  });
  const HandleChangeVariantBroadcast = AddHandlerExceptions(
    ({ target: { selectedIndex } }) => {
      if (selectedIndex !== -1) {
        m_Log.Ok(`[Controls] Chosen variant ${selectedIndex}`);
        m_List.ChangeVariantBroadcast(selectedIndex);
      }
    },
  );
  const HandleChangeVolumeWheel = AddHandlerExceptions((oEvent) => {
    if (oEvent.target.value) {
      m_Settings.Change("isChangeVolumeWheel", true);
      m_Settings.Change("nStepChangeVolumeWheel", Number(oEvent.target.value));
    } else {
      m_Settings.Change("isChangeVolumeWheel", false);
    }
    startChangeVolumeWheel();
  });
  const HandleChangeAddressChat = AddHandlerExceptions((oEvent) => {
    m_Log.Ok(`[Controls] Chosen address chat ${oEvent.target.selectedIndex}`);
    switch (oEvent.target.selectedIndex) {
      case 0:
        m_Settings.Change("isFullChat", true);
        m_Settings.Change("isDarkenChat", false);
        break;

      case 1:
        m_Settings.Change("isFullChat", true);
        m_Settings.Change("isDarkenChat", true);
        break;

      case 2:
        m_Settings.Change("isFullChat", false);
        m_Settings.Change("isDarkenChat", false);
        break;

      case 3:
        m_Settings.Change("isFullChat", false);
        m_Settings.Change("isDarkenChat", true);
        break;

      default:
        Assert(false);
    }
    m_Chat.ApplyAddress();
  });
  const HandleChoiceFileForImportSettings = AddHandlerExceptions((oEvent) => {
    if (oEvent.target.files.length === 1) {
      m_Settings.Import(oEvent.target.files[0]);
    }
  });
  function shortNameCodec(sCodecs) {
    const sVideo = String(sCodecs || "")
      .split(",")[0]
      .trim()
      .toLowerCase();
    if (sVideo.startsWith("av01")) {
      return "AV1";
    }
    if (sVideo.startsWith("hvc1") || sVideo.startsWith("hev1")) {
      return "HEVC";
    }
    if (sVideo.startsWith("avc1") || sVideo.startsWith("avc3")) {
      return "H.264";
    }
    if (sVideo.startsWith("vp09") || sVideo.startsWith("vp9")) {
      return "VP9";
    }
    return "";
  }
  function titleVariant(oVariant) {
    let sTitle = (oVariant && oVariant.sTitle) || "";
    if (sTitle === "audio_only") {
      sTitle = Text("J0144");
    } else if (sTitle.endsWith("(source)")) {
      sTitle = sTitle.slice(0, -8) + Text("J0139");
    }
    const sCodec = shortNameCodec(oVariant && oVariant.sCodecs);
    if (sCodec && sTitle !== Text("J0144")) {
      sTitle += ` ${sCodec}`;
    }
    return sTitle;
  }
  let _isBannerProxy = false;
  function showTextAd(oVariant) {
    const node = document.querySelector(".hidingads-text");
    if (!node) {
      return;
    }
    const sBase = Text(_isBannerProxy ? "F0673" : "F0669");
    const sQuality = oVariant ? titleVariant(oVariant) : "";
    node.textContent = sQuality ? `${sBase} · ${sQuality}` : sBase;
  }
  function UpdateListVariantsBroadcast([objsVariants, oChosenVariant]) {
    const nodeList = byId("broadcastvariant");
    nodeList.length = 0;
    if (objsVariants) {
      for (const oVariant of objsVariants) {
        nodeList.add(
          new Option(
            titleVariant(oVariant),
            void 0,
            oVariant === oChosenVariant,
            oVariant === oChosenVariant,
          ),
        );
      }
    }
    nodeList.disabled = nodeList.length < 2;
  }
  function handleStartAd() {}
  function handleEndAd() {
    _isBannerProxy = false;
    document.body.classList.remove("ad");
    showTextAd(null);
  }
  function handleModeAd(isProxy) {
    _isBannerProxy = Boolean(isProxy);
    document.body.classList.add("ad");
    showTextAd(null);
  }
  function handleQualityWithoutAd(oVariant) {
    if (document.body.classList.contains("ad")) {
      showTextAd(oVariant);
    }
  }
  function handleOverflowBuffer() {
    m_Notice.Show("svg-cut", true);
  }
  function Start() {
    Assert(_nState === void 0);
    setLinksStatsChannel(
      new URLSearchParams(location.search.slice(1)).get("channel") || "",
    );
    byId("broadcasttitle").href = m_Twitch.GetAddressChannel(true);
    const nodeVolume = byId("volume");
    nodeVolume.min = MINIMUM_VOLUME;
    nodeVolume.addEventListener("input", HandleChangeVolume);
    UpdateVolume();
    UpdateWindowSettings();
    m_Settings.ConfigureListsPresets();
    m_Autohide.Start();
    m_Autohide.Show();
    m_News.Start();
    m_Chat.Restore();
    m_Event.AddHandler("window-open-mainmenu", HandleOpenMainMenu);
    m_Event.AddHandler(
      "list-broadcastvariantchosen",
      UpdateListVariantsBroadcast,
    );
    m_Event.AddHandler("list-adstart", handleStartAd);
    m_Event.AddHandler("list-adend", handleEndAd);
    m_Event.AddHandler("list-admode", handleModeAd);
    m_Event.AddHandler("list-adfreequality", handleQualityWithoutAd);
    m_Subtitles.Start();
    m_Event.AddHandler("player-bufferoverflowed", handleOverflowBuffer);
    m_Event.AddHandler("player-pause", HandlePause);
    m_Event.AddHandler(
      "settings-presetchanged-buffering",
      HandleChangePresetBuffering,
    );
    m_Event.AddHandler("twitch-channelmetareceived", ShowMetadataChannel);
    m_Event.AddHandler("twitch-viewermetareceived", ShowMetadataViewer);
    m_Event.AddHandler("twitch-broadcastmetareceived", ShowMetadataBroadcast);
    document.documentElement.addEventListener("click", HandleLeftClick);
    byId("togglechat").addEventListener(
      "contextmenu",
      AddHandlerExceptions((oEvent) => {
        oEvent.preventDefault();
        m_Chat.ReloadPanel();
      }),
    );
    document.addEventListener("keydown", HandlePressAndReleaseKeyboard);
    document.addEventListener("keyup", HandlePressAndReleaseKeyboard);
    byId("speed").addEventListener("change", HandleChangeSpeedPlayback);
    byId("broadcastvariant").addEventListener(
      "change",
      HandleChangeVariantBroadcast,
    );
    byId("changewheelvolume").addEventListener(
      "change",
      HandleChangeVolumeWheel,
    );
    byId("chataddress").addEventListener("change", HandleChangeAddressChat);
    byId("importsettingsfile").addEventListener(
      "change",
      HandleChoiceFileForImportSettings,
    );
    startChangeVolumeWheel();
    ChangeState(STATE_START);
    ApplyScaleImage();
    ApplyAnimationUi();
    m_Theme.Start();
  }
  function ChangeState(nNewState) {
    Assert(Number.isInteger(nNewState));
    if (_nState === nNewState) {
      return;
    }
    m_Log.Here(
      `[Controls] State broadcast changed3 s ${_nState} on ${nNewState}`,
    );
    _nState = nNewState;
    document.body.setAttribute("data-state", nNewState);
    ChangeButton(
      "togglebroadcast",
      nNewState === STATE_STOP || nNewState === STATE_REPLAY,
    );
    m_Event.DispatchEvent("controls-statechanged", nNewState);
    switch (nNewState) {
      case STATE_START:
        ShowMetadataBroadcast({
          sTypeBroadcast: null,
          sTitleBroadcast: TITLE_BROADCAST_UNKNOWN,
          sTitleGame: null,
          sAddressGame: null,
          countViewers: null,
          nDurationBroadcast: null,
        });
        m_Twitch.FinishCollectMetadataBroadcast(true);
        break;

      case STATE_START_BROADCAST:
        ShowMetadataBroadcast({
          sTypeBroadcast: null,
          sTitleBroadcast: TITLE_BROADCAST_UNKNOWN,
          sTitleGame: null,
          sAddressGame: null,
          countViewers: null,
          nDurationBroadcast: null,
        });
        m_Twitch.StartCollectMetadataBroadcast();
        break;

      case STATE_FINISH_BROADCAST:
        ShowMetadataBroadcast({
          sTypeBroadcast: "finished",
          countViewers: null,
          nDurationBroadcast: null,
        });
        m_Twitch.FinishCollectMetadataBroadcast(true);
        byId("stats-broadcastlatency").textContent = "";
        showLatencyOnPanel(NaN);
        break;

      case STATE_LOAD:
      case STATE_START_PLAYBACK:
      case STATE_PLAYBACK:
        break;

      case STATE_STOP:
      case STATE_REPLAY:
        ShowMetadataBroadcast({
          countViewers: null,
        });
        m_Twitch.FinishCollectMetadataBroadcast(false);
        byId("stats-broadcastlatency").textContent = "";
        showLatencyOnPanel(NaN);
        break;

      default:
        Assert(false);
    }
  }
  function GetState() {
    Assert(_nState !== void 0);
    return _nState;
  }
  function setLinksStatsChannel(sCode) {
    if (!ThisNonemptyString(sCode)) {
      return;
    }
    const sLogin = encodeURIComponent(sCode.toLowerCase());
    byId("channel2-twitchtracker").href = `https://twitchtracker.com/${sLogin}`;
    byId("channel2-streamscharts").href =
      `https://streamscharts.com/channels/${sLogin}`;
  }
  function ShowMetadataChannel(oMetadata) {
    if (oMetadata.sCode !== void 0) {
      setLinksStatsChannel(oMetadata.sCode);
    }
    if (oMetadata.sName !== void 0) {
      ChangeHeaderDocument(
        `${oMetadata.sName} - Alternate Player for Twitch.tv`,
      );
      byId("channel2-name").textContent = oMetadata.sName;
    }
    if (oMetadata.sAvatar !== void 0) {
      Assert(oMetadata.sAvatar);
      byId("channel2-avatar").src = oMetadata.sAvatar;
    }
    if (oMetadata.sDescription !== void 0) {
      byId("channel2-description").textContent = oMetadata.sDescription || "";
    }
    if (oMetadata.sCodeLanguage !== void 0) {
      const node = byId("channel2-language");
      if (oMetadata.sCodeLanguage) {
        node.textContent = m_i18n.GetTitleLanguage(oMetadata.sCodeLanguage);
        ShowElement(node.parentNode, true);
      } else {
        ShowElement(node.parentNode, false);
      }
    }
    if (oMetadata.countFollowers !== void 0) {
      const node = byId("channel2-followers");
      if (Number.isFinite(oMetadata.countFollowers)) {
        node.textContent = m_i18n.FormatNumber(oMetadata.countFollowers);
        ShowElement(node.parentNode, true);
      } else {
        ShowElement(node.parentNode, false);
      }
    }
    if (oMetadata.nChannelCreated !== void 0) {
      const node = byId("channel2-created");
      if (Number.isFinite(oMetadata.nChannelCreated)) {
        node.textContent = m_i18n.FormatDate(oMetadata.nChannelCreated);
        ShowElement(node.parentNode, true);
      } else {
        ShowElement(node.parentNode, false);
      }
    }
    if (oMetadata.objsTeam !== void 0) {
      ShowArrayLinks(oMetadata.objsTeam, "channel2-team");
    }
  }
  function ShowArrayLinks(objsLinks, pInsert) {
    const nodeInsert = byId(pInsert);
    if (objsLinks.length === 0) {
      ShowElement(nodeInsert.parentNode, false);
    } else {
      const oFragment = document.createDocumentFragment();
      for (let oLink, idx = 0; (oLink = objsLinks[idx]); ++idx) {
        if (idx !== 0) {
          oFragment.appendChild(document.createTextNode(", "));
        }
        Assert(
          ThisNonemptyString(oLink.sAddress) && ThisNonemptyString(oLink.sName),
        );
        const nodeLink = document.createElement("a");
        nodeLink.href = oLink.sAddress;
        nodeLink.rel = "noopener noreferrer";
        nodeLink.target = "_blank";
        if (oLink.sDescription) {
          nodeLink.className = "channel2-link2";
          nodeLink.title = oLink.sDescription;
        }
        nodeLink.textContent = oLink.sName;
        oFragment.appendChild(nodeLink);
      }
      nodeInsert.textContent = "";
      nodeInsert.appendChild(oFragment);
      ShowElement(nodeInsert.parentNode, true);
    }
  }
  function ShowMetadataViewer(oMetadata) {
    if (oMetadata.sName !== void 0) {
      if (oMetadata.sName !== "") {
        byId("viewer-name").textContent = oMetadata.sName;
      } else {
        m_i18n.InsertAdjacentHtmlMessage("viewer-name", "content", "F0590");
      }
    }
    if (oMetadata.nFollow !== void 0) {
      const node = byId("viewer-follow");
      if (oMetadata.nFollow === FOLLOW_UPDATING) {
        node.classList.add("updating");
      } else {
        node.classList.remove("updating");
        node.setAttribute("data-follow", oMetadata.nFollow);
        byId("viewer-notify").checked = oMetadata.nFollow === FOLLOW_NOTIFY;
      }
    }
  }
  const _oTypesBroadcast = {
    finished: ["J0145", "J0100", false],
    live2: ["J0146", "J0149", true],
    replay: ["J0147", "J0150", false],
  };
  function ShowMetadataBroadcast(oMetadata) {
    if (oMetadata.sTypeBroadcast !== void 0) {
      const node = byId("broadcasttype");
      if (typeof oMetadata.sTypeBroadcast == "string") {
        Assert(_oTypesBroadcast.hasOwnProperty(oMetadata.sTypeBroadcast));
        node.textContent = Text(_oTypesBroadcast[oMetadata.sTypeBroadcast][0]);
        node.parentElement.title = Text(
          _oTypesBroadcast[oMetadata.sTypeBroadcast][1],
        );
        node.classList.toggle(
          "livestream",
          _oTypesBroadcast[oMetadata.sTypeBroadcast][2],
        );
        ShowElement(node.parentElement, true);
      } else {
        ShowElement(node.parentElement, false);
      }
      m_MediaRequest.updateFast();
    }
    if (oMetadata.sTitleBroadcast !== void 0) {
      Assert(oMetadata.sTitleBroadcast !== null);
      const node = byId("broadcasttitle");
      node.title = oMetadata.sTitleBroadcast + Text("J0101");
      node.textContent = oMetadata.sTitleBroadcast;
      m_MediaRequest.updateFast();
    }
    if (oMetadata.sTitleGame !== void 0) {
      const node = byId("broadcastcategory");
      if (oMetadata.sTitleGame) {
        node.textContent = oMetadata.sTitleGame;
        node.title = node.previousElementSibling.title =
          oMetadata.sTitleGame + Text("J0102");
        if (oMetadata.sAddressGame) {
          node.href = oMetadata.sAddressGame;
        } else {
          node.removeAttribute("href");
        }
        ShowElement(node, true);
        ShowElement(node.previousElementSibling, true);
      } else {
        ShowElement(node, false);
        ShowElement(node.previousElementSibling, false);
      }
      m_MediaRequest.updateFast();
    }
    if (oMetadata.countViewers !== void 0) {
      const node = byId("viewercount");
      if (
        Number.isFinite(oMetadata.countViewers) &&
        oMetadata.countViewers >= 0
      ) {
        node.textContent = m_i18n.FormatNumber(oMetadata.countViewers);
        ShowElement(node, true);
        ShowElement(node.previousElementSibling, true);
      } else {
        ShowElement(node, false);
        ShowElement(node.previousElementSibling, false);
      }
      m_MediaRequest.updateFast();
    }
    if (oMetadata.nDurationBroadcast !== void 0) {
      byId("position").textContent =
        Number.isFinite(oMetadata.nDurationBroadcast) &&
        oMetadata.nDurationBroadcast >= 0
          ? m_i18n.ConvertSecondsInString(
              oMetadata.nDurationBroadcast / 1e3,
              false,
            )
          : "";
    }
  }
  return {
    Start,
    GetState,
    ChangeState,
    getSpeedReplay,
    UpdateCountTracks,
    StopWatchBroadcast,
  };
})();

const m_Chat = (() => {
  const SECONDS_UNTIL_RELOAD = 8;
  const MAX_AUTORELOADS = 5;
  const INTERVAL_CHECK = 15e3;
  const TIMEOUT_LOAD = 25e3;
  let _nodeChat = null;
  let _nTimerCheck = 0;
  let _nTimerLoad = 0;
  let _nTimerReload = 0;
  let _countAutoreloads = 0;
  let _countFailuresCheck = 0;
  let _isCancelledAutoreload = false;
  let _isWaitNetwork = false;
  function GetPositionPanel() {
    switch (
      getComputedStyle(document.getElementById("playerandchat")).flexDirection
    ) {
      case "column-reverse":
        return TOP_SIDE;

      case "row":
        return RIGHT_SIDE;

      case "column":
        return BOTTOM_SIDE;

      case "row-reverse":
        return LEFT_SIDE;

      default:
        Assert(false);
    }
  }
  function getShell() {
    return byId("chat2-shell");
  }
  function chatPlacedSide() {
    if (m_Settings.Get("isAutoPositionChat")) {
      return window.matchMedia("(min-aspect-ratio: 16/10)").matches;
    }
    const nPosition = m_Settings.Get("nPositionPanelChat");
    return nPosition === RIGHT_SIDE || nPosition === LEFT_SIDE;
  }
  function applySizePanel() {
    const nodeShell = getShell();
    if (chatPlacedSide()) {
      nodeShell.style.width = `${m_Settings.Get("nWidthPanelChat")}px`;
      nodeShell.style.height = "";
    } else {
      nodeShell.style.width = "";
      nodeShell.style.height = `${m_Settings.Get("nHeightPanelChat")}px`;
    }
  }
  function setSizePanel(nWidth, nHeight) {
    const nodeShell = getShell();
    if (chatPlacedSide()) {
      if (Number.isFinite(nWidth) && nWidth >= 0) {
        nodeShell.style.width = `${nWidth}px`;
      }
      nodeShell.style.height = "";
    } else {
      nodeShell.style.width = "";
      if (Number.isFinite(nHeight) && nHeight >= 0) {
        nodeShell.style.height = `${nHeight}px`;
      }
    }
  }
  function stopTimer(pId) {
    if (pId !== 0) {
      clearTimeout(pId);
      clearInterval(pId);
    }
    return 0;
  }
  function stopCheck() {
    _nTimerCheck = stopTimer(_nTimerCheck);
    _nTimerLoad = stopTimer(_nTimerLoad);
  }
  function stopReload() {
    _nTimerReload = stopTimer(_nTimerReload);
  }
  function hideReload() {
    stopReload();
    _isWaitNetwork = false;
    const node = byId("chat2-reload");
    ShowElement(node, false);
    ShowElement("chat2-reload-cancel", true);
  }
  function showReload(sText, isShowCancel) {
    byId("chat2-reload-text").textContent = sText;
    ShowElement("chat2-reload-cancel", isShowCancel);
    ShowElement("chat2-reload", true);
  }
  function assertChatAlive() {
    if (!_nodeChat) {
      return Promise.resolve(false);
    }
    const nIdTab = getCurrentTab.nIdTab;
    if (!Number.isSafeInteger(nIdTab)) {
      return Promise.resolve(false);
    }
    return new Promise((fnExecute) => {
      const nTimer = setTimeout(() => fnExecute(false), 4e3);
      try {
        chrome.tabs.sendMessage(
          nIdTab,
          {
            sRequest: "chat-ping",
          },
          () => {
            clearTimeout(nTimer);
            fnExecute(!chrome.runtime.lastError);
          },
        );
      } catch (_) {
        clearTimeout(nTimer);
        fnExecute(false);
      }
    });
  }
  function scheduleCheck() {
    stopCheck();
    if (!_nodeChat || m_Settings.Get("nStateChat") === CHAT_UNLOADED) {
      return;
    }
    _nTimerLoad = setTimeout(
      AddHandlerExceptions(() => {
        m_Log.Oops("[Chat] Expired time load2 iframe");
        startAutoreload("timeout");
      }),
      TIMEOUT_LOAD,
    );
  }
  function startCheck() {
    stopCheck();
    _countFailuresCheck = 0;
    _nTimerCheck = setInterval(
      AddHandlerExceptions(() => {
        if (!navigator.onLine) {
          handleLossNetwork();
          return;
        }
        assertChatAlive().then((isAlive) => {
          if (isAlive) {
            _countFailuresCheck = 0;
            _countAutoreloads = 0;
            return;
          }
          _countFailuresCheck++;
          m_Log.Oops(
            `[Chat] None response2 from iframe Failures=${_countFailuresCheck}`,
          );
          if (_countFailuresCheck >= 2) {
            startAutoreload("ping");
          }
        });
      }),
      INTERVAL_CHECK,
    );
  }
  function handleLoadChat() {
    _nTimerLoad = stopTimer(_nTimerLoad);
    _countFailuresCheck = 0;
    _countAutoreloads = 0;
    _isCancelledAutoreload = false;
    hideReload();
    startCheck();
    m_Log.Here("[Chat] Iframe loaded");
  }
  function handleErrorChat() {
    m_Log.Oops("[Chat] Error load2 iframe");
    startAutoreload("error");
  }
  function handleLossNetwork() {
    if (!_nodeChat || _isWaitNetwork) {
      return;
    }
    _isWaitNetwork = true;
    stopCheck();
    stopReload();
    showReload(Text("J0234"), false);
    m_Log.Oops("[Chat] None network, waiting restore");
  }
  function handleRestoreNetwork() {
    if (!_isWaitNetwork) {
      return;
    }
    _isWaitNetwork = false;
    _isCancelledAutoreload = false;
    m_Log.Ok("[Chat] Network restored, reloading iframe");
    ReloadPanel();
  }
  function startAutoreload(sReason) {
    if (!_nodeChat || _nTimerReload !== 0 || _isWaitNetwork) {
      return;
    }
    if (!navigator.onLine) {
      handleLossNetwork();
      return;
    }
    if (_isCancelledAutoreload) {
      showReload(Text("J0233"), false);
      return;
    }
    if (_countAutoreloads >= MAX_AUTORELOADS) {
      m_Log.Oops(
        `[Chat] Autoreload disabled: reached limit ${MAX_AUTORELOADS}`,
      );
      showReload(Text("J0233"), false);
      return;
    }
    m_Log.Ok(
      `[Chat] Autoreload via ${SECONDS_UNTIL_RELOAD}s Reason=${sReason}`,
    );
    let nLeft = SECONDS_UNTIL_RELOAD;
    showReload(Text("J0232", String(nLeft)), true);
    _nTimerReload = setInterval(
      AddHandlerExceptions(() => {
        --nLeft;
        if (nLeft <= 0) {
          stopReload();
          _countAutoreloads++;
          ReloadPanel();
          return;
        }
        byId("chat2-reload-text").textContent = Text("J0232", String(nLeft));
      }),
      1e3,
    );
  }
  function cancelAutoreload() {
    if (_nTimerReload === 0) {
      return;
    }
    stopReload();
    _isCancelledAutoreload = true;
    showReload(Text("J0233"), false);
    m_Log.Here("[Chat] Autoreload cancelled");
  }
  function InsertPanel(isResetCache) {
    if (_nodeChat) {
      return;
    }
    let sAddress = m_Twitch.openChat();
    if (isResetCache) {
      sAddress += `${sAddress.includes("?") ? "&" : "?"}tw5r=${Date.now()}`;
    }
    m_Log.Here(`[Chat] Inserting iframe ${sAddress}`);
    applySizePanel();
    _nodeChat = document.createElement("iframe");
    _nodeChat.src = sAddress;
    _nodeChat.id = "chat2";
    _nodeChat.addEventListener("load", AddHandlerExceptions(handleLoadChat));
    _nodeChat.addEventListener("error", AddHandlerExceptions(handleErrorChat));
    getShell().insertAdjacentElement("afterbegin", _nodeChat);
    scheduleCheck();
  }
  function RemovePanel() {
    stopCheck();
    hideReload();
    _isCancelledAutoreload = false;
    _countFailuresCheck = 0;
    if (_nodeChat) {
      m_Log.Here(`[Chat] Removing iframe ${_nodeChat.src}`);
      m_Twitch.closeChat();
      _nodeChat.remove();
      _nodeChat = null;
    }
  }
  function ApplyAddress() {
    if (_nodeChat) {
      m_Log.Ok("[Chat] Changing address iframe");
      RemovePanel();
      InsertPanel();
    }
  }
  function ReloadPanel() {
    if (m_Settings.Get("nStateChat") === CHAT_UNLOADED) {
      return;
    }
    m_Log.Ok("[Chat] Reloading iframe");
    hideReload();
    if (_nodeChat) {
      RemovePanel();
    }
    InsertPanel(true);
  }
  function ApplyStatePanel() {
    const nState = m_Settings.Get("nStateChat");
    m_Log.Ok(`[Chat] New state panel: ${nState}`);
    CancelDragPanel();
    switch (nState) {
      case CHAT_UNLOADED:
        document.body.classList.add("hidechat");
        RemovePanel();
        break;

      case CHAT_HIDDEN:
        InsertPanel();
        document.body.classList.add("hidechat");
        break;

      case CHAT_PANEL:
        InsertPanel();
        document.body.classList.remove("hidechat");
        break;

      default:
        Assert(false);
    }
    m_MediaRequest.updateSlow();
  }
  function ApplyPositionPanel() {
    CancelDragPanel();
    const oClasses = document.body.classList;
    if (m_Settings.Get("isAutoPositionChat")) {
      oClasses.add("chatautoposition");
      oClasses.toggle(
        "chatontop",
        m_Settings.Get("nVerticalPositionChat") === TOP_SIDE,
      );
      oClasses.toggle(
        "chatonleft",
        m_Settings.Get("nHorizontalPositionChat") === LEFT_SIDE,
      );
    } else {
      const nPosition = m_Settings.Get("nPositionPanelChat");
      oClasses.remove("chatautoposition");
      oClasses.toggle("chatontop", nPosition === TOP_SIDE);
      oClasses.toggle("chatonright", nPosition === RIGHT_SIDE);
      oClasses.toggle("chatonbottom", nPosition === BOTTOM_SIDE);
      oClasses.toggle("chatonleft", nPosition === LEFT_SIDE);
    }
    applySizePanel();
    m_MediaRequest.updateSlow();
  }
  function SaveAndApplyStateClosedPanel(nNewState) {
    m_Settings.Change("nStateClosedChat", nNewState);
    const nState = m_Settings.Get("nStateChat");
    if (
      (nState === CHAT_UNLOADED || nState === CHAT_HIDDEN) &&
      nState !== nNewState
    ) {
      m_Settings.Change("nStateChat", nNewState);
      ApplyStatePanel();
    }
  }
  function ToggleStatePanel() {
    const isFullscreenMode = m_FullscreenMode.Enabled();
    switch (m_Settings.Get("nStateChat")) {
      case CHAT_UNLOADED:
      case CHAT_HIDDEN:
        m_Settings.Change("nStateChat", CHAT_PANEL, isFullscreenMode);
        break;

      case CHAT_PANEL:
        m_Settings.Change(
          "nStateChat",
          isFullscreenMode ? CHAT_HIDDEN : m_Settings.Get("nStateClosedChat"),
          isFullscreenMode,
        );
        break;

      default:
        Assert(false);
    }
    ApplyStatePanel();
  }
  function TogglePositionPanel() {
    if (m_Settings.Get("nStateChat") !== CHAT_PANEL) {
      return;
    }
    let nPosition;
    if (m_Settings.Get("isAutoPositionChat")) {
      m_Settings.Change("isAutoPositionChat", false);
      nPosition = GetPositionPanel();
    } else {
      nPosition = m_Settings.Get("nPositionPanelChat");
    }
    switch (nPosition) {
      case TOP_SIDE:
        m_Settings.Change("nPositionPanelChat", RIGHT_SIDE);
        break;

      case RIGHT_SIDE:
        m_Settings.Change("nPositionPanelChat", BOTTOM_SIDE);
        break;

      case BOTTOM_SIDE:
        m_Settings.Change("nPositionPanelChat", LEFT_SIDE);
        break;

      case LEFT_SIDE:
        m_Settings.Change("nPositionPanelChat", TOP_SIDE);
        break;

      default:
        Assert(false);
    }
    ApplyPositionPanel();
  }
  function HandleDragPanel(oParameters) {
    if (oParameters.isCancel) {
      return;
    }
    const nPosition = GetPositionPanel();
    if (
      oParameters.nStep !== 1 &&
      oParameters._nInitialPosition !== nPosition
    ) {
      m_Log.Oops(
        `[Chat] Position dragged panel changed3 s ${oParameters._nInitialPosition} on ${nPosition}`,
      );
      CancelDragPanel();
      return;
    }
    switch (oParameters.nStep) {
      case 1:
        oParameters._nInitialPosition = nPosition;
        if (nPosition === RIGHT_SIDE || nPosition === LEFT_SIDE) {
          oParameters._nInitialSize = Number.parseInt(
            getComputedStyle(getShell()).width,
            10,
          );
        } else {
          oParameters._nInitialSize = Number.parseInt(
            getComputedStyle(getShell()).height,
            10,
          );
        }
        break;

      case 2:
        if (nPosition === RIGHT_SIDE || nPosition === LEFT_SIDE) {
          if (oParameters.isChangedX) {
            const nMaxSize =
              Number.parseInt(
                getComputedStyle(byId("playerandchat")).width,
                10,
              ) -
              Number.parseInt(getComputedStyle(byId("player")).minWidth, 10);
            setSizePanel(
              Math.max(
                Math.min(
                  nPosition === LEFT_SIDE
                    ? oParameters._nInitialSize + oParameters.nChangeX
                    : oParameters._nInitialSize - oParameters.nChangeX,
                  nMaxSize,
                ),
                220,
              ),
              NaN,
            );
            m_MediaRequest.updateSlow();
          }
        } else if (oParameters.isChangedY) {
          const nMaxSize =
            Number.parseInt(
              getComputedStyle(byId("playerandchat")).height,
              10,
            ) - Number.parseInt(getComputedStyle(byId("player")).minHeight, 10);
          setSizePanel(
            NaN,
            Math.max(
              Math.min(
                nPosition === TOP_SIDE
                  ? oParameters._nInitialSize + oParameters.nChangeY
                  : oParameters._nInitialSize - oParameters.nChangeY,
                nMaxSize,
              ),
              0,
            ),
          );
          m_MediaRequest.updateSlow();
        }
        break;

      case 3:
        if (nPosition === RIGHT_SIDE || nPosition === LEFT_SIDE) {
          m_Settings.Change(
            "nWidthPanelChat",
            Number.parseInt(getComputedStyle(getShell()).width, 10),
          );
        } else {
          m_Settings.Change(
            "nHeightPanelChat",
            Number.parseInt(getComputedStyle(getShell()).height, 10),
          );
        }
        break;

      default:
        Assert(false);
    }
  }
  function CancelDragPanel() {
    m_Draghandle.CancelDrag("chatsize");
  }
  HandleChangeFullscreenMode.nStateInNormalMode = -1;
  function HandleChangeFullscreenMode(isEnabled) {
    if (isEnabled) {
      if (HandleChangeFullscreenMode.nStateInNormalMode === -1) {
        HandleChangeFullscreenMode.nStateInNormalMode =
          m_Settings.Get("nStateChat");
        if (HandleChangeFullscreenMode.nStateInNormalMode === CHAT_PANEL) {
          m_Settings.Change("nStateChat", CHAT_HIDDEN, true);
          ApplyStatePanel();
        }
      }
    } else if (HandleChangeFullscreenMode.nStateInNormalMode !== -1) {
      if (HandleChangeFullscreenMode.nStateInNormalMode === CHAT_PANEL) {
        m_Settings.Change("nStateChat", CHAT_PANEL);
        ApplyStatePanel();
      } else if (
        m_Settings.Get("nStateChat") === CHAT_HIDDEN &&
        m_Settings.Get("nStateClosedChat") === CHAT_UNLOADED
      ) {
        m_Settings.Change("nStateChat", CHAT_UNLOADED);
        ApplyStatePanel();
      }
      HandleChangeFullscreenMode.nStateInNormalMode = -1;
    }
  }
  function Restore() {
    ApplyStatePanel();
    ApplyPositionPanel();
    m_Event.AddHandler("draghandle-drag-chatsize", HandleDragPanel);
    m_Event.AddHandler("fullscreenMode-changed", HandleChangeFullscreenMode);
    byId("chat2-reload-now").addEventListener(
      "click",
      AddHandlerExceptions(() => {
        _isCancelledAutoreload = false;
        ReloadPanel();
      }),
    );
    byId("chat2-reload-cancel").addEventListener(
      "click",
      AddHandlerExceptions(cancelAutoreload),
    );
    window.addEventListener("offline", AddHandlerExceptions(handleLossNetwork));
    window.addEventListener(
      "online",
      AddHandlerExceptions(handleRestoreNetwork),
    );
    window.matchMedia("(min-aspect-ratio: 16/10)").addEventListener(
      "change",
      AddHandlerExceptions(() => {
        if (m_Settings.Get("isAutoPositionChat")) {
          applySizePanel();
        }
      }),
    );
  }
  return {
    Restore,
    ApplyPositionPanel,
    ApplyAddress,
    ReloadPanel,
    SaveAndApplyStateClosedPanel,
    ToggleStatePanel,
    TogglePositionPanel,
  };
})();

const m_Audiodevice = (() => {
  const DEVICE_BY_DEFAULT = "default";
  const DEVICE_FOR_COMMUNICATION = "communications";
  let _oMediaElement = null;
  function updateListDevicesAndChooseDevice() {
    const nodeListDevices = byId("audiodevice-list");
    m_Log.Ok("[Audiodevice] Getting list mediadevices");
    navigator.mediaDevices
      .enumerateDevices()
      .then(
        (objsMediadevice) => {
          if (!Array.isArray(objsMediadevice)) {
            m_Log.Oops("[Audiodevice] List audiodevices unavailable");
            ShowElement("audiodevice", false);
            return;
          }
          nodeListDevices.length = 0;
          m_Log.Here(`[Audiodevice] Current device ${_oMediaElement.sinkId}`);
          const sCurrentDevice =
            _oMediaElement.sinkId === DEVICE_BY_DEFAULT
              ? ""
              : _oMediaElement.sinkId;
          const sSavedDevice = m_Settings.Get("sIdAudiodevice");
          let countDevices = 0,
            countRealDevices = 0;
          let isExistsDeviceByDefault = false,
            isExistsCurrentDevice = sCurrentDevice === "",
            isExistsSavedDevice = sSavedDevice === "";
          for (const oMediadevice of objsMediadevice) {
            m_Log.Here(
              `[Audiodevice] Mediadevice kind=${oMediadevice.kind} deviceId=${oMediadevice.deviceId} groupId=${oMediadevice.groupId} label=${oMediadevice.label}`,
            );
            if (oMediadevice.kind === "audiooutput") {
              countDevices++;
              if (oMediadevice.deviceId && oMediadevice.label) {
                countRealDevices +=
                  oMediadevice.deviceId !== DEVICE_BY_DEFAULT &&
                  oMediadevice.deviceId !== DEVICE_FOR_COMMUNICATION;
                isExistsDeviceByDefault =
                  isExistsDeviceByDefault ||
                  oMediadevice.deviceId === DEVICE_BY_DEFAULT;
                isExistsCurrentDevice =
                  isExistsCurrentDevice ||
                  oMediadevice.deviceId === sCurrentDevice;
                isExistsSavedDevice =
                  isExistsSavedDevice || oMediadevice.deviceId === sSavedDevice;
                nodeListDevices.add(
                  new Option(
                    oMediadevice.label,
                    oMediadevice.deviceId === DEVICE_BY_DEFAULT
                      ? ""
                      : oMediadevice.deviceId,
                  ),
                );
              }
            }
          }
          if (countDevices !== 0 && nodeListDevices.length === 0) {
            if (
              getVersionEngineBrowser() <= 68 &&
              chrome.extension.inIncognitoContext
            ) {
              ShowElement("audiodevice", false);
            } else {
              ShowElement("audiodevice-access", true);
              ShowElement(nodeListDevices, false);
              ShowElement("audiodevice", true);
              m_Event.AddHandler(
                "controls-leftclick",
                handleClickAndGetAccessToAudiodevices,
              );
            }
          } else {
            if (!isExistsDeviceByDefault && nodeListDevices.length !== 0) {
              nodeListDevices.add(new Option("Default", ""), 0);
            }
            nodeListDevices.value = sCurrentDevice;
            nodeListDevices.disabled = nodeListDevices.length === 0;
            ShowElement("audiodevice-access", false);
            ShowElement(nodeListDevices, true);
            if (countRealDevices > 1) {
              ShowElement("audiodevice", true);
              nodeListDevices.addEventListener("change", handleChoiceDevice);
            }
            let sChoose;
            if (isExistsSavedDevice && sSavedDevice !== sCurrentDevice) {
              sChoose = sSavedDevice;
            } else if (!isExistsCurrentDevice && nodeListDevices.length !== 0) {
              sChoose = "";
            }
            if (sChoose !== void 0) {
              m_Log.Ok(`[Audiodevice] Choosing device ${sChoose}`);
              return _oMediaElement.setSinkId(sChoose).then(
                () => {
                  m_Log.Here("[Audiodevice] Device chosen");
                  nodeListDevices.value = sChoose;
                },
                (pReason) => {
                  m_Log.Oops(
                    `[Audiodevice] Not succeeded choose device: ${pReason}`,
                  );
                },
              );
            }
          }
        },
        (pReason) => {
          m_Log.Oops(
            `[Audiodevice] Not succeeded get list mediadevices: ${pReason}`,
          );
          nodeListDevices.length = 0;
          nodeListDevices.disabled = true;
        },
      )
      .catch(m_Debug.CaughtException);
  }
  function handleClickAndGetAccessToAudiodevices({ sCallsign }) {
    if (sCallsign !== "audiodevice-access") {
      return;
    }
    m_Log.Ok("[Audiodevice] Requesting resolution contentSettings");
    chrome.permissions.request(
      {
        permissions: ["contentSettings"],
      },
      AddHandlerExceptions((isResolutionReceived) => {
        if (isResolutionReceived) {
          m_Log.Ok("[Audiodevice] Getting access count audiodevices2");
          chrome.contentSettings.microphone.set(
            {
              primaryPattern: `*://${chrome.runtime.id}/*`,
              setting: "allow",
              scope: chrome.extension.inIncognitoContext
                ? "incognito_session_only"
                : "regular",
            },
            AddHandlerExceptions(() => {
              if (chrome.runtime.lastError) {
                m_Log.Oops(
                  `[Audiodevice] Access not received: ${chrome.runtime.lastError.message}`,
                );
                m_Notice.ShowFail();
              }
              updateListDevicesAndChooseDevice();
            }),
          );
        } else {
          m_Log.Oops(
            `[Audiodevice] Resolution not received2: ${chrome.runtime.lastError && chrome.runtime.lastError.message}`,
          );
          m_Notice.ShowFail();
        }
      }),
    );
  }
  const handleChoiceDevice = AddHandlerExceptions((oEvent) => {
    if (oEvent.target.selectedIndex !== -1) {
      const sChoose = oEvent.target.value;
      m_Log.Ok(
        `[Audiodevice] Choosing device ${sChoose} instead ${_oMediaElement.sinkId}`,
      );
      _oMediaElement
        .setSinkId(sChoose)
        .then(
          () => {
            m_Log.Here("[Audiodevice] Device chosen");
            m_Settings.Change("sIdAudiodevice", sChoose);
          },
          (pReason) => {
            m_Log.Oops(`[Audiodevice] Not succeeded choose device: ${pReason}`);
            m_Notice.ShowFail();
            updateListDevicesAndChooseDevice();
          },
        )
        .catch(m_Debug.CaughtException);
    }
  });
  function start2(oMediaElement) {
    if (_oMediaElement) {
      return;
    }
    _oMediaElement = oMediaElement;
    if (!("setSinkId" in _oMediaElement)) {
      m_Log.Oops("[Audiodevice] Browser not supports MediaElement.setSinkId");
      return;
    }
    if (!("addEventListener" in navigator.mediaDevices)) {
      m_Log.Oops(
        "[Audiodevice] Browser not supports MediaDevices.ondevicechange",
      );
    } else {
      navigator.mediaDevices.addEventListener(
        "devicechange",
        AddHandlerExceptions(updateListDevicesAndChooseDevice),
      );
    }
    updateListDevicesAndChooseDevice();
  }
  return {
    start2,
  };
})();

const m_Player = (() => {
  const INTERVAL_REMOVAL_VIDEO = 10;
  const EXHAUSTION_BUFFER = (1 / 25) * 7;
  const REPLAY_AVAILABLE_IF_WATCHED = 1;
  const ASSERT_ADDITION_SEGMENT = -1;
  const ASSERT_START_PLAYBACK = -2;
  const ASSERT_PLAYBACK = -3;
  const ASSERT_STOP_PLAYBACK = -4;
  const PLAYBACK_IMPOSSIBLE = 0;
  const PLAYBACK_POSSIBLE = 1;
  const PLAYBACK_POSSIBLE_AFTER_SEEK = 2;
  let _oMediaElement;
  let _oMediaSource;
  let _oMediaSourceBuffer = null;
  let _isExistsVideotrack = false;
  let _nPlaybackStarted = 0;
  let _isAsyncOperation = false;
  let _sSizeBuffer = "nStartPlayback";
  let _isWaitFillBuffer = true;
  let _nOffsetBroadcast = NaN;
  let _isNeededSeek = false;
  const _oLiveBroadcast = {
    HandleSourceOpen() {
      Assert(_oMediaElement.paused);
      _nPlaybackStarted = Math.max(_nPlaybackStarted, 1);
      AddNextSegment();
    },
    HandleProgress() {
      if (!_isAsyncOperation) {
        StartPlayback(AssertPositionPlayback(ASSERT_ADDITION_SEGMENT));
      }
    },
    HandleWaiting() {},
    HandlePlaying() {
      releaseLastFrame();
      if (
        m_Controls.GetState() === STATE_START_PLAYBACK &&
        !_oMediaElement.paused
      ) {
        m_Controls.ChangeState(STATE_PLAYBACK);
      }
    },
    HandleSeeking: NOOP,
    HandleSeeked: StartPlayback,
    HandleEnded() {
      ReloadPlayer(STATE_LOAD);
    },
    HandleTimeUpdate() {
      if (
        !_oMediaElement.seeking &&
        !_oMediaElement.paused &&
        !_oMediaElement.ended
      ) {
        AssertPositionPlayback(ASSERT_PLAYBACK);
      }
    },
  };
  const _oReplay = {
    isPause: true,
    HandleSourceOpen() {
      Assert(_oMediaElement.paused);
      _nPlaybackStarted = Math.max(_nPlaybackStarted, 1);
    },
    HandleProgress: NOOP,
    HandleWaiting: NOOP,
    HandlePlaying: NOOP,
    HandleSeeked: NOOP,
    HandleSeeking() {
      m_Scale.SetWatched(_oMediaElement.currentTime);
    },
    HandleEnded() {
      if (!this.isPause) {
        _oMediaElement.play();
      }
    },
    HandleTimeUpdate() {
      if (!this.isPause && !_oMediaElement.seeking) {
        this.AssertPositionPlayback(ASSERT_PLAYBACK);
      }
      m_Scale.SetWatched(_oMediaElement.currentTime);
    },
    AssertPositionPlayback(nTime) {
      Assert(Number.isFinite(nTime));
      Assert(
        nTime === ASSERT_START_PLAYBACK ||
          nTime === ASSERT_PLAYBACK ||
          nTime >= 0,
      );
      const oBuffer = _oMediaElement.buffered;
      const nLastArea = oBuffer.length - 1;
      const nCurrentTime = _oMediaElement.currentTime + 1e-4;
      let nSeekUntil = nTime >= 0 ? nTime : nCurrentTime;
      let sReasonSeek = "";
      for (let isStartFirst = false; ;) {
        let nNeedForPlayback =
          nTime === ASSERT_PLAYBACK ? EXHAUSTION_BUFFER : MIN_SIZE_BUFFER;
        for (let nArea = 0; nArea <= nLastArea; ++nArea) {
          if (nSeekUntil < oBuffer.start(nArea)) {
            nNeedForPlayback = MIN_SIZE_BUFFER;
            sReasonSeek += "Skipping pit. ";
            nSeekUntil = oBuffer.start(nArea);
          }
          if (oBuffer.end(nArea) - nSeekUntil >= nNeedForPlayback) {
            break;
          }
        }
        if (this.isPause || nSeekUntil < m_Scale.GetEnd()) {
          break;
        }
        if (isStartFirst) {
          ShowState("Oops", `Infinite seek Time=${nTime}`);
          return;
        }
        nSeekUntil = m_Scale.GetStart();
        sReasonSeek += "Starting first. ";
        isStartFirst = true;
      }
      if (nSeekUntil !== nCurrentTime) {
        ShowState("Ok", `${sReasonSeek}Seeking until ${nSeekUntil}`);
        _oMediaElement.currentTime = nSeekUntil;
      }
    },
  };
  let _oBehavior = _oLiveBroadcast;
  function ShowState(sImportance, sRecording) {
    const oBuffer =
      _oMediaSource.sourceBuffers.length !== 0
        ? _oMediaSource.sourceBuffers[0]
        : null;
    const sAreaBuffer = ConvertAreaInString(oBuffer ? oBuffer.buffered : null);
    const sArea = ConvertAreaInString(_oMediaElement.buffered);
    const isAreaEqual = sAreaBuffer === sArea;
    if (
      sImportance === "Here" &&
      ((oBuffer && oBuffer.buffered.length > 1) ||
        _oMediaElement.buffered.length > 1)
    ) {
      sImportance = "Ok";
    }
    if (_oMediaElement.error || !isAreaEqual) {
      sImportance = "Oops";
    }
    m_Log[sImportance](
      `${sRecording.charAt(0) === "[" ? "" : "[Player] "}${sRecording} •••` +
        (oBuffer && oBuffer.updating ? " [U]" : "") +
        (_oMediaElement.paused ? " [P]" : "") +
        (_oMediaElement.seeking ? " [S]" : "") +
        (_oMediaElement.ended ? " [E]" : "") +
        (_oMediaElement.error ? ` error=${_oMediaElement.error.code}` : "") +
        (_oMediaElement.src.startsWith("blob:") ||
        _oMediaElement.src.startsWith("mediasource:")
          ? ""
          : ` src=${_oMediaElement.src}`) +
        (_oMediaSource.readyState === "open"
          ? ""
          : ` MSE.readyState=${_oMediaSource.readyState}`) +
        (_oMediaSource.sourceBuffers.length === 1
          ? ""
          : ` MSE.buffers=${_oMediaSource.sourceBuffers.length}`) +
        (_oMediaElement.networkState === HTMLMediaElement.NETWORK_LOADING
          ? ""
          : ` networkState=${_oMediaElement.networkState}`) +
        ` readyState=${_oMediaElement.readyState}` +
        ` currentTime=${_oMediaElement.currentTime}` +
        (isAreaEqual
          ? ` buffered=${sArea}`
          : ` MSE.buffered=${sAreaBuffer} buffered=${sArea}`) +
        (_oMediaElement.duration === Infinity
          ? ""
          : ` duration=${_oMediaElement.duration}`) +
        ` seekable=${ConvertAreaInString(_oMediaElement.seekable)}` +
        ` played=${ConvertAreaInString(_oMediaElement.played)}`,
    );
  }
  function ConvertAreaInString(oArea) {
    let sResult = "";
    if (oArea && oArea.length !== 0) {
      let nArea = Math.max(oArea.length - 5, 0);
      if (nArea !== 0) {
        sResult = `[${nArea}]`;
      }
      for (; nArea < oArea.length; ++nArea) {
        if (nArea !== 0) {
          sResult += `(${(oArea.start(nArea) - oArea.end(nArea - 1)).toFixed(3)})`;
        }
        sResult += `${oArea.start(nArea)}-${oArea.end(nArea)}`;
      }
    }
    return sResult;
  }
  function GetFillBuffer(oBuffer = _oMediaElement.buffered) {
    let nWatched = 0;
    let nNotWatched = 0;
    if (oBuffer.length !== 0) {
      const nStart = oBuffer.start(0);
      const nEnd = oBuffer.end(oBuffer.length - 1);
      const nCurrentTime = Clamp(_oMediaElement.currentTime, nStart, nEnd);
      nWatched = nCurrentTime - nStart;
      nNotWatched = nEnd - nCurrentTime;
    }
    return {
      nWatched,
      nNotWatched,
    };
  }
  function GetCountSkippedFrames() {
    return _oMediaElement.getVideoPlaybackQuality
      ? _oMediaElement.getVideoPlaybackQuality()
      : {
          totalVideoFrames: _oMediaElement.webkitDecodedFrameCount,
          droppedVideoFrames: _oMediaElement.webkitDroppedFrameCount,
        };
  }
  function GetPositionPlaybackBroadcast(isForClip) {
    if (Number.isNaN(_nOffsetBroadcast)) {
      return -1;
    }
    WatchForErrors();
    let nPosition2 = _oMediaElement.currentTime;
    if (isForClip && m_Controls.GetState() === STATE_REPLAY) {
      nPosition2 = m_Scale.GetEnd();
    }
    if (!isForClip && nPosition2 === 0 && _oMediaSourceBuffer !== null) {
      if (_oMediaSourceBuffer.buffered.length !== 0) {
        nPosition2 = _oMediaSourceBuffer.buffered.start(0);
      }
    }
    return nPosition2 === 0 ? -1 : Math.max(nPosition2 + _nOffsetBroadcast, 0);
  }
  function CalculateOffsetBroadcast(oSegment) {
    if (
      Number.isFinite(oSegment.pData.nPositionEncoding) &&
      Number.isFinite(oSegment.pData.nPositionBroadcast)
    ) {
      const nOffsetBroadcast =
        oSegment.pData.nPositionBroadcast - oSegment.pData.nPositionEncoding;
      m_Log[
        Math.abs(nOffsetBroadcast - _nOffsetBroadcast) > 2 ? "Oops" : "Here"
      ](`[Player] Offset broadcast: ${m_Log.F1(nOffsetBroadcast)}s`);
      _nOffsetBroadcast = nOffsetBroadcast;
    }
  }
  function ShowLatencyBroadcast(oSegment) {
    if (!(
      Number.isFinite(oSegment.pData.nPositionEncoding) &&
      Number.isFinite(oSegment.pData.nTimeEncoding) &&
      _oMediaElement.currentTime !== 0
    )) {
      return;
    }
    const nReceipt =
      (performance.now() + g_nExactTime - oSegment.pData.nTimeEncoding) / 1e3;
    const nPlayback =
      oSegment.pData.nPositionEncoding - _oMediaElement.currentTime;
    g_nLatencyBroadcast = nReceipt + nPlayback;
    showLatencyOnPanel(g_nLatencyBroadcast);
    if (m_Stats.WindowOpen()) {
      const sLatency = `${nReceipt.toFixed(1)} + ${nPlayback.toFixed(1)} = ${g_nLatencyBroadcast.toFixed(1)}`;
      m_Log[nReceipt > 0 && nPlayback > -0.1 ? "Here" : "Oops"](
        `[Player] Latency broadcast: ${sLatency}s`,
      );
      byId("stats-broadcastlatency").textContent = sLatency;
    }
  }
  function ApplyVolume() {
    _oMediaElement.volume = m_Settings.Get("nVolume2") / MAXIMUM_VOLUME;
    _oMediaElement.muted = m_Settings.Get("isMute");
  }
  let _nTimerFrame = 0;
  function holdLastFrame() {
    const canvas = byId("frame2");
    if (_oMediaElement.readyState < 2 || !_oMediaElement.videoWidth) {
      return;
    }
    if (
      canvas.width !== _oMediaElement.videoWidth ||
      canvas.height !== _oMediaElement.videoHeight
    ) {
      canvas.width = _oMediaElement.videoWidth;
      canvas.height = _oMediaElement.videoHeight;
    }
    canvas
      .getContext("2d")
      .drawImage(_oMediaElement, 0, 0, canvas.width, canvas.height);
    canvas.classList.toggle(
      "scale2",
      _oMediaElement.classList.contains("scale2"),
    );
    canvas.hidden = false;
    clearTimeout(_nTimerFrame);
    _nTimerFrame = setTimeout(releaseLastFrame, 12000);
  }
  function releaseLastFrame() {
    clearTimeout(_nTimerFrame);
    _nTimerFrame = 0;
    byId("frame2").hidden = true;
  }
  function ReloadAndWaitFillBuffer(nNewState) {
    _isWaitFillBuffer = true;
    ReloadPlayer(nNewState);
  }
  function ReloadPlayer(nNewState) {
    holdLastFrame();
    ShowState("Ok", "Reload2 player2");
    m_Controls.ChangeState(nNewState);
    _oBehavior = _oLiveBroadcast;
    _oMediaSourceBuffer = null;
    _isNeededSeek = false;
    CreateMediaSource();
    connectMediaSourceToMediaElement();
  }
  function WatchForErrors() {
    if (_oMediaElement.error) {
      m_Debug.FinishWorkAndShowMessage("J0206");
    }
  }
  const WatchForEventsMediaSource = AddHandlerExceptions((oEvent) => {
    WatchForErrors();
    const sRecording = `[MediaSource] ${oEvent.type}`;
    switch (oEvent.type) {
      case "sourceopen":
        ShowState("Here", sRecording);
        _oBehavior.HandleSourceOpen();
        break;

      case "sourceended":
      case "sourceclose":
        ShowState("Here", sRecording);
        break;

      default:
        m_Log.Here(sRecording);
    }
  });
  const WatchForEventsMediaElement = AddHandlerExceptions((oEvent) => {
    WatchForErrors();
    const sRecording = `[MediaElement] ${oEvent.type}`;
    switch (oEvent.type) {
      case "loadstart":
        ShowState(
          "Here",
          `${sRecording} src=${_oMediaElement.src} currentSrc=${_oMediaElement.currentSrc}`,
        );
        break;

      case "progress":
        ShowState("Here", sRecording);
        _oBehavior.HandleProgress();
        break;

      case "abort":
        ShowState("Here", sRecording);
        break;

      case "waiting":
        ShowState("Ok", sRecording);
        _oBehavior.HandleWaiting();
        break;

      case "playing":
        ShowState("Here", sRecording);
        m_Debug.resetCounterAutoreload();
        _oBehavior.HandlePlaying();
        break;

      case "seeking":
        ShowState("Here", sRecording);
        _oBehavior.HandleSeeking();
        break;

      case "seeked":
        ShowState("Here", sRecording);
        _oBehavior.HandleSeeked();
        break;

      case "ended":
        ShowState("Here", sRecording);
        _oBehavior.HandleEnded();
        break;

      case "timeupdate":
        m_Log.Here(
          `${sRecording} readyState=${_oMediaElement.readyState} currentTime=${_oMediaElement.currentTime} NotWatched=${m_Log.F2(GetFillBuffer().nNotWatched)}`,
        );
        _oBehavior.HandleTimeUpdate();
        break;

      default:
        m_Log.Here(sRecording);
    }
  });
  function AssertPositionPlayback(nSourceCheck, nWillAdded = 0) {
    const oBuffer = _oMediaElement.buffered;
    const nLastArea = oBuffer.length - 1;
    if (nLastArea === -1) {
      return false;
    }
    const nCurrentTime = _oMediaElement.currentTime + 1e-4;
    let nSeekUntil = Math.max(nCurrentTime, oBuffer.start(0));
    let sReasonSeek = "";
    const nNotWatched = oBuffer.end(nLastArea) - nSeekUntil;
    if (nSourceCheck === ASSERT_ADDITION_SEGMENT) {
      const nSizeBuffer = m_Settings.Get("nMaxSizeBuffer");
      const nOverflow = nSizeBuffer + m_Settings.Get("nStretchBuffer");
      if (nNotWatched <= nOverflow) {
        return;
      }
      if (_nPlaybackStarted === 2) {
        m_Event.DispatchEvent(
          "player-bufferoverflowed",
          nNotWatched - nSizeBuffer,
        );
      }
      sReasonSeek += `Overflowed buffer player2 ${nNotWatched.toFixed(2)}s > ${nOverflow}s. `;
      nSeekUntil = oBuffer.end(nLastArea) - nSizeBuffer - 0.1;
    }
    if (nSourceCheck === ASSERT_START_PLAYBACK && _nPlaybackStarted !== 2) {
      _nPlaybackStarted = 2;
      const nOverflow =
        m_Settings.Get("nMaxSizeBuffer") + m_Stats.GetTargetDuration() / 2;
      if (nNotWatched > nOverflow) {
        sReasonSeek += `Exceeded2 latency broadcast ${nNotWatched.toFixed(2)}s > ${nOverflow}s. `;
        nSeekUntil = oBuffer.end(nLastArea) - nOverflow;
      }
    }
    Assert(EXHAUSTION_BUFFER < MIN_SIZE_BUFFER);
    let nNeedForPlayback =
      nSourceCheck === ASSERT_PLAYBACK
        ? EXHAUSTION_BUFFER
        : nSourceCheck === ASSERT_STOP_PLAYBACK
          ? Infinity
          : MIN_SIZE_BUFFER;
    let isPlaybackPossible = _oMediaSource.readyState === "ended";
    let nUntilEndArea;
    for (let nArea = 0; nArea <= nLastArea; ++nArea) {
      if (nSeekUntil < oBuffer.start(nArea)) {
        nNeedForPlayback = MIN_SIZE_BUFFER;
        sReasonSeek += "Skipping pit. ";
        nSeekUntil = oBuffer.start(nArea);
      }
      nUntilEndArea = oBuffer.end(nArea) - nSeekUntil;
      if (nUntilEndArea >= nNeedForPlayback) {
        isPlaybackPossible = true;
        break;
      }
    }
    if (!isPlaybackPossible && !_oMediaElement.paused) {
      BufferExhausted(nUntilEndArea, nNotWatched, nWillAdded);
    }
    if (
      (isPlaybackPossible || nSourceCheck === ASSERT_ADDITION_SEGMENT) &&
      (nSeekUntil !== nCurrentTime || _isNeededSeek)
    ) {
      if (nSeekUntil === nCurrentTime) {
        nSeekUntil = _oMediaElement.currentTime;
      }
      ShowState(
        sReasonSeek ? "Oops" : "Ok",
        `${sReasonSeek}Seeking until ${nSeekUntil}`,
      );
      _isNeededSeek = false;
      _oMediaElement.currentTime = nSeekUntil;
      return PLAYBACK_POSSIBLE_AFTER_SEEK;
    }
    return isPlaybackPossible ? PLAYBACK_POSSIBLE : PLAYBACK_IMPOSSIBLE;
  }
  function StartPlayback(nCheck) {
    if (
      _oMediaElement.seeking ||
      nCheck === PLAYBACK_POSSIBLE_AFTER_SEEK ||
      !_oMediaElement.paused ||
      _oMediaElement.ended
    ) {
      return;
    }
    if (_isWaitFillBuffer && _oMediaSource.readyState !== "ended") {
      const { nNotWatched } = GetFillBuffer();
      const nSizeBuffer = m_Settings.Get(_sSizeBuffer);
      if (nNotWatched < nSizeBuffer) {
        m_Log.Here(
          `[Player] IN buffer2 not watched ${m_Log.F3(nNotWatched)}s < ${nSizeBuffer}s`,
        );
        return;
      }
      m_Log.Ok(
        `[Player] IN buffer2 not watched ${m_Log.F3(nNotWatched)}s >= ${nSizeBuffer}s`,
      );
    } else {
      m_Log.Ok("[Player] Not need wait fill buffer3");
    }
    switch (AssertPositionPlayback(ASSERT_START_PLAYBACK)) {
      case PLAYBACK_IMPOSSIBLE:
        ShowState(
          "Oops",
          `Not found area >= ${MIN_SIZE_BUFFER}s for start3 playback`,
        );
        _isWaitFillBuffer = true;
        break;

      case PLAYBACK_POSSIBLE:
        ShowState("Ok", "Start2 playback");
        _isWaitFillBuffer = true;
        _oMediaElement.play();
        m_Controls.ChangeState(STATE_START_PLAYBACK);
    }
  }
  function StopPlayback(nNewState) {
    if (nNewState !== void 0) {
      m_Controls.ChangeState(nNewState);
    }
    _oMediaElement.pause();
  }
  function BufferExhausted(nUntilEndLastArea, nNotWatched, nWillAdded) {
    Assert(_oMediaSource.readyState !== "ended");
    Assert(nUntilEndLastArea < MIN_SIZE_BUFFER);
    const isEarly = nNotWatched > 1;
    m_Stats.ExhaustedBufferPlayer(isEarly);
    _sSizeBuffer = "nMaxSizeBuffer";
    const nSizeBuffer = m_Settings.Get(_sSizeBuffer);
    if (
      nUntilEndLastArea + nWillAdded >= MIN_SIZE_BUFFER &&
      nNotWatched + nWillAdded >= nSizeBuffer
    ) {
      ShowState(
        isEarly ? "Oops" : "Ok",
        `Buffer exhausted2, stop2 not needed WillAdded=${m_Log.F3(nWillAdded)}s UntilEndLastArea=${m_Log.F3(nUntilEndLastArea)}s NotWatched=${m_Log.F3(nNotWatched)}s SizeBuffer=${nSizeBuffer}s`,
      );
    } else {
      ShowState(
        isEarly ? "Oops" : "Ok",
        `Pausing playback2 for fill buffer3 UntilEndLastArea=${m_Log.F3(nUntilEndLastArea)}s NotWatched=${m_Log.F3(nNotWatched)}s SizeBuffer=${nSizeBuffer}s`,
      );
      _isNeededSeek = true;
      StopPlayback(STATE_LOAD);
    }
  }
  function FinishStream(oSegment) {
    ShowState("Ok", `Segment ${oSegment.nNumber} caused ending stream`);
    if (
      _oMediaElement.buffered.length === 0 ||
      (_oMediaElement.paused &&
        GetFillBuffer().nNotWatched < EXHAUSTION_BUFFER + 0.1)
    ) {
      ReloadAndWaitFillBuffer(STATE_LOAD);
    } else {
      _isWaitFillBuffer =
        typeof oSegment.pData == "number" ||
        (!_oMediaElement.seeking && _oMediaElement.paused);
      _oMediaSource.endOfStream();
      StartPlayback();
    }
  }
  function RemoveWatchedVideo(oSegment) {
    const MAX_DURATION_REPLAY_AUDIO = 640;
    WatchForErrors();
    let nDurationReplay = m_Settings.Get("nDurationReplay2");
    if (nDurationReplay === AUTOTUNE) {
      if (_isExistsVideotrack) {
        return Promise.resolve(oSegment);
      }
      nDurationReplay = MAX_DURATION_REPLAY_AUDIO;
    }
    const { nWatched } = GetFillBuffer(_oMediaSourceBuffer.buffered);
    if (nWatched < nDurationReplay + INTERVAL_REMOVAL_VIDEO) {
      return Promise.resolve(oSegment);
    }
    const nRemoveUntil = _oMediaElement.currentTime - nDurationReplay;
    return new Promise((fnExecute, fnGiveup) => {
      ShowState(
        "Here",
        `Removing watched2 video Watched=${m_Log.F3(nWatched)}s RemoveUntil=${m_Log.F3(nRemoveUntil)}s`,
      );
      _oMediaSourceBuffer.addEventListener("updateend", Removed);
      let nPassedTime = -performance.now();
      _oMediaSourceBuffer.remove(0, nRemoveUntil);
      function Removed() {
        try {
          if (_oMediaSourceBuffer === null) {
            fnGiveup(CancelPromise.REASON);
          } else {
            nPassedTime += performance.now();
            _oMediaSourceBuffer.removeEventListener("updateend", Removed);
            const { nWatched } = GetFillBuffer(_oMediaSourceBuffer.buffered);
            ShowState(
              nPassedTime > 100 || nWatched < MIN_SIZE_BUFFER ? "Oops" : "Here",
              `Watched2 video removed for2 ${m_Log.F0(nPassedTime)}strs Watched=${m_Log.F0(nWatched)}s`,
            );
            fnExecute(oSegment);
          }
        } catch (pException) {
          fnGiveup(pException);
        }
      }
    });
  }
  function AddSegmentInit(oSegment) {
    return AddSegment(oSegment, oSegment.pData.mbSegmentInit, "segment init");
  }
  function AddMediasegment(oSegment) {
    return AddSegment(oSegment, oSegment.pData.mbMediasegment, "mediasegment");
  }
  function AddSegment(oSegment, mbAdd, sAdd) {
    WatchForErrors();
    return new Promise((fnExecute, fnGiveup) => {
      ShowState("Here", `Adding ${sAdd} ${oSegment.nNumber}`);
      _oMediaSourceBuffer.addEventListener("updateend", Added2);
      let nPassedTime = -performance.now();
      _oMediaSourceBuffer.appendBuffer(mbAdd);
      function Added2() {
        try {
          if (_oMediaSourceBuffer === null) {
            fnGiveup(CancelPromise.REASON);
          } else {
            nPassedTime += performance.now();
            _oMediaSourceBuffer.removeEventListener("updateend", Added2);
            ShowState(
              nPassedTime > 100 ? "Oops" : "Here",
              `Added ${sAdd} ${oSegment.nNumber} for2 ${m_Log.F0(nPassedTime)}strs`,
            );
            fnExecute(oSegment);
          }
        } catch (pException) {
          fnGiveup(pException);
        }
      }
    });
  }
  function AssertExhaustionBuffer(oSegment) {
    if (
      !_oMediaElement.seeking &&
      !_oMediaElement.paused &&
      !_oMediaElement.ended
    ) {
      AssertPositionPlayback(ASSERT_PLAYBACK, oSegment.nDuration);
    }
    if (_oMediaElement.played.length !== 0) {
      m_Stats.updateFillBuffer(GetFillBuffer().nNotWatched);
    }
    return oSegment;
  }
  function SegmentWasAdded(oSegment) {
    _isAsyncOperation = false;
    g_objsQueue.Remove(oSegment);
    CalculateOffsetBroadcast(oSegment);
    if (!(g_objsQueue[0] && g_objsQueue[0].pData === STATE_REPLAY)) {
      const nCheck = AssertPositionPlayback(ASSERT_ADDITION_SEGMENT);
      if (!(
        g_objsQueue[0] && g_objsQueue[0].nHandling === HANDLING_CONVERTED
      )) {
        StartPlayback(nCheck);
        ShowLatencyBroadcast(oSegment);
      }
    }
    AddNextSegment();
  }
  const SegmentNotWasAdded = AddHandlerExceptions((pReason) => {
    _isAsyncOperation = false;
    if (pReason === "ADDITION SEGMENT DEFERRED") {
      return;
    }
    if (pReason === CancelPromise.REASON) {
      m_Log.Here("[Player] Cancelled addition segment3");
    } else {
      throw pReason;
    }
  });
  function PreventOverflowQueue() {
    const { nDuration } = g_objsQueue.CountConvertedSegments();
    if (nDuration >= OVERFLOW_BUFFER) {
      m_Log.Oops(
        `[Player] MediaSource closed too long ${nDuration}s >= ${OVERFLOW_BUFFER}s`,
      );
      Assert(
        m_Controls.GetState() === STATE_START ||
          m_Controls.GetState() === STATE_START_BROADCAST,
      );
      m_Controls.StopWatchBroadcast();
    }
  }
  function FindAndHandleSwitchVariantBroadcast() {
    for (let idx = g_objsQueue.length; --idx >= 0;) {
      if (
        g_objsQueue[idx].pData === STATE_SWITCH_VARIANT &&
        g_objsQueue[idx].nHandling === HANDLING_CONVERTED
      ) {
        g_objsQueue.ShowState();
        do {
          if (
            g_objsQueue[idx].pData === STATE_SWITCH_VARIANT ||
            typeof g_objsQueue[idx].pData != "number"
          ) {
            g_objsQueue.Remove(idx);
          }
        } while (--idx >= 0);
        g_objsQueue.ShowState();
        ReloadAndWaitFillBuffer(STATE_LOAD);
        break;
      }
    }
  }
  function AddNextSegment() {
    WatchForErrors();
    FindAndHandleSwitchVariantBroadcast();
    const oSegment = g_objsQueue[0];
    if (!oSegment || oSegment.nHandling !== HANDLING_CONVERTED) {
      return;
    }
    Assert(_oBehavior === _oLiveBroadcast);
    if (oSegment.pData === STATE_START_BROADCAST) {
      Assert(_oMediaSource.sourceBuffers.length === 0);
      _nOffsetBroadcast = NaN;
      m_Controls.ChangeState(oSegment.pData);
      g_objsQueue.Remove(0);
      AddNextSegment();
      return;
    }
    if (_isAsyncOperation) {
      return;
    }
    if (oSegment.pData === STATE_REPLAY) {
      Assert(
        m_Controls.GetState() !== STATE_STOP &&
          m_Controls.GetState() !== STATE_REPLAY,
      );
      StartReplay();
      g_objsQueue.Remove(0);
      AddNextSegment();
      return;
    }
    const sReadiness = _oMediaSource.readyState;
    if (sReadiness !== "open") {
      m_Log.Here(
        `[Player] Addition segment3 ${oSegment.nNumber} deferred MediaSource.readyState=${sReadiness} MediaElement.src=${_oMediaElement.src}`,
      );
      if (sReadiness === "closed" && _nPlaybackStarted === 0) {
        PreventOverflowQueue();
      }
      return;
    }
    if (oSegment.isDiscontinuity && _oMediaSource.sourceBuffers.length !== 0) {
      FinishStream(oSegment);
      return;
    }
    if (oSegment.pData === STATE_FINISH_BROADCAST) {
      Assert(
        oSegment.isDiscontinuity && _oMediaSource.sourceBuffers.length === 0,
      );
      m_Controls.ChangeState(oSegment.pData);
      g_objsQueue.Remove(0);
      AddNextSegment();
      return;
    }
    if (_oMediaSource.sourceBuffers.length === 0) {
      AddBuffers(oSegment);
      m_Controls.UpdateCountTracks(
        oSegment.pData.isExistsVideo,
        oSegment.pData.isExistsAudio,
      );
    }
    _isAsyncOperation = true;
    let oPromise = RemoveWatchedVideo(oSegment).then(AssertExhaustionBuffer);
    if (oSegment.pData.mbSegmentInit) {
      oPromise = oPromise.then(AddSegmentInit);
    }
    oPromise
      .then(AddMediasegment)
      .then(SegmentWasAdded)
      .catch(SegmentNotWasAdded);
  }
  function SeekReplayUntil(nSeekUntil) {
    Assert(m_Controls.GetState() === STATE_REPLAY);
    _oReplay.AssertPositionPlayback(nSeekUntil);
  }
  function SeekReplayOn(isFrames, nSeekOn) {
    Assert(m_Controls.GetState() === STATE_REPLAY);
    Assert(Number.isFinite(nSeekOn));
    if (isFrames) {
      nSeekOn *= m_Stats.GetDurationFrameInSeconds().nMinimum3;
    }
    if (nSeekOn !== 0) {
      SeekReplayUntil(
        Clamp(
          _oMediaElement.currentTime + nSeekOn,
          m_Scale.GetStart(),
          m_Scale.GetEnd(),
        ),
      );
    }
  }
  function TogglePause() {
    Assert(m_Controls.GetState() === STATE_REPLAY);
    if ((_oReplay.isPause = !_oReplay.isPause)) {
      m_Log.Ok("[Player] Setting replay on pause2");
      _oMediaElement.pause();
    } else {
      m_Log.Ok("[Player] Clearing replay s pause3");
      _oReplay.AssertPositionPlayback(ASSERT_START_PLAYBACK);
      _oMediaElement.play();
    }
    m_Event.DispatchEvent("player-pause", _oReplay.isPause);
  }
  function SetSpeedReplay(nSpeed) {
    Assert(nSpeed > 0);
    Assert(m_Controls.GetState() === STATE_REPLAY);
    m_Log.Ok(`[Player] Set speed ${nSpeed}`);
    _oMediaElement.playbackRate = nSpeed;
  }
  function StartReplay() {
    _oReplay.isPause = true;
    _oBehavior = _oReplay;
    StopPlayback();
    if (
      _oMediaSource.sourceBuffers.length !== 0 &&
      _oMediaSource.readyState === "open"
    ) {
      _oMediaSource.endOfStream();
    }
    if (
      _oMediaElement.played.length === 0 ||
      GetFillBuffer().nWatched < REPLAY_AVAILABLE_IF_WATCHED
    ) {
      ShowState("Ok", "Repeat nothing");
      m_Controls.ChangeState(STATE_STOP);
      return;
    }
    ShowState("Ok", "Start3 replay2");
    m_Event.DispatchEvent("player-pause", _oReplay.isPause);
    m_Scale.SetStartAndEnd(
      _oMediaElement.buffered.start(0),
      _oMediaElement.buffered.end(_oMediaElement.buffered.length - 1),
    );
    m_Scale.SetWatched(_oMediaElement.currentTime);
    m_Controls.ChangeState(STATE_REPLAY);
    SetSpeedReplay(m_Controls.getSpeedReplay());
  }
  function AddBuffers(oSegment) {
    m_Log.Ok(`[Player] Adding buffer ${oSegment.pData.sCodecs}`);
    Assert(oSegment.isDiscontinuity && oSegment.pData.sCodecs);
    try {
      _oMediaSourceBuffer = _oMediaSource.addSourceBuffer(
        oSegment.pData.sCodecs,
      );
    } catch (pException) {
      if (ThisObject(pException) && pException.name === "NotSupportedError") {
        m_Debug.FinishWorkAndShowMessage("J0201");
      } else {
        m_Debug.CaughtException(pException);
      }
    }
    _isExistsVideotrack = oSegment.pData.isExistsVideo;
    _oMediaSourceBuffer.addEventListener(
      "updatestart",
      WatchForEventsMediaSource,
    );
    _oMediaSourceBuffer.addEventListener("update", WatchForEventsMediaSource);
    _oMediaSourceBuffer.addEventListener(
      "updateend",
      WatchForEventsMediaSource,
    );
    _oMediaSourceBuffer.addEventListener("abort", WatchForEventsMediaSource);
    _oMediaSourceBuffer.addEventListener("error", WatchForEventsMediaSource);
  }
  function connectMediaSourceToMediaElement() {
    if (_oMediaElement.src) {
      URL.revokeObjectURL(_oMediaElement.src);
    }
    _oMediaElement.src = URL.createObjectURL(_oMediaSource);
    m_Audiodevice.start2(_oMediaElement);
  }
  function CreateMediaSource() {
    try {
      _oMediaSource = new MediaSource();
    } catch (pException) {
      console.error(`MediaSource ${pException}`);
      m_Debug.FinishWorkAndShowMessage("J0221");
    }
    _oMediaSource.addEventListener("sourceopen", WatchForEventsMediaSource);
    _oMediaSource.addEventListener("sourceended", WatchForEventsMediaSource);
    _oMediaSource.addEventListener("sourceclose", WatchForEventsMediaSource);
    _oMediaSource.sourceBuffers.addEventListener(
      "addsourcebuffer",
      WatchForEventsMediaSource,
    );
    _oMediaSource.sourceBuffers.addEventListener(
      "removesourcebuffer",
      WatchForEventsMediaSource,
    );
  }
  function Start() {
    Assert(!_oMediaElement);
    CreateMediaSource();
    _oMediaElement = document.getElementById("eye");
    ApplyVolume();
    m_PictureInPicture.start2(_oMediaElement);
    for (let sEvent of [
      "progress",
      "error",
      "playing",
      "seeking",
      "seeked",
      "ended",
      "timeupdate",
      "waiting",
      "loadstart",
      "suspend",
      "abort",
      "emptied",
      "stalled",
      "loadedmetadata",
      "loadeddata",
      "canplay",
      "canplaythrough",
      "durationchange",
      "play",
      "pause",
      "ratechange",
      "resize",
    ]) {
      _oMediaElement.addEventListener(sEvent, WatchForEventsMediaElement);
    }
    connectMediaSourceToMediaElement();
    return true;
  }
  function Stop() {
    if (_oMediaElement) {
      URL.revokeObjectURL(_oMediaElement.src);
      _oMediaElement.removeAttribute("src");
      _oMediaElement.load();
    }
  }
  return {
    Start,
    Stop,
    GetFillBuffer,
    GetCountSkippedFrames,
    GetPositionPlaybackBroadcast,
    ShowState,
    Reload: ReloadAndWaitFillBuffer,
    ApplyVolume,
    AddNextSegment,
    SeekReplayUntil,
    SeekReplayOn,
    TogglePause,
    SetSpeedReplay,
  };
})();

const m_List = (() => {
  const INTERVAL_UPDATE_LIST_S_AD = 2e3;
  const MIN_INTERVAL_UPDATE_LISTS = 500;
  class UpdateLists {
    constructor(isWithoutAd, isViaProxy = false) {
      this._isWithoutAd = isWithoutAd;
      this._isViaProxy = isViaProxy;
      this._oCancelPromise = null;
      this.clear();
    }
    clear() {
      this.oListVariants = null;
      this.oListSegments = null;
      this.oChosenVariant = null;
    }
    running() {
      return Boolean(this._oCancelPromise);
    }
    start2() {
      Assert(!this._oCancelPromise);
      this._oCancelPromise = new CancelPromise();
      this._update(this._oCancelPromise, -Infinity);
    }
    stop() {
      if (this._oCancelPromise) {
        m_Log.Here(`[List] Stopping update2 lists ${+this._isWithoutAd}`);
        this._oCancelPromise.Cancel();
        this._oCancelPromise = null;
      }
    }
    saveVariantBroadcast(oVariant) {
      m_Settings.Change("sTitleVariant", oVariant.sId);
      m_Settings.Change("nBitrateVariant", oVariant.nBitrate);
    }
    chooseVariantBroadcast(objsVariants) {
      const sSavedId = m_Settings.Get("sTitleVariant");
      const nSavedBitrate = m_Settings.Get("nBitrateVariant");
      let oChosenVariant = objsVariants.find(({ sId }) => sId === sSavedId);
      if (!oChosenVariant) {
        if (sSavedId === "chunked" || sSavedId === "audio_only") {
          oChosenVariant = objsVariants[0];
        } else {
          oChosenVariant = objsVariants.find(
            ({ sId, nBitrate }) =>
              sId !== "audio_only" && nBitrate <= nSavedBitrate,
          );
          if (!oChosenVariant) {
            oChosenVariant = objsVariants.reduceRight((oResult, oVariant) =>
              oResult.sId === "audio_only" ? oVariant : oResult,
            );
          }
        }
      }
      m_Log.Here(
        `[List] For list2 ${+this._isWithoutAd} chosen2 variant broadcast ${oChosenVariant.sId}/${oChosenVariant.nBitrate}. Saved ${sSavedId}/${nSavedBitrate}`,
      );
      return oChosenVariant;
    }
    _update(oCancelPromise, nVia) {
      Assert(ThisNumber(nVia));
      if (nVia >= MIN_INTERVAL_UPDATE_LISTS || nVia === -Infinity) {
        m_Log.Here(
          `[List] Update2 lists ${+this._isWithoutAd} starts via ${m_Log.F0(nVia)}strs`,
        );
      } else {
        m_Log.Oops(
          `[List] Update2 lists ${+this._isWithoutAd} starts via ${MIN_INTERVAL_UPDATE_LISTS}strs instead ${m_Log.F0(nVia)}strs`,
        );
        nVia = MIN_INTERVAL_UPDATE_LISTS;
      }
      let oPromise = Wait(oCancelPromise, nVia);
      let { oListVariants, oChosenVariant } = this;
      if (oListVariants === null) {
        let sAbsoluteAddressListVariants;
        oPromise = oPromise
          .then(() =>
            m_Twitch.GetAbsoluteAddressListVariants(
              oCancelPromise,
              false,
              this._isWithoutAd,
              this._isViaProxy,
            ),
          )
          .then((sResult) => {
            sAbsoluteAddressListVariants = sResult;
            return m_Loader.LoadText(
              oCancelPromise,
              sAbsoluteAddressListVariants,
              LOAD_LIST_VARIANTS_NOT_LONGER,
              `list variants ${+this._isWithoutAd}`,
              false,
            );
          })
          .then((sResult) => {
            m_Debug.SaveListVariants(sResult);
            oListVariants = ParseList(
              true,
              sAbsoluteAddressListVariants,
              sResult,
            );
            if (oListVariants.objsVariants.length === 0) {
              throw `List variants empty`;
            }
            if (
              !this._isWithoutAd &&
              oListVariants.objsSubtitles &&
              oListVariants.objsSubtitles.length
            ) {
              m_Event.DispatchEvent(
                "list-subtitles",
                oListVariants.objsSubtitles,
              );
            }
          });
      }
      let nStartUpdate;
      oPromise
        .then(() => {
          if (oChosenVariant === null) {
            oChosenVariant = this.chooseVariantBroadcast(
              oListVariants.objsVariants,
            );
          }
          nStartUpdate = performance.now();
          return m_Loader.LoadText(
            oCancelPromise,
            oChosenVariant.sAbsoluteAddressListSegments,
            LOAD_LIST_SEGMENTS_NOT_LONGER,
            `list segments ${+this._isWithoutAd}`,
            false,
          );
        })
        .then((sResult) => {
          m_Debug.SaveListSegments(sResult);
          const oListSegments = ParseList(
            false,
            oChosenVariant.sAbsoluteAddressListSegments,
            sResult,
          );
          if (oListSegments.isFMP4) {
            const sNewCodecsFMP4 = `video/mp4;codecs="${oChosenVariant.sCodecs}"`;
            if (!g_isFMP4 || g_sCodecsFMP4 !== sNewCodecsFMP4) {
              g_isFMP4 = true;
              g_sCodecsFMP4 = sNewCodecsFMP4;
              g_isExistsVideoFMP4 = /avc1|avc3|hvc1|hev1|av01|vp09/i.test(
                oChosenVariant.sCodecs,
              );
              g_isExistsAudioFMP4 = /mp4a|ac-3|ec-3|opus|flac/i.test(
                oChosenVariant.sCodecs,
              );
              m_Log.Ok(`[List] Detected fMP4 stream2 Codecs=${g_sCodecsFMP4}`);
            }
            g_oInitFMP4 = oListSegments.oInit;
            if (!g_bfInitFMP4) {
              LoadInitFMP4();
            }
          }
          let nIntervalUpdate;
          if (
            this._thisStaleListSegments(
              oListVariants,
              oListSegments,
              oChosenVariant,
            )
          ) {
            m_Stats.AddedSegmentsInQueue(0, 0);
            if (oListSegments.isEndList) {
              throw "END_LIST";
            }
            nIntervalUpdate = INTERVAL_UPDATE_LIST_S_AD;
          } else {
            const isShortenedInterval =
              nVia === -Infinity || this.oListVariants === null;
            this.oListVariants = oListVariants;
            this.oListSegments = oListSegments;
            this.oChosenVariant = oChosenVariant;
            nIntervalUpdate = this._updatedListSegments(isShortenedInterval);
          }
          this._update(
            oCancelPromise,
            nStartUpdate + nIntervalUpdate - performance.now(),
          );
          m_Loader.LoadNextSegment();
        })
        .catch(
          AddHandlerExceptions((pReason) => {
            if (typeof pReason == "string") {
              this._listNotUpdated(oCancelPromise, pReason);
              m_Loader.LoadNextSegment();
            } else if (pReason === CancelPromise.REASON) {
              m_Log.Here(
                `[List] Cancelled update2 lists ${+this._isWithoutAd}`,
              );
            } else {
              throw pReason;
            }
          }),
        );
    }
    _thisStaleListSegments(oListVariants, oListSegments, oChosenVariant) {
      const THRESHOLD_SWITCH_SESSION = 5;
      Assert((this.oListVariants === null) == (this.oListSegments === null));
      if (oListSegments.objsSegments.length === 0) {
        m_Log.Oops(`[List] List segments ${+this._isWithoutAd} empty`);
        return true;
      }
      if (this.oListSegments === null) {
        return false;
      }
      Assert(
        !(
          this.oListVariants.sIdBroadcast !== oListVariants.sIdBroadcast &&
          this.oListVariants.nIdSession === oListVariants.nIdSession
        ),
      );
      if (
        this.oListSegments.nTargetDuration !== oListSegments.nTargetDuration
      ) {
        m_Log.Oops(
          `[List] IN list3 ${+this._isWithoutAd} changed4 target duration ${this.oListSegments.nTargetDuration} ==> ${oListSegments.nTargetDuration}`,
        );
      }
      if (this.oChosenVariant !== null) {
        const nDifference =
          oListSegments.nOrdinalNumber - this.oListSegments.nOrdinalNumber;
        const nStart = Math.max(-nDifference, 0);
        const nEnd = Math.min(
          this.oListSegments.objsSegments.length - nDifference,
          oListSegments.objsSegments.length,
        );
        for (
          let nNew = nStart, nOld = nStart + nDifference;
          nNew < nEnd;
          nNew++, nOld++
        ) {
          if (
            oListSegments.objsSegments[nNew].sAddress !==
            this.oListSegments.objsSegments[nOld].sAddress
          ) {
            m_Log.Oops(
              `[List] IN list3 ${+this._isWithoutAd} at segment3 ${oListSegments.nOrdinalNumber + nNew} changed4 address ${ClampLengthString(this.oListSegments.objsSegments[nOld].sAddress, 100)} ==> ${ClampLengthString(oListSegments.objsSegments[nNew].sAddress, 100)}`,
            );
            oListSegments.isChaos = true;
            break;
          }
        }
      }
      const nDifference =
        this.oListSegments.nOrdinalNumber +
        this.oListSegments.objsSegments.length -
        oListSegments.nOrdinalNumber -
        oListSegments.objsSegments.length;
      if (nDifference > 0) {
        if (
          this.oChosenVariant === null &&
          nDifference <= THRESHOLD_SWITCH_SESSION
        ) {
          m_Log.Oops(
            `[List] At switch variant2 in list3 ${+this._isWithoutAd} decreased ordinal number2 ${this.oListSegments.nOrdinalNumber} + ${this.oListSegments.objsSegments.length} ==> ${oListSegments.nOrdinalNumber} + ${oListSegments.objsSegments.length}`,
          );
          return false;
        }
        if (
          oListSegments.nOrdinalNumber === 0 ||
          nDifference > THRESHOLD_SWITCH_SESSION
        ) {
          m_Log.Oops(
            `[List] Changing IdSession: in list3 ${+this._isWithoutAd} decreased ordinal number2 ${this.oListSegments.nOrdinalNumber} + ${this.oListSegments.objsSegments.length} ==> ${oListSegments.nOrdinalNumber} + ${oListSegments.objsSegments.length}`,
          );
          oListVariants.nIdSession = _nIdSession++;
          return false;
        }
        m_Log.Oops(
          `[List] Received stale list ${+this._isWithoutAd}: ordinal number2 ${this.oListSegments.nOrdinalNumber} + ${this.oListSegments.objsSegments.length} ==> ${oListSegments.nOrdinalNumber} + ${oListSegments.objsSegments.length}`,
        );
        return true;
      }
      if (this.oListSegments.nOrdinalNumber > oListSegments.nOrdinalNumber) {
        m_Log.Oops(
          `[List] IN list3 ${+this._isWithoutAd} decreased ordinal number2 ${this.oListSegments.nOrdinalNumber} ==> ${oListSegments.nOrdinalNumber}`,
        );
      }
      return false;
    }
  }
  class UpdateListsWithAd extends UpdateLists {
    constructor() {
      super(false);
    }
    _updatedListSegments(isShortenedInterval) {
      const isListEndsAd = thisListEndsAd(this.oListSegments);
      m_Twitch.sendDataTrackingForAd(isListEndsAd ? this.oListSegments : null);
      if (!_isRunningAd || !isListEndsAd) {
        isShortenedInterval =
          AddSegmentsInQueue(
            this.oListVariants,
            this.oListSegments,
            this.oChosenVariant,
          ) || isShortenedInterval;
      }
      if (this.oListSegments.isEndList) {
        throw "END_LIST";
      }
      setStateAd(isListEndsAd);
      return isListEndsAd
        ? INTERVAL_UPDATE_LIST_S_AD
        : getIntervalUpdateListSegments(
            this.oListSegments,
            isShortenedInterval,
          );
    }
    _listNotUpdated(oCancelPromise, sReason) {
      if (sReason === "DENIED_IN_ACCESS") {
        m_Controls.StopWatchBroadcast();
        m_Notice.ShowFail();
      } else {
        m_Log[sReason === "END_LIST" ? "Ok" : "Oops"](
          `[List] Broadcast finished. ${sReason}`,
        );
        FinishBroadcast();
        this._update(oCancelPromise, getIntervalUpdateListVariants());
      }
    }
  }
  class UpdateListsWithoutAd extends UpdateLists {
    constructor() {
      super(true);
    }
    stop() {
      super.stop();
      this.clear();
    }
    _updatedListSegments(isShortenedInterval) {
      if (thisListEndsAd(this.oListSegments)) {
        throw "Found ad";
      }
      isShortenedInterval =
        AddSegmentsInQueue(
          this.oListVariants,
          this.oListSegments,
          this.oChosenVariant,
        ) || isShortenedInterval;
      m_Event.DispatchEvent("list-adfreequality", this.oChosenVariant);
      if (this.oListSegments.isEndList) {
        throw "END_LIST";
      }
      return getIntervalUpdateListSegments(
        this.oListSegments,
        isShortenedInterval,
      );
    }
    _listNotUpdated(oCancelPromise, sReason) {
      m_Log.Oops(`[List] List 1 not updated. ${sReason}`);
      this.stop();
    }
  }
  class UpdateListsViaProxy extends UpdateLists {
    constructor() {
      super(true, true);
    }
    stop() {
      super.stop();
      this.clear();
    }
    _updatedListSegments(isShortenedInterval) {
      if (
        thisListEndsAd(this.oListSegments) ||
        this.oListSegments.countAdSegments > 0
      ) {
        throw "Found ad";
      }
      proxyAdReady();
      isShortenedInterval =
        AddSegmentsInQueue(
          this.oListVariants,
          this.oListSegments,
          this.oChosenVariant,
        ) || isShortenedInterval;
      m_Event.DispatchEvent("list-adfreequality", this.oChosenVariant);
      if (this.oListSegments.isEndList) {
        throw "END_LIST";
      }
      return getIntervalUpdateListSegments(
        this.oListSegments,
        isShortenedInterval,
      );
    }
    _listNotUpdated(oCancelPromise, sReason) {
      m_Log.Oops(`[List] Proxy ad2 not fit. ${sReason}`);
      giveupFromProxy();
    }
  }
  const _oListsWithAd = new UpdateListsWithAd();
  const _oListsWithoutAd = new UpdateListsWithoutAd();
  const _oListsViaProxy = new UpdateListsViaProxy();
  let _nState = STATE_STOP;
  let _isRunningAd = false;
  let _isWaitingProxy = false;
  let _nGenerationProxy = 0;
  let _nTimerProxy = 0;
  let _nIntervalUpdateListVariants = -1;
  let _nIdSession = 1;
  function setProxyBrowser(isEnable, isWithToken) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(
          {
            request: "ad-proxy",
            enabled: Boolean(isEnable),
            includeGql: Boolean(isWithToken),
          },
          (response) => {
            const error = chrome.runtime.lastError;
            if (error) {
              m_Log.Oops(`[List] Proxy ad2: ${error.message}`);
              resolve(false);
              return;
            }
            resolve(Boolean(response && response.ok));
          },
        );
      } catch (pException) {
        resolve(false);
      }
    });
  }
  function showModeAd(isProxy) {
    m_Event.DispatchEvent("list-admode", Boolean(isProxy));
  }
  function proxyAdReady() {
    if (!_isRunningAd || !_isWaitingProxy) {
      return;
    }
    _isWaitingProxy = false;
    clearTimeout(_nTimerProxy);
    _nTimerProxy = 0;
    setProxyBrowser(true, false);
    showModeAd(true);
  }
  function startPreviewWithoutAd() {
    if (!_isRunningAd || _oListsWithoutAd.running()) {
      return;
    }
    showModeAd(false);
    _oListsWithoutAd.start2();
  }
  function giveupFromProxy() {
    clearTimeout(_nTimerProxy);
    _nTimerProxy = 0;
    _isWaitingProxy = false;
    _nGenerationProxy++;
    _oListsViaProxy.stop();
    setProxyBrowser(false, false);
    startPreviewWithoutAd();
  }
  function startBypassAd() {
    const nGeneration = ++_nGenerationProxy;
    _isWaitingProxy = false;
    setProxyBrowser(true, true).then((ok) => {
      if (nGeneration !== _nGenerationProxy || !_isRunningAd) {
        if (!_isRunningAd) {
          setProxyBrowser(false, false);
        }
        return;
      }
      if (!ok) {
        m_Log.Oops("[List] Proxy ad2 unavailable");
        setProxyBrowser(false, false);
        startPreviewWithoutAd();
        return;
      }
      _isWaitingProxy = true;
      _oListsViaProxy.start2();
      _nTimerProxy = setTimeout(() => {
        if (nGeneration === _nGenerationProxy && _isWaitingProxy) {
          m_Log.Oops("[List] Proxy ad2 not replied ontime");
          giveupFromProxy();
        }
      }, 8000);
    });
  }
  function stopBypassAd() {
    clearTimeout(_nTimerProxy);
    _nTimerProxy = 0;
    _isWaitingProxy = false;
    _nGenerationProxy++;
    _oListsViaProxy.stop();
    _oListsWithoutAd.stop();
    setProxyBrowser(false, false);
  }
  function ParseList(isThisListVariants, sAbsoluteAddressList, sParsedList) {
    const MAX_SUPPORTED_VERSION_HLS = 7;
    if (sParsedList.includes("shelblock.proxy")) {
      m_Debug.FinishWorkAndShowMessage("J0220");
    }
    if (!sParsedList.startsWith("#EXTM3U")) {
      throw `Instead list2 loaded2 which-that junk length ${sParsedList.length}\n${sParsedList}`;
    }
    let nVersion = 1;
    let mapRenditionGroups,
      objsVariants,
      oNewVariant,
      sIdBroadcast,
      sAddressTrackingForWatch,
      objsSubtitles;
    let nTargetDuration,
      nOrdinalNumber,
      isEndList,
      countAdSegments,
      sTypeAd,
      countAdrolls,
      nNumberAdroll,
      nDurationAdroll,
      sTokenAd,
      sIdAdroll1,
      sIdAdroll2,
      sIdAdroll3,
      sIdAdroll4,
      sIdAdroll5,
      sIdAdroll6,
      nNumberQuartile,
      objsSegments,
      oNewSegment,
      oInit;
    let isDiscontinuity, nTime;
    if (isThisListVariants) {
      mapRenditionGroups = new Map();
      objsVariants = [];
      objsSubtitles = [];
      oNewVariant = null;
      sIdBroadcast = "";
      sAddressTrackingForWatch = "";
    } else {
      nTargetDuration = -1;
      nOrdinalNumber = 0;
      isEndList = false;
      countAdSegments = 0;
      sTypeAd = "";
      objsSegments = [];
      oNewSegment = null;
      oInit = null;
      isDiscontinuity = false;
      nTime = NaN;
    }
    const rvTagOrAddress = /^#EXT([^:\r\n]+)(?::(.*))?$|^[^#\r\n].*$/gm;
    rvTagOrAddress.lastIndex = 7;
    for (
      let strsTagOrAddress;
      (strsTagOrAddress = rvTagOrAddress.exec(sParsedList));
    ) {
      const [sAddress, sTitleTag = "", sValueTag = ""] = strsTagOrAddress;
      try {
        switch (sTitleTag) {
          case "":
            if (isThisListVariants) {
              Assert(oNewVariant !== null);
              oNewVariant.sAbsoluteAddressListSegments = ResolveRelativeUrl(
                sAddress,
                sAbsoluteAddressList,
              );
              objsVariants.push(oNewVariant);
              oNewVariant = null;
            } else {
              reject(oNewSegment !== null);
              oNewSegment.sAddress = ResolveRelativeUrl(
                sAddress,
                sAbsoluteAddressList,
              );
              oNewSegment.isDiscontinuity = isDiscontinuity;
              objsSegments.push(oNewSegment);
              isDiscontinuity = false;
              countAdSegments += Boolean(oNewSegment.isAd);
              oNewSegment = null;
            }
            break;

          case "INF": {
            Assert(!isThisListVariants);
            Assert(nTargetDuration !== -1);
            Assert(oNewSegment === null);
            oNewSegment = Object.create(null);
            const { nDuration, sNameSegment } = parseEXTINF(sValueTag);
            oNewSegment.nDuration = nDuration;
            oNewSegment.isAd = m_Twitch.thisAdSegment(sNameSegment);
            if (oNewSegment.isAd) {
              nTime = NaN;
            }
            oNewSegment.nTime = nTime;
            nTime++;
            if (oNewSegment.nDuration < 0) {
              m_Log.Oops(
                `[List] AT segment3 ${nOrdinalNumber + objsSegments.length} negative duration2 ${sValueTag}`,
              );
              oNewSegment.nDuration = 0;
            }
            if (Math.round(oNewSegment.nDuration) > nTargetDuration) {
              m_Log.Oops(
                `[List] Duration segment3 ${nOrdinalNumber + objsSegments.length} more target duration on ${oNewSegment.nDuration - nTargetDuration}s`,
              );
              if (oNewSegment.nDuration > nTargetDuration * 3) {
                oNewSegment.nDuration = 0;
              }
            }
            break;
          }

          case "-X-DISCONTINUITY":
            Assert(!isThisListVariants);
            Assert(!sValueTag);
            isDiscontinuity = true;
            break;

          case "-X-PROGRAM-DATE-TIME":
            Assert(!isThisListVariants);
            break;

          case "-X-KEY":
            Assert(!isThisListVariants);
            m_Debug.FinishWorkAndShowMessage(
              "J0219",
              "J0731",
              m_Twitch.GetAddressChannel(true),
            );
            break;

          case "-X-MAP": {
            Assert(!isThisListVariants);
            const mapAttributesMap = ParseListAttribute(sValueTag);
            Assert(!mapAttributesMap.has("BYTERANGE"));
            const sAddressInit = mapAttributesMap.get("URI");
            Assert(ThisNonemptyString(sAddressInit));
            oInit = {
              sAddress: ResolveRelativeUrl(sAddressInit, sAbsoluteAddressList),
            };
            break;
          }

          case "-X-BYTERANGE":
          case "-X-GAP":
            Assert(false);
            break;

          case "-X-TARGETDURATION":
            Assert(!isThisListVariants);
            Assert(nTargetDuration === -1);
            nTargetDuration = ParseIntegerPositiveNumber(sValueTag);
            Assert(nTargetDuration > 0 && nTargetDuration < 60);
            break;

          case "-X-MEDIA-SEQUENCE":
            Assert(!isThisListVariants);
            Assert(nOrdinalNumber === 0);
            nOrdinalNumber = ParseIntegerPositiveNumber(sValueTag);
            break;

          case "-X-ENDLIST":
            Assert(!isThisListVariants);
            Assert(!sValueTag);
            isEndList = true;
            break;

          case "-X-DISCONTINUITY-SEQUENCE":
            Assert(!isThisListVariants);
            break;

          case "-X-PLAYLIST-TYPE":
          case "-X-I-FRAMES-ONLY":
            Assert(false);
            break;

          case "-X-TWITCH-LIVE-SEQUENCE":
            Assert(!isThisListVariants);
            nTime = ParseIntegerPositiveNumber(sValueTag);
            break;

          case "-X-DATERANGE": {
            Assert(!isThisListVariants);
            const mapAttributes = ParseListAttribute(sValueTag);
            try {
              switch (mapAttributes.get("CLASS")) {
                case "twitch-stitched-ad":
                  sTypeAd = mapAttributes.get("X-TV-TWITCH-AD-ROLL-TYPE");
                  countAdrolls = ParseIntegerPositiveNumber(
                    mapAttributes.get("X-TV-TWITCH-AD-POD-LENGTH"),
                  );
                  nNumberAdroll = ParseIntegerPositiveNumber(
                    mapAttributes.get("X-TV-TWITCH-AD-POD-POSITION"),
                  );
                  nDurationAdroll = ParsePositiveNumber(
                    mapAttributes.get("DURATION") || "0",
                  );
                  sTokenAd =
                    mapAttributes.get("X-TV-TWITCH-AD-RADS-TOKEN") || "";
                  sIdAdroll1 =
                    mapAttributes.get("X-TV-TWITCH-AD-ADVERTISER-ID") || "";
                  sIdAdroll2 =
                    mapAttributes.get("X-TV-TWITCH-AD-CREATIVE-ID") || "";
                  sIdAdroll3 =
                    mapAttributes.get("X-TV-TWITCH-AD-LINE-ITEM-ID") || "";
                  sIdAdroll4 =
                    mapAttributes.get("X-TV-TWITCH-AD-ORDER-ID") || "";
                  sIdAdroll5 =
                    mapAttributes.get("X-TV-TWITCH-AD-AD-SESSION-ID") || "";
                  sIdAdroll6 =
                    mapAttributes.get("X-TV-TWITCH-AD-AD-FORMAT") || "";
                  Assert(sTypeAd);
              }
            } catch (pException) {
              sTypeAd = "";
              m_Log.Oops(`[List] Error parse ad2: ${sValueTag}`);
            }
            break;
          }

          case "-X-MEDIA": {
            Assert(isThisListVariants);
            const mapAttributes = ParseListAttribute(sValueTag);
            const sType = mapAttributes.get("TYPE");
            Assert(sType);
            Assert(
              (sType !== "VIDEO" && sType !== "AUDIO") ||
                !mapAttributes.has("URI"),
            );
            if (sType === "VIDEO") {
              const sGroup = mapAttributes.get("GROUP-ID");
              const sName = mapAttributes.get("NAME");
              Assert(sGroup && sName);
              Assert(!mapRenditionGroups.has(sGroup));
              mapRenditionGroups.set(sGroup, sName);
            } else if (sType === "SUBTITLES" && mapAttributes.get("URI")) {
              objsSubtitles.push({
                sGroup: mapAttributes.get("GROUP-ID") || "",
                sName:
                  mapAttributes.get("NAME") ||
                  mapAttributes.get("LANGUAGE") ||
                  "CC",
                sLanguage: mapAttributes.get("LANGUAGE") || "",
                sAddress: ResolveRelativeUrl(
                  mapAttributes.get("URI"),
                  sAbsoluteAddressList,
                ),
              });
            } else {
              m_Log.Oops(`[List] Found2 #EXT-X-MEDIA TYPE=${sType}`);
            }
            break;
          }

          case "-X-STREAM-INF": {
            Assert(isThisListVariants);
            Assert(oNewVariant === null);
            oNewVariant = Object.create(null);
            const mapAttributes = ParseListAttribute(sValueTag);
            oNewVariant.nBitrate = ParseIntegerPositiveNumber(
              mapAttributes.get("BANDWIDTH"),
            );
            Assert(!mapAttributes.has("AUDIO"));
            oNewVariant.sId = mapAttributes.get("VIDEO") || "";
            oNewVariant.sCodecs = mapAttributes.get("CODECS") || "";
            oNewVariant.sGroupSubtitles = mapAttributes.get("SUBTITLES") || "";
            break;
          }

          case "-X-I-FRAME-STREAM-INF":
          case "-X-SESSION-DATA":
          case "-X-SESSION-KEY":
            Assert(isThisListVariants);
            break;

          case "-X-TWITCH-INFO": {
            Assert(isThisListVariants);
            const mapAttributes = ParseListAttribute(sValueTag);
            const nSeconds = ParsePositiveNumber(
              mapAttributes.get("SERVER-TIME"),
            );
            Assert(nSeconds > 1531267200 && nSeconds < 1846886400);
            const nMilliseconds = nSeconds * 1e3 + 50;
            g_nExactTime = nMilliseconds - performance.now();
            const nDesyncTime = nMilliseconds - Date.now();
            sIdBroadcast = mapAttributes.get("BROADCAST-ID");
            Assert(sIdBroadcast);
            try {
              const sAddress = atob(mapAttributes.get("C"));
              Assert(sAddress.startsWith("https://"));
              sAddressTrackingForWatch = sAddress;
            } catch (pException) {
              m_Log.Oops(
                `[List] Not succeeded parse2 address tracking for2 watch3: ${pException}`,
              );
            }
            m_Log[Math.abs(nDesyncTime) > 5e3 ? "Oops" : "Ok"](
              `[List] DesyncTime=${nDesyncTime}strs IdBroadcast=${sIdBroadcast}`,
            );
            break;
          }

          case "-X-VERSION":
            Assert(nVersion === 1);
            nVersion = ParseIntegerPositiveNumber(sValueTag);
            Assert(nVersion >= 2 && nVersion <= MAX_SUPPORTED_VERSION_HLS);
            break;

          case "-X-START":
            m_Log.Oops(`[List] Found2 #EXT-X-START=${sValueTag}`);
            break;

          case "M3U":
          case "-X-DEFINE":
            Assert(false);
        }
      } catch (pException) {
        if (pException instanceof Error && pException.message === "REJECT") {
          throw `Error parse string list2:\n${ConvertExceptionInString(pException)}\n${sAddress}`;
        }
      }
    }
    if (isThisListVariants) {
      Assert(oNewVariant === null);
      for (let oVariant of objsVariants) {
        if (oVariant.sId) {
          Assert(mapRenditionGroups.has(oVariant.sId));
          oVariant.sTitle = mapRenditionGroups.get(oVariant.sId);
        } else {
          oVariant.sId = `CoolCmd${oVariant.nBitrate}`;
          oVariant.sTitle = `${m_i18n.FormatNumber(oVariant.nBitrate / 1e6, 1)} ${Text("J0114")}`;
        }
      }
      m_Log.Here(`[List] Count variants in list3: ${objsVariants.length}`);
      return m_Twitch.sortListVariants({
        sIdBroadcast,
        nIdSession: _nIdSession++,
        sAddressTrackingForWatch,
        objsVariants,
        objsSubtitles,
      });
    } else {
      Assert(oNewSegment === null);
      Assert(nTargetDuration !== -1);
      const oListSegments = {
        nTargetDuration,
        nOrdinalNumber,
        isEndList,
        isChaos: false,
        countAdSegments,
        sTypeAd,
        countAdrolls,
        nNumberAdroll,
        nDurationAdroll,
        sTokenAd,
        sIdAdroll1,
        sIdAdroll2,
        sIdAdroll3,
        sIdAdroll4,
        sIdAdroll5,
        sIdAdroll6,
        objsSegments,
        oInit,
        isFMP4: oInit !== null,
      };
      m_Log.Here(
        `[List] Parsed list segments TargetDuration=${nTargetDuration} OrdinalNumber=${nOrdinalNumber} EndList=${isEndList} CountSegments=${objsSegments.length} AdSegments=${countAdSegments}`,
      );
      if (sTypeAd) {
        m_Log.Ok(
          `[List] Found ad TypeAd=${sTypeAd} TokenAd=${sTokenAd.slice(-10)} Adrolls=${countAdrolls} NumberAdroll=${nNumberAdroll} DurationAdroll=${nDurationAdroll} NumberQuartile=${nNumberQuartile} EndsAd=${thisListEndsAd(oListSegments)}`,
        );
      }
      m_Stats.ParsedListSegments(oListSegments);
      return oListSegments;
    }
  }
  function reject(pCondition) {
    if (!pCondition) {
      throw new Error("REJECT");
    }
  }
  function ParseListAttribute(sSourceText) {
    const mapAttributes = new Map();
    const rvAttribute = /([A-Z0-9-]+)=(?:"([^"]*)"|([^",]+))(?:,|$)/g;
    while (rvAttribute.lastIndex !== sSourceText.length) {
      const { lastIndex } = rvAttribute;
      const strsAttribute = rvAttribute.exec(sSourceText);
      Assert(strsAttribute.index === lastIndex);
      Assert(!mapAttributes.has(strsAttribute[1]));
      mapAttributes.set(strsAttribute[1], strsAttribute[3] || strsAttribute[2]);
    }
    return mapAttributes;
  }
  function ParseIntegerPositiveNumber(sSourceText) {
    const nResult = parseFloat(sSourceText);
    Assert(Number.isSafeInteger(nResult) && nResult >= 0);
    return nResult;
  }
  function ParsePositiveNumber(sSourceText) {
    const nResult = parseFloat(sSourceText);
    Assert(Number.isFinite(nResult) && nResult >= 0);
    return nResult;
  }
  function ParseAnyNumber(sSourceText) {
    const nResult = parseFloat(sSourceText);
    Assert(Number.isFinite(nResult));
    return nResult;
  }
  function parseEXTINF(sSourceText) {
    let nComma = sSourceText.indexOf(",");
    if (nComma === -1) {
      nComma = sSourceText.length;
    }
    return {
      nDuration: ParseAnyNumber(sSourceText.slice(0, nComma)),
      sNameSegment: sSourceText.slice(nComma + 1),
    };
  }
  function thisListEndsAd(oList) {
    return (
      oList !== null &&
      oList.objsSegments.length !== 0 &&
      oList.objsSegments[oList.objsSegments.length - 1].isAd
    );
  }
  function setStateAd(isRunningAd) {
    if (_isRunningAd !== isRunningAd) {
      _isRunningAd = isRunningAd;
      if (isRunningAd) {
        m_Event.DispatchEvent("list-adstart");
        startBypassAd();
      } else {
        stopBypassAd();
        m_Event.DispatchEvent("list-adend");
      }
    }
    if (!isRunningAd) {
      m_Twitch.sendDataTrackingForAd(null);
    }
  }
  let _sAddedIdBroadcast;
  let _nAddedIdSession;
  let _sAddedIdVariant;
  let _nAddedOrdinalNumber;
  let _nAddedTime;
  let _isAddDiscontinuity;
  function clearStatsAddition() {
    _sAddedIdBroadcast = "";
    _nAddedIdSession = NaN;
    _sAddedIdVariant = "";
    _nAddedOrdinalNumber = -1;
    _nAddedTime = -1;
    _isAddDiscontinuity = false;
  }
  clearStatsAddition();
  function AddSegmentsInQueue(oNewVariants, oNewSegments, oChosenVariant) {
    Assert(
      !(
        _sAddedIdBroadcast !== oNewVariants.sIdBroadcast &&
        _nAddedIdSession === oNewVariants.nIdSession
      ),
    );
    if (oNewSegments.isChaos) {
      _isAddDiscontinuity = true;
      m_Stats.AddedSegmentsInQueue(0, 0);
      return false;
    }
    let countSegmentsAdded = 0;
    let countSecondsAdded = 0;
    let nIndexAddedSegment = oNewSegments.objsSegments.length;
    let countAddSegments =
      _sAddedIdBroadcast !== oNewVariants.sIdBroadcast ? 1 : 3;
    let nAddSeconds = m_Settings.Get("nSizeBuffer");
    while (--nIndexAddedSegment > 0) {
      if (
        !oNewSegments.objsSegments[nIndexAddedSegment].isAd &&
        oNewSegments.objsSegments[nIndexAddedSegment].nDuration !== 0
      ) {
        countAddSegments--;
        nAddSeconds -= oNewSegments.objsSegments[nIndexAddedSegment].nDuration;
        if (countAddSegments <= 0 && nAddSeconds <= 0) {
          break;
        }
      }
    }
    if (_sAddedIdBroadcast !== oNewVariants.sIdBroadcast) {
      m_Log.Ok(
        `[List] Changed IdBroadcast ${_sAddedIdBroadcast} ==> ${oNewVariants.sIdBroadcast}`,
      );
      _nAddedTime = -1;
      _isAddDiscontinuity = true;
      for (
        let oAddedSegment;
        (oAddedSegment = oNewSegments.objsSegments[nIndexAddedSegment]);
        nIndexAddedSegment++
      ) {
        addSegmentInQueue(
          oAddedSegment,
          oNewSegments.nOrdinalNumber + nIndexAddedSegment,
        );
      }
    } else if (_nAddedIdSession !== oNewVariants.nIdSession) {
      m_Log.Ok(
        `[List] Changed IdSession ${_nAddedIdSession} ==> ${oNewVariants.nIdSession}`,
      );
      _isAddDiscontinuity = true;
      for (
        let oAddedSegment;
        (oAddedSegment = oNewSegments.objsSegments[nIndexAddedSegment]);
        nIndexAddedSegment++
      ) {
        if (oAddedSegment.nTime > _nAddedTime) {
          addSegmentInQueue(
            oAddedSegment,
            oNewSegments.nOrdinalNumber + nIndexAddedSegment,
          );
        }
      }
    } else {
      if (_sAddedIdVariant !== oChosenVariant.sId) {
        m_Log.Ok(
          `[List] Changed IdVariant ${_sAddedIdVariant} ==> ${oChosenVariant.sId}`,
        );
        _isAddDiscontinuity = true;
      }
      for (
        let oAddedSegment;
        (oAddedSegment = oNewSegments.objsSegments[nIndexAddedSegment]);
        nIndexAddedSegment++
      ) {
        if (
          oNewSegments.nOrdinalNumber + nIndexAddedSegment >
          _nAddedOrdinalNumber
        ) {
          addSegmentInQueue(
            oAddedSegment,
            oNewSegments.nOrdinalNumber + nIndexAddedSegment,
          );
        }
      }
    }
    m_Stats.AddedSegmentsInQueue(countSegmentsAdded, countSecondsAdded);
    return countSegmentsAdded === 0;
    function addSegmentInQueue(oSegment, nOrdinalNumber) {
      startBroadcast();
      if (oSegment.isAd) {
        m_Log.Here(`[List] Not adding ad3 OrdinalNumber=${nOrdinalNumber}`);
        return;
      }
      if (oSegment.nDuration === 0) {
        m_Log.Oops(
          `[List] Not adding segment OrdinalNumber=${nOrdinalNumber} Time=${oSegment.nTime} Duration=0`,
        );
        return;
      }
      if (
        _nAddedIdSession === oNewVariants.nIdSession &&
        _nAddedOrdinalNumber + 1 < nOrdinalNumber
      ) {
        m_Log.Oops(
          `[List] Skipped segments2 s ${_nAddedOrdinalNumber + 1} by ${nOrdinalNumber - 1}`,
        );
        m_Stats.skippedSegments2(nOrdinalNumber - _nAddedOrdinalNumber - 1);
        _isAddDiscontinuity = true;
      }
      const oAdded = g_objsQueue.Add(
        new Segment(
          HANDLING_WAITING_LOAD,
          oSegment.sAddress,
          oSegment.nDuration,
          oSegment.isDiscontinuity || _isAddDiscontinuity,
        ),
      );
      m_Log[oAdded.isDiscontinuity ? "Ok" : "Here"](
        `[List] Added segment ${oAdded.nNumber} OrdinalNumber=${nOrdinalNumber} Time=${oSegment.nTime} Duration=${oAdded.nDuration} Discontinuity=${oAdded.isDiscontinuity}`,
      );
      countSegmentsAdded++;
      countSecondsAdded += oAdded.nDuration;
      _sAddedIdBroadcast = oNewVariants.sIdBroadcast;
      _nAddedIdSession = oNewVariants.nIdSession;
      _sAddedIdVariant = oChosenVariant.sId;
      _nAddedOrdinalNumber = nOrdinalNumber;
      if (!Number.isNaN(oSegment.nTime)) {
        _nAddedTime = oSegment.nTime;
      }
      _isAddDiscontinuity = false;
    }
  }
  function getIntervalUpdateListSegments(oListSegments, isShortenedInterval) {
    let countSegments = 0,
      nDurationList = 0;
    let nAverageDurationSegment,
      nMinDurationSegment = Infinity,
      nMaxDurationSegment = -Infinity;
    for (const { isAd, nDuration } of oListSegments.objsSegments) {
      if (!isAd && nDuration > 0) {
        countSegments++;
        nDurationList += nDuration;
        nMinDurationSegment = Math.min(nMinDurationSegment, nDuration);
        nMaxDurationSegment = Math.max(nMaxDurationSegment, nDuration);
      }
    }
    if (countSegments !== 0) {
      nAverageDurationSegment = nDurationList / countSegments;
      m_Log.Here(
        `[List] DurationSegments=${m_Log.F2(nMinDurationSegment)}<${m_Log.F2(nAverageDurationSegment)}<${m_Log.F2(nMaxDurationSegment)} DurationList=${m_Log.F1(nDurationList)} NotLoad=${oListSegments.objsSegments.length - countSegments}`,
      );
    } else {
      nAverageDurationSegment =
        nMinDurationSegment =
        nMaxDurationSegment =
          Math.max(oListSegments.nTargetDuration / 3, 1);
      m_Log.Oops(
        `[List] Estimated duration2 segments ${m_Log.F1(nAverageDurationSegment)}`,
      );
    }
    return isShortenedInterval
      ? (nAverageDurationSegment / 2) * 1e3
      : nAverageDurationSegment * 1e3 - 16;
  }
  function getIntervalUpdateListVariants() {
    Assert(_nState === STATE_FINISH_BROADCAST);
    if (_nIntervalUpdateListVariants === -1) {
      _nIntervalUpdateListVariants = 1e3;
    } else {
      _nIntervalUpdateListVariants = Math.min(
        _nIntervalUpdateListVariants + 1e3,
        3e4,
      );
    }
    return _nIntervalUpdateListVariants;
  }
  function startBroadcast() {
    if (_nState !== STATE_START_BROADCAST) {
      _nState = STATE_START_BROADCAST;
      g_objsQueue.Add(new Segment(HANDLING_LOADED, STATE_START_BROADCAST));
      m_Event.DispatchEvent("list-broadcastvariantchosen", [
        _oListsWithAd.oListVariants.objsVariants,
        _oListsWithAd.oChosenVariant,
      ]);
    }
  }
  function FinishBroadcast() {
    if (_nState !== STATE_FINISH_BROADCAST) {
      _nState = STATE_FINISH_BROADCAST;
      _nIntervalUpdateListVariants = -1;
      g_objsQueue.Add(new Segment(HANDLING_LOADED, STATE_FINISH_BROADCAST));
      m_Event.DispatchEvent("list-broadcastvariantchosen", [null, null]);
    }
    _oListsWithAd.clear();
    setStateAd(false);
  }
  function ChangeVariantBroadcast(nChosenVariant) {
    if (_oListsWithAd.oListVariants !== null) {
      _oListsWithAd.saveVariantBroadcast(
        _oListsWithAd.oListVariants.objsVariants[nChosenVariant],
      );
      _oListsWithAd.oChosenVariant = null;
      if (_nState === STATE_START_BROADCAST) {
        _oListsWithAd.stop();
        _oListsWithAd.start2();
        if (!_isRunningAd) {
          clearStatsAddition();
          g_objsQueue.Add(new Segment(HANDLING_LOADED, STATE_SWITCH_VARIANT));
          m_Loader.LoadNextSegment();
        }
      }
    }
  }
  function Stop() {
    _nState = STATE_STOP;
    _oListsWithAd.stop();
    clearStatsAddition();
    setStateAd(false);
  }
  function Start() {
    Assert(_nState === STATE_STOP);
    _oListsWithAd.start2();
  }
  return {
    Start,
    Stop,
    ChangeVariantBroadcast,
  };
})();

const m_Converter = (() => {
  let _oWorkingStream = null;
  let _nLastLoaded = -1;
  function ConvertNextSegment() {
    let nRemove,
      countRemove = 0;
    for (
      let oSegment, nSegment = 0;
      (oSegment = g_objsQueue[nSegment]);
      ++nSegment
    ) {
      if (oSegment.nHandling > HANDLING_LOADED) {
        continue;
      }
      if (oSegment.nHandling < HANDLING_LOADED) {
        break;
      }
      if (_nLastLoaded !== -1 && _nLastLoaded + 1 !== oSegment.nNumber) {
        m_Log.Oops(
          `[Conversion] Not loaded3 segments2 between ${_nLastLoaded} and ${oSegment.nNumber}`,
        );
        oSegment.isDiscontinuity = true;
      }
      _nLastLoaded = oSegment.nNumber;
      if (typeof oSegment.pData == "number" && _oWorkingStream === null) {
        m_Log.Here(
          `[Conversion] Skipping2 segment ${oSegment.nNumber} State=${oSegment.pData}`,
        );
        oSegment.nHandling = HANDLING_CONVERTED;
        if (oSegment.pData === STATE_START_BROADCAST && !g_isFMP4) {
          CreateWorkingStream();
        }
      } else if (g_isFMP4 && typeof oSegment.pData != "number") {
        if (
          oSegment.isDiscontinuity &&
          (!g_bfInitFMP4 ||
            (g_oInitFMP4 && g_sAddressLoadedInitFMP4 !== g_oInitFMP4.sAddress))
        ) {
          m_Log.Here(
            `[Conversion] Waiting segment init fMP4 for segment3 ${oSegment.nNumber}`,
          );
          LoadInitFMP4();
          break;
        }
        m_Log.Here(
          `[Conversion] fMP4 segment ${oSegment.nNumber} without conversion`,
        );
        const pData = {
          mbMediasegment: oSegment.pData,
          isExistsVideo: g_isExistsVideoFMP4,
          isExistsAudio: g_isExistsAudioFMP4,
        };
        if (oSegment.isDiscontinuity) {
          pData.mbSegmentInit = g_bfInitFMP4;
          pData.sCodecs = g_sCodecsFMP4;
        }
        oSegment.pData = pData;
        oSegment.nHandling = HANDLING_CONVERTED;
      } else {
        if (typeof oSegment.pData == "number") {
          m_Log.Here(
            `[Conversion] Sending2 segment ${oSegment.nNumber} State=${oSegment.pData}`,
          );
          _oWorkingStream.postMessage(oSegment);
        } else {
          m_Debug.SaveTransportStream(oSegment);
          m_Stats.ReceivedSourceSegment();
          m_Log.Here(`[Conversion] Sending2 segment ${oSegment.nNumber}`);
          _oWorkingStream.postMessage(oSegment, [oSegment.pData]);
        }
        if (++countRemove == 1) {
          nRemove = nSegment;
        }
      }
    }
    if (countRemove !== 0) {
      g_objsQueue.Remove(nRemove, countRemove);
    }
    m_Player.AddNextSegment();
  }
  const HandleEndingConversion = AddHandlerExceptions((oEvent) => {
    const mData = oEvent.data;
    Assert(Array.isArray(mData));
    switch (mData[0]) {
      case 1:
        Assert(mData.length === 2 && ThisObject(mData[1]));
        const oSegment = new Segment(
          HANDLING_CONVERTED,
          mData[1].pData,
          mData[1].nDuration,
          mData[1].isDiscontinuity,
          mData[1].nNumber,
        );
        m_Log.Here(
          `[Conversion] Received segment ${oSegment.nNumber} ConvertedFor=${m_Log.F0(oSegment.pData.nConvertedFor)}strs`,
        );
        if (typeof oSegment.pData != "number") {
          m_Stats.ReceivedConvertedSegment(oSegment);
          if (!oSegment.pData.hasOwnProperty("mbMediasegment")) {
            return;
          }
          m_Debug.SaveConvertedSegment(oSegment);
        }
        g_objsQueue.Add(oSegment);
        m_Player.AddNextSegment();
        return;

      case 2:
        const strsImportance = mData[1],
          strsRecording = mData[2];
        Assert(
          mData.length === 3 &&
            Array.isArray(strsImportance) &&
            Array.isArray(strsRecording) &&
            strsImportance.length === strsRecording.length,
        );
        for (let idx = 0; idx < strsImportance.length; ++idx) {
          Assert(
            (strsImportance[idx] === "Here" ||
              strsImportance[idx] === "Ok" ||
              strsImportance[idx] === "Oops") &&
              typeof strsRecording[idx] == "string",
          );
          m_Log[strsImportance[idx]](strsRecording[idx]);
        }
        return;

      case 3:
        Assert(
          mData.length === 3 &&
            typeof mData[1] == "string" &&
            typeof mData[2] == "object",
        );
        m_Debug.FinishWorkAndSendReport(mData[1], mData[2]);
        return;

      case 4:
        Assert(mData.length === 2 && typeof mData[1] == "string");
        m_Debug.FinishWorkAndShowMessage(mData[1]);
        return;

      case 5:
        Assert(mData.length === 2 && mData[1].byteLength);
        m_Trash.Throw(mData[1]);
        return;

      default:
        Assert(false);
    }
  });
  function HandleErrorConversion(oEvent) {
    m_Debug.FinishWorkAndSendReport(
      `Happened event ${oEvent.type} in working stream3 in string2 ${oEvent.lineno}. ${oEvent.message}`,
    );
  }
  function CreateWorkingStream() {
    m_Log.Here("[Conversion] Creating working2 stream2");
    _oWorkingStream = new Worker(chrome.runtime.getURL("src/player/worker.js"));
    _oWorkingStream.addEventListener("message", HandleEndingConversion);
    _oWorkingStream.addEventListener("error", HandleErrorConversion);
    _oWorkingStream.addEventListener("messageerror", HandleErrorConversion);
  }
  function Stop() {
    _nLastLoaded = -1;
    g_isFMP4 = false;
    g_sCodecsFMP4 = "";
    g_oInitFMP4 = null;
    g_bfInitFMP4 = null;
    g_sAddressLoadedInitFMP4 = "";
    g_oCancelLoadInitFMP4 = null;
    g_isExistsVideoFMP4 = false;
    g_isExistsAudioFMP4 = false;
    if (_oWorkingStream) {
      m_Log.Here("[Conversion] Killing working2 stream2");
      _oWorkingStream.terminate();
      _oWorkingStream = null;
    }
  }
  return {
    Stop,
    ConvertNextSegment,
  };
})();

const m_Loader = (() => {
  const MAX_COUNT_ATTEMPTS = 2;
  function LoadText(
    oCancelPromise,
    sAddress,
    nNotLonger,
    sTitle,
    isLog,
    oHeaders = null,
    sMethod2 = "GET",
  ) {
    return Load(
      oCancelPromise,
      sMethod2,
      sAddress,
      nNotLonger,
      oHeaders,
      null,
      sTitle,
      isLog,
      "text",
    );
  }
  function LoadJson(
    oCancelPromise,
    sAddress,
    nNotLonger,
    sTitle,
    isLog,
    oHeaders = null,
    sMethod2 = "GET",
  ) {
    return Load(
      oCancelPromise,
      sMethod2,
      sAddress,
      nNotLonger,
      oHeaders,
      null,
      sTitle,
      isLog,
      "json",
    );
  }
  function Load(
    oCancelPromise,
    sMethod2,
    sAddress,
    nNotLonger,
    oHeaders,
    pBody,
    sTitle,
    isLog,
    pTypeData,
  ) {
    if (g_isWorkFinished) {
      throw void 0;
    }
    Assert(
      sMethod2 === "GET" ||
        sMethod2 === "PUT" ||
        sMethod2 === "DELETE" ||
        sMethod2 === "POST",
    );
    Assert(typeof sAddress == "string");
    Assert(
      Number.isFinite(nNotLonger) && (nNotLonger === 0 || nNotLonger > 1e3),
    );
    Assert(
      pBody === null ||
        (sMethod2 !== "GET" &&
          (pBody instanceof URLSearchParams ||
            (typeof pBody == "string" &&
              oHeaders &&
              ThisNonemptyString(oHeaders["Content-Type"])))),
    );
    Assert(
      typeof oHeaders == "object" &&
        typeof sTitle == "string" &&
        typeof isLog == "boolean",
    );
    Assert(
      pTypeData === "none" ||
        pTypeData === "text" ||
        pTypeData === "json" ||
        Number.isFinite(pTypeData),
    );
    if (oCancelPromise && oCancelPromise.isCancelled) {
      return Promise.reject(CancelPromise.REASON);
    }
    m_Log.Here(
      `[Loader] ${sMethod2} ${sTitle} not longer ${m_Log.F0(nNotLonger)}strs`,
    );
    m_Twitch.assertAvailabilityAddress(sAddress);
    const oRequest = new XMLHttpRequest();
    oRequest._sMethod = sMethod2;
    oRequest._sAddress = sAddress;
    oRequest._nNotLonger = nNotLonger;
    oRequest._oHeaders = oHeaders;
    oRequest._pBody = pBody;
    oRequest._sTitle = sTitle;
    oRequest._isLog = isLog;
    oRequest._pTypeData = pTypeData;
    oRequest._countLeftAttempts =
      typeof pTypeData == "number" ? 1 : MAX_COUNT_ATTEMPTS;
    oRequest._nTimeSendingRequest = performance.now();
    oRequest._nWaitResponse = NaN;
    oRequest.addEventListener("timeout", HandleError);
    oRequest.addEventListener("error", HandleError);
    oRequest.addEventListener("abort", HandleError);
    oRequest.addEventListener("load", HandleEndingLoad);
    if (isLog && typeof pTypeData == "number") {
      oRequest.addEventListener("readystatechange", HandleReceiptResponse);
    }
    return new Promise((fnExecute, fnGiveup) => {
      oRequest._fnExecute = fnExecute;
      oRequest._fnGiveup = fnGiveup;
      if (oCancelPromise) {
        oRequest._oCancelPromise = oCancelPromise;
        oCancelPromise.ReplaceHandler(GetHandlerCancelPromise(oRequest));
      }
      DispatchRequest(oRequest, false);
    });
  }
  function DispatchRequest(oRequest, isAgain) {
    if (oRequest._countLeftAttempts === 0) {
      return false;
    }
    if (isAgain) {
      m_Log.Oops(`[Loader] Again loading ${oRequest._sTitle}`);
    }
    oRequest._countLeftAttempts--;
    oRequest.open(oRequest._sMethod, oRequest._sAddress);
    oRequest.responseType =
      typeof oRequest._pTypeData == "number" ? "arraybuffer" : "text";
    oRequest.timeout = oRequest._nNotLonger;
    if (oRequest._oHeaders) {
      for (let sHeader of Object.keys(oRequest._oHeaders)) {
        oRequest.setRequestHeader(sHeader, oRequest._oHeaders[sHeader]);
      }
    }
    if (oRequest._pBody instanceof URLSearchParams) {
      oRequest.setRequestHeader(
        "Content-Type",
        "application/x-www-form-urlencoded; charset=UTF-8",
      );
      oRequest.send(oRequest._pBody.toString());
    } else {
      oRequest.send(oRequest._pBody);
    }
    return true;
  }
  function GetHandlerCancelPromise(oRequest) {
    return () => {
      m_Log.Here(
        `[Loader] Cancelling load ${oRequest._sTitle} readyState=${oRequest.readyState}`,
      );
      oRequest.removeEventListener("abort", HandleError);
      oRequest.abort();
      oRequest._fnGiveup(CancelPromise.REASON);
    };
  }
  const HandleReceiptResponse = AddHandlerExceptions(({ target: oRequest }) => {
    if (oRequest.readyState >= XMLHttpRequest.HEADERS_RECEIVED) {
      oRequest.removeEventListener("readystatechange", HandleReceiptResponse);
      Assert(Number.isNaN(oRequest._nWaitResponse));
      oRequest._nWaitResponse = Math.round(
        performance.now() - oRequest._nTimeSendingRequest,
      );
    }
  });
  const HandleError = AddHandlerExceptions(
    ({ target: oRequest, type: sTypeEvent }) => {
      m_Log.Oops(
        `[Loader] Not succeeded load3 ${oRequest._sTitle}. Happened event ${sTypeEvent}` +
          ` readyState=${oRequest.readyState}` +
          (oRequest._isLog && typeof oRequest._pTypeData == "number"
            ? ` WaitResponse=${oRequest._nWaitResponse}strs`
            : ``),
      );
      if (sTypeEvent === "abort" || !DispatchRequest(oRequest, true)) {
        if (oRequest.responseType === "arraybuffer") {
          m_Stats.LoadedSegment(NaN, NaN, NaN, oRequest._nWaitResponse);
        }
        oRequest._oCancelPromise &&
          oRequest._oCancelPromise.ReplaceHandler(null);
        oRequest._fnGiveup(`Happened event ${sTypeEvent}`);
      }
    },
  );
  const HandleEndingLoad = AddHandlerExceptions(({ target: oRequest }) => {
    Assert(oRequest.readyState === XMLHttpRequest.DONE);
    const nCode = oRequest.status;
    if (
      nCode >= 200 &&
      nCode <= 299 &&
      (oRequest._pTypeData === "none" || oRequest.response !== null)
    ) {
      const nDurationLoad = Math.round(
        performance.now() - oRequest._nTimeSendingRequest,
      );
      oRequest._oCancelPromise && oRequest._oCancelPromise.ReplaceHandler(null);
      m_Log.Here(
        `[Loader] Loaded2 ${oRequest._sTitle} for2 ${nDurationLoad}strs` +
          (oRequest._isLog && typeof oRequest._pTypeData == "number"
            ? ` WaitResponse=${oRequest._nWaitResponse}strs`
            : ``) +
          (typeof oRequest._pTypeData == "number"
            ? ` Ratio=${m_Log.F1(nDurationLoad / oRequest._pTypeData / 1e3)}`
            : ``) +
          (nCode === 200 ? `` : ` Code=${nCode} ${oRequest.statusText}`) +
          (oRequest._pTypeData === "none"
            ? ""
            : oRequest._isLog && ThisNonemptyString(oRequest.response)
              ? `\n${oRequest.response}`
              : oRequest.responseType === "arraybuffer"
                ? ` Size=${oRequest.response.byteLength}byte`
                : ` Size=${oRequest.response.length}chars`),
      );
      if (oRequest._nNotLonger !== 0) {
        m_Stats.DownloadedSomething(GetSizeResponse(oRequest));
      }
      switch (oRequest._pTypeData) {
        case "none":
          oRequest._fnExecute();
          break;

        case "text":
          oRequest._fnExecute(oRequest.response);
          break;

        case "json":
          try {
            oRequest._fnExecute(JSON.parse(oRequest.response));
          } catch (pException) {
            m_Log.Oops(
              `[Loader] Not succeeded parse2 ${oRequest._sTitle}. ${pException}`,
            );
            oRequest._fnGiveup("Not succeeded parse2 JSON");
          }
          break;

        default:
          m_Stats.LoadedSegment(
            oRequest.response.byteLength,
            oRequest._pTypeData,
            nDurationLoad,
            oRequest._nWaitResponse,
          );
          oRequest._fnExecute(oRequest.response);
      }
    } else {
      m_Log.Oops(
        `[Loader] Not succeeded load3 ${oRequest._sTitle}. ${CODE_RESPONSE + nCode} ${oRequest.statusText}` +
          (oRequest._isLog && typeof oRequest._pTypeData == "number"
            ? ` WaitResponse=${oRequest._nWaitResponse}strs`
            : ``) +
          (ThisNonemptyString(oRequest.response)
            ? `\n${oRequest.response}`
            : oRequest.response === null
              ? " response=null"
              : oRequest.responseType === "arraybuffer"
                ? ` Size=${oRequest.response.byteLength}byte`
                : ` Size=${oRequest.response.length}chars`),
      );
      if (
        (nCode >= 400 && nCode <= 499) ||
        oRequest.response === null ||
        !DispatchRequest(oRequest, true)
      ) {
        if (oRequest.responseType === "arraybuffer") {
          m_Stats.LoadedSegment(NaN, NaN, NaN, oRequest._nWaitResponse);
        }
        oRequest._oCancelPromise &&
          oRequest._oCancelPromise.ReplaceHandler(null);
        oRequest._fnGiveup(CODE_RESPONSE + nCode);
      }
    }
  });
  function GetSizeResponse(oRequest) {
    let kbSizeHeaders =
      17 + oRequest.statusText.length + oRequest.getAllResponseHeaders().length;
    if (ThisHTTP2(oRequest)) {
      kbSizeHeaders = Math.round(kbSizeHeaders * 0.5);
    }
    let kbSizeBody;
    let sHeader = oRequest.getResponseHeader("Content-Length");
    if (sHeader) {
      kbSizeBody = Number.parseInt(sHeader, 10);
    } else if (oRequest.responseType === "arraybuffer") {
      kbSizeBody = oRequest.response.byteLength;
    } else {
      kbSizeBody = oRequest.response.length;
      sHeader = oRequest.getResponseHeader("Content-Encoding");
      if (sHeader && sHeader !== "identity") {
        kbSizeBody = Math.round(kbSizeBody * 0.35);
      }
    }
    return kbSizeHeaders + kbSizeBody;
  }
  function ThisHTTP2(oRequest) {
    return oRequest.statusText.length === 0;
  }
  function LoadNextSegment() {
    let n = g_objsQueue.length - 1;
    if (
      n >= 0 &&
      g_objsQueue[n].pData === STATE_SWITCH_VARIANT &&
      g_objsQueue[n].nHandling === HANDLING_LOADED
    ) {
      g_objsQueue.ShowState();
      while (--n >= 0 && g_objsQueue[n].nHandling <= HANDLING_LOADED) {
        if (typeof g_objsQueue[n].pData != "number") {
          g_objsQueue.Remove(n);
        }
      }
      g_objsQueue.ShowState();
    } else {
      let countConcurrentLoads = m_Settings.Get("countConcurrentLoads");
      let nDurationAllLoads = 0;
      for (let oSegment of g_objsQueue) {
        if (oSegment.nHandling <= HANDLING_LOADED) {
          nDurationAllLoads += oSegment.nDuration;
          if (oSegment.nHandling <= HANDLING_LOADING) {
            --countConcurrentLoads;
            if (
              oSegment.nHandling === HANDLING_WAITING_LOAD &&
              countConcurrentLoads >= 0
            ) {
              LoadSegment(oSegment);
            }
          }
        }
      }
      const nOverflowQueue =
        m_Settings.Get("nMaxSizeBuffer") + m_Settings.Get("nStretchBuffer");
      if (nDurationAllLoads > nOverflowQueue) {
        m_Log.Oops(
          `[Loader] Duration all loads in queue2 ${m_Log.F1(nDurationAllLoads)}s > ${m_Log.F1(nOverflowQueue)}s`,
        );
        HandleFailedLoadSegment(null);
        LoadNextSegment();
        return;
      }
    }
    m_Converter.ConvertNextSegment();
  }
  function LoadSegment(oSegment) {
    const sAddress = oSegment.pData;
    oSegment.pData = new CancelPromise();
    oSegment.nHandling = HANDLING_LOADING;
    Load(
      oSegment.pData,
      "GET",
      sAddress,
      LoadSegmentNotLonger(oSegment),
      null,
      null,
      `segment ${oSegment.nNumber}`,
      m_Stats.WindowOpen(),
      oSegment.nDuration,
    )
      .then((bufData) => {
        Assert(g_objsQueue.includes(oSegment));
        oSegment.pData = bufData;
        oSegment.nHandling = HANDLING_LOADED;
        LoadNextSegment();
      })
      .catch(
        AddHandlerExceptions((pReason) => {
          if (
            typeof pReason == "string" &&
            oSegment.nHandling === HANDLING_LOADING
          ) {
            Assert(g_objsQueue.includes(oSegment));
            HandleFailedLoadSegment(
              pReason.sReason === CODE_RESPONSE + 404 ||
                pReason.sReason === CODE_RESPONSE + 410
                ? null
                : oSegment,
            );
            Assert(!g_objsQueue.includes(oSegment));
            LoadNextSegment();
          } else if (pReason === CancelPromise.REASON) {
            m_Log.Here(
              `[Loader] Cancelled2 load4 segment3 ${oSegment.nNumber}`,
            );
            Assert(!g_objsQueue.includes(oSegment));
          } else {
            throw pReason;
          }
        }),
      );
  }
  function LoadSegmentNotLonger(oSegment) {
    const nVariable =
      oSegment.nDuration * m_Settings.Get("countConcurrentLoads") * 1.15;
    const nPersistent = 8;
    return (nVariable + nPersistent) * 1e3;
  }
  function HandleFailedLoadSegment(oUnloadedSegment) {
    g_objsQueue.ShowState();
    const countInQueue = g_objsQueue.length;
    if (oUnloadedSegment) {
      g_objsQueue.Remove(oUnloadedSegment);
    } else {
      let nSizeBuffer = m_Settings.Get("nSizeBuffer");
      for (let oSegment, idx = countInQueue; (oSegment = g_objsQueue[--idx]);) {
        if (oSegment.nHandling === HANDLING_WAITING_LOAD) {
          if (nSizeBuffer > 0) {
            nSizeBuffer -= oSegment.nDuration;
          } else {
            g_objsQueue.Remove(idx);
          }
        } else if (oSegment.nHandling === HANDLING_LOADING) {
          g_objsQueue.Remove(idx);
        }
      }
    }
    g_objsQueue.ShowState();
    m_Stats.NotLoadedSegments(countInQueue - g_objsQueue.length);
  }
  const handleChangeNetwork = AddHandlerExceptions((oEvent) => {
    m_Log.Oops(
      `[Loader] Event2 ${oEvent.type} navigator.onLine=${navigator.onLine} connection.type=${navigator.connection && navigator.connection.type}`,
    );
  });
  if (navigator.connection) {
    navigator.connection.addEventListener(
      "onchange" in navigator.connection ? "change" : "typechange",
      handleChangeNetwork,
    );
  } else {
    window.addEventListener("online", handleChangeNetwork);
    window.addEventListener("offline", handleChangeNetwork);
  }
  if (!navigator.onLine) {
    m_Log.Oops("[Loader] navigator.onLine=false");
  }
  return {
    Load,
    LoadText,
    LoadJson,
    LoadNextSegment,
  };
})();

const m_Twitch = (() => {
  const INTERVAL_UPDATE_METADATA_BROADCAST = 6e4;
  const INTERVAL_TRACKING_FOR_WATCH = 2e4;
  let _sAddressTrackingForWatch = "https://spade.twitch.tv/track";
  let _sCodeChannel = "";
  let _sIdChannel = "";
  let _sIdBroadcast = "";
  let _sAddressRecording = "";
  let _sIdDevice = "";
  let _sIdViewer = "";
  let _sCodeViewer = "";
  let _sTokenViewer = "";
  let _sNameViewer = "";
  let _sTokenGql = "";
  let _nTokenGqlExpiresAfter = 0;
  let _sSessionGql = "";
  let _sVersionClient = "";
  let _sPlaySessionID = "";
  let _sIdGame = "";
  let _sTitleGame = "";
  let _oCancelUpdateMetadata = null;
  let _nTimerTrackingForWatch = 0;
  function ClearDataBroadcast() {
    _sIdBroadcast = _sAddressRecording = _sIdGame = _sTitleGame = "";
  }
  function GetAddressChannel(isNotRedirect) {
    return isNotRedirect
      ? `https://www.twitch.tv/${encodeURIComponent(_sCodeChannel)}?${ADDRESS_NOT_REDIRECT}`
      : `https://www.twitch.tv/${encodeURIComponent(_sCodeChannel)}`;
  }
  function GetAddressPanelChat() {
    const sTheme = m_Settings.Get("isDarkenChat") ? "darkpopout&" : "";
    if (m_Settings.Get("isFullChat")) {
      return `https://www.twitch.tv/popout/${encodeURIComponent(_sCodeChannel)}/chat?${sTheme}no-mobile-redirect=true&popout=`;
    }
    return `https://www.twitch.tv/embed/${encodeURIComponent(_sCodeChannel)}/chat?${sTheme}parent=localhost`;
  }
  function GetAddressRecording(sIdRecording) {
    Assert(ThisNonemptyString(sIdRecording));
    return `https://www.twitch.tv/videos/${encodeURIComponent(sIdRecording)}`;
  }
  function getAddressCategory(sNameCategory) {
    Assert(ThisNonemptyString(sNameCategory));
    return `https://www.twitch.tv/directory/category/${encodeURIComponent(sNameCategory)}`;
  }
  function getAddressTeam(sNameTeam) {
    Assert(ThisNonemptyString(sNameTeam));
    return `https://www.twitch.tv/team/${encodeURIComponent(sNameTeam)}`;
  }
  function assertAvailabilityAddress(sAddress) {
    if (sAddress.startsWith("https://coolcmd.github.io/")) {
      return;
    }
    if (
      !/^https?:\/\/(?:[^/]+\.)?(?:twitch\.tv|twitchcdn\.net|ttvnw\.net|jtvnw\.net|live-video\.net|akamaized\.net|cloudfront\.net)\//.test(
        sAddress,
      )
    ) {
      throw new Error(`Unknown address: ${sAddress}`);
    }
  }
  function createUniqueId(countLength) {
    Assert(Number.isInteger(countLength) && countLength > 0);
    const sAllowedChars =
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let sResult = "";
    while (sResult.length !== countLength) {
      sResult +=
        sAllowedChars[Math.floor(Math.random() * sAllowedChars.length)];
    }
    return sResult;
  }
  getTokenGql._oPromise = null;
  getTokenGql.fnChangedTokenGql = null;
  function getTokenGql() {
    const WAIT_RECEIPT_TOKEN = 3e4;
    if (getTokenGql._oPromise === null) {
      getTokenGql._oPromise = new Promise((fnExecute, fnGiveup) => {
        m_Log.Ok("[Twitch] Inserting frame3 for capture2 token GQL");
        const elFrame = document.createElement("iframe");
        elFrame.src = "https://www.twitch.tv/popout/";
        elFrame.id = "tokengql";
        elFrame.hidden = true;
        Assert(!document.getElementById(elFrame.id));
        document.body.appendChild(elFrame);
        const nTimer = setTimeout(
          AddHandlerExceptions(() => {
            m_Log.Oops("[Twitch] Expired time receipt token GQL");
            elFrame.remove();
            getTokenGql._oPromise = getTokenGql.fnChangedTokenGql = null;
            fnGiveup("DENIED_IN_ACCESS");
          }),
          WAIT_RECEIPT_TOKEN,
        );
        getTokenGql.fnChangedTokenGql = () => {
          if (_sTokenGql !== "") {
            clearTimeout(nTimer);
            elFrame.remove();
            getTokenGql._oPromise = getTokenGql.fnChangedTokenGql = null;
            fnExecute(_sTokenGql);
          }
        };
      });
    }
    return getTokenGql._oPromise;
  }
  function sendRequestGql(
    oCancelPromise,
    sRequest,
    oVariables,
    isSendTokenViewer,
    isSendTokenGql,
    isRepeatRequest,
    sTitleLoad,
    nLoadNotLonger = LOAD_METADATA_NOT_LONGER,
  ) {
    const REPEAT_REQUEST_VIA = 5e3;
    Assert(ThisNonemptyString(_sIdDevice));
    if (oVariables !== null) {
      sRequest = createBodyRequestGql(sRequest, oVariables);
    }
    const oHeadersRequest = {
      "Accept-Language": "en-US",
      "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko",
      "Content-Type": "text/plain; charset=UTF-8",
      "X-Device-ID": _sIdDevice,
    };
    if (isSendTokenViewer && _sTokenViewer) {
      oHeadersRequest.Authorization = `OAuth ${_sTokenViewer}`;
    }
    let isFreshToken = false;
    let oPromise;
    if (isSendTokenGql) {
      if (_sTokenGql !== "" && _nTokenGqlExpiresAfter > Date.now()) {
        m_Log.Here(
          `[Twitch] Token GQL expires via ${m_Log.F0((_nTokenGqlExpiresAfter - Date.now()) / 1e3)}s`,
        );
        oHeadersRequest["Client-Integrity"] = _sTokenGql;
        oPromise = Promise.resolve();
      } else {
        isFreshToken = true;
        oPromise = getTokenGql().then((sToken) => {
          oHeadersRequest["Client-Integrity"] = sToken;
        });
      }
    } else {
      oPromise = Promise.resolve();
    }
    return oPromise
      .then(() =>
        m_Loader.Load(
          oCancelPromise,
          "POST",
          "https://gql.twitch.tv/gql",
          nLoadNotLonger,
          oHeadersRequest,
          sRequest,
          sTitleLoad,
          true,
          "json",
        ),
      )
      .then((oResult) => {
        if (!oResult.errors) {
          return oResult;
        }
        let oPromise;
        if (
          oResult.errors.some(
            ({ message }) => message === "failed integrity check",
          )
        ) {
          m_Log.Oops("[Twitch] Server2 not liked token2 GQL");
          if (
            oHeadersRequest["Client-Integrity"] === _sTokenGql &&
            _sTokenGql !== ""
          ) {
            clearTokenGql();
          }
          if (!isSendTokenGql || isFreshToken) {
            throw "DENIED_IN_ACCESS";
          }
          if (
            oHeadersRequest["Client-Integrity"] !== _sTokenGql &&
            _sTokenGql !== ""
          ) {
            oHeadersRequest["Client-Integrity"] = _sTokenGql;
            oPromise = Promise.resolve();
          } else {
            oPromise = getTokenGql().then((sToken) => {
              oHeadersRequest["Client-Integrity"] = sToken;
            });
          }
        } else if (
          oResult.errors.some(({ message }) => message === "service timeout")
        ) {
          if (!isRepeatRequest) {
            m_Log.Oops("[Twitch] Server GQL busy");
            return oResult;
          }
          const retryVia =
            REPEAT_REQUEST_VIA + (REPEAT_REQUEST_VIA / 2) * Math.random();
          m_Log.Oops(
            `[Twitch] Server GQL busy. Request will again sent via ${retryVia.toFixed()}strs`,
          );
          oPromise = Wait(oCancelPromise, retryVia);
        } else {
          m_Log.Oops("[Twitch] IN response3 GQL exists unknown error2");
          return oResult;
        }
        return oPromise
          .then(() =>
            m_Loader.Load(
              oCancelPromise,
              "POST",
              "https://gql.twitch.tv/gql",
              nLoadNotLonger,
              oHeadersRequest,
              sRequest,
              sTitleLoad,
              true,
              "json",
            ),
          )
          .then((oResult) => {
            if (oResult.errors) {
              if (
                oResult.errors.some(
                  ({ message }) => message === "failed integrity check",
                )
              ) {
                m_Log.Oops("[Twitch] Server2 not liked token2 GQL");
                if (
                  oHeadersRequest["Client-Integrity"] === _sTokenGql &&
                  _sTokenGql !== ""
                ) {
                  clearTokenGql();
                }
                throw "DENIED_IN_ACCESS";
              }
              m_Log.Oops(
                oResult.errors.some(
                  ({ message }) => message === "service timeout",
                )
                  ? "[Twitch] Server GQL busy"
                  : "[Twitch] IN response3 GQL exists unknown error2",
              );
            }
            return oResult;
          });
      });
  }
  function ChangeFollowViewerOnChannel(nFollow) {
    Assert(_sIdChannel && _sIdViewer && _sTokenViewer);
    Assert(_sIdChannel !== _sIdViewer);
    switch (nFollow) {
      case FOLLOW_UNFOLLOWED:
        notFollowChannel();
        break;

      case FOLLOW_NONOTIFY:
      case FOLLOW_NOTIFY:
        followChannel(nFollow);
        break;

      default:
        Assert(false);
    }
  }
  function notFollowChannel() {
    sendRequestGql(
      null,
      `mutation($input: UnfollowUserInput!) {\n\t\t\t\tunfollowUser(input: $input) {\n\t\t\t\t\t__typename\n\t\t\t\t}\n\t\t\t}`,
      {
        input: {
          targetID: _sIdChannel,
        },
      },
      true,
      true,
      true,
      "not follow3 channel2",
    )
      .then((oResult) => {
        if (oResult.errors || !oResult.data || !oResult.data.unfollowUser) {
          throw "Server not could execute operation2";
        }
        m_Event.DispatchEvent("twitch-viewermetareceived", {
          nFollow: FOLLOW_UNFOLLOWED,
        });
      })
      .catch((pReason) => {
        if (typeof pReason == "string") {
          m_Log.Oops(`[Twitch] Not succeeded not follow3 channel2. ${pReason}`);
          m_Notice.ShowFail();
          m_Event.DispatchEvent("twitch-viewermetareceived", {
            nFollow: FOLLOW_UNAVAILABLE,
          });
        } else {
          m_Debug.CaughtException(pReason);
        }
      });
  }
  function followChannel(nFollow) {
    sendRequestGql(
      null,
      `mutation($input: FollowUserInput!) {
				followUser(input: $input) {
					error {
						code
					}
					follow {
						user {
							id
						}
					}
				}
			}`,
      {
        input: {
          disableNotifications: nFollow === FOLLOW_NONOTIFY,
          targetID: _sIdChannel,
        },
      },
      true,
      true,
      true,
      "follow3 channel2",
    )
      .then((oResult) => {
        if (
          oResult.errors ||
          !oResult.data ||
          !oResult.data.followUser ||
          !oResult.data.followUser.follow ||
          !oResult.data.followUser.follow.user ||
          oResult.data.followUser.error
        ) {
          throw "Server not could execute operation2";
        }
        m_Event.DispatchEvent("twitch-viewermetareceived", {
          nFollow,
        });
      })
      .catch((pReason) => {
        if (typeof pReason == "string") {
          m_Log.Oops(`[Twitch] Not succeeded follow3 channel2. ${pReason}`);
          m_Notice.ShowFail();
          m_Event.DispatchEvent("twitch-viewermetareceived", {
            nFollow: FOLLOW_UNAVAILABLE,
          });
        } else {
          m_Debug.CaughtException(pReason);
        }
      });
  }
  function thisAdSegment(sNameSegment) {
    return sNameSegment !== "" && sNameSegment !== "live";
  }
  let _oNeedSend = null;
  function sendDataTrackingForAd(oListSegments) {
    if (
      _oNeedSend !== null &&
      (oListSegments === null || _oNeedSend.sTokenAd !== oListSegments.sTokenAd)
    ) {
      sendWatchAdBlock(_oNeedSend);
      _oNeedSend = null;
    }
    if (
      _oNeedSend === null &&
      oListSegments !== null &&
      oListSegments.sTypeAd
    ) {
      _oNeedSend = oListSegments;
    }
  }
  function sendWatchAdBlock(oListSegments) {
    Wait(null, 3e3)
      .then(() => {
        return sendRequestGql(
          null,
          mergeRequestGql([
            createEventAd("video_ad_impression", oListSegments),
            createEventAd("video_ad_quartile_complete", oListSegments, 1),
            createEventAd("video_ad_quartile_complete", oListSegments, 2),
            createEventAd("video_ad_quartile_complete", oListSegments, 3),
            createEventAd("video_ad_quartile_complete", oListSegments, 4),
            createEventAd("video_ad_pod_complete", oListSegments),
          ]),
          null,
          true,
          false,
          false,
          `${oListSegments.sTypeAd} ${oListSegments.sTokenAd.slice(-10)}`,
          3e4,
        );
      })
      .then((objsResults) => {
        for (const oResult of objsResults) {
          if (
            oResult.errors ||
            !oResult.data ||
            !oResult.data.recordAdEvent ||
            oResult.data.recordAdEvent.error
          ) {
            throw `Server not could execute operation2: ${m_Log.O(oResult)}`;
          }
        }
      })
      .catch((pReason) => {
        if (typeof pReason == "string") {
          m_Log.Oops(
            `[Twitch] Not succeeded send data tracking for2 ad4. ${pReason}`,
          );
        } else {
          m_Debug.CaughtException(pReason);
        }
      });
  }
  function createEventAd(sNameEvent, oListSegments, nNumberQuartile) {
    const oDetails = {
      stitched: true,
      player_mute: true,
      player_volume: 0.5,
      visible: true,
      roll_type: oListSegments.sTypeAd.toLowerCase(),
    };
    switch (sNameEvent) {
      case "video_ad_quartile_complete":
        oDetails.quartile = nNumberQuartile;

      case "video_ad_impression":
        oDetails.total_ads = oListSegments.countAdrolls;
        oDetails.ad_position = oListSegments.nNumberAdroll + 1;
        oDetails.duration = Math.round(oListSegments.nDurationAdroll);
        oDetails.ad_id = oListSegments.sIdAdroll1;
        oDetails.creative_id = oListSegments.sIdAdroll2;
        oDetails.line_item_id = oListSegments.sIdAdroll3;
        oDetails.order_id = oListSegments.sIdAdroll4;
        break;

      case "video_ad_pod_complete":
        oDetails.ad_session_id = oListSegments.sIdAdroll5;
        oDetails.format_name = oListSegments.sIdAdroll6;
        break;

      default:
        Assert(false);
    }
    return createBodyRequestGql(
      `mutation($input: RecordAdEventInput!) {
				recordAdEvent(input: $input) {
					error {
						code
					}
				}
			}`,
      {
        input: {
          eventName: sNameEvent,
          eventPayload: JSON.stringify(oDetails),
          radToken: oListSegments.sTokenAd,
        },
      },
    );
  }
  GetAbsoluteAddressListVariants._nExpiresAfter = -1;
  GetAbsoluteAddressListVariants._sAddress = "";
  function GetAbsoluteAddressListVariants(
    oCancelPromise,
    isWithoutHttps,
    isWithoutAd,
    isViaProxy,
  ) {
    const TOKEN_EXPIRES_VIA = 15 * 60 * 1e3;
    if (!isWithoutAd && !isViaProxy) {
      const nExpiresVia =
        GetAbsoluteAddressListVariants._nExpiresAfter - performance.now();
      if (nExpiresVia > 0) {
        m_Log.Here(
          `[Twitch] Until expiry token broadcast left ${m_Log.F0(nExpiresVia / 1e3)}s`,
        );
        return Promise.resolve(GetAbsoluteAddressListVariants._sAddress);
      }
    }
    return sendRequestGql(
      oCancelPromise,
      `query(
				$login: String!
				$playerType: String!
				$disableHTTPS: Boolean!
			) {
				streamPlaybackAccessToken(
					channelName: $login
					params: {
						disableHTTPS: $disableHTTPS
						playerType: $playerType
						platform: "web"
						playerBackend: "mediaplayer"
					}
				) {
					value
					signature
				}
			}`,
      {
        login: _sCodeChannel,
        playerType: isWithoutAd && !isViaProxy ? "picture-by-picture" : "site",
        disableHTTPS: isWithoutHttps,
      },
      true,
      false,
      true,
      `token2 broadcast ${+isWithoutAd}`,
    ).then((oResult) => {
      const sToken = chain(oResult.data, "streamPlaybackAccessToken", "value");
      const sSignature = chain(
        oResult.data,
        "streamPlaybackAccessToken",
        "signature",
      );
      m_Debug.saveTokenBroadcast(
        `IdDevice=${_sIdDevice} TokenViewer=${Boolean(_sTokenViewer)}\n${sToken}`,
        isWithoutAd,
      );
      if (!ThisNonemptyString(sToken) || !ThisNonemptyString(sSignature)) {
        if (oResult.errors) {
          throw "Server not could execute operation2";
        }
        m_Debug.FinishWorkAndShowMessage("J0203");
      }
      const oToken = JSON.parse(sToken);
      Assert(oToken.channel === _sCodeChannel);
      if (oToken.ci_gb) {
        m_Debug.FinishWorkAndShowMessage("J0217");
      }
      if (_sIdChannel === "") {
        Assert(oToken.channel_id);
        _sIdChannel = String(oToken.channel_id);
        setTimeout(AddHandlerExceptions(updateMetadataViewerAndChannel));
      } else {
        Assert(_sIdChannel === String(oToken.channel_id));
      }
      let sAddress =
        `${isWithoutHttps ? "http" : "https"}://usher.ttvnw.net/api/channel/hls/${encodeURIComponent(_sCodeChannel)}.m3u8` +
        "?allow_source=true" +
        "&allow_audio_only=true" +
        "&cdm=wv" +
        "&fast_bread=true" +
        "&platform=web" +
        "&player_backend=mediaplayer" +
        "&playlist_include_framerate=true" +
        "&reassignments_supported=true" +
        "&supported_codecs=av1,h265,h264" +
        "&transcode_mode=cbr_v1" +
        `&p=${Math.floor(Math.random() * 9999999)}` +
        `&token=${encodeURIComponent(sToken)}` +
        `&sig=${encodeURIComponent(sSignature)}`;
      if (!isWithoutAd && !isViaProxy) {
        _sPlaySessionID = createUniqueId(32);
        sAddress += `&play_session_id=${_sPlaySessionID}`;
        GetAbsoluteAddressListVariants._sAddress = sAddress;
        GetAbsoluteAddressListVariants._nExpiresAfter =
          performance.now() + TOKEN_EXPIRES_VIA;
      }
      return sAddress;
    });
  }
  function clearTokenGql() {
    _sTokenGql = "";
    removeCookie("tw5~gqltoken", "https://www.twitch.tv/tw5~storage/").catch(
      m_Debug.CaughtException,
    );
  }
  function getUniqueIdDevice() {
    return (
      "0000000000000000" +
      (m_Settings.Get("nRandomNumber") || 0.1).toFixed(16).slice(2)
    );
  }
  function parseCookieAuthorization(sCookie) {
    if (sCookie) {
      try {
        const o = JSON.parse(decodeURIComponent(sCookie));
        Assert(
          ThisObject(o) &&
            ThisNonemptyString(o.id) &&
            ThisNonemptyString(o.login) &&
            ThisNonemptyString(o.authToken),
        );
        return o;
      } catch (_) {}
      m_Log.Oops(
        `[Twitch] Not succeeded parse2 cookie authorization: ${sCookie}`,
      );
    }
    return {
      id: "",
      login: "",
      authToken: "",
      displayName: "",
    };
  }
  function parseCookieTokenGql(sCookie) {
    if (sCookie) {
      try {
        const o = JSON.parse(decodeURIComponent(sCookie));
        const sToken = typeof o.sToken == "string" ? o.sToken : o["сТокен"];
        const nExpiresAfter = Number.isSafeInteger(o.nExpiresAfter)
          ? o.nExpiresAfter
          : o["чПротухнетПосле"];
        const sSession =
          typeof o.sSession == "string" ? o.sSession : o["сСессия"];
        const sVersion =
          typeof o.sVersion == "string" ? o.sVersion : o["сВерсия"];
        Assert(
          ThisNonemptyString(sToken) && Number.isSafeInteger(nExpiresAfter),
        );
        _sSessionGql = typeof sSession == "string" ? sSession : "";
        _sVersionClient = typeof sVersion == "string" ? sVersion : "";
        return [sToken, nExpiresAfter];
      } catch (_) {
        m_Log.Oops(
          `[Twitch] Not succeeded parse2 cookie token GQL: ${sCookie}`,
        );
      }
    }
    return ["", 0];
  }
  function parseCookie(nAction, { name, domain, path, value }) {
    if (nAction === 3 || typeof value != "string") {
      value = "";
    }
    switch (name) {
      case "twilight-user":
        if (domain === ".twitch.tv" && path === "/") {
          const { id, login, authToken, displayName } =
            parseCookieAuthorization(value);
          if (
            nAction !== 1 &&
            (_sIdViewer !== id ||
              _sCodeViewer !== login ||
              _sTokenViewer !== authToken)
          ) {
            m_Debug.FinishWorkAndShowMessage("J0222");
          }
          _sIdViewer = id;
          _sCodeViewer = login;
          _sTokenViewer = authToken;
          _sNameViewer = ThisNonemptyString(displayName) ? displayName : login;
        }
        break;

      case "unique_id":
        if (
          domain === ".twitch.tv" &&
          path === "/" &&
          nAction === 1 &&
          _sIdDevice === ""
        ) {
          _sIdDevice = value;
        }
        break;

      case "tw5~gqltoken":
        if (domain === "www.twitch.tv" && path === "/tw5~storage/") {
          [_sTokenGql, _nTokenGqlExpiresAfter] = parseCookieTokenGql(value);
          if (getTokenGql.fnChangedTokenGql) {
            getTokenGql.fnChangedTokenGql();
          }
        }
    }
  }
  function start2(sCodeChannel) {
    Assert(ThisNonemptyString(sCodeChannel));
    _sCodeChannel = sCodeChannel;
    return getAllCookie("https://www.twitch.tv/tw5~storage/").then(
      (objsCookie) => {
        for (const oCookie of objsCookie) {
          parseCookie(1, oCookie);
        }
        if (_sIdDevice === "") {
          m_Log.Oops("[Twitch] Not found2 id device2");
          _sIdDevice = getUniqueIdDevice();
        }
        chrome.cookies.onChanged.addListener(
          AddHandlerExceptions(({ removed, cause, cookie }) => {
            if (!(removed && cause === "overwrite")) {
              parseCookie(removed ? 3 : 2, cookie);
            }
          }),
        );
      },
    );
  }
  function updateMetadataViewerAndChannel() {
    Assert(_sIdChannel);
    sendRequestGql(
      null,
      `query($login: String!, $skip: Boolean!) {
				user(login: $login) {
					broadcastSettings {
						language
					}
					createdAt
					description
					displayName
					followers {
						totalCount
					}
					id
					lastBroadcast {
						startedAt
					}
					primaryTeam {
						displayName
						name
					}
					profileImageURL(width: 70)
					self @skip(if: $skip) {
						canFollow
						follower {
							disableNotifications
						}
					}
				}
			}`,
      {
        login: _sCodeChannel,
        skip: _sCodeChannel === _sCodeViewer,
      },
      true,
      false,
      true,
      "metadata channel",
    )
      .then((oResult) => {
        if (!oResult.data) {
          throw "IN response3 server2 none metadata2";
        }
        const oUser = oResult.data.user;
        if (!oUser) {
          m_Debug.FinishWorkAndShowMessage("J0203");
        }
        Assert(oUser.id === _sIdChannel);
        const sCodeLanguage = chain(oUser.broadcastSettings, "language");
        const objsTeam = [];
        if (oUser.primaryTeam) {
          objsTeam.push({
            sAddress: getAddressTeam(oUser.primaryTeam.name),
            sName: oUser.primaryTeam.displayName || oUser.primaryTeam.name,
          });
        }
        const nFollow = !chain(oUser.self, "canFollow")
          ? FOLLOW_UNAVAILABLE
          : !oUser.self.follower
            ? FOLLOW_UNFOLLOWED
            : oUser.self.follower.disableNotifications
              ? FOLLOW_NONOTIFY
              : FOLLOW_NOTIFY;
        m_Event.DispatchEvent("twitch-channelmetareceived", {
          sCode: _sCodeChannel,
          sName: oUser.displayName || _sCodeChannel,
          sAvatar: oUser.profileImageURL || "player.svg#svg-missingavatar",
          sDescription: oUser.description,
          sCodeLanguage:
            sCodeLanguage && sCodeLanguage !== "OTHER" ? sCodeLanguage : null,
          countFollowers: chain(oUser.followers, "totalCount"),
          nChannelCreated: Date.parse(oUser.createdAt),
          objsTeam,
        });
        m_Event.DispatchEvent("twitch-viewermetareceived", {
          sName: _sNameViewer,
          nFollow,
        });
      })
      .catch((pReason) => {
        if (typeof pReason == "string") {
          m_Log.Oops(`[Twitch] Not succeeded get metadata channel. ${pReason}`);
          m_Event.DispatchEvent("twitch-channelmetareceived", {
            sCode: _sCodeChannel,
            sName: _sCodeChannel,
            sAvatar: "player.svg#svg-missingavatar",
            sCodeLanguage: null,
            countFollowers: null,
            nChannelCreated: null,
          });
          m_Event.DispatchEvent("twitch-viewermetareceived", {
            sName: _sNameViewer,
            nFollow: FOLLOW_UNAVAILABLE,
          });
        } else {
          m_Debug.CaughtException(pReason);
        }
      });
  }
  function UpdateMetadataBroadcast(oCancelPromise, nVia) {
    Assert(_sIdChannel);
    m_Log.Here(
      `[Twitch] Load2 metadata2 broadcast starts via ${m_Log.F0(nVia)}strs`,
    );
    Wait(oCancelPromise, nVia)
      .then(() => {
        return sendRequestGql(
          oCancelPromise,
          `query($id: ID!, $all: Boolean!) {
					user(id: $id) {
						broadcastSettings {
							game {
								id
								displayName
								slug
							}
							title
						}
						login
						stream {
							archiveVideo @include(if: $all) {
								id
							}
							createdAt
							id
							type
							viewersCount
						}
					}
				}`,
          {
            id: _sIdChannel,
            all: _sIdBroadcast === "",
          },
          false,
          false,
          true,
          "metadata broadcast",
        );
      })
      .then((oResult) => {
        const oUser = chain(oResult.data, "user");
        const sCodeChannel = chain(oUser, "login");
        if (
          sCodeChannel !== _sCodeChannel &&
          ThisNonemptyString(sCodeChannel)
        ) {
          followChannel(sCodeChannel);
          return;
        }
        const oMetadata = {
          countViewers: chain(oUser, "stream", "viewersCount"),
        };
        const sIdBroadcast = chain(oUser, "stream", "id");
        if (_sIdBroadcast === "" && ThisNonemptyString(sIdBroadcast)) {
          m_Log.Ok(`[Twitch] Id broadcast ${sIdBroadcast}`);
          _sIdBroadcast = sIdBroadcast;
          startTrackingForWatch();
          const sIdRecording = chain(oUser, "stream", "archiveVideo", "id");
          _sAddressRecording = ThisNonemptyString(sIdRecording)
            ? GetAddressRecording(sIdRecording)
            : "";
          const sTypeBroadcast = chain(oUser, "stream", "type");
          oMetadata.sTypeBroadcast =
            sTypeBroadcast === "live"
              ? "live2"
              : sTypeBroadcast === "rerun"
                ? "replay"
                : null;
        }
        if (_sIdBroadcast === "" || _sIdBroadcast === sIdBroadcast) {
          const sTitleBroadcast = chain(oUser, "broadcastSettings", "title");
          if (typeof sTitleBroadcast == "string") {
            oMetadata.sTitleBroadcast = sTitleBroadcast.trim() || Text("J0103");
          }
          oMetadata.sTitleGame = chain(
            oUser,
            "broadcastSettings",
            "game",
            "displayName",
          );
          if (typeof oMetadata.sTitleGame == "string") {
            _sTitleGame = oMetadata.sTitleGame;
          }
          const sIdGame = chain(oUser, "broadcastSettings", "game", "id");
          if (ThisNonemptyString(sIdGame)) {
            _sIdGame = sIdGame;
          }
          const sAddressGame = chain(
            oUser,
            "broadcastSettings",
            "game",
            "slug",
          );
          if (sAddressGame) {
            oMetadata.sAddressGame = getAddressCategory(sAddressGame);
          }
          oMetadata.nDurationBroadcast =
            performance.now() +
            g_nExactTime -
            Date.parse(chain(oUser, "stream", "createdAt"));
        }
        m_Event.DispatchEvent("twitch-broadcastmetareceived", oMetadata);
        UpdateMetadataBroadcast(
          oCancelPromise,
          INTERVAL_UPDATE_METADATA_BROADCAST,
        );
      })
      .catch(
        AddHandlerExceptions((pReason) => {
          if (typeof pReason == "string") {
            m_Log.Oops(
              `[Twitch] Not succeeded load3 metadata broadcast. ${pReason}`,
            );
            UpdateMetadataBroadcast(
              oCancelPromise,
              INTERVAL_UPDATE_METADATA_BROADCAST / 2,
            );
          } else if (pReason === CancelPromise.REASON) {
            m_Log.Here("[Twitch] Cancelled update2 metadata2 broadcast");
          } else {
            throw pReason;
          }
        }),
      );
  }
  function StartCollectMetadataBroadcast() {
    ClearDataBroadcast();
    Assert(!_oCancelUpdateMetadata);
    _oCancelUpdateMetadata = new CancelPromise();
    UpdateMetadataBroadcast(_oCancelUpdateMetadata, 0);
  }
  function FinishCollectMetadataBroadcast(isBroadcastFinished) {
    if (isBroadcastFinished) {
      ClearDataBroadcast();
    }
    if (_oCancelUpdateMetadata) {
      m_Log.Here(
        `[Twitch] Cancelling chain2 update3 metadata2 broadcast BroadcastFinished=${isBroadcastFinished}`,
      );
      _oCancelUpdateMetadata.Cancel();
      _oCancelUpdateMetadata = null;
    }
    finishTrackingForWatch();
  }
  function startTrackingForWatch() {
    if (_sIdViewer !== "") {
      m_Log.Here("[Twitch] Starting tracking2 for2 watch3");
      Assert(_nTimerTrackingForWatch === 0);
      _nTimerTrackingForWatch = setInterval(
        sendDataTrackingForWatch,
        INTERVAL_TRACKING_FOR_WATCH,
      );
      sendDataTrackingForWatch();
      updateDropsInChat().catch(NOOP);
    }
  }
  function finishTrackingForWatch() {
    if (_nTimerTrackingForWatch !== 0) {
      m_Log.Here("[Twitch] Finishing tracking2 for2 watch3");
      clearInterval(_nTimerTrackingForWatch);
      _nTimerTrackingForWatch = 0;
    }
  }
  function encodeDataTracking(pData) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(pData))));
  }
  async function compressTrackingGzipBase64(sJson) {
    const oStream = new Blob([sJson])
      .stream()
      .pipeThrough(new CompressionStream("gzip"));
    const buf = await new Response(oStream).arrayBuffer();
    const bytes2 = new Uint8Array(buf);
    let sBinary = "";
    for (let idx = 0; idx < bytes2.length; idx++) {
      sBinary += String.fromCharCode(bytes2[idx]);
    }
    return btoa(sBinary);
  }
  function textErrorGql(oResult) {
    if (!oResult || !Array.isArray(oResult.errors)) {
      return "";
    }
    return oResult.errors
      .map((oError) => oError && oError.message)
      .filter(Boolean)
      .join("; ");
  }
  function requestGqlDrops(sBody) {
    return new Promise((fnExecute, fnGiveup) => {
      const oRequest = new XMLHttpRequest();
      oRequest.open("POST", "https://gql.twitch.tv/gql");
      oRequest.withCredentials = true;
      oRequest.timeout = 15000;
      oRequest.setRequestHeader("Accept-Language", "en-US");
      oRequest.setRequestHeader("Client-ID", "kimne78kx3ncx6brgo4mv6wki5h1ko");
      oRequest.setRequestHeader("Content-Type", "text/plain; charset=UTF-8");
      if (_sIdDevice) {
        oRequest.setRequestHeader("X-Device-ID", _sIdDevice);
      }
      if (_sTokenViewer) {
        oRequest.setRequestHeader("Authorization", `OAuth ${_sTokenViewer}`);
      }
      if (_sTokenGql) {
        oRequest.setRequestHeader("Client-Integrity", _sTokenGql);
      }
      if (_sSessionGql) {
        oRequest.setRequestHeader("Client-Session-Id", _sSessionGql);
      }
      if (_sVersionClient) {
        oRequest.setRequestHeader("Client-Version", _sVersionClient);
      }
      oRequest.onload = () => {
        try {
          fnExecute(JSON.parse(oRequest.responseText || "null"));
        } catch (pException) {
          fnGiveup(pException);
        }
      };
      oRequest.onerror = () => fnGiveup(new Error("Failed to fetch"));
      oRequest.ontimeout = () => fnGiveup(new Error("timeout"));
      oRequest.send(sBody);
    });
  }
  function requestDropsFromPlayer() {
    const objsHashes = [
      "782dad0f032942260171d2d80a654f88bdd0c5a9dddc392e9bc92218a0f42d20",
      "9a62a09bce5b53e26e64a671e530bc599cb6aab1e5ba3cbd5d85966d3940716f",
    ];
    const requestAvailable = (idx) =>
      requestGqlDrops(
        JSON.stringify({
          operationName: "DropsHighlightService_AvailableDrops",
          variables: {
            channelID: String(_sIdChannel),
          },
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: objsHashes[idx],
            },
          },
        }),
      ).then((oResult) => {
        if (
          /persistedquerynotfound/i.test(textErrorGql(oResult)) &&
          idx + 1 < objsHashes.length
        ) {
          return requestAvailable(idx + 1);
        }
        return oResult;
      });
    const oReady =
      _sTokenGql !== "" ? Promise.resolve() : getTokenGql().catch(() => "");
    return oReady
      .then(() =>
        Promise.all([
          requestAvailable(0),
          requestGqlDrops(
            JSON.stringify({
              operationName: "DropCurrentSessionContext",
              variables: {
                channelID: String(_sIdChannel),
                channelLogin: "",
              },
              extensions: {
                persistedQuery: {
                  version: 1,
                  sha256Hash:
                    "4d06b702d25d652afb9ef835d2a550031f1cf762b193523a92166f40ea3d142b",
                },
              },
            }),
          ),
        ]),
      )
      .then(([availResult, sessionResult]) => {
        const error = [textErrorGql(availResult), textErrorGql(sessionResult)]
          .filter(Boolean)
          .join("; ");
        const campaigns = (
          chain(availResult, "data", "channel", "viewerDropCampaigns") || []
        ).length;
        const session = Boolean(
          chain(sessionResult, "data", "currentUser", "dropCurrentSession"),
        );
        if (error && campaigns === 0 && !session) {
          return {
            error,
            availResult,
            sessionResult,
          };
        }
        return {
          availResult,
          sessionResult,
        };
      });
  }
  function dispatchCacheDrops(nIdTab, oResult) {
    return new Promise((fnExecute) => {
      chrome.tabs.sendMessage(
        nIdTab,
        {
          sRequest: "update-drops-cache",
          availResult: oResult.availResult,
          sessionResult: oResult.sessionResult,
        },
        () => {
          if (!chrome.runtime.lastError) {
            fnExecute();
            return;
          }
          chrome.runtime.sendMessage(
            {
              request: "update-drops-cache",
              tabId: nIdTab,
              availResult: oResult.availResult,
              sessionResult: oResult.sessionResult,
            },
            () => {
              void chrome.runtime.lastError;
              fnExecute();
            },
          );
        },
      );
    });
  }
  function updateDropsInChat() {
    if (!m_Settings.Get("isFullChat") || !_sIdChannel) {
      return Promise.resolve(false);
    }
    const nIdTab = getCurrentTab.nIdTab;
    if (!Number.isSafeInteger(nIdTab)) {
      return Promise.resolve(false);
    }
    const oRequest = {
      channelID: String(_sIdChannel),
      channelLogin: _sCodeChannel || "",
      authToken: _sTokenViewer || "",
      deviceId: _sIdDevice || "",
    };
    const report2 = (oResponse) => {
      if (!oResponse || oResponse.error) {
        console.warn(
          "[tw5-drops] chat query failed:",
          (oResponse && oResponse.error) || "empty",
        );
        m_Log.Oops(
          `[Twitch] Drops in chat3 not updated2. ${(oResponse && oResponse.error) || "empty"}`,
        );
        return false;
      }
      const countCampaigns = (
        chain(
          oResponse.availResult,
          "data",
          "channel",
          "viewerDropCampaigns",
        ) || []
      ).length;
      const isSession = Boolean(
        chain(
          oResponse.sessionResult,
          "data",
          "currentUser",
          "dropCurrentSession",
        ),
      );
      console.info(
        `[tw5-drops] player: campaigns=${countCampaigns} session=${isSession}`,
      );
      m_Log.Here(
        `[Twitch] Drops in chat3: campaigns=${countCampaigns} session=${isSession}`,
      );
      return countCampaigns > 0 || isSession;
    };
    const requestAtChat = () =>
      new Promise((fnExecute, fnGiveup) => {
        chrome.tabs.sendMessage(
          nIdTab,
          Object.assign(
            {
              sRequest: "fetch-drops",
            },
            oRequest,
          ),
          (oResponse) => {
            if (!chrome.runtime.lastError) {
              fnExecute(oResponse);
              return;
            }
            chrome.runtime.sendMessage(
              Object.assign(
                {
                  request: "fetch-drops",
                  tabId: nIdTab,
                },
                oRequest,
              ),
              (oResponseBackground) => {
                if (chrome.runtime.lastError) {
                  fnGiveup(chrome.runtime.lastError.message);
                  return;
                }
                fnExecute(oResponseBackground);
              },
            );
          },
        );
      });
    return requestAtChat().then((oResponse) => {
      if (oResponse && !oResponse.error) {
        return report2(oResponse);
      }
      return requestDropsFromPlayer().then((oLocal) => {
        if (oLocal && !oLocal.error) {
          return dispatchCacheDrops(nIdTab, oLocal).then(() => report2(oLocal));
        }
        return report2(oLocal || oResponse);
      });
    });
  }
  function sendDataTrackingViaChat(sAddress, sBody) {
    const nIdTab = getCurrentTab.nIdTab;
    if (!Number.isSafeInteger(nIdTab)) {
      return Promise.reject("None tab3");
    }
    return new Promise((fnExecute, fnGiveup) => {
      chrome.tabs.sendMessage(
        nIdTab,
        {
          sRequest: "minute-watched",
          sAddress,
          sBody,
        },
        () => {
          if (!chrome.runtime.lastError) {
            fnExecute();
            return;
          }
          chrome.runtime.sendMessage(
            {
              request: "minute-watched",
              tabId: nIdTab,
              url: sAddress,
              body: sBody,
            },
            () => {
              if (chrome.runtime.lastError) {
                fnGiveup(chrome.runtime.lastError.message);
                return;
              }
              fnExecute();
            },
          );
        },
      );
    });
  }
  const sendDataTrackingForWatch = AddHandlerExceptions(() => {
    Assert(_sIdBroadcast && _sIdChannel && _sIdViewer);
    if (!m_Settings.Get("isFullChat")) {
      return;
    }
    const objsEvent = [
      {
        event: "minute-watched",
        properties: {
          broadcast_id: String(_sIdBroadcast),
          channel_id: String(_sIdChannel),
          channel: _sCodeChannel,
          client_time: new Date().toISOString(),
          game: _sTitleGame || "",
          game_id: _sIdGame ? String(_sIdGame) : "",
          hidden: Boolean(document.hidden),
          is_live: true,
          live: true,
          location: "channel",
          logged_in: true,
          minutes_logged: 1,
          muted: Boolean(m_Settings.Get("isMute")),
          player: "site",
          user_id: Number(_sIdViewer),
          ...(_sPlaySessionID ? { play_session_id: _sPlaySessionID } : {}),
          ...(_sIdDevice ? { device_id: _sIdDevice } : {}),
        },
      },
    ];
    const sJson = JSON.stringify(objsEvent);
    const sBody = encodeDataTracking(objsEvent);
    const sAddressSpade = "https://spade.twitch.tv/track";
    sendDataTrackingViaChat(sAddressSpade, sBody).catch(NOOP);
    if (
      _sAddressTrackingForWatch &&
      _sAddressTrackingForWatch !== sAddressSpade
    ) {
      sendDataTrackingViaChat(_sAddressTrackingForWatch, sBody).catch(NOOP);
    }
    compressTrackingGzipBase64(sJson)
      .then((sGzip) => {
        return sendRequestGql(
          null,
          `mutation SendEvents($input: SendSpadeEventsInput!) {
					sendSpadeEvents(input: $input) {
						statusCode
					}
				}`,
          {
            input: {
              data: sGzip,
              repository: "twilight",
              encoding: "GZIP_B64",
            },
          },
          true,
          true,
          false,
          "spade events",
        );
      })
      .catch((pReason) => {
        if (typeof pReason == "string") {
          m_Log.Oops(`[Twitch] Not succeeded send tracking2. ${pReason}`);
        } else {
          m_Debug.CaughtException(pReason);
        }
      });
    updateDropsInChat().catch(NOOP);
  });
  function GetAddressRecordingForCurrentPosition() {
    if (_sAddressRecording === "") {
      m_Log.Oops("[Twitch] Address recording not known");
      return "";
    }
    const nPosition2 = m_Player.GetPositionPlaybackBroadcast(false);
    if (nPosition2 === -1) {
      m_Log.Here(
        "[Twitch] Address recording created without position2 playback",
      );
      return _sAddressRecording;
    }
    return `${_sAddressRecording}?t=${Math.floor(nPosition2 / 60 / 60)}h${Math.floor((nPosition2 / 60) % 60)}m${Math.floor(nPosition2 % 60)}s`;
  }
  function CreateClip() {
    const nPosition2 = m_Player.GetPositionPlaybackBroadcast(true);
    if (_sIdBroadcast === "" || nPosition2 <= 0) {
      m_Log.Oops(
        `[Twitch] Insufficient data2 for creation clip IdBroadcast=${_sIdBroadcast} Position2=${nPosition2}`,
      );
      m_Notice.ShowFail();
    } else {
      m_Log.Ok(
        `[Twitch] Creating clip2 IdBroadcast=${_sIdBroadcast} Position2=${nPosition2} IdViewer=${_sIdViewer}`,
      );
      m_Notice.Show("svg-cut", false);
      OpenAddressInNewTab(
        `https://clips.twitch.tv/create?${new URLSearchParams({
          broadcastID: _sIdBroadcast,
          broadcasterLogin: _sCodeChannel,
          offsetSeconds: Math.ceil(nPosition2),
        })}`,
      );
    }
  }
  function GetAbsoluteAddressListSegments(sAbsoluteAddressListSegments) {
    return sAbsoluteAddressListSegments;
  }
  function sortListVariants(oListVariants) {
    if (oListVariants.sAddressTrackingForWatch) {
      _sAddressTrackingForWatch = oListVariants.sAddressTrackingForWatch;
    }
    oListVariants.objsVariants.sort((oVariant1, oVariant2) => {
      switch (oVariant1.sId) {
        case "chunked":
          return -1;

        case "audio_only":
          return 1;

        default:
          return oVariant2.nBitrate - oVariant1.nBitrate;
      }
    });
    return oListVariants;
  }
  function followChannel(sCodeChannel) {
    if (
      !ThisNonemptyString(sCodeChannel) ||
      sCodeChannel.toLowerCase() === _sCodeChannel.toLowerCase()
    ) {
      return;
    }
    m_Log.Ok(`[Twitch] Following channel ${sCodeChannel}`);
    location.replace(`?channel=${encodeURIComponent(sCodeChannel)}`);
  }
  const handleMessageChat = AddHandlerExceptions(
    (oMessage, oSender, fnReply) => {
      // console.log('[player.js] Message received:', oMessage, 'Sender:', oSender);
      if (
        oMessage.request === "chat-channel" ||
        oMessage.request === "chat-theme"
      ) {
        if (
          (oSender.tab ? oSender.tab.id : chrome.tabs.TAB_ID_NONE) !==
          getCurrentTab.nIdTab
        ) {
          return false;
        }
        const sCode =
          typeof oMessage.channel == "string" ? oMessage.channel : "";
        if (!/^[a-z0-9]\w{2,24}$/i.test(sCode)) {
          return false;
        }
        if (oMessage.request === "chat-channel") {
          followChannel(sCode);
          return false;
        }
        if (sCode.toLowerCase() === _sCodeChannel.toLowerCase()) {
          m_Log.Ok("[Chat] Restoring saved Twitch theme");
          m_Chat.ReloadPanel();
        }
        return false;
      }
      if (oMessage.sRequest !== "InsertThirdpartyExtension") {
        return false;
      }
      if (
        (oSender.tab ? oSender.tab.id : chrome.tabs.TAB_ID_NONE) !==
        getCurrentTab.nIdTab
      ) {
        // console.log('[player.js] Tab ID mismatch, ignoring');
        return false;
      }
      m_Log.Here(
        "[Twitch] Received request on insertion thirdparty extensions",
      );
      chrome.management.getAll(
        AddHandlerExceptions((objsExtension) => {
          if (chrome.runtime.lastError) {
            throw new Error(
              `Not succeeded get list extensions: ${chrome.runtime.lastError.message}`,
            );
          }
          //! Debug: log all extensions (enabled and disabled)
          // console.log('[player.js] All extensions (enabled):', objsExtension.filter(e => e.enabled).map(e => ({name: e.name, id: e.id})));
          // console.log('[player.js] All extensions (disabled):', objsExtension.filter(e => !e.enabled).map(e => ({name: e.name, id: e.id})));

          //! Send to content script a list of known browser extensions that are currently installed and enabled in the browser.
          //! These extensions will be loaded into <iframe>. See insertThirdpartyExtension() in content.js.
          //! Chrome itself cannot load installed extensions into another extension.
          //! See https://bugs.chromium.org/p/chromium/issues/detail?id=599167
          oMessage.sThirdpartyExtension = "";
          for (let oExtension of objsExtension) {
            if (oExtension.enabled) {
              // console.log('[player.js] Checking extension:', oExtension.name, oExtension.id);
              switch (oExtension.id) {
                case /*! Chrome */ "ajopnjidmegmdimjlfnijceegpefgped":
                case /*! Opera  */ "deofbbdfofnmppcjbhjibgodpcdchjii":
                case /*! Edge   */ "icllegkipkooaicfmdfaloehobmglglb":
                  //! BetterTTV browser extension
                  //! https://betterttv.com/
                  //! https://chrome.google.com/webstore/detail/ajopnjidmegmdimjlfnijceegpefgped
                  oMessage.sThirdpartyExtension += "BTTV ";
                  break;

                case /*! Chrome */ "fadndhdgpmmaapbmfcknlfgcflmmmieb":
                case /*! Opera  */ "djkpepcignmpfblhbfpmlhoindhndkdj":
                  //! FrankerFaceZ browser extension
                  //! https://www.frankerfacez.com/
                  //! https://chrome.google.com/webstore/detail/fadndhdgpmmaapbmfcknlfgcflmmmieb
                  oMessage.sThirdpartyExtension += "FFZ ";
              }
            }
          }
          m_Log.Here(
            `[Twitch] Sending response on insertion thirdparty extensions: ${oMessage.sThirdpartyExtension}`,
          );
          try {
            fnReply(oMessage);
          } catch (pException) {
            m_Log.Oops(`[Twitch] Error at2 send2 response2: ${pException}`);
          }
        }),
      );
      return true;
    },
  );
  function openChat() {
    chrome.runtime.onMessage.addListener(handleMessageChat);
    return GetAddressPanelChat();
  }
  function closeChat() {
    chrome.runtime.onMessage.removeListener(handleMessageChat);
  }
  return {
    thisAdSegment,
    sendDataTrackingForAd,
    GetAbsoluteAddressListVariants,
    GetAbsoluteAddressListSegments,
    GetAddressChannel,
    assertAvailabilityAddress,
    StartCollectMetadataBroadcast,
    FinishCollectMetadataBroadcast,
    ChangeFollowViewerOnChannel,
    GetAddressRecordingForCurrentPosition,
    CreateClip,
    sortListVariants,
    openChat,
    closeChat,
    start2,
  };
})();

const m_Subtitles = (() => {
  let _objsTrack = [];
  let _sAddress = "";
  let _isEnabled = false;
  const _setSeen = new Set();
  let _objsReplica = [];
  function parseLabel(sLabel) {
    const strsPart = sLabel.trim().split(":");
    let nSeconds = NaN;
    if (strsPart.length === 3) {
      nSeconds =
        Number(strsPart[0]) * 3600 +
        Number(strsPart[1]) * 60 +
        Number(strsPart[2]);
    } else if (strsPart.length === 2) {
      nSeconds = Number(strsPart[0]) * 60 + Number(strsPart[1]);
    } else if (strsPart.length === 1) {
      nSeconds = Number(strsPart[0]);
    }
    return nSeconds * 1000;
  }
  function parseWebVTT(sText, nBase) {
    const objsReplica = [];
    for (const sBlock of sText
      .replace(/^\uFEFF/, "")
      .replace(/\r\n/g, "\n")
      .split(/\n{2,}/)) {
      const strsString = sBlock.split("\n");
      const nLabel = strsString.findIndex((sString) => sString.includes("-->"));
      if (nLabel === -1) {
        continue;
      }
      const strsBounds = strsString[nLabel].split("-->");
      if (strsBounds.length < 2) {
        continue;
      }
      const nStart = parseLabel(strsBounds[0]);
      const nEnd = parseLabel(strsBounds[1].trim().split(/\s/)[0]);
      if (!Number.isFinite(nStart) || !Number.isFinite(nEnd)) {
        continue;
      }
      const sReplica = strsString
        .slice(nLabel + 1)
        .join("\n")
        .replace(/<[^>]+>/g, "")
        .trim();
      if (sReplica) {
        objsReplica.push({
          nStart: nBase + nStart,
          nEnd: nBase + nEnd,
          sText: sReplica,
        });
      }
    }
    return objsReplica;
  }
  function timeServer() {
    return Number.isFinite(g_nExactTime)
      ? performance.now() + g_nExactTime
      : Date.now();
  }
  function timePicture() {
    const nLatency = Number.isFinite(g_nLatencyBroadcast)
      ? g_nLatencyBroadcast * 1000
      : 0;
    return timeServer() - nLatency;
  }
  function showReplica() {
    const node = byId("subtitles");
    if (!_isEnabled) {
      node.hidden = true;
      return;
    }
    const nNow = timePicture();
    const sText = _objsReplica
      .filter((oReplica) => nNow >= oReplica.nStart && nNow < oReplica.nEnd)
      .map((oReplica) => oReplica.sText)
      .join("\n");
    node.hidden = sText === "";
    if (node.textContent !== sText) {
      node.textContent = sText;
    }
  }
  function loadText(sAddress) {
    return fetch(sAddress, { credentials: "omit" }).then((oResponse) => {
      if (!oResponse.ok) {
        throw new Error(String(oResponse.status));
      }
      return oResponse.text();
    });
  }
  function updateTrack() {
    if (!_isEnabled || !_sAddress) {
      return Promise.resolve();
    }
    return loadText(_sAddress)
      .then((sPlaylist) => {
        const strsString = sPlaylist.split(/\r?\n/);
        let nDuration = 4;
        let nDate = NaN;
        const objsTask = [];
        for (const sString of strsString) {
          if (sString.startsWith("#EXTINF:")) {
            const nNumber2 = parseFloat(sString.slice(8));
            if (Number.isFinite(nNumber2) && nNumber2 > 0) {
              nDuration = nNumber2;
            }
          } else if (sString.startsWith("#EXT-X-PROGRAM-DATE-TIME:")) {
            const nTime = Date.parse(
              sString.slice("#EXT-X-PROGRAM-DATE-TIME:".length),
            );
            nDate = Number.isFinite(nTime) ? nTime : NaN;
          } else if (sString && !sString.startsWith("#")) {
            const sSegment = new URL(sString, _sAddress).href;
            if (!_setSeen.has(sSegment)) {
              _setSeen.add(sSegment);
              objsTask.push({
                sAddress: sSegment,
                nDuration,
                nDate,
              });
            }
            nDate = NaN;
          }
        }
        while (_setSeen.size > 80) {
          _setSeen.delete(_setSeen.values().next().value);
        }
        return objsTask.reduce(
          (oChain, oTask) =>
            oChain.then(() =>
              loadText(oTask.sAddress)
                .then((sVtt) => {
                  const nBase = Number.isFinite(oTask.nDate)
                    ? oTask.nDate
                    : timeServer() - oTask.nDuration * 1000;
                  _objsReplica.push(...parseWebVTT(sVtt, nBase));
                })
                .catch(() => {}),
            ),
          Promise.resolve(),
        );
      })
      .then(() => {
        const nLimit = timeServer() - 120000;
        _objsReplica = _objsReplica.filter(
          (oReplica) => oReplica.nEnd > nLimit,
        );
      })
      .catch(() => {});
  }
  function chooseAddress() {
    if (_objsTrack.length === 0) {
      return "";
    }
    const sLanguage = (navigator.language || "en").slice(0, 2).toLowerCase();
    const oMatch = _objsTrack.find((oTrack) =>
      (oTrack.sLanguage || "").toLowerCase().startsWith(sLanguage),
    );
    return (oMatch || _objsTrack[0]).sAddress;
  }
  function acceptTrack(objsTrack) {
    _objsTrack = Array.isArray(objsTrack) ? objsTrack : [];
    _setSeen.clear();
    _objsReplica = [];
    const nodeButton = byId("togglesubtitles");
    nodeButton.hidden = _objsTrack.length === 0;
    _sAddress = chooseAddress();
    if (_sAddress) {
      nodeButton.title = `${Text("A0680")} (${_objsTrack.map((oTrack) => oTrack.sName).join(", ")})`;
      updateTrack();
    }
  }
  function toggle() {
    _isEnabled = !_isEnabled;
    m_Settings.Change("isSubtitles", _isEnabled);
    byId("togglesubtitles").setAttribute("aria-pressed", String(_isEnabled));
    if (!_isEnabled) {
      byId("subtitles").hidden = true;
      byId("subtitles").textContent = "";
    }
  }
  function Start() {
    _isEnabled = m_Settings.Get("isSubtitles");
    const nodeButton = byId("togglesubtitles");
    nodeButton.setAttribute("aria-pressed", String(_isEnabled));
    nodeButton.addEventListener("click", AddHandlerExceptions(toggle));
    m_Event.AddHandler("list-subtitles", acceptTrack);
    setInterval(AddHandlerExceptions(updateTrack), 4000);
    setInterval(AddHandlerExceptions(showReplica), 200);
  }
  return {
    Start,
  };
})();

function FinishWork(isFast) {
  try {
    g_isWorkFinished = true;
    try {
      chrome.runtime.sendMessage({ request: "ad-proxy", enabled: false });
    } catch (_) {}
    m_Log.Ok("[Launcher] Finishing work");
    window.stop();
    if (!isFast) {
      m_Converter.Stop();
      m_Player.Stop();
      m_Trash.Burn();
    }
    m_Log.Ok("[Launcher] Work finished");
  } catch (_) {}
}

AddHandlerExceptions(() => {
  function ThisChannelAlreadyOpen(sChannel) {
    Assert(ThisNonemptyString(sChannel));
    chrome.runtime.sendMessage(
      {
        sRequest: "ThisChannelAlreadyOpen",
        sChannel,
      },
      (pResponse) => {
        // No response is normal when the channel is not open in another tab.
        // Without checking lastError, Chrome logs: "Unchecked runtime.lastError: The message port closed before a response was received."
        if (chrome.runtime.lastError) {
          return;
        }
        if (pResponse === true) {
          m_Debug.FinishWorkAndShowMessage("J0211");
        }
      },
    );
    chrome.runtime.onMessage.addListener(
      AddHandlerExceptions((oMessage, _, fnReply) => {
        if (oMessage.sRequest === "ThisChannelAlreadyOpen") {
          m_Log.Oops(
            `[Launcher] IN other tab open3 channel2 ${oMessage.sChannel}`,
          );
          if (oMessage.sChannel === sChannel) {
            fnReply(true);
          }
        }
      }),
    );
  }
  function HandleUnloadPage(oEvent) {
    m_Log.Ok(`[Launcher] window.on${oEvent.type}`);
    FinishWork(true);
  }
  function StartWork() {
    Assert(!g_isWorkFinished);
    try {
      chrome.runtime.sendMessage({ request: "ad-proxy", enabled: false });
    } catch (_) {}
    m_Log.Here(`[Launcher] Start2 work2 ${performance.now().toFixed()}strs`);
    window.addEventListener("unload", HandleUnloadPage);
    m_Controls.Start();
    if (m_Player.Start()) {
      m_List.Start();
    } else {
      m_Controls.StopWatchBroadcast();
    }
    m_Stats.Start();
  }
  if (window.top !== window) {
    return;
  }
  if (navigator.userAgent.includes("Gecko/")) {
    m_Debug.FinishWorkAndShowMessage("J0204");
  }
  const sChannel = (
    new URLSearchParams(location.search.slice(1)).get("channel") || "channel"
  ).toLowerCase();
  ThisChannelAlreadyOpen(sChannel);
  Promise.all([
    assertPermissionExtension(),
    m_Settings.Restore(),
    getCurrentTab(),
  ])
    .then(() => m_Twitch.start2(sChannel))
    .then(StartWork)
    .catch(m_Debug.CaughtException);
})();
