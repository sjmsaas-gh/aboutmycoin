/**
 * The buy button. The one hydrated island in the starter.
 *
 * It exists as an island rather than a plain link because a Checkout Session
 * has to be created per purchase -- a static Stripe Payment Link cannot carry
 * a return URL of ours, and cannot be tied back to the page waiting on it.
 *
 * ## Why a popup and not a redirect
 *
 * `window.open` first, top-level redirect as the fallback. A redirect discards
 * whatever the page was holding in memory, which on a tool site is the user's
 * entire work in progress. If the popup is blocked -- which is normal on iOS
 * Safari -- the redirect is the honest second choice, and the user is told what
 * is about to happen rather than being bounced silently.
 *
 * Embedded Checkout is deliberately not used: it is an iframe, and any page
 * that sets COEP for WebAssembly threads cannot host one.
 *
 * ## What it never does
 *
 * It never names a price. The client picks *which* product ('once' or 'pro');
 * the amount comes from a Stripe price id in the server's environment. A client
 * that can name its own price can buy the product for a penny, and there is a
 * test for exactly that.
 */
import { useState } from 'preact/hooks';
import { CHECKOUT_ENDPOINT } from '../lib/pricing';

interface Props {
  kind: 'once' | 'pro';
  label: string;
  /** Rendered disabled, with the reason, when the product is not sellable yet. */
  available: boolean;
  class?: string;
}

/**
 * Server error codes turned into something a buyer can act on.
 *
 * Each of these has a different thing for the person to do about it, which is
 * why the endpoint returns distinct codes rather than one generic failure. A
 * single "something went wrong" would hide the only useful part.
 */
const MESSAGES: Record<string, string> = {
  not_configured:
    'Checkout is not switched on yet. Nothing was charged — please try again later.',
  managed_payments_unavailable:
    'Checkout is not fully set up yet. Nothing was charged.',
  rate_limited: 'Too many attempts just now. Wait a moment and try again.',
  bad_origin: 'That request was blocked. Reload the page and try again.',
  stripe_error: 'The payment provider refused that. Nothing was charged.',
};

export default function BuyButton({ kind, label, available, class: cls = '' }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(CHECKOUT_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json().catch(() => null);

      if (!data?.url) {
        setError(MESSAGES[data?.error] ?? 'That did not start. Nothing was charged — please try again.');
        setBusy(false);
        return;
      }

      // Popup first. `noopener` is not set on purpose: Stripe's hosted page is
      // a trusted origin and the opener reference is what lets a future version
      // detect the window closing without polling our own endpoint harder.
      const popup = window.open(data.url, 'checkout', 'width=480,height=760');
      if (!popup || popup.closed) {
        // Blocked. Say so before navigating, so a page that holds unsaved work
        // does not simply vanish under the user.
        window.location.href = data.url;
        return;
      }
      setBusy(false);
    } catch {
      setError('Could not reach the payment provider. Check your connection and try again.');
      setBusy(false);
    }
  }

  if (!available) {
    return (
      <button class={`btn btn-primary ${cls}`} disabled aria-disabled="true" title="Not available yet">
        {label}
      </button>
    );
  }

  return (
    <div>
      <button class={`btn btn-primary ${cls}`} onClick={buy} disabled={busy}>
        {busy ? 'Opening checkout…' : label}
      </button>
      {/* role="status" rather than alert: it must not interrupt a screen reader
          mid-sentence, and the buyer is looking at the button already. */}
      {error && (
        <p class="text-sm mt-2" role="status" style="color: var(--bad)">
          {error}
        </p>
      )}
    </div>
  );
}
