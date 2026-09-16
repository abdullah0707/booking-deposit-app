import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { renderInvoicePdf, type InvoiceData } from "../lib/renderInvoicePdf.js";

export const invoicesRouter = Router();

async function findInvoiceWithDetails(bookingId: string, businessId?: string) {
  return prisma.invoice.findFirst({
    where: { bookingId, ...(businessId ? { businessId } : {}) },
    include: { booking: { include: { service: true } }, business: true },
  });
}

function toInvoiceData(invoice: Awaited<ReturnType<typeof findInvoiceWithDetails>>): InvoiceData | null {
  if (!invoice) return null;
  return {
    invoiceNumber: invoice.number,
    issuedAt: invoice.issuedAt,
    businessName: invoice.business.name,
    customerName: invoice.booking.customerName,
    customerEmail: invoice.booking.customerEmail,
    serviceName: invoice.booking.service.name,
    bookingStartsAt: invoice.booking.startsAt,
    depositAmount: invoice.booking.depositAmount.toString(),
    customerAddress: invoice.booking.customerAddress,
  };
}

// Public — same "booking id as informal capability" trust model as the
// existing public GET /bookings/:id polling endpoint; no customer
// accounts, so this is how a customer self-downloads their own invoice.
invoicesRouter.get(
  "/bookings/:id/invoice.pdf",
  asyncHandler(async (req, res) => {
    const data = toInvoiceData(await findInvoiceWithDetails(req.params.id));
    if (!data) return res.status(404).json({ error: "Invoice not found" });
    renderInvoicePdf(res, data);
  }),
);

invoicesRouter.get(
  "/admin/bookings/:id/invoice.pdf",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = toInvoiceData(await findInvoiceWithDetails(req.params.id, req.auth!.businessId));
    if (!data) return res.status(404).json({ error: "Invoice not found" });
    renderInvoicePdf(res, data);
  }),
);
