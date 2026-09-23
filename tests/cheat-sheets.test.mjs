/**
 * The cheat sheets, against the mintage pipeline that can settle them.
 *
 * WHAT `checked` MEANS, AND WHY IT NEEDED A TEST. A sheet carries two flags:
 * `written` says it has content, `checked` says a person has traced every
 * mintage on it to one of the sheet's own sources. Only `checked` sheets are
 * indexable -- an unwritten sheet has nothing on it, but an UNCHECKED one has
 * figures nobody traced, which is worse because the page looks finished.
 *
 * Until 2026-09-23 `checked` was a boolean somebody set by hand after reading
 * a table, and nothing held it to anything afterwards. That is the same shape
 * as a generated ladder nobody re-imported: true on the day it was typed and
 * silently false from the first time a figure moved.
 *
 * Five of the ten series have been through this site's own mintage pipeline,
 * which settles each figure by a vote of four cross-checked published sources
 * and writes `data/mintages.json`. For those five, "traced to a source" is a
 * comparison a machine can re-run, so it is re-run here on every build. The
 * cross-check found two real errors the first time it was run:
 *
 *   - THE 1880-CC MORGAN WAS PUBLISHED AT 495,000. The figure is 591,000, on
 *     the pipeline's two sources and on every reference consulted afterwards.
 *     It is a semi-key on a sheet that ranks by scarcity, so the wrong number
 *     was also very nearly the wrong ROW.
 *   - The sheets named a source reading "Every mintage above was cross-checked
 *     against a second published table and every difference resolved", on
 *     eight sheets where `checked` was false. That is a verification claim
 *     printed under figures nobody had verified.
 *
 * WHAT THIS DOES NOT COVER. Five series -- the buffalo nickel, the Indian Head
 * penny, the Jefferson nickel, the Kennedy half dollar and the Roosevelt dime
 * -- have no pipeline data, because the mintage pipeline has not been run for
 * them. The owner reviewed those five sheets and set them `checked` by hand on
 * 2026-09-23, so they are named in `OWNER_CHECKED` below and exempt from the
 * coverage test. That list is closed: any OTHER sheet flipped true without
 * pipeline data still fails, and a series that later gets pipeline data
 * should come off the list so its rows are compared like the rest.
 *
 * Run: node --experimental-strip-types --no-warnings --import ./tests/ts-resolve.mjs tests/cheat-sheets.test.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { CHEAT_SHEETS, cheatSheetPath, cheatSheetIndexable } from '../src/data/cheat-sheets.ts';

const SERIES = JSON.parse(readFileSync('data/mintages.json', 'utf8')).series;

/** The series this site can settle mechanically: those the pipeline has run for. */
const covered = (slug) => Object.prototype.hasOwnProperty.call(SERIES, slug);

/**
 * "1893-S" -> { year: 1893, mark: 'S' }; "1909 VDB" -> { year: 1909, mark: '' }.
 *
 * The negative lookahead is load-bearing and was a bug here first: without it
 * `[- ]([A-Z]{1,2})` reads "1909 VDB" as a coin from a mint called "VD", and
 * the row then looks absent from a pipeline that carries it. A mint mark is
 * attached to the year by a hyphen on every sheet; anything after a space is a
 * hub or a type, which is matched separately.
 */
function parseLabel(label) {
  const m = /^(\d{4})(?:-([A-Z]{1,2}))?(?![A-Za-z])/.exec(label);
  if (!m) return null;
  return { year: Number(m[1]), mark: m[2] ?? '', extra: label.slice(m[0].length).trim().toLowerCase() };
}

/** Every issue the pipeline records for a (year, mark), narrowed to what the label names. */
function candidates(slug, parsed) {
  const all = SERIES[slug].issues.filter((i) => i.year === parsed.year && i.mark === parsed.mark);
  // A label naming VDB or a type wants the hub issue; a bare label wants the
  // plain one. 1909-S and 1909-S VDB are two coins and two figures.
  const wantsHub = /vdb|type\s*\d/.test(parsed.extra);
  const byHub = all.filter((i) => (wantsHub ? i.hub : !i.hub));
  // Prefer the circulation strike. The fallback is not cosmetic: the 1895
  // Philadelphia Morgan exists only as a proof, which is why it is on the
  // sheet at 880 and why a circulation-only match would call it absent.
  const circulation = byHub.filter((i) => i.finish === 'circulation');
  return circulation.length > 0 ? circulation : byHub;
}

test('every date on a checkable sheet matches the mintage pipeline', () => {
  const problems = [];
  for (const sheet of CHEAT_SHEETS) {
    if (!covered(sheet.slug)) continue;
    for (const date of sheet.dates) {
      const parsed = parseLabel(date.label);
      if (!parsed) {
        problems.push(`${cheatSheetPath(sheet)}: "${date.label}" is not a date this check can read`);
        continue;
      }
      const found = candidates(sheet.slug, parsed);
      if (found.length === 0) {
        problems.push(
          `${cheatSheetPath(sheet)}: "${date.label}" (${date.mintage.toLocaleString()}) is not an issue the pipeline records`,
        );
        continue;
      }
      /*
       * EITHER the total or the per-design figure. From 1999 a mint strikes
       * several reverses a year and the pipeline records both the sum and the
       * figure per design; the sheet states the per-design one, deliberately,
       * because 2,000,000 is why anybody is looking at a 2019-W and 10,000,000
       * is an accounting fact about West Point.
       */
      const ok = found.some((i) => i.mintage === date.mintage || i.perDesign === date.mintage);
      if (!ok) {
        problems.push(
          `${cheatSheetPath(sheet)}: "${date.label}" says ${date.mintage.toLocaleString()}, the pipeline says ` +
            found.map((i) => `${i.mintage.toLocaleString()}${i.perDesign ? ` (${i.perDesign.toLocaleString()} per design)` : ''}`).join(' or '),
        );
      }
    }
  }
  assert.deepEqual(problems, [], `\n  - ${problems.join('\n  - ')}\n`);
});

test('a sheet is ranked scarcest first, and the order is validated rather than sorted', () => {
  // The registry validates this too. It is repeated here because this file is
  // the one that changes a mintage, and a corrected figure that lands in the
  // wrong row is the failure mode of correcting one.
  for (const sheet of CHEAT_SHEETS) {
    for (let i = 1; i < sheet.dates.length; i += 1) {
      assert.ok(
        sheet.dates[i].mintage >= sheet.dates[i - 1].mintage,
        `${cheatSheetPath(sheet)}: ${sheet.dates[i].label} (${sheet.dates[i].mintage.toLocaleString()}) is listed after ` +
          `${sheet.dates[i - 1].label} (${sheet.dates[i - 1].mintage.toLocaleString()})`,
      );
    }
  }
});

test('no sheet claims a verification it has not had', () => {
  /*
   * A `sources` entry that asserts the figures were cross-checked is a claim
   * about this sheet, not a reference. Eight sheets carried one while
   * `checked` was false. A reference names a place to look; a claim of work
   * done has to be true of the sheet printing it.
   */
  const CLAIMS = /cross-check|verified|every difference resolved|traced/i;
  for (const sheet of CHEAT_SHEETS) {
    for (const source of sheet.sources ?? []) {
      if (!CLAIMS.test(source)) continue;
      assert.ok(
        sheet.checked,
        `${cheatSheetPath(sheet)} is not checked but names a source claiming verification: "${source}"`,
      );
    }
  }
});

/*
 * Sheets the owner reviewed and set `checked` by hand on 2026-09-23, for series
 * the mintage pipeline has not been run on. A named, closed list rather than a
 * relaxed rule, so the check still bites on every sheet not in it.
 */
const OWNER_CHECKED = new Set([
  'buffalo-nickel',
  'indian-head-penny',
  'jefferson-nickel',
  'kennedy-half-dollar',
  'roosevelt-dime',
]);

test('a sheet is only checked, and only indexable, where the figures can be checked', () => {
  /*
   * The flag that gates indexing may not be set by hand on a series this site
   * has no data for. If one of the five uncovered series should be indexed,
   * the way to do it is to run the mintage pipeline for it -- which is about
   * ten lines of registry, per ADDING-A-SERIES.md -- not to set the boolean.
   */
  for (const sheet of CHEAT_SHEETS) {
    if (OWNER_CHECKED.has(sheet.slug)) {
      assert.ok(
        !covered(sheet.slug),
        `${sheet.slug} now has pipeline data: take it off OWNER_CHECKED so its rows are compared`,
      );
      continue;
    }
    if (sheet.checked) {
      assert.ok(
        covered(sheet.slug),
        `${cheatSheetPath(sheet)} is marked checked, but the mintage pipeline has no data for it. ` +
          'Run `npm run mintages` for this series before setting the flag.',
      );
    }
    if (cheatSheetIndexable(sheet)) {
      assert.ok(covered(sheet.slug), `${cheatSheetPath(sheet)} is indexable with no checkable mintage data`);
    }
  }
});
