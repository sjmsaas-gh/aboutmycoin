/**
 * JSON-LD builders.
 *
 * Rule enforced by construction: anything that must mirror visible page copy
 * (FAQ answers, HowTo steps, prices) is built from the *same* data object the
 * page renders, never hand-typed twice. Google penalises structured data that
 * does not match the visible HTML, and hand-duplicated copy always drifts.
 *
 * Base.astro emits Organization + WebSite on every page, and BreadcrumbList
 * whenever a page passes `crumbs`. Everything else a page asks for by name.
 */
import { SITE } from './site';
import type { MetalLabel } from './spot';

/** The card every page already uses for og:image; also the Article image. */
const DEFAULT_IMAGE = '/og/default.png';

const abs = (path: string) => new URL(path, SITE.url).href;

export interface Crumb {
  label: string;
  href: string;
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
    logo: {
      '@type': 'ImageObject',
      url: abs('/logo.png'),
      width: 512,
      height: 512,
    },
    description: SITE.description,
    slogan: SITE.tagline,
    // No `email` property, on purpose. It is optional for Organization and
    // buys nothing in search, while putting a harvestable address in
    // machine-readable form on every page of the site -- which is the exact
    // thing /contact exists to avoid. Reachability is covered by the contact
    // page; do not add it back.
    //
    // sameAs is intentionally absent until the profiles genuinely exist --
    // pointing at dead handles is worse than omitting the property, and an
    // empty array is not a value, it is noise. Add entries here (and only real,
    // live ones) when there is something to point at.
  };
}

/**
 * The site itself, as a `WebSite` node.
 *
 * Exists so `WebPage.isPartOf` has something type-correct to point at. Do not
 * point it at the Organization: `isPartOf` expects a CreativeWork, and an
 * Organization is not one. Emitted on every page from Base.astro so the `@id`
 * always resolves within the same graph.
 *
 * No `potentialAction`/SearchAction until there is a real site search to wire
 * one to. Declaring a search endpoint that does not exist is a broken promise
 * to the crawler.
 */
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    publisher: { '@id': `${SITE.url}/#organization` },
    inLanguage: 'en-US',
  };
}

export function breadcrumbSchema(crumbs: Crumb[]) {
  const all: Crumb[] = [{ label: 'Home', href: '/' }, ...crumbs];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: abs(c.href),
    })),
  };
}

/**
 * The product, as software.
 *
 * RENAME: `applicationCategory`, `keywords` and `featureList` are the three
 * fields that carry real weight here, and all three must describe what the
 * software genuinely does. A keyword the featureList cannot back up is spam,
 * and answer engines cross-check the two.
 *
 * If this site is not software, delete this builder and use `Product` or
 * `Service` instead -- do not stretch WebApplication over something else.
 */
export function webApplicationSchema(opts: {
  applicationCategory: string;
  applicationSubCategory?: string;
  keywords: string[];
  featureList: string[];
  browserRequirements?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${SITE.url}/#webapp`,
    name: SITE.name,
    url: SITE.url,
    applicationCategory: opts.applicationCategory,
    ...(opts.applicationSubCategory
      ? { applicationSubCategory: opts.applicationSubCategory }
      : {}),
    keywords: opts.keywords.join(', '),
    operatingSystem: 'Any (browser-based)',
    ...(opts.browserRequirements
      ? { browserRequirements: opts.browserRequirements }
      : {}),
    description: SITE.description,
    inLanguage: 'en-US',
    image: abs('/logo.png'),
    softwareVersion: '1.0',
    isAccessibleForFree: true,
    featureList: opts.featureList,
    // One offer, free, because that is everything the site currently does.
    // The paid tiers came out when the decision was taken not to sell anything
    // at first: an Offer with a price is a claim that a thing can be bought,
    // and PreOrder is a claim that it is coming. Neither is true today. They
    // go back when /pricing does -- see src/pages/_pricing.astro.
    offers: {
      '@type': 'Offer',
      name: 'Free',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    publisher: { '@id': `${SITE.url}/#organization` },
    // AggregateRating and Review are deliberately absent. They go in only when
    // there are genuine reviews to cite. Fabricating them is a manual action.
  };
}

export interface Faq {
  q: string;
  /** Plain text. Rendered verbatim into the page AND into the schema. */
  a: string;
}

export function faqSchema(faqs: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export interface HowToStep {
  name: string;
  text: string;
}

export function howToSchema(opts: {
  name: string;
  description: string;
  steps: HowToStep[];
  totalTime?: string;
  tool?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: opts.name,
    description: opts.description,
    ...(opts.totalTime ? { totalTime: opts.totalTime } : {}),
    ...(opts.tool
      ? { tool: opts.tool.map((t) => ({ '@type': 'HowToTool', name: t })) }
      : {}),
    step: opts.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

/**
 * An `Article`, with no dates on it.
 *
 * `datePublished` and `dateModified` are deliberately absent. Everything this
 * site answers -- what a coin is made of, what it weighs, which dates are
 * scarce -- was settled before the page was written and will be true after it,
 * so a date on the article says only when somebody last touched the file. That
 * is noise to a reader and a claim to a crawler, and a crawler that finds it
 * unchanged across a year of builds has learned nothing worth knowing. The one
 * figure on this site that does go stale is the spot price, and it carries its
 * own date wherever it is printed -- see `src/lib/spot.ts`.
 */
export function articleSchema(opts: {
  headline: string;
  description: string;
  path: string;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.headline,
    description: opts.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': abs(opts.path) },
    // Google lists `image` as recommended for Article. The site card is the
    // only image a page has, and it is the one og:image already points at.
    image: abs(opts.image ?? DEFAULT_IMAGE),
    inLanguage: 'en-US',
    isPartOf: { '@id': `${SITE.url}/#website` },
    author: { '@type': 'Organization', name: SITE.name, url: SITE.url },
    publisher: { '@id': `${SITE.url}/#organization` },
  };
}

/**
 * An ordered list of pages, for hub pages, so the parent -> child relationship
 * in the visible HTML also exists in structured data. Without it a crawler has
 * to infer the cluster from anchor tags alone.
 *
 * `url` only, no nested descriptions: the child page states its own case, and
 * duplicating its summary here is exactly the drift this file exists to avoid.
 */
export function itemListSchema(opts: {
  name: string;
  description: string;
  items: { name: string; path: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: opts.name,
    description: opts.description,
    numberOfItems: opts.items.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: opts.items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: abs(it.path),
    })),
  };
}

/**
 * `Dataset`, for a computed reference table.
 *
 * This is the highest-leverage schema on a site that publishes reference data,
 * because `measurementTechnique` is where you state the thing that makes your
 * numbers differ from everyone else's -- and a model quoting the table can then
 * quote the method with it.
 *
 * `variableMeasured` must list columns the page genuinely renders. If a column
 * is dropped from the table, drop it here in the same commit.
 */
export function datasetSchema(opts: {
  name: string;
  description: string;
  path: string;
  variableMeasured: string[];
  measurementTechnique: string;
  keywords: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: opts.name,
    description: opts.description,
    url: abs(opts.path),
    isAccessibleForFree: true,
    creator: { '@id': `${SITE.url}/#organization` },
    publisher: { '@id': `${SITE.url}/#organization` },
    variableMeasured: opts.variableMeasured,
    measurementTechnique: opts.measurementTechnique,
    keywords: opts.keywords,
    // No `license` and no `distribution`. There is no download endpoint and no
    // licence has been chosen for the data, and asserting either would be a
    // claim the site cannot back. Add them if that ever changes.
  };
}

/**
 * A bare page-type declaration for pages that are neither an Article nor an
 * application -- /contact and /privacy. Cheap, and it removes the
 * ambiguity of a page whose only types are Organization and BreadcrumbList.
 */
export function webPageSchema(opts: {
  type: 'WebPage' | 'ContactPage' | 'AboutPage' | 'CollectionPage';
  name: string;
  description: string;
  path: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': opts.type,
    '@id': abs(opts.path),
    name: opts.name,
    description: opts.description,
    url: abs(opts.path),
    inLanguage: 'en-US',
    isPartOf: { '@id': `${SITE.url}/#website` },
    // An AboutPage is, by definition, about the organisation behind the site.
    // Saying so explicitly is the one place this link genuinely belongs.
    ...(opts.type === 'AboutPage'
      ? { mainEntity: { '@id': `${SITE.url}/#organization` } }
      : {}),
  };
}

/**
 * A coin, as a `Product`.
 *
 * schema.org has no Coin type, and the alternatives are worse: `Thing` says
 * nothing, and `Dataset` describes the table on the page rather than the
 * object the page is about. `Product` is the type whose properties actually
 * line up -- `material`, `weight`, `size`, `countryOfOrigin`, `productionDate`
 * -- and it is the one Google already understands.
 *
 * `offers` is deliberately absent, and its absence is the whole honesty
 * argument for this builder. A Product with an offer is a thing for sale at a
 * price; this site does not sell coins and does not know what any individual
 * coin will fetch. Adding a fabricated `price` to win a rich result would put
 * a number in machine-readable form that the visible page refuses to state,
 * which is the exact mismatch Google issues manual actions for.
 *
 * Metal content goes in `additionalProperty` as a QuantitativeValue rather
 * than in prose alone, because it is the one number on the page that a model
 * can compute with. `weight` and `size` use the same shape.
 */
export function coinProductSchema(opts: {
  name: string;
  description: string;
  path: string;
  /** Plain-language alloy, as the page prints it. */
  material: string;
  country: string;
  /** "1964" or "1916/1945" -- ISO-ish, see the caller. */
  productionDate: string;
  weightGrams?: number;
  diameterMm?: number;
  /** Actual metal weight in troy ounces, with the metal named. */
  metalContent?: { metal: MetalLabel; troyOunces: number };
  /** The series the coin belongs to, as a browsable category path. */
  category: string;
}) {
  const props: Record<string, unknown>[] = [];
  if (opts.metalContent) {
    props.push({
      '@type': 'PropertyValue',
      name: `${opts.metalContent.metal} content`,
      value: opts.metalContent.troyOunces,
      unitText: 'troy ounce',
    });
  }
  if (opts.diameterMm) {
    props.push({
      '@type': 'PropertyValue',
      name: 'Diameter',
      value: opts.diameterMm,
      unitCode: 'MMT',
      unitText: 'mm',
    });
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${abs(opts.path)}#coin`,
    name: opts.name,
    description: opts.description,
    url: abs(opts.path),
    image: abs(DEFAULT_IMAGE),
    category: opts.category,
    material: opts.material,
    countryOfOrigin: { '@type': 'Country', name: opts.country },
    productionDate: opts.productionDate,
    ...(opts.weightGrams
      ? { weight: { '@type': 'QuantitativeValue', value: opts.weightGrams, unitCode: 'GRM', unitText: 'g' } }
      : {}),
    ...(props.length ? { additionalProperty: props } : {}),
    isPartOf: { '@id': `${SITE.url}/#website` },
    // No `offers`, no `aggregateRating`, no `review`. See the note above.
  };
}
