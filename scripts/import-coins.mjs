/**
 * The catalogue pipeline, with nothing typed by hand in the middle of it.
 *
 *   npm run mintages  ->  data/mintages.json          fetched, committed
 *   npm run coins     ->  src/data/coin-generated.ts  offline, deterministic
 *
 * This script reads two things and invents neither:
 *
 *   data/mintages.json   the numbers, parsed from the source by
 *                        `fetch-mintages.mjs`: year, mint mark, which mints
 *                        struck it, how many.
 *   coin-taxonomy.ts     the editorial facts. Which denomination, which
 *                        country, what each era was struck in, what it weighs,
 *                        where the mint mark sits, which mint struck proofs
 *                        only. That registry is hand-maintained and always
 *                        was: no feed knows where a mint mark sits, and the
 *                        house rules already name it the editorial home.
 *
 * It used to read a TSV per series holding both, which was a spreadsheet with
 * extra steps and which shipped a real error -- nineteen pages calling a
 * P-marked quarter "(No Mint Mark)". The sheets are gone. What a person still
 * types is the series registry, a dozen lines per series, which is the part a
 * person is actually for.
 *
 * WHAT IT REFUSES. An era with no `specs` generates nothing and says so,
 * rather than inventing a weight. A series with no `denomination` or `country`
 * generates nothing. A slug already written out in `coin-seed.ts` is skipped,
 * so the seed always wins and promoting a generated coin to a written one
 * stays a one-line move.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const MINTAGES = 'data/mintages.json';
const OUT = 'src/data/coin-generated.ts';

/**
 * How easy a coin is to find, from the one number that decides it.
 *
 * A formula rather than a judgement per issue, so eighty pages cannot disagree
 * about what "scarce" means. It drives the verdict line and the badge. The
 * thresholds are about survival rather than production: under four million
 * struck is a coin a collector has to look for, and over twelve million is one
 * anybody can buy this afternoon.
 *
 * A date the formula gets wrong is a date to write out in `coin-seed.ts`,
 * where the field is typed and this function never runs. The key dates are the
 * exception it does take from the registry, because "which dates are scarce"
 * is settled editorial knowledge that no mintage threshold reproduces.
 */
export const commonalityOf = (mintage, keyDates, label) => {
  if (keyDates.includes(label)) return 'key-date';
  if (mintage < 4_000_000) return 'scarce';
  if (mintage < 12_000_000) return 'common';
  return 'very-common';
};

/**
 * Which figure the survival thresholds are applied to.
 *
 * The per-design figure where there is one, never the sum. The 2019-W issue is
 * the case that decides it: West Point struck two million of each of five
 * reverse designs and released them into circulation, so a reader hunting one
 * in change is looking for one of two million -- but the sum is ten million,
 * which is over the twelve-million... no, under it, and comes out "common"
 * where the per-design figure comes out "scarce". Scarce is the true answer
 * about the object in somebody's hand, and the coin the whole 2019-W page
 * exists for is the one people are searching change for.
 */
const scarcityFigure = (issue) => issue.perDesign ?? issue.mintage ?? 0;

const inRange = (year, years) =>
  year >= years.from && (years.to === undefined || year <= years.to);

const HEADER = `/**
 * GENERATED FILE -- do not edit.
 *
 * Written by \`npm run coins\` from data/mintages.json (fetched by
 * \`npm run mintages\`) and the series facts in coin-taxonomy.ts. Nothing here
 * was typed, and anything typed here is lost on the next import.
 *
 * Every coin below is an issue whose page is its facts -- a date, a mint, a
 * mintage and a metal weight. An issue with something of its own to say is
 * written out by hand in \`coin-seed.ts\` instead, and this file never contains
 * one: the importer skips any slug the seed already defines. \`coin-catalog.ts\`
 * is the two merged in date order, and it is the only one anything imports.
 *
 * The sentences come from \`src/lib/coin-copy.ts\`, which carries the argument
 * for why a coin page may be generated at all.
 */
import type { Coin } from './coin-schema';

`;

const render = (coins) =>
  `${HEADER}export const GENERATED_COINS: Coin[] = [\n${coins
    .map((c) => `  ${JSON.stringify(c, null, 2).split('\n').join('\n  ')},`)
    .join('\n')}\n];\n`;

async function main() {
  const { issueToCoin, issueSlug } = await import('../src/lib/coin-copy.ts');
  const { SEEDED_COINS } = await import('../src/data/coin-seed.ts');
  const { TAGS } = await import('../src/data/coin-taxonomy.ts');
  const { titleCase } = await import('../src/lib/meta.ts');

  if (!existsSync(MINTAGES)) {
    throw new Error(`${MINTAGES} is missing. Run \`npm run mintages\` first.`);
  }
  const data = JSON.parse(readFileSync(MINTAGES, 'utf8'));
  const written = new Set(SEEDED_COINS.map((c) => c.slug));

  const problems = [];
  const notes = [];
  const coins = [];

  for (const [slug, fetched] of Object.entries(data.series)) {
    const tag = TAGS.find((t) => t.slug === slug);
    const series = tag?.series;
    if (!series) {
      problems.push(`"${slug}" has mintages but no series in the taxonomy`);
      continue;
    }
    if (!series.denomination || !series.country) {
      problems.push(`series "${slug}" needs a denomination and a country before it generates coins`);
      continue;
    }

    // Every issue of the series, so a checklist can say which mints did NOT
    // strike a given date. Read from the fetched data, never assumed.
    /*
     * The hubs, by slug, so an issue can be joined to its editorial entry.
     *
     * The mintage file carries a slug and nothing else -- no feed knows what a
     * reader should look at to tell two reverses apart, which is the same
     * reason `markPositions` lives in this registry rather than in the data.
     * A slug with no entry here is a refusal rather than a coin with a token
     * in its URL and nothing on the page explaining it.
     */
    const hubs = new Map((series.hubs ?? []).map((h) => [h.slug, h]));

    const all = fetched.issues.map((i) => ({
      year: i.year,
      mark: i.mark,
      finish: i.finish,
      ...(i.hub ? { hub: hubs.get(i.hub) } : {}),
      struckAt: i.struckAt,
      ...(i.mintage ? { mintage: i.mintage } : {}),
      designs: i.designs,
      ...(i.perDesign !== undefined ? { perDesign: i.perDesign } : {}),
      commonality: commonalityOf(scarcityFigure(i), [], ''),
    }));
    const keyDates = (series.keyDates ?? []).map((k) => k.label);
    // Every (year, mark, finish) the sources showed, including the ones whose
    // figure was withheld. The checklist asks this rather than the catalogue,
    // so a withheld coin cannot make its neighbours deny it exists.
    const attested = fetched.attested ?? [];

    for (const raw of fetched.issues) {
      /*
       * The composition era, chosen PER ISSUE by its group and its year.
       *
       * It used to be chosen per fetched TABLE, which worked while a table was
       * an era. It is not one any more: the figures now come from four pages,
       * a single 2019 table holds a clad circulation strike and a .999 silver
       * proof, and the clad run is split three ways for its reverse designs.
       *
       * `compositions` is searched first and `finishCompositions` second, so a
       * clad proof takes the ordinary clad era of its year and only the silver
       * proofs -- which sit outside the run's timeline, because 1999 is both
       * clad and silver -- need an entry of their own.
       */
      const composition =
        series.compositions.find((c) => c.group === raw.group && inRange(raw.year, c.years)) ??
        (series.finishCompositions ?? []).find(
          (c) => c.group === raw.group && inRange(raw.year, c.years),
        );
      if (!composition) {
        problems.push(
          `series "${slug}": nothing in the taxonomy says what a ${raw.year} ${raw.group} ${raw.finish} ${series.denomination} is made of`,
        );
        continue;
      }
      if (!composition.specs) {
        notes.push(
          `skipped ${raw.year}-${raw.mark || 'P'} ${raw.finish} -- its era has no specs, so nothing could state a weight`,
        );
        continue;
      }

      /*
       * The key-date verdict, worked out before the copy context because the
       * TAG is derived from it.
       *
       * Which dates are scarce is settled editorial knowledge and it is typed
       * in one place -- `keyDates` on the series -- so the tag is read off the
       * same verdict the page prints rather than typed a second time beside
       * it. A hand-written coin in `coin-seed.ts` carries its own tags, which
       * is where a judgement this formula cannot reach belongs.
       *
       * A coin with a `finish` is excluded, because its page states no
       * scarcity verdict at all: every proof was bought by somebody who wanted
       * it and kept it, so the verdict is suppressed there, and an archive
       * listing a coin under a verdict its own page refuses is the site
       * disagreeing with itself in front of the reader. The 1894 proof Morgan
       * is the case -- the circulation strike of that date keeps the tag.
       */
      const label = raw.mark ? `${raw.year}-${raw.mark}` : String(raw.year);
      const commonality = commonalityOf(scarcityFigure(raw), keyDates, label);
      const keyDateTag = commonality === 'key-date' && raw.finish === 'circulation' ? ['key-date'] : [];

      const ctx = {
        series: slug,
        seriesName: titleCase(tag.name),
        seriesNoun: tag.name,
        group: composition.group,
        type: series.denomination,
        denomination: titleCase(series.denomination),
        tags: [slug, ...(series.tags ?? []), ...(composition.tags ?? []), ...keyDateTag],
        country: series.country,
        composition: composition.composition,
        weightGrams: composition.specs.weightGrams,
        diameterMm: composition.specs.diameterMm,
        ...(composition.specs.silverOzt ? { silverOzt: composition.specs.silverOzt } : {}),
        ...(composition.specs.goldOzt ? { goldOzt: composition.specs.goldOzt } : {}),
        faceValue: composition.specs.faceValue,
        obverse: composition.obverse,
        reverse: composition.reverse,
        /*
         * Both lists, with the finish-only eras flagged.
         *
         * The comparison sentences need the flag. "A quarter dated 1992-2018 has
         * a uniform silver-grey edge" is what comes out of comparing a 1999 clad
         * proof against the silver PROOF era, and it tells a reader that every
         * quarter of those years is silver -- when what is silver is the one
         * coin a year that was sold in a set. A comparison has to name a coin
         * the reader could actually be holding by its date alone.
         */
        eras: [
          ...series.compositions,
          ...(series.finishCompositions ?? []).map((e) => ({ ...e, finishOnly: true })),
        ],
        hubs: (series.hubs ?? []).map((h) => h.slug),
        mints: series.mints ?? [],
        markPositions: series.markPositions ?? [],
        proofOnly: series.proofOnly,
        mintSetsFrom: series.mintSetsFrom,
      };

      if (raw.hub && !hubs.has(raw.hub)) {
        problems.push(
          `series "${slug}": ${raw.year}-${raw.mark || 'P'} states the reverse hub "${raw.hub}", which nothing in the taxonomy describes. A hub needs a name and a way for a reader to tell it apart, and neither can be derived.`,
        );
        continue;
      }
      const issue = {
        year: raw.year,
        mark: raw.mark,
        finish: raw.finish,
        ...(raw.hub ? { hub: hubs.get(raw.hub) } : {}),
        ...(raw.mintage ? { mintage: raw.mintage } : {}),
        designs: raw.designs,
        ...(raw.perDesign !== undefined ? { perDesign: raw.perDesign } : {}),
        ...(raw.sources !== undefined ? { sources: raw.sources } : {}),
        ...(raw.disputed ? { disputed: raw.disputed } : {}),
        ...(raw.coverage ? { coverage: raw.coverage } : {}),
        struckAt: raw.struckAt,
        commonality,
      };
      const coinSlug = issueSlug(issue, ctx);
      if (written.has(coinSlug)) continue;
      if (coins.some((c) => c.slug === coinSlug)) {
        problems.push(`two issues generate "${coinSlug}"`);
        continue;
      }
      coins.push(issueToCoin(issue, ctx, all, attested));
    }
  }

  if (problems.length > 0) {
    console.error(`The catalogue could not be generated:\n  - ${problems.join('\n  - ')}`);
    process.exit(1);
  }

  coins.sort((a, b) => a.years.from - b.years.from || a.slug.localeCompare(b.slug));
  writeFileSync(OUT, render(coins));
  for (const note of notes) console.log(`  ${note}`);
  console.log(`Wrote ${OUT}: ${coins.length} generated, ${written.size} left to the hand-written seed.`);
}

if (process.argv[1] && process.argv[1].endsWith('import-coins.mjs')) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
