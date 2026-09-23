/**
 * The priced-ladder pipeline: research sheets in, one generated file out.
 *
 *   data/grades/<coin>.tsv   -->  npm run grades  -->  src/data/graded-values.ts
 *
 * Run `npm run grades:sheet <coin-slug>` to scaffold a sheet with every
 * registered rung in it, fill it from the archives, then `npm run grades`.
 * Both files are committed: the sheet is the source a person edits and the
 * generated file is what the site imports, exactly as `coin-catalog.ts` is
 * meant to be generated later. A visitor's request still touches a file on a
 * CDN and nothing else.
 *
 * ---------------------------------------------------------------------------
 * WHY A SHEET AND NOT A TYPESCRIPT LITERAL
 * ---------------------------------------------------------------------------
 *
 * The slow part of a ladder is not typing it, it is reading fifteen auction
 * archives and deciding what two of them agree on. That work produces a table,
 * so the artefact it lands in is a table -- one line per rung, diffable, with
 * the sources named in its own header, and no syntax to get wrong at two in the
 * morning. It is also the shape the real import arrives in: the day there is a
 * data deal, the exporter writes these columns and nothing downstream changes.
 *
 * The division of labour is the point. JUDGEMENT lives in the sheet -- which
 * figures count, which outlier to ignore, whether a rung has enough behind it
 * to be a page at all. MECHANICS live here, and every one of them is a check
 * that a page would otherwise ship looking finished:
 *
 *   - a grade slug nobody registered
 *   - a coin slug that is not in the catalogue
 *   - a rung priced twice
 *   - a range with no floor, or a low above its high
 *   - a recorded sale outside the range printed above it
 *   - a ladder that falls as the grade rises
 *   - a sheet with no sources, or a source with no name
 *   - a population with no census behind it
 *
 * The same checks run again in `validateTaxonomy()` at build time, because a
 * generated file can be hand-edited and a hand-edited generated file is the
 * one thing nobody re-reads.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { ladderFor as gateLadder } from './merge-grade-prices.mjs';

const SHEETS = 'data/grades';
const FEED = 'data/grade-prices.json';
const OUT = 'src/data/graded-values.ts';

/* ---------------------------------------------------------------------------
   Reading a sheet
   --------------------------------------------------------------------------- */

const COLUMNS = ['grade', 'low', 'high', 'pop', 'finer', 'service', 'sales'];

/**
 * A typewriter apostrophe to the one the rest of the site sets.
 *
 * Done HERE, on the way in, rather than on the way out. Doing it in the
 * renderer meant the generated file could never equal the sheet it came from,
 * so the check that somebody had actually re-run the import could not tell a
 * stale file from a smartened one -- which is the check most worth having,
 * because the generated file is committed and can be hand-edited.
 */
const typographic = (text) => text.replace(/'/g, '\u2019');

/** `1708|July 2026|Heritage Auctions;1800|June 2024|Stack's Bowers` */
const parseSales = (cell, where, problems) =>
  (cell ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [price, when, house] = entry.split('|').map((f) => (f ?? '').trim());
      if (!price || !when || !house) {
        problems.push(`${where}: a sale must be price|month year|house, got "${entry}"`);
        return undefined;
      }
      return { price: Number(price), when, house: typographic(house) };
    })
    .filter(Boolean);

export function parseSheet(text, file, problems) {
  const sheet = { coin: '', asOf: '', sources: [], values: [] };
  let headerSeen = false;

  for (const [i, raw] of text.split('\n').entries()) {
    const line = raw.replace(/\r$/, '');
    const where = `${file}:${i + 1}`;
    if (line.trim() === '' || line.startsWith('#')) continue;

    // The three key: value lines, which must all come before the table.
    const keyed = /^(coin|asof|source):\s*(.*)$/i.exec(line);
    if (keyed) {
      const [, key, value] = keyed;
      if (headerSeen) problems.push(`${where}: "${key}" comes after the table has started`);
      if (key.toLowerCase() === 'coin') sheet.coin = value.trim();
      else if (key.toLowerCase() === 'asof') sheet.asOf = value.trim();
      else {
        const [name, url, used] = value.split('|').map((f) => f.trim());
        if (!name) problems.push(`${where}: a source needs a name`);
        sheet.sources.push({
          name: typographic(name),
          ...(url ? { url } : {}),
          ...(used ? { used: typographic(used) } : {}),
        });
      }
      continue;
    }

    const cells = line.split('\t').map((c) => c.trim());
    if (!headerSeen) {
      if (cells.join(',') !== COLUMNS.join(',')) {
        problems.push(`${where}: the table header must be exactly: ${COLUMNS.join(', ')}`);
      }
      headerSeen = true;
      continue;
    }

    const [grade, low, high, pop, finer, service, sales] = cells;
    if (!grade) continue;
    const row = { grade, low: Number(low), high: Number(high) };
    const recorded = parseSales(sales, `${where} (${grade})`, problems);
    if (recorded.length > 0) row.sales = recorded;
    if (pop) {
      row.population = { atGrade: Number(pop), finer: Number(finer), service };
    } else if (finer || service) {
      problems.push(`${where} (${grade}): a census needs a count at the grade, not only above it`);
    }
    sheet.values.push(row);
  }

  if (!sheet.coin) problems.push(`${file}: no "coin:" line`);
  if (!sheet.asOf) problems.push(`${file}: no "asof:" line -- no figure ships undated`);
  if (sheet.sources.length === 0) problems.push(`${file}: no "source:" line`);
  if (sheet.values.length === 0) problems.push(`${file}: no rows`);
  return sheet;
}

/* ---------------------------------------------------------------------------
   Checking one
   --------------------------------------------------------------------------- */

export function checkSheet(sheet, file, { grades, coins, coinGroups }, problems) {
  const at = (row) => `${file} (${row.grade})`;

  if (coins && !coins.includes(sheet.coin)) {
    problems.push(`${file}: "${sheet.coin}" is not a coin in the catalogue`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sheet.asOf)) {
    problems.push(`${file}: asof "${sheet.asOf}" is not an ISO date`);
  }

  const seen = new Set();
  for (const row of sheet.values) {
    if (!grades.some((g) => g.slug === row.grade)) {
      problems.push(`${at(row)}: no grade with that slug is registered in src/data/grades.ts`);
      continue;
    }
    if (seen.has(row.grade)) problems.push(`${at(row)}: this rung is priced twice`);
    seen.add(row.grade);

    if (!Number.isFinite(row.low) || !Number.isFinite(row.high)) {
      problems.push(`${at(row)}: low and high must both be numbers`);
      continue;
    }
    if (row.low <= 0) problems.push(`${at(row)}: a range needs a floor above zero`);
    if (row.low > row.high) problems.push(`${at(row)}: low is above high`);

    // A range has to contain its own evidence. The page prints the range as the
    // answer and the sales under it as the working; a sale outside the range is
    // the page arguing with itself in front of a reader who is right.
    for (const sale of row.sales ?? []) {
      if (!Number.isFinite(sale.price) || sale.price <= 0) {
        problems.push(`${at(row)}: a sale at "${sale.price}" is not a price`);
      } else if (sale.price < row.low || sale.price > row.high) {
        problems.push(
          `${at(row)}: the range is ${row.low}-${row.high} and a recorded sale is ${sale.price}`,
        );
      }
    }

    const pop = row.population;
    if (pop) {
      if (!pop.service) problems.push(`${at(row)}: a population needs the census that counted it`);
      if (!Number.isFinite(pop.atGrade) || !Number.isFinite(pop.finer)) {
        problems.push(`${at(row)}: a population needs a count at the grade and a count finer`);
      }
    }
  }

  const rung = (slug) => grades.find((g) => g.slug === slug);
  const order = (slug) => {
    const g = rung(slug);
    return g ? g.number * 10 + g.rank : 0;
  };

  // Colour is a second axis, so a coin that is not made of copper cannot carry
  // one: a silver quarter graded MS65RD describes a coin nobody has struck.
  for (const row of sheet.values) {
    const g = rung(row.grade);
    const group = coinGroups?.[sheet.coin];
    if (g && group && g.groups.length > 0 && !g.groups.includes(group)) {
      problems.push(
        `${at(row)}: ${g.code} is only used on ${g.groups.join(', ')} and this coin is ${group}`,
      );
    }
  }

  // The ladder has to climb. A rung worth less than the rung below it is a row
  // filed under the wrong grade or a figure typed an order of magnitude wrong,
  // and sorting the sheet would hide both -- so the order is validated, never
  // sorted, exactly as the cheat sheets' date order is.
  //
  // Per CHAIN. Colour makes the ladder three parallel ones, and they are not
  // comparable rung for rung: a cent in MS64 Red is routinely worth more than
  // the same cent in MS65 Brown, and a check that compared them would reject
  // every correct copper sheet ever written.
  const ladder = [...sheet.values].sort((a, b) => order(a.grade) - order(b.grade));
  const chains = new Set(ladder.map((r) => rung(r.grade)?.chain ?? ''));
  for (const chain of chains) {
    const rows = ladder.filter((r) => (rung(r.grade)?.chain ?? '') === chain);
    for (let i = 1; i < rows.length; i += 1) {
      if (rows[i].high < rows[i - 1].high) {
        problems.push(
          `${file}: ${rows[i].grade} tops out below ${rows[i - 1].grade}; one of the two rows is wrong`,
        );
      }
    }
  }
  return ladder;
}

/* ---------------------------------------------------------------------------
   Writing the generated file
   --------------------------------------------------------------------------- */

const HEADER = `/**
 * GENERATED FILE -- do not edit.
 *
 * Written by \`npm run grades\` from the research sheets in data/grades/. Edit a
 * sheet and re-run; anything typed here is lost on the next import and, worse,
 * is a figure that passed none of the checks the importer applies.
 *
 * It is committed, like every other generated artefact on this site, because a
 * build that fetched its own data is a build that cannot be reproduced and a
 * page whose figures depend on somebody else's uptime.
 *
 * What a ladder is and why it does not live on the \`Coin\`: see \`GradedLadder\`
 * in coin-schema.ts. What turns one into pages: \`gradedGrades()\` in coins.ts.
 */
import type { GradedLadder } from './coin-schema';

`;

const js = (value) => JSON.stringify(value);

const render = (sheets) => {
  const entries = sheets
    .map((s) => {
      const sources = s.sources
        .map((src) => `      ${js(src)},`)
        .join('\n');
      const values = s.values
        .map((v) => `      ${js(v)},`)
        .join('\n');
      return `  {
    coin: ${js(s.coin)},
    asOf: ${js(s.asOf)},${s.spans && s.spans > 1 ? `\n    spans: ${s.spans},` : ''}
    sources: [
${sources}
    ],
    values: [
${values}
    ],
  },`;
    })
    .join('\n');

  return `${HEADER}export const GRADED_LADDERS: GradedLadder[] = [
${entries}
];

/** The ladder for one coin, or undefined where nobody has researched one. */
export const ladderFor = (coinSlug: string): GradedLadder | undefined =>
  GRADED_LADDERS.find((l) => l.coin === coinSlug);
`;
};

/* ---------------------------------------------------------------------------
   Scaffolding a new sheet
   --------------------------------------------------------------------------- */

const scaffold = (slug, grades) => `# ${slug} -- priced ladder
#
# Fill low and high for every rung you have at least two figures for, and
# delete the rows you do not. A rung with nothing behind it gets no page, which
# is the gate working rather than a gap to fill in later.
#
# See data/grades/1932-d-washington-quarter.tsv for a worked example, including
# how the rungs that were left out were decided.
#
coin: ${slug}
asof: ${new Date().toISOString().slice(0, 10)}
source: NAME | URL | what it was used for
#
${COLUMNS.join('\t')}
${grades.map((g) => g.slug).join('\n')}
`;

/* ---------------------------------------------------------------------------
   Running
   --------------------------------------------------------------------------- */

async function main() {
  const { GRADES, eligibleRungs } = await import('../src/data/grades.ts');
  const { COINS } = await import('../src/data/coin-catalog.ts');
  const { seriesForCoin } = await import('../src/data/coins.ts');
  const coins = COINS.map((c) => c.slug);
  const coinGroups = Object.fromEntries(COINS.map((c) => [c.slug, c.group]));

  const argv = process.argv.slice(2);
  const report = argv.includes('--report');
  const [command, argument] = argv;

  if (command === '--new') {
    if (!argument) throw new Error('usage: npm run grades:sheet <coin-slug>');
    if (!coins.includes(argument)) {
      throw new Error(`"${argument}" is not a coin in the catalogue; add it first`);
    }
    if (!existsSync(SHEETS)) mkdirSync(SHEETS, { recursive: true });
    const path = join(SHEETS, `${argument}.tsv`);
    if (existsSync(path)) throw new Error(`${path} already exists`);
    writeFileSync(path, scaffold(argument, GRADES));
    console.log(`Wrote ${path} with ${GRADES.length} rungs. Fill it, then: npm run grades`);
    return;
  }

  /* -------------------------------------------------------------------------
     Looking at one coin without writing anything
     -------------------------------------------------------------------------

     The question this answers is the one that otherwise costs a person an hour
     of reading JSON: why does this coin have four grade pages and that one
     none. It prints every figure every source published for it, what the gates
     did with each rung and why, and the ladder that came out. It writes
     nothing, so it is safe to run against a working tree mid-edit.
  */
  if (command === '--coin') {
    if (!argument) throw new Error('usage: npm run grades -- --coin <coin-slug>');
    if (!coins.includes(argument)) throw new Error(`"${argument}" is not a coin in the catalogue`);

    const feed = existsSync(FEED) ? JSON.parse(readFileSync(FEED, 'utf8')) : { coins: {} };
    const record = feed.coins?.[argument];
    const sheetPath = join(SHEETS, `${argument}.tsv`);

    console.log(`${argument}`);
    console.log('='.repeat(78));
    if (existsSync(sheetPath)) {
      console.log(`A research sheet prices this coin: ${sheetPath}`);
      console.log('The feed is not read for it. Edit the sheet and re-run `npm run grades`.');
      return;
    }
    if (!record) {
      console.log('No source figures. Run: npm run prices -- --coin ' + argument);
      return;
    }

    const order = (slug) => {
      const g = GRADES.find((x) => x.slug === slug);
      return g ? g.number * 10 + g.rank : undefined;
    };
    const rungs = Object.entries(record.observations).sort(
      ([a], [b]) => (order(a) ?? 1e9) - (order(b) ?? 1e9),
    );
    console.log(`${rungs.length} rung(s) with a figure, over ${record.designs} design(s):`);
    for (const [rung, rows] of rungs) {
      const bySource = new Map();
      for (const row of rows) {
        const list = bySource.get(row.source) ?? [];
        list.push(row.price);
        bySource.set(row.source, list);
      }
      const summary = [...bySource]
        .map(([id, prices]) => `${id} ${Math.min(...prices)}-${Math.max(...prices)}`)
        .join(', ');
      console.log(`  ${rung.padEnd(6)} ${summary}`);
    }

    const built = gateLadder(
      argument,
      record.observations,
      { order, chain: (slug) => GRADES.find((x) => x.slug === slug)?.chain ?? '' },
    );
    console.log('-'.repeat(78));
    if (built.values.length === 0) console.log('No grade pages. Every rung was refused:');
    else {
      console.log(`${built.values.length} grade page(s):`);
      for (const v of built.values) console.log(`  ${v.grade.padEnd(6)} $${v.low} - $${v.high}`);
      if (built.refusals.length > 0) console.log('Refused:');
    }
    for (const r of built.refusals) console.log(`  ${r.replace(`${argument} `, '')}`);
    return;
  }

  const files = existsSync(SHEETS)
    ? readdirSync(SHEETS).filter((f) => f.endsWith('.tsv')).sort()
    : [];

  const problems = [];
  const sheets = [];
  for (const file of files) {
    const name = basename(file);
    const sheet = parseSheet(readFileSync(join(SHEETS, file), 'utf8'), name, problems);
    const ladder = checkSheet(sheet, name, { grades: GRADES, coins, coinGroups }, problems);
    sheets.push({ ...sheet, values: ladder });
  }

  const claimed = new Map();
  for (const s of sheets) {
    if (claimed.has(s.coin)) problems.push(`two sheets price "${s.coin}"`);
    claimed.set(s.coin, true);
  }

  /* -------------------------------------------------------------------------
     The feed, for every coin nobody has written a sheet for
     ------------------------------------------------------------------------- */

  /*
   * A SHEET ALWAYS WINS. It is a person who read the auction archives and wrote
   * down which figures counted and which outlier they threw away; the feed is
   * two retail guides averaged into a range. Where both exist the sheet is the
   * answer and the feed is not consulted, and `grades --report` says so, so that
   * a sheet quietly shadowing a much better feed cannot go unnoticed.
   */
  const ladderOrder = (slug) => {
    const g = GRADES.find((x) => x.slug === slug);
    return g ? g.number * 10 + g.rank : undefined;
  };
  const ladderChain = (slug) => GRADES.find((x) => x.slug === slug)?.chain ?? '';

  const refusals = [];
  const generated = [];
  const feed = existsSync(FEED) ? JSON.parse(readFileSync(FEED, 'utf8')) : undefined;

  if (feed) {
    for (const [slug, record] of Object.entries(feed.coins)) {
      if (claimed.has(slug)) {
        refusals.push(`${slug}: a research sheet prices this coin, so the feed was not read`);
        continue;
      }
      if (!coins.includes(slug)) {
        problems.push(`${FEED}: "${slug}" is not a coin in the catalogue`);
        continue;
      }
      const built = gateLadder(slug, record.observations, {
        order: ladderOrder,
        chain: ladderChain,
      });
      refusals.push(...built.refusals);
      if (built.values.length === 0) continue;

      const sheet = {
        coin: slug,
        asOf: feed.fetchedAt,
        // Only the sources that really contributed a surviving figure. Naming a
        // source on a page it supplied nothing to is a citation that does not
        // check out, which is worse than a shorter list.
        sources: feed.sources
          .filter((src) => built.sources.includes(src.id))
          .map((src) => ({ name: src.name, url: src.home, used: src.used })),
        values: built.values,
        // From 1999 a mint strikes five or six reverses a year and this
        // catalogue has one page for all of them, so the range spans the
        // designs. The page has to say so -- the same obligation `mintageNote`
        // carries one section over, for the same reason.
        ...(record.designs > 1 ? { spans: record.designs } : {}),
      };
      const ordered = checkSheet(sheet, FEED, { grades: GRADES, coins, coinGroups }, problems);
      generated.push({ ...sheet, values: ordered });
    }
  }

  if (problems.length > 0) {
    console.error(`The research sheets are invalid:\n  - ${problems.join('\n  - ')}`);
    process.exit(1);
  }

  /* -------------------------------------------------------------------------
     Every eligible rung of every coin, priced or not
     -------------------------------------------------------------------------

     The owner's decision of 2026-09-22. Until then a rung existed only where a
     figure survived the gates, and a coin with no figures had no grade pages at
     all; now the ladder is the full set of rungs the coin can legitimately be
     graded on, and the ones with nothing behind them carry no `low` and no
     `high` and render as TBD.

     The reasoning is that the price is not the only thing on a grade page. What
     the grade looks like ON THIS COIN, where it sits against the rungs either
     side, every spelling of it a reader might type, the metal floor underneath
     and how to check the market yourself are all true and useful without a
     figure -- and a reader who has just been told their coin grades VF30 is
     better served by that page than by a 404.

     What it costs is stated plainly so nobody has to rediscover it: this is
     five thousand pages of which most say TBD where the answer goes, and that
     is the shape the scaled-content policy describes. The judgement that the
     rest of the page carries it is the owner's, made knowingly, and the fix if
     it proves wrong is this function -- not the copy, which is honest either
     way.
  */
  const byCoin = new Map([...sheets, ...generated].map((s) => [s.coin, s]));
  const all = [];

  for (const coin of COINS) {
    // The gate that remains: a series with no `wear` cannot say what any grade
    // LOOKS like on its coins, and a grade page whose definition block is a
    // generic paragraph about the Sheldon scale is the thin page this whole
    // section is supposed not to be. That one is about the page's content
    // rather than about its price, so TBD does not rescue it.
    if (!seriesForCoin(coin)?.series?.wear) continue;

    const measured = byCoin.get(coin.slug);
    const rows = new Map((measured?.values ?? []).map((v) => [v.grade, v]));
    const rungs = eligibleRungs(coin);
    const values = rungs.map((rung) => rows.get(rung.slug) ?? { grade: rung.slug });

    /*
     * A figure the guides publish for a colour-free mint state rung on a coin
     * that is always slabbed with a colour. Both free guides print one MS65
     * for a wheat penny, and this site has three -- MS65BN, MS65RB and MS65RD
     * -- which are not one market: the red coin is worth a multiple of the
     * brown one, so spreading one figure across the three chains would be the
     * catalogue stating a price on two pages where the sources gave it none.
     * The figure is dropped, and it is REPORTED rather than silently lost,
     * because the day a source starts stating colour this is the line that
     * will still be printing.
     */
    const colourOnly = rungs.some((r) => r.designation);
    const undesignated = (slug) => {
      const rung = GRADES.find((g) => g.slug === slug);
      return colourOnly && rung?.tier === 'mint-state' && !rung.designation;
    };

    // A rung the sources priced that this coin cannot legitimately be graded
    // on: a proof with a Sheldon figure against it, or a circulation strike
    // with a PR one. It means a source page was matched to the wrong issue, so
    // it is loud rather than quietly dropped.
    for (const slug of rows.keys()) {
      if (values.some((v) => v.grade === slug)) continue;
      if (undesignated(slug)) {
        refusals.push(`${coin.slug} ${slug}: the sources state no colour, and this coin is graded with one`);
        continue;
      }
      problems.push(`${coin.slug}: priced at ${slug}, which this coin cannot be graded on`);
    }

    all.push({
      coin: coin.slug,
      asOf: measured?.asOf ?? feed?.fetchedAt ?? new Date().toISOString().slice(0, 10),
      // A ladder with no figure on it cites nothing, because it read nothing.
      // Naming a source on a page it supplied no number to is a citation that
      // does not check out.
      sources: values.some((v) => v.low !== undefined) ? (measured?.sources ?? []) : [],
      ...(measured?.spans ? { spans: measured.spans } : {}),
      values,
    });
  }

  if (problems.length > 0) {
    console.error(`The research sheets are invalid:\n  - ${problems.join('\n  - ')}`);
    process.exit(1);
  }

  all.sort((a, b) => a.coin.localeCompare(b.coin));
  writeFileSync(OUT, render(all));

  const rungs = all.reduce((n, s) => n + s.values.length, 0);
  const priced = all.reduce((n, s) => n + s.values.filter((v) => v.low !== undefined).length, 0);
  console.log(
    `Wrote ${OUT}: ${all.length} ladder(s) (${sheets.length} researched, ${generated.length} with figures from the feed).`,
  );
  console.log(`${rungs} rungs, ${priced} priced, ${rungs - priced} TBD.`);

  if (report) {
    console.log('-'.repeat(78));
    console.log(`${refusals.length} rung(s) and coin(s) refused:`);
    for (const r of refusals) console.log(`  ${r}`);
  } else if (refusals.length > 0) {
    console.log(`${refusals.length} rung(s) refused by the gates. See them with: npm run grades -- --report`);
  }
}

/*
 * Only when run, never when imported.
 *
 * `tests/grades.test.mjs` imports `parseSheet` and `checkSheet` from here, and
 * an unguarded call meant that running the tests REWROTE the generated file --
 * so the one check worth having, that somebody re-ran the import after editing
 * a sheet, was quietly satisfied by the act of checking it.
 */
const invoked = process.argv[1]?.endsWith('import-grades.mjs');

if (invoked) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
