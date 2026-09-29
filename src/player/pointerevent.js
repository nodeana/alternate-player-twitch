(() => {
  "use strict";
  const _oProperty = {
    pointerId: 0,
    width: 1,
    height: 1,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: "",
    isPrimary: false,
  };
  class PointerEvent extends MouseEvent {
    constructor(sTypeEvent, oParameters = {}) {
      super(sTypeEvent, oParameters);
      const oDefinitionProperty = {
        enumerable: true,
        configurable: true,
      };
      for (const sName of Object.keys(_oProperty)) {
        if (sName in oParameters) {
          if (
            typeof oParameters[sName] != typeof _oProperty[sName] ||
            Number.isNaN(oParameters[sName])
          ) {
            throw new TypeError(
              `IN constructor PointerEvent passed2 parameter ${sName} invalid type`,
            );
          }
          oDefinitionProperty.value = oParameters[sName];
        } else {
          oDefinitionProperty.value = _oProperty[sName];
        }
        Object.defineProperty(this, sName, oDefinitionProperty);
      }
    }
  }
  let _isDelayMessageMouse = false;
  function CreateAndDispatchEventPointerForMouse(
    oEventMouse,
    sTypeEvent,
    button,
  ) {
    const oParameters = {};
    oParameters.bubbles = oEventMouse.bubbles;
    oParameters.cancelable = oEventMouse.cancelable;
    oParameters.composed = true;
    oParameters.view = oEventMouse.view;
    oParameters.ctrlKey = oEventMouse.ctrlKey;
    oParameters.shiftKey = oEventMouse.shiftKey;
    oParameters.altKey = oEventMouse.altKey;
    oParameters.metaKey = oEventMouse.metaKey;
    oParameters.modifierAltGraph = oEventMouse.getModifierState("AltGraph");
    oParameters.modifierCapsLock = oEventMouse.getModifierState("CapsLock");
    oParameters.modifierNumLock = oEventMouse.getModifierState("NumLock");
    oParameters.modifierScrollLock = oEventMouse.getModifierState("ScrollLock");
    oParameters.screenX = oEventMouse.screenX;
    oParameters.screenY = oEventMouse.screenY;
    oParameters.clientX = oEventMouse.clientX;
    oParameters.clientY = oEventMouse.clientY;
    oParameters.button = button;
    oParameters.buttons = oEventMouse.buttons;
    oParameters.relatedTarget = oEventMouse.relatedTarget;
    oParameters.pressure = oParameters.buttons === 0 ? 0 : 0.5;
    oParameters.pointerType = "mouse";
    oParameters.isPrimary = true;
    const oEventPointer = new PointerEvent(sTypeEvent, oParameters);
    Object.defineProperty(oEventPointer, "timeStamp", {
      enumerable: true,
      configurable: true,
      value: oEventMouse.timeStamp,
    });
    const isCancelled = !oEventMouse.target.dispatchEvent(oEventPointer);
    if (isCancelled) {
      oEventMouse.preventDefault();
    }
    return isCancelled;
  }
  const HandleMouseDown = AddHandlerExceptions((oEventMouse) => {
    if ((oEventMouse.buttons & (oEventMouse.buttons - 1)) == 0) {
      _isDelayMessageMouse = CreateAndDispatchEventPointerForMouse(
        oEventMouse,
        "pointerdown",
        oEventMouse.button,
      );
    } else {
      CreateAndDispatchEventPointerForMouse(
        oEventMouse,
        "pointermove",
        oEventMouse.button,
      );
    }
    if (_isDelayMessageMouse) {
      oEventMouse.stopImmediatePropagation();
    }
  });
  const HandleMouseMove = AddHandlerExceptions((oEventMouse) => {
    CreateAndDispatchEventPointerForMouse(oEventMouse, "pointermove", -1);
    if (_isDelayMessageMouse) {
      oEventMouse.stopImmediatePropagation();
    }
  });
  const HandleMouseUp = AddHandlerExceptions((oEventMouse) => {
    if (oEventMouse.buttons === 0) {
      CreateAndDispatchEventPointerForMouse(
        oEventMouse,
        "pointerup",
        oEventMouse.button,
      );
    } else {
      CreateAndDispatchEventPointerForMouse(
        oEventMouse,
        "pointermove",
        oEventMouse.button,
      );
    }
    if (_isDelayMessageMouse) {
      oEventMouse.stopImmediatePropagation();
    }
    if (oEventMouse.buttons === 0) {
      _isDelayMessageMouse = false;
    }
  });
  const HandleMouseOver = AddHandlerExceptions((oEventMouse) => {
    CreateAndDispatchEventPointerForMouse(oEventMouse, "pointerover", -1);
  });
  const HandleMouseOut = AddHandlerExceptions((oEventMouse) => {
    CreateAndDispatchEventPointerForMouse(oEventMouse, "pointerout", -1);
  });
  Object.defineProperty(window, "PointerEvent", {
    writable: true,
    configurable: true,
    value: PointerEvent,
  });
  m_Log.Oops("[PointerEvent] Using event2 mouse");
  window.addEventListener("mousedown", HandleMouseDown, true);
  window.addEventListener("mousemove", HandleMouseMove, true);
  window.addEventListener("mouseup", HandleMouseUp, true);
  window.addEventListener("mouseover", HandleMouseOver, true);
  window.addEventListener("mouseout", HandleMouseOut, true);
})();
