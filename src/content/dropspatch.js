'use strict';

(function () {
	if (window.__tw5_drops_patch__) {
		return;
	}
	window.__tw5_drops_patch__ = true;
	window.__tw5_drops_gql_cache__ = Object.create(null);

	const CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';
	const GQL_URL = 'https://gql.twitch.tv/gql';
	const INTEGRITY_URL = 'https://gql.twitch.tv/integrity';
	const HASH_AVAILABLE_DROPS = [
		'782dad0f032942260171d2d80a654f88bdd0c5a9dddc392e9bc92218a0f42d20',
		'9a62a09bce5b53e26e64a671e530bc599cb6aab1e5ba3cbd5d85966d3940716f'
	];
	const HASH_DROP_SESSION = '4d06b702d25d652afb9ef835d2a550031f1cf762b193523a92166f40ea3d142b';
	const HEADER_NAMES = [
		'Authorization',
		'Client-ID',
		'Client-Integrity',
		'Client-Session-Id',
		'Client-Version',
		'Device-ID',
		'X-Device-Id',
		'X-Device-ID'
	];

	let capturedGqlHeaders = null;
	let ownFetchDepth = 0;
	let pendingDrops = null;
	let passthrough = false;

	function parseBody(body) {
		if (typeof body !== 'string') {
			return null;
		}
		try {
			const parsed = JSON.parse(body);
			if (Array.isArray(parsed)) {
				return parsed;
			}
			if (parsed && typeof parsed === 'object') {
				return [parsed];
			}
		} catch (_) {}
		return null;
	}

	function matchOperationText(text) {
		if (typeof text !== 'string') {
			return null;
		}
		if (text.includes('DropCurrentSessionContext') || text.includes(HASH_DROP_SESSION)) {
			return 'DropCurrentSessionContext';
		}
		if (text.includes('DropsHighlightService_AvailableDrops') || HASH_AVAILABLE_DROPS.some((hash) => text.includes(hash))) {
			return 'DropsHighlightService_AvailableDrops';
		}
		return null;
	}

	function matchOperation(body) {
		const ops = parseBody(body);
		if (!ops || ops.length !== 1) {
			return null;
		}
		return matchOperationText(JSON.stringify(ops[0]));
	}

	function channelIdFromBody(body) {
		const ops = parseBody(body);
		if (!ops) {
			return '';
		}
		for (const op of ops) {
			if (op && op.variables && op.variables.channelID) {
				return String(op.variables.channelID);
			}
		}
		return '';
	}

	function cacheHasDrops(name, cached) {
		if (!cached || cached.errors) {
			return false;
		}
		if (name === 'DropsHighlightService_AvailableDrops') {
			const campaigns = cached.data && cached.data.channel && cached.data.channel.viewerDropCampaigns;
			return Array.isArray(campaigns) && campaigns.length > 0;
		}
		if (name === 'DropCurrentSessionContext') {
			return Boolean(cached.data && cached.data.currentUser && cached.data.currentUser.dropCurrentSession);
		}
		return false;
	}

	function getCached(name) {
		if (!name) {
			return null;
		}
		const cached = window.__tw5_drops_gql_cache__[name];
		return cacheHasDrops(name, cached) ? cached : null;
	}

	function jsonResponse(data) {
		return new Response(JSON.stringify(data), {
			status: 200,
			statusText: 'OK',
			headers: {'Content-Type': 'application/json'}
		});
	}

	function responseHasDrops(name, data) {
		if (!data || data.errors) {
			return false;
		}
		if (name === 'DropsHighlightService_AvailableDrops') {
			const campaigns = data.data && data.data.channel && data.data.channel.viewerDropCampaigns;
			return Array.isArray(campaigns) && campaigns.length > 0;
		}
		if (name === 'DropCurrentSessionContext') {
			return Boolean(data.data && data.data.currentUser && data.data.currentUser.dropCurrentSession);
		}
		return false;
	}

	function mergeBatchResponse(body, results) {
		const ops = parseBody(body);
		if (!ops) {
			return {changed: false, data: results};
		}
		const resultArray = Array.isArray(results) ? results.slice() : [results];
		let changed = false;
		for (let i = 0; i < ops.length; i++) {
			const name = matchOperationText(JSON.stringify(ops[i]));
			const cached = getCached(name);
			if (!cached) {
				continue;
			}
			if (!responseHasDrops(name, resultArray[i])) {
				resultArray[i] = cached;
				changed = true;
			}
		}
		return {
			changed,
			data: Array.isArray(results) ? resultArray : resultArray[0]
		};
	}

	function refreshDropsUi() {
		document.dispatchEvent(new Event('visibilitychange'));
		window.dispatchEvent(new Event('focus'));
	}

	const DROPS_ICON_SELECTORS = [
		'[data-a-target="channel-drops"]',
		'[data-a-target="drops-icon"]',
		'[data-a-target="drops-menu"]',
		'button[aria-label*="Drop" i]',
		'a[href*="/drops"]'
	];
	const DROPS_ICON_EXCLUDE = '.community-points-summary, [data-a-target="community-points-summary"], [class*="community-points"], [class*="community-highlight"]';

	function findDropsIcons() {
		const nodes = new Set();
		for (const selector of DROPS_ICON_SELECTORS) {
			for (const node of document.querySelectorAll(selector)) {
				const button = node.closest('button, a[href]') || node;
				if (button && !button.closest(DROPS_ICON_EXCLUDE)) {
					nodes.add(button);
				}
			}
		}
		return [...nodes];
	}

	function updateDropsIconHighlight(active) {
		for (const node of document.querySelectorAll('.tw5-drops-active')) {
			node.classList.remove('tw5-drops-active');
		}
		if (!active) {
			return;
		}
		for (const button of findDropsIcons()) {
			button.classList.add('tw5-drops-active');
		}
	}

	if (!window.__tw5_drops_icon_observer__) {
		window.__tw5_drops_icon_observer__ = new MutationObserver(() => {
			const campaigns = window.__tw5_drops_gql_cache__.DropsHighlightService_AvailableDrops?.data?.channel?.viewerDropCampaigns?.length || 0;
			const session = Boolean(window.__tw5_drops_gql_cache__.DropCurrentSessionContext?.data?.currentUser?.dropCurrentSession);
			if (campaigns > 0 || session) {
				updateDropsIconHighlight(true);
			}
		});
		window.__tw5_drops_icon_observer__.observe(document.documentElement, {
			childList: true,
			subtree: true
		});
	}

	function applyCacheUpdate(detail) {
		if (!detail || typeof detail !== 'object') {
			return;
		}
		let updated = false;
		if (detail.availResult && cacheHasDrops('DropsHighlightService_AvailableDrops', detail.availResult)) {
			window.__tw5_drops_gql_cache__.DropsHighlightService_AvailableDrops = detail.availResult;
			updated = true;
		}
		if (detail.sessionResult && cacheHasDrops('DropCurrentSessionContext', detail.sessionResult)) {
			window.__tw5_drops_gql_cache__.DropCurrentSessionContext = detail.sessionResult;
			updated = true;
		}
		if (updated) {
			const campaigns = window.__tw5_drops_gql_cache__.DropsHighlightService_AvailableDrops?.data?.channel?.viewerDropCampaigns?.length || 0;
			const session = Boolean(window.__tw5_drops_gql_cache__.DropCurrentSessionContext?.data?.currentUser?.dropCurrentSession);
			console.info(`[tw5-drops] cache updated: campaigns=${campaigns} session=${session}`);
			updateDropsIconHighlight(session || campaigns > 0);
			refreshDropsUi();
		}
	}

	document.addEventListener('tw5-drops-cache-update', (event) => {
		applyCacheUpdate(event.detail);
	});

	function requestUrl(input) {
		if (typeof input === 'string') {
			return input;
		}
		if (input instanceof URL) {
			return input.href;
		}
		if (input && typeof input.url === 'string') {
			return input.url;
		}
		return '';
	}

	function normalizeHeaders(headers) {
		const out = Object.create(null);
		if (!headers) {
			return out;
		}
		if (typeof Headers !== 'undefined' && headers instanceof Headers) {
			headers.forEach((value, key) => {
				out[key] = value;
			});
			return out;
		}
		if (Array.isArray(headers)) {
			for (const pair of headers) {
				if (pair && pair.length >= 2) {
					out[pair[0]] = pair[1];
				}
			}
			return out;
		}
		if (typeof headers === 'object') {
			for (const key of Object.keys(headers)) {
				out[key] = headers[key];
			}
		}
		return out;
	}

	function headerGet(headers, name) {
		if (!headers) {
			return '';
		}
		const lower = name.toLowerCase();
		for (const key of Object.keys(headers)) {
			if (key.toLowerCase() === lower && headers[key]) {
				return String(headers[key]);
			}
		}
		return '';
	}

	function headerSet(headers, name, value) {
		const lower = name.toLowerCase();
		for (const key of Object.keys(headers)) {
			if (key.toLowerCase() === lower) {
				headers[key] = value;
				return;
			}
		}
		headers[name] = value;
	}

	function rememberGqlHeaders(headers) {
		if (!headerGet(headers, 'Authorization')) {
			return;
		}
		if (!capturedGqlHeaders) {
			capturedGqlHeaders = Object.create(null);
		}
		for (const name of HEADER_NAMES) {
			const value = headerGet(headers, name);
			if (value) {
				capturedGqlHeaders[name] = value;
			}
		}
		const token = headerGet(capturedGqlHeaders, 'Client-Integrity');
		if (!token) {
			return;
		}
		document.cookie = `tw5~gqltoken=${encodeURIComponent(JSON.stringify({
			сТокен: token,
			чПротухнетПосле: Date.now() + 60 * 60 * 1000,
			сСессия: headerGet(capturedGqlHeaders, 'Client-Session-Id'),
			сВерсия: headerGet(capturedGqlHeaders, 'Client-Version')
		}))}; path=/tw5~storage/; samesite=none; secure; max-age=86400`;
	}

	function readCookie(name) {
		const parts = document.cookie ? document.cookie.split('; ') : [];
		for (const part of parts) {
			const eq = part.indexOf('=');
			if (eq !== -1 && part.slice(0, eq) === name) {
				try {
					return decodeURIComponent(part.slice(eq + 1));
				} catch (_) {
					return part.slice(eq + 1);
				}
			}
		}
		return '';
	}

	function gqlErrorText(result) {
		if (!result || !Array.isArray(result.errors)) {
			return '';
		}
		return result.errors.map((error) => error && error.message).filter(Boolean).join('; ');
	}

	function isIntegrityError(result) {
		return gqlErrorText(result).toLowerCase().includes('failed integrity check');
	}

	function buildHeaders(detail) {
		const headers = Object.create(null);
		if (capturedGqlHeaders) {
			Object.assign(headers, capturedGqlHeaders);
		}
		if (!headerGet(headers, 'Authorization')) {
			const authToken = (detail && detail.authToken) || readCookie('auth-token');
			if (!authToken) {
				return null;
			}
			headers.Authorization = authToken.startsWith('OAuth ') ? authToken : `OAuth ${authToken}`;
		}
		if (!headerGet(headers, 'Client-ID')) {
			headers['Client-ID'] = CLIENT_ID;
		}
		const deviceId = headerGet(headers, 'X-Device-Id') || headerGet(headers, 'X-Device-ID') || headerGet(headers, 'Device-ID') || (detail && detail.deviceId) || readCookie('unique_id');
		if (deviceId && !headerGet(headers, 'X-Device-Id') && !headerGet(headers, 'Device-ID')) {
			headers['X-Device-Id'] = deviceId;
		}
		return headers;
	}

	function availableDropsBody(channelID, hash) {
		return JSON.stringify({
			operationName: 'DropsHighlightService_AvailableDrops',
			variables: {
				channelID: String(channelID)
			},
			extensions: {
				persistedQuery: {
					version: 1,
					sha256Hash: hash
				}
			}
		});
	}

	function sessionBody(channelID) {
		return JSON.stringify({
			operationName: 'DropCurrentSessionContext',
			variables: {
				channelID: String(channelID),
				channelLogin: ''
			},
			extensions: {
				persistedQuery: {
					version: 1,
					sha256Hash: HASH_DROP_SESSION
				}
			}
		});
	}

	function attachDrops(body, channelID) {
		const ops = parseBody(body);
		if (!ops || !channelID) {
			return null;
		}
		if (ops.some((op) => matchOperationText(JSON.stringify(op)))) {
			return null;
		}
		const extra = [
			JSON.parse(availableDropsBody(channelID, HASH_AVAILABLE_DROPS[0])),
			JSON.parse(sessionBody(channelID))
		];
		return {
			body: JSON.stringify(ops.concat(extra)),
			originalCount: ops.length,
			originalArray: body.trim().startsWith('[')
		};
	}

	function describeDrops(availResult, sessionResult) {
		const error = [gqlErrorText(availResult), gqlErrorText(sessionResult)].filter(Boolean).join('; ');
		const campaigns = availResult?.data?.channel?.viewerDropCampaigns?.length || 0;
		const session = Boolean(sessionResult?.data?.currentUser?.dropCurrentSession);
		if (error && campaigns === 0 && !session) {
			return {error, availResult, sessionResult};
		}
		console.info(`[tw5-drops] chat: campaigns=${campaigns} session=${session}`);
		applyCacheUpdate({availResult, sessionResult});
		return {availResult, sessionResult};
	}

	function finishAttached(extra, results) {
		const list = Array.isArray(results) ? results : [results];
		if (list.length < extra.originalCount + 2) {
			return null;
		}
		const availResult = list[extra.originalCount];
		const sessionResult = list[extra.originalCount + 1];
		const pageResults = extra.originalArray ? list.slice(0, extra.originalCount) : list[0];
		return {
			pageResults,
			drops: describeDrops(availResult, sessionResult)
		};
	}

	function queueDrops(channelID) {
		if (!channelID) {
			return Promise.resolve({error: 'no channel'});
		}
		if (pendingDrops && pendingDrops.channelID === String(channelID)) {
			return pendingDrops.promise;
		}
		let resolvePromise;
		const promise = new Promise((resolve) => {
			resolvePromise = resolve;
		});
		const timer = setTimeout(() => {
			if (pendingDrops && pendingDrops.promise === promise) {
				pendingDrops = null;
				resolvePromise({error: 'no carrier'});
			}
		}, 8000);
		pendingDrops = {
			channelID: String(channelID),
			promise,
			resolve(result) {
				clearTimeout(timer);
				if (pendingDrops && pendingDrops.promise === promise) {
					pendingDrops = null;
				}
				resolvePromise(result);
			}
		};
		refreshDropsUi();
		return promise;
	}

	function dropsBatchBody(channelID, hash) {
		return JSON.stringify([
			JSON.parse(availableDropsBody(channelID, hash)),
			JSON.parse(sessionBody(channelID))
		]);
	}
	function postThroughPage(body, headers) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 12000);
		passthrough = true;
		let promise;
		try {
			promise = window.fetch(GQL_URL, {
				method: 'POST',
				credentials: 'include',
				headers,
				body,
				signal: controller.signal
			});
		} finally {
			passthrough = false;
		}
		return promise.finally(() => clearTimeout(timer));
	}
	function postThroughXhr(body, headers) {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open('POST', GQL_URL);
			xhr.withCredentials = true;
			xhr.timeout = 15000;
			xhr.__tw5_internal = true;
			for (const name of Object.keys(headers)) {
				xhr.setRequestHeader(name, headers[name]);
			}
			xhr.onload = () => {
				try {
					resolve(JSON.parse(xhr.responseText || 'null'));
				} catch (error) {
					reject(error);
				}
			};
			xhr.onerror = () => reject(new Error('Failed to fetch'));
			xhr.ontimeout = () => reject(new Error('timeout'));
			XMLHttpRequest.prototype.send.call(xhr, body);
		});
	}
	function describeBatch(results, hashIndex) {
		const list = Array.isArray(results) ? results : [results];
		const availResult = list[0];
		if (/persistedquerynotfound/i.test(gqlErrorText(availResult)) && hashIndex + 1 < HASH_AVAILABLE_DROPS.length) {
			return null;
		}
		return describeDrops(availResult, list[1]);
	}
	function queryThroughPage(detail, channelID) {
		const headers = buildHeaders(detail);
		if (!headers) {
			return Promise.resolve({error: 'no auth'});
		}
		headerSet(headers, 'Content-Type', 'text/plain; charset=UTF-8');
		headerSet(headers, 'Accept-Language', 'en-US');
		const read = (hashIndex, transport) => {
			const body = dropsBatchBody(channelID, HASH_AVAILABLE_DROPS[hashIndex]);
			const sent = transport === 'xhr' ? postThroughXhr(body, headers) : postThroughPage(body, headers).then((response) => response.json());
			return sent.then((results) => {
				const described = describeBatch(results, hashIndex);
				if (described) {
					return described;
				}
				return read(hashIndex + 1, transport);
			});
		};
		return read(0, 'fetch').catch((error) => {
			const message = String(error && error.message || error);
			if (message !== 'Failed to fetch' && !/aborted/i.test(message)) {
				return {error: message};
			}
			return read(0, 'xhr').catch((xhrError) => ({
				error: String(xhrError && xhrError.message || xhrError)
			}));
		});
	}
	function fetchDrops(detail) {
		const channelID = detail && detail.channelID ? String(detail.channelID) : '';
		if (!channelID) {
			return Promise.resolve({error: 'no channel'});
		}
		return queryThroughPage(detail, channelID).catch((error) => ({error: String(error && error.message || error)}));
	}

	window.__tw5_fetch_drops__ = fetchDrops;

	document.addEventListener('tw5-drops-fetch', (event) => {
		const detail = event.detail || {};
		fetchDrops(detail).then((result) => {
			document.dispatchEvent(new CustomEvent('tw5-drops-fetch-result', {
				bubbles: true,
				detail: Object.assign({requestId: detail.requestId}, result)
			}));
		});
	});

	function rememberFromFetch(input, init) {
		if (ownFetchDepth !== 0) {
			return;
		}
		const url = requestUrl(input);
		if (!url.includes('gql.twitch.tv/gql')) {
			return;
		}
		const headers = normalizeHeaders(init && init.headers);
		if (!headerGet(headers, 'Authorization') && input && input.headers) {
			Object.assign(headers, normalizeHeaders(input.headers));
		}
		rememberGqlHeaders(headers);
	}

	function cacheNativeResult(name, data) {
		if (!name || ownFetchDepth !== 0 || !responseHasDrops(name, data)) {
			return;
		}
		const detail = {};
		if (name === 'DropsHighlightService_AvailableDrops') {
			detail.availResult = data;
		} else if (name === 'DropCurrentSessionContext') {
			detail.sessionResult = data;
		}
		applyCacheUpdate(detail);
	}

	const nativeFetch = window.fetch.bind(window);
	window.fetch = function (input, init) {
		if (passthrough) {
			rememberFromFetch(input, init);
			return nativeFetch(input, init);
		}
		rememberFromFetch(input, init);
		let body = init && typeof init.body === 'string' ? init.body : null;
		if (typeof body === 'string' && body.includes('claimCommunityPoints')) {
			return nativeFetch(input, init);
		}
		const extra = null;
		const claimed = null;
		const singleOp = matchOperation(body);
		const singleCached = !extra && getCached(singleOp);
		if (singleCached) {
			if (pendingDrops && singleOp === 'DropsHighlightService_AvailableDrops') {
				pendingDrops.resolve(describeDrops(singleCached, getCached('DropCurrentSessionContext')));
			}
			return Promise.resolve(jsonResponse(singleCached));
		}
		const promise = nativeFetch(input, init);
		const ops = parseBody(body);
		if (!ops && !extra) {
			return promise;
		}
		return promise.then(async (response) => {
			try {
				const results = await response.clone().json();
				if (extra && claimed) {
					const taken = finishAttached(extra, results);
					if (taken) {
						claimed.resolve(taken.drops);
						return jsonResponse(taken.pageResults);
					}
					claimed.resolve({error: 'attach mismatch'});
				}
				if (singleOp) {
					cacheNativeResult(singleOp, results);
					if (pendingDrops && singleOp === 'DropsHighlightService_AvailableDrops' && responseHasDrops(singleOp, results)) {
						pendingDrops.resolve(describeDrops(results, getCached('DropCurrentSessionContext')));
					}
				}
				const merged = mergeBatchResponse(typeof body === 'string' ? body : init && init.body, results);
				if (merged.changed) {
					return jsonResponse(merged.data);
				}
			} catch (error) {
				if (claimed) {
					claimed.resolve({error: String(error && error.message || error)});
				}
			}
			return response;
		}).catch((error) => {
			if (claimed) {
				claimed.resolve({error: String(error && error.message || error)});
			}
			throw error;
		});
	};

	const origOpen = XMLHttpRequest.prototype.open;
	const origSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
	const origSend = XMLHttpRequest.prototype.send;
	XMLHttpRequest.prototype.open = function (method, url) {
		this.__tw5_url = typeof url === 'string' ? url : '';
		this.__tw5_headers = Object.create(null);
		return origOpen.apply(this, arguments);
	};
	XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
		if (this.__tw5_headers && name) {
			this.__tw5_headers[name] = value;
		}
		return origSetRequestHeader.apply(this, arguments);
	};
	XMLHttpRequest.prototype.send = function (body) {
		if (this.__tw5_internal) {
			return origSend.apply(this, arguments);
		}
		if (ownFetchDepth === 0 && this.__tw5_url && this.__tw5_url.includes('gql.twitch.tv/gql')) {
			rememberGqlHeaders(this.__tw5_headers);
		}
		const singleOp = matchOperation(body);
		const singleCached = getCached(singleOp);
		if (singleCached) {
			const xhr = this;
			const payload = JSON.stringify(singleCached);
			queueMicrotask(() => {
				try {
					Object.defineProperty(xhr, 'readyState', {configurable: true, get: () => 4});
					Object.defineProperty(xhr, 'status', {configurable: true, get: () => 200});
					Object.defineProperty(xhr, 'statusText', {configurable: true, get: () => 'OK'});
					Object.defineProperty(xhr, 'responseText', {configurable: true, get: () => payload});
					Object.defineProperty(xhr, 'response', {configurable: true, get: () => payload});
				} catch (_) {}
				xhr.getAllResponseHeaders = () => 'content-type: application/json\r\n';
				xhr.getResponseHeader = (name) => String(name).toLowerCase() === 'content-type' ? 'application/json' : null;
				xhr.dispatchEvent(new Event('readystatechange'));
				xhr.dispatchEvent(new Event('load'));
				xhr.dispatchEvent(new Event('loadend'));
			});
			return;
		}
		if (singleOp) {
			this.addEventListener('load', function () {
				try {
					const data = JSON.parse(this.responseText);
					cacheNativeResult(singleOp, data);
				} catch (_) {}
			});
		}
		return origSend.apply(this, arguments);
	};
})();
