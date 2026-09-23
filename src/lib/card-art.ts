/**
 * The photograph on a card, and how many cards a section shows.
 *
 * Three pages offer the same four ways into the catalogue -- metal, series,
 * country, topic -- and a card for "silver" on the home page has to be the
 * card for "silver" on /coin-info and on /melt-value. That is one fact about
 * a subject, so it lives here rather than in three templates: a photograph
 * arrives once and appears everywhere that subject is offered.
 *
 * Keys are namespaced because a group, a tag and an axis are three different
 * things that may legitimately want the same word. A key with no entry is not
 * an error -- it is a picture that has not been shot yet, and `TileArt`
 * renders the drawn placeholder for it. Most keys have no entry today.
 *
 * To give a subject its own picture: drop the photograph in
 * `assets/cards/<name>.<ext>` -- the name is the key's own slug -- run
 * `npm run cards`, import the generated
 * `.webp` below and map the key to it. Nothing else changes.
 */
import silver from '../assets/cards/silver.webp';
import gold from '../assets/cards/gold.webp';
import bySeries from '../assets/cards/by-series.webp';
import byCountry from '../assets/cards/by-country.webp';
import byTopic from '../assets/cards/by-topic.webp';
import ninetyPercentSilver from '../assets/cards/90-percent-silver.webp';
import junkSilver from '../assets/cards/junk-silver.webp';
import usCoin from '../assets/cards/us-coin.webp';
import washingtonQuarter from '../assets/cards/washington-quarter.webp';
import mercuryDime from '../assets/cards/mercury-dime.webp';
import morganDollar from '../assets/cards/morgan-dollar.webp';
import peaceDollar from '../assets/cards/peace-dollar.webp';
import wheatPenny from '../assets/cards/wheat-penny.webp';
import clad from '../assets/cards/clad.webp';
import cladCoinage from '../assets/cards/clad-coinage.webp';
import keyDate from '../assets/cards/key-date.webp';
import copper from '../assets/cards/copper.webp';
import steel from '../assets/cards/steel.webp';
import coinCalculators from '../assets/cards/coin-calculators.webp';
import cheatSheets from '../assets/cards/cheat-sheets.webp';

/** A subject that can carry a card, in the form the map is keyed by. */
export type CardKey = `group/${string}` | `tag/${string}` | `axis/${string}`;

export const groupArtKey = (slug: string): CardKey => `group/${slug}`;
export const tagArtKey = (slug: string): CardKey => `tag/${slug}`;
export const axisArtKey = (slug: string): CardKey => `axis/${slug}`;

const ART: Partial<Record<CardKey, ImageMetadata>> = {
  'group/silver': silver,
  'group/gold': gold,
  'group/clad': clad,
  'group/copper': copper,
  'group/steel': steel,
  'axis/by-series': bySeries,
  'axis/by-country': byCountry,
  'axis/by-topic': byTopic,
  'axis/coin-calculators': coinCalculators,
  'axis/cheat-sheets': cheatSheets,
  'tag/90-percent-silver': ninetyPercentSilver,
  'tag/junk-silver': junkSilver,
  'tag/us-coin': usCoin,
  'tag/washington-quarter': washingtonQuarter,
  'tag/mercury-dime': mercuryDime,
  'tag/morgan-dollar': morganDollar,
  'tag/peace-dollar': peaceDollar,
  'tag/wheat-penny': wheatPenny,
  'tag/clad-coinage': cladCoinage,
  'tag/key-date': keyDate,
};

/** The picture for a subject, or nothing -- which means the placeholder. */
export const cardArt = (key: CardKey): ImageMetadata | undefined => ART[key];

/**
 * How many cards a section of a hub offers.
 *
 * A hub's job is to make one choice easy, and a grid that runs past a screen
 * is a list rather than a choice. Nine is three rows of three at the width the
 * tile grid settles on, so a section ends on a full row. Sections that can
 * outgrow it link to the archive that holds the rest; the archives themselves
 * are not capped, because listing everything is what they are for.
 */
export const CARDS_PER_SECTION = 9;
