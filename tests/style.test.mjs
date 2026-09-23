/**
 * House style, enforced on the catalogue copy.
 *
 * STYLE.md says the site is written in British English, short and factual. A
 * style guide nobody checks is a style guide that lasts one session, and the
 * failure mode is specific: the catalogue is the part of the site that will be
 * written in bulk, by different people and eventually by a generator, and
 * mixed spellings across ten thousand pages is not something anyone will go
 * back and fix by hand.
 *
 * What this does NOT do is spell-check English. It checks a short list of
 * words where the two dialects differ and the American form is the one a
 * writer reaches for by habit. Adding to the list is cheap; making it clever
 * is not worth it.
 *
 * No exemptions. An earlier draft carved out two -- keyword fields, on the
 * grounds that they hold what people type, and numismatic terms of art, on the
 * grounds that a grading label reads "Off Center". Both are gone: the site is
 * written in British English everywhere, and a keyword that only works in
 * American spelling is a keyword to rephrase rather than a hole to put in the
 * rule. `silver colored penny` became `1943 silver penny`, which is a bigger
 * query anyway.
 *
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { COINS, TAGS, GROUPS, TYPES } from '../src/data/coins.ts';
import {
  QUESTIONS,
  QUESTION_CATEGORIES,
  categoryDescription,
  categoryTitle,
  questionDescription,
  questionText,
  questionTitle,
} from '../src/data/questions.ts';
import { meltAnswer, meltOf } from '../src/lib/melt.ts';
import { allArchiveCopy } from '../src/lib/catalog-copy.ts';
import { formatUsd } from '../src/lib/spot.ts';

/**
 * American spellings that must not appear in copy, with the form to use.
 * Matched case-insensitively on whole words, including common suffixes.
 */
const AMERICAN = {
  color: 'colour',
  colors: 'colours',
  colored: 'coloured',
  gray: 'grey',
  catalog: 'catalogue',
  catalogs: 'catalogues',
  jewelry: 'jewellery',
  defense: 'defence',
  meter: 'metre',
  meters: 'metres',
  liter: 'litre',
  fiber: 'fibre',
  mold: 'mould',
  plow: 'plough',
  labeled: 'labelled',
  labeling: 'labelling',
  traveled: 'travelled',
  modeling: 'modelling',
  canceled: 'cancelled',
  analyze: 'analyse',
  analyzed: 'analysed',
  recognize: 'recognise',
  recognized: 'recognised',
  organize: 'organise',
  organized: 'organised',
  penalize: 'penalise',
  penalized: 'penalised',
  minimize: 'minimise',
  minimized: 'minimised',
  skeptical: 'sceptical',
};

/** Every string on a page that a reader sees, keyword fields included. */
function visibleCopy() {
  const out = [];
  const push = (where, ...strings) => {
    for (const s of strings) if (typeof s === 'string' && s) out.push({ where, text: s });
  };

  for (const c of COINS) {
    const w = `coin "${c.slug}"`;
    push(w, c.name, c.shortName, c.seoTitle, c.bluf, c.description, c.composition,
      c.obverse, c.reverse, c.country, c.faceValue);
    push(w, ...(c.identify ?? []));
    push(`${w} keywords`, c.primaryKeyword, ...c.secondaryKeywords);
    for (const s of c.sections ?? []) push(`${w} section "${s.heading}"`, s.heading, ...s.paragraphs,
      ...(s.steps ?? []).flatMap((st) => [st.name, st.text]));
  }
  // Every archive page's copy as it will actually render: the generated form
  // where catalog-copy.ts produces it and the hand-written form where the
  // registry overrides it. Scanning the registries alone would have stopped
  // checking the section's copy the day most of it started being generated.
  for (const row of allArchiveCopy()) {
    push(row.what, row.h1, row.seoTitle, row.description, row.question, row.answer);
    push(`${row.what} body`, ...row.intro, ...row.headings);
  }
  for (const t of TAGS) {
    push(`tag "${t.slug}"`, t.name, t.h1, t.seoTitle, t.bluf, t.description, ...(t.intro ?? []));
    push(`tag "${t.slug}" keywords`, t.primaryKeyword, t.faqQuestion);
    if (t.series) {
      push(`tag "${t.slug}" series`, t.series.designer, t.series.obverse, t.series.reverse,
        t.series.edge, t.series.mintMarkLocation,
        ...t.series.mints.flatMap((m) => [m.city, m.note]),
        ...t.series.compositions.map((x) => x.composition));
      // The cheat-sheet rows. Spread as objects these read as nothing at all
      // -- `push` skips anything that is not a string -- which is how the
      // longest prose on a series page went unchecked: `why`, `lookFor` and
      // every caution.
      for (const k of t.series.keyDates ?? []) push(`tag "${t.slug}" key date "${k.label}"`, k.label, k.why);
      for (const v of t.series.varieties ?? []) {
        push(`tag "${t.slug}" variety "${v.label}"`, v.label, v.lookFor, v.caution);
      }
      for (const e of t.series.errors ?? []) {
        push(`tag "${t.slug}" error "${e.label}"`, e.label, e.what, e.check, e.known, e.caution);
      }
    }
  }
  for (const g of GROUPS) {
    // The generated forms are scanned above, through allArchiveCopy(). What is
    // left here is the registry's own text, including the entries for groups
    // and tags that have no coins yet and therefore no page: unpopulated is not
    // unwritten, and the spellings in one are the spellings it ships with.
    push(`group "${g.slug}"`, g.name, g.h1, g.seoTitle, g.bluf, g.description, ...(g.intro ?? []));
    push(`group "${g.slug}" keywords`, g.primaryKeyword, g.faqQuestion, ...(g.secondaryKeywords ?? []));
  }
  for (const t of TYPES) {
    push(`type "${t.slug}"`, t.name, t.namePlural, t.bluf, t.faceNote);
    push(`type "${t.slug}" keywords`, t.primaryKeyword, ...t.secondaryKeywords);
  }
  // The common questions are written by hand and in bulk, which is the same
  // exposure the catalogue has and the same reason to check them.
  for (const q of QUESTIONS) {
    // The title and the description as they will ship, because both are
    // generated: scanning the fields they are built from would stop checking
    // the sentence a searcher reads. Paragraphs are flattened first, so a
    // link's path is not scanned as prose.
    push(`question "${q.slug}"`, q.question, questionTitle(q), q.answer, q.lede,
      questionDescription(q));
    for (const s of q.sections) {
      push(`question "${q.slug}" section "${s.heading}"`, s.heading,
        ...s.paragraphs.map(questionText));
    }
  }
  // The topic pages. Hand-written where the questions' titles are not, which
  // is exactly the exposure this check exists for.
  for (const c of QUESTION_CATEGORIES) {
    push(`category "${c.slug}"`, c.name, c.h1, c.bluf, categoryTitle(c), categoryDescription(c));
    push(`category "${c.slug}" keywords`, c.primaryKeyword);
    push(`category "${c.slug}" intro`, ...c.intro.map(questionText));
  }
  return out;
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('catalogue copy is written in British English', () => {
  const problems = [];
  for (const { where, text } of visibleCopy()) {
    const scannable = text.toLowerCase();
    for (const [american, british] of Object.entries(AMERICAN)) {
      if (new RegExp(`\\b${american}\\b`).test(scannable)) {
        problems.push(`${where}: "${american}" should be "${british}" — ${text.slice(0, 70)}…`);
      }
    }
  }
  assert.deepEqual(problems, [], `\n  - ${problems.join('\n  - ')}\n`);
});

test('every melt page answer states the metal content and the figure', () => {
  // The melt answer is generated rather than written, so what this checks is
  // the generator: a coin with metal must get a sentence containing its weight
  // and its value, and a coin without must get one that says so rather than a
  // sentence with a hole in it.
  for (const coin of COINS) {
    const answer = meltAnswer(coin);
    const melt = meltOf(coin);
    if (melt) {
      assert.ok(
        answer.includes(String(melt.troyOunces)),
        `melt answer for "${coin.slug}" omits the metal content`,
      );
      assert.ok(
        answer.includes(formatUsd(melt.value)),
        `melt answer for "${coin.slug}" omits the melt value`,
      );
    } else {
      assert.match(
        answer,
        /no silver or gold/,
        `melt answer for "${coin.slug}" does not say it has no precious metal`,
      );
      assert.ok(
        answer.includes(coin.faceValue),
        `melt answer for "${coin.slug}" does not fall back to face value`,
      );
    }
  }
});

test('a coin BLUF is one sentence, and states the composition', () => {
  // STYLE.md: the answer is the composition and the metal weight, full stop.
  // A second sentence is almost always restating the melt figure that renders
  // directly beneath it, which is the repetition the style rule exists to stop.
  for (const coin of COINS) {
    const sentences = coin.bluf.split(/(?<!\b\d)\.(?:\s|$)/).filter((s) => s.trim());
    assert.equal(
      sentences.length,
      1,
      `coin "${coin.slug}" has a ${sentences.length}-sentence bluf; STYLE.md says one: "${coin.bluf}"`,
    );
  }
});

test('copy does not hedge or sell', () => {
  // The two habits STYLE.md names, checked because they creep back in one
  // adjective at a time. Not exhaustive -- these are the ones that recur.
  const banned = [
    'roughly', 'approximately', 'generally speaking', 'in today',
    'stunning', 'iconic', 'highly sought after', 'piece of history',
    'have you ever wondered', 'in this article',
  ];
  const problems = [];
  for (const { where, text } of visibleCopy()) {
    const lower = text.toLowerCase();
    for (const phrase of banned) {
      if (lower.includes(phrase)) problems.push(`${where}: "${phrase}" — ${text.slice(0, 70)}…`);
    }
  }
  assert.deepEqual(problems, [], `\n  - ${problems.join('\n  - ')}\n`);
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${name}\n     ${err.message}`);
  }
}
if (failed > 0) {
  console.error(`\n${failed} style check(s) failed.`);
  process.exit(1);
}
console.log('\nAll style checks passed.');
