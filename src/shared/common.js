'use strict';

const THIS_CONTENT_SCRIPT = !document.currentScript;

const ADDRESS_NOT_REDIRECT = 'twitch5=0';

const LEFT_BUTTON = 0;

const AVERAGE_BUTTON = 1;

const RIGHT_BUTTON = 2;

const PRESSED_LEFT_BUTTON = 1;

const PRESSED_RIGHT_BUTTON = 2;

const PRESSED_AVERAGE_BUTTON = 4;

const PASSIVE_HANDLER = {
	passive: true
};

const MIN_VALUE_SETTINGS = Number.MIN_SAFE_INTEGER + 1e3;

const MAX_VALUE_SETTINGS = Number.MAX_SAFE_INTEGER - 1e3;

const AUTOTUNE = Number.MIN_SAFE_INTEGER;

const MINIMUM_VOLUME = 1;

const MAXIMUM_VOLUME = 100;

const STEP_INCREASE_VOLUME_KEYBOARD = 4;

const STEP_DECREASE_VOLUME_KEYBOARD = 2;

const CHAT_UNLOADED = 0;

const CHAT_HIDDEN = 1;

const CHAT_PANEL = 2;

const TOP_SIDE = 1;

const RIGHT_SIDE = 2;

const BOTTOM_SIDE = 3;

const LEFT_SIDE = 4;

const MIN_DURATION_REPLAY = 30;

const MAX_DURATION_REPLAY = 300;

const MIN_SIZE_BUFFER = 1.5;

const MAX_SIZE_BUFFER = 30;

const MIN_STRETCH_BUFFER = 9;

const MAX_STRETCH_BUFFER = 30;

const OVERFLOW_BUFFER = MAX_SIZE_BUFFER + MAX_STRETCH_BUFFER;

let g_isWorkFinished = false;

if (!NodeList.prototype[Symbol.iterator]) {
	NodeList.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
}

if (!HTMLCollection.prototype[Symbol.iterator]) {
	HTMLCollection.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
}

if (!THIS_CONTENT_SCRIPT && !window.PointerEvent) {
	const nodeScript = document.createElement('script');
	nodeScript.src = 'pointerevent.js';
	document.currentScript.parentNode.appendChild(nodeScript);
}

const NOOP = () => {};

function Assert(pCondition) {
	if (!pCondition) {
		throw new Error('Check not passed');
	}
}

function AddHandlerExceptions(fnFunction) {
	return function() {
		if (g_isWorkFinished) {
			return;
		}
		try {
			return fnFunction.apply(this, arguments);
		} catch (pException) {
			m_Debug.CaughtException(pException);
		}
	};
}

function ConvertExceptionInString(pException) {
	return pException instanceof Error ? pException.stack : `[typeof ${typeof pException}] ${new Error(pException).stack}`;
}

function Type(pValue) {
	return pValue === null ? 'null' : typeof pValue;
}

function ThisNumber(pValue) {
	return typeof pValue == 'number' && pValue == pValue;
}

function ThisObject(pValue) {
	return typeof pValue == 'object' && pValue !== null;
}

function ThisNonemptyString(pValue) {
	return typeof pValue == 'string' && pValue !== '';
}

function ClampLengthString(sString, nMaximumLength) {
	return sString.length <= nMaximumLength ? sString : `${sString.slice(0, nMaximumLength)}---8<---${sString.length - nMaximumLength}`;
}

function getVersionEngineBrowser() {
	if (!getVersionEngineBrowser._nResult) {
		if (navigator.userAgentData) {
			for (const {brand, version} of navigator.userAgentData.brands) {
				if (brand === 'Chromium' || brand === 'Google Chrome') {
					getVersionEngineBrowser._nResult = Number.parseInt(version, 10);
					break;
				}
			}
		}
		if (!getVersionEngineBrowser._nResult) {
			getVersionEngineBrowser._nResult = Number(/Chrome\/(\d+)/.exec(navigator.userAgent)[1]);
		}
	}
	return getVersionEngineBrowser._nResult;
}

function thisMobileDevice() {
	if (!thisMobileDevice.hasOwnProperty('_isResult')) {
		thisMobileDevice._isResult = navigator.userAgentData ? navigator.userAgentData.mobile : navigator.userAgent.includes('Android');
	}
	return thisMobileDevice._isResult;
}

function byId(pElement) {
	const elElement = typeof pElement == 'string' ? document.getElementById(pElement) : pElement;
	Assert(elElement.nodeType === 1);
	return elElement;
}

function createBodyRequestGql(sRequest, oVariables) {
	Assert(ThisNonemptyString(sRequest) && ThisObject(oVariables));
	return `{"query":${JSON.stringify(sRequest)},"variables":${JSON.stringify(oVariables)}}`;
}

function mergeRequestGql(strsBodyRequests) {
	Assert(strsBodyRequests[0][0] === '{');
	return `[${strsBodyRequests.join(',')}]`;
}

function ContextExtensionActive() {
	try {
		return Boolean(chrome.runtime.id);
	} catch (_) {
		return false;
	}
}

function ReloadPageAfterUpdateExtension() {
	if (!THIS_CONTENT_SCRIPT || sessionStorage.getItem('tw5-reloading-extension')) {
		return;
	}
	sessionStorage.setItem('tw5-reloading-extension', '1');
	location.reload();
}

function GetURLResourceExtension(sPath) {
	Assert(ThisNonemptyString(sPath));
	if (!ContextExtensionActive()) {
		ReloadPageAfterUpdateExtension();
		return '';
	}
	try {
		return chrome.runtime.getURL(sPath);
	} catch (pException) {
		if (/Extension context invalidated/i.test(String(pException.message || pException))) {
			ReloadPageAfterUpdateExtension();
			return '';
		}
		throw pException;
	}
}

function GetAddressOurPlayer(sCodeChannel) {
	const sParameters = '?channel=' + encodeURIComponent(sCodeChannel);
	const sAddress = GetURLResourceExtension('src/player/player.html');
	return sAddress ? sAddress + sParameters : '';
}

const m_Log = (() => {
	const MAX_LENGTH_RECORDING = 1500;
	let _strsLog = null;
	let _nLastRecording = -1;
	function Add(sImportance, sRecording) {
		if (_strsLog) {
			Assert(typeof sImportance == 'string' && typeof sRecording == 'string');
			sRecording = ClampLengthString(`${sImportance} ${(performance.now() / 1e3).toFixed(3)} ${sRecording}`, MAX_LENGTH_RECORDING);
			if (++_nLastRecording === _strsLog.length) {
				_nLastRecording = 0;
			}
			_strsLog[_nLastRecording] = sRecording;
		}
	}
	function GetDataForReport() {
		if (!_strsLog) {
			return null;
		}
		const nNextRecording = _nLastRecording + 1;
		if (nNextRecording === _strsLog.length) {
			return _strsLog;
		}
		if (_strsLog[nNextRecording] === void 0) {
			return _strsLog.slice(0, nNextRecording);
		}
		return _strsLog.slice(nNextRecording).concat(_strsLog.slice(0, nNextRecording));
	}
	function Here(sRecording) {
		Assert(arguments.length === 1);
		Add(' ', sRecording);
	}
	function Ok(sRecording) {
		Assert(arguments.length === 1);
		Add('~', sRecording);
	}
	function Oops(sRecording) {
		Assert(arguments.length === 1);
		Add('@', sRecording);
	}
	function O(pObject) {
		switch (Type(pObject)) {
		  case 'object':
			return JSON.stringify(pObject);

		  case 'function':
			return `[function ${pObject.name}]`;

		  case 'symbol':
			return '[symbol]';

		  default:
			return String(pObject);
		}
	}
	function F(nPrecision) {
		return nValue => typeof nValue == 'number' ? nValue.toFixed(nPrecision) : 'NaN';
	}
	if (!THIS_CONTENT_SCRIPT) {
		_strsLog = new Array(1500);
		Here(`[Log] Log started ${performance.now().toFixed()}strs`);
	}
	return {
		Here,
		Ok,
		Oops,
		O,
		F0: F(0),
		F1: F(1),
		F2: F(2),
		F3: F(3),
		GetDataForReport
	};
})();

const m_i18n = (() => {
	const TITLE_LANGUAGES = {
		AR: 'العربية',
		ASE: 'American Sign Language',
		ASL: 'American Sign Language',
		BG: 'Български',
		CA: 'Català',
		CS: 'Čeština',
		DA: 'Dansk',
		DE: 'Deutsch',
		EL: 'Ελληνικά',
		EN: 'English',
		EN_GB: 'English (UK)',
		ES: 'Español',
		ES_MX: 'Español (Latinoamérica)',
		FI: 'Suomi',
		FR: 'Français',
		HI: 'हिन्दी',
		HU: 'Magyar',
		ID: 'Bahasa Indonesia',
		IT: 'Italiano',
		JA: '日本語',
		KO: '한국어',
		MS: 'بهاس ملايو',
		NL: 'Nederlands',
		NO: 'Norsk',
		PL: 'Polski',
		PT: 'Português',
		PT_BR: 'Português (Brasil)',
		RO: 'Română',
		RU: 'Russian',
		SK: 'Slovenčina',
		SV: 'Svenska',
		TH: 'ภาษาไทย',
		TL: 'Tagalog',
		TR: 'Türkçe',
		UK: 'Українська',
		VI: 'Tiếng Việt',
		ZH: '中文',
		ZH_HK: '中文（香港）',
		ZH_CN: '简体中文',
		ZH_TW: '繁體中文'
	};
	const _mapFormatNumber = new Map();
	let _fnFormatDate = null;
	function GetMessage(sMessageName, sSubstitution) {
		Assert(ThisNonemptyString(sMessageName));
		Assert(sSubstitution === void 0 || typeof sSubstitution == 'string');
		const sMessageText = chrome.i18n.getMessage(sMessageName, sSubstitution);
		if (!sMessageText) {
			throw new Error(`Not found2 text ${sMessageName}`);
		}
		return sMessageText;
	}
	function FastInsertAdjacentHtmlMessage(elInsertTo, sPosition, sMessageName) {
		
		//! HTML content is taken from the file messages.json. See GetMessage().
		elInsertTo.insertAdjacentHTML(sPosition, GetMessage(sMessageName));
	}
	function InsertAdjacentHtmlMessage(vInsertTo, sPosition, sMessageName) {
		const elInsertTo = byId(vInsertTo);
		if (sPosition === 'content') {
			sPosition = 'beforeend';
			elInsertTo.textContent = '';
		}
		FastInsertAdjacentHtmlMessage(elInsertTo, sPosition, sMessageName);
		return elInsertTo;
	}
	function TranslateDocument(oDocument) {
		m_Log.Here('[i18n] Translation document');
		for (let elTranslate, celTranslate = oDocument.querySelectorAll('*[data-i18n]'), i = 0; elTranslate = celTranslate[i]; ++i) {
			const sNames = elTranslate.getAttribute('data-i18n');
			const sNamesDelimiter = sNames.indexOf('^');
			if (sNamesDelimiter !== 0) {
				FastInsertAdjacentHtmlMessage(elTranslate, 'afterbegin', sNamesDelimiter === -1 ? sNames : sNames.slice(0, sNamesDelimiter));
			}
			if (sNamesDelimiter !== -1) {
				elTranslate.title = GetMessage(sNames.slice(sNamesDelimiter + 1));
			}
		}
	}
	function FormatNumber(pNumber, countFractionDigits) {
		Assert(countFractionDigits === void 0 || typeof countFractionDigits == 'number' && countFractionDigits >= 0);
		let fnFormat = _mapFormatNumber.get(countFractionDigits);
		if (!fnFormat) {
			fnFormat = new Intl.NumberFormat([], countFractionDigits === void 0 ? void 0 : {
				minimumFractionDigits: countFractionDigits,
				maximumFractionDigits: countFractionDigits
			}).format;
			_mapFormatNumber.set(countFractionDigits, fnFormat);
		}
		return fnFormat(pNumber);
	}
	function FormatDate(pDate) {
		Assert(Number.isFinite(pDate) || Number.isFinite(pDate.getTime()));
		if (!_fnFormatDate) {
			_fnFormatDate = new Intl.DateTimeFormat([], {
				timeZone: 'UTC'
			}).format;
		}
		return _fnFormatDate(pDate);
	}
	function ConvertSecondsInString(countSeconds, isNeededSeconds) {
		let n = Math.floor(countSeconds / 60 % 60);
		let s = Math.floor(countSeconds / 60 / 60) + (n < 10 ? ' : 0' : ' : ') + n;
		if (isNeededSeconds) {
			n = Math.floor(countSeconds % 60);
			s += (n < 10 ? ' : 0' : ' : ') + n;
		}
		return s;
	}
	function GetTitleLanguage(sCodeLanguage) {
		const sTitleLanguage = TITLE_LANGUAGES[sCodeLanguage.toUpperCase()];
		if (!sTitleLanguage) {
			throw new Error(`Unknown code language2: ${sCodeLanguage}`);
		}
		return sTitleLanguage;
	}
	return {
		GetMessage,
		InsertAdjacentHtmlMessage,
		TranslateDocument,
		FormatNumber,
		FormatDate,
		ConvertSecondsInString,
		GetTitleLanguage
	};
})();

const m_Settings = (() => {
	const VERSION_SETTINGS = 2;
	const _mapPresetBuffering = new Map([ [ 'J0126', {
		countConcurrentLoads: 1,
		nStartPlayback: 3,
		nSizeBuffer: 5,
		nStretchBuffer: 15
	} ], [ 'J0127', {
		countConcurrentLoads: 2,
		nStartPlayback: 3,
		nSizeBuffer: 8.5,
		nStretchBuffer: 20
	} ], [ 'J0128', {
		countConcurrentLoads: 2,
		nStartPlayback: 17,
		nSizeBuffer: 9.5,
		nStretchBuffer: 30
	} ] ]);
	const _mapPresetTheme = new Map([ [ 'J0151', {
		sColorBackground: '#0e0e10',
		sColorGradient: '#efeff1',
		sColorButtons: '#efeff1',
		sColorHeader: '#efeff1',
		sColorHighlight: '#9147ff',
		nOpacity2: 15
	} ], [ 'J0152', {
		sColorBackground: '#efeff1',
		sColorGradient: '#adadb8',
		sColorButtons: '#0e0e10',
		sColorHeader: '#53535f',
		sColorHighlight: '#9147ff',
		nOpacity2: 8
	} ], [ 'J0122', {
		sColorBackground: '#282828',
		sColorGradient: '#d4d4d4',
		sColorButtons: '#d3be96',
		sColorHeader: '#cdbdec',
		sColorHighlight: '#ffd862',
		nOpacity2: 25
	} ], [ 'J0121', {
		sColorBackground: '#405b77',
		sColorGradient: '#aaccf2',
		sColorButtons: '#ffffff',
		sColorHeader: '#c2e4ff',
		sColorHighlight: '#fef17c',
		nOpacity2: 30
	} ], [ 'J0138', {
		sColorBackground: '#4b4b4b',
		sColorGradient: '#aaaaaa',
		sColorButtons: '#bad4f8',
		sColorHeader: '#e2ebb4',
		sColorHighlight: '#75a9f0',
		nOpacity2: 5
	} ], [ 'J0125', {
		sColorBackground: '#161616',
		sColorGradient: '#a0a0a0',
		sColorButtons: '#f0f0f0',
		sColorHeader: '#baccda',
		sColorHighlight: '#6cb6ff',
		nOpacity2: 20
	} ] ]);
	const _objsMetadataPresets = [ {
		mapData: _mapPresetBuffering,
		sCustom: 'J0129',
		sChosen: 'sPresetChosen_buffering',
		sFilled: 'isPresetFilled_buffering',
		sList: 'preset-buffering',
		sEvent: 'settings-presetchanged-buffering'
	}, {
		mapData: _mapPresetTheme,
		sCustom: 'J0123',
		sChosen: 'sPresetChosen_theme',
		sFilled: 'isPresetFilled_theme',
		sList: 'preset-theme',
		sEvent: 'settings-presetchanged-theme'
	} ];
	const _setPersistentSettings = new Set([ 'nVersionSettings', 'nRandomNumber', 'sPreviousVersion', 'nLastCheckUpdateExtension', 'isAutoredirectNoticed' ]);
	const _setNotShow = new Set();
	class Setting {
		constructor(pInitial, mpEnum, nMinimum, nMaximum, sAutotune) {
			this.pCurrent = void 0;
			this.pInitial = pInitial;
			this.mpEnum = mpEnum;
			this.nMinimum = nMinimum;
			this.nMaximum = nMaximum;
			this.sAutotune = sAutotune;
		}
		static Create(pInitial) {
			return new this(pInitial, null, MIN_VALUE_SETTINGS, MAX_VALUE_SETTINGS, '');
		}
		static CreateEnum(pInitial, mpEnum) {
			return new this(pInitial, mpEnum, MIN_VALUE_SETTINGS, MAX_VALUE_SETTINGS, '');
		}
		static CreateRange(pInitial, nMinimum, nMaximum, sAutotune = '') {
			return new this(pInitial, null, nMinimum, nMaximum, sAutotune);
		}
		static AssertValue(pValue) {
			Assert(pValue == pValue && pValue !== Infinity && pValue !== -Infinity && pValue !== void 0 && typeof pValue != 'function' && typeof pValue != 'symbol' && typeof pValue != 'object');
		}
		FixValue(pValue) {
			Setting.AssertValue(pValue);
			Assert(typeof pValue == typeof this.pInitial);
			if (this.mpEnum) {
				if (!this.mpEnum.includes(pValue)) {
					pValue = this.pInitial;
				}
			} else if (typeof pValue == 'number') {
				if (pValue === AUTOTUNE) {
					if (this.sAutotune === '') {
						pValue = this.pInitial;
					}
				} else if (pValue < this.nMinimum) {
					pValue = this.nMinimum;
				} else if (pValue > this.nMaximum) {
					pValue = this.nMaximum;
				}
			}
			return pValue;
		}
	}
	const _oSettings = {
		nVersionSettings: Setting.Create(VERSION_SETTINGS),
		nRandomNumber: Setting.Create(Math.random()),
		sPreviousVersion: Setting.Create('2000.1.1'),
		nLastCheckUpdateExtension: Setting.Create(0),
		nVolume2: Setting.CreateRange(MAXIMUM_VOLUME / 2, MINIMUM_VOLUME, MAXIMUM_VOLUME),
		isMute: Setting.Create(false),
		sIdAudiodevice: Setting.Create(''),
		sTitleVariant: Setting.Create('CoolCmd'),
		nBitrateVariant: Setting.Create(MAX_VALUE_SETTINGS),
		nDurationReplay2: Setting.CreateRange(60, MIN_DURATION_REPLAY, MAX_DURATION_REPLAY, 'J0124'),
		isScaleImage: Setting.Create(true),
		nStateChat: Setting.CreateEnum(CHAT_UNLOADED, [ CHAT_UNLOADED, CHAT_HIDDEN, CHAT_PANEL ]),
		nStateClosedChat: Setting.CreateEnum(CHAT_UNLOADED, [ CHAT_UNLOADED, CHAT_HIDDEN ]),
		isAutoPositionChat: Setting.Create(thisMobileDevice()),
		nHorizontalPositionChat: Setting.CreateEnum(RIGHT_SIDE, [ RIGHT_SIDE, LEFT_SIDE ]),
		nVerticalPositionChat: Setting.CreateEnum(BOTTOM_SIDE, [ TOP_SIDE, BOTTOM_SIDE ]),
		nPositionPanelChat: Setting.CreateEnum(RIGHT_SIDE, [ TOP_SIDE, RIGHT_SIDE, BOTTOM_SIDE, LEFT_SIDE ]),
		nWidthPanelChat: Setting.CreateRange(340, 220, MAX_VALUE_SETTINGS),
		nHeightPanelChat: Setting.CreateRange(250, 100, MAX_VALUE_SETTINGS),
		isFullChat: Setting.Create(true),
		isDarkenChat: Setting.Create(true),
		nSizeUi: Setting.CreateRange(thisMobileDevice() ? 115 : 100, 50, 200),
		nIntervalAutohide: Setting.CreateRange(4, .5, 60),
		isAnimationUi: Setting.Create(!thisMobileDevice()),
		isChangeVolumeWheel: Setting.Create(true),
		nStepChangeVolumeWheel: Setting.CreateRange(5, -10, 10),
		isShowStats: Setting.Create(false),
		sPresetChosen_buffering: Setting.Create('J0127'),
		isPresetFilled_buffering: Setting.Create(false),
		countConcurrentLoads: Setting.CreateRange(0, 1, 3),
		nStartPlayback: Setting.CreateRange(0, MIN_SIZE_BUFFER, MAX_SIZE_BUFFER),
		nSizeBuffer: Setting.CreateRange(0, MIN_SIZE_BUFFER, MAX_SIZE_BUFFER),
		nStretchBuffer: Setting.CreateRange(0, MIN_STRETCH_BUFFER, MAX_STRETCH_BUFFER),
		sPresetChosen_theme: Setting.Create('J0151'),
		isPresetFilled_theme: Setting.Create(false),
		sColorBackground: Setting.Create(''),
		sColorGradient: Setting.Create('#ffffff'),
		sColorButtons: Setting.Create(''),
		sColorHeader: Setting.Create(''),
		sColorHighlight: Setting.Create(''),
		nOpacity2: Setting.CreateRange(0, 0, 80),
		isAutoredirectAllowed: Setting.Create(true),
		isAutoredirectNoticed: Setting.Create(false),
		isSubtitles: Setting.Create(true)
	};
	const DEFER_SAVE_ON = THIS_CONTENT_SCRIPT ? 50 : 500;
	let _nTimerDeferredSave = 0;
	let _oDeferredSave = null;
	let _isDeferredRemoval = false;
	function Restore() {
		m_Log.Here('[Settings] Restoring settings');
		return new Promise((fnExecute, fnGiveup) => {
			chrome.storage.local.get(null, oRestoredSettings => {
				if (g_isWorkFinished) {
					return;
				}
				try {
					if (chrome.runtime.lastError) {
						console.error('storage.local.get', chrome.runtime.lastError.message);
						if (/Extension context invalidated/i.test(chrome.runtime.lastError.message)) {
							ReloadPageAfterUpdateExtension();
							return;
						}
						m_Debug.FinishWorkAndShowMessage('J0221');
					}
					m_Log.Here(`[Settings] Settings read from2 storage: ${m_Log.O(oRestoredSettings)}`);
					FinishRestore(oRestoredSettings);
					fnExecute();
				} catch (pException) {
					fnGiveup(pException);
				}
			});
		});
	}
	const LEGACY_SETTINGS = {
		'чВерсияНастроек': 'nVersionSettings',
		'чСлучайноеЧисло': 'nRandomNumber',
		'сПредыдущаяВерсия': 'sPreviousVersion',
		'чПоследняяПроверкаОбновленияРасширения': 'nLastCheckUpdateExtension',
		'чГромкость2': 'nVolume2',
		'лПриглушить': 'isMute',
		'сИдАудиоустройства': 'sIdAudiodevice',
		'сНазваниеВарианта': 'sTitleVariant',
		'чБитрейтВарианта': 'nBitrateVariant',
		'чДлительностьПовтора2': 'nDurationReplay2',
		'лМасштабироватьИзображение': 'isScaleImage',
		'чСостояниеЧата': 'nStateChat',
		'чСостояниеЗакрытогоЧата': 'nStateClosedChat',
		'лАвтоПоложениеЧата': 'isAutoPositionChat',
		'чГоризонтальноеПоложениеЧата': 'nHorizontalPositionChat',
		'чВертикальноеПоложениеЧата': 'nVerticalPositionChat',
		'чПоложениеПанелиЧата': 'nPositionPanelChat',
		'чШиринаПанелиЧата': 'nWidthPanelChat',
		'чВысотаПанелиЧата': 'nHeightPanelChat',
		'лПолноценныйЧат': 'isFullChat',
		'лЗатемнитьЧат': 'isDarkenChat',
		'чРазмерИнтерфейса': 'nSizeUi',
		'чИнтервалАвтоскрытия': 'nIntervalAutohide',
		'лАнимацияИнтерфейса': 'isAnimationUi',
		'лМенятьГромкостьКолесом': 'isChangeVolumeWheel',
		'чШагИзмененияГромкостиКолесом': 'nStepChangeVolumeWheel',
		'лПоказатьСтатистику': 'isShowStats',
		'сПредустановкаВыбрана_буферизация': 'sPresetChosen_buffering',
		'лПредустановкаЗаполнена_буферизация': 'isPresetFilled_buffering',
		'кОдновременныхЗагрузок': 'countConcurrentLoads',
		'чНачалоВоспроизведения': 'nStartPlayback',
		'чРазмерБуфера': 'nSizeBuffer',
		'чРастягиваниеБуфера': 'nStretchBuffer',
		'сПредустановкаВыбрана_оформление': 'sPresetChosen_theme',
		'лПредустановкаЗаполнена_оформление': 'isPresetFilled_theme',
		'сЦветФона': 'sColorBackground',
		'сЦветГрадиента': 'sColorGradient',
		'сЦветКнопок': 'sColorButtons',
		'сЦветЗаголовка': 'sColorHeader',
		'сЦветВыделения': 'sColorHighlight',
		'чПрозрачность': 'nOpacity2',
		'лАвтоперенаправлениеРазрешено': 'isAutoredirectAllowed',
		'лАвтоперенаправлениеЗамечено': 'isAutoredirectNoticed',
		'лСубтитры': 'isSubtitles'
	};
	function migrateLegacySettings(oRestoredSettings) {
		if (Object.prototype.hasOwnProperty.call(oRestoredSettings, 'nVersionSettings')) {
			return;
		}
		const oldKeys = [];
		for (const oldName of Object.keys(LEGACY_SETTINGS)) {
			if (!Object.prototype.hasOwnProperty.call(oRestoredSettings, oldName)) {
				continue;
			}
			const newName = LEGACY_SETTINGS[oldName];
			if (!Object.prototype.hasOwnProperty.call(oRestoredSettings, newName)) {
				oRestoredSettings[newName] = oRestoredSettings[oldName];
			}
			delete oRestoredSettings[oldName];
			oldKeys.push(oldName);
		}
		if (oldKeys.length !== 0) {
			chrome.storage.local.remove(oldKeys);
		}
	}
	function FinishRestore(oRestoredSettings) {
		Assert(ThisObject(oRestoredSettings));
		Assert(!_oSettings.nVersionSettings.pCurrent);
		migrateLegacySettings(oRestoredSettings);
		const oSave = {};
		const isRestRemove = AssertVersionSettings(oRestoredSettings, oSave);
		for (let sName of Object.keys(_oSettings)) {
			if (oRestoredSettings.hasOwnProperty(sName)) {
				const pValue = _oSettings[sName].FixValue(oRestoredSettings[sName]);
				if (pValue !== oRestoredSettings[sName]) {
					oSave[sName] = pValue;
				}
				_oSettings[sName].pCurrent = pValue;
			} else {
				if (_setPersistentSettings.has(sName)) {
					oSave[sName] = _oSettings[sName].pInitial;
				}
				_oSettings[sName].pCurrent = _oSettings[sName].pInitial;
			}
		}
		StartSave(oSave, isRestRemove);
	}
	function AssertVersionSettings(oSettings, oSave) {
		if (!Number.isInteger(oSettings.nVersionSettings) || oSettings.nVersionSettings < 1 || oSettings.nVersionSettings > VERSION_SETTINGS) {
			for (let sName of Object.keys(oSettings)) {
				delete oSettings[sName];
			}
			return true;
		}
		for (let oMetadata of _objsMetadataPresets) {
			let sName = oSettings[oMetadata.sChosen];
			if (sName !== void 0 && sName !== oMetadata.sCustom) {
				for (let sNamePreset of oMetadata.mapData.keys()) {
					if (sName === sNamePreset) {
						sName = void 0;
						break;
					}
				}
				if (sName !== void 0) {
					oSave[oMetadata.sChosen] = oSettings[oMetadata.sChosen] = _oSettings[oMetadata.sChosen].pInitial;
				}
			}
		}
		if (oSettings.nStateClosedChat !== oSettings.nStateChat && (oSettings.nStateChat === CHAT_UNLOADED || oSettings.nStateChat === CHAT_HIDDEN)) {
			oSave.nStateClosedChat = oSettings.nStateClosedChat = oSettings.nStateChat;
		}
		if (oSettings.nVersionSettings === VERSION_SETTINGS) {
			return false;
		}
		oSave.nVersionSettings = oSettings.nVersionSettings = VERSION_SETTINGS;
		return false;
	}
	function StartSave(oSave, isRestRemove) {
		Assert(ThisObject(oSave));
		if (Object.keys(oSave).length !== 0 || isRestRemove) {
			if (_nTimerDeferredSave === 0) {
				m_Log.Here(`[Settings] Deferring save settings3 on ${DEFER_SAVE_ON}strs`);
				_oDeferredSave = oSave;
				_isDeferredRemoval = isRestRemove;
				_nTimerDeferredSave = setTimeout(AddHandlerExceptions(FinishSave), DEFER_SAVE_ON);
			} else if (isRestRemove) {
				_oDeferredSave = oSave;
				_isDeferredRemoval = isRestRemove;
			} else {
				Object.assign(_oDeferredSave, oSave);
			}
		}
	}
	function FinishSave() {
		m_Log.Here('[Settings] Finishing deferred3 save');
		Assert(_nTimerDeferredSave !== 0);
		_nTimerDeferredSave = 0;
		Assert(ThisObject(_oDeferredSave));
		Save(_oDeferredSave, _isDeferredRemoval);
		_oDeferredSave = null;
	}
	function Save(oSave, isRestRemove) {
		if (isRestRemove) {
			chrome.storage.local.clear(AssertResultSave);
			m_Log.Here('[Settings] All settings removed4 from2 storage');
		}
		chrome.storage.local.set(oSave, AssertResultSave);
		m_Log.Here(`[Settings] Settings written in storage2: ${m_Log.O(oSave)}`);
	}
	function AssertResultSave() {
		if (chrome.runtime.lastError) {
			console.error('storage.local.set', chrome.runtime.lastError.message);
			if (/Extension context invalidated/i.test(chrome.runtime.lastError.message)) {
				ReloadPageAfterUpdateExtension();
				return;
			}
			m_Debug.FinishWorkAndShowMessage('J0221');
		}
	}
	function Reset() {
		m_Log.Ok('[Settings] Resetting settings');
		Assert(_oSettings.nVersionSettings.pCurrent);
		const oSave = {};
		for (let sName of _setPersistentSettings) {
			oSave[sName] = _oSettings[sName].pCurrent;
		}
		StartSave(oSave, true);
		window.location.reload(true);
	}
	function Export() {
		m_Log.Ok('[Settings] Exporting settings');
		Assert(_oSettings.nVersionSettings.pCurrent);
		const oExport = {
			nVersionSettings: VERSION_SETTINGS
		};
		for (let sName of Object.keys(_oSettings)) {
			if (!_setPersistentSettings.has(sName) && !_setNotShow.has(sName)) {
				oExport[sName] = _oSettings[sName].pCurrent;
			}
		}
		m_Log.Here(`[Settings] Selected settings for export: ${m_Log.O(oExport)}`);
		WriteTextInLocalFile(JSON.stringify(oExport), 'application/json', Text('J0133'));
	}
	function Import(oFromFile) {
		m_Log.Ok(`[Settings] Importing settings from2 file ${oFromFile.name}`);
		Assert(_oSettings.nVersionSettings.pCurrent);
		if (oFromFile.size === 0 || oFromFile.size > 1e4) {
			m_Log.Oops(`[Settings] Size file: ${oFromFile.size}`);
			m_Notice.ShowFail();
			return;
		}
		const oReader = new FileReader();
		oReader.addEventListener('loadend', AddHandlerExceptions(() => {
			if (!ThisNonemptyString(oReader.result)) {
				m_Log.Oops(`[Settings] Result read2 file: ${oReader.result}`);
				m_Notice.ShowFail();
				return;
			}
			m_Log.Here(`[Settings] Settings read from2 file: ${oReader.result}`);
			let oSave;
			try {
				oSave = JSON.parse(oReader.result);
				if (!ThisObject(oSave)) {
					throw 1;
				}
				if (AssertVersionSettings(oSave, oSave)) {
					throw 2;
				}
				for (let sName of Object.keys(oSave)) {
					if (!_oSettings.hasOwnProperty(sName) || _setNotShow.has(sName)) {
						delete oSave[sName];
					} else {
						oSave[sName] = _oSettings[sName].FixValue(oSave[sName]);
						if (oSave[sName] === _oSettings[sName].pInitial) {
							delete oSave[sName];
						}
					}
				}
			} catch (pException) {
				m_Log.Oops(`[Settings] Caught exception in2 time parse settings3: ${pException}`);
				m_Notice.ShowFail();
				return;
			}
			for (let sName of _setPersistentSettings) {
				oSave[sName] = _oSettings[sName].pCurrent;
			}
			StartSave(oSave, true);
			window.location.reload(true);
		}));
		oReader.readAsText(oFromFile);
	}
	function Get2(sName) {
		Assert(typeof sName == 'string');
		Assert(_oSettings.hasOwnProperty(sName));
		Assert(_oSettings.nVersionSettings.pCurrent);
		for (let oMetadata of _objsMetadataPresets) {
			const oPreset = oMetadata.mapData.get(_oSettings[oMetadata.sChosen].pCurrent);
			if (oPreset) {
				const pValue = oPreset[sName];
				if (pValue !== void 0) {
					return pValue;
				}
			}
		}
		return _oSettings[sName].pCurrent;
	}
	function Get(sName) {
		if (sName === 'nMaxSizeBuffer') {
			return Math.max(Get2('nStartPlayback'), Get2('nSizeBuffer'));
		}
		return Get2(sName);
	}
	function Change(sName, pValue, isNotSave = false) {
		Assert(typeof sName == 'string');
		Assert(_oSettings[sName].FixValue(pValue) === pValue);
		const oSave = {};
		for (let oMetadata of _objsMetadataPresets) {
			const oPreset = oMetadata.mapData.get(_oSettings[oMetadata.sChosen].pCurrent);
			if (oPreset && oPreset.hasOwnProperty(sName)) {
				if (pValue === oPreset[sName]) {
					return;
				}
				Assert(!isNotSave);
				oSave[oMetadata.sChosen] = _oSettings[oMetadata.sChosen].pCurrent = oMetadata.sCustom;
				oSave[oMetadata.sFilled] = _oSettings[oMetadata.sFilled].pCurrent = true;
				for (let sNamePreset of Object.keys(oPreset)) {
					oSave[sNamePreset] = _oSettings[sNamePreset].pCurrent = oPreset[sNamePreset];
				}
				UpdateListPresets(oMetadata);
				break;
			}
		}
		if (_oSettings[sName].pCurrent !== pValue) {
			oSave[sName] = _oSettings[sName].pCurrent = pValue;
		}
		if (!isNotSave) {
			StartSave(oSave, false);
		}
	}
	function UpdateListPresets(oMetadata) {
		const nodeList = byId(oMetadata.sList);
		nodeList.length = 0;
		const sChoose = _oSettings[oMetadata.sChosen].pCurrent;
		for (let sName of oMetadata.mapData.keys()) {
			nodeList.add(new Option(Text(sName), sName, sName === sChoose, sName === sChoose));
		}
		if (_oSettings[oMetadata.sFilled].pCurrent) {
			nodeList.add(new Option(Text(oMetadata.sCustom), oMetadata.sCustom, oMetadata.sCustom === sChoose, oMetadata.sCustom === sChoose));
		}
		Assert(nodeList.value);
		return nodeList;
	}
	const HandleChangePreset = AddHandlerExceptions(oEvent => {
		for (let oMetadata of _objsMetadataPresets) {
			if (oMetadata.sList === oEvent.target.id) {
				Assert(oEvent.target.value);
				Change(oMetadata.sChosen, oEvent.target.value);
				m_Event.DispatchEvent(oMetadata.sEvent);
				return;
			}
		}
		Assert(false);
	});
	function ConfigureListsPresets() {
		for (let oMetadata of _objsMetadataPresets) {
			UpdateListPresets(oMetadata).addEventListener('change', HandleChangePreset);
		}
	}
	function GetParametersSettings(sName) {
		Assert(typeof sName == 'string');
		Assert(_oSettings.hasOwnProperty(sName));
		return _oSettings[sName];
	}
	function GetDataForReport() {
		const oReport = {};
		for (let sName of Object.keys(_oSettings)) {
			if (!_setNotShow.has(sName) && (_setPersistentSettings.has(sName) || _oSettings[sName].pCurrent !== _oSettings[sName].pInitial)) {
				oReport[sName] = _oSettings[sName].pCurrent;
			}
		}
		return oReport;
	}
	function SaveChange() {
		if (_nTimerDeferredSave !== 0) {
			clearTimeout(_nTimerDeferredSave);
			FinishSave();
		}
	}
	window.addEventListener('beforeunload', SaveChange);
	return {
		Restore,
		Reset,
		Export,
		Import,
		Get,
		Change,
		SaveChange,
		GetParametersSettings,
		ConfigureListsPresets,
		GetDataForReport
	};
})();