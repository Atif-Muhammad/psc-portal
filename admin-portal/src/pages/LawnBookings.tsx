import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, XCircle, Loader2, User, Search, Receipt, NotepadText, Calendar as CalendarIcon, Ban, Eye, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { getLawnCategories, getBookings, createBooking, updateBooking, cancelReqBooking, searchMembers, getVouchers, getLawnDateStatuses, updateCancellationReq, getCancelledBookings, getCancellationRequests } from "../../config/apis";
import { FormInput } from "@/components/FormInputs";
import { UnifiedDatePicker } from "@/components/UnifiedDatePicker";
import { format, addYears, startOfDay } from "date-fns";
import { LawnBookingDetailsCard } from "@/components/details/LawnBookingDets";
import { VouchersDialog } from "@/components/VouchersDialog";
import { Voucher } from "@/types/room-booking.type";
import { MemberSearchComponent } from "@/components/MemberSearch";
import paymentRules from "../config/paymentRules.json";
import { CancelBookingDialog } from "@/components/CancelBookingDialog";

interface Member {
  id: number;
  Name: string;
  Membership_No: string;
  Balance?: number;
  drAmount?: number;
  crAmount?: number;
}

interface LawnCategory {
  id: number;
  category: string;
  images: Array<{ url: string; publicId: string }>;
  lawns: Lawn[];
}

interface Lawn {
  id: number;
  description: string;
  lawnCategoryId: number;
  minGuests: number;
  maxGuests: number;
  images: any[];
  memberCharges: string;
  guestCharges: string;
  corporateCharges?: string;
  isActive: boolean;
  isOutOfService: boolean;
  outOfServiceReason: string | null;
  outOfServiceFrom: string | null;
  outOfServiceTo: string | null;
  isBooked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LawnBookingForm {
  membershipNo: string;
  lawncategoryId: string | number;
  lawnId: string | number;
  bookingDate: string;
  endDate: string;
  pricingType: string;
  eventType: string;
  numberOfGuests: number;
  guestName?: string;
  guestContact?: string;
  guestCNIC?: string;
  paidBy?: string;
  paymentStatus: string;
  paymentMode: string;
  paidAmount: number;
  pendingAmount: number;
  totalPrice: number;
  bookingDetails: { date: string; timeSlot: string; eventType?: string; reservationId?: string | number }[];
  heads: { head: string; amount: number }[];
  remarks?: string;
  card_number?: string;
  check_number?: string;
  bank_name?: string;
}

export interface LawnBooking {
  id: number;
  reservationId?: number | string;
  memberName: string;
  lawn: {
    id: string,
    description: string,
    outOfOrders?: any[],
    lawnCategory: {
      id: number
    }
  };
  lawnCategoryId?: number | string
  lawnId?: string;
  bookingDate: string;
  endDate?: string;
  numberOfDays?: number;
  guestsCount: number;
  totalPrice: number;
  pendingAmount: number;
  paymentStatus: string;
  pricingType?: string;
  paidAmount?: number;
  membershipNo?: string;
  entityId?: string;
  member?: Member;
  bookingTime?: string;
  paidBy?: string;
  paymentMode?: "CASH" | "ONLINE" | "CARD" | "CHECK";
  card_number?: string;
  check_number?: string;
  bank_name?: string;
  guestName?: string;
  guestContact?: string;
  eventType?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  remarks?: string;
  guestCNIC?: string;
  bookingDetails?: { date: string; timeSlot: string; eventType?: string; reservationId?: string | number }[];
  extraCharges?: any[];
  heads?: { head: string; amount: number }[];
}





// Add this component before the LawnBookings component
const LawnPaymentSection = React.memo(
  ({
    form,
    onChange,
  }: {
    form: {
      paymentStatus: string;
      totalPrice: number;
      paidAmount: number;
      pendingAmount: number;
      paymentMode?: string;
      card_number?: string;
      check_number?: string;
      bank_name?: string;
    };
    onChange: (field: string, value: any) => void;
  }) => {
    const accounting = {
      paid: form.paidAmount || 0,
      owed: form.pendingAmount || 0,
      total: form.totalPrice || 0
    };

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
          {form.totalPrice > paymentRules.lawnBooking.advancePayment.threshold && (
            <p className="text-[10px] text-blue-600 mt-1 italic font-medium">
              * For bookings over {paymentRules.lawnBooking.advancePayment.threshold.toLocaleString()} PKR, an advance payment of {paymentRules.lawnBooking.advancePayment.defaultPaidAmount.toLocaleString()} PKR is required.
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

LawnPaymentSection.displayName = "LawnPaymentSection";

// Helper function to parse date string to local Date
const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const pureDate = dateStr.split('T')[0];
  const [year, month, day] = pureDate.split("-").map(Number);
  return new Date(year, month - 1, day);
};

// Get available time slots for a lawn on a specific date
const getAvailableLawnTimeSlots = (
  lawnId: string,
  dateStr: string,
  bookings: LawnBooking[],
  lawns: Lawn[],
  reservations: any[]
): string[] => {
  const allSlots = ["DAY", "NIGHT"];
  const lawn = lawns.find(l => l.id.toString() === lawnId);
  if (!lawn) return allSlots;

  const dateStart = parseLocalDate(dateStr);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = parseLocalDate(dateStr);
  dateEnd.setHours(23, 59, 59, 999);

  // Check out of order periods
  const isOutOfOrder = lawn.isOutOfService;

  if (isOutOfOrder) return [];

  // Check existing bookings for this lawn on this date (Inclusive check)
  const bookedSlots = bookings
    .filter(b => {
      if ((b as any).isCancelled) return false;
      if (b.lawn?.id?.toString() !== lawnId) return false;
      const start = parseLocalDate(b.bookingDate as string);
      const end = b.endDate ? parseLocalDate(b.endDate as string) : start;
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      const target = new Date(dateStart);
      target.setHours(0, 0, 0, 0);

      // Check if target date falls within booking range
      return target >= start && target <= end;
    })
    .map(b => b.bookingTime || "");

  // Correcting time slot logic: if a booking exists for a slot, it's unavailable.
  // If a booking is "ALL" or blank, it might mean the whole day.
  // The current app seems to use MORNING, EVENING, NIGHT.
  const bookedDetailsSlots = bookings
    .filter(b => b.lawn?.id?.toString() === lawnId && !(b as any).isCancelled)
    .flatMap(b => {
      const details = (b.bookingDetails as any[]) || [];
      return details
        .filter(d => {
          const dDate = parseLocalDate(d.date);
          dDate.setHours(0, 0, 0, 0);
          return dDate.getTime() === dateStart.getTime();
        })
        .map(d => d.timeSlot);
    });

  const reservedSlots = reservations
    ?.filter((r: any) => {
      if (r.lawnId?.toString() !== lawnId) return false;
      const resFrom = new Date(r.reservedFrom);
      resFrom.setHours(0, 0, 0, 0);
      const resTo = new Date(r.reservedTo);
      resTo.setHours(23, 59, 59, 999);
      return dateStart >= resFrom && dateStart <= resTo;
    })
    .map((r: any) => r.timeSlot) || [];

  const unavailableSlots = [...bookedSlots, ...bookedDetailsSlots, ...reservedSlots];
  return allSlots.filter(slot => !unavailableSlots.includes(slot));
};

// Individual time slot selector component for lawns
const LawnIndividualTimeSlotSelector = ({
  bookingDetails,
  lawnId,
  bookings,
  lawns,
  reservations,
  onChange,
  editBookingId,
  defaultEventType
}: {
  bookingDetails: { date: string; timeSlot: string; eventType?: string; reservationId?: string | number }[];
  lawnId: string;
  bookings: LawnBooking[];
  lawns: Lawn[];
  reservations: any[];
  onChange: (newDetails: { date: string; timeSlot: string; eventType?: string }[]) => void;
  editBookingId?: string;
  defaultEventType?: string;
}) => {
  if (!bookingDetails || bookingDetails.length === 0) return null;

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
        eventType: sameDayDetail?.eventType || defaultEventType || "wedding"
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

  const eventTypes = [
    { value: "mehandi", label: "Mehandi" },
    { value: "barat", label: "Barat" },
    { value: "walima", label: "Walima" },
    { value: "birthday", label: "Birthday" },
    { value: "corporate", label: "Corporate Event" },
    { value: "wedding", label: "Wedding" },
    { value: "other", label: "Other" },
  ];

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

          const availableSlots = getAvailableLawnTimeSlots(
            lawnId,
            dateStr,
            otherBookings,
            lawns,
            reservations
          );

          return (
            <div key={dateStr} className="p-3 bg-background rounded-lg border shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-foreground">
                  {format(date, "EEEE, MMMM do")}
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

const initialForm: LawnBookingForm = {
  membershipNo: "",
  lawncategoryId: "",
  lawnId: "",
  bookingDate: format(new Date(), "yyyy-MM-dd"),
  endDate: format(new Date(), "yyyy-MM-dd"),
  pricingType: "member",
  eventType: "wedding",
  numberOfGuests: 0,
  guestName: "",
  guestContact: "",
  guestCNIC: "",
  paidBy: "MEMBER",
  paymentStatus: "UNPAID",
  paymentMode: "CASH",
  paidAmount: 0,
  pendingAmount: 0,
  totalPrice: 0,
  bookingDetails: [],
  heads: [],
  remarks: "",
  card_number: "",
  check_number: "",
  bank_name: "",
};

// Available heads for extra charges
const extraChargeHeads = [
  "Stage",
  "DJ",
  "Food / Menu",
  "GST Tax (%)",
  "Others",
];

const recalculateHeads = (basePrice: number, currentHeads: { head: string; amount: number }[]) => {
  let totalExtra = 0;
  const updatedHeads = currentHeads.map((h) => {
    let amount = h.amount;
    if (h.head.includes("GST (") && h.head.includes("%)")) {
      const match = h.head.match(/GST \((\d+)%\)/);
      if (match) {
        const rate = parseInt(match[1]);
        amount = Math.round((basePrice * rate) / 100);
      }
    }
    totalExtra += amount;
    return { ...h, amount };
  });
  return { updatedHeads, totalExtra };
};

export default function LawnBookings() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editBooking, setEditBooking] = useState<LawnBooking | null>(null);
  const [cancelBooking, setCancelBooking] = useState<LawnBooking | null>(null);
  const [activeTab, setActiveTab] = useState("active");
  const [updateReqBooking, setUpdateReqBooking] = useState<LawnBooking | null>(null);
  const [updateStatus, setUpdateStatus] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [adminRemarks, setAdminRemarks] = useState("");
  const [reasonToView, setReasonToView] = useState<{ reason: string; requestedBy: string } | null>(null);
  const [viewVouchers, setViewVouchers] = useState<LawnBooking | null>(null);
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  const [form, setForm] = useState<LawnBookingForm>(initialForm);
  const [editForm, setEditForm] = useState<LawnBookingForm>(initialForm);

  const [detailBooking, setDetailBooking] = useState<LawnBooking | null>(null);
  const [openDetails, setOpenDetails] = useState(false);

  // Local state for extra charges form (Add dialog)
  const [localSelectedHead, setLocalSelectedHead] = useState(extraChargeHeads[0]);
  const [localHeadAmount, setLocalHeadAmount] = useState<string>("");
  const [localCustomHeadName, setLocalCustomHeadName] = useState("");

  // Local state for extra charges form (Edit dialog)
  const [editLocalSelectedHead, setEditLocalSelectedHead] = useState(extraChargeHeads[0]);
  const [editLocalHeadAmount, setEditLocalHeadAmount] = useState<string>("");
  const [editLocalCustomHeadName, setEditLocalCustomHeadName] = useState("");

  // Member search states
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberResults, setShowMemberResults] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();

  // Handle conversion from Reservation
  useEffect(() => {
    const state = location.state as any;
    if (state?.fromReservation) {
      const { reservationId, resourceId, startTime, endTime, timeSlot, remarks } = state;

      setForm(prev => ({
        ...prev,
        lawnId: resourceId?.toString() || "",
        bookingDate: format(new Date(startTime), "yyyy-MM-dd"),
        bookingDetails: [{
          date: format(new Date(startTime), "yyyy-MM-dd"),
          timeSlot: (timeSlot as any) || "NIGHT",
          eventType: "wedding",
          reservationId: reservationId
        }]
      }));
      // If multiple days reservation, handle that
      if (startTime && endTime && new Date(startTime).toDateString() !== new Date(endTime).toDateString()) {
        // for simplicity just use first date, or could loop. 
        // Most reservations are per slot.
      }

      setIsAddOpen(true);

      // Clear location state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Fetch lawn categories
  const {
    data: lawnCategories = [],
    isLoading: isLoadingCategories,
  } = useQuery<LawnCategory[]>({
    queryKey: ["lawn-categories"],
    queryFn: async () => await getLawnCategories(),
  });

  // Fetch lawn bookings
  // Infinite Query for Lawn Bookings
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingBookings,
  } = useInfiniteQuery({
    queryKey: ["lawn-bookings", activeTab],
    queryFn: async ({ pageParam = 1 }) => {
      let res;
      if (activeTab === "active") {
        res = await getBookings({ bookingsFor: "lawns", pageParam });
      } else if (activeTab === "cancelled") {
        res = await getCancelledBookings({ bookingsFor: "lawns", pageParam });
      } else {
        res = await getCancellationRequests({ bookingsFor: "lawns", pageParam });
      }
      return res as LawnBooking[];
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage && lastPage.length === 20
        ? allPages.length + 1
        : undefined;
    },
  });

  const lawnBookings = useMemo(() => data?.pages.flat() || [], [data]);

  const observer = useRef<IntersectionObserver>();
  const lastElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoadingBookings || isFetchingNextPage) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observer.current.observe(node);
    },
    [isLoadingBookings, isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  console.log(lawnBookings)

  // Fetch available lawns when category is selected
  const activeCategory = isAddOpen ? form.lawncategoryId : (editBooking ? editForm.lawncategoryId : "");
  const {
    data: availableLawnsData = [],
    isLoading: isLoadingLawns,
  } = useQuery({
    queryKey: ["available-lawns", activeCategory],
    queryFn: async () => {
      if (!activeCategory) return [];
      const category = lawnCategories.find(cat => cat.id.toString() === activeCategory.toString() || cat.category === activeCategory);
      if (!category) return [];

      return category.lawns;
    },
    enabled: !!activeCategory,
  });

  // Member search query
  const {
    data: searchResults = [],
    isLoading: isSearching,
    refetch: searchMembersFn,
  } = useQuery<Member[]>({
    queryKey: ["memberSearch", memberSearch],
    queryFn: async () => (await searchMembers(memberSearch)) as Member[],
    enabled: false,
  });

  // Fetch vouchers when viewing vouchers
  const {
    data: vouchers = [],
    isLoading: isLoadingVouchers,
  } = useQuery<Voucher[]>({
    queryKey: ["lawn-vouchers", viewVouchers?.id || detailBooking?.id],
    queryFn: () => {
      const id = viewVouchers?.id || detailBooking?.id;
      return id ? getVouchers("LAWN", id.toString()) : [];
    },
    enabled: !!viewVouchers || (openDetails && !!detailBooking),
  });

  // Fetch date statuses for selected lawn - fetch 1 year from today
  const activeLawnId = isAddOpen ? form.lawnId : (editBooking ? editForm.lawnId : "");
  const { data: fetchedStatuses } = useQuery({
    queryKey: ["lawnDateStatuses", "upcoming", activeLawnId],
    queryFn: async () => {
      if (!activeLawnId) return null;
      const from = format(new Date(), "yyyy-MM-dd");
      const to = format(addYears(new Date(), 1), "yyyy-MM-dd");
      return await getLawnDateStatuses(from, to, [activeLawnId.toString()]);
    },
    enabled: !!activeLawnId,
  });

  const calendarModifiers = useMemo(() => {
    if (!fetchedStatuses) return { booked: [], reserved: [], outOfOrder: [] };

    const booked: Date[] = [];
    const reserved: Date[] = [];
    const outOfOrder: Date[] = [];

    // Process Bookings
    fetchedStatuses.bookings?.forEach((b: any) => {
      if (b.bookingDetails && Array.isArray(b.bookingDetails)) {
        b.bookingDetails.forEach((d: any) => {
          const date = startOfDay(new Date(d.date));
          if (!booked.some(bd => bd.getTime() === date.getTime())) {
            booked.push(date);
          }
        });
      } else {
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

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => createBooking(data),
    onSuccess: () => {
      toast({ title: "Lawn booking created successfully" });
      queryClient.invalidateQueries({ queryKey: ["lawn-bookings"] });
      setIsAddOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create lawn booking",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateBooking(data),
    onSuccess: () => {
      toast({ title: "Lawn booking updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["lawn-bookings"] });
      setEditBooking(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update lawn booking",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ bookingFor, bookID, reason }: { bookingFor: string; bookID: string; reason: string }) =>
      cancelReqBooking(bookingFor, bookID, reason),
    onSuccess: () => {
      toast({ title: "Lawn booking cancellation requested successfully" });
      queryClient.invalidateQueries({ queryKey: ["lawn-bookings"] });
      setCancelBooking(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to request cancellation",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const updateReqMutation = useMutation({
    mutationFn: ({ bookingFor, bookID, status, remarks }: any) =>
      updateCancellationReq(bookingFor, bookID, status, remarks),
    onSuccess: () => {
      toast({ title: `Cancellation request ${updateStatus === "APPROVED" ? "approved" : "rejected"} successfully` });
      queryClient.invalidateQueries({ queryKey: ["lawn-bookings"] });
      setUpdateReqBooking(null);
      setUpdateStatus(null);
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

  const handleApproveReq = useCallback((booking: LawnBooking) => {
    setUpdateReqBooking(booking);
    setUpdateStatus("APPROVED");
    setAdminRemarks("");
  }, []);

  const handleRejectReq = useCallback((booking: LawnBooking) => {
    setUpdateReqBooking(booking);
    setUpdateStatus("REJECTED");
    setAdminRemarks("");
  }, []);

  const handleViewReason = useCallback((booking: LawnBooking) => {
    setReasonToView({
      reason: (booking as any).cancellationRequest?.reason || "No reason provided.",
      requestedBy: (booking as any).cancellationRequest?.requestedBy || "Unknown"
    });
  }, []);

  // Member search handler with debouncing
  const handleMemberSearch = useCallback((searchTerm: string) => {
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
  }, [searchMembersFn]);

  const handleSearchFocus = useCallback(() => {
    if (memberSearch.length >= 2 && searchResults.length > 0) {
      setShowMemberResults(true);
    }
  }, [memberSearch.length, searchResults.length]);

  const handleSelectMember = useCallback((member: Member) => {
    setSelectedMember(member);
    setMemberSearch("");
    setShowMemberResults(false);
  }, []);

  const handleClearMember = useCallback(() => {
    setSelectedMember(null);
    setMemberSearch("");
    setShowMemberResults(false);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const calculateLawnPrice = (lawnId: string, pricing: string, slotsCount: number = 1) => {
    const lawn = (availableLawnsData as Lawn[]).find((l: Lawn) => l.id.toString() === lawnId);
    if (!lawn) return 0;

    let slotRate = parseInt(lawn.memberCharges as string) || 0;
    if (pricing === "guest") slotRate = parseInt(lawn.guestCharges as string) || 0;
    else if (pricing === "corporate") slotRate = parseInt(lawn.corporateCharges || lawn.guestCharges as string) || 0;

    return slotRate * slotsCount;
  };

  const createFormChangeHandler = (isEdit: boolean) => {
    return (field: keyof LawnBookingForm, value: any) => {
      const setFormFn = isEdit ? setEditForm : setForm;

      setFormFn((prev) => {
        const newForm = { ...prev, [field]: value };

        // Handle price recalculation
        if (["lawnId", "pricingType", "bookingDetails"].includes(field as string)) {
          const basePrice = calculateLawnPrice(
            field === "lawnId" ? value : newForm.lawnId.toString(),
            field === "pricingType" ? value : newForm.pricingType,
            newForm.bookingDetails.length || 1
          );
          const { updatedHeads, totalExtra } = recalculateHeads(basePrice, newForm.heads || []);
          newForm.heads = updatedHeads;
          newForm.totalPrice = basePrice + totalExtra;

          // Update pending amount based on new total
          if (newForm.paymentStatus === "PAID") {
            newForm.paidAmount = newForm.totalPrice;
            newForm.pendingAmount = 0;
          } else if (newForm.paymentStatus === "UNPAID") {
            newForm.paidAmount = 0;
            newForm.pendingAmount = newForm.totalPrice;
          } else if (newForm.paymentStatus === "ADVANCE_PAYMENT") {
            const rules = paymentRules.lawnBooking.advancePayment;
            if (newForm.totalPrice > rules.threshold && (newForm.paidAmount === 0 || newForm.paidAmount < rules.defaultPaidAmount)) {
              newForm.paidAmount = rules.defaultPaidAmount;
            }
            newForm.pendingAmount = newForm.totalPrice - newForm.paidAmount;
          } else {
            newForm.pendingAmount = newForm.totalPrice - newForm.paidAmount;
          }

          // AUTO-ADJUST PAYMENT STATUS WHEN PRICE INCREASES IN EDIT MODE
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
            }
          }
        }

        // Handle payment status changes
        if (field === "paymentStatus") {
          if (value === "PAID") {
            newForm.paidAmount = newForm.totalPrice;
            newForm.pendingAmount = 0;
          } else if (value === "UNPAID") {
            newForm.paidAmount = 0;
            newForm.pendingAmount = newForm.totalPrice;
          } else if (value === "ADVANCE_PAYMENT") {
            const rules = paymentRules.lawnBooking.advancePayment;
            if (newForm.totalPrice > rules.threshold) {
              newForm.paidAmount = rules.defaultPaidAmount;
            }
            newForm.pendingAmount = newForm.totalPrice - (newForm.paidAmount || 0);
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

        return newForm;
      });
    };
  };

  const handleFormChange = createFormChangeHandler(false);
  const handleEditFormChange = createFormChangeHandler(true);

  // Update edit form when editBooking changes
  useEffect(() => {
    if (editBooking) {
      // Find the lawn to get its category ID
      const lawn = lawnCategories
        .flatMap((cat: LawnCategory) => cat.lawns)
        .find((l: Lawn) => l.id.toString() === editBooking.lawn?.id);

      // Initialize bookingDetails if missing (for legacy bookings)
      let details = (editBooking.bookingDetails as any[]) || [];
      if (details.length === 0) {
        const days = editBooking.numberOfDays || 1;
        const start = new Date(editBooking.bookingDate);

        for (let i = 0; i < days; i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          details.push({
            date: format(d, "yyyy-MM-dd"),
            timeSlot: editBooking.bookingTime || "NIGHT",
            eventType: editBooking.eventType || "wedding"
          });
        }
      } else {
        // Normalize dates to yyyy-MM-dd
        details = details.map(d => ({
          ...d,
          date: typeof d.date === 'string' && d.date.includes('T') ? format(new Date(d.date), "yyyy-MM-dd") : d.date
        }));
      }

      // Calculate endDate if missing (for legacy bookings)
      let endDate = editBooking.endDate;
      if (!endDate && editBooking.numberOfDays && editBooking.numberOfDays > 1) {
        const start = new Date(editBooking.bookingDate);
        const end = new Date(start);
        end.setDate(end.getDate() + (editBooking.numberOfDays - 1));
        endDate = format(end, "yyyy-MM-dd");
      } else if (endDate) {
        endDate = format(new Date(endDate), "yyyy-MM-dd");
      } else {
        endDate = format(new Date(editBooking.bookingDate), "yyyy-MM-dd");
      }

      setEditForm({
        membershipNo: editBooking.member?.Membership_No || editBooking.membershipNo || "",
        lawncategoryId: lawn?.lawnCategoryId || editBooking.lawn?.lawnCategory?.id || "",
        lawnId: editBooking.lawn?.id || "",
        bookingDate: format(new Date(editBooking.bookingDate), "yyyy-MM-dd"),
        endDate: endDate,
        pricingType: editBooking.pricingType || "member",
        eventType: editBooking.eventType || "wedding",
        numberOfGuests: editBooking.guestsCount || 0,
        guestName: editBooking.guestName || "",
        guestContact: editBooking.guestContact || "",
        guestCNIC: editBooking.guestCNIC || "",
        paidBy: editBooking.paidBy || "MEMBER",
        paymentStatus: editBooking.paymentStatus || "UNPAID",
        paymentMode: (editBooking as any).paymentMode || "CASH",
        paidAmount: editBooking.paidAmount || 0,
        pendingAmount: editBooking.pendingAmount || 0,
        totalPrice: editBooking.totalPrice || 0,
        bookingDetails: details,
        heads: editBooking.extraCharges || editBooking.heads || [],
        remarks: editBooking.remarks || "",
        card_number: (editBooking as any).card_number || "",
        check_number: (editBooking as any).check_number || "",
        bank_name: (editBooking as any).bank_name || "",
      });
    }
  }, [editBooking, lawnCategories]);

  // Filter available lawns based on active status and service status
  const availableLawns = useMemo(() => {
    return (availableLawnsData as Lawn[]).filter((lawn: Lawn) => lawn.isActive && !lawn.isOutOfService);
  }, [availableLawnsData]);

  const filteredBookings = paymentFilter === "ALL"
    ? lawnBookings
    : lawnBookings.filter(b => b.paymentStatus === paymentFilter);

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-success text-success-foreground">Paid</Badge>;
      case "HALF_PAID":
        return <Badge className="bg-warning text-warning-foreground">Half Paid</Badge>;
      case "UNPAID":
        return <Badge variant="destructive">Unpaid</Badge>;
      case "TO_BILL":
        return <Badge className="bg-blue-600 text-white">To Bill</Badge>;
      case "ADVANCE_PAYMENT":
        return <Badge className="bg-purple-600 text-white">Advance</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTimeSlotBadge = (timeSlot: string) => {
    switch (timeSlot) {
      case "DAY":
        return <Badge className="bg-orange-100 text-orange-800">Day</Badge>;
      case "NIGHT":
        return <Badge className="bg-purple-100 text-purple-800">Night</Badge>;
      default:
        return <Badge>{timeSlot}</Badge>;
    }
  };




  const resetForm = () => {
    setForm(initialForm);
    setSelectedMember(null);
    setMemberSearch("");
    setShowMemberResults(false);
  };


  const handleCreateBooking = () => {
    if (!selectedMember || !form.lawnId || form.bookingDetails.length === 0 || form.numberOfGuests < 1) {
      toast({
        title: "Please fill all required fields",
        description: "Member, lawn, booking dates with time slots, and guest count are required",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    // Check all slots have event types
    const missingEventType = form.bookingDetails.some(d => !d.eventType);
    if (missingEventType) {
      toast({
        title: "Missing event types",
        description: "Please select an event type for each time slot",
        variant: "destructive",
      });
      return;
    }

    const selectedLawnData = availableLawns.find((l: Lawn) => l.id.toString() === form.lawnId.toString());
    if (!selectedLawnData) return;

    if (form.numberOfGuests < selectedLawnData.minGuests || form.numberOfGuests > selectedLawnData.maxGuests) {
      toast({
        title: "Invalid guest count",
        description: `Guest count must be between ${selectedLawnData.minGuests} and ${selectedLawnData.maxGuests} for this lawn`,
        variant: "destructive",
      });
      return;
    }

    // Get first and last dates from bookingDetails
    const sortedDates = [...new Set(form.bookingDetails.map(d => d.date))].sort();
    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];

    const payload = {
      category: "Lawn",
      membershipNo: selectedMember.Membership_No,
      entityId: form.lawnId.toString(),
      bookingDate: new Date(firstDate).toISOString(),
      endDate: new Date(lastDate).toISOString(),
      totalPrice: form.totalPrice.toString(),
      paymentStatus: form.paymentStatus,
      numberOfGuests: form.numberOfGuests,
      paidAmount: form.paidAmount,
      pendingAmount: form.pendingAmount,
      pricingType: form.pricingType,
      paymentMode: form.paymentMode,
      card_number: form.card_number,
      check_number: form.check_number,
      bank_name: form.bank_name,
      // Use first slot's time and event type for legacy support
      eventTime: form.bookingDetails[0].timeSlot,
      eventType: form.bookingDetails[0].eventType,
      // Send full booking details for multi-date support
      bookingDetails: form.bookingDetails,
      paidBy: form.paidBy,
      guestName: form.guestName,
      guestContact: form.guestContact,
      guestCNIC: form.guestCNIC,
      heads: form.heads,
      reservationId: form.bookingDetails[0]?.reservationId
    };
    createMutation.mutate(payload);
  };



  const addHead = (isEdit: boolean) => {
    const head = isEdit ? editLocalSelectedHead : localSelectedHead;
    const amountStr = isEdit ? editLocalHeadAmount : localHeadAmount;
    const customName = isEdit ? editLocalCustomHeadName : localCustomHeadName;
    const amount = parseInt(amountStr);

    if (isNaN(amount)) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    let headName = head === "Others" ? customName : head;
    if (head === "GST Tax (%)") {
      headName = `GST (${amount}%)`;
    }

    if (!headName) {
      toast({ title: "Please enter a name for the extra charge", variant: "destructive" });
      return;
    }

    if (isEdit) {
      setEditForm(prev => {
        const newHeads = [...prev.heads, { head: headName, amount }];
        const basePrice = calculateLawnPrice(prev.lawnId.toString(), prev.pricingType, prev.bookingDetails.length);
        const { updatedHeads, totalExtra } = recalculateHeads(basePrice, newHeads);
        const newTotal = basePrice + totalExtra;

        const updated = {
          ...prev,
          heads: updatedHeads,
          totalPrice: newTotal,
          pendingAmount: (prev.paymentStatus === "TO_BILL" ? 0 : newTotal - prev.paidAmount)
        };

        if (newTotal > prev.totalPrice && prev.paymentStatus === "PAID") {
          updated.paymentStatus = "HALF_PAID";
        }

        return updated;
      });
      setEditLocalHeadAmount("");
      setEditLocalCustomHeadName("");
    } else {
      setForm(prev => {
        const newHeads = [...prev.heads, { head: headName, amount }];
        const basePrice = calculateLawnPrice(prev.lawnId.toString(), prev.pricingType, prev.bookingDetails.length);
        const { updatedHeads, totalExtra } = recalculateHeads(basePrice, newHeads);
        const newTotal = basePrice + totalExtra;

        return {
          ...prev,
          heads: updatedHeads,
          totalPrice: newTotal,
          pendingAmount: (prev.paymentStatus === "TO_BILL" ? 0 : newTotal - prev.paidAmount)
        };
      });
      setLocalHeadAmount("");
      setLocalCustomHeadName("");
    }
  };

  const removeHead = (index: number, isEdit: boolean) => {
    if (isEdit) {
      setEditForm(prev => {
        const newHeads = prev.heads.filter((_, i) => i !== index);
        const basePrice = calculateLawnPrice(prev.lawnId.toString(), prev.pricingType, prev.bookingDetails.length);
        const { updatedHeads, totalExtra } = recalculateHeads(basePrice, newHeads);
        const newTotal = basePrice + totalExtra;

        return {
          ...prev,
          heads: updatedHeads,
          totalPrice: newTotal,
          pendingAmount: (prev.paymentStatus === "TO_BILL" ? 0 : newTotal - prev.paidAmount)
        };
      });
    } else {
      setForm(prev => {
        const newHeads = prev.heads.filter((_, i) => i !== index);
        const basePrice = calculateLawnPrice(prev.lawnId.toString(), prev.pricingType, prev.bookingDetails.length);
        const { updatedHeads, totalExtra } = recalculateHeads(basePrice, newHeads);
        const newTotal = basePrice + totalExtra;

        return {
          ...prev,
          heads: updatedHeads,
          totalPrice: newTotal,
          pendingAmount: (prev.paymentStatus === "TO_BILL" ? 0 : newTotal - prev.paidAmount)
        };
      });
    }
  };



  const handleViewVouchers = (booking: LawnBooking) => {
    setViewVouchers(booking);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Lawn Bookings</h2>
          <p className="text-muted-foreground">Manage outdoor lawn reservations</p>
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
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Booking
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl max-h-fit overflow-hidden">
              <DialogHeader className="border-b pb-4">
                <DialogTitle>Create Lawn Booking</DialogTitle>
              </DialogHeader>

              {/* Horizontal layout with two columns */}
              <div className="flex gap-6 py-4 h-[calc(90vh-120px)] overflow-hidden">
                {/* Left Column - Main Form Fields */}
                <div className="w-1/2 overflow-y-auto pr-2 space-y-4">
                  {/* Member Search */}
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

                  {/* Lawn Category & Lawn Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Lawn Category *</Label>
                      {isLoadingCategories ? (
                        <div className="h-10 bg-muted animate-pulse rounded-md" />
                      ) : (
                        <Select value={form.lawncategoryId.toString()} onValueChange={(val) => setForm(prev => ({ ...prev, lawncategoryId: val, lawnId: "" }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {lawnCategories.map((cat: LawnCategory) => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>{cat.category}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Lawn *</Label>
                      {isLoadingLawns ? (
                        <div className="h-10 bg-muted animate-pulse rounded-md" />
                      ) : (
                        <Select
                          value={form.lawnId.toString()}
                          onValueChange={(val) => handleFormChange("lawnId", val)}
                          disabled={!form.lawncategoryId || availableLawns.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !form.lawncategoryId
                                  ? "Select category first"
                                  : availableLawns.length === 0
                                    ? "No available lawns"
                                    : "Select lawn"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {availableLawns.map((lawn: Lawn) => (
                              <SelectItem key={lawn.id} value={lawn.id.toString()}>
                                <div className="flex flex-col">
                                  <span>{lawn.description}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    Capacity: {lawn.minGuests}-{lawn.maxGuests}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
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
                            form.bookingDetails.length === 0 && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.bookingDetails.length > 0 ? (
                            (() => {
                              const dates = [...new Set(form.bookingDetails.map(d => d.date))].sort();
                              const firstDate = dates[0];
                              const lastDate = dates[dates.length - 1];
                              return firstDate === lastDate
                                ? format(parseLocalDate(firstDate), "LLL dd, y")
                                : `${format(parseLocalDate(firstDate), "LLL dd, y")} - ${format(parseLocalDate(lastDate), "LLL dd, y")}`;
                            })()
                          ) : (
                            <span>Select dates</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={
                            form.bookingDetails.length > 0
                              ? {
                                from: parseLocalDate([...new Set(form.bookingDetails.map(d => d.date))].sort()[0]),
                                to: parseLocalDate([...new Set(form.bookingDetails.map(d => d.date))].sort().pop()!),
                              }
                              : undefined
                          }
                          onSelect={(range) => {
                            if (range?.from) {
                              const newDetails: { date: string; timeSlot: string; eventType?: string }[] = [];
                              let currentDate = new Date(range.from);
                              const endDate = range.to || range.from;

                              while (currentDate <= endDate) {
                                const dateStr = format(currentDate, "yyyy-MM-dd");
                                newDetails.push({
                                  date: dateStr,
                                  timeSlot: "NIGHT",
                                  eventType: "wedding"
                                });
                                currentDate.setDate(currentDate.getDate() + 1);
                              }
                              handleFormChange("bookingDetails", newDetails);
                            } else {
                              handleFormChange("bookingDetails", []);
                            }
                          }}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          modifiers={calendarModifiers}
                          modifiersClassNames={{
                            today: "border-2 border-primary bg-transparent text-primary hover:bg-transparent hover:text-primary",
                            booked: "bg-blue-100 border-blue-200 text-blue-900 font-semibold rounded-none",
                            reserved: "bg-amber-100 border-amber-200 text-amber-900 font-semibold rounded-none",
                            outOfOrder: "bg-red-100 border-red-200 text-red-900 font-semibold rounded-none",
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Pricing Type & Guest Count */}
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>Pricing Type</Label>
                      <Select value={form.pricingType} onValueChange={(val) => handleFormChange("pricingType", val)}>
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

                    <div className="flex-1 space-y-2">
                      <Label>Guest Count *</Label>
                      <Input
                        type="number"
                        placeholder="150"
                        value={form.numberOfGuests || ""}
                        onChange={(e) => handleFormChange("numberOfGuests", parseInt(e.target.value) || 0)}
                        min={form.lawnId ? availableLawns.find((l: Lawn) => l.id.toString() === form.lawnId.toString())?.minGuests || 1 : 1}
                      />
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="space-y-2">
                    <Label>Remarks (Optional)</Label>
                    <textarea
                      className="w-full p-2 border rounded-md resize-none min-h-[80px] text-sm"
                      placeholder="Add notes about this booking..."
                      value={form.remarks || ""}
                      onChange={(e) => handleFormChange("remarks", e.target.value)}
                    />
                  </div>

                  {/* Guest Info */}
                  {form.pricingType === "guest" && (
                    <div className="p-3 rounded-lg border bg-gray-50 space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <NotepadText className="h-4 w-4 text-blue-500" />
                        Guest Information
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="Guest Name *"
                          value={form.guestName}
                          onChange={(e) => handleFormChange("guestName", e.target.value)}
                        />
                        <Input
                          placeholder="Contact *"
                          type="text"
                          value={form.guestContact}
                          onChange={(e) => handleFormChange("guestContact", e.target.value)}
                        />
                        <div className="col-span-2">
                          <Input
                            placeholder="Guest CNIC (Optional)"
                            value={form.guestCNIC}
                            onChange={(e) => handleFormChange("guestCNIC", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px] mb-1 block">Who will pay?</Label>
                          <Select
                            value={form.paidBy}
                            onValueChange={(val) => handleFormChange("paidBy", val)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
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
                </div>

                {/* Right Column - Schedule & Payment */}
                <div className="w-1/2 overflow-y-auto pl-2 space-y-4 border-l">
                  {/* Time Slots */}
                  {form.lawnId && form.bookingDetails.length > 0 && (
                    <div className="space-y-2">
                      <Label>Schedule & Time Slots *</Label>
                      <LawnIndividualTimeSlotSelector
                        bookingDetails={form.bookingDetails}
                        lawnId={form.lawnId.toString()}
                        bookings={lawnBookings}
                        lawns={availableLawns}
                        reservations={fetchedStatuses?.reservations || []}
                        onChange={(details) => handleFormChange("bookingDetails", details)}
                        defaultEventType="wedding"
                      />
                    </div>
                  )}

                  {/* Extra Charges (Heads) Section */}
                  <div className="space-y-4 col-span-2">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Plus className="h-4 w-4 text-emerald-500" />
                        Extra Charges (Heads)
                      </h3>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50">
                        Optional
                      </Badge>
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-end bg-gray-50/50 p-3 rounded-lg border border-dashed">
                      <div className="col-span-4 space-y-1">
                        <Label className="text-[10px]">Charge Head</Label>
                        <Select
                          value={localSelectedHead}
                          onValueChange={setLocalSelectedHead}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {extraChargeHeads.map(h => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {localSelectedHead === "Others" && (
                        <div className="col-span-4 space-y-1">
                          <Label className="text-[10px]">Custom Name</Label>
                          <Input
                            placeholder="Head name"
                            className="h-8 text-xs"
                            value={localCustomHeadName}
                            onChange={(e) => setLocalCustomHeadName(e.target.value)}
                          />
                        </div>
                      )}

                      <div className={cn("space-y-1", localSelectedHead === "Others" ? "col-span-3" : "col-span-6")}>
                        <Label className="text-[10px]">Amount</Label>
                        <Input
                          type="number"
                          placeholder="Amount"
                          className="h-8 text-xs"
                          value={localHeadAmount}
                          onChange={(e) => setLocalHeadAmount(e.target.value)}
                        />
                      </div>

                      <div className="col-span-1">
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 w-full bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => addHead(false)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {form.heads && form.heads.length > 0 && (
                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                        {form.heads.map((h, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white border rounded-md text-xs shadow-sm group">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="font-medium text-gray-700">{h.head}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-emerald-700">PKR {h.amount.toLocaleString()}</span>
                              <button
                                onClick={() => removeHead(index, false)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payment */}
                  <div className="space-y-2">
                    <LawnPaymentSection
                      onChange={(field, value) => {
                        setForm(prev => {
                          const updated = { ...prev, [field]: value };
                          if (field === "paymentStatus") {
                            if (value === "PAID") {
                              updated.paidAmount = prev.totalPrice;
                              updated.pendingAmount = 0;
                            } else if (value === "UNPAID") {
                              updated.paidAmount = 0;
                              updated.pendingAmount = prev.totalPrice;
                            }
                          } else if (field === "paidAmount") {
                            updated.pendingAmount = prev.totalPrice - value;
                          }
                          return updated;
                        });
                      }}
                      form={form}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t pt-4">
                <Button variant="outline" onClick={() => {
                  setIsAddOpen(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateBooking}
                  disabled={!selectedMember || (form.bookingDetails[0]?.reservationId ? false : !form.lawnId) || form.totalPrice === 0 || createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Booking"}
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
            {isLoadingBookings ? (
              <div className="flex justify-center items-center py-32">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-32 text-muted-foreground text-lg">
                {activeTab === "active" ? "No lawn bookings found" :
                  activeTab === "cancelled" ? "No cancelled bookings found" :
                    "No cancellation requests found"}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Lawn</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Guests</TableHead>
                      <TableHead>Total Price</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                          {booking.member?.Name || booking.memberName}
                          {booking.member?.Membership_No && (
                            <div className="text-xs text-muted-foreground">
                              #{booking.member.Membership_No}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{booking.lawn?.description}</TableCell>
                        <TableCell>
                          {booking.numberOfDays && booking.numberOfDays > 1 && booking.endDate
                            ? (
                              <div className="flex flex-col">
                                <span>
                                  {format(new Date(booking.bookingDate), "MMM dd")} - {format(new Date(booking.endDate), "MMM dd, yyyy")}
                                </span>
                                <span className="text-xs text-muted-foreground">{booking.numberOfDays} days</span>
                              </div>
                            )
                            : new Date(booking.bookingDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {booking.bookingDetails && booking.bookingDetails.length > 0
                            ? Array.from(new Set(booking.bookingDetails.map(d => d.eventType))).join(", ")
                            : booking.eventType}
                        </TableCell>
                        <TableCell>
                          {booking.bookingDetails && booking.bookingDetails.length > 0
                            ? (
                              <div className="flex flex-col gap-1">
                                {Array.from(new Set(booking.bookingDetails.map(d => d.timeSlot))).map(slot => (
                                  <span key={slot}>{getTimeSlotBadge(slot)}</span>
                                ))}
                              </div>
                            )
                            : getTimeSlotBadge(booking.bookingTime || "NIGHT")}
                        </TableCell>
                        <TableCell>{booking.guestsCount}</TableCell>
                        <TableCell>PKR {booking.totalPrice.toLocaleString()}</TableCell>
                        <TableCell>{getPaymentBadge(booking.paymentStatus)}</TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDetailBooking(booking)
                                setOpenDetails(true)
                              }}
                              title="Booking Details">
                              <NotepadText className="h-4 w-4" />
                            </Button>

                            {activeTab === "active" && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => {
                                  setEditBooking(booking);
                                }} title="Edit Booking">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {(booking.paymentStatus != "UNPAID") && (
                                  <Button variant="ghost" size="icon" onClick={() => handleViewVouchers(booking)} title="View Vouchers">
                                    <Receipt className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setCancelBooking(booking)} title="Cancel Booking">
                                  <XCircle className="h-4 w-4" />
                                </Button>
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

                            {activeTab === "cancelled" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewReason(booking)}
                                title="View Reason"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
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
                  {isFetchingNextPage && (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  )}
                  {!hasNextPage && lawnBookings.length > 0 && (
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
      <Dialog open={!!editBooking} onOpenChange={() => setEditBooking(null)}>
        <DialogContent className="max-w-7xl max-h-fit overflow-hidden">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>Edit Lawn Booking</DialogTitle>
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
                        {editBooking?.member?.Membership_No && `Membership: #${editBooking.member.Membership_No}`}
                        {editBooking?.member?.Balance !== undefined && (
                          <div className="mt-1 space-y-1">
                            <Badge
                              variant={editBooking.member.Balance >= 0 ? "outline" : "destructive"}
                              className="bg-blue-100 text-blue-800"
                            >
                              Account Balance: PKR {editBooking.member.Balance.toLocaleString()}
                            </Badge>
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

              {/* Lawn Category & Lawn Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lawn Category *</Label>
                  <Select
                    value={editForm.lawncategoryId.toString()}
                    onValueChange={(categoryId) => {
                      handleEditFormChange("lawncategoryId", categoryId);
                      handleEditFormChange("lawnId", "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {lawnCategories.map((cat: LawnCategory) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lawn *</Label>
                  <Select
                    value={editForm.lawnId.toString()}
                    onValueChange={(lawnId) => handleEditFormChange("lawnId", lawnId)}
                    disabled={!editForm.lawncategoryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!editForm.lawncategoryId ? "Select category first" : "Select lawn"} />
                    </SelectTrigger>
                    <SelectContent>
                      {lawnCategories.find((cat: LawnCategory) => cat.id.toString() === editForm.lawncategoryId.toString())?.lawns.filter((lawn: Lawn) => lawn.isActive && !lawn.isOutOfService).map((lawn: Lawn) => (
                        <SelectItem key={lawn.id} value={lawn.id.toString()}>
                          <div className="flex flex-col">
                            <span>{lawn.description}</span>
                            <span className="text-[10px] text-muted-foreground">Capacity: {lawn.minGuests}-{lawn.maxGuests}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Booking Dates */}
              <div className="space-y-2">
                <Label>Booking Dates</Label>
                <UnifiedDatePicker
                  value={editForm.bookingDate ? parseLocalDate(editForm.bookingDate) : undefined}
                  endDate={editForm.endDate ? parseLocalDate(editForm.endDate) : undefined}
                  selectionMode="range"
                  onChange={(date, type) => {
                    const startDate = type === "start" ? (date || new Date()) : parseLocalDate(editForm.bookingDate);
                    const endDate = type === "end" ? (date || startDate) : parseLocalDate(editForm.endDate || editForm.bookingDate);

                    const startDateStr = format(startDate, "yyyy-MM-dd");
                    const endDateStr = format(endDate, "yyyy-MM-dd");

                    // Generate initial booking details for the range
                    const newDetails: { date: string; timeSlot: string; eventType?: string }[] = [];
                    let scanDate = new Date(startDate);
                    const lastDateEnd = new Date(endDate);

                    while (scanDate <= lastDateEnd) {
                      const sDateStr = format(scanDate, "yyyy-MM-dd");
                      const existing = editForm.bookingDetails?.find(d => d.date === sDateStr);
                      if (existing) {
                        newDetails.push(existing);
                      } else {
                        newDetails.push({
                          date: sDateStr,
                          timeSlot: "NIGHT",
                          eventType: editForm.eventType || "wedding"
                        });
                      }
                      scanDate.setDate(scanDate.getDate() + 1);
                    }

                    handleEditFormChange("bookingDate", startDateStr);
                    handleEditFormChange("endDate", endDateStr);
                    handleEditFormChange("bookingDetails", newDetails);
                  }}
                  className="w-full h-10 bg-muted/30 border-none shadow-none"
                  placeholder="Select booking dates"
                  minDate={new Date()}
                />
              </div>

              {/* Individual Time Slot Selector for Edit Dialog */}
              {editForm.lawnId && editForm.bookingDetails && editForm.bookingDetails.length > 0 && (
                <LawnIndividualTimeSlotSelector
                  bookingDetails={editForm.bookingDetails}
                  lawnId={editForm.lawnId.toString()}
                  bookings={lawnBookings}
                  lawns={availableLawns}
                  reservations={fetchedStatuses?.reservations || []}
                  onChange={(details) => handleEditFormChange("bookingDetails", details)}
                />
              )}

              {/* Pricing Type & Guest Count */}
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Pricing Type</Label>
                  <Select
                    value={editForm.pricingType}
                    onValueChange={(value) => handleEditFormChange("pricingType", value)}
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

                <div className="flex-1 space-y-2">
                  <Label>Guest Count</Label>
                  <Input
                    type="number"
                    value={editForm.numberOfGuests || ""}
                    onChange={(e) => handleEditFormChange("numberOfGuests", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-2">
                <Label>Remarks (Optional)</Label>
                <textarea
                  className="w-full p-2 border rounded-md resize-none min-h-[80px] text-sm"
                  placeholder="Add notes..."
                  value={editForm.remarks || ""}
                  onChange={(e) => handleEditFormChange("remarks", e.target.value)}
                />
              </div>

              {/* Guest Information */}
              {editForm.pricingType === "guest" && (
                <div className="p-3 rounded-lg border bg-gray-50 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <NotepadText className="h-4 w-4 text-blue-500" />
                    Guest Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Guest Name *"
                      value={editForm.guestName || ""}
                      onChange={(e) => handleEditFormChange("guestName", e.target.value)}
                    />
                    <Input
                      placeholder="Contact *"
                      type="text"
                      value={editForm.guestContact || ""}
                      onChange={(e) => handleEditFormChange("guestContact", e.target.value)}
                    />
                    <div className="col-span-2">
                      <Input
                        placeholder="Guest CNIC (Optional)"
                        value={editForm.guestCNIC || ""}
                        onChange={(e) => handleEditFormChange("guestCNIC", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[10px] mb-1 block">Who will pay?</Label>
                      <Select
                        value={editForm.paidBy || "MEMBER"}
                        onValueChange={(val) => handleEditFormChange("paidBy", val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
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
            </div>

            <div className="w-1/2 overflow-y-auto pr-2 space-y-4">
              {/* Extra Charges (Heads) Section */}
              <div className="space-y-4 col-span-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Plus className="h-4 w-4 text-emerald-500" />
                    Extra Charges (Heads)
                  </h3>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50">
                    Optional
                  </Badge>
                </div>

                <div className="grid grid-cols-12 gap-2 items-end bg-gray-50/50 p-3 rounded-lg border border-dashed">
                  <div className="col-span-4 space-y-1">
                    <Label className="text-[10px]">Charge Head</Label>
                    <Select
                      value={editLocalSelectedHead}
                      onValueChange={setEditLocalSelectedHead}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {extraChargeHeads.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {editLocalSelectedHead === "Others" && (
                    <div className="col-span-4 space-y-1">
                      <Label className="text-[10px]">Custom Name</Label>
                      <Input
                        placeholder="Head name"
                        className="h-8 text-xs"
                        value={editLocalCustomHeadName}
                        onChange={(e) => setEditLocalCustomHeadName(e.target.value)}
                      />
                    </div>
                  )}

                  <div className={cn("space-y-1", editLocalSelectedHead === "Others" ? "col-span-3" : "col-span-6")}>
                    <Label className="text-[10px]">Amount</Label>
                    <Input
                      type="number"
                      placeholder="Amount"
                      className="h-8 text-xs"
                      value={editLocalHeadAmount}
                      onChange={(e) => setEditLocalHeadAmount(e.target.value)}
                    />
                  </div>

                  <div className="col-span-1">
                    <button
                      type="button"
                      className="h-8 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-md flex items-center justify-center transition-colors shadow-sm"
                      onClick={() => addHead(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {editForm.heads && editForm.heads.length > 0 && (
                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                    {editForm.heads.map((h, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white border rounded-md text-xs shadow-sm group">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="font-medium text-gray-700">{h.head}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-emerald-700">PKR {h.amount.toLocaleString()}</span>
                          <button
                            onClick={() => removeHead(index, true)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Section */}
              <div className="space-y-2">
                <LawnPaymentSection
                  form={editForm}
                  onChange={(field, value) => handleEditFormChange(field as keyof LawnBookingForm, value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setEditBooking(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!editBooking) return;

                // VALIDATION
                if (!editForm.bookingDetails || editForm.bookingDetails.length === 0) {
                  toast({ title: "Booking dates are required", variant: "destructive" });
                  return;
                }
                const missingEvent = editForm.bookingDetails.some(d => !d.eventType);
                if (missingEvent) {
                  toast({ title: "Event type is required for all slots", variant: "destructive" });
                  return;
                }

                if (!editForm.numberOfGuests || editForm.numberOfGuests < 1) {
                  toast({ title: "Guest count must be at least 1", variant: "destructive" });
                  return;
                }

                const membershipNo = editBooking.member?.Membership_No || editForm.membershipNo || "";
                if (!membershipNo) {
                  toast({ title: "Membership number is missing", variant: "destructive" });
                  return;
                }

                const sortedDates = [...new Set(editForm.bookingDetails.map(d => d.date))].sort();

                const payload = {
                  id: editBooking.id.toString(),
                  category: "Lawn",
                  membershipNo: membershipNo,
                  entityId: editForm.lawnId.toString(),
                  bookingDate: new Date(sortedDates[0]).toISOString(),
                  endDate: new Date(sortedDates[sortedDates.length - 1]).toISOString(),
                  totalPrice: editForm.totalPrice.toString(),
                  paymentStatus: editForm.paymentStatus,
                  numberOfGuests: editForm.numberOfGuests,
                  paidAmount: editForm.paidAmount || 0,
                  pendingAmount: editForm.pendingAmount || 0,
                  pricingType: editForm.pricingType || "member",
                  paymentMode: editForm.paymentMode || "CASH",
                  card_number: editForm.card_number,
                  check_number: editForm.check_number,
                  bank_name: editForm.bank_name,
                  eventTime: editForm.bookingDetails[0].timeSlot, // Legacy support
                  eventType: editForm.bookingDetails[0].eventType, // Legacy support
                  bookingDetails: editForm.bookingDetails,
                  heads: editForm.heads,
                  paidBy: editForm.paidBy || "MEMBER",
                  guestName: editForm.guestName,
                  guestContact: editForm.guestContact,
                  guestCNIC: editForm.guestCNIC,
                };


                updateMutation.mutate(payload);
              }}
              disabled={updateMutation.isPending}
            >
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
        <DialogContent className="p-0 max-w-5xl min-w-4xl overflow-hidden">
          {detailBooking && (
            <LawnBookingDetailsCard
              booking={detailBooking}
              vouchers={vouchers}
              isLoadingVouchers={isLoadingVouchers}
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

      {/* View Reason Dialog */}
      <Dialog open={!!reasonToView} onOpenChange={() => setReasonToView(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancellation Reason</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground">Requested By</Label>
              <p className="font-medium">{reasonToView?.requestedBy}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Reason</Label>
              <p className="whitespace-pre-wrap">{reasonToView?.reason}</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setReasonToView(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval/Rejection Dialog */}
      <Dialog open={!!updateReqBooking} onOpenChange={() => setUpdateReqBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{updateStatus === "APPROVED" ? "Approve" : "Reject"} Cancellation Request</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p>
              Are you sure you want to <strong>{updateStatus?.toLowerCase()}</strong> the cancellation request for{" "}
              <strong>{updateReqBooking?.memberName}</strong>?
            </p>
            <div className="space-y-2">
              <Label>Admin Remarks (Optional)</Label>
              <Textarea
                placeholder="Add any internal notes..."
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateReqBooking(null)}>Cancel</Button>
            <Button
              className={updateStatus === "APPROVED" ? "bg-green-600 hover:bg-green-700 font-medium" : "bg-destructive hover:bg-destructive/90 font-medium"}
              onClick={() => {
                updateReqMutation.mutate({
                  bookingFor: "lawns",
                  bookID: updateReqBooking?.id.toString(),
                  status: updateStatus,
                  remarks: adminRemarks
                });
              }}
              disabled={updateReqMutation.isPending}
            >
              {updateReqMutation.isPending ? "Updating..." : `Confirm ${updateStatus === "APPROVED" ? "Approval" : "Rejection"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CancelBookingDialog
        cancelBooking={cancelBooking}
        onClose={() => setCancelBooking(null)}
        onConfirm={(reason) => {
          deleteMutation.mutate({
            bookingFor: "lawns",
            bookID: cancelBooking?.id.toString() || "",
            reason
          });
        }}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}