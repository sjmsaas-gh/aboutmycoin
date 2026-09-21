/**
 * The blurb under a card section's heading, on both hubs.
 *
 * /coin-value and /melt-value offer the same four ways in -- metal, series,
 * country, topic -- and they now introduce each one with the same sentence.
 * That is a deliberate exception to the rule that no paragraph appears on two
 * pages, made because the two sections are a mirror and a reader who has
 * learned to browse one has learned both; what differs between the pages is
 * the answer behind the card, not the choice being offered.
 *
 * Being an exception, it is a single source rather than two copies: a
 * sentence that is meant to be identical on two pages and is typed on both is
 * a sentence that is identical until somebody edits one of them.
 *
 * The topic blurb stops before its "All topics" link, which stays in each
 * template because the two pages link to their own tag archive. A melt page
 * pointing at the catalogue's archive would be the mirror breaking.
 */
export const SECTION_BLURB = {
  metal:
    'Precious metal content first, because melt price is a hard floor, and for a common coin that holds silver or gold it is very close to what the coin should sell for.',
  series:
    'Look up your coin by series. Coins in one series usually share the same specifications.',
  country:
    'Find your coin by country when the date and the denomination mean nothing until you know where it was struck.',
  topic: 'The categories the trade uses — key dates, junk silver, bullion, wartime issues.',
} as const;
