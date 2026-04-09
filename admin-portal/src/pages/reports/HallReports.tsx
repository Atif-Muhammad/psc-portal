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
  exportHallBookingsReportPDF,
  exportHallDailyCheckoutPDF,
  exportHallMonthlyGridPDF,
} from "@/lib/pdfExport";
import {
  exportHallBookingsReportXLSX,
  exportHallDailyCheckoutXLSX,
  exportHallMonthlyGridXLSX,
} from "@/lib/excelExport";
import {
  getHallBookingsReport,
  getHallDailyCheckout,
  getHallMonthlyReport,
} from "../../../config/apis";
import { useToast } from "@/hooks/use-toast";

function formatBookedBy(value: string): string {
  if (!value) return "";
  return value === "APP" ? "System (App)" : value;
}

// ─── Booking List Tab ────────────────────────────────────────────────────────

const BOOKING_LIST_COLUMNS = [
  { key: "sNo", label: "S#" },
  { key: "id", label: "Booking ID" },
  { key: "venueName", label: "Venue Name" },
  { key: "venueType", label: "Venue Type" },
  { key: "memberName", label: "Member Name" },
  { key: "memberNumber", label: "Member #" },
  { key: "eventDate", label: "Event Date" },
  { key: "eventType", label: "Event Type" },
  { key: "timeSlot", label: "Time Slot" },
  { key: "rent", label: "Rent", align: "right" as const },
  { key: "serviceCharge", label: "SC", align: "right" as const },
  { key: "gst", label: "GST", align: "right" as const },
  { key: "food", label: "Food", align: "right" as const },
  { key: "total", label: "Total", align: "right" as const },
  { key: "paymentStatus", label: "Payment Status" },
  { key: "bookingStatus", label: "Booking Status" },
  { key: "bookedBy", label: "Booked By" },
];

function BookingListTab() {
  const { print } = usePrintTemplate();
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    venueType: "",
    eventType: "",
    timeSlot: "",
    bookingStatus: "",
    paymentStatus: "",
    fromDate: "",
    toDate: "",
    bookedBy: "",
    memberNumber: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hallBookingsReport", filters],
    queryFn: () =>
      getHallBookingsReport({
        venueType: filters.venueType || undefined,
        eventType: filters.eventType || undefined,
        timeSlot: filters.timeSlot || undefined,
        bookingStatus: filters.bookingStatus || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
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
      `${pscHeader("Hall / Lawn Bookings Report", period)}<table><thead><tr>${headerCells}</tr></thead><tbody>${tableRows}</tbody></table>`,
      "Hall / Lawn Bookings Report"
    );
  }

  function handlePDF() {
    try {
      exportHallBookingsReportPDF(rows, { fromDate: filters.fromDate, toDate: filters.toDate });
    } catch {
      toast({ title: "Export failed", description: "Could not generate PDF", variant: "destructive" });
    }
  }

  function handleExcel() {
    try {
      exportHallBookingsReportXLSX(rows, { fromDate: filters.fromDate, toDate: filters.toDate });
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
            <Label>Venue Type</Label>
            <Select
              value={filters.venueType}
              onValueChange={(v) => setFilters((f) => ({ ...f, venueType: v === "ALL" ? "" : v }))}
            >
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="HALL">Hall</SelectItem>
                <SelectItem value="LAWN">Lawn</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Time Slot</Label>
            <Select
              value={filters.timeSlot}
              onValueChange={(v) => setFilters((f) => ({ ...f, timeSlot: v === "ALL" ? "" : v }))}
            >
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="DAY">Day</SelectItem>
                <SelectItem value="NIGHT">Night</SelectItem>
              </SelectContent>
            </Select>
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
                <SelectItem value="CLOSED">Closed</SelectItem>
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
            <Label>Event Type</Label>
            <Input
              placeholder="e.g. Wedding"
              value={filters.eventType}
              onChange={(e) => setFilters((f) => ({ ...f, eventType: e.target.value }))}
            />
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
          <ReportHeader title="Hall / Lawn Bookings Report" period={period} />
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
              emptyMessage="No hall/lawn bookings found for the selected filters"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Daily Checkout Tab ──────────────────────────────────────────────────────

const DAILY_CHECKOUT_COLUMNS = [
  { key: "hallName", label: "Hall Name" },
  { key: "contactPersonName", label: "Contact Person Name" },
  { key: "from", label: "From" },
  { key: "to", label: "To" },
  { key: "days", label: "Day(s)", align: "right" as const },
  { key: "rent", label: "Rent", align: "right" as const },
  { key: "serviceCharge", label: "SC", align: "right" as const },
  { key: "gst", label: "GST", align: "right" as const },
  { key: "food", label: "Food", align: "right" as const },
  { key: "total", label: "Total", align: "right" as const },
];

function DailyCheckoutTab() {
  const { print } = usePrintTemplate();
  const { toast } = useToast();
  const [date, setDate] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hallDailyCheckout", date],
    queryFn: () => getHallDailyCheckout({ date }),
    enabled: submitted && !!date,
  });

  const entries: any[] = data?.entries ?? [];
  const openingBalance: number = data?.openingBalance ?? 0;
  const accumulativeTotal: number = data?.accumulativeTotal ?? 0;

  const numericHallKeys = ["rent", "serviceCharge", "gst", "food", "total"];
  const dailyTotalsRow = DAILY_CHECKOUT_COLUMNS.reduce((acc, col) => {
    acc[col.key] = numericHallKeys.includes(col.key)
      ? entries.reduce((sum, e) => sum + (Number(e[col.key]) || 0), 0)
      : "";
    return acc;
  }, {} as Record<string, any>);

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
      exportHallDailyCheckoutPDF(data, date);
    } catch {
      toast({ title: "Export failed", description: "Could not generate PDF", variant: "destructive" });
    }
  }

  function handleExcel() {
    try {
      exportHallDailyCheckoutXLSX(data, date);
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
    const totalRow = `<tr><td>Total</td>${DAILY_CHECKOUT_COLUMNS.slice(1).map((c) => `<td>${numericHallKeys.includes(c.key) ? (dailyTotalsRow[c.key] ?? "") : ""}</td>`).join("")}</tr>`;
    const accRow = `<tr><td>Accumulative Total</td>${DAILY_CHECKOUT_COLUMNS.slice(1).map((c) => `<td>${c.key === "total" ? accumulativeTotal : ""}</td>`).join("")}</tr>`;
    print(
      `${pscHeader("Hall / Lawn Daily Checkout", date)}<table><thead><tr>${headerCells}</tr></thead><tbody>${obRow}${bodyRows}${totalRow}${accRow}</tbody></table>`,
      "Hall / Lawn Daily Checkout"
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
          <ReportHeader title="Hall / Lawn Daily Checkout" date={date} />
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
              totalsRow={dailyTotalsRow}
              accumulativeRow={accumulativeRow}
              emptyMessage="No checkouts found for this date"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Monthly Grid Tab ────────────────────────────────────────────────────────

function MonthlyGridTab() {
  const { print } = usePrintTemplate();
  const { toast } = useToast();
  const [month, setMonth] = useState(""); // "YYYY-MM"
  const [submitted, setSubmitted] = useState(false);

  const fromDate = month ? `${month}-01` : "";
  const toDate = month
    ? new Date(Number(month.split("-")[0]), Number(month.split("-")[1]), 0)
        .toISOString().split("T")[0]
    : "";
  const period = month
    ? new Date(fromDate).toLocaleString("en-US", { month: "long", year: "numeric" })
    : "";

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hallMonthlyReport", month],
    queryFn: () => getHallMonthlyReport({ fromDate, toDate }),
    enabled: submitted && !!month,
  });

  const venues: any[] = data?.venues ?? [];
  const dailyTotals: Record<number, number> = data?.dailyTotals ?? {};
  const days = Object.keys(dailyTotals).map(Number).sort((a, b) => a - b);

  function handleSubmit() {
    if (!month) return;
    setSubmitted(true);
    refetch();
  }

  function handlePDF() {
    try {
      exportHallMonthlyGridPDF(data, period);
    } catch {
      toast({ title: "Export failed", description: "Could not generate PDF", variant: "destructive" });
    }
  }

  function handleExcel() {
    try {
      exportHallMonthlyGridXLSX(data, period);
    } catch {
      toast({ title: "Export failed", description: "Could not generate Excel file", variant: "destructive" });
    }
  }

  function handlePrint() {
    if (!venues.length) return;
    const headerCells = ["Venue", "Type", ...days.map(String), "Total"].map((h) => `<th>${h}</th>`).join("");
    const bodyRows = venues
      .map(
        (v) =>
          `<tr><td>${v.name}</td><td>${v.type}</td>${days.map((d) => `<td>${v.days?.[d] ?? ""}</td>`).join("")}<td>${v.total ?? 0}</td></tr>`
      )
      .join("");
    const totalsRow = `<tr><td><strong>Totals</strong></td><td></td>${days.map((d) => `<td>${dailyTotals[d] ?? 0}</td>`).join("")}<td></td></tr>`;
    print(
      `${pscHeader("Hall / Lawn Monthly Grid", period)}<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}${totalsRow}</tbody></table>`,
      "Hall / Lawn Monthly Grid"
    );
  }

  return (
    <div>
      <ReportFilterPanel onSubmit={handleSubmit} isLoading={isLoading}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Month</Label>
            <Input
              type="month"
              value={month}
              onChange={(e) => { setMonth(e.target.value); setSubmitted(false); }}
            />
          </div>
          <div className="space-y-1">
            <Label>To Date</Label>
            <Input
              type="date"/>
          </div>
        </div>
      </ReportFilterPanel>

      {submitted && (
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <ReportHeader title="Hall / Lawn Monthly Grid" period={period} />
          <div className="flex gap-2 mb-4 justify-end">
            <Button variant="outline" size="sm" onClick={handlePDF} disabled={!venues.length}>Download PDF</Button>
            <Button variant="outline" size="sm" onClick={handleExcel} disabled={!venues.length}>Download Excel</Button>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={!venues.length}>Print</Button>
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
          ) : venues.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">No monthly grid data found for the selected period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="p-2 text-left border border-gray-600">Venue</th>
                    <th className="p-2 text-left border border-gray-600">Type</th>
                    {days.map((d) => (
                      <th key={d} className="p-2 text-center border border-gray-600">{d}</th>
                    ))}
                    <th className="p-2 text-right border border-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {venues.map((venue, i) => (
                    <tr key={i} className="even:bg-gray-50">
                      <td className="p-2 border border-gray-200 font-medium">{venue.name}</td>
                      <td className="p-2 border border-gray-200">{venue.type}</td>
                      {days.map((d) => (
                        <td key={d} className="p-2 border border-gray-200 text-center text-xs">
                          {venue.days?.[d] ?? ""}
                        </td>
                      ))}
                      <td className="p-2 border border-gray-200 text-right font-semibold">{venue.total ?? 0}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                    <td className="p-2 border border-gray-200">Totals</td>
                    <td className="p-2 border border-gray-200" />
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function HallReports() {
  return (
    <div className="p-1">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Hall Reports</h1>
      <Tabs defaultValue="booking-list">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="booking-list">Booking List</TabsTrigger>
          <TabsTrigger value="daily-checkout">Daily Checkout</TabsTrigger>
          <TabsTrigger value="monthly-grid">Monthly Grid</TabsTrigger>
        </TabsList>

        <TabsContent value="booking-list">
          <BookingListTab />
        </TabsContent>
        <TabsContent value="daily-checkout">
          <DailyCheckoutTab />
        </TabsContent>
        <TabsContent value="monthly-grid">
          <MonthlyGridTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
