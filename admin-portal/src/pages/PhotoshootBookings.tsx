import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, X, Loader2, Receipt, User, Calendar, Clock, NotepadText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getBookings, createBooking, updateBooking, cancelReqBooking as delBooking, getPhotoshoots, searchMembers, getVouchers, getCancelledBookings } from "../../config/apis";
import { MemberSearchComponent } from "@/components/MemberSearch";
import { Member, Voucher } from "@/types/room-booking.type";
import { cn } from "@/lib/utils";
import { FormInput } from "@/components/FormInputs";
import { UnifiedDatePicker } from "@/components/UnifiedDatePicker";
import { PhotoshootBookingDetailsCard } from "@/components/details/PhotoshootBookingDets";
import { VouchersDialog } from "@/components/VouchersDialog";

export interface PhotoshootBooking {
  id: number;
  reservationId?: number | string;
  memberId: number;
  photoshootId: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalPrice: string;
  paymentStatus: "PAID" | "HALF_PAID" | "UNPAID" | "TO_BILL";
  pricingType: string;
  paidAmount: string;
  pendingAmount: string;
  member: Member;
  paidBy?: string;
  paymentMode?: "CASH" | "ONLINE" | "CARD" | "CHECK";
  card_number?: string;
  check_number?: string;
  bank_name?: string;
  guestName?: string;
  guestContact?: string;
  guestCNIC?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  bookingDetails?: { date: string; timeSlot: string; reservationId?: number | string }[];
  photoshoot: {
    id: number;
    description: string;
    memberCharges: string;
    guestCharges: string;
    outOfOrders?: any[];
    isBooked?: any;

  };
}

interface PhotoshootService {
  id: number;
  description: string;
  memberCharges: string;
  guestCharges: string;
}



const PhotoshootPaymentSection = React.memo(
  ({
    form,
    onChange,
  }: {
    form: {
      paymentStatus: string;
      totalPrice: number;
      paidAmount: number;
      pendingAmount: number;
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
            </SelectContent>
          </Select>
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

        {form.paymentStatus === "HALF_PAID" && (
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
        {(form.paymentStatus === "PAID" || form.paymentStatus === "HALF_PAID") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 border rounded-lg bg-gray-50">
            <div className="col-span-2">
              <Label className="font-semibold text-blue-800">Payment Medium Details</Label>
            </div>
            <div>
              <Label>Payment Mode *</Label>
              <Select
                value={(form as any).paymentMode || "CASH"}
                onValueChange={(val) => onChange("paymentMode" as any, val)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(form as any).paymentMode === "CARD" && (
              <div>
                <Label>Card Number (Last 4) *</Label>
                <Input
                  className="mt-2"
                  placeholder="e.g. 1234"
                  value={(form as any).card_number || ""}
                  onChange={(e) => onChange("card_number" as any, e.target.value)}
                />
              </div>
            )}

            {(form as any).paymentMode === "CHECK" && (
              <div>
                <Label>Check Number *</Label>
                <Input
                  className="mt-2"
                  placeholder="Enter check number"
                  value={(form as any).check_number || ""}
                  onChange={(e) => onChange("check_number" as any, e.target.value)}
                />
              </div>
            )}

            {((form as any).paymentMode === "CARD" || (form as any).paymentMode === "CHECK") && (
              <div className="col-span-2">
                <Label>Bank Name *</Label>
                <Input
                  className="mt-2"
                  placeholder="Enter bank name"
                  value={(form as any).bank_name || ""}
                  onChange={(e) => onChange("bank_name" as any, e.target.value)}
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

PhotoshootPaymentSection.displayName = "PhotoshootPaymentSection";

export default function PhotoshootBookings() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editBooking, setEditBooking] = useState<PhotoshootBooking | null>(null);
  const [deleteBooking, setDeleteBooking] = useState<PhotoshootBooking | null>(null);
  const [viewVouchers, setViewVouchers] = useState<PhotoshootBooking | null>(null);
  const [activeTab, setActiveTab] = useState("active");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Form States
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberResults, setShowMemberResults] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedPhotoshootId, setSelectedPhotoshootId] = useState<string>("");
  // const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
  const [bookingDetails, setBookingDetails] = useState<{ date: string; timeSlot: string; reservationId?: number | string }[]>([]);
  const [pricingType, setPricingType] = useState("member");
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  const [paidAmount, setPaidAmount] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [pPaymentMode, setPPaymentMode] = useState("CASH");
  const [pCardNumber, setPCardNumber] = useState("");
  const [pCheckNumber, setPCheckNumber] = useState("");
  const [pBankName, setPBankName] = useState("");


  const [detailBooking, setDetailBooking] = useState<PhotoshootBooking | null>(null);
  const [openDetails, setOpenDetails] = useState(false)

  const [guestSec, setGuestSec] = useState({
    paidBy: "MEMBER",
    guestName: "",
    guestContact: "",
    guestCNIC: ""
  })

  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();

  // Handle conversion from Reservation
  useEffect(() => {
    const state = location.state as any;
    if (state?.fromReservation) {
      const { reservationId, resourceId, startTime, endTime, timeSlot, remarks } = state;

      setSelectedPhotoshootId(resourceId?.toString() || "");
      setBookingDetails([{
        date: format(new Date(startTime), "yyyy-MM-dd"),
        timeSlot: timeSlot || format(new Date(startTime), "yyyy-MM-dd'T'10:00:00"), // Use timeSlot if available
        reservationId: reservationId
      }]);

      setIsAddOpen(true);

      // Clear location state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Queries
  // Infinite Query for Bookings
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingBookings,
  } = useInfiniteQuery({
    queryKey: ["bookings", "photoshoots", activeTab],
    queryFn: async ({ pageParam = 1 }) => {
      if (activeTab === "active") {
        const res = await getBookings({ bookingsFor: "photoshoots", pageParam });
        return res as PhotoshootBooking[];
      } else {
        const res = await getCancelledBookings({ bookingsFor: "photoshoots", pageParam });
        return res as PhotoshootBooking[];
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage && lastPage.length === 20
        ? allPages.length + 1
        : undefined;
    },
  });

  const bookings = useMemo(() => data?.pages.flat() || [], [data]);

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
  // console.log(bookings)

  const { data: photoshoots = [], isLoading: isLoadingPhotoshoots } = useQuery<PhotoshootService[]>({
    queryKey: ["photoshoots"],
    queryFn: async () => await getPhotoshoots(),
  });

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
    queryKey: ["photoshoot-vouchers", viewVouchers?.id],
    queryFn: () => (viewVouchers ? getVouchers("PHOTOSHOOT", viewVouchers.id) : []),
    enabled: !!viewVouchers,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      toast({ title: "Booking created successfully" });
      queryClient.invalidateQueries({ queryKey: ["bookings", "photoshoots", "active"] });
      handleCloseAddModal();
    },
    onError: (error: any) => {
      toast({ title: "Failed to create booking", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateBooking,
    onSuccess: () => {
      toast({ title: "Booking updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["bookings", "photoshoots", "active"] });
      setEditBooking(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to update booking", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ bookID, reason }: { bookID: number; reason: string }) =>
      delBooking("photoshoots", bookID, reason),
    onSuccess: () => {
      toast({ title: "Cancellation request sent" });
      queryClient.invalidateQueries({ queryKey: ["bookings", "photoshoots", "active"] });
      queryClient.invalidateQueries({ queryKey: ["bookings", "photoshoots", "cancelled"] });
      setDeleteBooking(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to request cancellation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleMemberSearch = useCallback((searchTerm: string) => {
    setMemberSearch(searchTerm);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        searchMembersFn();
        setShowMemberResults(true);
      } else {
        setShowMemberResults(false);
      }
    }, 300);
  }, [searchMembersFn]);

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    setMemberSearch("");
    setShowMemberResults(false);
  };

  const handleClearMember = () => {
    setSelectedMember(null);
    setMemberSearch("");
    setShowMemberResults(false);
  };

  const handleViewVouchers = (booking: PhotoshootBooking) => {
    setViewVouchers(booking);
  };

  // Price Calculation
  useEffect(() => {
    if (selectedPhotoshootId && photoshoots.length > 0) {
      const photoshoot = photoshoots.find(p => p.id.toString() === selectedPhotoshootId);
      if (photoshoot) {
        const basePrice = pricingType === "member" ? Number(photoshoot.memberCharges) : Number(photoshoot.guestCharges);
        const count = bookingDetails.length || 1;
        const newTotal = basePrice * count;
        setTotalPrice(newTotal);

        // Auto-switch to HALF_PAID if editing and price increases beyond original total
        if (editBooking && paymentStatus === "PAID" && newTotal > Number(editBooking.totalPrice)) {
          setPaymentStatus("HALF_PAID");
          setPaidAmount(Number(editBooking.paidAmount));
        }
      }
    }
  }, [selectedPhotoshootId, pricingType, photoshoots, bookingDetails, editBooking]);

  const resetForm = () => {
    setSelectedMember(null);
    setSelectedPhotoshootId("");
    // setSelectedDateTime(null);
    setBookingDetails([]);
    setPricingType("member");
    setPaymentStatus("UNPAID");
    setPaidAmount(0);
    setTotalPrice(0);
    setMemberSearch("");
    setShowMemberResults(false);
    setGuestSec({
      paidBy: "",
      guestName: "",
      guestContact: "",
      guestCNIC: ""
    });
    setPPaymentMode("CASH");
    setPCardNumber("");
    setPCheckNumber("");
    setPBankName("");
  };

  const handleCloseAddModal = () => {
    setIsAddOpen(false);
    resetForm();
  };

  const handleCloseEditModal = () => {
    setEditBooking(null);
    resetForm();
  };

  const handleCreate = () => {
    if (!selectedMember || !selectedPhotoshootId || bookingDetails.length === 0) {
      toast({ title: "Missing fields", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    // Use first slot for main fields (backward compatibility)
    const firstSlot = bookingDetails[0];

    const payload = {
      category: "Photoshoot",
      membershipNo: selectedMember.Membership_No,
      entityId: selectedPhotoshootId,
      checkIn: firstSlot.date,
      timeSlot: firstSlot.timeSlot,
      bookingDetails, // Send specific details
      totalPrice: totalPrice.toString(),
      paymentStatus,
      pricingType,
      paidAmount: paymentStatus === "HALF_PAID" ? paidAmount : (paymentStatus === "PAID" ? totalPrice : 0),
      pendingAmount: totalPrice - (paymentStatus === "HALF_PAID" ? paidAmount : (paymentStatus === "PAID" ? totalPrice : 0)),
      paymentMode: pPaymentMode,
      card_number: pCardNumber,
      check_number: pCheckNumber,
      bank_name: pBankName,
      paidBy: guestSec.paidBy,
      guestName: guestSec.guestName,
      guestCNIC: guestSec.guestCNIC,
      reservationId: firstSlot.reservationId
    };

    createMutation.mutate(payload);
  };

  const handleUpdate = () => {
    if (!editBooking) return;

    // Use first slot or existing
    const firstSlot = bookingDetails.length > 0 ? bookingDetails[0] : null;

    const payload = {
      category: "Photoshoot",
      id: editBooking.id,
      membershipNo: editBooking.member.Membership_No,
      entityId: selectedPhotoshootId || editBooking.photoshootId.toString(),
      checkIn: firstSlot ? firstSlot.date : new Date(editBooking.bookingDate).toISOString().split('T')[0],
      timeSlot: firstSlot ? firstSlot.timeSlot : undefined,
      bookingDetails,
      totalPrice: totalPrice.toString(),
      paymentStatus,
      pricingType,
      paidAmount: paymentStatus === "HALF_PAID" ? paidAmount : (paymentStatus === "PAID" ? totalPrice : 0),
      pendingAmount: totalPrice - (paymentStatus === "HALF_PAID" ? paidAmount : (paymentStatus === "PAID" ? totalPrice : 0)),
      paymentMode: (editBooking as any).paymentMode || "CASH",
      card_number: (editBooking as any).card_number,
      check_number: (editBooking as any).check_number,
      bank_name: (editBooking as any).bank_name,
      paidBy: guestSec.paidBy,
      guestName: guestSec.guestName,
      guestContact: guestSec.guestContact?.toString(),
    };

    updateMutation.mutate(payload);
  };

  // Populate edit form
  useEffect(() => {
    if (editBooking) {
      setSelectedMember(editBooking.member);
      setSelectedPhotoshootId(editBooking.photoshootId.toString());

      // Load booking details if available
      if ((editBooking as any).bookingDetails && (editBooking as any).bookingDetails.length > 0) {
        setBookingDetails((editBooking as any).bookingDetails);
      } else {
        // Construct from flat fields
        const date = new Date(editBooking.bookingDate);
        const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        const dateStr = format(local, 'yyyy-MM-dd');
        const timeStr = format(local, "yyyy-MM-dd'T'HH:mm:ss");

        setBookingDetails([{ date: dateStr, timeSlot: timeStr }]);
      }

      setPricingType(editBooking.pricingType);
      setPaymentStatus(editBooking.paymentStatus);
      setPaidAmount(Number(editBooking.paidAmount));
      setTotalPrice(Number(editBooking.totalPrice));
      setGuestSec({
        paidBy: editBooking.paidBy || "",
        guestName: editBooking.guestName || "",
        guestContact: editBooking.guestContact || "",
        guestCNIC: editBooking.guestCNIC || ""
      });
      setPPaymentMode((editBooking as any).paymentMode || "CASH");
      setPCardNumber((editBooking as any).card_number || "");
      setPCheckNumber((editBooking as any).check_number || "");
      setPBankName((editBooking as any).bank_name || "");
    }
  }, [editBooking]);

  const filteredBookings = statusFilter === "ALL"
    ? bookings
    : bookings.filter(b => b.paymentStatus === statusFilter);

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "PAID": return <Badge className="bg-green-600">Paid</Badge>;
      case "HALF_PAID": return <Badge className="bg-yellow-600">Half Paid</Badge>;
      case "UNPAID": return <Badge variant="destructive">Unpaid</Badge>;
      case "TO_BILL": return <Badge className="bg-blue-600 text-white">To Bill</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };



  // Format time display
  const formatTimeDisplay = (timeString: string) => {
    if (!timeString) return "";
    // If it's a full date string
    if (timeString.includes('T')) {
      return format(new Date(timeString), "hh:mm a");
    }
    // If it's HH:mm:ss
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(Number(hours), Number(minutes));
    return format(date, "hh:mm a");
  };

  // Format date display
  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return format(date, "PPP");
  };

  // Helper to get local HH:mm from ISO string
  const getLocalHHMM = (isoString: string) => {
    if (!isoString) return "09:00";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "09:00";
    return format(date, "HH:mm");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Photoshoot Bookings</h2>
          <p className="text-muted-foreground">Manage studio photoshoot sessions</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="HALF_PAID">Half Paid</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="TO_BILL">To Bill</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) handleCloseAddModal();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Booking
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Photoshoot Booking</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <MemberSearchComponent
                  searchTerm={memberSearch}
                  onSearchChange={handleMemberSearch}
                  showResults={showMemberResults}
                  searchResults={searchResults}
                  isSearching={isSearching}
                  selectedMember={selectedMember}
                  onSelectMember={handleSelectMember}
                  onClearMember={handleClearMember}
                  onFocus={() => { }}
                />
                <div>
                  <Label>Photoshoot Service</Label>
                  <Select value={selectedPhotoshootId} onValueChange={setSelectedPhotoshootId}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {photoshoots.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Calendar Time Picker - spans both columns */}
                {/* Multi-Date Time Picker */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-lg font-semibold">Select Dates & Time Slots</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <Calendar className="h-4 w-4" />
                          Add Dates
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <CalendarComponent
                          mode="multiple"
                          selected={bookingDetails.map(d => new Date(d.date))}
                          onSelect={(days) => {
                            if (!days) return;
                            // Merge new days with existing details
                            const newDetails = [...bookingDetails];

                            // Remove unselected days
                            const dayStrings = days.map(d => format(d, 'yyyy-MM-dd'));
                            const filtered = newDetails.filter(d => dayStrings.includes(d.date));

                            // Add new days with default time
                            days.forEach(day => {
                              const dateStr = format(day, 'yyyy-MM-dd');
                              if (!filtered.find(d => d.date === dateStr)) {
                                filtered.push({
                                  date: dateStr,
                                  timeSlot: format(day, "yyyy-MM-dd'T'09:00:00") // Default 9 AM
                                });
                              }
                            });

                            // Sort by date
                            filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                            setBookingDetails(filtered);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="border rounded-lg p-4 space-y-3 max-h-[300px] overflow-y-auto">
                    {bookingDetails.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        No dates selected. Click "Add Dates" to start.
                      </div>
                    ) : (
                      bookingDetails.map((detail, index) => (
                        <div key={detail.date} className="flex items-center gap-4 bg-muted/30 p-3 rounded-md">
                          <div className="w-[150px] font-medium">
                            {format(new Date(detail.date), "PPP")}
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <Input
                              type="time"
                              value={getLocalHHMM(detail.timeSlot)}
                              min="08:00"
                              max="21:00"
                              onChange={(e) => {
                                const time = e.target.value;
                                const newDetails = [...bookingDetails];
                                newDetails[index] = {
                                  ...detail,
                                  timeSlot: `${detail.date}T${time}:00`
                                };
                                setBookingDetails(newDetails);
                              }}
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              To: {(() => {
                                const date = new Date(detail.timeSlot);
                                if (isNaN(date.getTime())) return "11:00 AM";
                                const endDate = new Date(date.getTime() + 2 * 60 * 60 * 1000);
                                return format(endDate, "hh:mm a");
                              })()}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              const newDetails = bookingDetails.filter((_, i) => i !== index);
                              setBookingDetails(newDetails);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <Label>Pricing Type</Label>
                  <Select value={pricingType} onValueChange={setPricingType}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="guest">Guest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {pricingType == "guest" && <div className="p-4 rounded-xl border bg-white shadow-sm col-span-full">

                  <h3 className="text-lg font-semibold mb-4">Guest Information</h3>

                  <div className="flex  flex-col">

                    <div className="flex items-center justify-center gap-x-5">

                      <div className="w-1/2">
                        <Label className="text-sm font-medium mb-1 block whitespace-nowrap">
                          Guest Name *
                        </Label>
                        {/* {console.log(form)} */}

                        <FormInput
                          label=""
                          type="text"
                          value={guestSec.guestName}
                          onChange={(val) => setGuestSec((prev) => ({ ...prev, guestName: val }))}
                        />
                      </div>

                      <div className="w-1/2">
                        <Label className="text-sm font-medium mb-1 block whitespace-nowrap">
                          Contact
                        </Label>

                        <FormInput
                          label=""
                          type="number"
                          value={guestSec.guestContact}
                          onChange={(val) => setGuestSec((prev) => ({ ...prev, guestContact: val }))}
                          min="0"
                        />
                      </div>

                    </div>

                    <div className="sm:col-span-2 lg:col-span-1">
                      <Label className="text-sm font-medium my-2 block whitespace-nowrap">
                        Who will Pay?
                      </Label>
                      <Select
                        value={guestSec.paidBy}
                        onValueChange={(val) => setGuestSec((prev) => ({ ...prev, paidBy: val }))}
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
                </div>}

                {/* Accounting Summary Section */}
                {/* <div className="md:col-span-2">
                  <Label>Total Price</Label>
                  <Input type="text" className="mt-2 font-bold text-lg" value={`PKR ${totalPrice.toLocaleString()}`} disabled />
                </div> */}

                <PhotoshootPaymentSection
                  form={{
                    paymentStatus: paymentStatus,
                    totalPrice: totalPrice,
                    paidAmount: paidAmount,
                    pendingAmount: totalPrice - paidAmount
                  }}
                  onChange={(field, value) => {
                    if (field === "paymentStatus") {
                      setPaymentStatus(value);
                      if (value === "PAID") {
                        setPaidAmount(totalPrice);
                      } else if (value === "UNPAID") {
                        setPaidAmount(0);
                      } else if (value === "HALF_PAID") {
                        if (paidAmount === 0) {
                          setPaidAmount(totalPrice / 2);
                        }
                      }
                    } else if (field === "paidAmount") {
                      setPaidAmount(value);
                    }
                  }}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseAddModal}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="active">
            Active Bookings
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled Bookings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-0">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking Information</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Price Info</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingBookings && bookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading bookings...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No bookings found matching your criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBookings.map((booking, idx) => (
                        <TableRow key={booking.id} ref={idx === filteredBookings.length - 1 ? lastElementRef : null}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                            
                              <div className="flex flex-col">
                                <span className="font-bold">{booking.member.Name}</span>
                                <span className="text-xs text-muted-foreground">{booking.member.Membership_No}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <NotepadText className="h-3 w-3 text-primary" />
                                {booking.photoshoot.description}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold">
                                <Calendar className="h-3 w-3" />
                                {formatDateDisplay(booking.bookingDate)}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-primary font-bold">
                                <Clock className="h-3 w-3" />
                                {formatTimeDisplay(booking.startTime)} - {formatTimeDisplay(booking.endTime)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold">Total: PKR {Number(booking.totalPrice).toLocaleString()}</span>
                              <span className="text-[10px] text-green-600 font-bold">Paid: {Number(booking.paidAmount).toLocaleString()}</span>
                              <span className="text-[10px] text-red-600 font-bold">Owed: {Number(booking.pendingAmount).toLocaleString()}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getPaymentBadge(booking.paymentStatus)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDetailBooking(booking);
                                  setOpenDetails(true);
                                }}
                                title="Booking Details"
                              >
                                <NotepadText className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditBooking(booking)}
                                title="Edit Booking"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setViewVouchers(booking)}
                                title="View Vouchers"
                              >
                                <Receipt className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => setDeleteBooking(booking)}
                                title="Delete Booking"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancelled" className="mt-0">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking Information</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Price Info</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingBookings && bookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading bookings...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No cancelled bookings found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBookings.map((booking, idx) => (
                        <TableRow key={booking.id} ref={idx === filteredBookings.length - 1 ? lastElementRef : null}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              
                              <div className="flex flex-col">
                                <span className="font-bold">{booking.member.Name}</span>
                                <span className="text-xs text-muted-foreground">{booking.member.Membership_No}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <NotepadText className="h-3 w-3 text-primary" />
                                {booking.photoshoot.description}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold">
                                <Calendar className="h-3 w-3" />
                                {formatDateDisplay(booking.bookingDate)}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-primary font-bold">
                                <Clock className="h-3 w-3" />
                                {formatTimeDisplay(booking.startTime)} - {formatTimeDisplay(booking.endTime)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold">Total: PKR {Number(booking.totalPrice).toLocaleString()}</span>
                              <span className="text-[10px] text-green-600 font-bold">Paid: {Number(booking.paidAmount).toLocaleString()}</span>
                              <span className="text-[10px] text-red-600 font-bold">Owed: {Number(booking.pendingAmount).toLocaleString()}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">Cancelled</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDetailBooking(booking);
                                  setOpenDetails(true);
                                }}
                                title="Booking Details"
                              >
                                <NotepadText className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div ref={lastElementRef} className="h-10" />
      < Dialog open={!!editBooking} onOpenChange={(open) => {
        if (!open) handleCloseEditModal();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Member Information Display */}
            <div className="md:col-span-2">
              <Label>Member Information</Label>
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm flex items-center">
                      {editBooking?.member?.Name}
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
                          <div className="text-xs">
                            <span className="text-green-700">
                              DR: PKR {editBooking.member.drAmount?.toLocaleString() || "0"}
                            </span>
                            {" • "}
                            <span className="text-red-700">
                              CR: PKR {editBooking.member.crAmount?.toLocaleString() || "0"}
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

            <div>
              <Label>Service</Label>
              <Select value={selectedPhotoshootId} onValueChange={setSelectedPhotoshootId}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {photoshoots.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Multi-Date Time Picker for Edit */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">Select Dates & Time Slots</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Calendar className="h-4 w-4" />
                      Add Dates
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      mode="multiple"
                      selected={bookingDetails.map(d => new Date(d.date))}
                      onSelect={(days) => {
                        if (!days) return;
                        // Merge new days with existing details
                        const newDetails = [...bookingDetails];

                        // Remove unselected days
                        const dayStrings = days.map(d => format(d, 'yyyy-MM-dd'));
                        const filtered = newDetails.filter(d => dayStrings.includes(d.date));

                        // Add new days with default time
                        days.forEach(day => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          if (!filtered.find(d => d.date === dateStr)) {
                            filtered.push({
                              date: dateStr,
                              timeSlot: format(day, "yyyy-MM-dd'T'09:00:00") // Default 9 AM
                            });
                          }
                        });

                        // Sort by date
                        filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                        setBookingDetails(filtered);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="border rounded-lg p-4 space-y-3 max-h-[300px] overflow-y-auto">
                {bookingDetails.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No dates selected. Click "Add Dates" to start.
                  </div>
                ) : (
                  bookingDetails.map((detail, index) => (
                    <div key={detail.date} className="flex items-center gap-4 bg-muted/30 p-3 rounded-md">
                      <div className="w-[150px] font-medium">
                        {format(new Date(detail.date), "PPP")}
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          type="time"
                          value={getLocalHHMM(detail.timeSlot)}
                          min="08:00"
                          max="21:00"
                          onChange={(e) => {
                            const time = e.target.value;
                            const newDetails = [...bookingDetails];
                            newDetails[index] = {
                              ...detail,
                              timeSlot: `${detail.date}T${time}:00`
                            };
                            setBookingDetails(newDetails);
                          }}
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          To: {(() => {
                            const date = new Date(detail.timeSlot);
                            if (isNaN(date.getTime())) return "11:00 AM";
                            const endDate = new Date(date.getTime() + 2 * 60 * 60 * 1000);
                            return format(endDate, "hh:mm a");
                          })()}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          const newDetails = bookingDetails.filter((_, i) => i !== index);
                          setBookingDetails(newDetails);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <Label>Pricing Type</Label>
              <Select value={pricingType} onValueChange={setPricingType}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div></div>
            {pricingType == "guest" && <div className="p-4 rounded-xl border bg-white shadow-sm col-span-full">

              <h3 className="text-lg font-semibold mb-4">Guest Information</h3>

              <div className="flex  flex-col">

                <div className="flex items-center justify-center gap-x-5">

                  <div className="w-1/2">
                    <Label className="text-sm font-medium mb-1 block whitespace-nowrap">
                      Guest Name *
                    </Label>
                    {/* {console.log(form)} */}

                    <FormInput
                      label=""
                      type="text"
                      value={guestSec.guestName}
                      onChange={(val) => setGuestSec((prev) => ({ ...prev, guestName: val }))}
                    />
                  </div>

                  <div className="w-1/2">
                    <Label className="text-sm font-medium mb-1 block whitespace-nowrap">
                      Contact
                    </Label>

                    <FormInput
                      label=""
                      type="number"
                      value={guestSec.guestContact}
                      onChange={(val) => setGuestSec((prev) => ({ ...prev, guestContact: val }))}
                      min="0"
                    />
                  </div>

                </div>

                <div className="sm:col-span-2 lg:col-span-1">
                  <Label className="text-sm font-medium my-2 block whitespace-nowrap">
                    Who will Pay?
                  </Label>
                  <Select
                    value={guestSec.paidBy}
                    onValueChange={(val) => setGuestSec((prev) => ({ ...prev, paidBy: val }))}
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
            </div>}

            {/* Accounting Summary Section for Edit */}
            <PhotoshootPaymentSection
              onChange={(field, value) => {
                if (field === "paymentStatus") {
                  setPaymentStatus(value);
                  if (value === "PAID") {
                    setPaidAmount(totalPrice);
                  } else if (value === "UNPAID") {
                    setPaidAmount(0);
                  } else if (value === "HALF_PAID") {
                    if (paidAmount === 0) {
                      setPaidAmount(totalPrice / 2);
                    }
                  }
                } else if (field === "paidAmount") {
                  setPaidAmount(value);
                } else if (field === "paymentMode") {
                  setPPaymentMode(value);
                } else if (field === "card_number") {
                  setPCardNumber(value);
                } else if (field === "check_number") {
                  setPCheckNumber(value);
                } else if (field === "bank_name") {
                  setPBankName(value);
                }
              }}
              form={{
                paymentStatus: paymentStatus,
                totalPrice: totalPrice,
                paidAmount: paidAmount,
                pendingAmount: totalPrice - paidAmount,
                paymentMode: pPaymentMode,
                card_number: pCardNumber,
                check_number: pCheckNumber,
                bank_name: pBankName
              } as any}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditModal}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* booking details */}
      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
        <DialogContent className="p-0 max-w-5xl min-w-4xl overflow-hidden">
          {detailBooking && (
            <PhotoshootBookingDetailsCard
              booking={detailBooking}
              className="rounded-none border-0 shadow-none"
            />
          )}
        </DialogContent>
      </Dialog>

      <VouchersDialog
        viewVouchers={viewVouchers}
        onClose={() => setViewVouchers(null)}
        vouchers={vouchers as any}
        isLoadingVouchers={isLoadingVouchers}
      />

      {/* Delete Dialog */}
      <Dialog open={!!deleteBooking} onOpenChange={() => setDeleteBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Booking</DialogTitle>
          </DialogHeader>
          <p className="py-4">Are you sure you want to delete this booking?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteBooking(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteBooking && deleteMutation.mutate({ bookID: deleteBooking.id, reason: "Cancelled by Admin" })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}