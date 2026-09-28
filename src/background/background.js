'use strict';

const BTTV_IDS = new Set([
	'ajopnjidmegmdimjlfnijceegpefgped',
	'deofbbdfofnmppcjbhjibgodpcdchjii',
	'icllegkipkooaicfmdfaloehobmglglb'
]);
const FFZ_IDS = new Set([
	'fadndhdgpmmaapbmfcknlfgcflmmmieb',
	'djkpepcignmpfblhbfpmlhoindhndkdj'
]);

chrome.runtime.onInstalled.addListener((details) => {
	if (details.reason === 'install') {
		console.log('Extension installed');
	} else if (details.reason === 'update') {
		console.log('Extension updated');
	}
});

let chatFrame = null;

async function runInChatMainWorld(tabId, func, args) {
	if (!Number.isInteger(tabId)) {
		throw new Error('No tab');
	}
	if (!chatFrame || chatFrame.tabId !== tabId) {
		throw new Error('Chat frame not ready');
	}
	await chrome.scripting.executeScript({
		target: {tabId, frameIds: [chatFrame.frameId]},
		world: 'MAIN',
		func,
		args
	});
}

async function sendMinuteWatchedViaChatFrame(tabId, url, body) {
	await runInChatMainWorld(tabId, (watchUrl, watchBody) => {
		if (!/^https:\/\/(?:[^/]+\.)?(?:twitch\.tv|ttvnw\.net)\//.test(watchUrl)) {
			return;
		}
		const formBody = `data=${encodeURIComponent(watchBody)}`;
		const blob = new Blob([formBody], {type: 'application/x-www-form-urlencoded;charset=UTF-8'});
		if (navigator.sendBeacon(watchUrl, blob)) {
			return;
		}
		fetch(watchUrl, {
			method: 'POST',
			mode: 'no-cors',
			credentials: 'include',
			body: formBody
		}).catch(() => {});
	}, [url, body]);
}

async function fetchDropsInChatFrame(tabId, detail) {
	if (!chatFrame || chatFrame.tabId !== tabId) {
		throw new Error('Chat frame not ready');
	}
	const [injected] = await chrome.scripting.executeScript({
		target: {tabId, frameIds: [chatFrame.frameId]},
		world: 'MAIN',
		func: (payload) => {
			if (typeof window.__tw5_fetch_drops__ !== 'function') {
				return {error: 'drops patch missing'};
			}
			return window.__tw5_fetch_drops__(payload);
		},
		args: [detail]
	});
	return injected ? injected.result : {error: 'no result'};
}

async function updateDropsCacheInChatFrame(tabId, availResult, sessionResult) {
	await runInChatMainWorld(tabId, (avail, session) => {
		document.dispatchEvent(new CustomEvent('tw5-drops-cache-update', {
			bubbles: true,
			detail: {
				availResult: avail,
				sessionResult: session
			}
		}));
	}, [availResult, sessionResult]);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (!message) {
		return false;
	}
	if (message.request === 'fetch-drops') {
		const tabId = message.tabId ?? sender.tab?.id;
		if (!Number.isInteger(tabId)) {
			sendResponse({error: 'No tab.'});
			return false;
		}
		fetchDropsInChatFrame(tabId, {
			channelID: message.channelID,
			channelLogin: message.channelLogin || '',
			authToken: message.authToken || '',
			deviceId: message.deviceId || ''
		}).then((result) => sendResponse(result || {error: 'empty'}))
			.catch((error) => sendResponse({error: String(error && error.message || error)}));
		return true;
	}
	if (message.request === 'update-drops-cache') {
		const tabId = message.tabId ?? sender.tab?.id;
		if (!Number.isInteger(tabId)) {
			sendResponse({status: 'No tab.'});
			return false;
		}
		updateDropsCacheInChatFrame(tabId, message.availResult, message.sessionResult)
			.then(() => sendResponse({status: 'ok'}))
			.catch(() => sendResponse({status: 'skipped'}));
		return true;
	}
	if (message.request === 'minute-watched') {
		const tabId = message.tabId ?? sender.tab?.id;
		if (!Number.isInteger(tabId)) {
			sendResponse({status: 'No tab.'});
			return false;
		}
		sendMinuteWatchedViaChatFrame(tabId, message.url, message.body)
			.then(() => sendResponse({status: 'sent'}))
			.catch(() => sendResponse({status: 'skipped'}));
		return true;
	}
	if (message.request === 'RegisterChatFrame') {
		if (sender.tab && sender.tab.id != null && sender.frameId != null) {
			chatFrame = {tabId: sender.tab.id, frameId: sender.frameId};
		}
		sendResponse({status: 'ok'});
		return false;
	}
	if (message.request === 'InsertThirdPartyExtensions') {
		if (!sender.tab || sender.tab.id == null || sender.frameId == null) {
			sendResponse({status: 'No frame.'});
			return false;
		}
		chatFrame = {tabId: sender.tab.id, frameId: sender.frameId};
		insertThirdPartyExtensions(sender.tab.id, sender.frameId)
			.then(() => sendResponse({status: 'Injections started.'}))
			.catch((error) => {
				console.error('Error in insertThirdPartyExtensions:', error);
				sendResponse({status: 'Injection failed.'});
			});
		return true;
	}
});

function injectThirdPartyScripts(scriptUrls) {
	const inject = (url) => {
		if ([...document.scripts].some((script) => script.src === url)) {
			return;
		}
		const parent = document.head || document.body;
		if (!parent) {
			const observer = new MutationObserver(() => {
				if (document.head || document.body) {
					observer.disconnect();
					inject(url);
				}
			});
			observer.observe(document.documentElement, {childList: true, subtree: true});
			return;
		}
		const script = document.createElement('script');
		script.src = url;
		script.async = true;
		parent.appendChild(script);
	};
	scriptUrls.forEach(inject);
}

async function insertThirdPartyExtensions(tabId, frameId) {
	const extensions = await chrome.management.getAll();
	const urls = [];
	for (const ext of extensions) {
		if (!ext.enabled) {
			continue;
		}
		if (BTTV_IDS.has(ext.id) || (ext.name && ext.name.includes('BetterTTV'))) {
			urls.push('https://cdn.betterttv.net/betterttv.js');
		}
		if (FFZ_IDS.has(ext.id) || (ext.name && ext.name.includes('FrankerFaceZ'))) {
			urls.push('https://cdn.frankerfacez.com/script/script.min.js');
		}
	}
	const uniqueUrls = [...new Set(urls)];
	if (uniqueUrls.length === 0) {
		return;
	}
	await chrome.scripting.executeScript({
		target: {tabId, frameIds: [frameId]},
		world: 'MAIN',
		func: injectThirdPartyScripts,
		args: [uniqueUrls]
	});
}

let keepAliveInterval = setInterval(() => {
	chrome.runtime.getPlatformInfo(() => {});
}, 20000);
