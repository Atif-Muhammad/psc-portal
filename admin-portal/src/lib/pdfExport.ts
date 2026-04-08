import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportVoucherPDF = (voucher: any) => {
  const doc = new jsPDF();

  // Colors
  const primaryColor = [41, 128, 185] as [number, number, number]; // Professional blue
  const secondaryColor = [52, 73, 94] as [number, number, number]; // Dark gray
  const lightGray = [236, 240, 241] as [number, number, number];
  const successColor = [39, 174, 96] as [number, number, number];
  const warningColor = [243, 156, 18] as [number, number, number];
  const dangerColor = [231, 76, 60] as [number, number, number];

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Helper to format date and time
  const formatDateTime = (dateString: string) => {
    const date = dateString ? new Date(dateString) : new Date();
    const datePart = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timePart = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${datePart} | ${timePart}`;
  };

  // ========== HEADER SECTION ==========
  // Blue header bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Organization name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text("PESHAWAR SERVICES CLUB", pageWidth / 2, 20, { align: "center" });

  // Subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text("Peshawar Cantonment, Pakistan", pageWidth / 2, 28, { align: "center" });
  doc.text("Phone: +92-XXX-XXXXXXX | Email: info@peshawarsclub.pk", pageWidth / 2, 35, { align: "center" });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // ========== DOCUMENT TITLE ==========
  doc.setFillColor(...lightGray);
  doc.rect(15, 55, pageWidth - 30, 15, 'F');

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text("PAYMENT VOUCHER", pageWidth / 2, 65, { align: "center" });

  // ========== VOUCHER INFO BAR ==========
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const voucherNo = voucher.voucher_no || voucher.id || 'N/A';
  const issuedDate = formatDateTime(voucher.issued_at);

  // Left side - Voucher number
  doc.setFont('helvetica', 'bold');
  doc.text("Voucher No:", 15, 82);
  doc.setFont('helvetica', 'normal');
  doc.text(voucherNo.toString(), 45, 82);

  // Right side - Date
  doc.setFont('helvetica', 'bold');
  doc.text("Issue Date:", pageWidth - 65, 82);
  doc.setFont('helvetica', 'normal');
  doc.text(issuedDate, pageWidth - 35, 82);

  // Divider line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(15, 88, pageWidth - 15, 88);

  // ========== MEMBER/PAYER INFORMATION ==========
  let yPos = 100;

  doc.setFillColor(...lightGray);
  doc.rect(15, yPos, pageWidth - 30, 8, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text("MEMBER / PAYER INFORMATION", 20, yPos + 6);

  yPos += 15;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  // Two-column layout for member info
  const leftCol = 20;
  const rightCol = 110;

  // Left column
  doc.setFont('helvetica', 'bold');
  doc.text("Payer Name:", leftCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(voucher.memberName || voucher.member?.Name || 'N/A', leftCol + 35, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text("Membership #:", leftCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(voucher.membershipNo || voucher.membership_no || voucher.member?.Membership_No || 'N/A', leftCol + 35, yPos);

  // Right column (reset yPos for right column)
  yPos -= 8;
  doc.setFont('helvetica', 'bold');
  doc.text("Contact:", rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(voucher.member?.Contact_No || 'N/A', rightCol + 20, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text("Email:", rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(voucher.member?.Email || 'N/A', rightCol + 20, yPos);

  yPos += 15;

  // ========== PAYMENT DETAILS ==========
  doc.setFillColor(...lightGray);
  doc.rect(15, yPos, pageWidth - 30, 8, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text("PAYMENT DETAILS", 20, yPos + 6);

  yPos += 15;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  // Booking type
  doc.setFont('helvetica', 'bold');
  doc.text("Facility Type:", leftCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(voucher.booking_type || 'N/A', leftCol + 35, yPos);

  // Right column - Voucher type
  doc.setFont('helvetica', 'bold');
  doc.text("Voucher Type:", rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  const voucherTypeText = voucher.voucher_type || 'N/A';
  doc.text(voucherTypeText.replace(/_/g, ' '), rightCol + 28, yPos);

  yPos += 8;

  // Payment method
  doc.setFont('helvetica', 'bold');
  doc.text("Payment Mode:", leftCol, yPos);
  doc.setFont('helvetica', 'normal');
  const paymentModeLabel = (voucher.payment_mode || 'N/A').toUpperCase() === 'CHECK' ? 'Cheque' : voucher.payment_mode;
  doc.text(paymentModeLabel, leftCol + 30, yPos);

  // Right column - Booking ID
  if (voucher.booking_id) {
    doc.setFont('helvetica', 'bold');
    doc.text("Booking ID:", rightCol, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(voucher.booking_id.toString(), rightCol + 28, yPos);
    yPos += 8;
  }

  // Remarks (if available)
  if (voucher.remarks) {
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.text("Remarks:", leftCol, yPos);
    doc.setFont('helvetica', 'normal');
    const remarks = voucher.remarks || '';
    // Split remarks if too long
    const maxWidth = 150;
    const remarksLines = doc.splitTextToSize(remarks, maxWidth);
    doc.text(remarksLines, leftCol + 20, yPos);
    yPos += (remarksLines.length * 5);
  }

  // Payment Details (Card/Cheque)
  if (voucher.card_number || voucher.check_number || voucher.bank_name) {
    yPos += 8;
    if (voucher.card_number) {
      doc.setFont('helvetica', 'bold');
      doc.text("Card Number:", leftCol, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(voucher.card_number, leftCol + 30, yPos);
      yPos += 8;
    }
    if (voucher.check_number) {
      doc.setFont('helvetica', 'bold');
      doc.text("Cheque No:", leftCol, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(voucher.check_number, leftCol + 25, yPos);
      yPos += 8;
    }
    if (voucher.bank_name) {
      doc.setFont('helvetica', 'bold');
      doc.text("Bank Name:", leftCol, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(voucher.bank_name, leftCol + 25, yPos);
      yPos += 8;
    }
  }

  // Transaction ID and Paid Date for online payments
  if (voucher.transaction_id && (voucher.payment_mode === 'ONLINE' || voucher.payment_mode === 'KUICKPAY')) {
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.text("Transaction ID:", leftCol, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(voucher.transaction_id, leftCol + 30, yPos);
  }

  if (voucher.paid_at && (voucher.payment_mode === 'ONLINE' || voucher.payment_mode === 'KUICKPAY')) {
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.text("Payment Date:", leftCol, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDateTime(voucher.paid_at), leftCol + 30, yPos);
  }

  yPos += 10;

  // ========== AMOUNT BREAKDOWN TABLE ==========
  const tableData: any[][] = [];
  const amount = Number(voucher.amount) || 0;

  // Add the main amount row
  tableData.push(['Payment Amount', `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);

  // Total is just the amount (no tax or discount in schema)
  const total = amount;

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount']],
    body: tableData,
    foot: [['Total Amount', `PKR ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]],
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 11
    },
    footStyles: {
      fillColor: secondaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 12
    },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 45, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 15, right: 15 }
  });

  // Get final Y position after table
  yPos = (doc as any).lastAutoTable.finalY + 15;

  // ========== STATUS SECTION ==========
  doc.setFillColor(...lightGray);
  doc.rect(15, yPos, pageWidth - 30, 8, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text("PAYMENT STATUS", 20, yPos + 6);

  yPos += 15;

  // Status badge
  const status = voucher.status || 'PENDING';
  let statusColor = warningColor;
  let statusText = 'PENDING';

  // VoucherStatus enum: PENDING, CONFIRMED, CANCELLED
  if (status === 'CONFIRMED') {
    statusColor = successColor;
    statusText = 'CONFIRMED';
  } else if (status === 'CANCELLED') {
    statusColor = dangerColor;
    statusText = 'CANCELLED';
  } else if (status === 'PENDING') {
    statusColor = warningColor;
    statusText = 'PENDING';
  }

  doc.setFillColor(...statusColor);
  doc.roundedRect(leftCol, yPos - 5, 60, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, leftCol + 30, yPos + 1, { align: 'center' });

  // Show issued by
  if (voucher.issued_by) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Issued by: ${voucher.issued_by}`, leftCol + 70, yPos + 1);
  }

  yPos += 15;

  // ========== NOTES SECTION ==========
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text("Note: This is a computer-generated voucher and does not require a signature.", 20, yPos);
  yPos += 5;
  doc.text("Please keep this voucher for your records. For queries, contact the accounts department.", 20, yPos);

  // ========== FOOTER ==========
  const footerY = pageHeight - 25;

  // Footer divider
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

  // Footer text
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text("Peshawar Services Club", pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleString('en-US')}`, pageWidth / 2, footerY + 5, { align: 'center' });

  // Watermark (if pending or cancelled)
  if (status === 'PENDING' || status === 'CANCELLED') {
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    const watermarkText = status === 'CANCELLED' ? 'CANCELLED' : 'PENDING';
    doc.text(watermarkText, pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45
    });
  }

  // Save the PDF
  doc.save(`voucher-${voucherNo}-${Date.now()}.pdf`);
};

export const exportRoomTypesReport = (roomTypes: any[]) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Room Types Report", 105, 20, { align: "center" });
  console.log(roomTypes)
  autoTable(doc, {
    startY: 30,
    head: [["Type", "Member Price (PKR/Day)", "Guest Price (PKR/Day)"]],
    body: roomTypes.map(rt => [
      rt.type,
      rt.priceMember,
      rt.priceGuest
    ]),
  });

  doc.save("room-types-report.pdf");
};

export const exportHallsReport = (halls: any[]) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Halls Report", 105, 20, { align: "center" });

  autoTable(doc, {
    startY: 30,
    head: [["Hall Name", "Capacity", "Member Charges (PKR)", "Guest Charges (PKR)", "Status"]],
    body: halls.map(hall => [
      hall.name,
      hall.capacity,
      hall.chargesMembers.toLocaleString(),
      hall.chargesGuests.toLocaleString(),
      hall.isActive ? "Active" : "Inactive"
    ]),
  });

  doc.save("halls-report.pdf");
};

export const exportLawnsReport = (lawns: any[]) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Lawns Report", 105, 20, { align: "center" });

  autoTable(doc, {
    startY: 30,
    head: [["Category", "Capacity Range", "Member Charges (PKR)", "Guest Charges (PKR)"]],
    body: lawns.map(lawn => [
      lawn.lawnCategory,
      `${lawn.minGuests} - ${lawn.maxGuests}`,
      lawn.memberCharges.toLocaleString(),
      lawn.guestCharges.toLocaleString()
    ]),
  });

  doc.save("lawns-report.pdf");
};

export const exportPhotoshootReport = (photoshoot: any[]) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Photoshoot Services Report", 105, 20, { align: "center" });

  autoTable(doc, {
    startY: 30,
    head: [["Description", "Member Charges (PKR/Hour)", "Guest Charges (PKR/Hour)"]],
    body: photoshoot.map(ps => [
      ps.description,
      ps.memberChargesPerHour.toLocaleString(),
      ps.guestChargesPerHour.toLocaleString()
    ]),
  });

  doc.save("photoshoot-report.pdf");
};

// ============================================================
// PSC Report Export Helpers
// ============================================================

const DARK_HEADER: [number, number, number] = [31, 41, 55]; // gray-800
const PSC_CLUB_NAME = "Peshawar Services Club";
const PSC_ADDRESS = "40-The Mall, Peshawar Cantt. Tell: 091-9212753-55";

/**
 * Adds the standard PSC report header to a jsPDF document.
 * Returns the Y position after the header.
 */
function addPSCHeader(
  doc: jsPDF,
  title: string,
  periodOrDate?: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  // Club name
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(PSC_CLUB_NAME, pageWidth / 2, y, { align: "center" });
  y += 7;

  // Address
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(PSC_ADDRESS, pageWidth / 2, y, { align: "center" });
  y += 6;

  // Report title
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(title, pageWidth / 2, y, { align: "center" });
  y += 5;

  // Period / date
  if (periodOrDate) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(periodOrDate, pageWidth / 2, y, { align: "center" });
    y += 5;
  }

  // Divider
  doc.setDrawColor(31, 41, 55);
  doc.setLineWidth(0.4);
  doc.line(10, y, pageWidth - 10, y);
  y += 4;

  return y;
}

// ============================================================
// Room Report Exports
// ============================================================

/**
 * Exports a filtered room bookings list as PDF.
 * Requirements: 2.4
 */
export const exportRoomBookingsReportPDF = (
  data: any[],
  filters?: Record<string, string>
): void => {
  const doc = new jsPDF({ orientation: "portrait" });
  const periodStr = filters?.fromDate && filters?.toDate
    ? `${filters.fromDate} – ${filters.toDate}`
    : undefined;
  const startY = addPSCHeader(doc, "Room Bookings Report", periodStr);

  const columns = [
    "S#", "Booking ID", "Member Name", "Member #", "Room #",
    "Room Type", "Check-In", "Check-Out", "Days", "Rent",
    "GST", "Food", "S.C", "Mattress", "Laundry", "Total",
    "Payment Status", "Booking Status", "Booked By",
  ];

  const rows = data.map((row, i) => [
    i + 1,
    row.id ?? "",
    row.memberName ?? "",
    row.memberNumber ?? "",
    row.roomNumber ?? "",
    row.roomType ?? "",
    row.checkIn ?? "",
    row.checkOut ?? "",
    row.days ?? "",
    row.rent ?? 0,
    row.gst ?? 0,
    row.food ?? 0,
    row.serviceCharge ?? 0,
    row.mattress ?? 0,
    row.laundry ?? 0,
    row.total ?? 0,
    row.paymentStatus ?? "",
    row.bookingStatus ?? "",
    row.bookedBy ?? "",
  ]);

  autoTable(doc, {
    startY,
    head: [columns],
    body: rows,
    headStyles: { fillColor: DARK_HEADER, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    styles: { cellPadding: 1.5 },
    margin: { left: 7, right: 7 },
  });

  doc.save(`room-bookings-report-${Date.now()}.pdf`);
};

/**
 * Exports the room monthly checkout grid (rooms × days) as landscape PDF.
 * Requirements: 3.4
 */
export const exportRoomMonthlyCheckoutPDF = (data: any, period: string): void => {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = addPSCHeader(doc, "Room Monthly Checkout", period);

  const rooms: any[] = data?.rooms ?? [];
  const dailyTotals: Record<number, number> = data?.dailyTotals ?? {};

  // Determine day columns from data
  const allDays = Object.keys(dailyTotals).map(Number).sort((a, b) => a - b);

  const head = [["Room #", ...allDays.map(String), "Total"]];

  const body = rooms.map((room: any) => [
    room.roomNumber,
    ...allDays.map((d) => room.days?.[d] ?? ""),
    room.total ?? "",
  ]);

  // Totals row
  body.push([
    "Total",
    ...allDays.map((d) => dailyTotals[d] ?? 0),
    allDays.reduce((sum, d) => sum + (dailyTotals[d] ?? 0), 0),
  ]);

  autoTable(doc, {
    startY,
    head,
    body,
    headStyles: { fillColor: DARK_HEADER, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    styles: { cellPadding: 1.5 },
    margin: { left: 7, right: 7 },
    didParseCell: (hookData) => {
      // Highlight totals row
      if (hookData.row.index === body.length - 1) {
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fillColor = [243, 244, 246];
      }
    },
  });

  doc.save(`room-monthly-checkout-${Date.now()}.pdf`);
};

/**
 * Exports the room daily checkout report as portrait PDF.
 * Requirements: 4.5
 */
export const exportRoomDailyCheckoutPDF = (data: any, date: string): void => {
  const doc = new jsPDF({ orientation: "portrait" });
  const startY = addPSCHeader(doc, "Room Daily Checkout", date);

  const entries: any[] = data?.entries ?? [];
  const openingBalance: number = data?.openingBalance ?? 0;
  const accumulativeTotal: number = data?.accumulativeTotal ?? 0;

  const columns = [
    "Room #", "Guest Name", "From", "To", "Days",
    "Rent", "Mattress", "GST", "Food", "S.C", "Laundry", "Total", "Voucher #",
  ];

  const openingRow = [
    { content: "Opening Balance", colSpan: 11, styles: { fontStyle: "bold" as const } },
    { content: openingBalance.toLocaleString(), styles: { fontStyle: "bold" as const } },
    "",
  ];

  const dataRows = entries.map((e: any) => [
    e.roomNumber ?? "",
    e.guestName ?? "",
    e.from ?? "",
    e.to ?? "",
    e.days ?? "",
    e.rent ?? 0,
    e.mattress ?? 0,
    e.gst ?? 0,
    e.food ?? 0,
    e.serviceCharge ?? 0,
    e.laundry ?? 0,
    e.total ?? 0,
    e.voucherNumber ?? "",
  ]);

  const accRow = [
    { content: "Accumulative Total", colSpan: 11, styles: { fontStyle: "bold" as const } },
    { content: accumulativeTotal.toLocaleString(), styles: { fontStyle: "bold" as const } },
    "",
  ];

  autoTable(doc, {
    startY,
    head: [columns],
    body: [openingRow as any, ...dataRows, accRow as any],
    headStyles: { fillColor: DARK_HEADER, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    styles: { cellPadding: 1.5 },
    margin: { left: 7, right: 7 },
  });

  doc.save(`room-daily-checkout-${date}-${Date.now()}.pdf`);
};

/**
 * Exports the room sales report (daily breakdown + totals) as portrait PDF.
 * Requirements: 5.4
 */
export const exportRoomSalesReportPDF = (data: any, period: string): void => {
  const doc = new jsPDF({ orientation: "portrait" });
  const startY = addPSCHeader(doc, "Guest Room Sales Report", period);

  const entries: any[] = data?.entries ?? [];
  const totals: any = data?.totals ?? {};

  const columns = ["Date", "Food", "GST", "S.C", "No. of Bills", "Total"];

  const rows = entries.map((e: any) => [
    e.date ?? "",
    e.food ?? 0,
    e.gst ?? 0,
    e.serviceCharge ?? 0,
    e.numberOfBills ?? 0,
    e.total ?? 0,
  ]);

  rows.push([
    "Total",
    totals.food ?? 0,
    totals.gst ?? 0,
    totals.serviceCharge ?? 0,
    totals.numberOfBills ?? 0,
    totals.total ?? 0,
  ]);

  autoTable(doc, {
    startY,
    head: [columns],
    body: rows,
    headStyles: { fillColor: DARK_HEADER, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    styles: { cellPadding: 2 },
    margin: { left: 10, right: 10 },
    didParseCell: (hookData) => {
      if (hookData.row.index === rows.length - 1) {
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fillColor = [243, 244, 246];
      }
    },
  });

  doc.save(`room-sales-report-${Date.now()}.pdf`);
};

/**
 * Exports the room cancellations report (room type × cancellation %) as portrait PDF.
 * Requirements: 6.4
 */
export const exportRoomCancellationsReportPDF = (data: any, period: string): void => {
  const doc = new jsPDF({ orientation: "portrait" });
  const startY = addPSCHeader(doc, "Room Cancellations Report", period);

  const entries: any[] = data?.entries ?? [];

  const columns = ["Room Type", "Room #", "Days in Month", "Days Cancelled", "Cancellation %"];

  const rows = entries.map((e: any) => [
    e.roomType ?? "",
    e.roomNumber ?? "",
    e.daysInMonth ?? 0,
    e.daysCanceled ?? 0,
    e.cancellationPercentage != null
      ? `${Number(e.cancellationPercentage).toFixed(2)}%`
      : "0.00%",
  ]);

  autoTable(doc, {
    startY,
    head: [columns],
    body: rows,
    headStyles: { fillColor: DARK_HEADER, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    styles: { cellPadding: 2 },
    margin: { left: 10, right: 10 },
  });

  doc.save(`room-cancellations-report-${Date.now()}.pdf`);
};

/**
 * Exports the room monthly bills report (summary + detailed table) as portrait PDF.
 * Requirements: 7.4
 */
export const exportRoomMonthlyBillsPDF = (data: any, period: string): void => {
  const doc = new jsPDF({ orientation: "portrait" });
  let y = addPSCHeader(doc, "Room Monthly Bills", period);

  const summary: any = data?.summary ?? {};
  const entries: any[] = data?.entries ?? [];
  const pageWidth = doc.internal.pageSize.getWidth();

  // Summary section
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Summary", 10, y);
  y += 5;

  const summaryData = [
    ["Member", summary.member ?? 0],
    ["Guest", summary.guest ?? 0],
    ["Forces", summary.forces ?? 0],
    ["Aff. Club", summary.affClub ?? 0],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Category", "Count"]],
    body: summaryData,
    headStyles: { fillColor: DARK_HEADER, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    styles: { cellPadding: 2 },
    tableWidth: 80,
    margin: { left: 10 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Detailed table
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Detailed Bills", 10, y);
  y += 4;

  const columns = [
    "S#", "Member #", "Guest Name", "Room #", "From", "To",
    "Rent", "GST", "Food", "Food GST", "S.C", "Mattress", "Matt. GST",
    "Laundry", "Total", "Advance", "Net Total",
  ];

  const rows = entries.map((e: any) => [
    e.sNo ?? "",
    e.memberNumber ?? "",
    e.guestName ?? "",
    e.roomNumber ?? "",
    e.from ?? "",
    e.to ?? "",
    e.rent ?? 0,
    e.gst ?? 0,
    e.food ?? 0,
    e.foodGst ?? 0,
    e.serviceCharge ?? 0,
    e.mattress ?? 0,
    e.mattressGst ?? 0,
    e.laundry ?? 0,
    e.total ?? 0,
    e.advance ?? 0,
    e.netTotal ?? 0,
  ]);

  autoTable(doc, {
    startY: y,
    head: [columns],
    body: rows,
    headStyles: { fillColor: DARK_HEADER, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    styles: { cellPadding: 1.5 },
    margin: { left: 7, right: 7 },
  });

  // Footer note
  const finalY = (doc as any).lastAutoTable.finalY + 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString("en-US")}`, pageWidth - 10, finalY, { align: "right" });

  doc.save(`room-monthly-bills-${Date.now()}.pdf`);
};

// ============================================================
// Hall / Lawn Report Exports
// ============================================================

/**
 * Exports a filtered hall/lawn bookings list as portrait PDF.
 * Requirements: 8.4
 */
export const exportHallBookingsReportPDF = (
  data: any[],
  filters?: Record<string, string>
): void => {
  const doc = new jsPDF({ orientation: "portrait" });
  const periodStr = filters?.fromDate && filters?.toDate
    ? `${filters.fromDate} – ${filters.toDate}`
    : undefined;
  const startY = addPSCHeader(doc, "Hall / Lawn Bookings Report", periodStr);

  const columns = [
    "S#", "Booking ID", "Venue Name", "Venue Type", "Member Name", "Member #",
    "Event Date", "Event Type", "Time Slot", "Rent", "SC", "GST", "Food",
    "Total", "Payment Status", "Booking Status", "Booked By",
  ];

  const rows = data.map((row, i) => [
    i + 1,
    row.id ?? "",
    row.venueName ?? "",
    row.venueType ?? "",
    row.memberName ?? "",
    row.memberNumber ?? "",
    row.eventDate ?? "",
    row.eventType ?? "",
    row.timeSlot ?? "",
    row.rent ?? 0,
    row.serviceCharge ?? 0,
    row.gst ?? 0,
    row.food ?? 0,
    row.total ?? 0,
    row.paymentStatus ?? "",
    row.bookingStatus ?? "",
    row.bookedBy ?? "",
  ]);

  autoTable(doc, {
    startY,
    head: [columns],
    body: rows,
    headStyles: { fillColor: DARK_HEADER, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    styles: { cellPadding: 1.5 },
    margin: { left: 7, right: 7 },
  });

  doc.save(`hall-bookings-report-${Date.now()}.pdf`);
};

/**
 * Exports the hall daily checkout report as portrait PDF.
 * Requirements: 9.5
 */
export const exportHallDailyCheckoutPDF = (data: any, date: string): void => {
  const doc = new jsPDF({ orientation: "portrait" });
  const startY = addPSCHeader(doc, "Hall / Lawn Daily Checkout", date);

  const entries: any[] = data?.entries ?? [];
  const openingBalance: number = data?.openingBalance ?? 0;
  const accumulativeTotal: number = data?.accumulativeTotal ?? 0;

  const columns = [
    "Hall Name", "Contact Person", "From", "To", "Days",
    "Rent", "S.C", "GST", "Food", "Total",
  ];

  const openingRow = [
    { content: "Opening Balance", colSpan: 9, styles: { fontStyle: "bold" as const } },
    { content: openingBalance.toLocaleString(), styles: { fontStyle: "bold" as const } },
  ];

  const dataRows = entries.map((e: any) => [
    e.hallName ?? "",
    e.contactPersonName ?? "",
    e.from ?? "",
    e.to ?? "",
    e.days ?? "",
    e.rent ?? 0,
    e.serviceCharge ?? 0,
    e.gst ?? 0,
    e.food ?? 0,
    e.total ?? 0,
  ]);

  const accRow = [
    { content: "Accumulative Total", colSpan: 9, styles: { fontStyle: "bold" as const } },
    { content: accumulativeTotal.toLocaleString(), styles: { fontStyle: "bold" as const } },
  ];

  autoTable(doc, {
    startY,
    head: [columns],
    body: [openingRow as any, ...dataRows, accRow as any],
    headStyles: { fillColor: DARK_HEADER, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    styles: { cellPadding: 2 },
    margin: { left: 10, right: 10 },
  });

  doc.save(`hall-daily-checkout-${date}-${Date.now()}.pdf`);
};

/**
 * Exports the hall/lawn monthly grid (venues × days) as landscape PDF.
 * Requirements: 10.4
 */
export const exportHallMonthlyGridPDF = (data: any, period: string): void => {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = addPSCHeader(doc, "Hall / Lawn Monthly Grid", period);

  const venues: any[] = data?.venues ?? [];
  const dailyTotals: Record<number, number> = data?.dailyTotals ?? {};

  const allDays = Object.keys(dailyTotals).map(Number).sort((a, b) => a - b);

  const head = [["Venue", "Type", ...allDays.map(String), "Total"]];

  const body = venues.map((v: any) => [
    v.name ?? "",
    v.type ?? "",
    ...allDays.map((d) => v.days?.[d] ?? ""),
    v.total ?? "",
  ]);

  body.push([
    "Total",
    "",
    ...allDays.map((d) => dailyTotals[d] ?? 0),
    allDays.reduce((sum, d) => sum + (dailyTotals[d] ?? 0), 0),
  ]);

  autoTable(doc, {
    startY,
    head,
    body,
    headStyles: { fillColor: DARK_HEADER, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    styles: { cellPadding: 1.5 },
    margin: { left: 7, right: 7 },
    didParseCell: (hookData) => {
      if (hookData.row.index === body.length - 1) {
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fillColor = [243, 244, 246];
      }
    },
  });

  doc.save(`hall-monthly-grid-${Date.now()}.pdf`);
};

// ============================================================
// Photoshoot Report Exports
// ============================================================

/**
 * Exports a filtered photoshoot bookings list as portrait PDF.
 * Requirements: 11.4
 */
export const exportPhotoshootBookingsReportPDF = (
  data: any[],
  filters?: Record<string, string>
): void => {
  const doc = new jsPDF({ orientation: "portrait" });
  const periodStr = filters?.fromDate && filters?.toDate
    ? `${filters.fromDate} – ${filters.toDate}`
    : undefined;
  const startY = addPSCHeader(doc, "Photoshoot Bookings Report", periodStr);

  const columns = [
    "S#", "Booking ID", "Member Name", "Member #", "Package Description",
    "Date", "Time Slot", "Charges", "Payment Status", "Booking Status", "Booked By",
  ];

  const rows = data.map((row, i) => [
    i + 1,
    row.id ?? "",
    row.memberName ?? "",
    row.memberNumber ?? "",
    row.packageDescription ?? "",
    row.date ?? "",
    row.timeSlot ?? "",
    row.charges ?? 0,
    row.paymentStatus ?? "",
    row.bookingStatus ?? "",
    row.bookedBy ?? "",
  ]);

  autoTable(doc, {
    startY,
    head: [columns],
    body: rows,
    headStyles: { fillColor: DARK_HEADER, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    styles: { cellPadding: 2 },
    margin: { left: 10, right: 10 },
  });

  doc.save(`photoshoot-bookings-report-${Date.now()}.pdf`);
};
