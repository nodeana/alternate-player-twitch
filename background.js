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

let chatFrame = null;

chrome.runtime.onInstalled.addListener((details) => {
	if (details.reason === 'install') {
		console.log('Extension installed');
	} else if (details.reason === 'update') {
		console.log('Extension updated');
	}
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (!message) {
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
	if (message.request === 'SendMinuteWatched') {
		sendMinuteWatched(message.url, message.body)
			.then(() => sendResponse({status: 'sent'}))
			.catch((error) => {
				console.error('SendMinuteWatched failed:', error);
				sendResponse({status: 'failed'});
			});
		return true;
	}
	if (message.request === 'SetDropsSession') {
		setDropsSession(Boolean(message.active))
			.then(() => sendResponse({status: 'ok'}))
			.catch(() => sendResponse({status: 'failed'}));
		return true;
	}
});

function postWatchFromPage(url, body) {
	return fetch(url, {
		method: 'POST',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
		},
		body: 'data=' + encodeURIComponent(body)
	}).then((response) => response.status);
}

function toggleDropsClass(active) {
	document.documentElement.classList.toggle('tw5-drops-active', Boolean(active));
}

async function sendMinuteWatched(url, body) {
	if (!chatFrame || typeof url != 'string' || typeof body != 'string') {
		return;
	}
	if (!/^https:\/\/(?:[^/]+\.)?(?:twitch\.tv|ttvnw\.net)\//.test(url)) {
		return;
	}
	await chrome.scripting.executeScript({
		target: {tabId: chatFrame.tabId, frameIds: [chatFrame.frameId]},
		world: 'MAIN',
		func: postWatchFromPage,
		args: [url, body]
	});
}

async function setDropsSession(active) {
	if (!chatFrame) {
		return;
	}
	await chrome.scripting.executeScript({
		target: {tabId: chatFrame.tabId, frameIds: [chatFrame.frameId]},
		world: 'MAIN',
		func: toggleDropsClass,
		args: [active]
	});
}

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
