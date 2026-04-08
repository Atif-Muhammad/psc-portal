interface ReportHeaderProps {
  title: string;
  period?: string;
  date?: string;
}

export function ReportHeader({ title, period, date }: ReportHeaderProps) {
  return (
    <div className="flex items-center border-b-2 border-gray-800 pb-3 mb-4">
      <img
        src="/psc_logo.png"
        alt="PSC Logo"
        className="h-16 w-auto mr-4 shrink-0"
      />
      <div>
        <div className="text-xl font-bold text-gray-900">Peshawar Services Club</div>
        <div className="text-xs text-gray-500 mt-0.5">
          40-The Mall, Peshawar Cantt. Tell: 091-9212753-55
        </div>
        <div className="text-base font-semibold text-gray-800 mt-1">{title}</div>
        {(period || date) && (
          <div className="text-xs text-gray-500 mt-0.5">{period ?? date}</div>
        )}
      </div>
    </div>
  );
}
