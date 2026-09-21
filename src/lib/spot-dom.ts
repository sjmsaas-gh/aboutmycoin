/**
 * The browser half of the spot price: fetch once, rewrite every figure.
 *
 * ---------------------------------------------------------------------------
 * WHY ANY OF THIS RUNS IN THE BROWSER AT ALL
 * ---------------------------------------------------------------------------
 *
 * The site is static and its HTML is cached hard at the edge -- a day, and
 * served stale for a week after that. Everything on a coin page is safe in
 * that cache except one class of fact: what an ounce of silver costs. A price
 * baked into the HTML is a price that cannot be corrected without a deploy,
 * and a deploy is not a thing that happens hourly.
 *
 * So the figure is rendered twice. The build renders the reference table from
 * `spot.ts`, dated and caveated, and that is what a crawler indexes and what a
 * reader without JavaScript sees. Then this module fetches `/api/spot` -- one
 * small JSON document, cached for an hour rather than a day -- and rewrites
 * the figures in place.
 *
 * Every string it writes comes from the same functions in `spot.ts` that the
 * build called. That is the whole design: there is no second implementation of
 * `formatUsd`, of the caveat, or of the ladder arithmetic to drift out of step
 * with the first one. There used to be -- an inline script on the melt page
 * with its own `usd()` and a test that lifted it out with a regex to compare
 * the two -- and it is gone.
 *
 * ---------------------------------------------------------------------------
 * THE MARKUP CONTRACT
 * ---------------------------------------------------------------------------
 *
 * A figure is rewritable when it carries `data-spot`, which names what the
 * number IS rather than what it currently says:
 *
 *   data-spot="price"       + metal              $65.00
 *   data-spot="price-unit"  + metal              $65.00/ozt
 *   data-spot="value"       + metal + ozt        weight times price
 *   data-spot="sum"         + sum                several weights, several metals
 *   data-spot="ozt"         + ozt [+ suffix]     a weight, which only qty moves
 *   data-spot="stamp"       + metal              the one-line dateline
 *   data-spot="caveat"      + metal              the full sentence
 *   data-spot="strip-note"                       the home page's one note
 *   data-spot="asof"                             the date on its own
 *   data-spot="reference-clause"                 ", a reference price…" or ""
 *   data-spot="ladder"      + metal              a <tbody> of multipliers
 *
 * `data-spot-qty` on a node means the quantity input multiplies it. That is
 * how the melt page's calculator works: it does not own an arithmetic of its
 * own, it sets a number and re-runs this.
 *
 * A page with none of these attributes costs one early return.
 */
import {
  METALS,
  REFERENCE_SPOT,
  SPOT_ENDPOINT,
  formatOzt,
  formatUsd,
  parseSpot,
  spotAsOfLabel,
  spotCaveat,
  referenceClause,
  spotLadder,
  spotStamp,
  spotStripNote,
  type Metal,
  type SpotSnapshot,
} from './spot';

/** The snapshot every figure on the page is currently showing. */
let snapshot: SpotSnapshot = REFERENCE_SPOT;

/** How many coins the reader says they have. Only the melt page moves it. */
let quantity = 1;

/** The largest lot the calculator will multiply out. Mirrors the input's max. */
const MAX_QUANTITY = 1_000_000;

const isMetal = (value: string | null): value is Metal =>
  value !== null && (METALS as string[]).includes(value);

/**
 * "silver=0.1808;gold=0.2419" -> the weights behind a mixed total.
 *
 * A total across a group is one metal and could have been a plain `value`, but
 * a total across the whole catalogue is not, and a sum rendered as if it were
 * single-metal would rescale gold at the silver price. So every total carries
 * its breakdown and this reads it back.
 */
const parseSum = (value: string | null): [Metal, number][] => {
  if (!value) return [];
  const parts: [Metal, number][] = [];
  for (const chunk of value.split(';')) {
    const [metal, ozt] = chunk.split('=');
    const weight = Number(ozt);
    if (isMetal(metal) && Number.isFinite(weight)) parts.push([metal, weight]);
  }
  return parts;
};

/**
 * Rebuild one ladder's rows against the new price.
 *
 * The ladder is the only block here that is a shape rather than a string: five
 * prices either side of spot, each with the multiplier that scales every
 * figure on the page to it. It has to be rebuilt rather than patched, because
 * a new spot price moves the rungs as well as the ratios -- and a ladder still
 * centred on yesterday's price, under figures worked at today's, is the one
 * part of that page that would visibly contradict itself.
 *
 * The markup written here is the markup `/melt-value/<group>` renders at build
 * time, row for row. `tests/build-smoke.test.mjs` pins the server's version;
 * change one and change the other.
 */
const renderLadder = (tbody: Element, metal: Metal): void => {
  const spot = snapshot.prices[metal];
  tbody.replaceChildren(
    ...spotLadder(metal, snapshot).map((price) => {
      const row = document.createElement('tr');

      const left = document.createElement('td');
      left.append(`${formatUsd(price)}/ozt`);
      if (price === spot) {
        const used = document.createElement('span');
        used.className = 'tag-this';
        used.textContent = ' used above';
        left.append(used);
      }

      const right = document.createElement('td');
      right.setAttribute('style', 'text-align: right');
      right.textContent = `${(price / spot).toFixed(2)}×`;

      row.append(left, right);
      return row;
    }),
  );
};

/**
 * The attributes of one marked figure, lifted off the element.
 *
 * A plain record rather than the element itself, so the rule that turns
 * attributes into text is a pure function of data -- which means the build's
 * own output can be fed back through it. `tests/build-smoke.test.mjs` does
 * exactly that: it pulls every marked span out of every built page, re-derives
 * what it should say at the reference price, and fails if that is not what the
 * build actually printed. A figure whose attributes disagree with its own text
 * does not look broken, and that check is the only thing that would catch it.
 */
export interface SpotFigure {
  kind?: string;
  metal?: string;
  ozt?: string;
  sum?: string;
  suffix?: string;
  /** Present when the quantity input multiplies this figure. */
  qty?: boolean;
}

/** What one marked figure should say, at this snapshot and this quantity. */
export const spotFigureText = (
  figure: SpotFigure,
  snap: SpotSnapshot,
  quantity = 1,
): string | undefined => {
  const { kind, metal } = figure;
  const ozt = Number(figure.ozt);
  // Absent means "one of these", not "none of these": a figure that is not
  // part of the calculator must not collapse when somebody types in the box.
  const qty = figure.qty ? quantity : 1;

  switch (kind) {
    case 'price':
      return isMetal(metal ?? null) ? formatUsd(snap.prices[metal as Metal]) : undefined;
    case 'price-unit':
      return isMetal(metal ?? null) ? `${formatUsd(snap.prices[metal as Metal])}/ozt` : undefined;
    case 'value':
      return isMetal(metal ?? null) && Number.isFinite(ozt)
        ? formatUsd(ozt * snap.prices[metal as Metal] * qty)
        : undefined;
    case 'sum': {
      const parts = parseSum(figure.sum ?? null);
      if (!parts.length) return undefined;
      return formatUsd(parts.reduce((t, [m, w]) => t + w * snap.prices[m], 0) * qty);
    }
    case 'ozt':
      return Number.isFinite(ozt) ? `${formatOzt(ozt * qty)}${figure.suffix ?? ''}` : undefined;
    case 'stamp':
      return isMetal(metal ?? null) ? spotStamp(metal as Metal, snap) : undefined;
    case 'caveat':
      return isMetal(metal ?? null) ? spotCaveat(metal as Metal, snap) : undefined;
    case 'strip-note':
      return spotStripNote(snap);
    case 'asof':
      return spotAsOfLabel(snap);
    case 'reference-clause':
      return referenceClause(snap);
    default:
      return undefined;
  }
};

/** The same, for an element on the page. */
const textFor = (node: Element): string | undefined =>
  spotFigureText(
    {
      kind: node.getAttribute('data-spot') ?? undefined,
      metal: node.getAttribute('data-spot-metal') ?? undefined,
      ozt: node.getAttribute('data-spot-ozt') ?? undefined,
      sum: node.getAttribute('data-spot-sum') ?? undefined,
      suffix: node.getAttribute('data-spot-suffix') ?? undefined,
      qty: node.hasAttribute('data-spot-qty'),
    },
    snapshot,
    quantity,
  );

/**
 * Keep the JSON-LD in step with the sentence it was built from.
 *
 * The house rule is that visible HTML and structured data are built from the
 * same object, and they are -- at build time, by one generator in melt.ts. The
 * moment this module rewrites a figure inside a visible answer, the copy of
 * that answer sitting in a `<script type="application/ld+json">` is the old
 * sentence, and a page whose schema states a different price from its body is
 * exactly the mismatch Google issues manual actions for.
 *
 * So a rewritten answer carries `data-spot-sync`, holding the plain string the
 * build put in the schema. After the spans are updated, the node's own
 * `textContent` is the new plain string, and every occurrence of the old one
 * anywhere in the page's JSON-LD is replaced with it. String equality, not a
 * path: the generator produced one sentence and it appears wherever it
 * appears, which is how it stays correct if a page grows a second schema
 * carrying the same answer.
 */
const syncSchema = (before: Map<Element, string>): void => {
  const changed: [string, string][] = [];
  for (const [node, original] of before) {
    const after = node.textContent ?? '';
    if (after && after !== original) {
      changed.push([original, after]);
      node.setAttribute('data-spot-sync', after);
    }
  }
  if (!changed.length) return;

  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    const raw = script.textContent;
    if (!raw) continue;
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      // A schema block this module cannot parse is a schema block it leaves
      // alone. Rewriting it blind would be worse than letting it go stale.
      continue;
    }
    const walk = (value: unknown): unknown => {
      if (typeof value === 'string') {
        let out = value;
        for (const [from, to] of changed) if (out === from) out = to;
        return out;
      }
      if (Array.isArray(value)) return value.map(walk);
      if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]));
      }
      return value;
    };
    const next = JSON.stringify(walk(json));
    if (next !== raw) script.textContent = next;
  }
};

/** Rewrite every marked figure on the page. Idempotent, and cheap enough to
 *  re-run on every keystroke in the quantity box. */
export const applySpot = (): void => {
  const synced = new Map<Element, string>();
  for (const node of document.querySelectorAll('[data-spot-sync]')) {
    synced.set(node, node.getAttribute('data-spot-sync') ?? '');
  }

  for (const node of document.querySelectorAll('[data-spot]')) {
    const kind = node.getAttribute('data-spot');
    const metal = node.getAttribute('data-spot-metal');
    if (kind === 'ladder') {
      if (isMetal(metal)) renderLadder(node, metal);
      continue;
    }
    const text = textFor(node);
    if (text !== undefined) node.textContent = text;
  }

  syncSchema(synced);
};

/** Set the current snapshot and repaint. Exported for the dev workbench. */
export const setSpot = (next: SpotSnapshot): void => {
  snapshot = next;
  applySpot();
};

/**
 * Ask the endpoint.
 *
 * A failure of any kind -- offline, 503, a body that does not validate --
 * returns undefined and the page keeps the figures the build rendered. That is
 * the honest failure: those figures state their own price and date, so a
 * reader looking at them is not being told anything untrue, only something
 * older than it could have been. The alternative, blanking a figure because a
 * fetch failed, loses the answer the page exists to give.
 */
export const fetchSpot = async (): Promise<SpotSnapshot | undefined> => {
  try {
    const res = await fetch(SPOT_ENDPOINT, { headers: { accept: 'application/json' } });
    if (!res.ok) return undefined;
    return parseSpot(await res.json());
  } catch {
    return undefined;
  }
};

/**
 * The quantity box on a melt page: "how many do you have".
 *
 * It owns no arithmetic. It sets a number and re-runs the same pass that the
 * price update runs, which is why the figure it drives and the figure the feed
 * drives cannot round differently -- they are one line of code.
 */
const wireQuantity = (): void => {
  const input = document.getElementById('calc-count');
  if (!(input instanceof HTMLInputElement)) return;

  const read = (): void => {
    // An empty box reads as one coin rather than as zero: somebody who has
    // just cleared the field to type a new number should not watch the answer
    // collapse to $0.00 in between keystrokes.
    const raw = input.value.trim();
    let n = raw === '' ? 1 : Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 0) n = 0;
    if (n > MAX_QUANTITY) n = MAX_QUANTITY;
    quantity = n;
    applySpot();
  };

  input.addEventListener('input', read);
  // A browser that restored a previous value on back-navigation has already
  // changed the box before this runs.
  read();
};

/**
 * Entry point, called by `SpotLive.astro` on every page.
 *
 * Wires the quantity box first and fetches second, so the calculator works on
 * a page whose endpoint is unreachable -- the two are independent, and the one
 * that needs no network should not wait on the one that does.
 *
 * It also re-runs on a back-navigation restored from the back/forward cache.
 * That page is not reloaded and its module scripts do not run again: it is
 * the DOM as it stood when the reader left, which may be an hour of browsing
 * ago and, on a melt page, still shows whatever quantity they had typed. The
 * re-run is cheap -- inside `max-age` the browser answers the fetch out of its
 * own cache without a request -- and it is the only path on the site that can
 * show a figure older than the endpoint's own hour.
 */
export const bootSpot = async (): Promise<void> => {
  if (!document.querySelector('[data-spot]')) return;
  wireQuantity();

  // Attached once per window, not once per boot, so a restore does not stack
  // another listener on top of the one that woke it. Keyed on the window
  // rather than held in a module flag because the module outlives a single
  // document under test, and "has this page been wired" is a fact about the
  // page.
  if (!restoreWired.has(window)) {
    restoreWired.add(window);
    window.addEventListener('pageshow', (event) => {
      if ((event as PageTransitionEvent).persisted) void bootSpot();
    });
  }

  const next = await fetchSpot();
  if (next) setSpot(next);
};

/** Windows whose back/forward-cache listener is already attached. */
const restoreWired = new WeakSet<Window>();
