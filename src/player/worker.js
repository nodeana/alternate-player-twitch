"use strict";

var DO_FIRST_FRAME_KEY = getVersionEngineBrowser() < 50;

var STATE_SWITCH_VARIANT = 9;

function Assert(pCondition) {
  if (!pCondition) {
    throw new Error("Check not passed");
  }
}

function getVersionEngineBrowser() {
  if (!getVersionEngineBrowser.hasOwnProperty("_nResult")) {
    if (navigator.userAgentData) {
      for (const { brand, version } of navigator.userAgentData.brands) {
        if (brand === "Chromium" || brand === "Google Chrome") {
          getVersionEngineBrowser._nResult = Number.parseInt(version, 10);
          break;
        }
      }
    }
    if (!getVersionEngineBrowser._nResult) {
      getVersionEngineBrowser._nResult = navigator.userAgent
        ? Number.parseInt(/Chrome\/(\d+)/.exec(navigator.userAgent)[1], 10)
        : 89;
    }
  }
  return getVersionEngineBrowser._nResult;
}

function thisMobileDevice() {
  if (!thisMobileDevice.hasOwnProperty("_isResult")) {
    thisMobileDevice._isResult = navigator.userAgentData
      ? navigator.userAgentData.mobile
      : navigator.userAgent.includes("Android");
  }
  return thisMobileDevice._isResult;
}

if (getVersionEngineBrowser() < 58) {
  Uint8Array.prototype.copyWithin = function (target, begin, end) {
    target |= 0;
    begin |= 0;
    end |= 0;
    var c = (end - begin) | 0;
    if ((c | 0) > 70) {
      this.set(new Uint8Array(this.buffer, begin, c), target);
    } else {
      while ((begin | 0) < (end | 0)) {
        this[target] = this[begin];
        target = (target + 1) | 0;
        begin = (begin + 1) | 0;
      }
    }
  };
}

if (getVersionEngineBrowser() >= 70) {
  var CreateDataView = (mbBuffer) => new DataView(mbBuffer.buffer);
} else {
  CreateDataView = (mbBuffer) => mbBuffer;
  Uint8Array.prototype.getUint8 = function (at) {
    at |= 0;
    return this[at];
  };
  Uint8Array.prototype.getInt16 = function (at) {
    at |= 0;
    return ((this[at] << 24) >> 16) | this[(at + 1) | 0];
  };
  Uint8Array.prototype.getUint16 = function (at) {
    at |= 0;
    return (this[at] << 8) | this[(at + 1) | 0];
  };
  Uint8Array.prototype.getInt32 = function (at) {
    at |= 0;
    return (
      (this[at] << 24) |
      (this[(at + 1) | 0] << 16) |
      (this[(at + 2) | 0] << 8) |
      this[(at + 3) | 0]
    );
  };
  Uint8Array.prototype.getUint32 = function (at) {
    at |= 0;
    return (
      ((this[at] << 24) |
        (this[(at + 1) | 0] << 16) |
        (this[(at + 2) | 0] << 8) |
        this[(at + 3) | 0]) >>>
      0
    );
  };
  Uint8Array.prototype.setInt8 = Uint8Array.prototype.setUint8 = function (
    at,
    nValue,
  ) {
    at |= 0;
    nValue |= 0;
    this[at] = nValue;
  };
  Uint8Array.prototype.setInt16 = Uint8Array.prototype.setUint16 = function (
    at,
    nValue,
  ) {
    at |= 0;
    nValue |= 0;
    this[at] = nValue >> 8;
    this[(at + 1) | 0] = nValue;
  };
  Uint8Array.prototype.setInt32 = Uint8Array.prototype.setUint32 = function (
    at,
    nValue,
  ) {
    at |= 0;
    nValue |= 0;
    this[at] = nValue >> 24;
    this[(at + 1) | 0] = nValue >> 16;
    this[(at + 2) | 0] = nValue >> 8;
    this[(at + 3) | 0] = nValue;
  };
}

Uint8Array.prototype.getUint64 = function (at) {
  at |= 0;
  return (
    (((this[at] << 24) |
      (this[(at + 1) | 0] << 16) |
      (this[(at + 2) | 0] << 8) |
      this[(at + 3) | 0]) >>>
      0) *
      4294967296 +
    (((this[(at + 4) | 0] << 24) |
      (this[(at + 5) | 0] << 16) |
      (this[(at + 6) | 0] << 8) |
      this[(at + 7) | 0]) >>>
      0)
  );
};

Uint8Array.prototype.setInt64 = Uint8Array.prototype.setUint64 = function (
  at,
  nValue,
) {
  at |= 0;
  var n = Math.trunc(nValue);
  if (n < Number.MIN_SAFE_INTEGER || n > Number.MAX_SAFE_INTEGER) {
    throw new Error(nValue);
  }
  var n32 = (n / 4294967296) | 0;
  this[at] = n32 >> 24;
  this[(at + 1) | 0] = n32 >> 16;
  this[(at + 2) | 0] = n32 >> 8;
  this[(at + 3) | 0] = n32;
  n32 = n | 0;
  this[(at + 4) | 0] = n32 >> 24;
  this[(at + 5) | 0] = n32 >> 16;
  this[(at + 6) | 0] = n32 >> 8;
  this[(at + 7) | 0] = n32;
};

class Wasm {
  constructor() {
    this._oModule = null;
    this._oMemory = null;
    this._oInstance = null;
  }
  _CalculateSizeHeap(kbSize) {
    return (Math.ceil(kbSize) + (Wasm.SIZE_PAGE - 1)) & ~(Wasm.SIZE_PAGE - 1);
  }
  Compile() {
    return fetch("wasm.wasm")
      .then((oResponse) => oResponse.arrayBuffer())
      .then((bufCode) =>
        WebAssembly.compile
          ? WebAssembly.compile(bufCode)
          : new WebAssembly.Module(bufCode),
      )
      .then((oModule) => {
        this._oModule = oModule;
      });
  }
  HighlightMemory(kbSize) {
    kbSize = this._CalculateSizeHeap(kbSize);
    if (this._oMemory === null) {
      this._oMemory = new WebAssembly.Memory({
        initial: kbSize / Wasm.SIZE_PAGE,
      });
      this._oInstance = new WebAssembly.Instance(this._oModule, {
        i: {
          m: this._oMemory,
        },
      });
    } else {
      this._oMemory.grow(
        (kbSize - this._oMemory.buffer.byteLength) / Wasm.SIZE_PAGE,
      );
    }
    return [this._oMemory.buffer, this._oInstance.exports];
  }
  FreeMemory() {
    this._oMemory = null;
    this._oInstance = null;
  }
  static Available() {
    return !!self.WebAssembly;
  }
}

Wasm.SIZE_PAGE = 65536;

class Asmjs {
  _CalculateSizeHeap(kbSize) {
    kbSize = Math.ceil(kbSize);
    if (kbSize <= Wasm.SIZE_PAGE) {
      return Wasm.SIZE_PAGE;
    }
    if (kbSize < 1 << 24) {
      return 1 << (32 - Math.clz32(kbSize - 1));
    }
    return (kbSize + 16777215) & 4278190080;
  }
  Compile() {
    importScripts("asmjs.js");
    return Promise.resolve();
  }
  HighlightMemory(kbSize) {
    kbSize = this._CalculateSizeHeap(kbSize);
    var bufHeap = new ArrayBuffer(kbSize);
    return [bufHeap, AsmjsModule(self, null, bufHeap)];
  }
  FreeMemory() {}
}

class StreamBits {
  constructor(mbBuffer, atStart, atEnd) {
    Assert(
      Number.isInteger(atStart) &&
        Number.isInteger(atEnd) &&
        atStart >= 0 &&
        atEnd <= mbBuffer.length &&
        atEnd >= atStart,
    );
    this._mbBuffer = mbBuffer;
    this._atNextByte = atStart;
    this._nNextBit = 7;
    this.countBitLeft = (atEnd - atStart) * 8;
  }
  SkipBits(countBits) {
    Assert(Number.isInteger(countBits));
    Assert((this.countBitLeft -= countBits) >= 0);
    if (countBits === 1) {
      if (--this._nNextBit < 0) {
        this._nNextBit = 7;
        ++this._atNextByte;
      }
    } else {
      var n = this._nNextBit - countBits;
      if (n >= 0) {
        this._nNextBit = n;
      } else {
        n = -n - 1;
        this._nNextBit = 7 - (n & 7);
        this._atNextByte += (n >>> 3) + 1;
      }
    }
  }
  ReadBits(countBits) {
    Assert(Number.isInteger(countBits));
    Assert((this.countBitLeft -= countBits) >= 0);
    if (countBits === 1) {
      nResult = (this._mbBuffer[this._atNextByte] >>> this._nNextBit) & 1;
      if (--this._nNextBit < 0) {
        this._nNextBit = 7;
        ++this._atNextByte;
      }
    } else {
      Assert(countBits >= 1 && countBits <= 32);
      var nResult = 0;
      var nNextBitResult = countBits - 1;
      var nMask = (1 << (this._nNextBit + 1)) - 1;
      do {
        var nBits = this._mbBuffer[this._atNextByte] & nMask;
        nResult |=
          this._nNextBit < nNextBitResult
            ? nBits << (nNextBitResult - this._nNextBit)
            : nBits >>> (this._nNextBit - nNextBitResult);
        var countBitAdded = Math.min(nNextBitResult, this._nNextBit) + 1;
        if ((this._nNextBit -= countBitAdded) < 0) {
          this._nNextBit = 7;
          ++this._atNextByte;
          nMask = 255;
        }
      } while ((nNextBitResult -= countBitAdded) >= 0);
    }
    return nResult >>> 0;
  }
  ReadUnsignedEg() {
    for (
      var countInitialZeros = 0;
      this.ReadBits(1) === 0;
      ++countInitialZeros
    ) {}
    Assert(countInitialZeros <= 31);
    return countInitialZeros === 0
      ? 0
      : ((1 << countInitialZeros) >>> 0) - 1 + this.ReadBits(countInitialZeros);
  }
  ReadSignedEg() {
    var n = this.ReadUnsignedEg();
    return (n & 1) != 0 ? Math.ceil(n / 2) : -n / 2;
  }
  SkipEg() {
    for (
      var countInitialZeros = 0;
      this.ReadBits(1) === 0;
      ++countInitialZeros
    ) {}
    if (countInitialZeros !== 0) {
      this.SkipBits(countInitialZeros);
    }
  }
}

class IsoBaseMedia {
  constructor(mbBuffer, dvBuffer, atStart) {
    Assert(
      Number.isInteger(atStart) && atStart >= 0 && atStart <= mbBuffer.length,
    );
    this.mbBuffer = mbBuffer;
    this.dvBuffer = dvBuffer;
    this.atStart = atStart;
    this.atEnd = atStart;
  }
  Finish() {
    Assert(
      Number.isInteger(this.atEnd) &&
        this.atEnd >= this.atStart &&
        this.atEnd <= this.mbBuffer.length,
    );
    return this.mbBuffer.subarray(this.atStart, this.atEnd);
  }
  AddFullBox(sType, nVersion, nFlags, pContent) {
    Assert(
      sType.length === 4 &&
        Number.isFinite(nVersion) &&
        Number.isFinite(nFlags),
    );
    Assert(this.atEnd >= this.atStart);
    var atStart = this.atEnd;
    Assert(this.mbBuffer.length - this.atEnd >= 8);
    this.mbBuffer[atStart + 4] = sType.charCodeAt(0);
    this.mbBuffer[atStart + 5] = sType.charCodeAt(1);
    this.mbBuffer[atStart + 6] = sType.charCodeAt(2);
    this.mbBuffer[atStart + 7] = sType.charCodeAt(3);
    this.atEnd += 8;
    if (nVersion !== -1) {
      Assert(
        nVersion >= 0 && nVersion <= 255 && nFlags >= 0 && nFlags <= 16777215,
      );
      Assert(this.mbBuffer.length - this.atEnd >= 4);
      this.dvBuffer.setUint32(atStart + 8, (nVersion << 24) | nFlags);
      this.atEnd += 4;
    }
    if (typeof pContent == "number") {
      Assert(Number.isInteger(pContent) && pContent >= 0);
      this.atEnd += pContent;
      Assert(this.atEnd <= this.mbBuffer.length);
    } else if (typeof pContent == "function") {
      var at = this.atEnd;
      pContent();
      Assert(
        Number.isInteger(this.atEnd) &&
          this.atEnd >= at &&
          this.atEnd <= this.mbBuffer.length,
      );
    } else {
      this.CopyFromArray(this.atEnd, pContent);
    }
    this.dvBuffer.setUint32(atStart, this.atEnd - atStart);
  }
  AddBox(sType, pContent) {
    return this.AddFullBox(sType, -1, -1, pContent);
  }
  CopyFromArray(atWhere, numsFrom) {
    Assert(Number.isInteger(atWhere) && atWhere >= this.atEnd);
    this.mbBuffer.set(numsFrom, atWhere);
    this.atEnd = atWhere + numsFrom.length;
  }
  CopyFromBuffer(atWhere, mbFrom, atStart, atEnd) {
    Assert(Number.isInteger(atWhere) && atWhere >= this.atEnd);
    Assert(mbFrom.buffer !== this.mbBuffer.buffer);
    if (arguments.length === 2) {
      this.mbBuffer.set(mbFrom, atWhere);
      this.atEnd = atWhere + mbFrom.length;
    } else {
      Assert(
        Number.isInteger(atStart) &&
          Number.isInteger(atEnd) &&
          mbFrom.byteOffset === 0,
      );
      this.mbBuffer.set(
        new Uint8Array(mbFrom.buffer, atStart, atEnd - atStart),
        atWhere,
      );
      this.atEnd = atWhere + atEnd - atStart;
    }
  }
}

class ID3 {
  constructor(mbBuffer, atStart, atEnd) {
    var SIZE_HEADER_TAG = 10;
    var SIZE_HEADER_FIELDS = 10;
    Assert(
      mbBuffer.BYTES_PER_ELEMENT === 1 &&
        Number.isInteger(atStart) &&
        Number.isInteger(atEnd) &&
        atStart >= 0 &&
        atStart <= atEnd,
    );
    this._mb = mbBuffer;
    this._atStartTag = -1;
    this._kbSizeTag = -1;
    this._atStartFields = -1;
    this._kbSizeFields = -1;
    var kbSize = atEnd - atStart;
    if (
      kbSize > SIZE_HEADER_TAG + SIZE_HEADER_FIELDS &&
      this._mb[atStart] === 73 &&
      this._mb[atStart + 1] === 68 &&
      this._mb[atStart + 2] === 51 &&
      this._mb[atStart + 3] === 4 &&
      this._mb[atStart + 5] === 0 &&
      this._ParseSynchsafeInteger(atStart + 6) === kbSize - SIZE_HEADER_TAG
    ) {
      this._atStartTag = atStart + SIZE_HEADER_TAG;
      this._kbSizeTag = kbSize - SIZE_HEADER_TAG;
    }
  }
  _ParseSynchsafeInteger(atAddress) {
    var nResult = -1;
    var nByte = this._mb[atAddress];
    if (nByte < 128) {
      var n4Byte = nByte << (24 - 3);
      nByte = this._mb[atAddress + 1];
      if (nByte < 128) {
        n4Byte |= nByte << (16 - 2);
        nByte = this._mb[atAddress + 2];
        if (nByte < 128) {
          n4Byte |= nByte << (8 - 1);
          nByte = this._mb[atAddress + 3];
          if (nByte < 128) {
            nResult = n4Byte | nByte;
          }
        }
      }
    }
    return nResult;
  }
  _GetText() {
    if (this._kbSizeFields < 2 || this._mb[this._atStartFields] !== 3) {
      return null;
    }
    if (ID3._oUtf8Decoder === null) {
      ID3._oUtf8Decoder = new TextDecoder("utf-8", {
        fatal: true,
      });
    }
    try {
      return ID3._oUtf8Decoder.decode(
        new Uint8Array(
          this._mb.buffer,
          this._mb.byteOffset + this._atStartFields + 1,
          this._kbSizeFields - 1,
        ),
      );
    } catch (_) {
      return null;
    }
  }
  *[Symbol.iterator]() {
    var SIZE_HEADER_FIELDS = 10;
    var atTag = this._atStartTag;
    var kbTag = this._kbSizeTag;
    while (kbTag > SIZE_HEADER_FIELDS) {
      var nCode1 = this._mb[atTag];
      var nCode2 = this._mb[atTag + 1];
      var nCode3 = this._mb[atTag + 2];
      var nCode4 = this._mb[atTag + 3];
      if (
        ((nCode1 < 48 || nCode1 > 57) && (nCode1 < 65 || nCode1 > 90)) ||
        ((nCode2 < 48 || nCode2 > 57) && (nCode2 < 65 || nCode2 > 90)) ||
        ((nCode3 < 48 || nCode3 > 57) && (nCode3 < 65 || nCode3 > 90)) ||
        ((nCode4 < 48 || nCode4 > 57) && (nCode4 < 65 || nCode4 > 90))
      ) {
        break;
      }
      if (this._mb[atTag + 9] !== 0) {
        break;
      }
      var kbField = this._ParseSynchsafeInteger(atTag + 4);
      if (kbField < 1 || kbField > kbTag - SIZE_HEADER_FIELDS) {
        break;
      }
      this._atStartFields = atTag + SIZE_HEADER_FIELDS;
      this._kbSizeFields = kbField;
      atTag += SIZE_HEADER_FIELDS + kbField;
      kbTag -= SIZE_HEADER_FIELDS + kbField;
      yield String.fromCharCode(nCode1, nCode2, nCode3, nCode4);
    }
    this._atStartFields = -1;
    this._kbSizeFields = -1;
  }
  GetFirstString() {
    var sText = this._GetText();
    if (sText === null) {
      return null;
    }
    var nEndString = sText.indexOf("\0");
    if (nEndString === -1) {
      return null;
    }
    return sText.slice(0, nEndString);
  }
  ParseTXXX() {
    var sText = this._GetText();
    if (sText === null) {
      return null;
    }
    var nEndString = sText.indexOf("\0");
    if (nEndString === -1) {
      return null;
    }
    var sDescription = sText.slice(0, nEndString);
    var sValue = sText.slice(nEndString + 1);
    if (sValue.indexOf("\0") !== -1) {
      return null;
    }
    return {
      sDescription,
      sValue,
    };
  }
}

ID3._oUtf8Decoder = null;

class Track {
  constructor(kbStructureSample) {
    Assert(Number.isInteger(kbStructureSample) && kbStructureSample >= 0);
    this.atStartMemoryStream = 0;
    this.atEndMemoryStream = 0;
    this.atStartStream = 0;
    this.atEndStream = 0;
    this.atEndMemorySamples = 0;
    this.atStartSamples = 0;
    this.atEndSamples = 0;
    this.kbStructureSample = kbStructureSample;
    this.nVdStart = -1;
    this.nContinuityCounter = -1;
    this.pPesPacketEnd = -1;
  }
  Empty() {
    return this.atEndStream === this.atStartStream;
  }
  GetSizeStream() {
    Assert(
      Number.isInteger(this.atStartStream) &&
        Number.isInteger(this.atEndStream) &&
        this.atStartStream >= 0 &&
        this.atStartStream <= this.atEndStream,
    );
    Assert(
      this.atStartStream >= this.atStartMemoryStream &&
        this.atEndStream <= this.atEndMemoryStream,
    );
    return this.atEndStream - this.atStartStream;
  }
  GetSizeSamples() {
    Assert(
      Number.isInteger(this.atStartSamples) &&
        Number.isInteger(this.atEndSamples) &&
        this.atStartSamples >= 0 &&
        this.atStartSamples <= this.atEndSamples,
    );
    Assert(this.atEndSamples <= this.atEndMemorySamples);
    Assert(
      (this.atEndSamples - this.atStartSamples) % this.kbStructureSample == 0,
    );
    return this.atEndSamples - this.atStartSamples;
  }
  GetCountSamples() {
    return this.GetSizeSamples() / this.kbStructureSample;
  }
  GetNumberSample(atSample) {
    Assert(
      Number.isInteger(this.atStartSamples) &&
        Number.isInteger(this.atEndSamples) &&
        this.atStartSamples >= 0 &&
        this.atStartSamples <= this.atEndSamples,
    );
    Assert(this.atEndSamples <= this.atEndMemorySamples);
    Assert(Number.isInteger(atSample));
    if (this.Empty() || atSample < this.atStartSamples) {
      return NaN;
    }
    Assert(atSample <= this.atEndSamples - this.kbStructureSample);
    Assert((atSample - this.atStartSamples) % this.kbStructureSample == 0);
    return (atSample - this.atStartSamples) / this.kbStructureSample;
  }
}

var m_Log = (() => {
  var _strsImportance = [];
  var _strsRecording = [];
  function Add(sImportance, sRecording) {
    _strsImportance.push(sImportance);
    _strsRecording.push(`[Worker] ${sRecording}`);
  }
  function Here(sRecording) {
    Add("Here", sRecording);
  }
  function Ok(sRecording) {
    Add("Ok", sRecording);
  }
  function Oops(sRecording) {
    Add("Oops", sRecording);
  }
  function Send() {
    if (_strsImportance.length !== 0) {
      postMessage([2, _strsImportance, _strsRecording]);
      _strsImportance.length = 0;
      _strsRecording.length = 0;
    }
  }
  return {
    Here,
    Ok,
    Oops,
    Send,
  };
})();

{
  var SIZE_TRANSPORT_PACKET = 188;
  var TS_TIMESCALE = 9e4;
  var LENGTH_AUDIOSAMPLE = 1024;
  var RATE_SAMPLERATE = [
    96e3, 88200, 64e3, 48e3, 44100, 32e3, 24e3, 22050, 16e3, 12e3, 11025, 8e3,
    7350,
  ];
  var NUMBER_VIDEO_TRACK = 1;
  var NUMBER_AUDIO_TRACK = 2;
  var SIZE_STRUCTURE_AUDIOSAMPLE = 1 * 4;
  var SIZE_STRUCTURE_VIDEOSAMPLE = 4 * 4;
  var DURATION_VIDEOSAMPLE = 0;
  var SIZE_VIDEOSAMPLE = 4;
  var FLAGS_VIDEOSAMPLE = 8;
  var VP_VIDEOSAMPLE = 12;
  var _mUnhandledMessage = [];
  var _oSourceSegment = null;
  var _mbHeap = null;
  var _mcHeap = null;
  var _dvHeap = null;
  var _fnFindPrefix = null;
  var _oAssembler = Wasm.Available() ? new Wasm() : new Asmjs();
  var _isDiscontinuity = true;
  var _oPat = null;
  var _oPmt = null;
  var _trackVideo = new Track(SIZE_STRUCTURE_VIDEOSAMPLE);
  var _trackAudio = new Track(SIZE_STRUCTURE_AUDIOSAMPLE);
  var _trackMetadata = new Track(0);
  var _muStartMetadata = [];
  var _nVdLastVideoSample;
  var _nVdEndVideoSegment;
  var _nVdEndAudioSegment;
  var _nVdLastVideoSamplePreviousVideoSegment;
  var _nVdEndPreviousVideoSegment;
  var _nVdEndPreviousAudioSegment;
  var _anDecoderSpecificInfo = [0, 0];
  var _abSequenceParameterSet;
  var _abPictureParameterSet;
  var _abSequenceParameterSetExt;
  var _nProfileIndication;
  var _nConstraintSetFlag;
  var _nLevelIndication;
  var _nChromaFormatIndication;
  var _nBitDepthLumaMinus8;
  var _nBitDepthChromaMinus8;
  var _nMaxNumberReferenceFrames;
  var _nWidthPicture;
  var _nHeightPicture;
  var _nRateFrames;
  var _nRange;
  var _isInterlaced;
  var _nAudioObjectType;
  var _nRateSamplerate;
  var _nCountChannels;
  var _nConvertedFor = NaN;
  var _isRejected;
  var _isLossVideo;
  var _isLossAudio;
  var _nMinDurationVideoSample;
  var _nMaxDurationVideoSample;
  var _nAverageDurationVideoSample;
  var _nBitrateAudio;
  var _nPositionEncoding;
  var _nPositionBroadcast;
  var _nTimeEncoding;
  function ClearStats() {
    _isRejected = false;
    _isLossVideo = false;
    _isLossAudio = false;
    _nMinDurationVideoSample = +Infinity;
    _nMaxDurationVideoSample = -Infinity;
    _nAverageDurationVideoSample = NaN;
    _nBitrateAudio = NaN;
    _nPositionEncoding = NaN;
    _nPositionBroadcast = NaN;
    _nTimeEncoding = NaN;
  }
  function Reject(pCondition) {
    if (!pCondition) {
      throw new Error("REJECT");
    }
  }
  function Strs(nTimeTp, sUnitMeasurement = "strs") {
    return `${(nTimeTp / (TS_TIMESCALE / 1e3)).toFixed(2)}${sUnitMeasurement}`;
  }
  function SendResult(mbufPass) {
    postMessage([1, _oSourceSegment], mbufPass);
  }
  function FinishWorkAndShowMessage(sCodeMessage) {
    postMessage([4, sCodeMessage]);
    throw void 0;
  }
  function FinishWorkAndSendReport(pException) {
    var sReasonFinishWork =
      pException instanceof Error
        ? `Caught exception in working stream3: ${pException.stack}`
        : `Caught exception in working stream3: [typeof ${typeof pException}] ${new Error(pException).stack}`;
    if (
      typeof _oSourceSegment == "object" &&
      _oSourceSegment !== null &&
      typeof _oSourceSegment.pData == "object" &&
      _oSourceSegment.pData !== null &&
      _oSourceSegment.pData.byteLength
    ) {
      postMessage(
        [3, sReasonFinishWork, _oSourceSegment.pData],
        [_oSourceSegment.pData],
      );
    } else {
      postMessage([3, sReasonFinishWork, null]);
    }
    _oSourceSegment = null;
  }
  function ThrowInTrash(mbJunk) {
    if (thisMobileDevice() || getVersionEngineBrowser() >= 64) {
      return;
    }
    if (mbJunk && mbJunk.buffer.byteLength) {
      Assert(_mbHeap === null || _mbHeap.buffer !== mbJunk.buffer);
      postMessage([5, mbJunk.buffer], [mbJunk.buffer]);
    }
  }
  var m_Memory = (() => {
    var MAX_DURATION_SEGMENT = 30;
    var MAX_RATE_FRAMES = 150;
    var MAX_COUNT_NAL_UNITS_IN_FRAME = 10;
    var STASH = 1.4;
    var SIZE_MULTIPLE_BYTES = 1 << 6;
    var SIZE_DATA_ASSEMBLER = Align(4);
    var SIZE_MEMORY_VIDEOSAMPLES = Align(
      SIZE_STRUCTURE_VIDEOSAMPLE * MAX_RATE_FRAMES * MAX_DURATION_SEGMENT,
    );
    var SIZE_MEMORY_AUDIOSAMPLES = Align(
      ((SIZE_STRUCTURE_AUDIOSAMPLE * RATE_SAMPLERATE[0]) / LENGTH_AUDIOSAMPLE) *
        MAX_DURATION_SEGMENT,
    );
    var SIZE_MEMORY_MEDIASTREAM = Align(1e4);
    var SIZE_RESERVE_VIDEOSTREAM = Align(
      MAX_COUNT_NAL_UNITS_IN_FRAME * MAX_RATE_FRAMES * MAX_DURATION_SEGMENT,
    );
    function Align(nAddressOrSize) {
      return (
        (Math.ceil(nAddressOrSize) + (SIZE_MULTIPLE_BYTES - 1)) &
        ~(SIZE_MULTIPLE_BYTES - 1)
      );
    }
    function Highlight(mbTransportStream) {
      var atHighlight = SIZE_DATA_ASSEMBLER;
      _trackVideo.atStartSamples = _trackVideo.atEndSamples = atHighlight;
      _trackVideo.atEndMemorySamples = atHighlight += SIZE_MEMORY_VIDEOSAMPLES;
      _trackAudio.atStartSamples = _trackAudio.atEndSamples = atHighlight;
      _trackAudio.atEndMemorySamples = atHighlight += SIZE_MEMORY_AUDIOSAMPLES;
      _trackMetadata.atStartMemoryStream =
        _trackMetadata.atStartStream =
        _trackMetadata.atEndStream =
          atHighlight;
      _trackMetadata.atEndMemoryStream = atHighlight += SIZE_MEMORY_MEDIASTREAM;
      _trackVideo.atStartMemoryStream = atHighlight;
      _trackVideo.atStartStream =
        _trackVideo.atEndStream =
        atHighlight +=
          SIZE_RESERVE_VIDEOSTREAM;
      var kbPersistentSize = atHighlight;
      _trackVideo.atEndMemoryStream = atHighlight += Align(
        mbTransportStream.length,
      );
      _trackAudio.atStartMemoryStream =
        _trackAudio.atStartStream =
        _trackAudio.atEndStream =
          atHighlight;
      _trackAudio.atEndMemoryStream = atHighlight += Align(
        mbTransportStream.length,
      );
      var kbVariableSize = atHighlight - kbPersistentSize;
      if (_mbHeap === null || _mbHeap.length < atHighlight) {
        var kbSizeHeap = kbPersistentSize + kbVariableSize * STASH;
        if (_mbHeap === null) {
          m_Log.Here(`Creating heap ${kbSizeHeap} byte`);
        } else {
          m_Log.Oops(
            `Increasing heap s ${_mbHeap.length} until ${kbSizeHeap} byte`,
          );
        }
        var [bufHeap, oExport] = _oAssembler.HighlightMemory(kbSizeHeap);
        _mbHeap = new Uint8Array(bufHeap);
        _mcHeap = new Int32Array(bufHeap);
        _dvHeap = CreateDataView(_mbHeap);
        _fnFindPrefix = oExport.SearchStartCodePrefix;
      }
    }
    function Free() {
      _oAssembler.FreeMemory();
      _mbHeap = null;
      _mcHeap = null;
      _dvHeap = null;
      _fnFindPrefix = null;
    }
    return {
      Highlight,
      Free,
    };
  })();
  function ParseTransportStream(mbTransportStream) {
    Reject(
      mbTransportStream.length !== 0 &&
        mbTransportStream.length % SIZE_TRANSPORT_PACKET == 0,
    );
    _trackVideo.nVdStart = _trackAudio.nVdStart = -1;
    _trackMetadata.nVdStart = 0;
    _trackVideo.pPesPacketEnd =
      _trackAudio.pPesPacketEnd =
      _trackMetadata.pPesPacketEnd =
        -1;
    _muStartMetadata.length = 0;
    _nVdLastVideoSample = -1;
    if (_isDiscontinuity) {
      _trackVideo.nContinuityCounter =
        _trackAudio.nContinuityCounter =
        _trackMetadata.nContinuityCounter =
          -1;
      _oPat = _oPmt = null;
    }
    var nPmtPid = -1,
      nVideoPid = -1,
      nAudioPid = -1,
      nMetadataPid = -1;
    var cPat = 0,
      cPmt = 0,
      countChangesVd = 0;
    var atTransportPacket = _trackVideo.atStartStream | 0;
    _mbHeap.set(mbTransportStream, atTransportPacket);
    for (
      var atEndTransportStream = atTransportPacket + mbTransportStream.length;
      atTransportPacket !== atEndTransportStream;
      atTransportPacket += SIZE_TRANSPORT_PACKET
    ) {
      var nHeaderTransportPacket = _dvHeap.getUint32(atTransportPacket) | 0;
      Reject((nHeaderTransportPacket & 4286578880) == 1191182336);
      var nPid = (nHeaderTransportPacket & 2096896) >> 8;
      var pPayload = atTransportPacket + 4;
      if ((nHeaderTransportPacket & 32) != 0) {
        var cbAdaptationField = _mbHeap[pPayload];
        Assert(cbAdaptationField <= SIZE_TRANSPORT_PACKET - 5);
        Assert(cbAdaptationField === 0 || (_mbHeap[pPayload + 1] & 128) == 0);
        pPayload += 1 + cbAdaptationField;
      }
      var trackHandle;
      switch (nPid) {
        case nVideoPid:
          if ((nHeaderTransportPacket & 4194304) != 0) {
            Assert((_dvHeap.getUint32(pPayload) & 4294967280) == 480);
          }
          trackHandle = _trackVideo;
          break;

        case nAudioPid:
          if ((nHeaderTransportPacket & 4194304) != 0) {
            Assert((_dvHeap.getUint32(pPayload) & 4294967264) == 448);
          }
          trackHandle = _trackAudio;
          break;

        case nMetadataPid:
          if ((nHeaderTransportPacket & 4194304) != 0) {
            Assert(_dvHeap.getUint32(pPayload) === 445);
            Assert((_mbHeap[pPayload + 6] & 4) != 0);
            Assert((_mbHeap[pPayload + 7] & 192) == 128);
            _muStartMetadata.push(_trackMetadata.atEndStream);
          }
          trackHandle = _trackMetadata;
          break;

        case 0:
          Assert((nHeaderTransportPacket & 4194320) == 4194320);
          var oPat = new ProgramAssociationTable(
            pPayload,
            atTransportPacket + SIZE_TRANSPORT_PACKET,
          );
          if (_oPat === null) {
            _oPat = oPat;
            m_Log.Here(
              `PatVersion=${oPat.nPatVersion} ProgramNumber=${oPat.nProgramNumber} PmtPid=${oPat.nPmtPid}`,
            );
          } else {
            Assert(
              _oPat.nPatVersion === oPat.nPatVersion &&
                _oPat.nProgramNumber === oPat.nProgramNumber &&
                _oPat.nPmtPid === oPat.nPmtPid,
            );
          }
          nPmtPid = oPat.nPmtPid;
          ++cPat;
          continue;

        case nPmtPid:
          Assert((nHeaderTransportPacket & 4194320) == 4194320);
          var oPmt = new ProgramMapTable(
            pPayload,
            atTransportPacket + SIZE_TRANSPORT_PACKET,
            _oPat.nProgramNumber,
          );
          if (_oPmt === null) {
            _oPmt = oPmt;
            m_Log.Here(
              `PmtVersion=${oPmt.nPmtVersion} VideoPid=${oPmt.nVideoPid} AudioPid=${oPmt.nAudioPid} MetadataPid=${oPmt.nMetadataPid}`,
            );
          } else {
            Assert(
              _oPmt.nPmtVersion === oPmt.nPmtVersion &&
                _oPmt.nVideoPid === oPmt.nVideoPid &&
                _oPmt.nAudioPid === oPmt.nAudioPid &&
                _oPmt.nMetadataPid === oPmt.nMetadataPid,
            );
          }
          ({ nVideoPid, nAudioPid, nMetadataPid } = oPmt);
          ++cPmt;
          continue;

        default:
          continue;
      }
      if (
        trackHandle.nContinuityCounter !== (nHeaderTransportPacket & 15) &&
        trackHandle.nContinuityCounter !== -1
      ) {
        m_Log.Oops(
          `continuity_counter equal ${nHeaderTransportPacket & 15} instead ${trackHandle.nContinuityCounter} PID=${nPid} OffsetPacket=${mbTransportStream.length - atEndTransportStream + atTransportPacket}`,
        );
        Reject(trackHandle.atEndStream === trackHandle.atStartStream);
      }
      trackHandle.nContinuityCounter = (nHeaderTransportPacket + 1) & 15;
      switch (nHeaderTransportPacket & 4194320) {
        case 16:
          Assert(trackHandle.atEndStream !== trackHandle.atStartStream);
          break;

        case 4194320:
          var cbPesPacket = _dvHeap.getUint16(pPayload + 4);
          var cbPesHeader = _mbHeap[pPayload + 8];
          Assert(
            trackHandle.pPesPacketEnd === trackHandle.atEndStream ||
              trackHandle.pPesPacketEnd === -1,
          );
          if (cbPesPacket !== 0) {
            trackHandle.pPesPacketEnd =
              trackHandle.atEndStream + cbPesPacket - 3 - cbPesHeader;
          } else {
            Assert(nPid === nVideoPid);
            trackHandle.pPesPacketEnd = -1;
          }
          if (nPid === nVideoPid || trackHandle.nVdStart === -1) {
            var nPts, nDts;
            switch (_dvHeap.getUint16(pPayload + 6) & 61632) {
              case 32896:
                Assert(cbPesHeader >= 5);
                nPts = DecodeTimestamp(pPayload + 9, 33);
                nDts = nPts;
                break;

              case 32960:
                Assert(cbPesHeader >= 10);
                nPts = DecodeTimestamp(pPayload + 9, 49);
                nDts = DecodeTimestamp(pPayload + 14, 17);
                break;

              default:
                Assert(false);
            }
            if (trackHandle.nVdStart === -1) {
              trackHandle.nVdStart = nDts;
            }
            if (nPid === nVideoPid) {
              if (nDts === _nVdLastVideoSample && cbPesPacket !== 0) {
                Assert((_mbHeap[pPayload + 6] & 4) == 0);
              } else {
                Assert(
                  _trackVideo.atEndSamples <=
                    _trackVideo.atEndMemorySamples - SIZE_STRUCTURE_VIDEOSAMPLE,
                );
                if (_nVdLastVideoSample !== -1) {
                  var nDurationVideoSample = nDts - _nVdLastVideoSample;
                  if (nDurationVideoSample <= 0) {
                    if (nDurationVideoSample > -10) {
                      nDurationVideoSample = 1;
                      nDts = _nVdLastVideoSample + nDurationVideoSample;
                      ++countChangesVd;
                    } else {
                      Reject(false);
                    }
                  }
                  Assert(nDurationVideoSample < TS_TIMESCALE * 60);
                  _nMinDurationVideoSample = Math.min(
                    _nMinDurationVideoSample,
                    nDurationVideoSample,
                  );
                  _nMaxDurationVideoSample = Math.max(
                    _nMaxDurationVideoSample,
                    nDurationVideoSample,
                  );
                  _dvHeap.setUint32(
                    _trackVideo.atEndSamples +
                      DURATION_VIDEOSAMPLE -
                      SIZE_STRUCTURE_VIDEOSAMPLE,
                    nDurationVideoSample,
                  );
                  _dvHeap.setUint32(
                    _trackVideo.atEndSamples +
                      SIZE_VIDEOSAMPLE -
                      SIZE_STRUCTURE_VIDEOSAMPLE,
                    _trackVideo.atEndStream,
                  );
                }
                _dvHeap.setInt32(
                  _trackVideo.atEndSamples + VP_VIDEOSAMPLE,
                  nPts - nDts,
                );
                _trackVideo.atEndSamples += SIZE_STRUCTURE_VIDEOSAMPLE;
                _nVdLastVideoSample = nDts;
              }
            } else {
              Assert(nPts === nDts);
            }
          }
          pPayload += 9 + cbPesHeader;
          break;

        default:
          Assert(false);
      }
      var cbPayload = atTransportPacket + SIZE_TRANSPORT_PACKET - pPayload;
      Assert(
        cbPayload > 0 &&
          cbPayload + trackHandle.atEndStream <= trackHandle.atEndMemoryStream,
      );
      _mbHeap.copyWithin(
        trackHandle.atEndStream,
        pPayload,
        pPayload + cbPayload,
      );
      trackHandle.atEndStream += cbPayload;
    }
    Assert(
      _trackVideo.pPesPacketEnd === _trackVideo.atEndStream ||
        _trackVideo.pPesPacketEnd === -1,
    );
    Assert(
      _trackAudio.pPesPacketEnd === _trackAudio.atEndStream ||
        _trackAudio.pPesPacketEnd === -1,
    );
    Assert(
      _trackMetadata.pPesPacketEnd === _trackMetadata.atEndStream ||
        _trackMetadata.pPesPacketEnd === -1,
    );
    if (cPat !== 1 || cPmt !== 1) {
      m_Log.Oops(`Count tables in segment2: PAT=${cPat} PMT=${cPmt}`);
    }
    if (countChangesVd !== 0) {
      m_Log.Oops(`Count videosamples s increased VD: ${countChangesVd}`);
    }
    Assert(nVideoPid !== -1 || nAudioPid !== -1);
    _isLossVideo = nVideoPid !== -1 && _trackVideo.Empty();
    _isLossAudio = nAudioPid !== -1 && _trackAudio.Empty();
    if (_isLossVideo || _isLossAudio) {
      m_Log.Oops(
        `Segment not fits for playback: none video ${_isLossVideo}, none audio ${_isLossAudio}`,
      );
      return false;
    }
    var sImportance = _muStartMetadata.length > 1 ? "Oops" : "Here";
    var sRecording = `Metadata=${_muStartMetadata.length}`;
    if (!_trackVideo.Empty()) {
      _dvHeap.setUint32(
        _trackVideo.atEndSamples +
          SIZE_VIDEOSAMPLE -
          SIZE_STRUCTURE_VIDEOSAMPLE,
        _trackVideo.atEndStream,
      );
      var countVideosamples = _trackVideo.GetCountSamples();
      _nAverageDurationVideoSample =
        (_nVdLastVideoSample - _trackVideo.nVdStart) / (countVideosamples - 1);
      if (countVideosamples < 25) {
        sImportance = "Oops";
      }
      sRecording +=
        ` VdFirstViewSample=${(_trackVideo.nVdStart / TS_TIMESCALE).toFixed(5)}` +
        ` VdLastViewSample=${(_nVdLastVideoSample / TS_TIMESCALE).toFixed(5)}` +
        ` DurationViewSegment>${Strs(_nVdLastVideoSample - _trackVideo.nVdStart)} ViewSamples=${countVideosamples}` +
        ` DurationViewSamples=${Strs(_nMinDurationVideoSample, "")}<${Strs(_nAverageDurationVideoSample, "")}<${Strs(_nMaxDurationVideoSample)}` +
        `(${(TS_TIMESCALE / _nMinDurationVideoSample).toFixed(2)}` +
        `<${(TS_TIMESCALE / _nAverageDurationVideoSample).toFixed(2)}` +
        `<${(TS_TIMESCALE / _nMaxDurationVideoSample).toFixed(2)}count/s)`;
    }
    if (!_trackAudio.Empty()) {
      sRecording += ` VdFirstAudioSample=${(_trackAudio.nVdStart / TS_TIMESCALE).toFixed(5)}`;
    }
    if (!_trackVideo.Empty() && !_trackAudio.Empty()) {
      var nOffsetAudio = _trackAudio.nVdStart - _trackVideo.nVdStart;
      if (
        nOffsetAudio < -TS_TIMESCALE * 0.1 ||
        nOffsetAudio > TS_TIMESCALE * 0.2
      ) {
        sImportance = "Oops";
      }
      sRecording += ` OffsetStartAudioSegment=${Strs(_trackAudio.nVdStart - _trackVideo.nVdStart)}`;
    }
    m_Log[sImportance](sRecording);
    _nPositionEncoding =
      (_trackAudio.nVdStart !== -1
        ? _trackAudio.nVdStart
        : _trackVideo.nVdStart) / TS_TIMESCALE;
    return true;
  }
  function DecodeTimestamp(atAddress, nMarkerBits) {
    var n1 = _mbHeap[atAddress] | 0;
    var n2 = _dvHeap.getUint32(atAddress + 1) | 0;
    Assert((n1 & 241) == (nMarkerBits | 0) && (n2 & 65537) == 65537);
    return +(
      (n1 & 14) * (1 << 29) +
      (((n2 >> 2) & 1073709056) | ((n2 >> 1) & 32767))
    );
  }
  function ProgramAssociationTable(atStart, atEnd) {
    Assert(atStart < atEnd);
    atStart += 1 + _mbHeap[atStart];
    Assert(atEnd - atStart >= 16);
    Assert(_mbHeap[atStart] === 0);
    Assert((_dvHeap.getUint16(atStart + 1) & 53247) == 32781);
    Assert((_mbHeap[atStart + 5] & 1) == 1);
    var nPatVersion = _mbHeap[atStart + 5] & 62;
    Assert(_mbHeap[atStart + 6] === 0);
    Assert(_mbHeap[atStart + 7] === 0);
    var nProgramNumber = _dvHeap.getUint16(atStart + 8);
    Assert(nProgramNumber !== 0);
    var nPmtPid = _dvHeap.getUint16(atStart + 10) & 8191;
    Assert(nPmtPid >= 16 && nPmtPid <= 8190);
    this.nPatVersion = nPatVersion;
    this.nProgramNumber = nProgramNumber;
    this.nPmtPid = nPmtPid;
  }
  function ProgramMapTable(atStart, atEnd, nProgramNumber) {
    Assert(atStart < atEnd);
    atStart += 1 + _mbHeap[atStart];
    Assert(atEnd - atStart >= 12);
    Assert(_mbHeap[atStart] === 2);
    var atEndSection = _dvHeap.getUint16(atStart + 1);
    Assert((atEndSection & 49152) == 32768);
    atEndSection = atStart + 3 + (atEndSection & 4095) - 4;
    Assert(atEndSection >= atStart + 12 && atEndSection + 4 <= atEnd);
    Assert(_dvHeap.getUint16(atStart + 3) === nProgramNumber);
    Assert((_mbHeap[atStart + 5] & 1) == 1);
    var nPmtVersion = _mbHeap[atStart + 5] & 62;
    Assert(_mbHeap[atStart + 6] === 0);
    Assert(_mbHeap[atStart + 7] === 0);
    atStart += 12 + (_dvHeap.getUint16(atStart + 10) & 4095);
    var nVideoPid = -1,
      nAudioPid = -1,
      nMetadataPid = -1;
    while (atStart !== atEndSection) {
      var pDescriptor = atStart + 5;
      Assert(pDescriptor <= atEndSection);
      var nElementaryPid = _dvHeap.getUint16(atStart + 1) & 8191;
      Assert(nElementaryPid >= 16 && nElementaryPid <= 8190);
      var nEsInfoLength = _dvHeap.getUint16(atStart + 3) & 4095;
      Assert(pDescriptor + nEsInfoLength <= atEndSection);
      switch (_mbHeap[atStart]) {
        case 27:
          if (nVideoPid === -1) {
            nVideoPid = nElementaryPid;
          } else {
            m_Log.Oops(`Found2 extra videostream PID=${nElementaryPid}`);
          }
          break;

        case 15:
          if (nAudioPid === -1) {
            nAudioPid = nElementaryPid;
          } else {
            m_Log.Oops(`Found2 extra audiostream PID=${nElementaryPid}`);
          }
          break;

        case 21:
          if (
            nEsInfoLength === 15 &&
            _mbHeap[pDescriptor] === 38 &&
            _mbHeap[pDescriptor + 1] === 13 &&
            _mbHeap[pDescriptor + 2] === 255 &&
            _mbHeap[pDescriptor + 3] === 255 &&
            _mbHeap[pDescriptor + 4] === 73 &&
            _mbHeap[pDescriptor + 5] === 68 &&
            _mbHeap[pDescriptor + 6] === 51 &&
            _mbHeap[pDescriptor + 7] === 32 &&
            _mbHeap[pDescriptor + 8] === 255 &&
            _mbHeap[pDescriptor + 9] === 73 &&
            _mbHeap[pDescriptor + 10] === 68 &&
            _mbHeap[pDescriptor + 11] === 51 &&
            _mbHeap[pDescriptor + 12] === 32
          ) {
            if (nMetadataPid === -1) {
              nMetadataPid = nElementaryPid;
            } else {
              m_Log.Oops(
                `Found2 extra metastream PID=${nElementaryPid} metadata_service_id=${_mbHeap[pDescriptor + 13]}`,
              );
            }
          }
      }
      atStart = pDescriptor + nEsInfoLength;
    }
    this.nPmtVersion = nPmtVersion;
    this.nVideoPid = nVideoPid;
    this.nAudioPid = nAudioPid;
    this.nMetadataPid = nMetadataPid;
  }
  function ParseMetadata() {
    for (var idx = 0; idx < _muStartMetadata.length; idx++) {
      var oID3 = new ID3(
        _mbHeap,
        _muStartMetadata[idx],
        _muStartMetadata[idx + 1] || _trackMetadata.atEndStream,
      );
      for (var sIdFields of oID3) {
        if (sIdFields === "TXXX") {
          var { sDescription, sValue } = oID3.ParseTXXX();
          if (sDescription === "segmentmetadata") {
            var oMetadata = JSON.parse(sValue);
            if (Number.isFinite(oMetadata.transc_r)) {
              Assert(
                oMetadata.transc_r > 14200704e5 &&
                  oMetadata.transc_r < 18468864e5,
              );
              _nTimeEncoding = oMetadata.transc_r;
            }
            if (Number.isFinite(oMetadata.stream_offset)) {
              Assert(oMetadata.stream_offset >= 0);
              _nPositionBroadcast = oMetadata.stream_offset;
            }
            return;
          }
        }
      }
    }
  }
  function ParseVideoStream() {
    if (_isDiscontinuity) {
      _abSequenceParameterSet = null;
      _abPictureParameterSet = null;
      _abSequenceParameterSetExt = null;
    }
    if (_trackVideo.Empty()) {
      return true;
    }
    var FLAGS_NORMAL_FRAME = 65536;
    var FLAGS_KEY_FRAME = 0;
    Assert(
      _trackVideo.atStartStream > _trackVideo.atStartMemoryStream &&
        _trackVideo.atEndStream > _trackVideo.atStartStream &&
        _trackVideo.atEndSamples > _trackVideo.atStartSamples,
    );
    var atParsedStream = _trackVideo.atStartMemoryStream;
    var atSampleFirstKeyFrame = -1;
    var cNalUnits = 0,
      cAccessUnits = 0,
      countSamplesWithoutVCL = 0,
      countKeyFrames = 0,
      atSampleLastKeyFrame = -1;
    var atSample = _trackVideo.atStartSamples;
    var atStartNextSample = -1;
    var atStartParsedSample;
    var nFlagsSample;
    var pNalUnitEnd = _fnFindPrefix(
      _trackVideo.atStartStream,
      _trackVideo.atEndStream,
    );
    Assert(pNalUnitEnd === _trackVideo.atStartStream);
    Assert(_mcHeap[0] > 3);
    for (;;) {
      var kbSizePrefix =
        pNalUnitEnd === _trackVideo.atEndStream ? 0 : _mcHeap[0];
      var isStartSample =
        pNalUnitEnd + kbSizePrefix - Math.min(4, kbSizePrefix) >=
        atStartNextSample;
      if (isStartSample && atStartNextSample !== -1) {
        if (nFlagsSample === -1) {
          nFlagsSample = FLAGS_NORMAL_FRAME;
          ++countSamplesWithoutVCL;
        }
        Assert(atParsedStream > atStartParsedSample);
        _dvHeap.setUint32(
          atSample + SIZE_VIDEOSAMPLE,
          atParsedStream - atStartParsedSample,
        );
        _dvHeap.setUint32(atSample + FLAGS_VIDEOSAMPLE, nFlagsSample);
        atSample += SIZE_STRUCTURE_VIDEOSAMPLE;
      }
      if (pNalUnitEnd === _trackVideo.atEndStream) {
        Assert(atSample === _trackVideo.atEndSamples);
        break;
      }
      var pNalUnitBegin = pNalUnitEnd + kbSizePrefix;
      pNalUnitEnd = _fnFindPrefix(pNalUnitBegin, _trackVideo.atEndStream);
      Reject(pNalUnitEnd >= pNalUnitBegin);
      if (isStartSample) {
        Assert(atSample < _trackVideo.atEndSamples);
        atStartNextSample = _dvHeap.getUint32(atSample + SIZE_VIDEOSAMPLE);
        atStartParsedSample = atParsedStream;
        nFlagsSample = -1;
        if (cAccessUnits === 1) {
          cAccessUnits = 0;
        }
      }
      if (pNalUnitBegin === pNalUnitEnd) {
        continue;
      }
      ++cNalUnits;
      var nNalRefIdc = _mbHeap[pNalUnitBegin] & 224;
      Reject(nNalRefIdc < 128);
      switch (_mbHeap[pNalUnitBegin] & 31) {
        case 1:
        case 2:
        case 3:
        case 4:
          Assert(nFlagsSample !== FLAGS_KEY_FRAME);
          nFlagsSample = FLAGS_NORMAL_FRAME;
          break;

        case 5:
          Assert(nNalRefIdc !== 0);
          if (nFlagsSample !== FLAGS_KEY_FRAME) {
            Assert(nFlagsSample !== FLAGS_NORMAL_FRAME);
            nFlagsSample = FLAGS_KEY_FRAME;
            if (atSampleFirstKeyFrame === -1) {
              atSampleFirstKeyFrame = atSample;
            }
            atSampleLastKeyFrame = atSample;
            ++countKeyFrames;
          }
          break;

        case 6:
          Assert(nNalRefIdc === 0);
          break;

        case 7:
          Assert(nNalRefIdc !== 0);
          if (
            _isDiscontinuity &&
            (atSampleFirstKeyFrame === -1 || _abSequenceParameterSet === null)
          ) {
            _abSequenceParameterSet = _mbHeap.slice(pNalUnitBegin, pNalUnitEnd);
          }
          continue;

        case 8:
          Assert(nNalRefIdc !== 0);
          if (
            _isDiscontinuity &&
            (atSampleFirstKeyFrame === -1 || _abPictureParameterSet === null)
          ) {
            _abPictureParameterSet = _mbHeap.slice(pNalUnitBegin, pNalUnitEnd);
          }
          continue;

        case 9:
          Assert(nNalRefIdc === 0);
          ++cAccessUnits;
          continue;

        case 10:
          Assert(nNalRefIdc === 0);
          continue;

        case 11:
          Assert(nNalRefIdc === 0);
          Assert(false);
          continue;

        case 12:
          Assert(nNalRefIdc === 0);
          continue;

        case 13:
          Assert(nNalRefIdc !== 0);
          Assert(false);
          if (
            _isDiscontinuity &&
            (atSampleFirstKeyFrame === -1 ||
              _abSequenceParameterSetExt === null)
          ) {
            _abSequenceParameterSetExt = _mbHeap.slice(
              pNalUnitBegin,
              pNalUnitEnd,
            );
          }
          continue;
      }
      var cbNalUnit = pNalUnitEnd - pNalUnitBegin;
      _dvHeap.setUint32(atParsedStream, cbNalUnit);
      atParsedStream += 4;
      Assert(atParsedStream < pNalUnitBegin);
      _mbHeap.copyWithin(atParsedStream, pNalUnitBegin, pNalUnitEnd);
      atParsedStream += cbNalUnit;
    }
    _trackVideo.atStartStream = _trackVideo.atStartMemoryStream;
    _trackVideo.atEndStream = atParsedStream;
    m_Log.Here(
      "NalUnits=" +
        cNalUnits +
        " KeyFrames=" +
        countKeyFrames +
        " FirstKeyFrame=" +
        _trackVideo.GetNumberSample(atSampleFirstKeyFrame) +
        " LastKeyFrame=" +
        _trackVideo.GetNumberSample(atSampleLastKeyFrame),
    );
    if (countSamplesWithoutVCL !== 0) {
      m_Log.Oops(
        `Videosamples without VCL NAL unit: ${countSamplesWithoutVCL}`,
      );
    }
    if (cAccessUnits > 1) {
      m_Log.Oops("Several access unit in one3 videosample");
    }
    if (_isDiscontinuity) {
      if (
        atSampleFirstKeyFrame === -1 ||
        _abSequenceParameterSet === null ||
        _abPictureParameterSet === null
      ) {
        m_Log.Oops(
          `Segment not fits for playback: not found2 IDR ${atSampleFirstKeyFrame === -1}, not found2 SPS ${_abSequenceParameterSet === null}, not found2 PPS ${_abPictureParameterSet === null}`,
        );
        return false;
      }
      var mbCopy = _abSequenceParameterSet.slice();
      var o = RemoveEmulationPreventionBytesFromNalUnit(
        mbCopy,
        0,
        mbCopy.length,
      );
      ParseSequenceParameterSet(mbCopy, o.atStartRBSP, o.atEndRBSP);
    } else if (
      DO_FIRST_FRAME_KEY &&
      atSampleFirstKeyFrame !== _trackVideo.atStartSamples
    ) {
      m_Log.Oops("Doing first2 videosample2 key");
      _dvHeap.setUint32(
        _trackVideo.atStartSamples + FLAGS_VIDEOSAMPLE,
        FLAGS_KEY_FRAME,
      );
    }
    return true;
  }
  function ParseSequenceParameterSet(mbStream, atStart, atEnd) {
    _nProfileIndication = mbStream[atStart];
    _nConstraintSetFlag = mbStream[atStart + 1];
    _nLevelIndication = mbStream[atStart + 2];
    var oStreamBits = new StreamBits(mbStream, atStart + 3, atEnd);
    oStreamBits.SkipEg();
    var nSeparateColourPlaneFlag = 0;
    _nChromaFormatIndication = 1;
    _nBitDepthLumaMinus8 = 0;
    _nBitDepthChromaMinus8 = 0;
    switch (_nProfileIndication) {
      case 183:
        _nChromaFormatIndication = 0;
        break;

      case 100:
      case 110:
      case 122:
      case 244:
      case 44:
      case 83:
      case 86:
      case 118:
      case 128:
      case 138:
      case 139:
      case 134:
        _nChromaFormatIndication = oStreamBits.ReadUnsignedEg();
        Assert(_nChromaFormatIndication <= 3);
        if (_nChromaFormatIndication === 3) {
          nSeparateColourPlaneFlag = oStreamBits.ReadBits(1);
        }
        _nBitDepthLumaMinus8 = oStreamBits.ReadUnsignedEg();
        Assert(_nBitDepthLumaMinus8 <= 6);
        _nBitDepthChromaMinus8 = oStreamBits.ReadUnsignedEg();
        Assert(_nBitDepthChromaMinus8 <= 6);
        oStreamBits.SkipBits(1);
        if (oStreamBits.ReadBits(1) !== 0) {
          for (
            var i = 0, ic = _nChromaFormatIndication !== 3 ? 8 : 12;
            i < ic;
            ++i
          ) {
            if (oStreamBits.ReadBits(1) !== 0) {
              var nLastScale = 8,
                nNextScale = 8;
              for (var j = 0, jc = i < 6 ? 16 : 64; j < jc; ++j) {
                if (nNextScale !== 0) {
                  nNextScale =
                    (nLastScale + oStreamBits.ReadSignedEg() + 256) % 256;
                }
                if (nNextScale !== 0) {
                  nLastScale = nNextScale;
                }
              }
            }
          }
        }
    }
    oStreamBits.SkipEg();
    switch (oStreamBits.ReadUnsignedEg()) {
      case 0:
        oStreamBits.SkipEg();
        break;

      case 1:
        oStreamBits.SkipBits(1);
        oStreamBits.SkipEg();
        oStreamBits.SkipEg();
        for (i = 0, ic = oStreamBits.ReadUnsignedEg(); i < ic; ++i) {
          oStreamBits.SkipEg();
        }
    }
    _nMaxNumberReferenceFrames = oStreamBits.ReadUnsignedEg();
    oStreamBits.SkipBits(1);
    var nPictureWidthInMacroblocks = oStreamBits.ReadUnsignedEg() + 1;
    var nPictureHeightInMapUnits = oStreamBits.ReadUnsignedEg() + 1;
    var nFrameMacroblocksOnlyFlag = oStreamBits.ReadBits(1);
    if (nFrameMacroblocksOnlyFlag === 0) {
      oStreamBits.SkipBits(1);
    }
    oStreamBits.SkipBits(1);
    var nFrameCropLeftOffset = 0;
    var nFrameCropRightOffset = 0;
    var nFrameCropTopOffset = 0;
    var nFrameCropBottomOffset = 0;
    if (oStreamBits.ReadBits(1) !== 0) {
      nFrameCropLeftOffset = oStreamBits.ReadUnsignedEg();
      nFrameCropRightOffset = oStreamBits.ReadUnsignedEg();
      nFrameCropTopOffset = oStreamBits.ReadUnsignedEg();
      nFrameCropBottomOffset = oStreamBits.ReadUnsignedEg();
    }
    _nRateFrames = 0;
    _nRange = -1;
    if (oStreamBits.ReadBits(1) !== 0) {
      var nAspectRatioIndication;
      if (oStreamBits.ReadBits(1) !== 0) {
        nAspectRatioIndication = oStreamBits.ReadBits(8);
        if (nAspectRatioIndication === 255) {
          oStreamBits.ReadBits(16);
          oStreamBits.ReadBits(16);
        }
      }
      if (oStreamBits.ReadBits(1) !== 0) {
        oStreamBits.SkipBits(1);
      }
      if (oStreamBits.ReadBits(1) !== 0) {
        oStreamBits.ReadBits(3);
        _nRange = oStreamBits.ReadBits(1);
        if (oStreamBits.ReadBits(1) !== 0) {
          oStreamBits.SkipBits(8 + 8 + 8);
        }
      }
      if (oStreamBits.ReadBits(1) !== 0) {
        oStreamBits.SkipEg();
        oStreamBits.SkipEg();
      }
      var nNumUnitsInTick, nTimeScale, nFixedFrameRateFlag;
      if (oStreamBits.ReadBits(1) !== 0) {
        nNumUnitsInTick = oStreamBits.ReadBits(32);
        nTimeScale = oStreamBits.ReadBits(32);
        nFixedFrameRateFlag = oStreamBits.ReadBits(1);
        _nRateFrames =
          nTimeScale / nNumUnitsInTick / (nFixedFrameRateFlag === 0 ? -2 : 2);
      }
    }
    var nCropUnitX = 1;
    var nCropUnitY = 1;
    if (nSeparateColourPlaneFlag === 0 && _nChromaFormatIndication !== 0) {
      nCropUnitX = _nChromaFormatIndication === 3 ? 1 : 2;
      nCropUnitY = _nChromaFormatIndication === 1 ? 2 : 1;
    }
    if (nFrameMacroblocksOnlyFlag === 0) {
      nCropUnitY += nCropUnitY;
      nPictureHeightInMapUnits += nPictureHeightInMapUnits;
    }
    _nWidthPicture =
      nPictureWidthInMacroblocks * 16 -
      nCropUnitX * nFrameCropRightOffset -
      nCropUnitX * nFrameCropLeftOffset;
    _nHeightPicture =
      nPictureHeightInMapUnits * 16 -
      nCropUnitY * nFrameCropBottomOffset -
      nCropUnitY * nFrameCropTopOffset;
    _isInterlaced = nFrameMacroblocksOnlyFlag === 0;
  }
  function RemoveEmulationPreventionBytesFromNalUnit(mbStream, atStart, atEnd) {
    Assert(atStart < atEnd);
    var nNalUnitType = mbStream[atStart++] & 31;
    if (nNalUnitType === 14 || nNalUnitType === 20 || nNalUnitType === 21) {
      Assert(atStart < atEnd);
      atStart += nNalUnitType === 21 && (mbStream[atStart] & 128) != 0 ? 2 : 3;
      Assert(atStart <= atEnd);
    }
    var atStartRBSP = atStart;
    var atEnd2 = atEnd - 2;
    while (atStart < atEnd2) {
      if (mbStream[atStart++] === 0 && mbStream[atStart++] === 0) {
        var nThirdByte = mbStream[atStart++];
        Assert(nThirdByte >= 3);
        if (nThirdByte === 3) {
          var atDecodedStream = atStart - 1;
          Assert(atStart === atEnd || mbStream[atStart] <= 3);
          while (atStart < atEnd2) {
            if (
              (mbStream[atDecodedStream++] = mbStream[atStart++]) === 0 &&
              (mbStream[atDecodedStream++] = mbStream[atStart++]) === 0
            ) {
              nThirdByte = mbStream[atDecodedStream++] = mbStream[atStart++];
              Assert(nThirdByte >= 3);
              if (nThirdByte === 3) {
                --atDecodedStream;
                Assert(atStart === atEnd || mbStream[atStart] <= 3);
              }
            }
          }
          while (atStart !== atEnd) {
            var nLastByte = (mbStream[atDecodedStream++] = mbStream[atStart++]);
          }
          Assert(nLastByte !== 0);
          return {
            atStartRBSP,
            atEndRBSP: atDecodedStream,
          };
        }
      }
    }
    Assert(atStart === atEnd || mbStream[atEnd - 1] !== 0);
    return {
      atStartRBSP,
      atEndRBSP: atEnd,
    };
  }
  function ParseAudioStream() {
    if (_trackAudio.Empty()) {
      return true;
    }
    var ADTS_HEADER_SIZE = 7;
    Assert(
      _trackAudio.atEndStream > _trackAudio.atStartStream &&
        _trackAudio.atEndSamples === _trackAudio.atStartSamples,
    );
    if (_isDiscontinuity) {
      Assert(_trackAudio.GetSizeStream() > ADTS_HEADER_SIZE);
      ParseAdtsFixedHeader(_dvHeap.getUint32(_trackAudio.atStartStream));
    }
    var pAdtsFrame = _trackAudio.atStartStream;
    var atParsedStream = _trackAudio.atStartStream;
    var atSample = _trackAudio.atStartSamples;
    var atEndStream = _trackAudio.atEndStream - ADTS_HEADER_SIZE;
    var atEndMemorySamples =
      _trackAudio.atEndMemorySamples - SIZE_STRUCTURE_AUDIOSAMPLE;
    while (pAdtsFrame < atEndStream) {
      Assert(atSample <= atEndMemorySamples);
      Assert(_mbHeap[pAdtsFrame] === 255 && _mbHeap[pAdtsFrame + 1] === 241);
      Assert((_mbHeap[pAdtsFrame + 6] & 3) == 0);
      var cbAdtsFrame = (_dvHeap.getUint32(pAdtsFrame + 3) >> 13) & 8191;
      var pNextAdtsFrame = pAdtsFrame + cbAdtsFrame;
      Assert(
        cbAdtsFrame > ADTS_HEADER_SIZE &&
          pNextAdtsFrame <= _trackAudio.atEndStream,
      );
      _mbHeap.copyWithin(
        atParsedStream,
        pAdtsFrame + ADTS_HEADER_SIZE,
        pNextAdtsFrame,
      );
      cbAdtsFrame -= ADTS_HEADER_SIZE;
      atParsedStream += cbAdtsFrame;
      _dvHeap.setUint32(atSample, cbAdtsFrame);
      atSample += SIZE_STRUCTURE_AUDIOSAMPLE;
      pAdtsFrame = pNextAdtsFrame;
    }
    Assert(pAdtsFrame === _trackAudio.atEndStream);
    _trackAudio.atEndStream = atParsedStream;
    _trackAudio.atEndSamples = atSample;
    var nDurationAudioSample = LENGTH_AUDIOSAMPLE / _nRateSamplerate;
    var nDurationAudioSegment =
      _trackAudio.GetCountSamples() * nDurationAudioSample;
    _nVdEndAudioSegment =
      _trackAudio.nVdStart + Math.round(nDurationAudioSegment * TS_TIMESCALE);
    _nBitrateAudio =
      (_trackAudio.GetSizeStream() * 8) / 1e3 / nDurationAudioSegment;
    m_Log.Here(
      `VdEndAudioSegment=${(_nVdEndAudioSegment / TS_TIMESCALE).toFixed(5)}` +
        ` DurationAudioSegment=${(nDurationAudioSegment * 1e3).toFixed(2)}strs` +
        ` DurationAudioSample=${(nDurationAudioSample * 1e3).toFixed(2)}strs`,
    );
    return true;
  }
  function ParseAdtsFixedHeader(nAdtsFixedHeader) {
    Assert((nAdtsFixedHeader & 4294901760) == (4293984256 | 0));
    _nAudioObjectType = ((nAdtsFixedHeader >> 14) & 3) + 1;
    Assert(_nAudioObjectType === 2);
    _anDecoderSpecificInfo[0] = _nAudioObjectType << 3;
    var nIndexRateSamplerate = (nAdtsFixedHeader >> 10) & 15;
    _nRateSamplerate = RATE_SAMPLERATE[nIndexRateSamplerate];
    Assert(_nRateSamplerate !== void 0);
    _anDecoderSpecificInfo[0] |= nIndexRateSamplerate >> 1;
    _anDecoderSpecificInfo[1] = (nIndexRateSamplerate << 7) & 128;
    _nCountChannels = (nAdtsFixedHeader >> 6) & 7;
    Assert(_nCountChannels !== 0);
    _anDecoderSpecificInfo[1] |= _nCountChannels << 3;
    m_Log[
      _nAudioObjectType !== 2 || _nRateSamplerate < 44100 || _nCountChannels > 2
        ? "Oops"
        : "Here"
    ](
      `AudioObjectType=${_nAudioObjectType} RateSamplerate=${_nRateSamplerate} CountChannels=${_nCountChannels}`,
    );
  }
  function GetTitleCodecs() {
    var s = 'video/mp4;codecs="';
    if (!_trackVideo.Empty()) {
      s += `avc1.${`0${_nProfileIndication.toString(16)}`.slice(-2).toUpperCase()}${`0${_nConstraintSetFlag.toString(16)}`.slice(-2).toUpperCase()}${`0${_nLevelIndication.toString(16)}`.slice(-2).toUpperCase()}`;
    }
    if (!_trackVideo.Empty() && !_trackAudio.Empty()) {
      s += ",";
    }
    if (!_trackAudio.Empty()) {
      s += `mp4a.40.${_nAudioObjectType}`;
    }
    return s + '"';
  }
  function CreateSegmentInit() {
    var kbSize =
      1100 +
      (_abSequenceParameterSet === null ? 0 : _abSequenceParameterSet.length) +
      (_abPictureParameterSet === null ? 0 : _abPictureParameterSet.length) +
      (_abSequenceParameterSetExt === null
        ? 0
        : _abSequenceParameterSetExt.length) +
      (_trackAudio.Empty() ? 0 : _anDecoderSpecificInfo.length);
    var mbSegment = new Uint8Array(kbSize);
    var dvSegment = CreateDataView(mbSegment);
    var oSegment = new IsoBaseMedia(mbSegment, dvSegment, 0);
    oSegment.AddBox("ftyp", [105, 115, 111, 54, 0, 0, 0, 0, 97, 118, 99, 49]);
    oSegment.AddBox("moov", () => {
      oSegment.AddFullBox(
        "mvhd",
        1,
        0,
        [
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 255, 255,
          255, 255, 255, 255, 255, 255, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255,
        ],
      );
      oSegment.AddBox("mvex", () => {
        if (!_trackVideo.Empty()) {
          oSegment.AddFullBox("trex", 0, 0, 20);
          oSegment.dvBuffer.setUint32(oSegment.atEnd - 20, NUMBER_VIDEO_TRACK);
          oSegment.dvBuffer.setUint32(oSegment.atEnd - 16, 1);
        }
        if (!_trackAudio.Empty()) {
          oSegment.AddFullBox("trex", 0, 0, 20);
          oSegment.dvBuffer.setUint32(oSegment.atEnd - 20, NUMBER_AUDIO_TRACK);
          oSegment.dvBuffer.setUint32(oSegment.atEnd - 16, 1);
          oSegment.dvBuffer.setUint32(oSegment.atEnd - 12, LENGTH_AUDIOSAMPLE);
        }
      });
      if (!_trackVideo.Empty()) {
        AddTrackInSegmentInit(true, oSegment);
      }
      if (!_trackAudio.Empty()) {
        AddTrackInSegmentInit(false, oSegment);
      }
    });
    return oSegment.Finish();
  }
  function AddTrackInSegmentInit(isVideo, oSegment) {
    oSegment.AddBox("trak", () => {
      oSegment.AddFullBox("tkhd", 0, 3, 80);
      oSegment.mbBuffer[oSegment.atEnd - 64] = 255;
      oSegment.mbBuffer[oSegment.atEnd - 63] = 255;
      oSegment.mbBuffer[oSegment.atEnd - 62] = 255;
      oSegment.mbBuffer[oSegment.atEnd - 61] = 255;
      oSegment.mbBuffer[oSegment.atEnd - 43] = 1;
      oSegment.mbBuffer[oSegment.atEnd - 27] = 1;
      oSegment.mbBuffer[oSegment.atEnd - 12] = 64;
      if (isVideo) {
        oSegment.dvBuffer.setUint32(oSegment.atEnd - 72, NUMBER_VIDEO_TRACK);
        oSegment.dvBuffer.setUint16(oSegment.atEnd - 8, _nWidthPicture);
        oSegment.dvBuffer.setUint16(oSegment.atEnd - 4, _nHeightPicture);
      } else {
        oSegment.dvBuffer.setUint32(oSegment.atEnd - 72, NUMBER_AUDIO_TRACK);
        oSegment.dvBuffer.setUint16(oSegment.atEnd - 48, 256);
      }
      oSegment.AddBox("mdia", () => {
        oSegment.AddFullBox("mdhd", 0, 0, 20);
        oSegment.dvBuffer.setUint32(
          oSegment.atEnd - 12,
          isVideo ? TS_TIMESCALE : _nRateSamplerate,
        );
        oSegment.mbBuffer[oSegment.atEnd - 8] = 255;
        oSegment.mbBuffer[oSegment.atEnd - 7] = 255;
        oSegment.mbBuffer[oSegment.atEnd - 6] = 255;
        oSegment.mbBuffer[oSegment.atEnd - 5] = 255;
        oSegment.mbBuffer[oSegment.atEnd - 4] = 85;
        oSegment.mbBuffer[oSegment.atEnd - 3] = 196;
        oSegment.AddFullBox("hdlr", 0, 0, 21);
        if (isVideo) {
          oSegment.mbBuffer[oSegment.atEnd - 17] = 118;
          oSegment.mbBuffer[oSegment.atEnd - 16] = 105;
          oSegment.mbBuffer[oSegment.atEnd - 15] = 100;
          oSegment.mbBuffer[oSegment.atEnd - 14] = 101;
        } else {
          oSegment.mbBuffer[oSegment.atEnd - 17] = 115;
          oSegment.mbBuffer[oSegment.atEnd - 16] = 111;
          oSegment.mbBuffer[oSegment.atEnd - 15] = 117;
          oSegment.mbBuffer[oSegment.atEnd - 14] = 110;
        }
        oSegment.AddBox("minf", () => {
          if (isVideo) {
            oSegment.AddFullBox("vmhd", 0, 1, 8);
          } else {
            oSegment.AddFullBox("smhd", 0, 0, 4);
          }
          oSegment.AddBox("dinf", () => {
            oSegment.AddFullBox("dref", 0, 0, () => {
              oSegment.dvBuffer.setUint32(oSegment.atEnd, 1);
              oSegment.atEnd += 4;
              oSegment.AddFullBox("url ", 0, 1, 0);
            });
          });
          oSegment.AddBox("stbl", () => {
            oSegment.AddFullBox("stsd", 0, 0, () => {
              oSegment.dvBuffer.setUint32(oSegment.atEnd, 1);
              oSegment.atEnd += 4;
              if (isVideo) {
                oSegment.AddBox("avc1", () => {
                  oSegment.dvBuffer.setUint16(oSegment.atEnd + 6, 1);
                  oSegment.dvBuffer.setUint16(
                    oSegment.atEnd + 24,
                    _nWidthPicture,
                  );
                  oSegment.dvBuffer.setUint16(
                    oSegment.atEnd + 26,
                    _nHeightPicture,
                  );
                  oSegment.dvBuffer.setUint32(oSegment.atEnd + 28, 4718592);
                  oSegment.dvBuffer.setUint32(oSegment.atEnd + 32, 4718592);
                  oSegment.dvBuffer.setUint16(oSegment.atEnd + 40, 1);
                  oSegment.dvBuffer.setUint16(oSegment.atEnd + 74, 24);
                  oSegment.dvBuffer.setUint16(oSegment.atEnd + 76, 65535);
                  oSegment.atEnd += 78;
                  oSegment.AddBox("avcC", () => {
                    oSegment.mbBuffer[oSegment.atEnd] = 1;
                    oSegment.mbBuffer[oSegment.atEnd + 1] = _nProfileIndication;
                    oSegment.mbBuffer[oSegment.atEnd + 2] = _nConstraintSetFlag;
                    oSegment.mbBuffer[oSegment.atEnd + 3] = _nLevelIndication;
                    oSegment.mbBuffer[oSegment.atEnd + 4] = 255;
                    oSegment.mbBuffer[oSegment.atEnd + 5] = 225;
                    oSegment.dvBuffer.setUint16(
                      oSegment.atEnd + 6,
                      _abSequenceParameterSet.length,
                    );
                    oSegment.CopyFromBuffer(
                      oSegment.atEnd + 8,
                      _abSequenceParameterSet,
                    );
                    oSegment.mbBuffer[oSegment.atEnd] = 1;
                    oSegment.dvBuffer.setUint16(
                      oSegment.atEnd + 1,
                      _abPictureParameterSet.length,
                    );
                    oSegment.CopyFromBuffer(
                      oSegment.atEnd + 3,
                      _abPictureParameterSet,
                    );
                    switch (_nProfileIndication) {
                      case 100:
                      case 110:
                      case 122:
                      case 144:
                        oSegment.mbBuffer[oSegment.atEnd] =
                          252 | _nChromaFormatIndication;
                        oSegment.mbBuffer[oSegment.atEnd + 1] =
                          248 | _nBitDepthLumaMinus8;
                        oSegment.mbBuffer[oSegment.atEnd + 2] =
                          248 | _nBitDepthChromaMinus8;
                        if (_abSequenceParameterSetExt === null) {
                          oSegment.atEnd += 4;
                        } else {
                          oSegment.mbBuffer[oSegment.atEnd + 3] = 1;
                          oSegment.dvBuffer.setUint16(
                            oSegment.atEnd + 4,
                            _abSequenceParameterSetExt.length,
                          );
                          oSegment.CopyFromBuffer(
                            oSegment.atEnd + 6,
                            _abSequenceParameterSetExt,
                          );
                        }
                    }
                  });
                });
              } else {
                oSegment.AddBox("mp4a", () => {
                  oSegment.dvBuffer.setUint16(oSegment.atEnd + 6, 1);
                  oSegment.dvBuffer.setUint16(
                    oSegment.atEnd + 16,
                    _nCountChannels === 1 ? 1 : 2,
                  );
                  oSegment.dvBuffer.setUint16(oSegment.atEnd + 18, 16);
                  oSegment.dvBuffer.setUint32(
                    oSegment.atEnd + 24,
                    _nRateSamplerate << 16,
                  );
                  oSegment.atEnd += 28;
                  oSegment.AddFullBox("esds", 0, 0, () => {
                    oSegment.mbBuffer[oSegment.atEnd] = 3;
                    oSegment.mbBuffer[oSegment.atEnd + 1] =
                      23 + _anDecoderSpecificInfo.length;
                    oSegment.dvBuffer.setUint16(oSegment.atEnd + 2, 1);
                    oSegment.mbBuffer[oSegment.atEnd + 5] = 4;
                    oSegment.mbBuffer[oSegment.atEnd + 6] =
                      15 + _anDecoderSpecificInfo.length;
                    oSegment.mbBuffer[oSegment.atEnd + 7] = 64;
                    oSegment.mbBuffer[oSegment.atEnd + 8] = 21;
                    oSegment.mbBuffer[oSegment.atEnd + 20] = 5;
                    oSegment.mbBuffer[oSegment.atEnd + 21] =
                      _anDecoderSpecificInfo.length;
                    oSegment.CopyFromArray(
                      oSegment.atEnd + 22,
                      _anDecoderSpecificInfo,
                    );
                    oSegment.mbBuffer[oSegment.atEnd] = 6;
                    oSegment.mbBuffer[oSegment.atEnd + 1] = 1;
                    oSegment.mbBuffer[oSegment.atEnd + 2] = 2;
                    oSegment.atEnd += 3;
                  });
                });
              }
            });
            oSegment.AddFullBox("stts", 0, 0, 4);
            oSegment.AddFullBox("stsc", 0, 0, 4);
            oSegment.AddFullBox("stco", 0, 0, 4);
            oSegment.AddFullBox("stsz", 0, 0, 8);
          });
        });
      });
    });
  }
  function CreateMediasegment(mbMediasegment) {
    var dvMediasegment = CreateDataView(mbMediasegment);
    var oSegment = new IsoBaseMedia(mbMediasegment, dvMediasegment, 0);
    var atOffsetVideodata, atOffsetAudiodata;
    oSegment.AddBox("moof", () => {
      oSegment.AddFullBox("mfhd", 0, 0, 4);
      dvMediasegment.setUint32(oSegment.atEnd - 4, 0);
      if (!_trackVideo.Empty()) {
        oSegment.AddBox("traf", () => {
          oSegment.AddFullBox("tfhd", 0, 131072, 4);
          dvMediasegment.setUint32(oSegment.atEnd - 4, NUMBER_VIDEO_TRACK);
          oSegment.AddFullBox("tfdt", 1, 0, 8);
          mbMediasegment.setUint64(oSegment.atEnd - 8, _trackVideo.nVdStart);
          oSegment.AddFullBox("trun", 1, 3841, () => {
            dvMediasegment.setUint32(
              oSegment.atEnd,
              _trackVideo.GetCountSamples(),
            );
            atOffsetVideodata = oSegment.atEnd + 4;
            oSegment.CopyFromBuffer(
              oSegment.atEnd + 8,
              _mbHeap,
              _trackVideo.atStartSamples,
              _trackVideo.atEndSamples,
            );
          });
        });
      }
      if (!_trackAudio.Empty()) {
        oSegment.AddBox("traf", () => {
          oSegment.AddFullBox("tfhd", 0, 131072, 4);
          dvMediasegment.setUint32(oSegment.atEnd - 4, NUMBER_AUDIO_TRACK);
          oSegment.AddFullBox("tfdt", 1, 0, 8);
          mbMediasegment.setUint64(
            oSegment.atEnd - 8,
            Math.round(
              (_trackAudio.nVdStart / TS_TIMESCALE) * _nRateSamplerate,
            ),
          );
          oSegment.AddFullBox("trun", 1, 513, () => {
            dvMediasegment.setUint32(
              oSegment.atEnd,
              _trackAudio.GetCountSamples(),
            );
            atOffsetAudiodata = oSegment.atEnd + 4;
            oSegment.CopyFromBuffer(
              oSegment.atEnd + 8,
              _mbHeap,
              _trackAudio.atStartSamples,
              _trackAudio.atEndSamples,
            );
          });
        });
      }
    });
    oSegment.AddBox("mdat", () => {
      if (!_trackVideo.Empty()) {
        dvMediasegment.setInt32(
          atOffsetVideodata,
          oSegment.atEnd - oSegment.atStart,
        );
        oSegment.CopyFromBuffer(
          oSegment.atEnd,
          _mbHeap,
          _trackVideo.atStartStream,
          _trackVideo.atEndStream,
        );
      }
      if (!_trackAudio.Empty()) {
        dvMediasegment.setInt32(
          atOffsetAudiodata,
          oSegment.atEnd - oSegment.atStart,
        );
        oSegment.CopyFromBuffer(
          oSegment.atEnd,
          _mbHeap,
          _trackAudio.atStartStream,
          _trackAudio.atEndStream,
        );
      }
    });
    return oSegment.Finish();
  }
  function SendConvertedSegment(mbMediasegment) {
    var mbufPass = void 0;
    var oData = {
      nConvertedFor: _nConvertedFor,
      isRejected: _isRejected,
      isLossVideo: _isLossVideo,
      isLossAudio: _isLossAudio,
      nMinDurationVideoSample: (_nMinDurationVideoSample / TS_TIMESCALE) * 1e3,
      nMaxDurationVideoSample: (_nMaxDurationVideoSample / TS_TIMESCALE) * 1e3,
      nAverageDurationVideoSample:
        (_nAverageDurationVideoSample / TS_TIMESCALE) * 1e3,
      nBitrateAudio: _nBitrateAudio,
      nPositionEncoding: _nPositionEncoding,
      nPositionBroadcast: _nPositionBroadcast,
      nTimeEncoding: _nTimeEncoding,
    };
    if (mbMediasegment) {
      oData.mbMediasegment = CreateMediasegment(mbMediasegment);
      oData.isExistsVideo = !_trackVideo.Empty();
      oData.isExistsAudio = !_trackAudio.Empty();
      mbufPass = [oData.mbMediasegment.buffer];
      if (_isDiscontinuity) {
        oData.mbSegmentInit = CreateSegmentInit();
        oData.sCodecs = GetTitleCodecs();
        oData.nProfileIndication = _nProfileIndication;
        oData.nConstraintSetFlag = _nConstraintSetFlag;
        oData.nLevelIndication = _nLevelIndication;
        oData.nMaxNumberReferenceFrames = _nMaxNumberReferenceFrames;
        oData.nWidthPicture = _nWidthPicture;
        oData.nHeightPicture = _nHeightPicture;
        oData.nRateFrames = _nRateFrames;
        oData.nRange = _nRange;
        oData.isInterlaced = _isInterlaced;
        oData.nAudioObjectType = _nAudioObjectType;
        oData.nRateSamplerate = _nRateSamplerate;
        oData.nCountChannels = _nCountChannels;
        mbufPass.push(oData.mbSegmentInit.buffer);
      }
      _oSourceSegment.isDiscontinuity = _isDiscontinuity;
      m_Log.Here(
        `Sending3 segment Discontinuity=${_isDiscontinuity} Size=${(oData.mbMediasegment.length / 1024 / 1024).toFixed(2)}mb`,
      );
    }
    _oSourceSegment.pData = oData;
    m_Log.Send();
    SendResult(mbufPass);
  }
  function JoinSegments() {
    if (_isDiscontinuity) {
      return;
    }
    var nDeviationVdVideo = 0,
      nOverlapVdVideo = 1,
      nDeviationVdAudio = 0;
    if (!_trackVideo.Empty()) {
      nDeviationVdVideo = _trackVideo.nVdStart - _nVdEndPreviousVideoSegment;
      nOverlapVdVideo =
        _trackVideo.nVdStart - _nVdLastVideoSamplePreviousVideoSegment;
    }
    if (!_trackAudio.Empty()) {
      nDeviationVdAudio = _trackAudio.nVdStart - _nVdEndPreviousAudioSegment;
    }
    if (nOverlapVdVideo <= 0 || nDeviationVdAudio < -TS_TIMESCALE * 0.1) {
      m_Log.Oops(
        `Added discontinuity: DeviationVdVideo=${Strs(nDeviationVdVideo)} OverlapVdVideo=${Strs(nOverlapVdVideo)} DeviationVdAudio=${nDeviationVdAudio}`,
      );
      _isDiscontinuity = true;
      return;
    }
    if (
      Math.abs(nDeviationVdVideo) > TS_TIMESCALE * 0.002 ||
      Math.abs(nDeviationVdAudio) > 2
    ) {
      m_Log.Oops(
        `DeviationVdVideo=${Strs(nDeviationVdVideo)} OverlapVdVideo=${Strs(nOverlapVdVideo)} DeviationVdAudio=${nDeviationVdAudio}`,
      );
    }
    if (nDeviationVdVideo > TS_TIMESCALE * 0.01) {
      _isLossVideo = true;
    }
    if (nDeviationVdAudio > TS_TIMESCALE * 0.1) {
      _isLossAudio = true;
    }
  }
  function CalculateDurationLastVideosample() {
    var countVideosamples = _trackVideo.GetCountSamples();
    if (countVideosamples === 0) {
      return;
    }
    var nDuration;
    if (countVideosamples === 1) {
      nDuration = _trackAudio.Empty()
        ? Math.round(TS_TIMESCALE / 30)
        : _nVdEndAudioSegment - _trackAudio.nVdStart;
    } else {
      nDuration = _dvHeap.getUint32(
        _trackVideo.atEndSamples -
          SIZE_STRUCTURE_VIDEOSAMPLE * 2 +
          DURATION_VIDEOSAMPLE,
      );
      var atSample = _trackVideo.atEndSamples - SIZE_STRUCTURE_VIDEOSAMPLE;
      var nVd = 0;
      var nVpLastVideoSample = _dvHeap.getInt32(atSample + VP_VIDEOSAMPLE);
      for (var idx = Math.min(16, countVideosamples); --idx != 0;) {
        atSample -= SIZE_STRUCTURE_VIDEOSAMPLE;
        nVd -= _dvHeap.getUint32(atSample + DURATION_VIDEOSAMPLE);
        var nVp = nVd + _dvHeap.getInt32(atSample + VP_VIDEOSAMPLE);
        if (nVp > nVpLastVideoSample) {
          nDuration = Math.min(nDuration, nVp - nVpLastVideoSample);
        }
      }
    }
    m_Log[countVideosamples === 1 ? "Oops" : "Here"](
      `Duration last4 videosample3 ${Strs(nDuration)}`,
    );
    _dvHeap.setUint32(
      _trackVideo.atEndSamples -
        SIZE_STRUCTURE_VIDEOSAMPLE +
        DURATION_VIDEOSAMPLE,
      nDuration,
    );
    _nVdEndVideoSegment = _nVdLastVideoSample + nDuration;
  }
  function ConvertSegment() {
    var nStart = performance.now();
    _isDiscontinuity = _isDiscontinuity || _oSourceSegment.isDiscontinuity;
    m_Log.Here(
      `CONVERTING SEGMENT2 ${_oSourceSegment.nNumber} Discontinuity=${_isDiscontinuity} Duration=${_oSourceSegment.nDuration} Size=${(_oSourceSegment.pData.byteLength / 1024 / 1024).toFixed(2)}mb`,
    );
    ClearStats();
    var isSegmentConverted = false;
    var mbTransportStream = new Uint8Array(_oSourceSegment.pData);
    try {
      m_Memory.Highlight(mbTransportStream);
      if (ParseTransportStream(mbTransportStream)) {
        JoinSegments();
        ParseMetadata();
        isSegmentConverted = ParseVideoStream() && ParseAudioStream();
        if (isSegmentConverted) {
          CalculateDurationLastVideosample();
        }
      }
    } catch (pException) {
      if (pException instanceof Error && pException.message === "REJECT") {
        m_Log.Oops(`Segment rejected2: ${pException.stack}`);
        ClearStats();
        _isRejected = true;
      } else {
        throw pException;
      }
    }
    _oSourceSegment.pData = null;
    if (isSegmentConverted) {
      SendConvertedSegment(mbTransportStream);
    } else {
      ThrowInTrash(mbTransportStream);
      SendConvertedSegment(null);
    }
    _isDiscontinuity = !isSegmentConverted;
    _nVdLastVideoSamplePreviousVideoSegment = _nVdLastVideoSample;
    _nVdEndPreviousVideoSegment = _nVdEndVideoSegment;
    _nVdEndPreviousAudioSegment = _nVdEndAudioSegment;
    _nConvertedFor = performance.now() - nStart;
  }
  function HandleSwitchState() {
    m_Log.Here(
      `SKIPPING SEGMENT2 ${_oSourceSegment.nNumber} State=${_oSourceSegment.pData}`,
    );
    if (_oSourceSegment.pData !== STATE_SWITCH_VARIANT) {
      m_Memory.Free();
    }
    m_Log.Send();
    SendResult();
    _isDiscontinuity = true;
  }
  function HandleMessage(pData) {
    _oSourceSegment = pData;
    if (typeof _oSourceSegment.pData == "number") {
      HandleSwitchState();
    } else {
      ConvertSegment();
    }
    _oSourceSegment = null;
  }
  function HandleException(pException) {
    self.onmessage = null;
    _mUnhandledMessage = null;
    m_Memory.Free();
    m_Log.Send();
    FinishWorkAndSendReport(pException);
  }
  self.onmessage = (oEvent) => {
    try {
      if (_mUnhandledMessage !== null) {
        _mUnhandledMessage.push(oEvent.data);
        m_Log.Oops("Handling message2 deferred2: compile not finished");
        m_Log.Send();
      } else {
        HandleMessage(oEvent.data);
      }
    } catch (pException) {
      HandleException(pException);
    }
  };
  self.onmessageerror = (oEvent) => {
    throw new Error(`Happened event ${oEvent.type}`);
  };
  _oAssembler
    .Compile()
    .then(() => {
      m_Log.Here(
        `Compile2 finished: ${performance.now().toFixed()}strs Unhandled messages: ${_mUnhandledMessage.length}`,
      );
      while (_mUnhandledMessage.length !== 0) {
        HandleMessage(_mUnhandledMessage.shift());
      }
      _mUnhandledMessage = null;
    })
    .catch(HandleException);
}
