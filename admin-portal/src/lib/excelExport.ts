import * as XLSX from "xlsx";

// ============================================================
// Helpers
// ============================================================

const PSC_CLUB_NAME = "Peshawar Services Club";
const PSC_ADDRESS = "40-The Mall, Peshawar Cantt. Tell: 091-9212753-55";

function makeWorkbook(sheetName: string, rows: any[][]): XLSX.WorkBook {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

function pscHeaderRows(title: string, periodOrDate?: string): any[][] {
  const rows: any[][] = [
    [PSC_CLUB_NAME],
    [PSC_ADDRESS],
    [title],
  ];
  if (periodOrDate) rows.push([periodOrDate]);
  rows.push([]); // blank separator
  return rows;
}

// ============================================================
// Room Report Exports
// ============================================================

/**
 * Exports a filtered room bookings list as XLSX.
 * Requirements: 2.5
 */
export function exportRoomBookingsReportXLSX(
  data: any[],
  filters?: Record<string, string>
): void {
  const periodStr =
    filters?.fromDate && filters?.toDate
      ? `${filters.fromDate} – ${filters.toDate}`
      : undefined;

  const header = [
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

  const allRows = [
    ...pscHeaderRows("Room Bookings Report", periodStr),
    header,
    ...rows,
  ];

  const wb = makeWorkbook("Room Bookings", allRows);
  XLSX.writeFile(wb, `room-bookings-report-${Date.now()}.xlsx`);
}

/**
 * Exports the room monthly checkout grid (rooms × days) as XLSX.
 * Requirements: 3.5
 */
export function exportRoomMonthlyCheckoutXLSX(data: any, period: string): void {
  const rooms: any[] = data?.rooms ?? [];
  const dailyTotals: Record<number, number> = data?.dailyTotals ?? {};
  const allDays = Object.keys(dailyTotals)
    .map(Number)
    .sort((a, b) => a - b);

  const header = ["Room #", ...allDays.map(String), "Total"];

  const dataRows = rooms.map((room: any) => [
    room.roomNumber ?? "",
    ...allDays.map((d) => room.days?.[d] ?? ""),
    room.total ?? "",
  ]);

  const totalsRow = [
    "Total",
    ...allDays.map((d) => dailyTotals[d] ?? 0),
    allDays.reduce((sum, d) => sum + (dailyTotals[d] ?? 0), 0),
  ];

  const allRows = [
    ...pscHeaderRows("Room Monthly Checkout", period),
    header,
    ...dataRows,
    totalsRow,
  ];

  const wb = makeWorkbook("Monthly Checkout", allRows);
  XLSX.writeFile(wb, `room-monthly-checkout-${Date.now()}.xlsx`);
}

/**
 * Exports the room daily checkout report as XLSX.
 * Requirements: 4.6
 */
export function exportRoomDailyCheckoutXLSX(data: any, date: string): void {
  const entries: any[] = data?.entries ?? [];
  const openingBalance: number = data?.openingBalance ?? 0;
  const accumulativeTotal: number = data?.accumulativeTotal ?? 0;

  const header = [
    "Room #", "Guest Name", "From", "To", "Days",
    "Rent", "Mattress", "GST", "Food", "S.C", "Laundry", "Total", "Voucher #",
  ];

  const openingRow = [
    "Opening Balance", "", "", "", "", "", "", "", "", "", "", openingBalance, "",
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
    "Accumulative Total", "", "", "", "", "", "", "", "", "", "", accumulativeTotal, "",
  ];

  const allRows = [
    ...pscHeaderRows("Room Daily Checkout", date),
    header,
    openingRow,
    ...dataRows,
    accRow,
  ];

  const wb = makeWorkbook("Daily Checkout", allRows);
  XLSX.writeFile(wb, `room-daily-checkout-${date}-${Date.now()}.xlsx`);
}

/**
 * Exports the room sales report (daily breakdown + totals) as XLSX.
 * Requirements: 5.5
 */
export function exportRoomSalesReportXLSX(data: any, period: string): void {
  const entries: any[] = data?.entries ?? [];
  const totals: any = data?.totals ?? {};

  const header = ["Date", "Food", "GST", "S.C", "No. of Bills", "Total"];

  const dataRows = entries.map((e: any) => [
    e.date ?? "",
    e.food ?? 0,
    e.gst ?? 0,
    e.serviceCharge ?? 0,
    e.numberOfBills ?? 0,
    e.total ?? 0,
  ]);

  const totalsRow = [
    "Total",
    totals.food ?? 0,
    totals.gst ?? 0,
    totals.serviceCharge ?? 0,
    totals.numberOfBills ?? 0,
    totals.total ?? 0,
  ];

  const allRows = [
    ...pscHeaderRows("Guest Room Sales Report", period),
    header,
    ...dataRows,
    totalsRow,
  ];

  const wb = makeWorkbook("Sales Report", allRows);
  XLSX.writeFile(wb, `room-sales-report-${Date.now()}.xlsx`);
}

/**
 * Exports the room cancellations report as XLSX.
 * Requirements: 6.5
 */
export function exportRoomCancellationsReportXLSX(data: any, period: string): void {
  const entries: any[] = data?.entries ?? [];

  const header = [
    "Room Type", "Room #", "Days in Month", "Days Cancelled", "Cancellation %",
  ];

  const dataRows = entries.map((e: any) => [
    e.roomType ?? "",
    e.roomNumber ?? "",
    e.daysInMonth ?? 0,
    e.daysCanceled ?? 0,
    e.cancellationPercentage != null
      ? `${Number(e.cancellationPercentage).toFixed(2)}%`
      : "0.00%",
  ]);

  const allRows = [
    ...pscHeaderRows("Room Cancellations Report", period),
    header,
    ...dataRows,
  ];

  const wb = makeWorkbook("Cancellations", allRows);
  XLSX.writeFile(wb, `room-cancellations-report-${Date.now()}.xlsx`);
}

/**
 * Exports the room monthly bills report (summary + detailed table) as XLSX.
 * Requirements: 7.5
 */
export function exportRoomMonthlyBillsXLSX(data: any, period: string): void {
  const summary: any = data?.summary ?? {};
  const entries: any[] = data?.entries ?? [];

  const summaryRows = [
    ["Summary"],
    ["Category", "Count"],
    ["Member", summary.member ?? 0],
    ["Guest", summary.guest ?? 0],
    ["Forces", summary.forces ?? 0],
    ["Aff. Club", summary.affClub ?? 0],
    [],
  ];

  const detailHeader = [
    "S#", "Member #", "Guest Name", "Room #", "From", "To",
    "Rent", "GST", "Food", "Food GST", "S.C", "Mattress", "Matt. GST",
    "Laundry", "Total", "Advance", "Net Total",
  ];

  const detailRows = entries.map((e: any) => [
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

  const allRows = [
    ...pscHeaderRows("Room Monthly Bills", period),
    ...summaryRows,
    ["Detailed Bills"],
    detailHeader,
    ...detailRows,
  ];

  const wb = makeWorkbook("Monthly Bills", allRows);
  XLSX.writeFile(wb, `room-monthly-bills-${Date.now()}.xlsx`);
}

// ============================================================
// Hall / Lawn Report Exports
// ============================================================

/**
 * Exports a filtered hall/lawn bookings list as XLSX.
 * Requirements: 8.5
 */
export function exportHallBookingsReportXLSX(
  data: any[],
  filters?: Record<string, string>
): void {
  const periodStr =
    filters?.fromDate && filters?.toDate
      ? `${filters.fromDate} – ${filters.toDate}`
      : undefined;

  const header = [
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

  const allRows = [
    ...pscHeaderRows("Hall / Lawn Bookings Report", periodStr),
    header,
    ...rows,
  ];

  const wb = makeWorkbook("Hall Bookings", allRows);
  XLSX.writeFile(wb, `hall-bookings-report-${Date.now()}.xlsx`);
}

/**
 * Exports the hall daily checkout report as XLSX.
 * Requirements: 9.6
 */
export function exportHallDailyCheckoutXLSX(data: any, date: string): void {
  const entries: any[] = data?.entries ?? [];
  const openingBalance: number = data?.openingBalance ?? 0;
  const accumulativeTotal: number = data?.accumulativeTotal ?? 0;

  const header = [
    "Hall Name", "Contact Person", "From", "To", "Days",
    "Rent", "S.C", "GST", "Food", "Total",
  ];

  const openingRow = [
    "Opening Balance", "", "", "", "", "", "", "", "", openingBalance,
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
    "Accumulative Total", "", "", "", "", "", "", "", "", accumulativeTotal,
  ];

  const allRows = [
    ...pscHeaderRows("Hall / Lawn Daily Checkout", date),
    header,
    openingRow,
    ...dataRows,
    accRow,
  ];

  const wb = makeWorkbook("Daily Checkout", allRows);
  XLSX.writeFile(wb, `hall-daily-checkout-${date}-${Date.now()}.xlsx`);
}

/**
 * Exports the hall/lawn monthly grid (venues × days) as XLSX.
 * Requirements: 10.5
 */
export function exportHallMonthlyGridXLSX(data: any, period: string): void {
  const venues: any[] = data?.venues ?? [];
  const dailyTotals: Record<number, number> = data?.dailyTotals ?? {};
  const allDays = Object.keys(dailyTotals)
    .map(Number)
    .sort((a, b) => a - b);

  const header = ["Venue", "Type", ...allDays.map(String), "Total"];

  const dataRows = venues.map((v: any) => [
    v.name ?? "",
    v.type ?? "",
    ...allDays.map((d) => v.days?.[d] ?? ""),
    v.total ?? "",
  ]);

  const totalsRow = [
    "Total",
    "",
    ...allDays.map((d) => dailyTotals[d] ?? 0),
    allDays.reduce((sum, d) => sum + (dailyTotals[d] ?? 0), 0),
  ];

  const allRows = [
    ...pscHeaderRows("Hall / Lawn Monthly Grid", period),
    header,
    ...dataRows,
    totalsRow,
  ];

  const wb = makeWorkbook("Monthly Grid", allRows);
  XLSX.writeFile(wb, `hall-monthly-grid-${Date.now()}.xlsx`);
}

// ============================================================
// Photoshoot Report Exports
// ============================================================

/**
 * Exports a filtered photoshoot bookings list as XLSX.
 * Requirements: 11.5
 */
export function exportPhotoshootBookingsReportXLSX(
  data: any[],
  filters?: Record<string, string>
): void {
  const periodStr =
    filters?.fromDate && filters?.toDate
      ? `${filters.fromDate} – ${filters.toDate}`
      : undefined;

  const header = [
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

  const allRows = [
    ...pscHeaderRows("Photoshoot Bookings Report", periodStr),
    header,
    ...rows,
  ];

  const wb = makeWorkbook("Photoshoot Bookings", allRows);
  XLSX.writeFile(wb, `photoshoot-bookings-report-${Date.now()}.xlsx`);
}
