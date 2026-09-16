import PDFDocument from "pdfkit";
import type { Response } from "express";

/**
 * Pure-Node PDF generation (pdfkit) rather than headless-Chromium/
 * Puppeteer — a one-page invoice doesn't justify bundling a ~300MB
 * browser with real per-render RAM cost on a buyer's typical shared
 * hosting/VPS, matching this codebase's existing lightweight-dependency
 * bias (local-disk uploads not S3, node-cron not a queue, direct SMTP
 * not a transactional-email service).
 */
export interface InvoiceData {
  invoiceNumber: number;
  issuedAt: Date;
  businessName: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  bookingStartsAt: Date;
  depositAmount: string;
  customerAddress?: string | null;
}

export function renderInvoicePdf(res: Response, data: InvoiceData) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${data.invoiceNumber}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).fillColor("#1e2a28").text(data.businessName);
  doc.moveDown(0.5);
  doc.fontSize(14).text(`Invoice #${data.invoiceNumber}`);
  doc.fontSize(10).fillColor("#666666").text(`Issued ${data.issuedAt.toDateString()}`);
  doc.moveDown(1.5);

  doc.fillColor("#000000").fontSize(12).text("Bill to");
  doc.fontSize(11).text(data.customerName);
  doc.text(data.customerEmail);
  if (data.customerAddress) doc.text(data.customerAddress);
  doc.moveDown(1);

  doc.fontSize(12).text("Service");
  doc.fontSize(11).text(data.serviceName);
  doc.text(`Appointment: ${data.bookingStartsAt.toLocaleString()}`);
  doc.moveDown(1);

  doc.fontSize(12).text(`Deposit paid: ${data.depositAmount}`);

  doc.end();
}
