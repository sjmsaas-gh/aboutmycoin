/**
 * The tools section: /tools, and the crumb every page under it carries.
 *
 * The prefix is written once here so the hub, the two sub-hubs and the pages
 * below them cannot drift -- the same reason `CHEAT_SHEETS_ROOT` exists in
 * src/data/cheat-sheets.ts. The crumb is here for a second reason: five pages
 * name this section in their trail, and a label retyped five times is a label
 * that is "Coin tools" on three of them and "Tools" on the other two.
 *
 * The crumb label is the short, sentence-case form the other crumbs on this
 * site use ("Cheat sheets", "Coin calculators"), not the H1: a trail is a set
 * of short names, and the page it lands on says its own full one.
 */
import type { Crumb } from './schema';

export const TOOLS_ROOT = '/tools';

/** The H1 of the hub, and the name it goes by in structured data. */
export const TOOLS_H1 = 'Coin Tools & Calculators';

/** The one sentence the hub answers with, and its meta description. */
export const TOOLS_BLUF =
  'Use our tools and calculators to figure out melt price, quickly identify valuable coins, and more.';

/** The section's own crumb, first in the trail of every page under it. */
export const TOOLS_CRUMB: Crumb = { label: 'Coin tools', href: TOOLS_ROOT };
