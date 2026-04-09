import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportTableProps {
  columns: { key: string; label: string; align?: "left" | "right" | "center" }[];
  data: Record<string, any>[];
  totalsRow?: Record<string, any>;
  openingBalanceRow?: Record<string, any>;
  accumulativeRow?: Record<string, any>;
  loading?: boolean;
  emptyMessage?: string;
}

const alignClass = (align?: "left" | "right" | "center") => {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
};

export function ReportTable({
  columns,
  data,
  totalsRow,
  openingBalanceRow,
  accumulativeRow,
  loading = false,
  emptyMessage = "No data found",
}: ReportTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-800 hover:bg-gray-800">
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className={`text-white font-semibold ${alignClass(col.align)}`}
            >
              {col.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={`skeleton-${i}`}>
              {columns.map((col) => (
                <TableCell key={col.key}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <>
            {openingBalanceRow && (
              <TableRow className="bg-blue-50 font-medium">
                {columns.map((col, idx) => (
                  <TableCell key={col.key} className={alignClass(col.align)}>
                    {idx === 0 ? "Opening Balance" : (openingBalanceRow[col.key] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            )}

            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-10 text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={alignClass(col.align)}>
                      {row[col.key] ?? ""}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}

            {totalsRow && (
              <TableRow className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                {columns.map((col, idx) => (
                  <TableCell key={col.key} className={alignClass(col.align)}>
                    {idx === 0
                      ? (totalsRow[col.key] != null ? totalsRow[col.key] : "Totals")
                      : (totalsRow[col.key] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            )}

            {accumulativeRow && (
              <TableRow className="bg-gray-200 font-semibold">
                {columns.map((col, idx) => (
                  <TableCell key={col.key} className={alignClass(col.align)}>
                    {idx === 0 ? "Accumulative Total" : (accumulativeRow[col.key] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            )}
          </>
        )}
      </TableBody>
    </Table>
  );
}
