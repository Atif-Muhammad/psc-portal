import { useToast } from "@/hooks/use-toast";

export function pscHeader(title: string, period: string): string {
  return `
    <div style="display:flex; align-items:center; border-bottom:2px solid #333; padding-bottom:8px; margin-bottom:12px;">
      <img src="/psc_logo.png" style="height:60px; margin-right:16px;" />
      <div>
        <div style="font-size:18px; font-weight:bold;">Peshawar Services Club</div>
        <div style="font-size:11px; color:#555;">40-The Mall, Peshawar Cantt. Tell: 091-9212753-55</div>
        <div style="font-size:14px; font-weight:600; margin-top:4px;">${title}</div>
        <div style="font-size:11px; color:#555;">${period}</div>
      </div>
    </div>
  `;
}

export function usePrintTemplate() {
  const { toast } = useToast();

  function print(htmlContent: string, title?: string) {
    const newWindow = window.open("", "_blank");

    if (!newWindow) {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups to print reports",
        variant: "destructive",
      });
      return;
    }

    newWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>${title ?? "Report"}</title>
    <style>
      @media print {
        body { margin: 0; }
        .no-print { display: none !important; }
      }
      body {
        font-family: Arial, sans-serif;
        font-size: 12px;
        color: #000;
        margin: 16px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border: 1px solid #ccc;
        padding: 4px 8px;
        text-align: left;
      }
      th {
        background-color: #1f2937;
        color: #fff;
      }
    </style>
  </head>
  <body>
    ${htmlContent}
  </body>
</html>`);

    newWindow.document.close();
    newWindow.print();
  }

  return { print };
}

// ─── Room Report Template Builders ───────────────────────────────────────────

export function buildRoomBookingsTemplate(
  data: any[],
  filters?: Record<string, string>
): string {
  const columns = [
    "S#", "Booking ID", "Member Name", "Member #", "Room #", "Room Type",
    "Check-In", "Check-Out", "Days", "Rent", "GST", "Food", "S.C",
    "Mattress", "Laundry", "Total", "Payment Status", "Booking Status", "Booked By",
  ];

  const headerRow = columns.map((c) => `<th>${c}</th>`).join("");

  const dataRows = data.map((row, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${row.id ?? ""}</td>
      <td>${row.memberName ?? ""}</td>
      <td>${row.memberNumber ?? ""}</td>
      <td>${row.roomNumber ?? ""}</td>
      <td>${row.roomType ?? ""}</td>
      <td>${row.checkIn ?? ""}</td>
      <td>${row.checkOut ?? ""}</td>
      <td>${row.days ?? ""}</td>
      <td>${row.rent ?? 0}</td>
      <td>${row.gst ?? 0}</td>
      <td>${row.food ?? 0}</td>
      <td>${row.serviceCharge ?? 0}</td>
      <td>${row.mattress ?? 0}</td>
      <td>${row.laundry ?? 0}</td>
      <td>${row.total ?? 0}</td>
      <td>${row.paymentStatus ?? ""}</td>
      <td>${row.bookingStatus ?? ""}</td>
      <td>${row.bookedBy ?? ""}</td>
    </tr>`).join("");

  const numericCols = ["rent", "gst", "food", "serviceCharge", "mattress", "laundry", "total"];
  const totals = numericCols.reduce((acc, key) => {
    acc[key] = data.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const totalsRow = `
    <tr style="font-weight:bold; background:#f3f4f6;">
      <td colspan="9">Totals</td>
      <td>${totals.rent}</td>
      <td>${totals.gst}</td>
      <td>${totals.food}</td>
      <td>${totals.serviceCharge}</td>
      <td>${totals.mattress}</td>
      <td>${totals.laundry}</td>
      <td>${totals.total}</td>
      <td colspan="3"></td>
    </tr>`;

  const filterText = filters && Object.keys(filters).length
    ? `<div style="font-size:11px; color:#555; margin-bottom:8px;">Filters: ${Object.entries(filters).map(([k, v]) => `${k}: ${v}`).join(" | ")}</div>`
    : "";

  return `
    ${pscHeader("Room Bookings Report", filters?.period ?? "")}
    ${filterText}
    <table>
      <thead><tr style="background:#1f2937; color:white;">${headerRow}</tr></thead>
      <tbody>${dataRows}${totalsRow}</tbody>
    </table>`;
}

export function buildRoomMonthlyCheckoutTemplate(data: any, period: string): string {
  const rooms: any[] = data?.rooms ?? [];
  const dailyTotals: Record<number, number> = data?.dailyTotals ?? {};

  // Collect all day numbers present
  const days = Array.from(
    new Set([
      ...rooms.flatMap((r) => Object.keys(r.days ?? {}).map(Number)),
      ...Object.keys(dailyTotals).map(Number),
    ])
  ).sort((a, b) => a - b);

  const headerCells = days.map((d) => `<th style="text-align:center;">${d}</th>`).join("");
  const dataRows = rooms.map((room) => {
    const cells = days.map((d) => `<td style="text-align:center;">${room.days?.[d] ?? ""}</td>`).join("");
    return `<tr><td>${room.roomNumber ?? ""}</td>${cells}<td style="text-align:center; font-weight:bold;">${room.total ?? 0}</td></tr>`;
  }).join("");

  const totalCells = days.map((d) => `<td style="text-align:center; font-weight:bold;">${dailyTotals[d] ?? 0}</td>`).join("");
  const grandTotal = rooms.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const totalsRow = `<tr style="font-weight:bold; background:#f3f4f6;"><td>Totals</td>${totalCells}<td style="text-align:center;">${grandTotal}</td></tr>`;

  return `
    <style>@media print { @page { size: landscape; } }</style>
    ${pscHeader("Room Monthly Checkout", period)}
    <table>
      <thead>
        <tr style="background:#1f2937; color:white;">
          <th>Room #</th>${headerCells}<th>Total</th>
        </tr>
      </thead>
      <tbody>${dataRows}${totalsRow}</tbody>
    </table>`;
}

export function buildRoomDailyCheckoutTemplate(data: any, date: string): string {
  const entries: any[] = data?.entries ?? [];
  const openingBalance: number = data?.openingBalance ?? 0;
  const accumulativeTotal: number = data?.accumulativeTotal ?? 0;

  const columns = [
    "Room#", "Name", "From", "To", "Days", "Rent",
    "Mattress", "GST", "Food", "S.C", "Laundry", "Total", "Voucher #",
  ];
  const headerRow = columns.map((c) => `<th>${c}</th>`).join("");

  const openingRow = `
    <tr style="font-weight:bold; background:#e5e7eb;">
      <td colspan="5">Opening Balance</td>
      <td colspan="7"></td>
      <td>${openingBalance}</td>
    </tr>`;

  const dataRows = entries.map((e) => `
    <tr>
      <td>${e.roomNumber ?? ""}</td>
      <td>${e.guestName ?? ""}</td>
      <td>${e.from ?? ""}</td>
      <td>${e.to ?? ""}</td>
      <td>${e.days ?? ""}</td>
      <td>${e.rent ?? 0}</td>
      <td>${e.mattress ?? 0}</td>
      <td>${e.gst ?? 0}</td>
      <td>${e.food ?? 0}</td>
      <td>${e.serviceCharge ?? 0}</td>
      <td>${e.laundry ?? 0}</td>
      <td>${e.total ?? 0}</td>
      <td>${e.voucherNumber ?? ""}</td>
    </tr>`).join("");

  const accRow = `
    <tr style="font-weight:bold; background:#f3f4f6;">
      <td colspan="5">Accumulative Total</td>
      <td colspan="7"></td>
      <td>${accumulativeTotal}</td>
    </tr>`;

  return `
    ${pscHeader("Room Daily Checkout", date)}
    <table>
      <thead><tr style="background:#1f2937; color:white;">${headerRow}</tr></thead>
      <tbody>${openingRow}${dataRows}${accRow}</tbody>
    </table>`;
}

export function buildRoomSalesTemplate(data: any, period: string): string {
  const entries: any[] = data?.entries ?? [];
  const totals = data?.totals ?? {};

  const columns = ["S.No", "Dated", "Food", "GST", "S.C", "Number of Bills", "Total"];
  const headerRow = columns.map((c) => `<th>${c}</th>`).join("");

  const dataRows = entries.map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${e.date ?? ""}</td>
      <td>${e.food ?? 0}</td>
      <td>${e.gst ?? 0}</td>
      <td>${e.serviceCharge ?? 0}</td>
      <td>${e.numberOfBills ?? 0}</td>
      <td>${e.total ?? 0}</td>
    </tr>`).join("");

  const totalsRow = `
    <tr style="font-weight:bold; background:#f3f4f6;">
      <td colspan="2">Totals</td>
      <td>${totals.food ?? 0}</td>
      <td>${totals.gst ?? 0}</td>
      <td>${totals.serviceCharge ?? 0}</td>
      <td>${totals.numberOfBills ?? 0}</td>
      <td>${totals.total ?? 0}</td>
    </tr>`;

  return `
    ${pscHeader("Guest Room Sales Report", period)}
    <table>
      <thead><tr style="background:#1f2937; color:white;">${headerRow}</tr></thead>
      <tbody>${dataRows}${totalsRow}</tbody>
    </table>`;
}

export function buildRoomCancellationsTemplate(data: any, period: string): string {
  const entries: any[] = data?.entries ?? [];

  const columns = ["Room Type", "Room Number", "Days In Month", "Days Cancelled", "Cancellation %"];
  const headerRow = columns.map((c) => `<th>${c}</th>`).join("");

  const dataRows = entries.map((e) => `
    <tr>
      <td>${e.roomType ?? ""}</td>
      <td>${e.roomNumber ?? ""}</td>
      <td>${e.daysInMonth ?? 0}</td>
      <td>${e.daysCanceled ?? 0}</td>
      <td>${e.cancellationPercentage ?? 0}%</td>
    </tr>`).join("");

  return `
    ${pscHeader("Room Cancellations Report", period)}
    <table>
      <thead><tr style="background:#1f2937; color:white;">${headerRow}</tr></thead>
      <tbody>${dataRows}</tbody>
    </table>`;
}

export function buildRoomMonthlyBillsTemplate(data: any, period: string): string {
  const summary = data?.summary ?? {};
  const entries: any[] = data?.entries ?? [];

  const summarySection = `
    <div style="margin-bottom:16px; padding:8px; border:1px solid #ccc; display:inline-block;">
      <strong>Summary</strong>
      <table style="margin-top:8px; min-width:300px;">
        <thead>
          <tr style="background:#1f2937; color:white;">
            <th>Member</th><th>Guest</th><th>Forces</th><th>Aff Club</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${summary.member ?? 0}</td>
            <td>${summary.guest ?? 0}</td>
            <td>${summary.forces ?? 0}</td>
            <td>${summary.affClub ?? 0}</td>
          </tr>
        </tbody>
      </table>
    </div>`;

  const detailColumns = [
    "S#", "Member #", "Guest Name", "Room #", "From", "To",
    "Rent", "GST", "Food", "Food GST", "S.C", "Mattress", "Mattress GST",
    "Laundry", "Total", "Advance", "Net Total",
  ];
  const headerRow = detailColumns.map((c) => `<th>${c}</th>`).join("");

  const numericKeys = ["rent", "gst", "food", "foodGst", "serviceCharge", "mattress", "mattressGst", "laundry", "total", "advance", "netTotal"];
  const colTotals = numericKeys.reduce((acc, key) => {
    acc[key] = entries.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const dataRows = entries.map((e) => `
    <tr>
      <td>${e.sNo ?? ""}</td>
      <td>${e.memberNumber ?? ""}</td>
      <td>${e.guestName ?? ""}</td>
      <td>${e.roomNumber ?? ""}</td>
      <td>${e.from ?? ""}</td>
      <td>${e.to ?? ""}</td>
      <td>${e.rent ?? 0}</td>
      <td>${e.gst ?? 0}</td>
      <td>${e.food ?? 0}</td>
      <td>${e.foodGst ?? 0}</td>
      <td>${e.serviceCharge ?? 0}</td>
      <td>${e.mattress ?? 0}</td>
      <td>${e.mattressGst ?? 0}</td>
      <td>${e.laundry ?? 0}</td>
      <td>${e.total ?? 0}</td>
      <td>${e.advance ?? 0}</td>
      <td>${e.netTotal ?? 0}</td>
    </tr>`).join("");

  const totalsRow = `
    <tr style="font-weight:bold; background:#f3f4f6;">
      <td colspan="6">Totals</td>
      <td>${colTotals.rent}</td>
      <td>${colTotals.gst}</td>
      <td>${colTotals.food}</td>
      <td>${colTotals.foodGst}</td>
      <td>${colTotals.serviceCharge}</td>
      <td>${colTotals.mattress}</td>
      <td>${colTotals.mattressGst}</td>
      <td>${colTotals.laundry}</td>
      <td>${colTotals.total}</td>
      <td>${colTotals.advance}</td>
      <td>${colTotals.netTotal}</td>
    </tr>`;

  return `
    ${pscHeader("Room Monthly Bills", period)}
    ${summarySection}
    <table>
      <thead><tr style="background:#1f2937; color:white;">${headerRow}</tr></thead>
      <tbody>${dataRows}${totalsRow}</tbody>
    </table>`;
}

// ─── Hall / Lawn Report Template Builders ────────────────────────────────────

export function buildHallBookingsTemplate(
  data: any[],
  filters?: Record<string, string>
): string {
  const columns = [
    "S#", "Booking ID", "Venue Name", "Venue Type", "Member Name", "Member #",
    "Event Date", "Event Type", "Time Slot", "Rent", "SC", "GST", "Food",
    "Total", "Payment Status", "Booking Status", "Booked By",
  ];

  const headerRow = columns.map((c) => `<th>${c}</th>`).join("");

  const dataRows = data.map((row, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${row.id ?? ""}</td>
      <td>${row.venueName ?? ""}</td>
      <td>${row.venueType ?? ""}</td>
      <td>${row.memberName ?? ""}</td>
      <td>${row.memberNumber ?? ""}</td>
      <td>${row.eventDate ?? ""}</td>
      <td>${row.eventType ?? ""}</td>
      <td>${row.timeSlot ?? ""}</td>
      <td>${row.rent ?? 0}</td>
      <td>${row.serviceCharge ?? 0}</td>
      <td>${row.gst ?? 0}</td>
      <td>${row.food ?? 0}</td>
      <td>${row.total ?? 0}</td>
      <td>${row.paymentStatus ?? ""}</td>
      <td>${row.bookingStatus ?? ""}</td>
      <td>${row.bookedBy ?? ""}</td>
    </tr>`).join("");

  const numericKeys = ["rent", "serviceCharge", "gst", "food", "total"];
  const totals = numericKeys.reduce((acc, key) => {
    acc[key] = data.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const totalsRow = `
    <tr style="font-weight:bold; background:#f3f4f6;">
      <td colspan="9">Totals</td>
      <td>${totals.rent}</td>
      <td>${totals.serviceCharge}</td>
      <td>${totals.gst}</td>
      <td>${totals.food}</td>
      <td>${totals.total}</td>
      <td colspan="3"></td>
    </tr>`;

  const filterText = filters && Object.keys(filters).length
    ? `<div style="font-size:11px; color:#555; margin-bottom:8px;">Filters: ${Object.entries(filters).map(([k, v]) => `${k}: ${v}`).join(" | ")}</div>`
    : "";

  return `
    ${pscHeader("Hall / Lawn Bookings Report", filters?.period ?? "")}
    ${filterText}
    <table>
      <thead><tr style="background:#1f2937; color:white;">${headerRow}</tr></thead>
      <tbody>${dataRows}${totalsRow}</tbody>
    </table>`;
}

export function buildHallDailyCheckoutTemplate(data: any, date: string): string {
  const entries: any[] = data?.entries ?? [];
  const openingBalance: number = data?.openingBalance ?? 0;
  const accumulativeTotal: number = data?.accumulativeTotal ?? 0;

  const columns = [
    "Hall Name", "Contact Person Name", "From", "To", "Day(s)",
    "Rent", "SC", "GST", "Food", "Total",
  ];
  const headerRow = columns.map((c) => `<th>${c}</th>`).join("");

  const openingRow = `
    <tr style="font-weight:bold; background:#e5e7eb;">
      <td colspan="5">Opening Balance</td>
      <td colspan="4"></td>
      <td>${openingBalance}</td>
    </tr>`;

  const dataRows = entries.map((e) => `
    <tr>
      <td>${e.hallName ?? ""}</td>
      <td>${e.contactPersonName ?? ""}</td>
      <td>${e.from ?? ""}</td>
      <td>${e.to ?? ""}</td>
      <td>${e.days ?? ""}</td>
      <td>${e.rent ?? 0}</td>
      <td>${e.serviceCharge ?? 0}</td>
      <td>${e.gst ?? 0}</td>
      <td>${e.food ?? 0}</td>
      <td>${e.total ?? 0}</td>
    </tr>`).join("");

  const accRow = `
    <tr style="font-weight:bold; background:#f3f4f6;">
      <td colspan="5">Accumulative Total</td>
      <td colspan="4"></td>
      <td>${accumulativeTotal}</td>
    </tr>`;

  return `
    ${pscHeader("Hall / Lawn Daily Checkout", date)}
    <table>
      <thead><tr style="background:#1f2937; color:white;">${headerRow}</tr></thead>
      <tbody>${openingRow}${dataRows}${accRow}</tbody>
    </table>`;
}

export function buildHallMonthlyGridTemplate(data: any, period: string): string {
  const venues: any[] = data?.venues ?? [];
  const dailyTotals: Record<number, number> = data?.dailyTotals ?? {};

  const days = Array.from(
    new Set([
      ...venues.flatMap((v) => Object.keys(v.days ?? {}).map(Number)),
      ...Object.keys(dailyTotals).map(Number),
    ])
  ).sort((a, b) => a - b);

  const headerCells = days.map((d) => `<th style="text-align:center;">${d}</th>`).join("");

  const dataRows = venues.map((venue) => {
    const cells = days.map((d) => `<td style="text-align:center;">${venue.days?.[d] ?? ""}</td>`).join("");
    return `<tr>
      <td>${venue.venueName ?? ""}</td>
      <td>${venue.venueType ?? ""}</td>
      ${cells}
      <td style="text-align:center; font-weight:bold;">${venue.total ?? 0}</td>
    </tr>`;
  }).join("");

  const totalCells = days.map((d) => `<td style="text-align:center; font-weight:bold;">${dailyTotals[d] ?? 0}</td>`).join("");
  const grandTotal = venues.reduce((sum, v) => sum + (Number(v.total) || 0), 0);
  const totalsRow = `<tr style="font-weight:bold; background:#f3f4f6;"><td colspan="2">Totals</td>${totalCells}<td style="text-align:center;">${grandTotal}</td></tr>`;

  return `
    <style>@media print { @page { size: landscape; } }</style>
    ${pscHeader("Hall / Lawn Monthly Grid", period)}
    <table>
      <thead>
        <tr style="background:#1f2937; color:white;">
          <th>Venue</th><th>Type</th>${headerCells}<th>Total</th>
        </tr>
      </thead>
      <tbody>${dataRows}${totalsRow}</tbody>
    </table>`;
}

// ─── Photoshoot Report Template Builders ─────────────────────────────────────

export function buildPhotoshootBookingsTemplate(
  data: any[],
  filters?: Record<string, string>
): string {
  const columns = [
    "S#", "Booking ID", "Member Name", "Member #", "Package Description",
    "Date", "Time Slot", "Charges", "Payment Status", "Booking Status", "Booked By",
  ];

  const headerRow = columns.map((c) => `<th>${c}</th>`).join("");

  const dataRows = data.map((row, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${row.id ?? ""}</td>
      <td>${row.memberName ?? ""}</td>
      <td>${row.memberNumber ?? ""}</td>
      <td>${row.packageDescription ?? ""}</td>
      <td>${row.date ?? ""}</td>
      <td>${row.timeSlot ?? ""}</td>
      <td>${row.charges ?? 0}</td>
      <td>${row.paymentStatus ?? ""}</td>
      <td>${row.bookingStatus ?? ""}</td>
      <td>${row.bookedBy ?? ""}</td>
    </tr>`).join("");

  const totalCharges = data.reduce((sum, r) => sum + (Number(r.charges) || 0), 0);

  const totalsRow = `
    <tr style="font-weight:bold; background:#f3f4f6;">
      <td colspan="7">Totals</td>
      <td>${totalCharges}</td>
      <td colspan="3"></td>
    </tr>`;

  const filterText = filters && Object.keys(filters).length
    ? `<div style="font-size:11px; color:#555; margin-bottom:8px;">Filters: ${Object.entries(filters).map(([k, v]) => `${k}: ${v}`).join(" | ")}</div>`
    : "";

  return `
    ${pscHeader("Photoshoot Bookings Report", filters?.period ?? "")}
    ${filterText}
    <table>
      <thead><tr style="background:#1f2937; color:white;">${headerRow}</tr></thead>
      <tbody>${dataRows}${totalsRow}</tbody>
    </table>`;
}
