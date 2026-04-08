import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { exportPhotoshootBookingsReportPDF } from "@/lib/pdfExport";
import { exportPhotoshootBookingsReportXLSX } from "@/lib/excelExport";
import { getPhotoshootBookingsReport } from "../../../config/apis";
import { useToast } from "@/hooks/use-toast";

function formatBookedBy(value: string): string {
  if (!value) return "";
  return value === "APP" ? "System (App)" : value;
}

// ─── Columns ─────────────────────────────────────────────────────────────────

const COLUMNS = [
  { key: "sNo", label: "S#" },
  { key: "id", label: "Booking ID" },
  { key: "memberName", label: "Member Name" },
  { key: "memberNumber", label: "Member #" },
  { key: "packageDescription", label: "Package Description" },
  { key: "date", label: "Date" },
  { key: "timeSlot", label: "Time Slot" },
  { key: "charges", label: "Charges", align: "right" as const },
  { key: "paymentStatus", label: "Payment Status" },
  { key: "bookingStatus", label: "Booking Status" },
  { key: "bookedBy", label: "Booked By" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PhotoshootReports() {
  const { print } = usePrintTemplate();
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    bookedBy: "",
    memberNumber: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [dateError, setDateError] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["photoshootBookingsReport", filters],
    queryFn: () =>
      getPhotoshootBookingsReport({
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        bookedBy: filters.bookedBy || undefined,
        memberNumber: filters.memberNumber || undefined,
      }),
    enabled: submitted,
  });

  const rows: any[] = (data ?? []).map((r: any, i: number) => ({
    ...r,
    sNo: i + 1,
    bookedBy: formatBookedBy(r.bookedBy),
  }));

  const period =
    filters.fromDate && filters.toDate
      ? `${filters.fromDate} – ${filters.toDate}`
      : "";

  function handleSubmit() {
    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
      setDateError("From date cannot be after To date");
      return;
    }
    setDateError("");
    setSubmitted(true);
    refetch();
  }

  function handlePrint() {
    if (!rows.length) return;
    const headerCells = COLUMNS.map((c) => `<th>${c.label}</th>`).join("");
    const tableRows = rows
      .map(
        (r) =>
          `<tr>${COLUMNS.map((c) => `<td>${r[c.key] ?? ""}</td>`).join("")}</tr>`
      )
      .join("");
    print(
      `${pscHeader("Photoshoot Bookings Report", period)}<table><thead><tr>${headerCells}</tr></thead><tbody>${tableRows}</tbody></table>`,
      "Photoshoot Bookings Report"
    );
  }

  function handlePDF() {
    try {
      exportPhotoshootBookingsReportPDF(rows, {
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      });
    } catch {
      toast({
        title: "Export failed",
        description: "Could not generate PDF",
        variant: "destructive",
      });
    }
  }

  function handleExcel() {
    try {
      exportPhotoshootBookingsReportXLSX(rows, {
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      });
    } catch {
      toast({
        title: "Export failed",
        description: "Could not generate Excel file",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Photoshoot Reports</h1>

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
              onChange={(e) =>
                setFilters((f) => ({ ...f, fromDate: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>To Date</Label>
            <Input
              type="date"
              value={filters.toDate}
              onChange={(e) =>
                setFilters((f) => ({ ...f, toDate: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Booked By</Label>
            <Select
              value={filters.bookedBy}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, bookedBy: v === "ALL" ? "" : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
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
              onChange={(e) =>
                setFilters((f) => ({ ...f, memberNumber: e.target.value }))
              }
            />
          </div>
        </div>

        {dateError && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>{dateError}</AlertDescription>
          </Alert>
        )}
      </ReportFilterPanel>

      {submitted && (
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <ReportHeader title="Photoshoot Bookings Report" period={period} />
          <div className="flex gap-2 mb-4 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePDF}
              disabled={!rows.length}
            >
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExcel}
              disabled={!rows.length}
            >
              Download Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={!rows.length}
            >
              Print
            </Button>
          </div>

          {isError ? (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {(error as any)?.message ?? "Failed to load report"}
                </span>
                <Button size="sm" variant="outline" onClick={() => refetch()}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <ReportTable
              columns={COLUMNS}
              data={rows}
              loading={isLoading}
              emptyMessage="No photoshoot bookings found for the selected filters"
            />
          )}
        </div>
      )}
    </div>
  );
}
