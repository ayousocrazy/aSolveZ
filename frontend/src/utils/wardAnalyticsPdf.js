// wardAnalyticsPdf.js
//
// Generates a downloadable PDF report entirely in the browser using jsPDF.
// No backend endpoint involved — this takes the same `stats` object produced
// by computeWardStats() (wardAnalyticsUtils.js) and the ward summary returned
// by GET /api/ward/analytics/, and lays them out as a formal report.
//
// Requires the `jspdf` package:
//   npm install jspdf

import jsPDF from 'jspdf';
import { formatDuration, CATEGORY_LABELS } from './wardAnalyticsUtils';

const COLORS = {
  brand: [21, 58, 107],
  brandDark: [13, 36, 66],
  accent: [200, 16, 46],
  text: [33, 37, 41],
  muted: [110, 116, 124],
  rule: [222, 226, 230],
  track: [237, 239, 242],
};

const PAGE_MARGIN = 48;

function newDoc() {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  return doc;
}

function pageWidth(doc) {
  return doc.internal.pageSize.getWidth();
}

function pageHeight(doc) {
  return doc.internal.pageSize.getHeight();
}

function ensureSpace(doc, y, needed, drawHeader) {
  if (y + needed > pageHeight(doc) - 56) {
    doc.addPage();
    drawHeader(doc);
    return 100;
  }
  return y;
}

function drawHeader(doc, ward) {
  const w = pageWidth(doc);
  doc.setFillColor(...COLORS.brand);
  doc.rect(0, 0, w, 64, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('WardConnect — Ward Performance Report', PAGE_MARGIN, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const locationLine = [ward?.municipality, ward?.district, ward?.province]
    .filter(Boolean)
    .join(', ');
  doc.text(`Ward ${ward?.ward_number ?? ward?.number ?? '—'} — ${locationLine}`, PAGE_MARGIN, 47);
  doc.setTextColor(...COLORS.text);
}

function drawSectionTitle(doc, y, title) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.brandDark);
  doc.text(title, PAGE_MARGIN, y);
  doc.setDrawColor(...COLORS.rule);
  doc.setLineWidth(0.75);
  doc.line(PAGE_MARGIN, y + 6, pageWidth(doc) - PAGE_MARGIN, y + 6);
  doc.setTextColor(...COLORS.text);
  return y + 26;
}

function drawKeyValueRow(doc, y, label, value, colWidth) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  doc.text(String(label), PAGE_MARGIN, y);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.text(String(value), PAGE_MARGIN + colWidth, y);
  return y + 18;
}

function drawBarRow(doc, y, label, value, percentage, color) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.text);
  doc.text(label, PAGE_MARGIN, y);
  doc.setTextColor(...COLORS.muted);
  doc.text(String(value), PAGE_MARGIN + 150, y);

  const barX = PAGE_MARGIN + 190;
  const barMaxWidth = pageWidth(doc) - PAGE_MARGIN - barX;
  doc.setFillColor(...COLORS.track);
  doc.roundedRect(barX, y - 8, barMaxWidth, 8, 1.5, 1.5, 'F');
  const filled = Math.max(2, (percentage / 100) * barMaxWidth);
  doc.setFillColor(...color);
  doc.roundedRect(barX, y - 8, filled, 8, 1.5, 1.5, 'F');

  doc.setTextColor(...COLORS.muted);
  doc.text(`${percentage}%`, barX + barMaxWidth + 6, y, { align: 'right' });
  return y + 18;
}

/**
 * @param {Object} args
 * @param {Object} args.ward   - ward summary object from GET /api/ward/analytics/
 * @param {Object} args.stats  - output of computeWardStats(issues)
 */
export function downloadWardAnalyticsPdf({ ward, stats }) {
  const doc = newDoc();
  drawHeader(doc, ward);

  let y = 100;

  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Generated ${new Date().toLocaleString()}`, PAGE_MARGIN, y);
  y += 28;

  // ---- Summary ----
  y = drawSectionTitle(doc, y, 'Summary');
  y = drawKeyValueRow(doc, y, 'Total issues', stats.total, 200);
  y = drawKeyValueRow(doc, y, 'Pending', stats.pending, 200);
  y = drawKeyValueRow(doc, y, 'Acknowledged', stats.acknowledged, 200);
  y = drawKeyValueRow(doc, y, 'Completed', stats.completed, 200);
  y = drawKeyValueRow(doc, y, 'Completion rate', `${stats.completionRate}%`, 200);
  if (ward?.false_resolution_reports !== undefined) {
    y = drawKeyValueRow(doc, y, 'Open false-resolution reports', ward.false_resolution_reports, 200);
  }
  y += 14;

  // ---- Response & resolution time ----
  y = ensureSpace(doc, y, 140, (d) => drawHeader(d, ward));
  y = drawSectionTitle(doc, y, 'Response & Resolution Time');
  y = drawKeyValueRow(doc, y, 'Average response time', formatDuration(stats.avgResponseHours), 200);
  y = drawKeyValueRow(doc, y, 'Average resolution time', formatDuration(stats.avgResolutionHours), 200);
  y = drawKeyValueRow(doc, y, 'Fastest resolution', formatDuration(stats.fastestResolutionHours), 200);
  y = drawKeyValueRow(doc, y, 'Slowest resolution', formatDuration(stats.slowestResolutionHours), 200);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  const note = doc.splitTextToSize(
    'Response and resolution times are estimated from issue update timestamps, not a dedicated status-change log.',
    pageWidth(doc) - PAGE_MARGIN * 2,
  );
  doc.text(note, PAGE_MARGIN, y);
  y += note.length * 11 + 14;
  doc.setTextColor(...COLORS.text);

  // ---- Category breakdown ----
  y = ensureSpace(doc, y, 40 + stats.categoryBreakdown.length * 18, (d) => drawHeader(d, ward));
  y = drawSectionTitle(doc, y, 'Issues by Category');
  if (stats.categoryBreakdown.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.muted);
    doc.text('No issues recorded yet.', PAGE_MARGIN, y);
    y += 18;
  } else {
    stats.categoryBreakdown.forEach((row) => {
      y = ensureSpace(doc, y, 20, (d) => drawHeader(d, ward));
      const rgb = hexToRgb(row.color);
      y = drawBarRow(doc, y, CATEGORY_LABELS[row.category] || row.label, row.count, row.percentage, rgb);
    });
  }
  y += 14;

  // ---- Monthly trend ----
  y = ensureSpace(doc, y, 40 + stats.monthlyTrend.length * 18, (d) => drawHeader(d, ward));
  y = drawSectionTitle(doc, y, 'Monthly Trend (last 6 months)');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text('Month', PAGE_MARGIN, y);
  doc.text('Submitted', PAGE_MARGIN + 150, y);
  doc.text('Completed', PAGE_MARGIN + 280, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  stats.monthlyTrend.forEach((m) => {
    y = ensureSpace(doc, y, 18, (d) => drawHeader(d, ward));
    doc.setFontSize(10);
    doc.text(m.label, PAGE_MARGIN, y);
    doc.text(String(m.submitted), PAGE_MARGIN + 150, y);
    doc.text(String(m.completed), PAGE_MARGIN + 280, y);
    y += 18;
  });

  // ---- Footer / page numbers ----
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p += 1) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `WardConnect — computer-generated report — page ${p} of ${pageCount}`,
      PAGE_MARGIN,
      pageHeight(doc) - 24,
    );
  }

  const wardNumber = ward?.ward_number ?? ward?.number ?? 'report';
  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`ward-${wardNumber}-analytics-${dateStamp}.pdf`);
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}