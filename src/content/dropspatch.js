'use strict';

(function () {
	if (window.__tw5_drops_patch__) {
		return;
	}
	window.__tw5_drops_patch__ = true;
	window.__tw5_drops_gql_cache__ = Object.create(null);

	const HASH_AVAILABLE_DROPS = [
		'782dad0f032942260171d2d80a654f88bdd0c5a9dddc392e9bc92218a0f42d20',
		'9a62a09bce5b53e26e64a671e530bc599cb6aab1e5ba3cbd5d85966d3940716f'
	];
	const HASH_DROP_SESSION = '4d06b702d25d652afb9ef835d2a550031f1cf762b193523a92166f40ea3d142b';

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

	const origFetch = window.fetch;
	window.fetch = function (input, init) {
		const body = init && init.body;
		const singleOp = matchOperation(body);
		const singleCached = getCached(singleOp);
		if (singleCached) {
			return Promise.resolve(jsonResponse(singleCached));
		}
		const promise = origFetch.apply(this, arguments);
		const ops = parseBody(body);
		if (!ops || !ops.some((op) => getCached(matchOperationText(JSON.stringify(op))))) {
			return promise;
		}
		return promise.then(async (response) => {
			try {
				const results = await response.clone().json();
				const merged = mergeBatchResponse(body, results);
				if (merged.changed) {
					return jsonResponse(merged.data);
				}
			} catch (_) {}
			return response;
		});
	};

	const origSend = XMLHttpRequest.prototype.send;
	XMLHttpRequest.prototype.send = function (body) {
		const singleOp = matchOperation(body);
		const singleCached = getCached(singleOp);
		if (singleCached) {
			const xhr = this;
			queueMicrotask(() => {
				Object.defineProperty(xhr, 'readyState', {value: 4});
				Object.defineProperty(xhr, 'status', {value: 200});
				Object.defineProperty(xhr, 'responseText', {value: JSON.stringify(singleCached)});
				xhr.dispatchEvent(new Event('load'));
				xhr.dispatchEvent(new Event('loadend'));
			});
			return;
		}
		return origSend.apply(this, arguments);
	};
})();
