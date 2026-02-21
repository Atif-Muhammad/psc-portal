
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, XCircle, Loader2, Receipt, User, NotepadText, CheckCircle, Ban, Eye, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import {
  getBookings,
  createBooking,
  updateBooking,
  cancelReqBooking,
  getCancelledBookings,
  getCancellationRequests,
  updateCancellationReq,
  getHalls,
  searchMembers,
  getVouchers,
  getRoomDateStatuses, // Just in case, but we need getHallDateStatuses
  getHallDateStatuses,
} from "../../config/apis";
import { Member, Voucher, DateStatus } from "@/types/room-booking.type";
import {
  Hall,
  HallBooking,
  HallBookingForm,
  HallBookingTime,
  PaymentStatus,
  PricingType,
} from "@/types/hall-booking.type";
import {
  calculateHallAccountingValues,
  getAvailableTimeSlots,
  checkHallConflicts,
  hallInitialFormState,
  calculateHallPrice,
  parseLocalDate,
} from "@/utils/hallBookingUtils";
import { formatDateForDisplay, parsePakistanDate } from "@/utils/pakDate";
import { MemberSearchComponent } from "@/components/MemberSearch";
import { FormInput } from "@/components/FormInputs";
import { UnifiedDatePicker } from "@/components/UnifiedDatePicker";
import { format, differenceInCalendarDays, addDays, addYears, startOfDay } from "date-fns";
import { HallBookingDetailsCard } from "@/components/details/HallBookingDets";
import { VouchersDialog } from "@/components/VouchersDialog";
import { CancelBookingDialog } from "@/components/CancelBookingDialog";
import { Channel, PaymentMode } from "@/types/hall-booking.type";
import paymentRules from "../config/paymentRules.json";


// Payment section built for hall bookings
const HallPaymentSection = React.memo(
  ({
    form,
    onChange,
  }: {
    form: HallBookingForm;
    onChange: (field: keyof HallBookingForm, value: any) => void;
  }) => {
    const accounting = calculateHallAccountingValues(
      form.paymentStatus as PaymentStatus,
      form.totalPrice,
      form.paidAmount
    );

    return (
      <div className="md:col-span-2 border-t pt-4">
        <Label className="text-lg font-semibold">Payment Details</Label>

        <div className="mt-4">
          <Label>Total Amount</Label>
          <Input
            type="text"
            className="mt-2 font-bold text-lg"
            value={`PKR ${form.totalPrice.toLocaleString()}`}
            disabled
          />
        </div>

        <div className="mt-4">
          <Label>Payment Status</Label>
          <Select
            value={form.paymentStatus}
            onValueChange={(val) => onChange("paymentStatus", val)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="HALF_PAID">Half Paid</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="TO_BILL">To Bill</SelectItem>
              <SelectItem value="ADVANCE_PAYMENT">Advance Payment</SelectItem>
            </SelectContent>
          </Select>
          {form.totalPrice > paymentRules.hallBooking.advancePayment.threshold && (
            <p className="text-[10px] text-blue-600 mt-1 italic font-medium">
              * For bookings over {paymentRules.hallBooking.advancePayment.threshold.toLocaleString()} PKR, an advance payment of {paymentRules.hallBooking.advancePayment.defaultPaidAmount.toLocaleString()} PKR is required.
            </p>
          )}
        </div>

        {form.paymentStatus === "TO_BILL" && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center">
              <Receipt className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">
                Remaining amount will be added to Member's Ledger/Balance
              </span>
            </div>
          </div>
        )}

        {(form.paymentStatus === "HALF_PAID" || form.paymentStatus === "ADVANCE_PAYMENT") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Paid Amount (PKR) *</Label>
              <Input
                type="number"
                value={form.paidAmount || ""}
                onChange={(e) =>
                  onChange("paidAmount", parseFloat(e.target.value) || 0)
                }
                className="mt-2"
                placeholder="Enter paid amount"
                min="0"
                max={form.totalPrice}
              />
            </div>
            <div>
              <Label>Pending Amount (PKR)</Label>
              <Input
                type="number"
                value={form.pendingAmount}
                className="mt-2"
                readOnly
                disabled
              />
            </div>
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Label className="text-lg font-semibold text-blue-800">
            Accounting Summary
          </Label>
          <div className="grid grid-cols-2 gap-2 text-sm mt-2">
            <div className="text-blue-700">Total Amount:</div>
            <div className="font-semibold text-right text-blue-700">
              PKR {form.totalPrice.toLocaleString()}
            </div>

            <div className="text-green-700">Paid Amount (DR):</div>
            <div className="font-semibold text-right text-green-700">
              PKR {accounting.paid.toLocaleString()}
            </div>

            <div className="text-red-700">Owed Amount (CR):</div>
            <div className="font-semibold text-right text-red-700">
              PKR {accounting.owed.toLocaleString()}
            </div>
          </div>
          <div className="mt-2 text-xs text-blue-600">
            <strong>DR</strong> = Debit (Amount Received), <strong>CR</strong> =
            Credit (Amount Owed)
          </div>
        </div>

        {/* Payment Mode Selection */}
        {(form.paymentStatus === "PAID" || form.paymentStatus === "HALF_PAID" || form.paymentStatus === "ADVANCE_PAYMENT") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 border rounded-lg bg-gray-50">
            <div className="col-span-2">
              <Label className="font-semibold text-blue-800">Payment Medium Details</Label>
            </div>
            <div>
              <Label>Payment Mode *</Label>
              <Select
                value={form.paymentMode || "CASH"}
                onValueChange={(val) => onChange("paymentMode", val)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.paymentMode === "CARD" && (
              <div>
                <Label>Card Number (Last 4) *</Label>
                <Input
                  className="mt-2"
                  placeholder="e.g. 1234"
                  value={form.card_number || ""}
                  onChange={(e) => onChange("card_number", e.target.value)}
                />
              </div>
            )}

            {form.paymentMode === "CHECK" && (
              <div>
                <Label>Check Number *</Label>
                <Input
                  className="mt-2"
                  placeholder="Enter check number"
                  value={form.check_number || ""}
                  onChange={(e) => onChange("check_number", e.target.value)}
                />
              </div>
            )}

            {(form.paymentMode === "CARD" || form.paymentMode === "CHECK") && (
              <div className="col-span-2">
                <Label>Bank Name *</Label>
                <Input
                  className="mt-2"
                  placeholder="Enter bank name"
                  value={form.bank_name || ""}
                  onChange={(e) => onChange("bank_name", e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {(form.paymentStatus === "PAID" ||
          form.paymentStatus === "HALF_PAID") && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <Receipt className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-800">
                  {form.paymentStatus === "PAID"
                    ? "Full Payment Voucher will be generated automatically"
                    : "Half Payment Voucher will be generated automatically"}
                </span>
              </div>
            </div>
          )}
      </div>
    );
  }
);

HallPaymentSection.displayName = "HallPaymentSection";

const IndividualTimeSlotSelector = ({
  bookingDetails,
  hallId,
  bookings,
  halls,
  reservations,
  onChange,
  editBookingId,
  defaultEventType
}: {
  bookingDetails: { date: string; timeSlot: string; eventType?: string }[];
  hallId: string;
  bookings: HallBooking[];
  halls: Hall[];
  reservations: any[];
  onChange: (newDetails: { date: string; timeSlot: string; eventType?: string }[]) => void;
  editBookingId?: string;
  defaultEventType?: string;
}) => {
  if (!bookingDetails) return null;

  // Group details by date for easier UI rendering
  const dates = Array.from(new Set(bookingDetails.map(d => d.date))).sort();

  const toggleSlot = (date: string, slot: string) => {
    const existingIndex = bookingDetails.findIndex(d => d.date === date && d.timeSlot === slot);
    let newDetails = [...bookingDetails];

    if (existingIndex > -1) {
      // Don't allow removing the last slot for this date - at least one must remain
      const slotsForThisDay = bookingDetails.filter(d => d.date === date);
      if (slotsForThisDay.length <= 1) {
        // This is the last slot for this day, don't remove it
        return;
      }
      newDetails.splice(existingIndex, 1);
    } else {
      // Find default event type for this day or from others
      const sameDayDetail = bookingDetails.find(d => d.date === date);
      newDetails.push({
        date,
        timeSlot: slot,
        eventType: isHallExclusive ? "corporate" : (sameDayDetail?.eventType || defaultEventType || "wedding")
      });
    }
    onChange(newDetails.sort((a, b) => a.date.localeCompare(b.date)));
  };

  const updateEventType = (date: string, slot: string, type: string) => {
    const newDetails = bookingDetails.map(d =>
      (d.date === date && d.timeSlot === slot) ? { ...d, eventType: type } : d
    );
    onChange(newDetails);
  };

  const isHallExclusive = halls.find(h => h.id.toString() === hallId.toString())?.isExclusive;

  const eventTypes = [
    { value: "mehandi", label: "Mehandi" },
    { value: "barat", label: "Barat" },
    { value: "walima", label: "Walima" },
    { value: "birthday", label: "Birthday" },
    { value: "corporate", label: "Corporate Event" },
    { value: "wedding", label: "Wedding" },
    { value: "other", label: "Other" },
  ].filter(t => !isHallExclusive || t.value === "corporate");

  return (
    <div className="col-span-full mt-2 space-y-4 p-4 bg-muted/10 rounded-xl border border-muted/30">
      <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
        <NotepadText className="h-4 w-4 text-blue-500" />
        Booking Schedule & Time Slots
      </h4>
      <div className="space-y-4">
        {dates.map((dateStr) => {
          const date = parseLocalDate(dateStr);
          const dayDetails = bookingDetails.filter(d => d.date === dateStr);

          const otherBookings = editBookingId
            ? bookings.filter(b => b.id?.toString() !== editBookingId?.toString())
            : bookings;

          const availableSlots = getAvailableTimeSlots(
            hallId,
            dateStr,
            otherBookings,
            halls,
            reservations
          );

          return (
            <div key={dateStr} className="p-3 bg-background rounded-lg border shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-foreground">
                  {formatDateForDisplay(dateStr)}
                </span>
                <div className="flex gap-1">
                  {["DAY", "NIGHT"].map(slot => {
                    const isActive = dayDetails.some(d => d.timeSlot === slot);
                    const isAvailable = availableSlots.includes(slot) || isActive;

                    return (
                      <Button
                        key={slot}
                        type="button"
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        className={`text-[10px] h-7 px-2 uppercase font-bold tracking-tighter ${!isAvailable ? "opacity-40 cursor-not-allowed" : ""
                          }`}
                        disabled={!isAvailable}
                        onClick={() => toggleSlot(dateStr, slot)}
                      >
                        {slot.charAt(0)}{slot.slice(1).toLowerCase()}
                        {!isAvailable && " (X)"}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {dayDetails.length > 0 && (
                <div className="space-y-2 pl-2 border-l-2 border-blue-100">
                  {dayDetails.map((detail, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 min-w-[80px]">
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">
                          {detail.timeSlot}
                        </span>
                      </div>
                      <Select
                        value={detail.eventType}
                        onValueChange={(val) => updateEventType(dateStr, detail.timeSlot, val)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-muted/20 border-none w-[140px]">
                          <SelectValue placeholder="Event Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {eventTypes.map(t => (
                            <SelectItem key={t.value} value={t.value} className="text-xs">
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}

              {dayDetails.length === 0 && (
                <p className="text-[10px] text-muted-foreground italic pl-2">
                  No slots selected for this day. Click buttons above to add.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper to recalculate head amounts (especially GST which is % of subtotal)
const recalculateHeads = (basePrice: number, currentHeads: any[]) => {
  if (!currentHeads || currentHeads.length === 0) return { updatedHeads: [], totalExtra: 0 };

  // Fixed charges (non-GST)
  const fixedHeads = currentHeads.filter(h => !h.head.startsWith("GST"));
  const fixedTotal = fixedHeads.reduce((sum, h) => sum + (h.amount || 0), 0);
  const subtotal = basePrice + fixedTotal;

  // Percentage charges (GST)
  const updatedHeads = currentHeads.map(h => {
    if (h.head.startsWith("GST")) {
      const match = h.head.match(/\((\d+(?:\.\d+)?)\%\)/);
      const rate = match ? parseFloat(match[1]) : 0;
      if (rate > 0) {
        return { ...h, amount: Math.round((subtotal * rate) / 100) };
      }
    }
    return h;
  });

  const totalExtra = updatedHeads.reduce((sum, h) => sum + (h.amount || 0), 0);
  return { updatedHeads, totalExtra };
};

export default function HallBookings() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editBooking, setEditBooking] = useState<HallBooking | null>(null);
  const [cancelBooking, setCancelBooking] = useState<HallBooking | null>(null);
  const [viewVouchers, setViewVouchers] = useState<HallBooking | null>(null);
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("active");

  const [updateReqBooking, setUpdateReqBooking] = useState<HallBooking | null>(null);
  const [updateStatus, setUpdateStatus] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [adminRemarks, setAdminRemarks] = useState("");
  const [reasonToView, setReasonToView] = useState<{ reason: string; requestedBy: string } | null>(null);
  const [form, setForm] = useState<HallBookingForm>(hallInitialFormState);
  const [editForm, setEditForm] = useState<HallBookingForm>(hallInitialFormState);
  const [availableHalls, setAvailableHalls] = useState<Hall[]>([]);

  // Member search states for create dialog
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberResults, setShowMemberResults] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const [detailBooking, setDetailBooking] = useState<HallBooking | null>(null);
  const [openDetails, setOpenDetails] = useState(false)

  // Extra charges (Heads) local state
  const [localSelectedHead, setLocalSelectedHead] = useState<string>("");
  const [localCustomHeadName, setLocalCustomHeadName] = useState<string>("");
  const [localHeadAmount, setLocalHeadAmount] = useState<string>("");
  const [conflictData, setConflictData] = useState<{
    isOpen: boolean;
    message: string;
    type: string;
    payload: any;
    isEdit: boolean;
  } | null>(null);

  const canAddHead = localSelectedHead === "Others"
    ? (localCustomHeadName.trim() !== "" && parseFloat(localHeadAmount) > 0)
    : (localSelectedHead !== "" && parseFloat(localHeadAmount) > 0);


  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();


  // API Queries
  // Infinite Query for Bookings
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingBookings,
  } = useInfiniteQuery({
    queryKey: ["bookings", "halls", "active"],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await getBookings({ bookingsFor: "halls", pageParam });
      return res as HallBooking[];
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage && lastPage.length === 20
        ? allPages.length + 1
        : undefined;
    },
    enabled: activeTab === "active",
  });

  const {
    data: cancelledData,
    fetchNextPage: fetchNextCancelled,
    hasNextPage: hasNextCancelled,
    isFetchingNextPage: isFetchingNextCancelled,
    isLoading: isLoadingCancelled,
  } = useInfiniteQuery({
    queryKey: ["bookings", "halls", "cancelled"],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await getCancelledBookings({ bookingsFor: "halls", pageParam });
      return res as HallBooking[];
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage && lastPage.length === 20 ? allPages.length + 1 : undefined;
    },
    enabled: activeTab === "cancelled",
  });

  const {
    data: requestData,
    fetchNextPage: fetchNextRequests,
    hasNextPage: hasNextRequests,
    isFetchingNextPage: isFetchingNextRequests,
    isLoading: isLoadingRequests,
  } = useInfiniteQuery({
    queryKey: ["bookings", "halls", "requests"],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await getCancellationRequests({ bookingsFor: "halls", pageParam });
      return res as HallBooking[];
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage && lastPage.length === 20 ? allPages.length + 1 : undefined;
    },
    enabled: activeTab === "requests",
  });

  const bookings = useMemo(() => {
    if (activeTab === "active") return data?.pages.flat() || [];
    if (activeTab === "cancelled") return cancelledData?.pages.flat() || [];
    if (activeTab === "requests") return requestData?.pages.flat() || [];
    return [];
  }, [data, cancelledData, requestData, activeTab]);

  const isLoading = isLoadingBookings || isLoadingCancelled || isLoadingRequests;
  const isFetchingNext = isFetchingNextPage || isFetchingNextCancelled || isFetchingNextRequests;
  const hasNext = activeTab === "active" ? hasNextPage : activeTab === "cancelled" ? hasNextCancelled : hasNextRequests;
  const fetchNext = activeTab === "active" ? fetchNextPage : activeTab === "cancelled" ? fetchNextCancelled : fetchNextRequests;

  const observer = useRef<IntersectionObserver>();
  const lastElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoading || isFetchingNext) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNext) {
          fetchNext();
        }
      });
      if (node) observer.current.observe(node);
    },
    [isLoading, isFetchingNext, hasNext, fetchNext]
  );

  const { data: halls = [], isLoading: isLoadingHalls } = useQuery<Hall[]>({
    queryKey: ["halls"],
    queryFn: async () => (await getHalls()) as Hall[],
  });


  // Member search query with throttling for create dialog
  const {
    data: searchResults = [],
    isLoading: isSearching,
    refetch: searchMembersFn,
  } = useQuery<Member[]>({
    queryKey: ["memberSearch", memberSearch],
    queryFn: async () => (await searchMembers(memberSearch)) as Member[],
    enabled: false,
  });

  const {
    data: vouchers = [],
    isLoading: isLoadingVouchers,
  } = useQuery<Voucher[]>({
    queryKey: ["hall-vouchers", viewVouchers?.id || detailBooking?.id],
    queryFn: () => {
      const id = viewVouchers?.id || detailBooking?.id;
      return id ? getVouchers("HALL", id.toString()) : [];
    },
    enabled: !!viewVouchers || (openDetails && !!detailBooking),
  });

  // Derive reservations from halls
  const reservations = useMemo(() => {
    return halls.flatMap((hall: any) => hall.reservations || []);
  }, [halls]);

  // Fetch date statuses for selected hall(s) - fetch 1 year from today
  // Optimized approach similar to RoomBookings
  const { data: fetchedStatuses } = useQuery({
    queryKey: ["hallDateStatuses", "upcoming", form.hallId],
    queryFn: async () => {
      if (!form.hallId) return null;
      const from = format(new Date(), "yyyy-MM-dd");
      const to = format(addYears(new Date(), 1), "yyyy-MM-dd");
      return await getHallDateStatuses(from, to, [form.hallId]);
    },
    enabled: !!form.hallId,
  });


  // Handle conversion from Reservation
  useEffect(() => {
    const state = location.state as any;
    if (state?.fromReservation) {
      const { reservationId, resourceId, startTime, endTime, timeSlot, remarks } = state;

      setForm(prev => ({
        ...prev,
        reservationId: reservationId,
        hallId: resourceId?.toString() || "",
        bookingDate: format(new Date(startTime), "yyyy-MM-dd"),
        endDate: format(new Date(endTime), "yyyy-MM-dd"),
        bookingTime: (timeSlot as any) || "NIGHT",
        remarks: `Converted from Reservation #${reservationId}${remarks ? ` | ${remarks}` : ""}`
      }));

      setIsAddOpen(true);

      // Clear location state
      window.history.replaceState({}, document.title);
    }
  }, [location.state, halls]);

  const calendarModifiers = useMemo(() => {
    if (!fetchedStatuses) return { booked: [], reserved: [], outOfOrder: [] };

    const booked: Date[] = [];
    const reserved: Date[] = [];
    const outOfOrder: Date[] = [];

    // Process Bookings
    fetchedStatuses.bookings?.forEach((b: any) => {
      // If we have granular details, check dates
      if (b.bookingDetails && Array.isArray(b.bookingDetails)) {
        b.bookingDetails.forEach((d: any) => {
          // If date has ANY slot booked, we marks it blue? 
          // Or should we only mark if ALL slots? 
          // User asked to "color the dates accordingly". 
          // Usually single dot means "something is there".
          // Let's just mark it.
          const date = startOfDay(new Date(d.date));
          if (!booked.some(bd => bd.getTime() === date.getTime())) {
            booked.push(date);
          }
        });
      } else {
        // Legacy
        const date = startOfDay(new Date(b.bookingDate));
        if (!booked.some(bd => bd.getTime() === date.getTime())) {
          booked.push(date);
        }
      }
    });

    // Process Reservations
    fetchedStatuses.reservations?.forEach((r: any) => {
      let current = startOfDay(new Date(r.reservedFrom));
      const end = startOfDay(new Date(r.reservedTo));
      // Use <= to include the end date (halls typically reserve full days)
      while (current <= end) {
        if (!reserved.some(rd => rd.getTime() === current.getTime())) {
          reserved.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }
    });

    // Process Out Of Orders
    fetchedStatuses.outOfOrders?.forEach((ooo: any) => {
      let current = startOfDay(new Date(ooo.startDate));
      const end = startOfDay(new Date(ooo.endDate));
      while (current <= end) {
        if (!outOfOrder.some(od => od.getTime() === current.getTime())) {
          outOfOrder.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }
    });

    return { booked, reserved, outOfOrder };
  }, [fetchedStatuses]);

  // Stable search handler with proper cleanup
  const handleMemberSearch = useCallback(
    (searchTerm: string) => {
      setMemberSearch(searchTerm);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        if (searchTerm.trim().length >= 2) {
          searchMembersFn();
          setShowMemberResults(true);
        } else {
          setShowMemberResults(false);
        }
      }, 300);
    },
    [searchMembersFn]
  );

  // Stable focus handler
  const handleSearchFocus = useCallback(() => {
    if (memberSearch.length >= 2 && searchResults.length > 0) {
      setShowMemberResults(true);
    }
  }, [memberSearch.length, searchResults.length]);

  // Stable member selection handlers
  const handleSelectMember = useCallback((member: Member) => {
    setSelectedMember(member);
    setForm((prev) => ({
      ...prev,
      membershipNo: member.Membership_No || member.membershipNumber || "",
      memberName: member.Name,
      memberId: member.id?.toString(),
    }));
    setMemberSearch("");
    setShowMemberResults(false);
  }, []);

  const handleClearMember = useCallback(() => {
    setSelectedMember(null);
    setForm((prev) => ({
      ...prev,
      membershipNo: "",
      memberName: "",
      memberId: "",
    }));
    setMemberSearch("");
    setShowMemberResults(false);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Filter available halls
  useEffect(() => {
    // Show all active halls that are not out of service
    // Don't filter by isBooked since a hall can have multiple time slots per day
    const filteredHalls = halls.filter(
      (hall: Hall) => hall.isActive && !hall.isOutOfService
    );
    setAvailableHalls(filteredHalls);
  }, [halls]);

  // Mutations
  const createMutation = useMutation<any, Error, Record<string, any>>({
    mutationFn: (payload) => createBooking(payload),
    onSuccess: (response: any) => {
      toast({ title: "Hall booking created successfully" });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setIsAddOpen(false);
      resetForm();
    },
    onError: (error: any, variables: any) => {
      // The API now throws the full error response data if available
      if (error?.status === 409 && error?.type?.startsWith("SOFT_")) {
        setConflictData({
          isOpen: true,
          message: error.message,
          type: error.type,
          payload: variables,
          isEdit: false,
        });
        return;
      }

      toast({
        title: "Failed to create hall booking",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation<any, Error, Record<string, any>>({
    mutationFn: (payload) => updateBooking(payload),
    onSuccess: () => {
      toast({ title: "Hall booking updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setEditBooking(null);
    },
    onError: (error: any, variables: any) => {
      if (error?.status === 409 && error?.type?.startsWith("SOFT_")) {
        setConflictData({
          isOpen: true,
          message: error.message,
          type: error.type,
          payload: variables,
          isEdit: true,
        });
        return;
      }

      toast({
        title: "Failed to update hall booking",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation<
    any,
    Error,
    { bookingFor: string; bookID: string; reason: string }
  >({
    mutationFn: ({ bookingFor, bookID, reason }) =>
      cancelReqBooking(bookingFor, bookID, reason),
    onSuccess: () => {
      toast({ title: "Cancellation request sent" });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setCancelBooking(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to cancel hall booking",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const updateCancellationReqMutation = useMutation<
    any,
    Error,
    {
      bookingFor: string;
      bookID: string;
      status: "APPROVED" | "REJECTED";
      remarks?: string;
    }
  >({
    mutationFn: ({ bookingFor, bookID, status, remarks }) =>
      updateCancellationReq(bookingFor, bookID, status, remarks),
    onSuccess: () => {
      toast({ title: "Cancellation request updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["cancellation-requests"] });
      setUpdateReqBooking(null);
      setAdminRemarks("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update cancellation request",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const createFormChangeHandler = (isEdit: boolean) => {
    return (field: keyof HallBookingForm, value: any) => {
      const setFormFn = isEdit ? setEditForm : setForm;

      setFormFn((prev) => {
        const newForm = { ...prev, [field]: value };

        // Handle hall price recalculation
        if (["hallId", "pricingType", "bookingDate", "endDate"].includes(field as string)) {
          const basePrice = calculateHallPrice(
            halls,
            field === "hallId" ? value : newForm.hallId,
            field === "pricingType" ? value : newForm.pricingType,
            newForm.bookingDetails
          );
          const { updatedHeads, totalExtra } = recalculateHeads(basePrice, newForm.heads || []);
          newForm.heads = updatedHeads;
          newForm.totalPrice = basePrice + totalExtra;

          // Force Corporate Event Type if hall is exclusive
          const selectedHall = halls.find(h => h.id.toString() === (field === "hallId" ? value : newForm.hallId).toString());
          if (selectedHall?.isExclusive) {
            newForm.eventType = "corporate";
            newForm.bookingDetails = newForm.bookingDetails.map(d => ({ ...d, eventType: "corporate" }));
          }

          // Update paid/pending amounts based on new total
          const accounting = calculateHallAccountingValues(
            newForm.paymentStatus as PaymentStatus,
            newForm.totalPrice,
            newForm.paidAmount
          );
          newForm.paidAmount = accounting.paid;
          newForm.pendingAmount = accounting.pendingAmount;

          // Auto-fill advance payment if logic matches
          if (newForm.paymentStatus === "ADVANCE_PAYMENT") {
            const rules = paymentRules.hallBooking.advancePayment;
            if (newForm.totalPrice > rules.threshold) {
              newForm.paidAmount = rules.defaultPaidAmount;
              newForm.pendingAmount = newForm.totalPrice - rules.defaultPaidAmount;
            }
          }

          // AUTO-ADJUST PAYMENT STATUS WHEN HALL/PRICING CHANGES IN EDIT MODE
          if (isEdit) {
            const oldPaid = prev.paidAmount || 0;
            const oldPaymentStatus = prev.paymentStatus;
            const total = newForm.totalPrice;

            if (total < oldPaid) {
              newForm.paymentStatus = "PAID";
              newForm.paidAmount = total;
              newForm.pendingAmount = 0;
            } else if (total > oldPaid && oldPaymentStatus === "PAID") {
              newForm.paymentStatus = "HALF_PAID";
              newForm.paidAmount = oldPaid;
              newForm.pendingAmount = total - oldPaid;
            } else {
              // Standard update for non-PAID or non-exceeding cases
              newForm.pendingAmount = total - newForm.paidAmount;
            }
          }
        }

        // Handle duration change
        if (field === "numberOfDays") {
          if (newForm.bookingDate) {
            const startDate = parseLocalDate(newForm.bookingDate);
            const newEndDate = addDays(startDate, Math.max(1, value) - 1);
            newForm.endDate = format(newEndDate, "yyyy-MM-dd");
            // Set field to "endDate" to trigger the date sync logic below
            field = "endDate" as any;
          }
        }

        // Handle payment status changes
        if (field === "paymentStatus") {
          const accounting = calculateHallAccountingValues(
            value as PaymentStatus,
            newForm.totalPrice,
            newForm.paidAmount
          );
          newForm.paidAmount = accounting.paid;
          newForm.pendingAmount = accounting.pendingAmount;

          // Auto-fill advance payment if logic matches
          if (value === "ADVANCE_PAYMENT") {
            const rules = paymentRules.hallBooking.advancePayment;
            if (newForm.totalPrice > rules.threshold) {
              newForm.paidAmount = rules.defaultPaidAmount;
              newForm.pendingAmount = newForm.totalPrice - rules.defaultPaidAmount;
            }
          }
        }

        // Handle paid amount changes
        if (field === "paidAmount") {
          if (value > newForm.totalPrice) {
            value = newForm.totalPrice;
            newForm.paidAmount = value;
          }
          newForm.pendingAmount = newForm.totalPrice - value;
        }

        // Update bookingDetails when dates or primary event type change
        if (["bookingDate", "endDate", "eventType", "numberOfDays"].includes(field as string)) {
          const start = field === "bookingDate" ? value : newForm.bookingDate;
          const end = field === "endDate" ? value : newForm.endDate;
          const currentHall = halls.find(h => h.id.toString() === newForm.hallId.toString());
          const isExclusive = currentHall?.isExclusive;
          const currentPrimaryEventType = isExclusive ? "corporate" : (field === "eventType" ? value : newForm.eventType);
          const defaultSlot = "DAY";

          if (start) {
            const startDate = parseLocalDate(start);
            const endDate = end ? parseLocalDate(end) : startDate;
            const days = Math.abs(differenceInCalendarDays(endDate, startDate)) + 1;
            newForm.numberOfDays = days;

            const newDetails: { date: string; timeSlot: string; eventType?: string }[] = [];
            for (let i = 0; i < days; i++) {
              const currentCheckDate = addDays(startDate, i);
              const dateStr = format(currentCheckDate, "yyyy-MM-dd");

              const existingDetails = prev.bookingDetails?.filter(d => d.date === dateStr);

              if (existingDetails && existingDetails.length > 0) {
                existingDetails.forEach(d => {
                  newDetails.push({
                    ...d,
                    date: dateStr, // Ensure standard format
                    eventType: field === "eventType" ? value : (d.eventType || currentPrimaryEventType)
                  });
                });
              } else {
                newDetails.push({
                  date: dateStr,
                  timeSlot: defaultSlot,
                  eventType: currentPrimaryEventType
                });
              }
            }
            newForm.bookingDetails = newDetails;

            // Recalculate price as slot count might have changed
            const basePrice = calculateHallPrice(halls, newForm.hallId, newForm.pricingType as PricingType, newForm.bookingDetails);
            const { updatedHeads, totalExtra } = recalculateHeads(basePrice, newForm.heads || []);
            newForm.heads = updatedHeads;
            const total = basePrice + totalExtra;
            newForm.totalPrice = total;

            if (isEdit) {
              const oldPaid = prev.paidAmount || 0;
              const oldPaymentStatus = prev.paymentStatus;

              if (total < oldPaid) {
                newForm.paymentStatus = "PAID";
                newForm.paidAmount = total;
                newForm.pendingAmount = 0;
              } else if (total > oldPaid && oldPaymentStatus === "PAID") {
                newForm.paymentStatus = "HALF_PAID";
                newForm.paidAmount = oldPaid;
                newForm.pendingAmount = total - oldPaid;
              } else {
                newForm.pendingAmount = total - newForm.paidAmount;
              }
            } else {
              newForm.pendingAmount = total - newForm.paidAmount;
            }
          }
        }

        return newForm;
      });
    };
  };

  const handleFormChange = createFormChangeHandler(false);
  const handleEditFormChange = createFormChangeHandler(true);

  const handleCreate = () => {
    // Check if required fields are filled
    if (
      !form.membershipNo ||
      !form.hallId ||
      !form.bookingDate ||
      !form.eventType ||
      !form.eventTime ||
      form.numberOfGuests < 1
    ) {
      toast({
        title: "Please fill all required fields",
        description:
          "Membership, Hall, Booking Date, and Event Type are required",
        variant: "destructive",
      });
      return;
    }

    // Validate booking date
    const bookingDate = parseLocalDate(form.bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today && editForm.bookingDate === "") {
      // console.log(editForm)
      toast({
        title: "Invalid booking date",
        description: "Booking date cannot be in the past",
        variant: "destructive",
      });
      return;
    }

    // Validate paid amount for half-paid status
    if (form.paymentStatus === "HALF_PAID" && form.paidAmount <= 0) {
      toast({
        title: "Invalid paid amount",
        description: "Please enter a valid paid amount for half-paid status",
        variant: "destructive",
      });
      return;
    }

    // Final conflict check before submission
    const conflict = checkHallConflicts(
      form.hallId,
      form.bookingDate,
      form.endDate || form.bookingDate,
      form.eventTime,
      bookings,
      halls,
      reservations,
      undefined,
      form.bookingDetails
    );

    if (conflict.hasConflict) {
      toast({
        title: "Booking Conflict",
        description: conflict.message,
        variant: "destructive",
      });
      return;
    }

    const payload = {
      category: "Hall",
      membershipNo: form.membershipNo,
      entityId: form.hallId,
      bookingDate: form.bookingDate,
      eventType: form.eventType,
      eventTime: form.bookingDetails[0]?.timeSlot || "DAY",
      endDate: form.endDate,
      totalPrice: form.totalPrice.toString(),
      paymentStatus: form.paymentStatus,
      numberOfGuests: form.numberOfGuests || 0,
      paidAmount: form.paidAmount,
      pendingAmount: form.pendingAmount,
      pricingType: form.pricingType,
      paymentMode: form.paymentMode,
      card_number: form.card_number,
      check_number: form.check_number,
      bank_name: form.bank_name,
      paidBy: form.paidBy,
      guestName: form.guestName,
      guestContact: form.guestContact,
      remarks: form.remarks,
      bookingDetails: form.bookingDetails,
      reservationId: form.reservationId,
      heads: form.heads,
    };

    createMutation.mutate(payload);
  };

  const handleUpdate = () => {

    // console.log(editForm)
    // Enhanced validation that handles null/undefined values
    const requiredFields = [
      { field: editForm.membershipNo, name: "Membership" },
      { field: editForm.hallId, name: "Hall" },
      { field: editForm.bookingDate, name: "Booking Date" },
      { field: editForm.eventType, name: "Event Type" },
      { field: editForm.numberOfGuests, name: "Number of Guests" }
    ];

    const missingFields = requiredFields.filter(
      ({ field }) => !field || field.toString().trim() === ""
    );

    if (editForm.numberOfGuests < 1) {
      toast({
        title: "Invalid number of guests",
        description: "Number of guests must be at least 1",
        variant: "destructive",
      });
      return;
    }

    if (missingFields.length > 0) {
      toast({
        title: "Please fill all required fields",
        description: `Missing: ${missingFields.map((f) => f.name).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // Validate booking date
    const bookingDate = parseLocalDate(editForm.bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0)

    // Validate paid amount for half-paid status
    if (editForm.paymentStatus === "HALF_PAID" && editForm.paidAmount <= 0) {
      toast({
        title: "Invalid paid amount",
        description: "Please enter a valid paid amount for half-paid status",
        variant: "destructive",
      });
      return;
    }

    // Final conflict check before submission
    const conflict = checkHallConflicts(
      editForm.hallId,
      editForm.bookingDate,
      editForm.endDate || editForm.bookingDate,
      editForm.eventTime,
      bookings,
      halls,
      reservations,
      editBooking?.id?.toString(),
      editForm.bookingDetails
    );

    if (conflict.hasConflict) {
      toast({
        title: "Booking Conflict",
        description: conflict.message,
        variant: "destructive",
      });
      return;
    }
    const payload = {
      id: editBooking?.id?.toString(),
      category: "Hall",
      membershipNo: editForm.membershipNo,
      entityId: editForm.hallId,
      bookingDate: editForm.bookingDate,
      eventType: editForm.eventType,
      eventTime: editForm.bookingDetails[0]?.timeSlot || "DAY",
      endDate: editForm.endDate,
      numberOfGuests: editForm.numberOfGuests || 0,
      totalPrice: editForm.totalPrice.toString(),
      paymentStatus: editForm.paymentStatus,
      paidAmount: editForm.paidAmount,
      pendingAmount: editForm.pendingAmount,
      pricingType: editForm.pricingType,
      paymentMode: editForm.paymentMode,
      card_number: editForm.card_number,
      check_number: editForm.check_number,
      bank_name: editForm.bank_name,
      paidBy: editForm.paidBy,
      guestName: editForm.guestName,
      guestContact: editForm.guestContact,
      remarks: editForm.remarks,
      bookingDetails: editForm.bookingDetails,
      heads: editForm.heads,
    };

    updateMutation.mutate(payload);
  };

  const handleDelete = (reason: string) => {
    if (cancelBooking) {
      deleteMutation.mutate({
        bookingFor: "halls",
        bookID: cancelBooking.id.toString(),
        reason,
      });
    }
  };

  const handleApproveReq = useCallback((booking: HallBooking) => {
    setUpdateReqBooking(booking);
    setUpdateStatus("APPROVED");
    setAdminRemarks("");
  }, []);

  const handleRejectReq = useCallback((booking: HallBooking) => {
    setUpdateReqBooking(booking);
    setUpdateStatus("REJECTED");
    setAdminRemarks("");
  }, []);

  const handleViewReason = useCallback((booking: HallBooking) => {
    setReasonToView({
      reason: (booking as any).cancellationRequest?.reason || "No reason provided.",
      requestedBy: (booking as any).cancellationRequest?.requestedBy || "Unknown"
    });
  }, []);

  const handleViewVouchers = (booking: HallBooking) => {
    setViewVouchers(booking);
  };

  const filteredBookings =
    paymentFilter === "ALL"
      ? bookings
      : bookings?.filter(
        (booking: HallBooking) => booking.paymentStatus === paymentFilter
      );

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-green-600 text-white">Paid</Badge>;
      case "HALF_PAID":
        return <Badge className="bg-yellow-600 text-white">Half Paid</Badge>;
      case "UNPAID":
        return <Badge variant="destructive">Unpaid</Badge>;
      case "TO_BILL":
        return <Badge className="bg-blue-600 text-white">To Bill</Badge>;
      case "ADVANCE_PAYMENT":
        return <Badge className="bg-purple-600 text-white">Advance Payment</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };



  const resetForm = () => {
    setForm(hallInitialFormState);
    setMemberSearch("");
    setSelectedMember(null);
    setShowMemberResults(false);
  };

  const resetEditForm = () => {
    setEditForm(hallInitialFormState);
    setEditBooking(null);
  };

  // Update edit form when editBooking changes
  useEffect(() => {
    if (editBooking) {
      // console.log(editBooking)
      const newEditForm: HallBookingForm = {
        membershipNo: editBooking.member?.Membership_No || "",
        memberName: editBooking.memberName || editBooking.member?.Name || "",
        memberId: editBooking.memberId
          ? editBooking.memberId.toString()
          : "",
        category: "Hall",
        hallId: editBooking.hallId?.toString() || "",
        bookingDate: editBooking.bookingDate
          ? format(parseLocalDate(editBooking.bookingDate), "yyyy-MM-dd")
          : "",
        eventType: editBooking.eventType || "",
        eventTime: editBooking.bookingTime || "DAY" as any as HallBookingTime,
        pricingType: editBooking.pricingType || "member" as any as PricingType,
        totalPrice: Number(editBooking.totalPrice) || 0,
        numberOfGuests: Number(editBooking.numberOfGuests),
        paymentStatus: editBooking.paymentStatus || "UNPAID" as any as PaymentStatus,
        paidAmount: Number(editBooking.paidAmount) || 0,
        pendingAmount: Number(editBooking.pendingAmount) || 0,
        numberOfDays: editBooking.numberOfDays || (editBooking.endDate && editBooking.bookingDate ? Math.abs(differenceInCalendarDays(parseLocalDate(editBooking.endDate), parseLocalDate(editBooking.bookingDate))) + 1 : 1),
        paymentMode: (editBooking as any).paymentMode || "CASH",
        card_number: (editBooking as any).card_number || "",
        check_number: (editBooking as any).check_number || "",
        bank_name: (editBooking as any).bank_name || "",
        paidBy: editBooking.paidBy,
        guestName: editBooking.guestName,
        guestContact: editBooking.guestContact,
        guestCNIC: editBooking.guestCNIC,
        remarks: editBooking.remarks || "",
        endDate: editBooking.endDate ? format(parseLocalDate(editBooking.endDate), "yyyy-MM-dd") : "",
        heads: editBooking.extraCharges || [],
        bookingDetails: (() => {
          const details = (editBooking.bookingDetails as any[]) || [];
          if (details.length > 0) {
            // Ensure dates are yyyy-MM-dd strings in LOCAL time for consistency
            return details.map(d => {
              let dateStr = d.date;
              // If date comes as ISO string from backend (e.g., 2025-12-27T19:00:00.000Z),
              // we need to parse it as a Date and format it in local time
              // because 7PM UTC = midnight next day in Pakistan (UTC+5)
              if (typeof dateStr === 'string' && dateStr.includes('T')) {
                const dateObj = new Date(dateStr);
                // Format in local time (yyyy-MM-dd)
                dateStr = format(dateObj, "yyyy-MM-dd");
              }
              return {
                date: dateStr,
                timeSlot: d.timeSlot,
                eventType: d.eventType || editBooking.eventType
              };
            });
          }
          // Legacy support: generate based on range
          const start = parseLocalDate(editBooking.bookingDate);
          const end = editBooking.endDate ? parseLocalDate(editBooking.endDate) : start;
          const days = Math.abs(differenceInCalendarDays(end, start)) + 1;
          const generated = [];
          for (let i = 0; i < days; i++) {
            generated.push({
              date: format(addDays(start, i), "yyyy-MM-dd"),
              timeSlot: editBooking.bookingTime || "DAY",
              eventType: editBooking.eventType
            });
          }
          return generated;
        })(),
      };
      setEditForm(newEditForm);
    }
  }, [editBooking]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Hall Bookings
          </h2>
          <p className="text-muted-foreground">
            Manage event hall reservations
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="HALF_PAID">Half Paid</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="TO_BILL">To Bill</SelectItem>
              <SelectItem value="ADVANCE_PAYMENT">Advance Payment</SelectItem>
            </SelectContent>
          </Select>
          <Dialog
            open={isAddOpen}
            onOpenChange={(open) => {
              setIsAddOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Booking
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl max-h-fit overflow-hidden">
              <DialogHeader className="border-b pb-4">
                <DialogTitle>Create Hall Booking</DialogTitle>
              </DialogHeader>

              {/* Horizontal layout with two columns */}
              <div className="flex gap-6 py-4 h-[calc(90vh-120px)] overflow-hidden">
                {/* Left Column - Main Form Fields */}
                <div className="w-1/2 overflow-y-auto pr-2 space-y-4">
                  {/* Member Search for Create */}
                  <div className="space-y-2">
                    <Label>Member *</Label>
                    <MemberSearchComponent
                      searchTerm={memberSearch}
                      onSearchChange={handleMemberSearch}
                      showResults={showMemberResults}
                      searchResults={searchResults}
                      isSearching={isSearching}
                      selectedMember={selectedMember}
                      onSelectMember={handleSelectMember}
                      onClearMember={handleClearMember}
                      onFocus={handleSearchFocus}
                    />
                  </div>

                  {/* Hall Selection */}
                  <div className="space-y-2">
                    <Label>Hall *</Label>
                    {isLoadingHalls ? (
                      <div className="h-10 bg-muted animate-pulse rounded-md" />
                    ) : (
                      <Select
                        value={form.hallId}
                        onValueChange={(val) => handleFormChange("hallId", val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select hall" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableHalls.map((hall: Hall) => (
                            <SelectItem key={hall.id} value={hall.id.toString()}>
                              {hall.name} - Capacity: {hall.capacity} | PKR{" "}
                              {hall.chargesMembers.toLocaleString()} (Member) /
                              PKR {hall.chargesGuests.toLocaleString()} (Guest)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Booking Dates */}
                  <div className="space-y-2">
                    <Label>Booking Dates *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal h-10 bg-muted/30 border-none shadow-none",
                            !form.bookingDate && "text-muted-foreground"
                          )}
                        >
                          <NotepadText className="mr-2 h-4 w-4" />
                          {form.bookingDate ? (
                            form.endDate && form.endDate !== form.bookingDate ? (
                              <>
                                {format(parseLocalDate(form.bookingDate), "LLL dd, y")} -{" "}
                                {format(parseLocalDate(form.endDate), "LLL dd, y")}
                              </>
                            ) : (
                              format(parseLocalDate(form.bookingDate), "LLL dd, y")
                            )
                          ) : (
                            <span>Select dates</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={form.bookingDate ? parseLocalDate(form.bookingDate) : new Date()}
                          selected={{
                            from: form.bookingDate ? parseLocalDate(form.bookingDate) : undefined,
                            to: form.endDate ? parseLocalDate(form.endDate) : undefined,
                          }}
                          onSelect={(range) => {
                            if (range?.from) {
                              const fromStr = format(range.from, "yyyy-MM-dd");
                              const toStr = range.to ? format(range.to, "yyyy-MM-dd") : fromStr;
                              handleFormChange("bookingDate", fromStr);
                              handleFormChange("endDate", toStr);
                            } else {
                              handleFormChange("bookingDate", "");
                              handleFormChange("endDate", "");
                            }
                          }}
                          numberOfMonths={2}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          modifiers={calendarModifiers}
                          modifiersClassNames={{
                            today: "border-2 border-primary bg-transparent text-primary hover:bg-transparent hover:text-primary",
                            booked: "bg-blue-100 border-blue-200 text-blue-900 font-semibold rounded-none",
                            reserved: "bg-amber-100 border-amber-200 text-amber-900 font-semibold rounded-none",
                            outOfOrder: "bg-red-100 border-red-200 text-red-900 font-semibold rounded-none",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    {form.bookingDate && form.endDate && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <NotepadText className="h-3 w-3" />
                        Total duration: {Math.abs(differenceInCalendarDays(parseLocalDate(form.endDate), parseLocalDate(form.bookingDate))) + 1} days
                      </p>
                    )}
                  </div>

                  {/* Event Type and Pricing Type in a row */}
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>Event Type *</Label>
                      <Select
                        value={form.eventType}
                        onValueChange={(val) => handleFormChange("eventType", val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const selectedHall = halls.find(h => h.id.toString() === form.hallId.toString());
                            const isExclusive = selectedHall?.isExclusive;
                            if (isExclusive) {
                              return <SelectItem value="corporate">Corporate Event</SelectItem>;
                            }
                            return (
                              <>
                                <SelectItem value="mehandi">Mehandi</SelectItem>
                                <SelectItem value="barat">Barat</SelectItem>
                                <SelectItem value="walima">Walima</SelectItem>
                                <SelectItem value="birthday">Birthday</SelectItem>
                                <SelectItem value="corporate">Corporate Event</SelectItem>
                                <SelectItem value="wedding">Wedding</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </>
                            );
                          })()}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1 space-y-2">
                      <Label>Pricing Type</Label>
                      <Select
                        value={form.pricingType}
                        onValueChange={(val) => handleFormChange("pricingType", val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="guest">Guest</SelectItem>
                          <SelectItem value="corporate">Corporate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Number of Guests */}
                  <div className="space-y-2">
                    <Label>Number of Guests *</Label>
                    <Input
                      type="number"
                      value={form.numberOfGuests || ""}
                      onChange={(e) => handleFormChange("numberOfGuests", parseInt(e.target.value) || 0)}
                      placeholder="Enter number of guests"
                      min="1"
                    />
                  </div>

                  {/* Remarks */}
                  <div className="space-y-2">
                    <Label>Remarks (Optional)</Label>
                    <textarea
                      className="w-full p-2 border rounded-md resize-none min-h-[80px] text-sm"
                      placeholder="Add notes about this booking (e.g., special arrangements, event details, etc.)"
                      value={form.remarks || ""}
                      onChange={(e) => handleFormChange("remarks", e.target.value)}
                    />
                    <div className="text-xs text-muted-foreground">
                      These remarks will be stored with the booking record
                    </div>
                  </div>

                  {/* Guest Information - Conditional */}
                  {form.pricingType === "guest" && (
                    <div className="p-3 rounded-lg border bg-gray-50">
                      <h3 className="text-sm font-semibold mb-3 text-foreground/80 flex items-center gap-2">
                        <NotepadText className="h-4 w-4 text-blue-500" />
                        Guest Information
                      </h3>
                      <div className="space-y-3">
                        <Input
                          value={form.guestName || ""}
                          onChange={(e) => handleFormChange("guestName", e.target.value)}
                          placeholder="Guest Name *"
                        />
                        <Input
                          type="text"
                          value={form.guestContact || ""}
                          onChange={(e) => handleFormChange("guestContact", e.target.value)}
                          placeholder="Contact Number *"
                        />
                        <Input
                          value={form.guestCNIC || ""}
                          onChange={(e) => handleFormChange("guestCNIC", e.target.value)}
                          placeholder="Guest CNIC (Optional)"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Time Slots and Payment */}
                <div className="w-1/2 overflow-y-auto pl-2 space-y-4 border-l">
                  {/* Extra Charges (Heads) Section */}
                  <div className="border p-3 rounded-lg bg-gray-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Plus className="h-4 w-4 text-blue-500" />
                        Extra Charges (Heads)
                      </h4>
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className={cn("col-span-12 md:col-span-5", localSelectedHead === "Others" ? "md:col-span-3" : "md:col-span-5")}>
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Type</Label>
                        <Select
                          value={localSelectedHead}
                          onValueChange={(val) => {
                            setLocalSelectedHead(val);
                            setLocalHeadAmount("");
                            if (val !== "Others") setLocalCustomHeadName("");
                          }}
                        >
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Stage">Stage</SelectItem>
                            <SelectItem value="DJ">DJ</SelectItem>
                            <SelectItem value="Food/menu">Food / Menu</SelectItem>
                            <SelectItem value="GST">GST Tax (%)</SelectItem>
                            <SelectItem value="Others">Others</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {localSelectedHead === "Others" && (localCustomHeadName !== undefined || true) && (
                        <div className="col-span-12 md:col-span-3">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Name</Label>
                          <Input
                            className="h-8 text-xs mt-1"
                            placeholder="Head name"
                            value={localCustomHeadName}
                            onChange={(e) => setLocalCustomHeadName(e.target.value)}
                          />
                        </div>
                      )}

                      <div className="col-span-12 md:col-span-4">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Amount / %</Label>
                        <div className="relative mt-1">
                          <Input
                            type="number"
                            placeholder="0"
                            className="h-8 text-xs pl-7"
                            value={localHeadAmount}
                            onChange={(e) => setLocalHeadAmount(e.target.value)}
                          />
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">
                            {localSelectedHead === "GST" ? "%" : "Rs"}
                          </div>
                        </div>
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full h-8 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                          disabled={!canAddHead}
                          onClick={() => {
                            const rate = parseFloat(localHeadAmount || "0");
                            if (rate <= 0) return;

                            let headName = localSelectedHead === "Others" ? localCustomHeadName : localSelectedHead;
                            let amount = rate;

                            if (localSelectedHead === "GST") {
                              headName = `GST (${rate}%)`;
                              const basePrice = calculateHallPrice(halls, form.hallId, form.pricingType as PricingType, form.bookingDetails);
                              const fixedHeadsTotal = (form.heads || []).filter(h => !h.head.startsWith("GST")).reduce((sum, h) => sum + h.amount, 0);
                              amount = Math.round(((basePrice + fixedHeadsTotal) * rate) / 100);
                            }

                            const newHeads = [...(form.heads || []), { head: headName, amount }];
                            const basePrice = calculateHallPrice(halls, form.hallId, form.pricingType as PricingType, form.bookingDetails);
                            const { updatedHeads, totalExtra } = recalculateHeads(basePrice, newHeads);

                            const isEdit = !!editBooking;
                            const oldPaid = isEdit ? Number(editBooking.paidAmount) : 0;
                            const oldPaymentStatus = isEdit ? editBooking.paymentStatus : "UNPAID";
                            const totalPrice = basePrice + totalExtra;

                            setForm(prev => {
                              const newForm = {
                                ...prev,
                                heads: updatedHeads,
                                totalPrice: totalPrice,
                              };

                              if (isEdit) {
                                if (totalPrice > oldPaid && oldPaymentStatus === "PAID") {
                                  newForm.paymentStatus = "HALF_PAID" as any;
                                  newForm.paidAmount = oldPaid;
                                  newForm.pendingAmount = totalPrice - oldPaid;
                                } else if (totalPrice < oldPaid) {
                                  newForm.paymentStatus = "PAID" as any;
                                  newForm.paidAmount = totalPrice;
                                  newForm.pendingAmount = 0;
                                } else {
                                  newForm.pendingAmount = prev.paymentStatus === "TO_BILL" ? 0 : totalPrice - prev.paidAmount;
                                }
                              } else {
                                newForm.pendingAmount = prev.paymentStatus === "TO_BILL" ? 0 : totalPrice - prev.paidAmount;
                              }
                              return newForm;
                            });

                            setLocalSelectedHead("");
                            setLocalHeadAmount("");
                            setLocalCustomHeadName("");
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>

                    {form.heads && form.heads.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
                        {form.heads.map((h, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-white border rounded px-2 py-1 group shadow-sm">
                            <span className="text-[10px] font-medium text-muted-foreground">{h.head}:</span>
                            <span className="text-[10px] font-bold">PKR {h.amount.toLocaleString()}</span>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-red-500 transition-colors"
                              onClick={() => {
                                const remainingHeads = form.heads?.filter((_, i) => i !== idx) || [];
                                const basePrice = calculateHallPrice(halls, form.hallId, form.pricingType as PricingType, form.bookingDetails);
                                const { updatedHeads, totalExtra } = recalculateHeads(basePrice, remainingHeads);

                                const isEdit = !!editBooking;
                                const oldPaid = isEdit ? Number(editBooking.paidAmount) : 0;
                                const oldPaymentStatus = isEdit ? editBooking.paymentStatus : "UNPAID";
                                const totalPrice = basePrice + totalExtra;

                                setForm(prev => {
                                  const newForm = {
                                    ...prev,
                                    heads: updatedHeads,
                                    totalPrice: totalPrice,
                                  };

                                  if (isEdit) {
                                    if (totalPrice > oldPaid && oldPaymentStatus === "PAID") {
                                      newForm.paymentStatus = "HALF_PAID" as any;
                                      newForm.paidAmount = oldPaid;
                                      newForm.pendingAmount = totalPrice - oldPaid;
                                    } else if (totalPrice < oldPaid) {
                                      newForm.paymentStatus = "PAID" as any;
                                      newForm.paidAmount = totalPrice;
                                      newForm.pendingAmount = 0;
                                    } else {
                                      newForm.pendingAmount = prev.paymentStatus === "TO_BILL" ? 0 : Math.max(0, totalPrice - prev.paidAmount);
                                    }
                                  } else {
                                    newForm.pendingAmount = prev.paymentStatus === "TO_BILL" ? 0 : Math.max(0, totalPrice - prev.paidAmount);
                                  }
                                  return newForm;
                                });
                              }}
                            >
                              <XCircle className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Time Slot Selector */}
                  {form.bookingDate && form.endDate && (
                    <div className="space-y-2">
                      <Label>Time Slots *</Label>
                      <IndividualTimeSlotSelector
                        bookingDetails={form.bookingDetails}
                        hallId={form.hallId}
                        bookings={(fetchedStatuses?.bookings as HallBooking[]) || bookings}
                        halls={halls}
                        reservations={fetchedStatuses?.reservations || reservations}
                        onChange={(newDetails) => {
                          setForm(prev => {
                            const basePrice = calculateHallPrice(halls, prev.hallId, prev.pricingType as PricingType, newDetails);
                            const { updatedHeads, totalExtra } = recalculateHeads(basePrice, prev.heads || []);
                            const totalPrice = basePrice + totalExtra;

                            const isEdit = !!editBooking;
                            const oldPaid = isEdit ? Number(editBooking.paidAmount) : 0;
                            const oldPaymentStatus = isEdit ? editBooking.paymentStatus : "UNPAID";

                            const newForm = {
                              ...prev,
                              bookingDetails: newDetails,
                              heads: updatedHeads,
                              totalPrice: totalPrice,
                            };

                            if (isEdit) {
                              if (totalPrice > oldPaid && oldPaymentStatus === "PAID") {
                                newForm.paymentStatus = "HALF_PAID" as any;
                                newForm.paidAmount = oldPaid;
                                newForm.pendingAmount = totalPrice - oldPaid;
                              } else if (totalPrice < oldPaid) {
                                newForm.paymentStatus = "PAID" as any;
                                newForm.paidAmount = totalPrice;
                                newForm.pendingAmount = 0;
                              } else {
                                newForm.pendingAmount = totalPrice - prev.paidAmount;
                              }
                            } else {
                              newForm.pendingAmount = totalPrice - prev.paidAmount;
                            }
                            return newForm;
                          });
                        }}
                        defaultEventType={form.eventType}
                      />
                    </div>
                  )}

                  {/* Payment Section */}
                  <div className="space-y-2">
                    <Label className="text-lg">Payment Details</Label>
                    <HallPaymentSection form={form} onChange={handleFormChange} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <DialogFooter className="border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending || !selectedMember}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    "Create Booking"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="active">Active Bookings</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled Bookings</TabsTrigger>
          <TabsTrigger value="requests">Cancellation Requests</TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {isLoading ? (
              <div className="flex justify-center items-center py-32">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-32 text-muted-foreground text-lg">
                {activeTab === "active" ? "No hall bookings found" :
                  activeTab === "cancelled" ? "No cancelled bookings" :
                    "No cancellation requests"}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Hall</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Total Price</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking: HallBooking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                          {booking.member?.Name || booking.member?.Membership_No}
                        </TableCell>
                        <TableCell>
                          {booking.hall?.name || booking.hallName}
                        </TableCell>
                        <TableCell>
                          {formatDateForDisplay(booking.bookingDate)}
                          {booking.endDate &&
                            booking.endDate !== booking.bookingDate && (
                              <> - {formatDateForDisplay(booking.endDate)}</>
                            )}
                        </TableCell>
                        <TableCell>{booking.eventType}</TableCell>
                        <TableCell>
                          {(() => {
                            if (
                              booking.bookingDetails &&
                              booking.bookingDetails.length > 0
                            ) {
                              if (booking.bookingDetails.length === 1)
                                return booking.bookingDetails[0].timeSlot;
                              return `${booking.bookingDetails.length} Slots`;
                            }
                            return booking.bookingTime;
                          })()}
                        </TableCell>
                        <TableCell>
                          PKR {booking.totalPrice?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {getPaymentBadge(booking.paymentStatus)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDetailBooking(booking);
                                setOpenDetails(true);
                              }}
                              title="Booking Details"
                            >
                              <NotepadText />
                            </Button>
                            {(activeTab === "active" || activeTab === "cancelled") && (
                              <>
                                {activeTab === "active" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEditBooking(booking)}
                                    title="Edit Booking"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                {booking.paymentStatus !== "UNPAID" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewVouchers(booking)}
                                    title="View Vouchers"
                                  >
                                    <Receipt className="h-4 w-4" />
                                  </Button>
                                )}
                                {activeTab === "active" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() => setCancelBooking(booking)}
                                    title="Cancel Booking"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                            {activeTab === "requests" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600"
                                  onClick={() => handleApproveReq(booking)}
                                  title="Approve Cancellation"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => handleRejectReq(booking)}
                                  title="Reject Cancellation"
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewReason(booking)}
                                  title="View Reason"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* Scroll Trigger & Loader */}
                <div
                  ref={lastElementRef}
                  className="h-10 w-full flex items-center justify-center mt-4"
                >
                  {isFetchingNext && (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  )}
                  {!hasNext && bookings.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      No more bookings
                    </span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog
        open={!!editBooking}
        onOpenChange={(open) => {
          if (!open) resetEditForm();
        }}
      >
        <DialogContent className="max-w-6xl overflow-hidden">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>Edit Hall Booking</DialogTitle>
          </DialogHeader>

          {/* Horizontal layout with two columns */}
          <div className="flex gap-6 py-4 h-[calc(90vh-120px)] overflow-hidden">
            {/* Left Column - Main Form Fields */}
            <div className="w-1/2 overflow-y-auto pr-2 space-y-4">
              {/* Member Information Display (Read-only) */}
              <div className="space-y-2">
                <Label>Member Information</Label>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm flex items-center">
                        <User className="h-4 w-4 mr-2 text-blue-600" />
                        {editBooking?.member?.Name || editBooking?.memberName}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {editBooking?.Membership_No &&
                          `Membership: #${editBooking.Membership_No}`}
                        {editBooking?.member?.Balance !== undefined && (
                          <div className="mt-1 space-y-1">
                            <Badge
                              variant={
                                editBooking.member.Balance >= 0
                                  ? "outline"
                                  : "destructive"
                              }
                              className="bg-blue-100 text-blue-800"
                            >
                              Account Balance: PKR{" "}
                              {editBooking.member.Balance.toLocaleString()}
                            </Badge>
                            <div className="text-xs">
                              <span className="text-green-700">
                                DR: PKR{" "}
                                {editBooking.member.drAmount?.toLocaleString() || "0"}
                              </span>
                              {" • "}
                              <span className="text-red-700">
                                CR: PKR{" "}
                                {editBooking.member.crAmount?.toLocaleString() || "0"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      Current Booking
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Conflict Warning */}
              {editForm.hallId && editForm.bookingDate && editForm.eventTime && (
                <div>
                  {(() => {
                    const conflict = checkHallConflicts(
                      editForm.hallId,
                      editForm.bookingDate,
                      editForm.endDate,
                      editForm.eventTime,
                      bookings,
                      halls,
                      reservations,
                      editBooking?.id?.toString(),
                      editForm.bookingDetails
                    );
                    if (conflict.hasConflict) {
                      return (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700 text-sm">
                          <XCircle className="h-4 w-4" />
                          <span>{conflict.message}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {/* Hall Selection */}
              <div className="space-y-2">
                <Label>Hall *</Label>
                {isLoadingHalls ? (
                  <div className="h-10 bg-muted animate-pulse rounded-md" />
                ) : (
                  <Select
                    value={editForm.hallId}
                    onValueChange={(val) => {
                      handleEditFormChange("hallId", val);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select hall" />
                    </SelectTrigger>
                    <SelectContent>
                      {halls.map((hall: Hall) => (
                        <SelectItem key={hall.id} value={hall.id.toString()}>
                          {hall.name} - Capacity: {hall.capacity} | PKR{" "}
                          {hall.chargesMembers.toLocaleString()} (Member) / PKR{" "}
                          {hall.chargesGuests.toLocaleString()} (Guest)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Booking Dates */}
              <div className="space-y-2">
                <Label>Booking Dates *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal h-10 bg-muted/30 border-none shadow-none",
                        !editForm.bookingDate && "text-muted-foreground"
                      )}
                    >
                      <NotepadText className="mr-2 h-4 w-4" />
                      {editForm.bookingDate ? (
                        editForm.endDate && editForm.endDate !== editForm.bookingDate ? (
                          <>
                            {format(parseLocalDate(editForm.bookingDate), "LLL dd, y")} -{" "}
                            {format(parseLocalDate(editForm.endDate), "LLL dd, y")}
                          </>
                        ) : (
                          format(parseLocalDate(editForm.bookingDate), "LLL dd, y")
                        )
                      ) : (
                        <span>Select dates</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={editForm.bookingDate ? parseLocalDate(editForm.bookingDate) : new Date()}
                      selected={{
                        from: editForm.bookingDate ? parseLocalDate(editForm.bookingDate) : undefined,
                        to: editForm.endDate ? parseLocalDate(editForm.endDate) : undefined,
                      }}
                      onSelect={(range) => {
                        if (range?.from) {
                          const fromStr = format(range.from, "yyyy-MM-dd");
                          const toStr = range.to ? format(range.to, "yyyy-MM-dd") : fromStr;
                          handleEditFormChange("bookingDate", fromStr);
                          handleEditFormChange("endDate", toStr);
                        } else {
                          handleEditFormChange("bookingDate", "");
                          handleEditFormChange("endDate", "");
                        }
                      }}
                      numberOfMonths={2}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                    />
                  </PopoverContent>
                </Popover>
                {editForm.bookingDate && editForm.endDate && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <NotepadText className="h-3 w-3" />
                    Total duration: {Math.abs(differenceInCalendarDays(parseLocalDate(editForm.endDate), parseLocalDate(editForm.bookingDate))) + 1} days
                  </p>
                )}
              </div>

              {/* Event Type and Pricing Type in a row */}
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Event Type *</Label>
                  <Select
                    value={editForm.eventType}
                    onValueChange={(val) => handleEditFormChange("eventType", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const selectedHall = halls.find(h => h.id.toString() === editForm.hallId.toString());
                        const isExclusive = selectedHall?.isExclusive;
                        if (isExclusive) {
                          return <SelectItem value="corporate">Corporate Event</SelectItem>;
                        }
                        return (
                          <>
                            <SelectItem value="mehandi">Mehandi</SelectItem>
                            <SelectItem value="barat">Barat</SelectItem>
                            <SelectItem value="walima">Walima</SelectItem>
                            <SelectItem value="birthday">Birthday</SelectItem>
                            <SelectItem value="corporate">Corporate Event</SelectItem>
                            <SelectItem value="wedding">Wedding</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </>
                        );
                      })()}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 space-y-2">
                  <Label>Pricing Type</Label>
                  <Select
                    value={editForm.pricingType}
                    onValueChange={(val) => handleEditFormChange("pricingType", val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="guest">Guest</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Number of Guests */}
              <div className="space-y-2">
                <Label>Number of Guests *</Label>
                <Input
                  type="number"
                  value={editForm.numberOfGuests || ""}
                  onChange={(e) => handleEditFormChange("numberOfGuests", parseInt(e.target.value) || 0)}
                  placeholder="Enter number of guests"
                  min="1"
                />
              </div>

              {/* Guest Information - Conditional */}
              {editForm.pricingType === "guest" && (
                <div className="p-3 rounded-lg border bg-gray-50 space-y-3">
                  <h3 className="text-sm font-semibold">Guest Information</h3>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Guest Name *</Label>
                      <FormInput
                        label=""
                        type="text"
                        value={editForm.guestName || ""}
                        onChange={(val) => handleEditFormChange("guestName", val)}
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Contact Number *</Label>
                      <FormInput
                        label=""
                        type="text"
                        value={editForm.guestContact || ""}
                        onChange={(val) => handleEditFormChange("guestContact", val)}
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Guest CNIC</Label>
                      <FormInput
                        label=""
                        type="text"
                        value={editForm.guestCNIC || ""}
                        onChange={(val) => handleEditFormChange("guestCNIC", val)}
                        placeholder="12345-1234567-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Who will Pay?</Label>
                      <Select
                        value={editForm.paidBy}
                        onValueChange={(val) => handleEditFormChange("paidBy", val)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Who will pay?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          <SelectItem value="GUEST">Guest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div className="space-y-2">
                <Label>Remarks (Optional)</Label>
                <textarea
                  className="w-full p-2 border rounded-md resize-none min-h-[80px] text-sm"
                  placeholder="Add notes about this booking update (e.g., reason for changes, refund details, etc.)"
                  value={editForm.remarks || ""}
                  onChange={(e) => handleEditFormChange("remarks", e.target.value)}
                />
                <div className="text-xs text-muted-foreground">
                  These remarks will be stored with the booking record
                </div>
              </div>
            </div>

            {/* Right Column - Time Slots and Payment */}
            <div className="w-1/2 overflow-y-auto pl-2 space-y-4 border-l">
              {/* Extra Charges (Heads) Section */}
              <div className="border p-3 rounded-lg bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Plus className="h-4 w-4 text-blue-500" />
                    Extra Charges (Heads)
                  </h4>
                </div>

                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className={cn("col-span-12 md:col-span-5", localSelectedHead === "Others" ? "md:col-span-3" : "md:col-span-5")}>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Type</Label>
                    <Select
                      value={localSelectedHead}
                      onValueChange={(val) => {
                        setLocalSelectedHead(val);
                        setLocalHeadAmount("");
                        if (val !== "Others") setLocalCustomHeadName("");
                      }}
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Stage">Stage</SelectItem>
                        <SelectItem value="DJ">DJ</SelectItem>
                        <SelectItem value="Food/menu">Food / Menu</SelectItem>
                        <SelectItem value="GST">GST Tax (%)</SelectItem>
                        <SelectItem value="Others">Others</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {localSelectedHead === "Others" && (
                    <div className="col-span-12 md:col-span-3">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Name</Label>
                      <Input
                        className="h-8 text-xs mt-1"
                        placeholder="Head name"
                        value={localCustomHeadName}
                        onChange={(e) => setLocalCustomHeadName(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="col-span-12 md:col-span-4">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Amount / %</Label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        placeholder="0"
                        className="h-8 text-xs pl-7"
                        value={localHeadAmount}
                        onChange={(e) => setLocalHeadAmount(e.target.value)}
                      />
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">
                        {localSelectedHead === "GST" ? "%" : "Rs"}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-12 md:col-span-3">
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full h-8 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                      disabled={!canAddHead}
                      onClick={() => {
                        const rate = parseFloat(localHeadAmount || "0");
                        if (rate <= 0) return;

                        let headName = localSelectedHead === "Others" ? localCustomHeadName : localSelectedHead;
                        let amount = rate;

                        if (localSelectedHead === "GST") {
                          headName = `GST (${rate}%)`;
                          const basePrice = calculateHallPrice(halls, editForm.hallId, editForm.pricingType as PricingType, editForm.bookingDetails);
                          const fixedHeadsTotal = (editForm.heads || []).filter(h => !h.head.startsWith("GST")).reduce((sum, h) => sum + h.amount, 0);
                          amount = Math.round(((basePrice + fixedHeadsTotal) * rate) / 100);
                        }

                        const newHeads = [...(editForm.heads || []), { head: headName, amount }];
                        const basePrice = calculateHallPrice(halls, editForm.hallId, editForm.pricingType as PricingType, editForm.bookingDetails);
                        const { updatedHeads, totalExtra } = recalculateHeads(basePrice, newHeads);

                        const isEdit = !!editBooking;
                        const oldPaid = isEdit ? Number(editBooking.paidAmount) : 0;
                        const oldPaymentStatus = isEdit ? editBooking.paymentStatus : "UNPAID";
                        const totalPrice = basePrice + totalExtra;

                        setEditForm(prev => {
                          const newForm = {
                            ...prev,
                            heads: updatedHeads,
                            totalPrice: totalPrice,
                          };

                          if (isEdit) {
                            if (totalPrice > oldPaid && oldPaymentStatus === "PAID") {
                              newForm.paymentStatus = "HALF_PAID" as any;
                              newForm.paidAmount = oldPaid;
                              newForm.pendingAmount = totalPrice - oldPaid;
                            } else if (totalPrice < oldPaid) {
                              newForm.paymentStatus = "PAID" as any;
                              newForm.paidAmount = totalPrice;
                              newForm.pendingAmount = 0;
                            } else {
                              newForm.pendingAmount = prev.paymentStatus === "TO_BILL" ? 0 : totalPrice - prev.paidAmount;
                            }
                          } else {
                            newForm.pendingAmount = prev.paymentStatus === "TO_BILL" ? 0 : totalPrice - prev.paidAmount;
                          }
                          return newForm;
                        });

                        setLocalSelectedHead("");
                        setLocalHeadAmount("");
                        setLocalCustomHeadName("");
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {editForm.heads && editForm.heads.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
                    {editForm.heads.map((h, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-white border rounded px-2 py-1 group shadow-sm">
                        <span className="text-[10px] font-medium text-muted-foreground">{h.head}:</span>
                        <span className="text-[10px] font-bold">PKR {h.amount.toLocaleString()}</span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-red-500 transition-colors"
                          onClick={() => {
                            const remainingHeads = editForm.heads?.filter((_, i) => i !== idx) || [];
                            const basePrice = calculateHallPrice(halls, editForm.hallId, editForm.pricingType as PricingType, editForm.bookingDetails);
                            const { updatedHeads, totalExtra } = recalculateHeads(basePrice, remainingHeads);

                            const isEdit = !!editBooking;
                            const oldPaid = isEdit ? Number(editBooking.paidAmount) : 0;
                            const oldPaymentStatus = isEdit ? editBooking.paymentStatus : "UNPAID";
                            const totalPrice = basePrice + totalExtra;

                            setEditForm(prev => {
                              const newForm = {
                                ...prev,
                                heads: updatedHeads,
                                totalPrice: totalPrice,
                              };

                              if (isEdit) {
                                if (totalPrice > oldPaid && oldPaymentStatus === "PAID") {
                                  newForm.paymentStatus = "HALF_PAID" as any;
                                  newForm.paidAmount = oldPaid;
                                  newForm.pendingAmount = totalPrice - oldPaid;
                                } else if (totalPrice < oldPaid) {
                                  newForm.paymentStatus = "PAID" as any;
                                  newForm.paidAmount = totalPrice;
                                  newForm.pendingAmount = 0;
                                } else {
                                  newForm.pendingAmount = prev.paymentStatus === "TO_BILL" ? 0 : Math.max(0, totalPrice - prev.paidAmount);
                                }
                              } else {
                                newForm.pendingAmount = prev.paymentStatus === "TO_BILL" ? 0 : Math.max(0, totalPrice - prev.paidAmount);
                              }
                              return newForm;
                            });
                          }}
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Time Slot Selector */}
              {editForm.bookingDate && editForm.endDate && (
                <div className="space-y-2">
                  <Label>Time Slots *</Label>
                  <IndividualTimeSlotSelector
                    bookingDetails={editForm.bookingDetails}
                    hallId={editForm.hallId}
                    bookings={bookings}
                    halls={halls}
                    reservations={reservations}
                    editBookingId={editBooking?.id?.toString()}
                    onChange={(newDetails) => {
                      setEditForm(prev => {
                        const basePrice = calculateHallPrice(halls, prev.hallId, prev.pricingType as PricingType, newDetails);
                        const { updatedHeads, totalExtra } = recalculateHeads(basePrice, prev.heads || []);
                        const totalPrice = basePrice + totalExtra;

                        const isEdit = !!editBooking;
                        const oldPaid = isEdit ? Number(editBooking.paidAmount) : 0;
                        const oldPaymentStatus = isEdit ? editBooking.paymentStatus : "UNPAID";

                        const newForm = {
                          ...prev,
                          bookingDetails: newDetails,
                          heads: updatedHeads,
                          totalPrice: totalPrice,
                        };

                        if (isEdit) {
                          if (totalPrice > oldPaid && oldPaymentStatus === "PAID") {
                            newForm.paymentStatus = "HALF_PAID" as any;
                            newForm.paidAmount = oldPaid;
                            newForm.pendingAmount = totalPrice - oldPaid;
                          } else if (totalPrice < oldPaid) {
                            newForm.paymentStatus = "PAID" as any;
                            newForm.paidAmount = totalPrice;
                            newForm.pendingAmount = 0;
                          } else {
                            newForm.pendingAmount = totalPrice - prev.paidAmount;
                          }
                        } else {
                          newForm.pendingAmount = totalPrice - prev.paidAmount;
                        }
                        return newForm;
                      });
                    }}
                    defaultEventType={editForm.eventType}
                  />
                </div>
              )}

              {/* Payment Section */}
              <div className="space-y-2">
                <Label className="text-lg">Payment Details</Label>
                <HallPaymentSection
                  form={editForm}
                  onChange={handleEditFormChange}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => resetEditForm()}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update Booking"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* booking details */}
      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
        <DialogContent className="p-0 max-w-5xl min-w-4xl max-h-[90vh] overflow-y-auto">
          {detailBooking && (
            <HallBookingDetailsCard
              booking={detailBooking}
              vouchers={vouchers}
              className="rounded-none border-0 shadow-none"
            />
          )}
        </DialogContent>
      </Dialog>

      <VouchersDialog
        viewVouchers={viewVouchers}
        onClose={() => setViewVouchers(null)}
        vouchers={vouchers}
        isLoadingVouchers={isLoadingVouchers}
      />

      {/* Cancel Booking Dialog */}
      <CancelBookingDialog
        cancelBooking={cancelBooking as any}
        onClose={() => setCancelBooking(null)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />

      {/* Approve/Reject Dialog */}
      <Dialog
        open={!!updateReqBooking}
        onOpenChange={() => setUpdateReqBooking(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {updateStatus === "APPROVED" ? "Approve" : "Reject"} Cancellation Request
            </DialogTitle>
            <DialogDescription>
              {updateStatus === "APPROVED"
                ? "Approve the cancellation of this booking."
                : "Reject the cancellation request for this booking."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p>
              {updateStatus === "APPROVED" ? "Approve" : "Reject"} cancellation
              for booking of{" "}
              <strong>{updateReqBooking?.memberName || updateReqBooking?.member?.Name}</strong>?
            </p>
            <div className="space-y-2">
              <Label htmlFor="admin-remarks">Admin Remarks (Optional)</Label>
              <Textarea
                id="admin-remarks"
                placeholder="Enter remarks..."
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpdateReqBooking(null)}
            >
              Cancel
            </Button>
            <Button
              variant={updateStatus === "APPROVED" ? "default" : "destructive"}
              onClick={() => {
                if (updateReqBooking) {
                  updateCancellationReqMutation.mutate({
                    bookingFor: "halls",
                    bookID: updateReqBooking.id.toString(),
                    status: updateStatus,
                    remarks: adminRemarks || undefined,
                  });
                }
              }}
              disabled={updateCancellationReqMutation.isPending}
            >
              {updateCancellationReqMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : updateStatus === "APPROVED" ? (
                "Approve"
              ) : (
                "Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Reason Dialog */}
      <Dialog
        open={!!reasonToView}
        onOpenChange={() => setReasonToView(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancellation Reason</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div>
              <Label className="text-muted-foreground">Requested By</Label>
              <p className="font-medium">{reasonToView?.requestedBy}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Reason</Label>
              <p className="mt-1 p-3 bg-muted rounded-md text-sm">
                {reasonToView?.reason}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setReasonToView(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Confirmation Dialog */}
      <Dialog
        open={!!conflictData?.isOpen}
        onOpenChange={(open) => !open && setConflictData(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-amber-600 flex items-center gap-2 text-xl">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              Booking Conflict Warning
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              A potential conflict was detected for this reservation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="p-4 rounded-md bg-amber-50 border border-amber-200">
              <p className="text-sm font-medium text-amber-900 leading-relaxed">
                {conflictData?.message}
              </p>
            </div>
            <p className="mt-6 text-sm text-gray-600">
              Bypassing this warning will finalize the booking despite the overlap. Are you sure you want to proceed?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConflictData(null)}
              className="mt-2 sm:mt-0"
            >
              Cancel & Review
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors shadow-sm"
              onClick={() => {
                if (conflictData) {
                  const forcedPayload = { ...conflictData.payload, isForced: true };
                  if (conflictData.isEdit) {
                    updateMutation.mutate(forcedPayload);
                  } else {
                    createMutation.mutate(forcedPayload);
                  }
                  setConflictData(null);
                }
              }}
            >
              Confirm & Bypass
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
