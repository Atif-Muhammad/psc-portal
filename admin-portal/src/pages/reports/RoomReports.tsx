import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportTable } from "@/components/reports/ReportTable";
import { ReportFilterPanel } from "@/components/reports/ReportFilterPanel";
import { usePrintTemplate, pscHeader } from "@/hooks/usePrintTemplate";
import {
  exportRoomBookingsReportPDF,
  exportRoomMonthlyCheckoutPDF,
  exportRoomDailyCheckoutPDF,
  exportRoomSalesReportPDF,
  exportRoomCancellationsReportPDF,
  exportRoomMonthlyBillsPDF,
} from "@/lib/pdfExport";
import {
  exportRoomBookingsReportXLSX,
  exportRoomMonthlyCheckoutXLSX,
  exportRoomDailyCheckoutXLSX,
  exportRoomSalesReportXLSX,
  exportRoomCancellationsReportXLSX,
  exportRoomMonthlyBillsXLSX,
} from "@/lib/excelExport";
import {
  getRoomBookingsReport,
  getRoomMonthlyCheckout,
  getRoomDailyCheckout,
  getRoomSalesReport,
  getRoomCancellationsReport,
  getRoomMonthlyBillsReport,
} from "../../../config/apis";
import { useToast } from "@/hooks/use-toast";

// Format bookedBy: 'APP' → 'System (App)', anything else is the admin name
function formatBookedBy(value: string): string {
  if (!value) return "";
  return value === "APP" ? "System (App)" : value;
}

// ─── Booking List Tab ────────────────────────────────────────────────────────

const BOOKING_LIST_COLUMNS = [
  { key: "sNo", label: "S#" },
  { key: "id", label: "Booking ID" },
  { key: "memberName", label: "Member Name" },
  { key: "memberNumber", label: "Member #" },
  { key: "roomNumber", label: "Room #" },
  { key: "roomType", label: "Room Type" },
  { key: "checkIn", label: "Check-In" },
  { key: "checkOut", label: "Check-Out" },
  { key: "days", label: "Days", align: "right" as const },
  { key: "rent", label: "Rent", align: "right" as const },
  { key: "gst", label: "GST", align: "right" as const },
  { key: "food", label: "Food", align: "right" as const },
  { key: "serviceCharge", label: "S.C", align: "right" as const },
  { key: "mattress", label: "Mattress", align: "right" as const },
  { key: "laundry", label: "Laundry", align: "right" as const },
  { key: "total", label: "Total", align: "right" as const },
  { key: "paymentStatus", label: "Payment Status" },
  { key: "bookingStatus", label: "Booking Status" },
  { key: "bookedBy", label: "Booked By" },
];

function BookingListTab() {
  const { print } = usePrintTemplate();
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    bookingStatus: "",
    paymentStatus: "",
    fromDate: "",
    toDate: "",
    roomType: "",
    bookedBy: "",
    memberNumber: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["roomBookingsReport", filters],
    queryFn: () =>
      getRoomBookingsReport({
        bookingStatus: filters.bookingStatus || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        roomType: filters.roomType || undefined,
        bookedBy: filters.bookedBy || undefined,
        memberNumber: filters.memberNumber || undefined,
      }),
    enabled: submitted,
  });

  const rows: any[] = (data ?? []).map((r: any, i: number) => ({ ...r, sNo: i + 1, bookedBy: formatBookedBy(r.bookedBy) }));
  const period =
    filters.fromDate && filters.toDate
      ? `${filters.fromDate} – ${filters.toDate}`
      : "";

  function handleSubmit() {
    setSubmitted(true);
    refetch();
  }

  function handlePrint() {
    if (!rows.length) return;
    const tableRows = rows
      .map(
        (r) =>
          `<tr>${BOOKING_LIST_COLUMNS.map((c) => `<td>${r[c.key] ?? ""}</td>`).join("")}</tr>`
      )
      .join("");
    const headerCells = BOOKING_LIST_COLUMNS.map((c) => `<th>${c.label}</th>`).join("");
    print(
      `${pscHeader("Room Bookings Report", period)}<table><thead><tr>${headerCells}</tr></thead><tbody>${tableRows}</tbody></table>`,
      "Room Bookings Report"
    );
  }
  function handlePDF() {
    try {
      exportRoomBookingsReportPDF(rows, { fromDate: filters.fromDate, toDate: filters.toDate });
    } catch {
      toast({ title: "Export failed", description: "Could not generate PDF", variant: "destructive" });
    }
  }

  function handleExcel() {
    try {
      exportRoomBookingsReportXLSX(rows, { fromDate: filters.fromDate, toDate: filters.toDate });
    } catch {
      toast({ title: "Export failed", description: "Could not generate Excel file", variant: "destructive" });
    }
  }

  return (
    <div>
      <ReportFilterPanel
        fromDate={filters.fromDate}
        toDate={filters.toDate}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label>From Date</Label>
            <Input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>To Date</Label>
            <Input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Booking Status</Label>
            <Select
              value={filters.bookingStatus}
              onValueChange={(v) => setFilters((f) => ({ ...f, bookingStatus: v === "ALL" ? "" : v }))}
            >
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="BOOKED">Booked</SelectItem>
                <SelectItem value="OCCUPIED">Occupied</SelectItem>
                <SelectItem value="CANCELED">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Payment Status</Label>
            <Select
              value={filters.paymentStatus}
              onValueChange={(v) => setFilters((f) => ({ ...f, paymentStatus: v === "ALL" ? "" : v }))}
            >
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
                <SelectItem value="HALF_PAID">Half Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Room Type</Label>
            <Input
              placeholder="e.g. Standard"
              value={filters.roomType}
              onChange={(e) => setFilters((f) => ({ ...f, roomType: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Booked By</Label>
            <Select
              value={filters.bookedBy}
              onValueChange={(v) => setFilters((f) => ({ ...f, bookedBy: v === "ALL" ? "" : v }))}
            >
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="APP">App</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Member Number</Label>
            <Input
              placeholder="Member #"
              value={filters.memberNumber}
              onChange={(e) => setFilters((f) => ({ ...f, memberNumber: e.target.value }))}
            />
          </div>
        </div>
      </ReportFilterPanel>

      {submitted && (
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <ReportHeader title="Room Bookings Report" period={period} />
          <div className="flex gap-2 mb-4 justify-end">
            <Button variant="outline" size="sm" onClick={handlePDF} disabled={!rows.length}>Download PDF</Button>
            <Button variant="outline" size="sm" onClick={handleExcel} disabled={!rows.length}>Download Excel</Button>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={!rows.length}>Print</Button>
          </div>
          {isError ? (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between">
                <span>{(error as any)?.message ?? "Failed to load report"}</span>
                <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
              </AlertDescription>
            </Alert>
          ) : (
            <ReportTable
              columns={BOOKING_LIST_COLUMNS}
              data={rows}
              loading={isLoading}
              emptyMessage="No room bookings found for the selected filters"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Monthly Checkout Tab ────────────────────────────────────────────────────

function MonthlyCheckoutTab() {
  const { print } = usePrintTemplate();
  const { toast } = useToast();
  const [filters, setFilters] = useState({ fromDate: "", toDate: "" });
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["roomMonthlyCheckout", filters],
    queryFn: () => getRoomMonthlyCheckout({ fromDate: filters.fromDate, toDate: filters.toDate }),
    enabled: submitted,
  });

  const period =
    filters.fromDate && filters.toDate
      ? `${filters.fromDate} – ${filters.toDate}`
      : "";

  const rooms: any[] = data?.rooms ?? [];
  const dailyTotals: Record<number, number> = data?.dailyTotals ?? {};

  // Derive day columns from data
  const days = Object.keys(dailyTotals).map(Number).sort((a, b) => a - b);

  function handleSubmit() {
    setSubmitted(true);
    refetch();
  }

  function handlePDF() {
    try {
      exportRoomMonthlyCheckoutPDF(data, period);
    } catch {
      toast({ title: "Export failed", description: "Could not generate PDF", variant: "destructive" });
    }
  }

  function handleExcel() {
    try {
      exportRoomMonthlyCheckoutXLSX(data, period);
    } catch {
      toast({ title: "Export failed", description: "Could not generate Excel file", variant: "destructive" });
    }
  }

  function handlePrint() {
    if (!rooms.length) return;
    const headerCells = ["Room #", ...days.map(String), "Total"].map((h) => `<th>${h}</th>`).join("");
    const bodyRows = rooms
      .map(
        (r) =>
          `<tr><td>${r.roomNumber}</td>${days.map((d) => `<td>${r.days?.[d] ?? ""}</td>`).join("")}<td>${r.total ?? 0}</td></tr>`
      )
      .join("");
    const totalsRow = `<tr><td><strong>Totals</strong></td>${days.map((d) => `<td>${dailyTotals[d] ?? 0}</td>`).join("")}<td></td></tr>`;
    print(
      `${pscHeader("Room Monthly Checkout", period)}<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}${totalsRow}</tbody></table>`,
      "Room Monthly Checkout"
    );
  }

  return (
    <div>
      <ReportFilterPanel
        fromDate={filters.fromDate}
        toDate={filters.toDate}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>From Date</Label>
            <Input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>To Date</Label>
            <Input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
            />
          </div>
        </div>
      </ReportFilterPanel>

      {submitted && (
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <ReportHeader title="Room Monthly Checkout" period={period} />
          <div className="flex gap-2 mb-4 justify-end">
            <Button variant="outline" size="sm" onClick={handlePDF} disabled={!rooms.length}>Download PDF</Button>
            <Button variant="outline" size="sm" onClick={handleExcel} disabled={!rooms.length}>Download Excel</Button>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={!rooms.length}>Print</Button>
          </div>
          {isError ? (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between">
                <span>{(error as any)?.message ?? "Failed to load report"}</span>
                <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
              </AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">No monthly checkout data found for the selected period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="p-2 text-left border border-gray-600">Room #</th>
                    {days.map((d) => (
                      <th key={d} className="p-2 text-center border border-gray-600">{d}</th>
                    ))}
                    <th className="p-2 text-right border border-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room, i) => (
                    <tr key={i} className="even:bg-gray-50">
                      <td className="p-2 border border-gray-200 font-medium">{room.roomNumber}</td>
                      {days.map((d) => (
                        <td key={d} className="p-2 border border-gray-200 text-center text-xs">
                          {room.days?.[d] ?? ""}
                        </td>
                      ))}
                      <td className="p-2 border border-gray-200 text-right font-semibold">{room.total ?? 0}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                    <td className="p-2 border border-gray-200">Totals</td>
                    {days.map((d) => (
                      <td key={d} className="p-2 border border-gray-200 text-center">{dailyTotals[d] ?? 0}</td>
                    ))}
                    <td className="p-2 border border-gray-200" />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Daily Checkout Tab ──────────────────────────────────────────────────────

const DAILY_CHECKOUT_COLUMNS = [
  { key: "roomNumber", label: "Room#" },
  { key: "guestName", label: "Name" },
  { key: "from", label: "From" },
  { key: "to", label: "To" },
  { key: "days", label: "Days", align: "right" as const },
  { key: "rent", label: "Rent", align: "right" as const },
  { key: "mattress", label: "Mattress", align: "right" as const },
  { key: "gst", label: "GST", align: "right" as const },
  { key: "food", label: "Food", align: "right" as const },
  { key: "serviceCharge", label: "S.C", align: "right" as const },
  { key: "laundry", label: "Laundry", align: "right" as const },
  { key: "total", label: "Total", align: "right" as const },
  { key: "voucherNumber", label: "Voucher Number" },
];

function DailyCheckoutTab() {
  const { print } = usePrintTemplate();
  const { toast } = useToast();
  const [date, setDate] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["roomDailyCheckout", date],
    queryFn: () => getRoomDailyCheckout({ date }),
    enabled: submitted && !!date,
  });

  const entries: any[] = data?.entries ?? [];
  const openingBalance: number = data?.openingBalance ?? 0;
  const accumulativeTotal: number = data?.accumulativeTotal ?? 0;

  const openingBalanceRow = DAILY_CHECKOUT_COLUMNS.reduce((acc, col) => {
    acc[col.key] = col.key === "total" ? openingBalance : "";
    return acc;
  }, {} as Record<string, any>);

  const accumulativeRow = DAILY_CHECKOUT_COLUMNS.reduce((acc, col) => {
    acc[col.key] = col.key === "total" ? accumulativeTotal : "";
    return acc;
  }, {} as Record<string, any>);

  function handleSubmit() {
    if (!date) return;
    setSubmitted(true);
    refetch();
  }

  function handlePDF() {
    try {
      exportRoomDailyCheckoutPDF(data, date);
    } catch {
      toast({ title: "Export failed", description: "Could not generate PDF", variant: "destructive" });
    }
  }

  function handleExcel() {
    try {
      exportRoomDailyCheckoutXLSX(data, date);
    } catch {
      toast({ title: "Export failed", description: "Could not generate Excel file", variant: "destructive" });
    }
  }

  function handlePrint() {
    const headerCells = DAILY_CHECKOUT_COLUMNS.map((c) => `<th>${c.label}</th>`).join("");
    const obRow = `<tr><td>Opening Balance</td>${DAILY_CHECKOUT_COLUMNS.slice(1).map((c) => `<td>${c.key === "total" ? openingBalance : ""}</td>`).join("")}</tr>`;
    const bodyRows = entries
      .map((r) => `<tr>${DAILY_CHECKOUT_COLUMNS.map((c) => `<td>${r[c.key] ?? ""}</td>`).join("")}</tr>`)
      .join("");
    const accRow = `<tr><td>Accumulative Total</td>${DAILY_CHECKOUT_COLUMNS.slice(1).map((c) => `<td>${c.key === "total" ? accumulativeTotal : ""}</td>`).join("")}</tr>`;
    print(
      `${pscHeader("Room Daily Checkout", date)}<table><thead><tr>${headerCells}</tr></thead><tbody>${obRow}${bodyRows}${accRow}</tbody></table>`,
      "Room Daily Checkout"
    );
  }

  return (
    <div>
      <ReportFilterPanel onSubmit={handleSubmit} isLoading={isLoading}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </ReportFilterPanel>

      {submitted && (
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <ReportHeader title="Room Daily Checkout" date={date} />
          <div className="flex gap-2 mb-4 justify-end">
            <Button variant="outline" size="sm" onClick={handlePDF} disabled={!data}>Download PDF</Button>
            <Button variant="outline" size="sm" onClick={handleExcel} disabled={!data}>Download Excel</Button>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={!data}>Print</Button>
          </div>
          {isError ? (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between">
                <span>{(error as any)?.message ?? "Failed to load report"}</span>
                <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
              </AlertDescription>
            </Alert>
          ) : (
            <ReportTable
              columns={DAILY_CHECKOUT_COLUMNS}
              data={entries}
              loading={isLoading}
              openingBalanceRow={openingBalanceRow}
              accumulativeRow={accumulativeRow}
              emptyMessage="No checkouts found for this date"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sales Report Tab ────────────────────────────────────────────────────────

const SALES_COLUMNS = [
  { key: "sNo", label: "S.No" },
  { key: "date", label: "Dated" },
  { key: "food", label: "Food", align: "right" as const },
  { key: "gst", label: "GST", align: "right" as const },
  { key: "serviceCharge", label: "S.C", align: "right" as const },
  { key: "numberOfBills", label: "Number of Bills", align: "right" as const },
  { key: "total", label: "Total", align: "right" as const },
];

function SalesReportTab() {
  const { print } = usePrintTemplate();
  const { toast } = useToast();
  const [filters, setFilters] = useState({ fromDate: "", toDate: "" });
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["roomSalesReport", filters],
    queryFn: () => getRoomSalesReport({ fromDate: filters.fromDate, toDate: filters.toDate }),
    enabled: submitted,
  });

  const entries: any[] = (data?.entries ?? []).map((r: any, i: number) => ({ ...r, sNo: i + 1 }));
  const totals: any = data?.totals ?? {};
  const period =
    filters.fromDate && filters.toDate
      ? `${filters.fromDate} – ${filters.toDate}`
      : "";

  function handleSubmit() {
    setSubmitted(true);
    refetch();
  }

  function handlePDF() {
    try {
      exportRoomSalesReportPDF(data, period);
    } catch {
      toast({ title: "Export failed", description: "Could not generate PDF", variant: "destructive" });
    }
  }

  function handleExcel() {
    try {
      exportRoomSalesReportXLSX(data, period);
    } catch {
      toast({ title: "Export failed", description: "Could not generate Excel file", variant: "destructive" });
    }
  }

  function handlePrint() {
    const headerCells = SALES_COLUMNS.map((c) => `<th>${c.label}</th>`).join("");
    const bodyRows = entries
      .map((r) => `<tr>${SALES_COLUMNS.map((c) => `<td>${r[c.key] ?? ""}</td>`).join("")}</tr>`)
      .join("");
    const totalsRow = `<tr><td><strong>Totals</strong></td><td></td>${["food", "gst", "serviceCharge", "numberOfBills", "total"].map((k) => `<td>${totals[k] ?? 0}</td>`).join("")}</tr>`;
    print(
      `${pscHeader("Guest Room Sales Report", period)}<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}${totalsRow}</tbody></table>`,
      "Guest Room Sales Report"
    );
  }

  return (
    <div>
      <ReportFilterPanel
        fromDate={filters.fromDate}
        toDate={filters.toDate}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>From Date</Label>
            <Input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>To Date</Label>
            <Input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
            />
          </div>
        </div>
      </ReportFilterPanel>

      {submitted && (
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <ReportHeader title="Guest Room Sales Report" period={period} />
          <div className="flex gap-2 mb-4 justify-end">
            <Button variant="outline" size="sm" onClick={handlePDF} disabled={!entries.length}>Download PDF</Button>
            <Button variant="outline" size="sm" onClick={handleExcel} disabled={!entries.length}>Download Excel</Button>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={!entries.length}>Print</Button>
          </div>
          {isError ? (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between">
                <span>{(error as any)?.message ?? "Failed to load report"}</span>
                <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
              </AlertDescription>
            </Alert>
          ) : (
            <ReportTable
              columns={SALES_COLUMNS}
              data={entries}
              loading={isLoading}
              totalsRow={totals}
              emptyMessage="No sales data found for the selected period"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Cancellations Tab ───────────────────────────────────────────────────────

const CANCELLATIONS_COLUMNS = [
  { key: "roomType", label: "Room Type" },
  { key: "roomNumber", label: "Room Number" },
  { key: "daysInMonth", label: "Days In Month", align: "right" as const },
  { key: "daysCanceled", label: "Days (canceled)", align: "right" as const },
  { key: "cancellationPercentage", label: "Cancellation %age", align: "right" as const },
];

function CancellationsTab() {
  const { print } = usePrintTemplate();
  const { toast } = useToast();
  const [filters, setFilters] = useState({ fromDate: "", toDate: "" });
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["roomCancellationsReport", filters],
    queryFn: () => getRoomCancellationsReport({ fromDate: filters.fromDate, toDate: filters.toDate }),
    enabled: submitted,
  });

  const entries: any[] = data?.entries ?? [];
  const period =
    filters.fromDate && filters.toDate
      ? `${filters.fromDate} – ${filters.toDate}`
      : "";

  function handleSubmit() {
    setSubmitted(true);
    refetch();
  }

  function handlePDF() {
    try {
      exportRoomCancellationsReportPDF(data, period);
    } catch {
      toast({ title: "Export failed", description: "Could not generate PDF", variant: "destructive" });
    }
  }

  function handleExcel() {
    try {
      exportRoomCancellationsReportXLSX(data, period);
    } catch {
      toast({ title: "Export failed", description: "Could not generate Excel file", variant: "destructive" });
    }
  }

  function handlePrint() {
    const headerCells = CANCELLATIONS_COLUMNS.map((c) => `<th>${c.label}</th>`).join("");
    const bodyRows = entries
      .map((r) => `<tr>${CANCELLATIONS_COLUMNS.map((c) => `<td>${r[c.key] ?? ""}</td>`).join("")}</tr>`)
      .join("");
    print(
      `${pscHeader("Room Cancellations Report", period)}<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`,
      "Room Cancellations Report"
    );
  }

  return (
    <div>
      <ReportFilterPanel
        fromDate={filters.fromDate}
        toDate={filters.toDate}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>From Date</Label>
            <Input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>To Date</Label>
            <Input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
            />
          </div>
        </div>
      </ReportFilterPanel>

      {submitted && (
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <ReportHeader title="Room Cancellations Report" period={period} />
          <div className="flex gap-2 mb-4 justify-end">
            <Button variant="outline" size="sm" onClick={handlePDF} disabled={!entries.length}>Download PDF</Button>
            <Button variant="outline" size="sm" onClick={handleExcel} disabled={!entries.length}>Download Excel</Button>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={!entries.length}>Print</Button>
          </div>
          {isError ? (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between">
                <span>{(error as any)?.message ?? "Failed to load report"}</span>
                <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
              </AlertDescription>
            </Alert>
          ) : (
            <ReportTable
              columns={CANCELLATIONS_COLUMNS}
              data={entries}
              loading={isLoading}
              emptyMessage="No cancellation data found for the selected period"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Monthly Bills Tab ───────────────────────────────────────────────────────

const MONTHLY_BILLS_COLUMNS = [
  { key: "sNo", label: "S#" },
  { key: "memberNumber", label: "M#" },
  { key: "guestName", label: "Guest Name" },
  { key: "roomNumber", label: "Room#" },
  { key: "from", label: "From" },
  { key: "to", label: "To" },
  { key: "rent", label: "Rent", align: "right" as const },
  { key: "gst", label: "GST", align: "right" as const },
  { key: "food", label: "Food", align: "right" as const },
  { key: "foodGst", label: "GST (food)", align: "right" as const },
  { key: "serviceCharge", label: "S.C", align: "right" as const },
  { key: "mattress", label: "Mattress", align: "right" as const },
  { key: "mattressGst", label: "GST (mattress)", align: "right" as const },
  { key: "laundry", label: "Laundry", align: "right" as const },
  { key: "total", label: "Total", align: "right" as const },
  { key: "advance", label: "Advance", align: "right" as const },
  { key: "netTotal", label: "Net Total", align: "right" as const },
];

function MonthlyBillsTab() {
  const { print } = usePrintTemplate();
  const { toast } = useToast();
  const [filters, setFilters] = useState({ fromDate: "", toDate: "" });
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["roomMonthlyBillsReport", filters],
    queryFn: () => getRoomMonthlyBillsReport({ fromDate: filters.fromDate, toDate: filters.toDate }),
    enabled: submitted,
  });

  const summary: any = data?.summary ?? {};
  const entries: any[] = (data?.entries ?? []).map((r: any, i: number) => ({ ...r, sNo: i + 1 }));
  const period =
    filters.fromDate && filters.toDate
      ? `${filters.fromDate} – ${filters.toDate}`
      : "";

  function handleSubmit() {
    setSubmitted(true);
    refetch();
  }

  function handlePDF() {
    try {
      exportRoomMonthlyBillsPDF(data, period);
    } catch {
      toast({ title: "Export failed", description: "Could not generate PDF", variant: "destructive" });
    }
  }

  function handleExcel() {
    try {
      exportRoomMonthlyBillsXLSX(data, period);
    } catch {
      toast({ title: "Export failed", description: "Could not generate Excel file", variant: "destructive" });
    }
  }

  function handlePrint() {
    const summaryHtml = `
      <div style="margin-bottom:12px; display:flex; gap:24px;">
        <span>Member: <strong>${summary.member ?? 0}</strong></span>
        <span>Guest: <strong>${summary.guest ?? 0}</strong></span>
        <span>Forces: <strong>${summary.forces ?? 0}</strong></span>
        <span>Aff Club: <strong>${summary.affClub ?? 0}</strong></span>
      </div>`;
    const headerCells = MONTHLY_BILLS_COLUMNS.map((c) => `<th>${c.label}</th>`).join("");
    const bodyRows = entries
      .map((r) => `<tr>${MONTHLY_BILLS_COLUMNS.map((c) => `<td>${r[c.key] ?? ""}</td>`).join("")}</tr>`)
      .join("");
    print(
      `${pscHeader("Room Monthly Bills", period)}${summaryHtml}<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`,
      "Room Monthly Bills"
    );
  }

  return (
    <div>
      <ReportFilterPanel
        fromDate={filters.fromDate}
        toDate={filters.toDate}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>From Date</Label>
            <Input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>To Date</Label>
            <Input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
            />
          </div>
        </div>
      </ReportFilterPanel>

      {submitted && (
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <ReportHeader title="Room Monthly Bills" period={period} />
          <div className="flex gap-2 mb-4 justify-end">
            <Button variant="outline" size="sm" onClick={handlePDF} disabled={!entries.length}>Download PDF</Button>
            <Button variant="outline" size="sm" onClick={handleExcel} disabled={!entries.length}>Download Excel</Button>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={!entries.length}>Print</Button>
          </div>
          {isError ? (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between">
                <span>{(error as any)?.message ?? "Failed to load report"}</span>
                <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
              </AlertDescription>
            </Alert>
          ) : isLoading ? null : (
            <>
              {data && (
                <div className="flex gap-6 mb-4 p-3 bg-slate-50 rounded-lg border text-sm">
                  <span>Member: <strong>{summary.member ?? 0}</strong></span>
                  <span>Guest: <strong>{summary.guest ?? 0}</strong></span>
                  <span>Forces: <strong>{summary.forces ?? 0}</strong></span>
                  <span>Aff Club: <strong>{summary.affClub ?? 0}</strong></span>
                </div>
              )}
              <ReportTable
                columns={MONTHLY_BILLS_COLUMNS}
                data={entries}
                loading={isLoading}
                emptyMessage="No monthly bills found for the selected period"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function RoomReports() {
  return (
    <div className="p-1">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Room Reports</h1>
      <Tabs defaultValue="booking-list">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="booking-list">Booking List</TabsTrigger>
          <TabsTrigger value="monthly-checkout">Monthly Checkout</TabsTrigger>
          <TabsTrigger value="daily-checkout">Daily Checkout</TabsTrigger>
          <TabsTrigger value="sales-report">Sales Report</TabsTrigger>
          <TabsTrigger value="cancellations">Cancellations</TabsTrigger>
          <TabsTrigger value="monthly-bills">Monthly Bills</TabsTrigger>
        </TabsList>

        <TabsContent value="booking-list">
          <BookingListTab />
        </TabsContent>
        <TabsContent value="monthly-checkout">
          <MonthlyCheckoutTab />
        </TabsContent>
        <TabsContent value="daily-checkout">
          <DailyCheckoutTab />
        </TabsContent>
        <TabsContent value="sales-report">
          <SalesReportTab />
        </TabsContent>
        <TabsContent value="cancellations">
          <CancellationsTab />
        </TabsContent>
        <TabsContent value="monthly-bills">
          <MonthlyBillsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
