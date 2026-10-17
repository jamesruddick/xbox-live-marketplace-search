const ARCHIVE = 'xbox-live-marketplace-archive';
const PAGE_SIZE = 100;

const DEFAULT_LOCALE = 'en-us';

// Every locale the Xbox 360 marketplace served. A static site can't list a folder, so the first time
// the locale menu opens the page checks which of these have an index in the archive, and remembers
// the answer for a day.
const KNOWN_LOCALES = [
	'am-et', 'ar-ae', 'ar-bh', 'ar-dz', 'ar-eg', 'ar-iq', 'ar-jo', 'ar-kw', 'ar-lb', 'ar-ly', 'ar-ma',
	'ar-om', 'ar-qa', 'ar-sa', 'ar-tn', 'ar-ye', 'be-by', 'bg-bg', 'bn-bd', 'cs-cz', 'da-dk', 'de-at',
	'de-ch', 'de-de', 'de-li', 'el-gr', 'en-ag', 'en-ai', 'en-ao', 'en-au', 'en-aw', 'en-az', 'en-ba',
	'en-bb', 'en-bf', 'en-bi', 'en-bj', 'en-bm', 'en-bs', 'en-bt', 'en-bw', 'en-bz', 'en-ca', 'en-cc',
	'en-cf', 'en-ck', 'en-cv', 'en-cx', 'en-cy', 'en-dj', 'en-eh', 'en-er', 'en-fj', 'en-fk', 'en-fm',
	'en-gb', 'en-gd', 'en-gg', 'en-gh', 'en-gi', 'en-gm', 'en-gn', 'en-gq', 'en-gw', 'en-gy', 'en-hk',
	'en-ie', 'en-in', 'en-je', 'en-jm', 'en-ki', 'en-kn', 'en-ky', 'en-la', 'en-lc', 'en-lr', 'en-ls',
	'en-md', 'en-me', 'en-mh', 'en-ml', 'en-mm', 'en-mo', 'en-mr', 'en-ms', 'en-mv', 'en-mw', 'en-mz',
	'en-na', 'en-ne', 'en-nf', 'en-ng', 'en-nr', 'en-nu', 'en-nz', 'en-pg', 'en-ph', 'en-pn', 'en-ps',
	'en-pw', 'en-re', 'en-rs', 'en-sb', 'en-sc', 'en-sg', 'en-sh', 'en-sl', 'en-sm', 'en-so', 'en-sr',
	'en-st', 'en-sz', 'en-tc', 'en-td', 'en-tj', 'en-tk', 'en-tl', 'en-to', 'en-tt', 'en-tv', 'en-tz',
	'en-ug', 'en-us', 'en-uz', 'en-va', 'en-vc', 'en-vg', 'en-vu', 'en-ws', 'en-za', 'en-zm', 'en-zw',
	'es-ar', 'es-bo', 'es-cl', 'es-co', 'es-cr', 'es-dm', 'es-do', 'es-ec', 'es-es', 'es-gt', 'es-hn',
	'es-mx', 'es-ni', 'es-pa', 'es-pe', 'es-py', 'es-sv', 'es-uy', 'es-ve', 'et-ee', 'fa-ir', 'fi-fi',
	'fo-fo', 'fr-ad', 'fr-be', 'fr-ca', 'fr-cd', 'fr-cg', 'fr-ch', 'fr-ci', 'fr-cm', 'fr-fr', 'fr-ga',
	'fr-gf', 'fr-gp', 'fr-ht', 'fr-km', 'fr-mc', 'fr-mg', 'fr-mq', 'fr-mu', 'fr-nc', 'fr-pf', 'fr-pm',
	'fr-tg', 'fr-wf', 'fr-yt', 'he-il', 'hi-in', 'hr-hr', 'hu-hu', 'hy-am', 'id-id', 'is-is', 'it-ch',
	'it-it', 'ja-jp', 'ka-ge', 'kk-kz', 'kl-gl', 'km-kh', 'ko-kr', 'ky-kg', 'lb-lu', 'lt-lt', 'lv-lv',
	'mk-mk', 'mn-mn', 'ms-bn', 'ms-my', 'mt-mt', 'nb-no', 'ne-np', 'nl-be', 'nl-nl', 'pl-pl', 'ps-af',
	'pt-br', 'pt-pt', 'ro-ro', 'ru-ru', 'rw-rw', 'si-lk', 'sk-sk', 'sl-si', 'sq-al', 'sv-fi', 'sv-se',
	'sw-ke', 'th-th', 'tk-tm', 'tr-tr', 'uk-ua', 'ur-pk', 'vi-vn', 'wo-sn', 'zh-cn', 'zh-hk', 'zh-tw',
];
let locales = [DEFAULT_LOCALE];
let localesKnown = false;
let localeDiscovery = null;
const LOCALE_CACHE_KEY = 'xlm-search:locales';
const LOCALE_CACHE_MS = 24 * 60 * 60 * 1000;

const state = { locale: DEFAULT_LOCALE, query: '', type: '', sort: 'title', page: 1, item: '', offerOnly: false };

const indexUrl = locale => `${ARCHIVE}/xbox-live-marketplace.${locale}.csv`;
const recordUrl = id => `${ARCHIVE}/xbox-live-marketplace.${state.locale}/${id}.xml`;

const languageNames = new Intl.DisplayNames(['en'], { type: 'language', languageDisplay: 'standard' });
function localeLongName(code) {
	const [language, region] = code.split('-');
	try {
		return languageNames.of(region ? `${language}-${region.toUpperCase()}` : language);
	} catch {
		return code;
	}
}

const TYPES = [
	{ id: '1', label: 'Games', singular: 'Game' },
	{ id: '23', label: 'Arcade Games', singular: 'Arcade Game' },
	{ id: '18', label: 'Game Add-ons', singular: 'Game Add-on' },
	{ id: '19', label: 'Game Demos', singular: 'Game Demo' },
	{ id: '5', label: 'Game Trials', singular: 'Game Trial' },
	{ id: '37', label: 'Indie Games', singular: 'Indie Game' },
	{ id: '21', label: 'Original Xbox Games', singular: 'Original Xbox Game' },
	{ id: '20', label: 'Themes', singular: 'Theme' },
	{ id: '22', label: 'Gamer Pictures', singular: 'Gamer Picture' },
	{ id: '47', label: 'Avatar Items', singular: 'Avatar Item' },
	{ id: '30', label: 'Game Videos', singular: 'Game Video' },
	{ id: '34', label: 'Game Trailers', singular: 'Game Trailer' },
	{ id: '46', label: 'Applications', singular: 'Application' },
	{ id: '61', label: 'Streaming Services', singular: 'Streaming Service' },
];
const TYPE_BY_ID = Object.fromEntries(TYPES.map(t => [t.id, t]));
const typeName = id => TYPE_BY_ID[id]?.singular ?? `Type ${id}`;

const $ = id => document.getElementById(id);
const els = {
	search: $('search-input'),
	locale: $('locale-select'),
	clear: $('search-clear'),
	filters: $('type-filters'),
	sort: $('sort-select'),
	offerToggle: $('offer-toggle'),
	localeTrigger: $('locale-trigger'),
	localeValue: $('locale-value'),
	localeMenu: $('locale-menu'),
	localeFilter: $('locale-filter'),
	localeFilterWrap: $('locale-filter-wrap'),
	localeList: $('locale-list'),
	localeCount: $('locale-count'),
	sortTrigger: $('sort-trigger'),
	sortValue: $('sort-trigger-text'),
	sortMenu: $('sort-menu'),
	count: $('result-count'),
	status: $('status'),
	statusText: $('status-text'),
	progress: $('progress-bar'),
	table: $('results-table'),
	body: $('results-body'),
	pager: $('pager'),
	prev: $('page-prev'),
	next: $('page-next'),
	pageInfo: $('page-info'),
	scrim: $('scrim'),
	detail: $('detail'),
	detailFoot: $('detail-foot'),
	detailTitle: $('detail-title'),
	detailBody: $('detail-body'),
	detailClose: $('detail-close'),
	detailTabs: { overview: $('tab-overview'), record: $('tab-record') },
	page: $('page'),
	header: document.querySelector('.top'),
	main: document.querySelector('.results'),
	footer: document.querySelector('.foot'),
};

const indexCache = new Map();

// Desktop scrolls inside #page so the modal's overlay covers its scrollbar; phones scroll the document.
const desktopLayout = matchMedia('(min-width: 769px)');
const scroller = () => (desktopLayout.matches ? els.page : document.scrollingElement);
let items = [];
let byId = new Map();
let results = [];
let lastFocus = null;

/* ---------- Loading ---------- */

async function loadIndex(locale) {
	const response = await fetch(indexUrl(locale));
	if (response.status === 404) throw Object.assign(new Error(`The archive has no ${locale} index yet.`), { missing: true });
	if (!response.ok) throw new Error(`The ${locale} index returned ${response.status}.`);

	// Content-Length is the compressed size when the server gzips (GitHub Pages does), so it can't
	// measure decoded bytes; show an indeterminate bar with the running size instead.
	const encoded = (response.headers.get('content-encoding') || 'identity') !== 'identity';
	const total = encoded ? 0 : Number(response.headers.get('content-length')) || 0;
	els.progress.parentElement?.classList.toggle('is-indeterminate', !total);
	if (!total) els.progress.style.width = '';
	let text = '';
	if (response.body) {
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let loaded = 0;
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			loaded += value.length;
			text += decoder.decode(value, { stream: true });
			setProgress(total ? Math.min(loaded / total, 1) : null, loaded);
		}
		text += decoder.decode();
	} else {
		text = await response.text();
	}
	return text;
}

function setProgress(fraction, bytes) {
	if (fraction !== null) els.progress.style.width = `${Math.round(fraction * 100)}%`;
	els.statusText.textContent = `Downloading the archive index… ${(bytes / 1048576).toFixed(1)} MB`;
}

function parseCsv(text) {
	const rows = [];
	let row = [];
	let field = '';
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (quoted) {
			if (c === '"') {
				if (text[i + 1] === '"') { field += '"'; i++; }
				else quoted = false;
			} else field += c;
		} else if (c === '"') quoted = true;
		else if (c === ',') { row.push(field); field = ''; }
		else if (c === '\n' || c === '\r') {
			if (c === '\r' && text[i + 1] === '\n') i++;
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
		} else field += c;
	}
	if (field || row.length) { row.push(field); rows.push(row); }
	return rows;
}

function buildItems(rows) {
	const header = rows.shift().map(h => h.trim().toLowerCase());
	const col = name => header.indexOf(name);
	const c = {
		id: col('id'), type: col('type'), title: col('title'), titleId: col('titleid'),
		offerId: col('offerid'), contentId: col('contentid'), updated: col('lastupdated'),
	};
	return rows
		.filter(r => r.length > 1 && r[c.id])
		.map(r => {
			const item = {
				id: r[c.id],
				type: r[c.type],
				title: r[c.title] || '(untitled)',
				titleId: r[c.titleId] || '',
				offerId: r[c.offerId] || '',
				contentId: r[c.contentId] || '',
				updated: r[c.updated] || '',
			};
			// Leading punctuation ("! Aiko Theme", ";-) T-Shirt") should not decide the order.
			item.sortTitle = item.title.toLowerCase().replace(/^[^\p{L}\p{N}]+/u, '') || '\uffff';
			item.haystack = [item.title, item.id, item.titleId, item.offerId, item.contentId].join('\u0001').toLowerCase();
			return item;
		});
}

/* ---------- Filtering ---------- */

function matchesQuery(item, terms) {
	for (const term of terms) if (!item.haystack.includes(term)) return false;
	return true;
}

const SORTERS = {
	title: (a, b) => a.sortTitle.localeCompare(b.sortTitle) || a.updated.localeCompare(b.updated),
	updated: (a, b) => a.updated.localeCompare(b.updated),
	type: (a, b) => typeName(a.type).localeCompare(typeName(b.type)) || a.sortTitle.localeCompare(b.sortTitle),
};

function sortItems(list) {
	const desc = state.sort.startsWith('-');
	const key = desc ? state.sort.slice(1) : state.sort;
	const sorter = SORTERS[key] ?? SORTERS.title;
	return list.sort(desc ? (a, b) => sorter(b, a) : sorter);
}

// Exact title matches first, then titles starting with the query, then the rest; A–Z within each group.
function rankByRelevance(list, query) {
	const rank = item => {
		const title = item.title.toLowerCase();
		if (title === query) return 0;
		if (title.startsWith(query)) return 1;
		if (title.includes(query)) return 2;
		return 3;
	};
	const groups = [[], [], [], []];
	for (const item of list) groups[rank(item)].push(item);
	return groups.flat();
}

function update({ resetPage = true } = {}) {
	if (resetPage) state.page = 1;
	const terms = state.query.toLowerCase().split(/\s+/).filter(Boolean);

	const counts = {};
	const matched = [];
	for (const item of items) {
		if (state.offerOnly && !item.offerId) continue;
		if (terms.length && !matchesQuery(item, terms)) continue;
		counts[item.type] = (counts[item.type] || 0) + 1;
		if (!state.type || item.type === state.type) matched.push(item);
	}

	// Items are pre-sorted by title once; only re-sort for other orders.
	if (state.sort === 'title' && terms.length) results = rankByRelevance(matched, terms.join(' '));
	else results = state.sort === 'title' ? matched : sortItems(matched);

	renderFilters(counts, Object.values(counts).reduce((sum, n) => sum + n, 0));
	renderResults(terms);
	syncSortDropdown();
	writeUrl();
}

/* ---------- Rendering ---------- */

const fmt = new Intl.NumberFormat('en-US');

function renderFilters(counts, total) {
	const chips = [{ id: '', label: 'All', n: total }, ...TYPES.map(t => ({ id: t.id, label: t.label, n: counts[t.id] || 0 }))]
		// Types with no matches are hidden, but All and the selected type always stay.
		.filter(chip => chip.n > 0 || chip.id === '' || chip.id === state.type);
	els.filters.replaceChildren(...chips.map(chip => {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'chip';
		button.setAttribute('role', 'radio');
		button.setAttribute('aria-checked', String(state.type === chip.id));
		button.dataset.type = chip.id;
		button.append(chip.label);
		const n = document.createElement('span');
		n.className = 'n';
		n.textContent = fmt.format(chip.n);
		button.append(n);
		return button;
	}));
}

function highlight(text, terms) {
	const frag = document.createDocumentFragment();
	if (!terms.length) { frag.append(text); return frag; }
	const lower = text.toLowerCase();
	const ranges = [];
	for (const term of terms) {
		let at = lower.indexOf(term);
		while (at !== -1) { ranges.push([at, at + term.length]); at = lower.indexOf(term, at + term.length); }
	}
	if (!ranges.length) { frag.append(text); return frag; }
	ranges.sort((a, b) => a[0] - b[0]);
	let pos = 0;
	for (const [start, end] of ranges) {
		if (end <= pos) continue;
		const from = Math.max(start, pos);
		if (from > pos) frag.append(text.slice(pos, from));
		const mark = document.createElement('mark');
		mark.textContent = text.slice(from, end);
		frag.append(mark);
		pos = end;
	}
	frag.append(text.slice(pos));
	return frag;
}

function cell(className, content) {
	const td = document.createElement('td');
	td.className = className;
	if (content instanceof Node) td.append(content);
	else if (content) td.textContent = content;
	else { td.textContent = '–'; td.classList.add('muted'); }
	return td;
}

function renderResults(terms) {
	const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
	state.page = Math.min(Math.max(1, state.page), pages);
	const start = (state.page - 1) * PAGE_SIZE;
	const slice = results.slice(start, start + PAGE_SIZE);

	if (!results.length) {
		els.table.hidden = true;
		els.pager.hidden = true;
		showStatus('empty');
		els.count.innerHTML = `<strong>0</strong> items of ${fmt.format(items.length)}`;
		return;
	}

	els.status.hidden = true;
	els.table.hidden = false;
	els.count.innerHTML = results.length === items.length
		? `<strong>${fmt.format(results.length)}</strong> ${results.length === 1 ? 'item' : 'items'}<span class="wide-only"> in the archive</span>`
		: `<strong>${fmt.format(results.length)}</strong> ${results.length === 1 ? 'item' : 'items'} of ${fmt.format(items.length)}`;

	els.body.replaceChildren(...slice.map(item => {
		const tr = document.createElement('tr');
		tr.dataset.id = item.id;
		tr.classList.toggle('is-active', item.id === state.item);
		// Phones hide the Offer and Content ID columns; flag the row when the match is only in one of them.
		if (terms.length) {
			const visible = `${item.title}\u0001${item.titleId}`.toLowerCase();
			const hidden = terms.filter(t => !visible.includes(t));
			if (hidden.some(t => item.offerId.toLowerCase().includes(t))) tr.dataset.match = 'offer';
			else if (hidden.some(t => item.contentId.toLowerCase().includes(t))) tr.dataset.match = 'content';
		}
		const link = document.createElement('a');
		link.className = 'row-title';
		link.href = `?item=${encodeURIComponent(item.id)}`;
		link.append(highlight(item.title, terms));
		tr.append(
			cell('c-title', link),
			cell('c-type', typeName(item.type)),
			cell('mono c-id c-tid', item.titleId ? highlight(item.titleId, terms) : ''),
			cell('mono c-id c-offer', item.offerId ? highlight(item.offerId, terms) : ''),
			cell('mono c-id c-content', item.contentId ? highlight(item.contentId, terms) : ''),
			cell('mono c-date', item.updated.slice(0, 10)),
		);
		return tr;
	}));

	els.pager.hidden = pages <= 1;
	els.prev.disabled = state.page <= 1;
	els.next.disabled = state.page >= pages;
	els.pageInfo.textContent = `${fmt.format(start + 1)}–${fmt.format(start + slice.length)} of ${fmt.format(results.length)}`;

	const sortKey = state.sort.replace('-', '');
	for (const th of els.table.querySelectorAll('thead th')) {
		const key = th.querySelector('button')?.dataset.sort;
		if (key === sortKey) th.setAttribute('aria-sort', state.sort.startsWith('-') ? 'descending' : 'ascending');
		else th.removeAttribute('aria-sort');
	}
}

function showStatus(kind, message, locale) {
	els.status.hidden = false;
	els.status.replaceChildren();
	if (kind === 'empty') {
		const h = document.createElement('h2');
		h.textContent = 'No items match';
		const p = document.createElement('p');
		const typeLabel = TYPE_BY_ID[state.type]?.label ?? 'items';
		p.textContent = state.offerOnly && !state.query
			? `No ${typeLabel} in this locale have an Offer ID.`
			: !state.query
			? `There are no ${typeLabel} in this locale.`
			: state.type
				? `Nothing in ${typeLabel} matches “${state.query}”.`
				: `Nothing matches “${state.query}”. Try fewer words, or a Title ID like 0x4d5307e6.`;
		// Only offer the ways out that would actually change the results.
		const actions = el('div', { className: 'status-actions' });
		const action = (label, run) => {
			const button = el('button', { type: 'button', className: 'btn' }, label);
			button.addEventListener('click', () => { run(); update(); });
			actions.append(button);
		};
		if (state.type) action('Search all types', () => { state.type = ''; });
		else if (state.query) action('Clear search', () => setQuery(''));
		if (state.offerOnly) action('Include items without an Offer ID', () => { state.offerOnly = false; els.offerToggle.checked = false; });
		els.status.append(h, p);
		if (actions.children.length) els.status.append(actions);
	} else if (kind === 'error') {
		const h = document.createElement('h2');
		h.textContent = 'The archive index could not be loaded';
		const p = document.createElement('p');
		p.textContent = message;
		const retry = document.createElement('button');
		retry.type = 'button';
		retry.className = 'btn';
		retry.textContent = 'Try again';
		retry.addEventListener('click', () => loadLocale());
		const actions = el('div', { className: 'status-actions' }, retry);
		if (locale && locale !== DEFAULT_LOCALE) {
			const back = el('button', { type: 'button', className: 'btn' }, `Switch to ${DEFAULT_LOCALE}`);
			back.addEventListener('click', () => {
				state.locale = DEFAULT_LOCALE;
				writeUrl();
				loadLocale();
			});
			actions.append(back);
		}
		els.status.append(h, p, actions);
	}
}

/* ---------- Item detail ---------- */

const tagText = (root, name) => root.getElementsByTagNameNS('*', name)[0]?.textContent.trim() ?? '';
const tagAll = (root, name) => Array.from(root.getElementsByTagNameNS('*', name));

function formatBytes(bytes) {
	const n = Number(bytes);
	if (!n) return '–';
	const units = ['B', 'KB', 'MB', 'GB'];
	let i = 0;
	let v = n;
	while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
	return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(value) {
	if (!value || value.startsWith('0000')) return '';
	const year = Number(value.slice(0, 4));
	if (year >= 2100) return '';
	return value.slice(0, 10);
}

// Categories form a tree (Game Genres › Xbox LIVE Games › Role Playing) inside system 3000; other
// systems hold unrelated tags. The genres are the tree's most specific entries, minus store collections
// like "Xbox 360 Exclusives", and "Other" only when there's nothing better.
function genreNames(entry) {
	const categories = tagAll(entry, 'category')
		.filter(node => tagText(node, 'categorySystemId') === '3000')
		.map(node => ({ id: tagText(node, 'categoryId'), parent: tagText(node, 'parentCategoryId'), name: tagText(node, 'categoryName') }));
	const parents = new Set(categories.map(c => c.parent));
	const leaves = categories.filter(c => c.parent && c.name && !parents.has(c.id) && c.name !== 'Xbox 360 Exclusives').map(c => c.name);
	const named = leaves.filter(name => name !== 'Other');
	return [...new Set(named.length ? named : leaves)];
}

function parseRecord(xmlText) {
	const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
	if (doc.getElementsByTagName('parsererror').length) throw new Error('The XML record could not be read.');
	const entry = doc.getElementsByTagNameNS('*', 'entry')[0] ?? doc;
	// The download size lives on the offers; the largest package is the one worth showing.
	const packageBytes = Math.max(0, ...tagAll(entry, 'packageSize').map(node => Number(node.textContent) || 0));
	const genres = genreNames(entry);
	const rating = Number(tagText(entry, 'userRating'));
	return {
		title: tagText(entry, 'fullTitle') || tagText(entry, 'title'),
		description: tagText(entry, 'reducedDescription') || tagText(entry, 'fullDescription'),
		developer: tagText(entry, 'developerName'),
		publisher: tagText(entry, 'publisherName'),
		released: formatDate(tagText(entry, 'globalOriginalReleaseDate')),
		genres,
		rating: rating ? { value: rating, count: Number(tagText(entry, 'numberOfRatings')) || 0 } : null,
		parents: tagAll(entry, 'parentProduct').map(node => ({
			id: stripUrn(tagText(node, 'parentProductId')).toLowerCase(),
			title: tagText(node, 'parentReducedTitle'),
		})).filter(parent => parent.id || parent.title),
		size: packageBytes ? formatBytes(packageBytes) : '',
		entry,
	};
}

function el(tag, props = {}, ...children) {
	const node = document.createElement(tag);
	Object.assign(node, props);
	node.append(...children.filter(c => c !== null && c !== undefined && c !== false));
	return node;
}

function icon(name) {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('class', 'icon');
	svg.setAttribute('aria-hidden', 'true');
	const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
	use.setAttribute('href', `#i-${name}`);
	svg.append(use);
	return svg;
}

function copyButton(value, label) {
	const copyLabel = text => el('span', { className: 'copy-label' }, text);
	const button = el('button', { type: 'button', className: 'copy' }, icon('copy'), copyLabel('Copy'));
	button.setAttribute('aria-label', `Copy ${label}`);
	button.addEventListener('click', async () => {
		try {
			await navigator.clipboard.writeText(value);
			button.replaceChildren(icon('check'), copyLabel('Copied'));
			button.classList.add('is-done');
		} catch {
			button.replaceChildren(icon('x'), copyLabel('Failed'));
		}
		setTimeout(() => {
			button.replaceChildren(icon('copy'), copyLabel('Copy'));
			button.classList.remove('is-done');
		}, 1600);
	});
	return button;
}

function idsSection(item) {
	const rows = [
		['Product ID', item.id],
		['Title ID', item.titleId],
		['Offer ID', item.offerId],
		['Content ID', item.contentId],
	].filter(([, v]) => v);
	return el('section', { className: 'section' },
		el('h3', {}, 'Identifiers'),
		el('dl', { className: 'ids' }, ...rows.map(([label, value]) =>
			el('div', { className: 'id-row' },
				el('dt', { className: 'label' }, label),
				el('dd', { className: 'mono' }, value),
				copyButton(value, label),
			),
		)),
	);
}

const PARENT_LABELS = { 5: 'Full Game', 19: 'Full Game', 18: 'Game', 20: 'Game', 22: 'Game', 47: 'Game' };

// Five stars filled to the exact score, then the number and the vote count.
function ratingNode({ value, count }) {
	const stars = () => el('span', { className: 'stars-row' }, ...Array.from({ length: 5 }, () => icon('star')));
	const fill = el('span', { className: 'stars-fill' }, stars());
	fill.style.width = `${Math.min(100, Math.max(0, (value / 5) * 100))}%`;
	const graphic = el('span', { className: 'stars' }, stars(), fill);
	graphic.setAttribute('aria-hidden', 'true');
	const node = el('span', { className: 'rating' },
		graphic,
		el('strong', { className: 'rating-value' }, value.toFixed(1)),
		el('span', { className: 'rating-count' }, `${fmt.format(count)} ${count === 1 ? 'rating' : 'ratings'}`),
	);
	node.setAttribute('aria-label', `${value.toFixed(1)} out of 5 from ${fmt.format(count)} ratings`);
	node.setAttribute('role', 'img');
	return node;
}

const longTimestamp = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZone: 'UTC',
});

// "2014-03-17T18:37:35.987Z" → "17 Mar 2014, 18:37:35 UTC"; the archive's timestamps are all UTC.
function formatUpdated(value) {
	if (!formatDate(value)) return '';
	const date = new Date(/[zZ]$|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`);
	if (Number.isNaN(date.getTime())) return '';
	const node = el('time', { dateTime: date.toISOString() }, `${longTimestamp.format(date)} UTC`);
	node.title = date.toISOString();
	return node;
}

const longDate = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const ordinalRules = new Intl.PluralRules('en-US', { type: 'ordinal' });
const ORDINAL_SUFFIX = { one: 'st', two: 'nd', few: 'rd', other: 'th' };

// "October 28, 2008" → "October 28th, 2008"
function ordinalDate(date) {
	return longDate.formatToParts(date)
		.map(part => part.type === 'day' ? part.value + ORDINAL_SUFFIX[ordinalRules.select(Number(part.value))] : part.value)
		.join('');
}

// "2008-10-28" → "October 28th, 2008", keeping the ISO date for anyone who hovers.
function releasedNode(value) {
	const date = new Date(`${value}T00:00:00Z`);
	if (Number.isNaN(date.getTime())) return value;
	const node = el('time', { dateTime: value }, ordinalDate(date));
	node.title = value;
	return node;
}

// Reads like a store listing: the full title and score, then what it is and who made it, one fact per row.
function recordSections(record, item) {
	const sections = [];
	const credits = [];
	// The header cuts long titles to one line, so the full title always leads the overview.
	const title = record.title || item.title;
	if (title) credits.push(['Title', title]);
	if (record.rating) credits.push(['Rating', el('span', { className: 'summary-rating' }, ratingNode(record.rating))]);
	if (record.genres.length) credits.push([record.genres.length > 1 ? 'Genres' : 'Genre', record.genres.join(', ')]);
	if (record.released) credits.push(['Released', releasedNode(record.released)]);
	if (record.size) credits.push(['Size', record.size]);
	if (record.developer) credits.push(['Developer', record.developer]);
	if (record.publisher) credits.push(['Publisher', record.publisher]);
	const parentLabel = PARENT_LABELS[item.type];
	// The parent opens by its product ID, using the index's title when it has one: the record's own
	// copy is the squeezed "reduced" title (TigerWoodsPGATOUR® 09).
	const parents = parentLabel ? record.parents.filter(parent => parent.id !== item.id) : [];
	if (parents.length) {
		const links = parents.flatMap((parent, i) => {
			const known = byId.get(parent.id);
			const name = known?.title || parent.title || parent.id;
			let link;
			if (known) {
				link = el('button', { type: 'button', className: 'link-btn' }, name);
				link.title = parent.id;
				link.addEventListener('click', () => openDetail(parent.id, { stack: true }));
			} else {
				// Not in this locale's index, so there is nothing to open; the ID still identifies it.
				link = el('span', {}, name);
				link.title = parent.id;
			}
			return i ? [', ', link] : [link];
		});
		credits.push([parentLabel, el('span', {}, ...links)]);
	}
	if (credits.length) {
		// Labels in one column, values in the next, so every value starts at the same edge.
		sections.push(el('section', { className: 'section section-lead' },
			el('h3', { className: 'visually-hidden' }, 'About'),
			el('dl', { className: 'summary-facts' }, ...credits.flatMap(([label, value]) => [el('dt', {}, label), el('dd', {}, value)]))));
	}
	if (record.description) {
		sections.push(el('section', { className: 'section' },
			el('h3', {}, 'Description'),
			el('p', { className: 'desc' }, record.description),
		));
	}
	return sections;
}

/* ---------- ESRB ---------- */

// The marketplace stores ESRB ratings and content descriptors as bare numbers. The archive doesn't
// say what they mean, so these were matched against games' ratings on esrb.org. Some descriptors have
// two codes from different eras of the ESRB's list; codes not listed here show as their number.
const ESRB_RATINGS = {
	0: ['EC', 'Early Childhood'], 10: ['E', 'Everyone'], 20: ['E10+', 'Everyone 10+'], 30: ['T', 'Teen'],
	40: ['M', 'Mature 17+'], 50: ['AO', 'Adults Only 18+'], 60: ['RP', 'Rating Pending'],
};
const ESRB_DESCRIPTORS = {
	0: 'Alcohol Reference', 1: 'Animated Blood', 2: 'Blood', 3: 'Blood and Gore', 4: 'Cartoon Violence',
	5: 'Comic Mischief', 6: 'Crude Humor', 7: 'Drug Reference', 9: 'Fantasy Violence', 11: 'Intense Violence',
	12: 'Language', 13: 'Lyrics', 14: 'Mature Humor', 15: 'Mild Violence', 16: 'Nudity', 17: 'Partial Nudity',
	19: 'Sexual Themes', 20: 'Sexual Violence', 21: 'Simulated Gambling', 23: 'Strong Language', 24: 'Mild Lyrics',
	25: 'Strong Sexual Content', 26: 'Suggestive Themes', 27: 'Tobacco Reference', 28: 'Use of Drugs',
	29: 'Use of Alcohol', 30: 'Use of Tobacco', 31: 'Violence', 32: 'Sexual Content', 34: 'Mild Blood',
	35: 'Mild Blood', 37: 'Mild Cartoon Violence', 41: 'Mild Fantasy Violence', 42: 'Mild Language',
	43: 'Mild Lyrics', 48: 'Mild Sexual Themes', 51: 'Mild Suggestive Themes', 58: 'Violent References',
	60: 'Use of Drugs and Alcohol', 61: 'Use of Alcohol and Tobacco', 62: 'Alcohol and Tobacco Reference',
	63: 'Cartoon Violence', 64: 'Mild Cartoon Violence',
};

// Other regions' stores rate with PEGI, CERO and so on, whose codes are different, so they show as numbers.
const ESRB_LOCALES = new Set(['en-us', 'en-ca', 'fr-ca']);
const usesEsrb = () => ESRB_LOCALES.has(state.locale);

function esrbRating(id) {
	const rating = usesEsrb() && ESRB_RATINGS[id];
	return rating ? `${rating[1]} (${rating[0]})` : '';
}

const esrbDescriptor = id => (usesEsrb() && ESRB_DESCRIPTORS[id]) || '';

/* ---------- Full record ---------- */

// Field names are camelCase in the XML; these read better spelled out.
const FIELD_LABELS = {
	id: 'ID', hexTitleId: 'Title ID (Hex)', hexOfferId: 'Offer ID (Hex)', titleId: 'Title ID', offerId: 'Offer ID',
	ratingId: 'Age Rating', ratingDescriptors: 'Content Descriptors', ratingDescriptor: 'Content Descriptors',
	productId: 'Product ID', contentId: 'Content ID', fileUrl: 'File URL', userRating: 'User Rating',
	effectiveTitleId: 'Effective Title ID', parentProductId: 'Parent Product ID', pricetext: 'Price Text',
	slideShows: 'Slideshow',
};
// A repeated group's items are named after their most telling field.
const ITEM_NAME_FIELDS = ['categoryName', 'fullTitle', 'reducedTitle', 'parentReducedTitle', 'ratingDisclaimerText', 'storeName', 'pricetext', 'offerId', 'fileUrl', 'relatedUrl'];
const SKIPPED_FIELDS = new Set(['content', 'itemNum']);

const fieldLabel = name => FIELD_LABELS[name] ?? name
	.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
	.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
	.replace(/^./, c => c.toUpperCase())
	.replace(/ (Of|For|On|In|To|And|Per|By)(?= )/g, w => w.toLowerCase())
	.replace(/\b(id|url|hdtv)\b/gi, w => w.toUpperCase());

// IDs in the feed are written as "urn:uuid:66acd000-…"; the prefix says nothing, so it's dropped.
const stripUrn = text => text.replace(/^urn:uuid:/i, '');

function fieldValue(name, text) {
	text = stripUrn(text);
	if (/^https?:\/\//.test(text)) {
		return el('a', { href: text, target: '_blank', rel: 'noopener noreferrer', className: 'record-link' }, text);
	}
	if (name === 'productType') return `${typeName(text)} (${text})`;
	if (name === 'paymentType' && PAYMENT_TYPES[text]) return `${PAYMENT_TYPES[text]} · ${text}`;
	if (name === 'pricetext') return priceText(text);
	if (name === 'gameRegion' && regionNames(text)) return `${regionNames(text)} · ${text}`;
	if (name === 'ratingId' && esrbRating(text)) return `${esrbRating(text)} · ${text}`;
	if (name === 'ratingDescriptor' && esrbDescriptor(text)) return `${esrbDescriptor(text)} · ${text}`;
	if (/size$/i.test(name) && /^\d{4,}$/.test(text)) return `${formatBytes(text)} (${fmt.format(Number(text))} bytes)`;
	if (/date$|^updated$/i.test(name) && text.startsWith('0000')) return 'Not set';
	if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text.replace('T', ' ').replace(/(\.\d+)?Z?$/, '');
	return text;
}

function fileName(url) {
	const name = url.split(/[?#]/)[0].split('/').pop();
	try { return decodeURIComponent(name) || url; } catch { return name || url; }
}

function itemName(node) {
	for (const field of ITEM_NAME_FIELDS) {
		// Only the item's own fields: a wrapper must not borrow the name of something nested inside it.
		const text = Array.from(node.children).find(child => child.localName === field)?.textContent.trim();
		if (text) return /^https?:\/\//.test(text) ? fileName(text) : stripUrn(text);
	}
	// Nothing names it, so the row's number does the work: "01 Subscription".
	return fieldLabel(node.localName);
}

const MONO_VALUE = /^(0x[0-9a-f]+|[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}|-?\d+(\.\d+)?)$/i;

function specValue(name, text) {
	const value = fieldValue(name, text);
	if (typeof value !== 'string') return value;
	if (MONO_VALUE.test(value)) return el('span', { className: 'mono' }, value);
	if (value.length <= 240) return value;
	const long = el('span', { className: 'spec-long is-clamped' }, value);
	const more = el('button', { type: 'button', className: 'link-btn' }, 'Show more');
	more.addEventListener('click', () => {
		const open = long.classList.toggle('is-clamped');
		more.textContent = open ? 'Show more' : 'Show less';
	});
	return el('span', {}, long, more);
}

function specList(rows) {
	return el('dl', { className: 'spec' }, ...rows.map(([label, value]) =>
		el('div', { className: 'spec-row' }, el('dt', {}, label), el('dd', {}, value))));
}

const ownAttributes = node => Array.from(node.attributes).filter(a => !a.name.startsWith('xmlns') && !SKIPPED_FIELDS.has(a.localName) && a.value.trim());

// A value with no child elements, e.g. <ratingDescriptor level="1.0000">23</ratingDescriptor>; its attributes follow the text.
function leafValue(node) {
	const text = node.textContent.trim();
	// Every descriptor carries level="1.0000", which says nothing; any other level is kept.
	const attrs = ownAttributes(node).filter(a => !(node.localName === 'ratingDescriptor' && a.localName === 'level' && Number(a.value) === 1));
	if (!attrs.length) return text ? specValue(node.localName, text) : null;
	const notes = attrs.map(a => `${fieldLabel(a.localName).toLowerCase()} ${/^-?\d+\.\d+$/.test(a.value) ? Number(a.value) : a.value.trim()}`);
	return el('span', {}, text ? specValue(node.localName, text) : '', el('span', { className: 'spec-note' }, notes.join(' · ')));
}

function leafRow(name, values) {
	const shown = values.filter(Boolean);
	if (!shown.length) return null;
	const value = shown.length === 1 ? shown[0] : el('ul', { className: 'spec-values' }, ...shown.map(v => el('li', {}, v)));
	return [fieldLabel(name), value];
}

const isListOf = items => items.length > 0 && items.every(i => i.localName === items[0].localName && i.children.length);

// <images><image/>…</images> lists items of one kind; anything else is a single nested object (null).
// A lone wrapper with nothing else in it is looked through, so <slideShows><slideShow><image/>… lists the images.
function listItems(node) {
	let items = Array.from(node.children);
	if (!isListOf(items)) return null;
	while (items.length === 1 && !ownAttributes(items[0]).length && isListOf(Array.from(items[0].children))) items = Array.from(items[0].children);
	return items;
}

// Splits an element into plain label/value rows and nested groups, skipping empty values.
// A group is { name, node, items }, with items null when it is a single nested object rather than a list.
function recordParts(node) {
	const rows = ownAttributes(node).map(a => [fieldLabel(a.localName), specValue(a.localName, a.value.trim())]);
	const groups = [];
	const byName = new Map();
	for (const child of node.children) {
		if (SKIPPED_FIELDS.has(child.localName)) continue;
		if (!byName.has(child.localName)) byName.set(child.localName, []);
		byName.get(child.localName).push(child);
	}
	for (const [name, nodes] of byName) {
		// Repeated plain values (<ratingDescriptor/> ×4) become one row listing each value.
		const row = leafRow(name, nodes.filter(n => !n.children.length).map(leafValue));
		if (row) rows.push(row);
		const branches = nodes.filter(n => n.children.length);
		if (branches.length > 1) {
			// Siblings sharing a tag (two <productInstance/> in one offer) form one list.
			groups.push({ name, node: null, items: branches });
		} else if (branches.length) {
			const [branch] = branches;
			const kids = Array.from(branch.children);
			// A wrapper of plain values (<tiers><tier>3</tier></tiers>) is just a value, not a group.
			if (!ownAttributes(branch).length && kids.every(k => !k.children.length && k.localName === kids[0].localName)) {
				const wrapped = leafRow(name, kids.map(leafValue));
				if (wrapped) rows.push(wrapped);
			} else {
				groups.push({ name, node: branch, items: listItems(branch) });
			}
		}
	}
	return { rows, groups };
}

function recordBody(node) {
	const { rows, groups } = recordParts(node);
	const body = el('div', { className: 'spec-body' });
	if (rows.length) body.append(specList(rows));
	for (const group of groups) body.append(groupBlock(group));
	if (!body.children.length) body.append(el('p', { className: 'record-empty' }, 'No values'));
	return body;
}

/* ---------- Offers ---------- */

// Read from the archive itself: type 1 prices carry the Microsoft Points sign (¤) and type 3 prices are
// in dollars. Offers without a price label (all of type 2) are left out of the list.
const PAYMENT_TYPES = { 1: 'Microsoft Points', 3: 'Cash' };
const priceText = text => text.trim().replace(/(\d)¤$/, '$1 Points');

// Xbox 360 region flags: each byte is a territory, and some bytes split further.
const REGIONS = [
	[0x000000ff, 'North America'], [0x00000100, 'Japan'], [0x00000200, 'China'], [0x0000fc00, 'Rest of Asia'],
	[0x00010000, 'Australia & New Zealand'], [0x00fe0000, 'Europe'], [0xff000000, 'Rest of World'],
];

function regionNames(value) {
	const mask = Number(value) >>> 0;
	if (!Number.isFinite(Number(value))) return '';
	if (mask === 0xffffffff) return 'All regions';
	const names = REGIONS.filter(([bits]) => (mask & bits) >>> 0 === bits).map(([, name]) => name);
	const partial = REGIONS.some(([bits]) => (mask & bits) && (mask & bits) >>> 0 !== bits);
	return names.length ? names.join(', ') + (partial ? ' (and part of others)' : '') : '';
}

function offerSummary(offer) {
	const type = tagText(offer, 'paymentType');
	const tiers = tagAll(offer, 'tier').map(n => n.textContent.trim()).filter(Boolean);
	return [
		PAYMENT_TYPES[type] ?? (type && `Payment type ${type}`),
		tiers.length && `Tier ${tiers.join(', ')}`,
	].filter(Boolean).join(' · ');
}

// Offers sorted by how they're paid, then by tier, each summarised as price, payment and tier.
function offerList(items) {
	const key = o => [tagText(o, 'paymentType'), tagText(o, 'tier')].map(v => v.padStart(3, '0')).join();
	const sorted = [...items].sort((a, b) => key(a).localeCompare(key(b)));
	return sorted.map((offer, i) => {
		const summary = el('summary', {},
			el('span', { className: 'spec-item-index mono' }, String(i + 1).padStart(2, '0')),
			el('span', { className: 'offer-head' },
				el('span', { className: 'offer-price' }, priceText(tagText(offer, 'pricetext'))),
				el('span', { className: 'offer-terms' }, offerSummary(offer))),
			icon('chevron-down'));
		return el('details', { className: 'spec-item' }, summary, recordBody(offer));
	});
}

function groupBlock({ name, node, items }) {
	if (name === 'offerInstances' && items) {
		items = items.filter(offer => tagText(offer, 'pricetext'));
		if (!items.length) return document.createDocumentFragment();
	}
	const head = el('h4', { className: 'spec-group-title' }, fieldLabel(name));
	const block = el('div', { className: 'spec-group' }, head);
	if (!items) {
		block.append(recordBody(node));
		return block;
	}
	head.append(el('span', { className: 'n' }, fmt.format(items.length)));
	if (name === 'categories') {
		// Tags read better than a fold per category; the IDs ride along in muted text.
		block.append(el('ul', { className: 'tags' }, ...items.map(category => {
			const id = tagText(category, 'categoryId');
			const extra = [
				tagText(category, 'parentCategoryId') && `parent ${tagText(category, 'parentCategoryId')}`,
				tagText(category, 'categorySystemId') && `system ${tagText(category, 'categorySystemId')}`,
			].filter(Boolean).join(' · ');
			const tag = el('li', {}, tagText(category, 'categoryName') || `Category ${id}`, id && el('span', { className: 'mono tag-id' }, id));
			if (extra) tag.append(el('span', { className: 'visually-hidden' }, ` (${extra})`));
			tag.title = [id && `ID ${id}`, extra].filter(Boolean).join(' · ');
			return tag;
		})));
		return block;
	}
	if (name === 'offerInstances') {
		block.append(...offerList(items));
		return block;
	}
	block.append(...items.map((item, i) => {
		const summary = el('summary', {},
			el('span', { className: 'spec-item-index mono' }, String(i + 1).padStart(2, '0')),
			el('span', { className: 'spec-item-name' }, itemName(item)),
			icon('chevron-down'));
		return el('details', { className: 'spec-item' }, summary, recordBody(item));
	}));
	return block;
}

function fullRecordPanel(entry, item) {
	const { rows, groups } = recordParts(entry);
	const sheet = el('div', { className: 'sheet' });
	if (rows.length) sheet.append(specList(rows));
	for (const group of groups) sheet.append(groupBlock(group));
	return el('section', { className: 'section section-lead' },
		el('div', { className: 'record-bar' },
			el('p', { className: 'record-sub' }, 'All marketplace listing data'),
			el('a', { href: recordUrl(item.id), target: '_blank', rel: 'noopener', className: 'record-source' }, icon('external'), 'Source XML')),
		sheet,
	);
}

function stepDetail(delta) {
	const index = results.findIndex(item => item.id === state.item);
	const next = results[index + delta];
	if (index === -1 || !next) return;
	const page = Math.floor((index + delta) / PAGE_SIZE) + 1;
	if (page !== state.page) {
		state.page = page;
		update({ resetPage: false });
	}
	openDetail(next.id, { focusClose: false });
}

// While the item detail is open the page behind it must not scroll, but its scrollbar stays put
// (hiding it would shift the layout). Wheel, touch and keyboard scrolling are only allowed
// inside its own scroll area; anything that still moves the page is undone.
let lockedScrollY = null;

function detailCanScroll(target, deltaY) {
	const body = els.detailBody;
	if (!body.contains(target)) return false;
	if (deltaY < 0) return body.scrollTop > 0;
	return body.scrollTop + body.clientHeight < body.scrollHeight - 1;
}

document.addEventListener('wheel', event => {
	if (lockedScrollY === null) return;
	if (!detailCanScroll(event.target, event.deltaY)) event.preventDefault();
}, { passive: false });

let touchY = 0;
document.addEventListener('touchstart', event => { touchY = event.touches[0].clientY; }, { passive: true });
document.addEventListener('touchmove', event => {
	if (lockedScrollY === null) return;
	// Measured per move, so a swipe that reverses direction is judged by where it's heading now.
	const deltaY = touchY - event.touches[0].clientY;
	touchY = event.touches[0].clientY;
	// The header is dragged by hand (see below), so the browser never gets to scroll or pull-to-refresh it.
	if (!detailCanScroll(event.target, deltaY)) event.preventDefault();
}, { passive: false });

const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);
document.addEventListener('keydown', event => {
	if (lockedScrollY === null || !SCROLL_KEYS.has(event.key)) return;
	if (event.key === ' ' && event.target.closest('button, a, input, select, summary')) return;
	if (event.altKey) return;
	// Scroll keys always scroll the item detail, wherever focus is inside it.
	event.preventDefault();
	const body = els.detailBody;
	const page = body.clientHeight * 0.85;
	const step = { ArrowUp: -48, ArrowDown: 48, PageUp: -page, PageDown: page, ' ': page, Home: -body.scrollHeight, End: body.scrollHeight }[event.key];
	body.scrollBy({ top: event.key === ' ' && event.shiftKey ? -page : step });
});

window.addEventListener('scroll', () => {
	if (lockedScrollY !== null && window.scrollY !== lockedScrollY) window.scrollTo(0, lockedScrollY);
});

function setBackgroundInert(inert) {
	for (const node of [els.header, els.main, els.footer]) node.inert = inert;
	lockedScrollY = inert ? window.scrollY : null;
	document.documentElement.classList.toggle('is-locked', inert);
}

let detailToken = 0;
let pendingBack = false;
const recordCache = new Map();

// One request per record; neighbours are fetched ahead so Next/Previous are usually instant.
function fetchRecord(id) {
	const key = `${state.locale}/${id}`;
	if (!recordCache.has(key)) {
		const promise = fetch(recordUrl(id)).then(async response => {
			if (!response.ok) throw new Error(`The XML record returned ${response.status}.`);
			return parseRecord(await response.text());
		});
		promise.catch(() => recordCache.delete(key));
		recordCache.set(key, promise);
	}
	return recordCache.get(key);
}

function prefetchNeighbours(id) {
	const index = results.findIndex(item => item.id === id);
	for (const neighbour of [results[index + 1], results[index - 1]]) {
		if (index !== -1 && neighbour) fetchRecord(neighbour.id).catch(() => {});
	}
}

const wait = ms => new Promise(resolve => setTimeout(() => resolve(null), ms));

// The tab survives stepping between items (← →), so someone comparing raw records can step through them.
let detailTab = 'overview';
let shownDetail = null;

function setDetailTab(tab) {
	detailTab = tab;
	// Both tabs stay in the Tab order: the arrow keys already step between items, so they can't move between tabs.
	for (const [name, button] of Object.entries(els.detailTabs)) button.setAttribute('aria-selected', String(name === tab));
	els.detailBody.setAttribute('aria-labelledby', els.detailTabs[tab].id);
}

// outcome: { record } once loaded, { error } on failure, or null while still loading.
function renderDetail(item, outcome) {
	shownDetail = { item, outcome };
	const title = outcome?.record?.title || item.title;
	// What kind of item it is and when the listing last changed sit quietly at the foot of the panel.
	const updated = formatUpdated(item.updated || (outcome?.record ? tagText(outcome.record.entry, 'updated') : ''));
	els.detailFoot.hidden = false;
	els.detailFoot.replaceChildren(
		el('span', { className: 'pill pill-type' }, typeName(item.type)),
		updated ? el('span', {}, icon('clock'), 'Updated ', updated) : '',
	);
	els.detailTitle.textContent = title;
	els.detailTitle.title = title;
	// Overview: what it is, then the identifiers people copy. Full Record: every field in the listing.
	let sections;
	if (outcome?.record) {
		sections = detailTab === 'record'
			? [fullRecordPanel(outcome.record.entry, item)]
			: [...recordSections(outcome.record, item), idsSection(item)];
	}
	else if (outcome?.error) sections = [
		el('section', { className: 'section section-lead' },
			el('p', { className: 'error-note' }, `${outcome.error.message} The identifiers below come from the index and are still accurate.`),
			el('a', { href: recordUrl(item.id), target: '_blank', rel: 'noopener', className: 'record-source' }, icon('external'), 'Try the original XML')),
		idsSection(item),
	];
	else sections = [
		el('section', { className: 'section section-lead' },
			el('div', { className: 'skeleton w60' }), el('div', { className: 'skeleton w80' }), el('div', { className: 'skeleton w60' })),
		idsSection(item),
	];
	els.detailBody.replaceChildren(...sections);
	resetDetailScroll();
	requestAnimationFrame(clampDescription);
}

// Descriptions open as a two-line preview so every item's panel stays compact; the button shows the rest.
const DESCRIPTION_LINES = 2;

function clampDescription() {
	const desc = els.detailBody.querySelector('.desc');
	if (!desc || els.detail.hidden || desc.classList.contains('is-clamped') || desc.nextElementSibling) return;
	const lineHeight = parseFloat(getComputedStyle(desc).lineHeight);
	if (desc.clientHeight <= lineHeight * DESCRIPTION_LINES + 1) return;
	desc.style.setProperty('--clamp', DESCRIPTION_LINES);
	desc.classList.add('is-clamped');
	const more = el('button', { type: 'button', className: 'link-btn' }, 'Show full description');
	more.setAttribute('aria-expanded', 'false');
	more.addEventListener('click', () => {
		const open = desc.classList.toggle('is-clamped');
		more.textContent = open ? 'Show full description' : 'Show less';
		more.setAttribute('aria-expanded', String(!open));
	});
	desc.after(more);
}

// Jump back to the top for each item. Briefly switching overflow off also kills any
// momentum or smooth scroll still running from the previous item (trackpads, wheels).
function resetDetailScroll() {
	const body = els.detailBody;
	body.style.overflowY = 'hidden';
	body.scrollTo({ top: 0, behavior: 'instant' });
	requestAnimationFrame(() => {
		body.scrollTop = 0;
		body.style.overflowY = '';
	});
}

async function openDetail(id, { push = true, focusClose = true, stack = false } = {}) {
	const item = byId.get(id);
	if (!item) return;
	const wasOpen = !els.detail.hidden;
	if (!wasOpen) {
		lastFocus = document.activeElement;
		setDetailTab('overview');
	}
	state.item = id;
	if (push && stack && wasOpen) {
		// An item opened straight from a shared link has no entry of its own, so it adds nothing to depth.
		const depth = history.state?.detail ? history.state.depth ?? 1 : 0;
		writeUrl('push', { detail: true, depth: depth + 1 });
	}
	else if (push) writeUrl(wasOpen ? 'replace' : 'push');
	for (const tr of els.body.querySelectorAll('tr')) tr.classList.toggle('is-active', tr.dataset.id === id);

	const token = ++detailToken;
	const pending = fetchRecord(id).then(record => ({ record }), error => ({ error }));
	// Keep the current content on screen briefly instead of flashing a placeholder;
	// only show the loading state if the record is genuinely slow.
	const ready = await Promise.race([pending, wait(wasOpen ? 300 : 150)]);
	if (token !== detailToken) return;
	renderDetail(item, ready);

	if (!wasOpen) {
		els.scrim.hidden = false;
		els.detail.hidden = false;
		setBackgroundInert(true);
		requestAnimationFrame(() => {
			els.scrim.classList.add('is-open');
			els.detail.classList.add('is-open');
		});
		if (focusClose) els.detailClose.focus({ preventScroll: true, focusVisible: false });
	}

	if (!ready) {
		const outcome = await pending;
		if (token !== detailToken) return;
		renderDetail(item, outcome);
	}
	prefetchNeighbours(id);
}

function closeDetail({ fromHistory = false } = {}) {
	detailToken++; // also cancels an open that is still waiting for its record
	if (els.detail.hidden) return;
	const viewedId = state.item;
	state.item = '';
	if (!fromHistory) {
		if (history.state?.detail) {
			// Opening the item added a history entry; step back over it so Back does not reopen it.
			// Anything that changes state before the step lands is re-applied in popstate.
			pendingBack = true;
			history.go(-(history.state.depth ?? 1));
		} else writeUrl();
	}
	setBackgroundInert(false);
	els.scrim.classList.remove('is-open');
	els.detail.classList.remove('is-open');
	for (const tr of els.body.querySelectorAll('tr.is-active')) tr.classList.remove('is-active');
	setTimeout(() => {
		if (state.item) return;
		els.scrim.hidden = true;
		els.detail.hidden = true;
	}, 260);
	// Return to the item last shown (Next/Previous may have moved on, even to another page).
	const link = els.body.querySelector(`tr[data-id="${CSS.escape(viewedId)}"] .row-title`);
	const target = link ?? (lastFocus?.isConnected ? lastFocus : null);
	target?.focus?.({ preventScroll: true, focusVisible: false });
	if (link) revealRow(link.closest('tr'));
}

/* ---------- URL state ---------- */

function readUrl() {
	const params = new URLSearchParams(location.search);
	const locale = (params.get('locale') ?? '').toLowerCase();
	state.locale = KNOWN_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
	state.query = params.get('q') ?? '';
	state.type = TYPE_BY_ID[params.get('type')] ? params.get('type') : '';
	state.sort = [...els.sort.options].some(o => o.value === params.get('sort')) ? params.get('sort') : 'title';
	state.page = Math.max(1, parseInt(params.get('page'), 10) || 1);
	state.item = params.get('item') ?? '';
	state.offerOnly = params.get('offer') === '1';
}

// Each item opened from the list, or from another item's parent link, gets its own history entry.
// `depth` counts how many of those sit on top of the list, so closing can step back over all of them,
// while the browser's Back returns from a parent to the item it was opened from.
function writeUrl(mode = 'replace', entry = { detail: true, depth: 1 }) {
	const params = new URLSearchParams();
	if (state.locale !== DEFAULT_LOCALE) params.set('locale', state.locale);
	if (state.query) params.set('q', state.query);
	if (state.type) params.set('type', state.type);
	if (state.sort !== 'title') params.set('sort', state.sort);
	if (state.offerOnly) params.set('offer', '1');
	if (state.page > 1) params.set('page', state.page);
	if (state.item) params.set('item', state.item);
	const search = params.toString();
	const url = search ? `?${search}` : location.pathname;
	if (mode === 'push') history.pushState(entry, '', url);
	else history.replaceState(history.state, '', url);
}

// The page manages its own scroll position (item history entries must not jump the list).
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

window.addEventListener('popstate', () => {
	if (pendingBack) {
		pendingBack = false;
		writeUrl();
		return;
	}
	const previousLocale = state.locale;
	const previousQuery = state.query;
	const previousType = state.type;
	const previousSort = state.sort;
	const previousPage = state.page;
	const previousOfferOnly = state.offerOnly;
	readUrl();
	if (state.locale !== previousLocale) {
		closeDetail({ fromHistory: true });
		setQuery(state.query);
		els.sort.value = state.sort;
		els.offerToggle.checked = state.offerOnly;
		loadLocale({ openItem: state.item });
		return;
	}
	if (state.query !== previousQuery || state.type !== previousType || state.sort !== previousSort || state.page !== previousPage || state.offerOnly !== previousOfferOnly) {
		setQuery(state.query);
		els.sort.value = state.sort;
		els.offerToggle.checked = state.offerOnly;
		update({ resetPage: false });
	}
	if (state.item) openDetail(state.item, { push: false });
	else closeDetail({ fromHistory: true });
});

function setQuery(value) {
	state.query = value;
	els.search.value = value;
	els.clear.hidden = !value;
}

/* ---------- Events ---------- */

let searchTimer;
els.search.addEventListener('input', () => {
	els.clear.hidden = !els.search.value;
	clearTimeout(searchTimer);
	searchTimer = setTimeout(() => {
		state.query = els.search.value.trim();
		update();
	}, 90);
});

els.clear.addEventListener('click', () => {
	setQuery('');
	update();
	els.search.focus();
});

els.filters.addEventListener('click', event => {
	const chip = event.target.closest('.chip');
	if (!chip) return;
	state.type = chip.dataset.type;
	update();
	scrollToResults();
	const active = els.filters.querySelector(`[data-type="${state.type}"]`);
	active?.focus({ preventScroll: true });
	active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
});

els.filters.addEventListener('keydown', event => {
	if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
	const chips = [...els.filters.querySelectorAll('.chip')];
	const i = chips.indexOf(document.activeElement);
	if (i === -1) return;
	event.preventDefault();
	const next = chips[(i + (event.key === 'ArrowRight' ? 1 : chips.length - 1)) % chips.length];
	next.click();
});

els.offerToggle.addEventListener('change', () => {
	state.offerOnly = els.offerToggle.checked;
	update();
	scrollToResults();
});

/* ---------- Sort dropdown ---------- */

// A listbox-style dropdown that drives the hidden native select.
const SORT_OPTIONS = [
	{ value: 'title', label: 'Title A–Z', group: 'Title' },
	{ value: '-title', label: 'Title Z–A', group: 'Title' },
	{ value: '-updated', label: 'Recently Updated', group: 'Last Updated' },
	{ value: 'updated', label: 'Oldest Updated', group: 'Last Updated' },
	{ value: 'type', label: 'Product Type A–Z', group: 'Type' },
	{ value: '-type', label: 'Product Type Z–A', group: 'Type' },
];
let sortActive = 0;

function buildSortMenu() {
	let lastGroup = '';
	for (const [i, option] of SORT_OPTIONS.entries()) {
		if (option.group !== lastGroup && i > 0) {
			const sep = el('div', { className: 'dropdown-sep' });
			sep.setAttribute('aria-hidden', 'true');
			els.sortMenu.append(sep);
		}
		lastGroup = option.group;
		const li = el('div', { id: `sort-opt-${i}`, className: 'dropdown-option' },
			el('span', {}, option.label),
			icon('check'),
		);
		li.setAttribute('role', 'option');
		li.dataset.index = i;
		els.sortMenu.append(li);
	}
}

function syncSortDropdown() {
	const current = SORT_OPTIONS.findIndex(o => o.value === state.sort);
	els.sortValue.textContent = els.sort.options[els.sort.selectedIndex]?.text ?? 'A–Z';
	els.sortTrigger.title = `Sort: ${SORT_OPTIONS[current]?.label ?? ''}`;
	for (const li of els.sortMenu.querySelectorAll('[role="option"]')) li.setAttribute('aria-selected', String(Number(li.dataset.index) === current));
}

function setSortActive(index) {
	sortActive = (index + SORT_OPTIONS.length) % SORT_OPTIONS.length;
	for (const li of els.sortMenu.querySelectorAll('[role="option"]')) li.classList.toggle('is-active', Number(li.dataset.index) === sortActive);
	els.sortMenu.setAttribute('aria-activedescendant', `sort-opt-${sortActive}`);
}

function openSortMenu() {
	if (els.sortTrigger.disabled || !els.sortMenu.hidden) return;
	closeLocaleMenu({ focusTrigger: false });
	els.sortMenu.hidden = false;
	els.sortTrigger.setAttribute('aria-expanded', 'true');
	// Open upwards if there isn't room below.
	const trigger = els.sortTrigger.getBoundingClientRect();
	els.sortMenu.classList.toggle('is-up', window.innerHeight - trigger.bottom < els.sortMenu.offsetHeight + 12 && trigger.top > els.sortMenu.offsetHeight + 12);
	setSortActive(Math.max(0, SORT_OPTIONS.findIndex(o => o.value === state.sort)));
	requestAnimationFrame(() => els.sortMenu.classList.add('is-open'));
	els.sortMenu.focus({ preventScroll: true });
}

function closeSortMenu({ focusTrigger = true } = {}) {
	if (els.sortMenu.hidden) return;
	els.sortMenu.classList.remove('is-open');
	els.sortMenu.hidden = true;
	els.sortTrigger.setAttribute('aria-expanded', 'false');
	if (focusTrigger) els.sortTrigger.focus({ preventScroll: true });
}

function chooseSort(index) {
	const option = SORT_OPTIONS[index];
	closeSortMenu();
	if (!option || option.value === state.sort) return;
	els.sort.value = option.value;
	els.sort.dispatchEvent(new Event('change'));
}

buildSortMenu();
syncSortDropdown();

els.sortTrigger.addEventListener('click', () => (els.sortMenu.hidden ? openSortMenu() : closeSortMenu()));
els.sortTrigger.addEventListener('keydown', event => {
	if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
		event.preventDefault();
		openSortMenu();
		if (event.key === 'ArrowUp') setSortActive(SORT_OPTIONS.length - 1);
	}
});
els.sortMenu.addEventListener('keydown', event => {
	const keys = {
		ArrowDown: () => setSortActive(sortActive + 1),
		ArrowUp: () => setSortActive(sortActive - 1),
		Home: () => setSortActive(0),
		End: () => setSortActive(SORT_OPTIONS.length - 1),
		Enter: () => chooseSort(sortActive),
		' ': () => chooseSort(sortActive),
		Escape: () => closeSortMenu(),
		Tab: () => closeSortMenu({ focusTrigger: false }),
	};
	if (!keys[event.key]) {
		// Type-ahead: jump to the first option starting with the typed letter.
		const i = SORT_OPTIONS.findIndex(o => o.label.toLowerCase().startsWith(event.key.toLowerCase()));
		if (event.key.length === 1 && i !== -1) setSortActive(i);
		return;
	}
	if (event.key !== 'Tab') event.preventDefault();
	event.stopPropagation(); // keep Escape from reaching the page-level handler
	keys[event.key]();
});
els.sortMenu.addEventListener('click', event => {
	const li = event.target.closest('[role="option"]');
	if (li) chooseSort(Number(li.dataset.index));
});
els.sortMenu.addEventListener('mousemove', event => {
	const li = event.target.closest('[role="option"]');
	if (li && Number(li.dataset.index) !== sortActive) setSortActive(Number(li.dataset.index));
});
// A tap outside an open menu only closes it, like a native menu; it must not also press whatever is underneath.
let swallowClick = false;
document.addEventListener('pointerdown', event => {
	swallowClick = false;
	if (!els.sortMenu.hidden && !event.target.closest('#sort-menu, #sort-trigger')) {
		closeSortMenu({ focusTrigger: false });
		swallowClick = true;
	}
	if (!els.localeMenu.hidden && !event.target.closest('#locale-menu, #locale-trigger')) {
		closeLocaleMenu({ focusTrigger: false });
		swallowClick = true;
	}
});
document.addEventListener('click', event => {
	if (!swallowClick) return;
	swallowClick = false;
	event.preventDefault();
	event.stopPropagation();
}, true);

els.sort.addEventListener('change', () => {
	state.sort = els.sort.value;
	update();
	scrollToResults();
});

els.table.querySelector('thead').addEventListener('click', event => {
	const button = event.target.closest('button[data-sort]');
	if (!button) return;
	const key = button.dataset.sort;
	const defaultDesc = key === 'updated';
	state.sort = state.sort === key ? `-${key}` : state.sort === `-${key}` ? key : defaultDesc ? `-${key}` : key;
	els.sort.value = state.sort;
	update();
	scrollToResults();
});

els.body.addEventListener('click', event => {
	const tr = event.target.closest('tr');
	if (!tr) return;
	const link = event.target.closest('a');
	if (link && (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1)) return;
	event.preventDefault();
	openDetail(tr.dataset.id);
});

// Height covered by pinned UI at the top: header + column headings on desktop. Phones pin nothing at
// the top (the header scrolls away and search docks to the bottom), so this is just any header still showing.
function pinnedHeight() {
	if (desktopLayout.matches) return els.header.offsetHeight + els.table.tHead.offsetHeight;
	return Math.max(0, els.header.getBoundingClientRect().bottom);
}

// Centre a row in the visible area if it is hidden behind the pinned UI or below the fold.
function revealRow(tr) {
	const row = tr.getBoundingClientRect();
	const top = pinnedHeight();
	const bottom = window.innerHeight - (docked ? dock.offsetHeight : 0);
	if (row.top >= top && row.bottom <= bottom) return;
	scroller().scrollBy({ top: row.top - top - (bottom - top - row.height) / 2 });
}

// After the list changes (type, sort), jump back to its top if we were scrolled down into it.
function scrollToResults() {
	const stuck = Math.max(els.header.getBoundingClientRect().bottom, 0);
	const toolbar = els.main.querySelector('.toolbar').getBoundingClientRect().top;
	// Phones scroll it flush to the top (the toolbar has its own padding) so the docked bar stays docked.
	if (toolbar < stuck) scroller().scrollBy({ top: toolbar - stuck - (desktopLayout.matches ? 8 : 0) });
}

function goToPage(page) {
	state.page = page;
	update({ resetPage: false });
	const top = els.table.getBoundingClientRect().top - (desktopLayout.matches ? els.header.offsetHeight : 0) - 8;
	scroller().scrollBy({ top });
}
els.prev.addEventListener('click', () => goToPage(state.page - 1));
els.next.addEventListener('click', () => goToPage(state.page + 1));

els.detailClose.addEventListener('click', closeDetail);
els.scrim.addEventListener('click', closeDetail);

// Phones: drag the sheet down by its header to dismiss it.
{
	const head = els.detail.querySelector('.detail-head');
	let startY = null;
	let dy = 0;
	head.addEventListener('touchstart', event => {
		if (desktopLayout.matches) return;
		startY = event.touches[0].clientY;
		dy = 0;
		els.detail.classList.add('is-dragging');
	}, { passive: true });
	head.addEventListener('touchmove', event => {
		if (startY === null) return;
		dy = Math.max(0, event.touches[0].clientY - startY);
		els.detail.style.transform = `translateY(${dy}px)`;
	}, { passive: true });
	const end = () => {
		if (startY === null) return;
		startY = null;
		els.detail.classList.remove('is-dragging');
		els.detail.style.transform = '';
		if (dy > 90) closeDetail();
	};
	head.addEventListener('touchend', end);
	head.addEventListener('touchcancel', end);
}

for (const [name, button] of Object.entries(els.detailTabs)) {
	button.addEventListener('click', () => {
		if (detailTab === name) return;
		setDetailTab(name);
		if (shownDetail) renderDetail(shownDetail.item, shownDetail.outcome);
	});
}

function rowLinks() {
	return [...els.body.querySelectorAll('.row-title')];
}

els.search.addEventListener('keydown', event => {
	if (event.key === 'ArrowDown') {
		event.preventDefault();
		rowLinks()[0]?.focus();
	} else if (event.key === 'Enter') {
		clearTimeout(searchTimer);
		state.query = els.search.value.trim();
		update();
		const first = results[0];
		if (first && results.length === 1) openDetail(first.id);
	}
});

els.body.addEventListener('keydown', event => {
	if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
	const links = rowLinks();
	const i = links.indexOf(document.activeElement);
	if (i === -1) return;
	event.preventDefault();
	if (event.key === 'ArrowUp' && i === 0) els.search.focus();
	else links[Math.min(links.length - 1, i + (event.key === 'ArrowDown' ? 1 : -1))]?.focus();
});

els.detail.addEventListener('keydown', event => {
	if (event.key === 'Tab') {
		const focusable = [...els.detail.querySelectorAll('button:not(:disabled), a[href]')].filter(n => n.offsetParent);
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
		else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
	} else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && !event.target.closest('input, select, textarea')) {
		event.preventDefault();
		stepDetail(event.key === 'ArrowRight' ? 1 : -1);
	} else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && event.altKey) {
		event.preventDefault();
		stepDetail(event.key === 'ArrowDown' ? 1 : -1);
	}
});

document.addEventListener('keydown', event => {
	if (event.key === 'Escape') {
		if (!els.detail.hidden) { closeDetail(); return; }
		if (document.activeElement === els.search && els.search.value) { setQuery(''); update(); }
		return;
	}
	if (event.key === '/' && els.detail.hidden && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
		event.preventDefault();
		els.search.focus();
		els.search.select();
	}
});

// Desktop: search sits in the header row and the type chips scroll with the results.
// Phones: both move into the dock, which docks to the bottom of the screen once scrolled past.
const filtersWrap = document.querySelector('.filters-wrap');
const searchBox = document.querySelector('.search');
const dockSlot = document.querySelector('.dock-slot');
const dock = document.querySelector('.dock');
function placeFilters() {
	if (desktopLayout.matches) {
		document.querySelector('.brand-row').after(searchBox);
		els.main.prepend(filtersWrap);
		setDocked(false);
	} else {
		dock.append(searchBox, filtersWrap);
		syncDock();
	}
}

let docked = false;
let slotHeight = 0;
function setDocked(on) {
	if (on === docked) return;
	docked = on;
	// The slot keeps the dock's height while it is out of the flow, so the page doesn't jump.
	if (on) slotHeight = dockSlot.offsetHeight;
	dockSlot.style.height = on ? `${slotHeight}px` : '';
	dock.classList.toggle('is-docked', on);
	document.documentElement.classList.toggle('has-dock', on);
	syncDockHeight();
}
function syncDockHeight() {
	document.documentElement.style.setProperty('--dock-h', docked ? `${dock.offsetHeight}px` : '0px');
}
// Docked once the slot has scrolled off the top; stays docked while typing, so a shrinking result
// list can't yank the focused box back up to the header mid-word.
function syncDock() {
	if (desktopLayout.matches) return;
	const top = dockSlot.getBoundingClientRect().top;
	const past = top + (docked ? slotHeight : dockSlot.offsetHeight) <= 0;
	setDocked(past || (docked && document.activeElement === els.search));
	if (!docked) return;
	// Docked only because the box is focused, with its slot on screen (typing shrank the list to the
	// top of the page): collapse the slot rather than show an empty gap. Restore it once scrolled past,
	// shifting the scroll by the same amount since it grows above the viewport (unless the browser's
	// scroll anchoring already did).
	const want = past ? slotHeight : 0;
	const had = dockSlot.offsetHeight;
	if (had === want) return;
	const y = scroller().scrollTop;
	dockSlot.style.height = `${want}px`;
	if (want > had && dockSlot.offsetHeight && scroller().scrollTop === y) scroller().scrollBy({ top: want - had, behavior: 'instant' });
}
window.addEventListener('scroll', syncDock, { passive: true });
els.search.addEventListener('blur', () => requestAnimationFrame(syncDock));
new ResizeObserver(syncDockHeight).observe(dock);
// Keep the docked bar above the on-screen keyboard (iOS leaves fixed elements behind it).
if (window.visualViewport) {
	const syncKeyboard = () => {
		// Pinch-zoom also shrinks the visual viewport; only a keyboard does so at scale 1.
		const covered = visualViewport.scale > 1.01 ? 0 : window.innerHeight - visualViewport.height - visualViewport.offsetTop;
		document.documentElement.style.setProperty('--kb', `${Math.max(0, Math.round(covered))}px`);
	};
	visualViewport.addEventListener('resize', syncKeyboard);
	visualViewport.addEventListener('scroll', syncKeyboard);
}
placeFilters();

// Desktop scrolls inside #page, phones scroll the document, so switching layouts (e.g. rotating a
// large phone past 768px) would lose the scroll position. Track the first visible row and return to it.
let anchorId = '';
let anchorFrame = 0;
function recordAnchor() {
	if (anchorFrame) return;
	anchorFrame = requestAnimationFrame(() => {
		anchorFrame = 0;
		const top = pinnedHeight();
		const row = [...els.body.rows].find(tr => tr.getBoundingClientRect().bottom > top);
		anchorId = scroller().scrollTop > 0 && row ? row.dataset.id : '';
	});
}
els.page.addEventListener('scroll', recordAnchor, { passive: true });
window.addEventListener('scroll', recordAnchor, { passive: true });

desktopLayout.addEventListener('change', () => {
	const id = anchorId;
	placeFilters();
	requestAnimationFrame(() => {
		const row = id && els.body.querySelector(`tr[data-id="${CSS.escape(id)}"]`);
		if (row) scroller().scrollBy({ top: row.getBoundingClientRect().top - pinnedHeight() });
		syncToTop();
	});
});

// Back-to-top button: appears once the list is scrolled about two screens down.
const toTop = $('to-top');
let toTopShown = false;
function syncToTop() {
	const show = scroller().scrollTop > window.innerHeight * 1.5;
	if (show === toTopShown) return;
	toTopShown = show;
	if (show) {
		toTop.hidden = false;
		requestAnimationFrame(() => toTop.classList.add('is-visible'));
	} else {
		toTop.classList.remove('is-visible');
		setTimeout(() => { if (!toTopShown) toTop.hidden = true; }, 200);
	}
}
els.page.addEventListener('scroll', syncToTop, { passive: true });
window.addEventListener('scroll', syncToTop, { passive: true });
toTop.addEventListener('click', () => {
	const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
	scroller().scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
	// Desktop: land in the search box, ready to type. Phones skip this so the keyboard doesn't pop up.
	if (desktopLayout.matches) els.search.focus({ preventScroll: true });
});
// Keep the button clear of the desktop page scrollbar.
new ResizeObserver(() => {
	document.documentElement.style.setProperty('--scrollbar-w', `${els.page.offsetWidth - els.page.clientWidth}px`);
}).observe(els.page);

// Placeholder: the full hint when the box has room for it, a short one on narrow screens.
const PLACEHOLDER_FULL = 'Search by Title, Title ID, Offer ID or Content ID';
const PLACEHOLDER_SHORT = 'Search Titles or IDs';
new ResizeObserver(() => {
	const ctx = document.createElement('canvas').getContext('2d');
	ctx.font = getComputedStyle(els.search).font;
	const style = getComputedStyle(els.search);
	const room = els.search.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
	els.search.placeholder = ctx.measureText(PLACEHOLDER_FULL).width <= room ? PLACEHOLDER_FULL : PLACEHOLDER_SHORT;
}).observe(els.search);

new ResizeObserver(() => {
	document.documentElement.style.setProperty('--head-h', `${els.header.offsetHeight}px`);
}).observe(els.header);

/* ---------- Start ---------- */

let loadToken = 0;

async function loadLocale({ openItem = '', focus = false } = {}) {
	const locale = state.locale;
	const token = ++loadToken;
	renderLocales();
	document.documentElement.dataset.locale = locale;

	if (!indexCache.has(locale)) {
		els.search.disabled = true;
		els.sort.disabled = true;
		els.sortTrigger.disabled = true;
		els.localeTrigger.disabled = true;
		els.offerToggle.disabled = true;
		els.table.hidden = true;
		els.pager.hidden = true;
		els.count.textContent = `Loading the ${locale} index…`;
		els.status.hidden = false;
		els.status.replaceChildren(
			el('div', { className: 'progress' }, els.progress),
			els.statusText,
		);
		els.progress.style.width = '0';
		els.statusText.textContent = `Downloading the ${locale} index…`;
		renderFilters({}, 0);
		try {
			const text = await loadIndex(locale);
			if (token !== loadToken) return;
			els.statusText.textContent = 'Indexing items…';
			await new Promise(requestAnimationFrame);
			const list = buildItems(parseCsv(text)).sort(SORTERS.title);
			indexCache.set(locale, { items: list, byId: new Map(list.map(item => [item.id, item])) });
		} catch (error) {
			if (token !== loadToken) return;
			els.count.textContent = '';
			els.localeTrigger.disabled = false;
			showStatus('error', error.missing ? error.message : `${error.message || 'The download failed.'} Check your connection and try again.`, locale);
			return;
		}
	}
	if (token !== loadToken) return;
	({ items, byId } = indexCache.get(locale));
	els.search.disabled = false;
	els.sort.disabled = false;
	els.sortTrigger.disabled = false;
	els.localeTrigger.disabled = false;
	els.offerToggle.disabled = false;
	update({ resetPage: false });
	if (openItem && byId.has(openItem)) openDetail(openItem, { push: false });
	else if (openItem) { state.item = ''; writeUrl(); }
	if (focus) els.search.focus({ preventScroll: true });
}

els.locale.addEventListener('change', () => {
	closeDetail();
	state.locale = els.locale.value;
	state.page = 1;
	writeUrl();
	loadLocale();
});

/* ---------- Locale dropdown ---------- */

// Phones show just the locale code so the title keeps its room; wider screens show the full name.
const compactLocales = matchMedia('(max-width: 768px)');
function labelLocales() {
	els.localeValue.textContent = compactLocales.matches ? state.locale : localeLongName(state.locale);
	els.localeTrigger.title = localeLongName(state.locale);
	els.localeTrigger.setAttribute('aria-label', `Marketplace locale: ${localeLongName(state.locale)}`);
}
compactLocales.addEventListener('change', labelLocales);

const localeCodes = () => (locales.includes(state.locale) ? locales : [...locales, state.locale]);

function renderLocales() {
	const codes = localeCodes();
	els.locale.replaceChildren(...codes.map(code => el('option', { value: code }, code)));
	els.locale.value = state.locale;
	labelLocales();
	// The search box only earns its place once the list is long.
	els.localeFilterWrap.hidden = codes.length <= 8;
	if (!els.localeMenu.hidden) renderLocaleList();
}

let localeMatches = [];
let localeActive = 0;

function renderLocaleList() {
	const query = els.localeFilter.value.trim().toLowerCase();
	const codes = localeCodes();
	localeMatches = codes.filter(code => !query || code.includes(query) || localeLongName(code).toLowerCase().includes(query));
	const nodes = [];
	localeMatches.forEach((code, i) => {
		if (!query && i === 1 && localeMatches[0] === DEFAULT_LOCALE) {
			const sep = el('div', { className: 'dropdown-sep' });
			sep.setAttribute('aria-hidden', 'true');
			nodes.push(sep);
		}
		const option = el('div', { id: `locale-opt-${i}`, className: 'dropdown-option locale-option' },
			el('span', { className: 'locale-names' }, el('span', {}, localeLongName(code)), el('span', { className: 'locale-code' }, code)),
			icon('check'),
		);
		option.setAttribute('role', 'option');
		option.setAttribute('aria-selected', String(code === state.locale));
		option.dataset.index = i;
		nodes.push(option);
	});
	if (!localeMatches.length) nodes.push(el('p', { className: 'locale-empty' }, 'No archived locale matches'));
	els.localeList.replaceChildren(...nodes);
	els.localeList.setAttribute('aria-busy', String(!localesKnown));
	els.localeCount.textContent = !localesKnown
		? 'Checking the archive…'
		: query
		? `${fmt.format(localeMatches.length)} of ${fmt.format(codes.length)} locales`
		: `${fmt.format(codes.length)} ${codes.length === 1 ? 'locale' : 'locales'} in the archive`;
	const current = localeMatches.indexOf(state.locale);
	setLocaleActive(query || current === -1 ? 0 : current);
}

function setLocaleActive(index) {
	if (!localeMatches.length) {
		els.localeFilter.removeAttribute('aria-activedescendant');
		return;
	}
	localeActive = (index + localeMatches.length) % localeMatches.length;
	for (const option of els.localeList.querySelectorAll('[role="option"]')) {
		const active = Number(option.dataset.index) === localeActive;
		option.classList.toggle('is-active', active);
		if (active) option.scrollIntoView({ block: 'nearest' });
	}
	els.localeFilter.setAttribute('aria-activedescendant', `locale-opt-${localeActive}`);
	els.localeList.setAttribute('aria-activedescendant', `locale-opt-${localeActive}`);
}

function openLocaleMenu() {
	if (els.localeTrigger.disabled || !els.localeMenu.hidden) return;
	discoverLocales();
	closeSortMenu({ focusTrigger: false });
	els.localeFilter.value = '';
	els.localeMenu.hidden = false;
	els.localeTrigger.setAttribute('aria-expanded', 'true');
	renderLocaleList();
	requestAnimationFrame(() => els.localeMenu.classList.add('is-open'));
	(els.localeFilterWrap.hidden ? els.localeList : els.localeFilter).focus({ preventScroll: true });
}

function closeLocaleMenu({ focusTrigger = true } = {}) {
	if (els.localeMenu.hidden) return;
	els.localeMenu.classList.remove('is-open');
	els.localeMenu.hidden = true;
	els.localeMenu.style.width = '';
	els.localeTrigger.setAttribute('aria-expanded', 'false');
	if (focusTrigger) els.localeTrigger.focus({ preventScroll: true });
}

function chooseLocale(index) {
	const code = localeMatches[index];
	closeLocaleMenu();
	if (!code || code === state.locale) return;
	els.locale.value = code;
	els.locale.dispatchEvent(new Event('change'));
}

els.localeTrigger.addEventListener('click', () => (els.localeMenu.hidden ? openLocaleMenu() : closeLocaleMenu()));
els.localeTrigger.addEventListener('keydown', event => {
	if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
		event.preventDefault();
		openLocaleMenu();
	}
});
els.localeFilter.addEventListener('input', () => {
	// The menu sizes to its names; hold that width while filtering so it doesn't shrink under the cursor.
	if (!els.localeMenu.style.width) els.localeMenu.style.width = `${els.localeMenu.offsetWidth}px`;
	renderLocaleList();
});
els.localeMenu.addEventListener('keydown', event => {
	const page = 6;
	const keys = {
		ArrowDown: () => setLocaleActive(localeActive + 1),
		ArrowUp: () => setLocaleActive(localeActive - 1),
		PageDown: () => setLocaleActive(Math.min(localeMatches.length - 1, localeActive + page)),
		PageUp: () => setLocaleActive(Math.max(0, localeActive - page)),
		Enter: () => chooseLocale(localeActive),
		Escape: () => closeLocaleMenu(),
		Tab: () => closeLocaleMenu({ focusTrigger: false }),
	};
	// Home/End and Space belong to the search box while typing; outside it they move or choose.
	if (event.target !== els.localeFilter) {
		keys.Home = () => setLocaleActive(0);
		keys.End = () => setLocaleActive(localeMatches.length - 1);
		keys[' '] = () => chooseLocale(localeActive);
	}
	if (!keys[event.key]) return;
	if (event.key !== 'Tab') event.preventDefault();
	event.stopPropagation(); // keep Escape and the arrows from reaching page-level handlers
	keys[event.key]();
});
els.localeList.addEventListener('click', event => {
	const option = event.target.closest('[role="option"]');
	if (option) chooseLocale(Number(option.dataset.index));
});
els.localeList.addEventListener('mousemove', event => {
	const option = event.target.closest('[role="option"]');
	if (option && Number(option.dataset.index) !== localeActive) setLocaleActive(Number(option.dataset.index));
});

// Use a remembered result from the last day, if the browser kept one.
function restoreLocales() {
	try {
		const saved = JSON.parse(localStorage.getItem(LOCALE_CACHE_KEY));
		if (!saved || Date.now() - saved.at > LOCALE_CACHE_MS || !Array.isArray(saved.codes)) return;
		const codes = saved.codes.filter(code => KNOWN_LOCALES.includes(code) && code !== DEFAULT_LOCALE);
		locales = [DEFAULT_LOCALE, ...codes];
		localesKnown = true;
	} catch {
		// Storage unavailable or unreadable: check again when the menu opens.
	}
}

function rememberLocales(codes) {
	try {
		localStorage.setItem(LOCALE_CACHE_KEY, JSON.stringify({ at: Date.now(), codes }));
	} catch {
		// Storage unavailable: the next visit simply checks again.
	}
}

// Runs once per page (and only when needed). Checks a few locales at a time so the page's own
// requests, such as item records, aren't queued behind them.
function discoverLocales() {
	if (localesKnown || localeDiscovery) return localeDiscovery;
	localeDiscovery = checkArchiveLocales();
	return localeDiscovery;
}

async function checkArchiveLocales() {
	const queue = KNOWN_LOCALES.filter(code => code !== DEFAULT_LOCALE);
	const found = [];
	let failed = false;
	const worker = async () => {
		for (let code = queue.shift(); code; code = queue.shift()) {
			try {
				const response = await fetch(indexUrl(code), { method: 'HEAD' });
				if (response.ok) found.push(code);
				else if (response.status !== 404) failed = true;
			} catch {
				failed = true;
			}
		}
	};
	await Promise.all(Array.from({ length: 8 }, worker));
	const others = found.sort((a, b) => localeLongName(a).localeCompare(localeLongName(b)));
	locales = [DEFAULT_LOCALE, ...others];
	localesKnown = true;
	// A check that failed (offline, server error) may have hidden a real locale, so don't keep that answer for a day.
	if (!failed) rememberLocales(others);
	renderLocales();
}

(function start() {
	readUrl();
	restoreLocales();
	renderLocales();
	setQuery(state.query);
	els.sort.value = state.sort;
	els.offerToggle.checked = state.offerOnly;
	loadLocale({
		openItem: state.item,
		focus: !state.query && desktopLayout.matches,
	});
})();
