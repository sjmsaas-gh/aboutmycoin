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
 * small JSON document, cached for half an hour rather than a day -- and rewrites
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
 * `data-spot-qty` on a node means a quantity input multiplies it. Empty is the
 * melt page's single box, `#calc-count`; a value names an input by id, which is
 * what the silver melt price calculator uses -- one box per row, all on one page. That
 * is the whole of the calculator: it owns no arithmetic, it sets numbers and
 * re-runs this.
 *
 * `data-spot-lot` groups rows that add up, and `data-spot-lot-total` on a `sum`
 * or an `ozt` figure is the total of the lot it names. A total cannot be a
 * figure of its own kind, because what it says depends on the other rows'
 * quantities rather than on its own attributes -- so before anything is
 * rendered, the total's `data-spot-sum` (or `data-spot-ozt`) is recomputed from
 * the rows it covers, and then it renders like any other figure. Which means
 * the build can write the same attribute for one of each coin, and the check in
 * `tests/build-smoke.test.mjs` that re-derives every figure from its own
 * attributes still covers the total.
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

/**
 * How many coins the reader says they have, by the id of the box they typed it
 * in. A melt page has one box; the silver melt price calculator has one per row.
 */
const quantities = new Map<string, number>();

/** The box on a melt page, which carries a bare `data-spot-qty`. */
const SINGLE_QUANTITY_INPUT = 'calc-count';

/** The largest lot the calculator will multiply out. Mirrors the input's max. */
const MAX_QUANTITY = 1_000_000;

/**
 * Which box multiplies this figure, and by how much.
 *
 * No attribute means "one of these", not "none of these": a figure that is not
 * part of a calculator must not collapse when somebody types in a box.
 */
const quantityFor = (node: Element): number => {
  const named = node.getAttribute('data-spot-qty');
  if (named === null) return 1;
  return quantities.get(named === '' ? SINGLE_QUANTITY_INPUT : named) ?? 1;
};

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
    quantityFor(node),
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

/**
 * Add the rows of each lot up, and write the answer onto the total's own
 * attributes.
 *
 * A total is the one figure whose text is not a function of its own attributes:
 * it depends on what is typed in every row of its lot. Rather than give it a
 * kind of its own -- which would put a second arithmetic in this file and take
 * the total out of the reach of the check that re-derives every figure from its
 * attributes -- the rows are added up HERE and the answer is written into the
 * `sum` or `ozt` attribute the total already carries. After that a total is an
 * ordinary figure and renders like every other one.
 *
 * A row belongs to a lot through `data-spot-lot`, carries its own metal and
 * weight, and names the box that multiplies it. That is the same markup the row
 * needs to render its own figure, so a lot adds one attribute per row and one
 * element for the total.
 */
const recomputeLots = (): void => {
  for (const total of document.querySelectorAll('[data-spot-lot-total]')) {
    const lot = total.getAttribute('data-spot-lot-total');
    if (!lot) continue;

    const weights = new Map<Metal, number>();
    for (const row of document.querySelectorAll(`[data-spot-lot="${lot}"]`)) {
      const metal = row.getAttribute('data-spot-metal');
      const ozt = Number(row.getAttribute('data-spot-ozt'));
      if (!isMetal(metal) || !Number.isFinite(ozt)) continue;
      weights.set(metal, (weights.get(metal) ?? 0) + ozt * quantityFor(row));
    }
    if (weights.size === 0) continue;

    const kind = total.getAttribute('data-spot');
    if (kind === 'sum') {
      total.setAttribute(
        'data-spot-sum',
        [...weights].map(([metal, ozt]) => `${metal}=${ozt}`).join(';'),
      );
    } else if (kind === 'ozt' && weights.size === 1) {
      // A weight is a single number, so a lot spanning two metals has no
      // `ozt` total to print -- it would be troy ounces of nothing in
      // particular. The `sum` above is the total such a lot can state.
      total.setAttribute('data-spot-ozt', String([...weights.values()][0]));
    }
  }
};

/** Rewrite every marked figure on the page. Idempotent, and cheap enough to
 *  re-run on every keystroke in a quantity box. */
export const applySpot = (): void => {
  recomputeLots();

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
 * The quantity boxes: "how many do you have", once on a melt page and once per
 * row on the silver melt price calculator.
 *
 * They own no arithmetic. A box sets a number and re-runs the same pass that
 * the price update runs, which is why the figure it drives and the figure the
 * feed drives cannot round differently -- they are one line of code.
 *
 * The boxes are found through the figures rather than by selecting inputs: a
 * figure names the box that multiplies it, so anything wired here is something
 * the page actually asked to have wired, and a stray number input elsewhere on
 * a page is left alone.
 */
const wireQuantities = (): void => {
  const ids = new Set<string>();
  for (const node of document.querySelectorAll('[data-spot-qty]')) {
    const named = node.getAttribute('data-spot-qty');
    ids.add(named === '' || named === null ? SINGLE_QUANTITY_INPUT : named);
  }

  for (const id of ids) {
    const input = document.getElementById(id);
    if (!(input instanceof HTMLInputElement)) continue;

    /**
     * What the build shipped this box at, read once, before anything is typed.
     *
     * `value` the ATTRIBUTE, not the property: the attribute is what the page
     * declared and the property is what the reader has since typed. Captured
     * here rather than read inside the handler so nothing that happens in the
     * box afterwards can change what "empty" falls back to.
     */
    const shipped = Math.floor(Number(input.getAttribute('value')));

    const read = (): void => {
      // An empty box reads as whatever the page shipped that box at, not as
      // zero and not as one: a melt page ships its box at one coin, because the
      // page is about one coin and somebody clearing the field to type a new
      // number should not watch the answer collapse in between keystrokes; the
      // silver melt price calculator ships every box at none, where none is what an
      // empty box plainly means. `shipped` above is that default, so the page
      // states it once, in the markup, rather than this module carrying a second
      // copy of a decision that belongs to the page.
      const raw = input.value.trim();
      let n = raw === '' ? (Number.isFinite(shipped) ? shipped : 1) : Math.floor(Number(raw));
      if (!Number.isFinite(n) || n < 0) n = 0;
      if (n > MAX_QUANTITY) n = MAX_QUANTITY;
      quantities.set(id, n);
      applySpot();
    };

    input.addEventListener('input', read);
    // A browser that restored a previous value on back-navigation has already
    // changed the box before this runs.
    read();
  }
};

/**
 * Entry point, called by `SpotLive.astro` on every page.
 *
 * Wires the quantity boxes first and fetches second, so a calculator works on
 * a page whose endpoint is unreachable -- the two are independent, and the one
 * that needs no network should not wait on the one that does.
 *
 * It also re-runs on a back-navigation restored from the back/forward cache.
 * That page is not reloaded and its module scripts do not run again: it is
 * the DOM as it stood when the reader left, which may be an hour of browsing
 * ago and, on a melt page, still shows whatever quantity they had typed. The
 * re-run is cheap -- inside `max-age` the browser answers the fetch out of its
 * own cache without a request -- and it is the only path on the site that can
 * show a figure older than the endpoint's own half hour.
 */
export const bootSpot = async (): Promise<void> => {
  if (!document.querySelector('[data-spot]')) return;
  wireQuantities();

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
