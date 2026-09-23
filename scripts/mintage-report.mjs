/**
 * What is still undecided, and nothing else.
 *
 *   npm run report
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS FOR
 * ---------------------------------------------------------------------------
 *
 * The import prints everything it did. That is the right output for the person
 * running it and the wrong output to hand to somebody else: two hundred lines
 * of confirmations to find eleven decisions in.
 *
 * This prints the decisions. One block per coin that has no page, with every
 * figure each source states and a ready-made `ADJUDICATED` entry underneath it,
 * so settling one is a copy, a paste and the name of whatever source settled it.
 * Everything already agreed is summarised in a line.
 *
 * It reads the committed files and touches no network, so it costs nothing and
 * can be run as often as it is useful.
 */
import { readFileSync, existsSync } from 'node:fs';

const MINTAGES = 'data/mintages.json';
const CONSENSUS = 'data/mintage-consensus.json';

const n = (value) => value.toLocaleString('en-US');
const pad = (text, width) => String(text).padEnd(width);

/** 'silverrecyclers.com' -> 'silverrecyclers'. The report is read, not parsed. */
const shortSource = (name) => name.replace(/\.(com|org|net)$/, '');

const main = () => {
  if (!existsSync(MINTAGES)) throw new Error(`${MINTAGES} is missing. Run \`npm run mintages\`.`);
  const data = JSON.parse(readFileSync(MINTAGES, 'utf8'));
  const consensus = existsSync(CONSENSUS) ? JSON.parse(readFileSync(CONSENSUS, 'utf8')) : { series: {} };

  for (const [slug, series] of Object.entries(data.series)) {
    const a = series.sources?.agreement ?? {};
    const decided =
      (a.unanimous ?? 0) + (a.majority ?? 0) + (a.revised ?? 0) + (a.single ?? 0) + (a.adjudicated ?? 0);

    console.log(`\n${'='.repeat(78)}`);
    console.log(`${slug}: ${series.issues.length} coins published, ${(series.withheld ?? []).length} withheld`);
    console.log(`${'='.repeat(78)}`);
    console.log(
      `sources: ${(series.sources?.names ?? []).join(', ')}\n` +
        `figures: ${decided} settled ` +
        `(${a.unanimous ?? 0} unanimous, ${a.majority ?? 0} majority, ${a.revised ?? 0} revised, ` +
        `${a.single ?? 0} single-source, ${a.adjudicated ?? 0} by hand), ${a.tied ?? 0} evenly split`,
    );

    /* ---------------------------------------------------------------------
       The decisions
       --------------------------------------------------------------------- */

    const withheld = series.withheld ?? [];
    if (withheld.length === 0) {
      console.log('\nNothing outstanding. Every coin the sources attest has a page.');
    } else {
      console.log(`\n${'-'.repeat(78)}\nDECISIONS OUTSTANDING (${withheld.length})\n${'-'.repeat(78)}`);
      for (const held of withheld) {
        console.log(`\n### ${held.coin}`);
        if (!held.designs) {
          console.log(`    ${held.why}`);
          continue;
        }
        for (const design of held.designs) {
          console.log(`    ${design.design}`);
          for (const option of design.split ?? []) {
            console.log(
              `      ${pad(n(option.mintage), 16)} ${option.sources.map(shortSource).join(', ')}`,
            );
          }
          /*
           * The entry to paste, with the source left blank. A decision with
           * nothing behind it is a preference, and the importer refuses one that
           * states no third source -- so the blank is the prompt, not an
           * oversight.
           */
          const year = Number(held.coin.slice(0, 4));
          const finish = held.coin.split(' ')[1];
          const mark = held.coin.slice(5).split(' ')[0];
          console.log(
            `      -> paste into ADJUDICATED in scripts/fetch-mintages.mjs:\n` +
              `         { year: ${year}, design: '${design.design.replace(/'/g, "\\'")}', mark: '${mark}', finish: '${finish}', take: 'primary' | 'second', checked: '<what settled it>' },`,
          );
        }
      }
    }

    /* ---------------------------------------------------------------------
       What nothing but one source has seen
       --------------------------------------------------------------------- */

    const single = series.issues.filter((issue) => issue.sources === 1);
    if (single.length > 0) {
      console.log(
        `\n${'-'.repeat(78)}\nPUBLISHED ON ONE SOURCE (${single.length}) — not wrong, just unchecked\n${'-'.repeat(78)}`,
      );
      const byDecade = new Map();
      for (const issue of single) {
        const decade = `${Math.floor(issue.year / 10) * 10}s`;
        byDecade.set(decade, [...(byDecade.get(decade) ?? []), `${issue.year}-${issue.mark || 'P'} ${issue.finish}`]);
      }
      for (const [decade, list] of [...byDecade].sort()) {
        console.log(`  ${pad(decade, 7)} ${list.length}: ${list.slice(0, 8).join(', ')}${list.length > 8 ? ' ...' : ''}`);
      }
    }

    /* ---------------------------------------------------------------------
       Where a further source has no page at all
       --------------------------------------------------------------------- */

    const notFound = consensus.series?.[slug]?.notFound ?? [];
    if (notFound.length > 0) {
      console.log(
        `\n${'-'.repeat(78)}\nNO THIRD-SOURCE PAGE (${notFound.length}) — these can only ever be two-source\n${'-'.repeat(78)}`,
      );
      console.log(`  ${notFound.join(', ')}`);
    }

    for (const list of ['malformed', 'unpublished']) {
      const rows = series[list] ?? [];
      if (rows.length === 0) continue;
      console.log(`\n${list.toUpperCase()} IN THE SOURCE (${rows.length})`);
      for (const row of rows) console.log(`  ${row}`);
    }

    const scope = series.outOfScope ?? [];
    if (scope.length > 0) {
      console.log('\nOUT OF SCOPE BY DECISION');
      for (const row of scope) console.log(`  ${row.why}`);
    }
  }

  console.log('');
};

if (process.argv[1] && process.argv[1].endsWith('mintage-report.mjs')) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
