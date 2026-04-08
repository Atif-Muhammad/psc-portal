import React, { useState } from "react";
import { ChevronDown, ChevronUp, Filter, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ReportFilterPanelProps {
  children: React.ReactNode;
  fromDate?: string;
  toDate?: string;
  onSubmit: () => void;
  isLoading?: boolean;
}

export function ReportFilterPanel({
  children,
  fromDate,
  toDate,
  onSubmit,
  isLoading = false,
}: ReportFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  const hasDateError =
    !!fromDate && !!toDate && fromDate > toDate;

  const isSubmitDisabled = hasDateError || isLoading;

  return (
    <Card className="mb-6 border-slate-200 shadow-sm">
      <CardHeader className="p-4 pb-0">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center justify-between w-full text-left group"
          aria-expanded={isOpen}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Filter className="h-4 w-4 text-slate-500" />
            Filters
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          )}
        </button>
      </CardHeader>

      {isOpen && (
        <CardContent className="p-4 pt-4">
          <div className="grid grid-cols-1 gap-4">
            {children}
          </div>

          {hasDateError && (
            <p className="mt-3 text-sm text-red-600 font-medium">
              From date cannot be after To date
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitDisabled}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Report"
              )}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
