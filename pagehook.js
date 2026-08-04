'use strict';

// Runs in the page MAIN world (see manifest content_scripts.world).
// Patches history/title so SPA channel changes notify the isolated content script.

(function перехватитьФункции() {
	let _лНеПерехватывать = false;
	window.addEventListener('tw5-неперехватывать', () => {
		_лНеПерехватывать = true;
	});
	const oTitleDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'title');
	Object.defineProperty(document, 'title', {
		configurable: oTitleDescriptor.configurable,
		enumerable: oTitleDescriptor.enumerable,
		get() {
			return oTitleDescriptor.get.call(this);
		},
		set(title) {
			if (_лНеПерехватывать) {
				oTitleDescriptor.set.call(this, title);
			} else if (this.documentElement.hasAttribute('data-tw5-перенаправление')) {} else {
				oTitleDescriptor.set.call(this, title);
				window.dispatchEvent(new CustomEvent('tw5-изменензаголовок'));
			}
		}
	});
	function уведомитьСменуПути(сБыло) {
		if (сБыло !== location.pathname) {
			oTitleDescriptor.set.call(document, 'Twitch');
			window.dispatchEvent(new CustomEvent('tw5-pushstate'));
		}
	}
	const fPushState = History.prototype.pushState;
	History.prototype.pushState = function(state, title, url) {
		if (_лНеПерехватывать || document.documentElement.hasAttribute('data-tw5-перенаправление')) {
			return fPushState.apply(this, arguments);
		}
		const сБыло = location.pathname;
		const результат = fPushState.apply(this, arguments);
		уведомитьСменуПути(сБыло);
		return результат;
	};
	const fReplaceState = History.prototype.replaceState;
	History.prototype.replaceState = function(state, title, url) {
		if (_лНеПерехватывать || document.documentElement.hasAttribute('data-tw5-перенаправление')) {
			return fReplaceState.apply(this, arguments);
		}
		const сБыло = location.pathname;
		const результат = fReplaceState.apply(this, arguments);
		уведомитьСменуПути(сБыло);
		return результат;
	};
})();

(function разрешитьРаботуЧата() {
	const мсЧасти = location.pathname.split('/');
	const лЧат = (мсЧасти[1] === 'embed' || мсЧасти[1] === 'popout') && мсЧасти[2] && мсЧасти[3] === 'chat';
	if (!лЧат) {
		return;
	}
	const fGetItem = Storage.prototype.getItem;
	Storage.prototype.getItem = function(сИмя) {
		let сЗначение = fGetItem.apply(this, arguments);
		if (сИмя === 'TwitchCache:Layout' && сЗначение) {
			сЗначение = сЗначение.replace('"isRightColumnClosedByUserAction":true', '"isRightColumnClosedByUserAction":false');
		}
		return сЗначение;
	};
})();
