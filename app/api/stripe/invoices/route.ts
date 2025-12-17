/**
 * GET /api/stripe/invoices
 *
 * Retrieves the authenticated user's invoice history from Stripe.
 *
 * Response:
 * {
 *   invoices: Array<{
 *     id: string,
 *     number: string,
 *     date: string,
 *     amount: number,
 *     currency: string,
 *     status: string,
 *     pdfUrl?: string
 *   }>
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHandler, successResponse } from '@/lib/api';
import { getStripe, getCustomerByProfileId } from '@/lib/stripe';

export const GET = createHandler(
  async (request, context, user) => {
    // Get customer from Stripe
    const customer = await getCustomerByProfileId(user!.profileId);

    if (!customer) {
      return successResponse({ invoices: [] });
    }

    const stripe = getStripe();

    // Fetch invoices from Stripe
    const invoicesResponse = await stripe.invoices.list({
      customer: customer.id,
      limit: 20,
      expand: ['data.subscription'],
    });

    const invoices = invoicesResponse.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number || `INV-${invoice.id.slice(-8)}`,
      date: new Date(invoice.created * 1000).toISOString(),
      amount: invoice.amount_paid || invoice.total,
      currency: invoice.currency.toUpperCase(),
      status: invoice.status || 'unknown',
      pdfUrl: invoice.invoice_pdf || undefined,
      hostedUrl: invoice.hosted_invoice_url || undefined,
    }));

    return successResponse({ invoices });
  },
  { auth: true }
);
