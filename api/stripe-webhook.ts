/**
 * Vercel adapter for the Stripe webhook. Logic lives in src/server.
 */
import { handleStripeWebhook } from '../src/server/stripe-webhook.js';

export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  return handleStripeWebhook(request, {
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    LICENSE_SIGNING_SECRET: process.env.LICENSE_SIGNING_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    LICENSE_FROM_EMAIL: process.env.LICENSE_FROM_EMAIL,
  });
}
