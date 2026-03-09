import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { Progress } from "@/components/ui/progress";
import {
  Plus, Edit, Trash2, Eye, X, Calendar as CalendarIcon, TrendingUp, BarChart3,
  BedDouble, Loader2, DollarSign, Wallet, CreditCard, Activity, ArrowUpRight,
  TrendingDown, CheckCircle2, Clock, AlertCircle, Info
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAffiliatedClubs,
  getAffiliatedClubRequests,
  createAffiliatedClub,
  updateAffiliatedClub,
  deleteAffiliatedClub,
  updateAffiliatedClubRequestStatus,
  getAffiliatedClubStats,
  getAffiliatedBookingStats,
  createAffiliatedRoomBooking,
  updateAffiliatedRoomBooking,
  getAffiliatedRoomBookings,
  getRoomTypes,
  getRooms,
  cancelReqBooking,
  updateCancellationReq,
  getVouchers,
  closeBooking,
} from "../../config/apis";
import type { AffiliatedClub, CreateAffiliatedClubDto, UpdateAffiliatedClubDto, AffiliatedClubRequest } from "@/types/affiliated-club.type";
import { useToast } from "@/hooks/use-toast";
import { BookingDetailsCard } from "@/components/details/RoomBookingDets";
import { BookingsTable } from "@/components/BookingsTable";
import { EditBookingDialog } from "@/components/EditBookingDialog";
import { VouchersDialog } from "@/components/VouchersDialog";
import { CancelBookingDialog } from "@/components/CancelBookingDialog";
import { CloseBookingDialog } from "@/components/CloseBookingDialog";
import { BookingFormComponent } from "@/components/BookingForm";
// Import types and utilities
import {
  Booking,
  BookingForm,
  Room,
  RoomType,
} from "@/types/room-booking.type";
import { initialFormState, calculateAccountingValues, calculatePrice, calculateAdvanceDetails } from "@/utils/bookingUtils";

// ─── Types ───────────────────────────────────────────────────────────────────

// ─── Component ───────────────────────────────────────────────────────────────

const affInitialForm: BookingForm = {
  ...initialFormState,
  pricingType: "guest",
  paidBy: "GUEST",
};

export default function AffiliatedClubs() {
  const [activeTab, setActiveTab] = useState("clubs");
  const [clubDialog, setClubDialog] = useState(false);
  const [editingClub, setEditingClub] = useState<AffiliatedClub | null>(null);
  const [clubForm, setClubForm] = useState<CreateAffiliatedClubDto & { id?: number }>({
    name: "", location: "", contactNo: "", email: "", description: "", isActive: true, order: 0,
  });
  const [viewRequest, setViewRequest] = useState<AffiliatedClubRequest | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()), to: endOfMonth(new Date()),
  });
  const [requestDateRange, setRequestDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()), to: endOfMonth(new Date()),
  });
  const [requestClubId, setRequestClubId] = useState<string>("ALL");

  // ─── Room Booking State (shared BookingForm) ──────────────
  const [bookingDialog, setBookingDialog] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [viewVouchers, setViewVouchers] = useState<Booking | null>(null);
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);
  const [closeBookingTarget, setCloseBookingTarget] = useState<Booking | null>(null);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingTab, setBookingTab] = useState("ACTIVE");

  const [form, setForm] = useState<BookingForm>(affInitialForm);
  const [editForm, setEditForm] = useState<BookingForm>(affInitialForm);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [affClubId, setAffClubId] = useState("");
  const [affMembershipNo, setAffMembershipNo] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ─── Queries ──────────────────────────────────────────────

  const { data: clubs = [], isLoading: isLoadingClubs } = useQuery<AffiliatedClub[]>({
    queryKey: ["affiliatedClubs"],
    queryFn: getAffiliatedClubs,
    retry: 1,
  });

  const { data: requests = [], isLoading: isLoadingRequests } = useQuery<AffiliatedClubRequest[]>({
    queryKey: ["affiliatedClubRequests", requestDateRange.from, requestDateRange.to, requestClubId],
    queryFn: () => getAffiliatedClubRequests(
      format(requestDateRange.from, "yyyy-MM-dd"),
      format(requestDateRange.to, "yyyy-MM-dd"),
      requestClubId === "ALL" ? undefined : Number(requestClubId)
    ),
    retry: 1,
  });

  const { data: stats = [], isLoading: isLoadingStats } = useQuery({
    queryKey: ["affiliatedClubStats", dateRange.from, dateRange.to],
    queryFn: () => getAffiliatedClubStats(format(dateRange.from, "yyyy-MM-dd"), format(dateRange.to, "yyyy-MM-dd")),
    retry: 1,
  });

  const { data: roomTypes = [] } = useQuery<RoomType[]>({
    queryKey: ["roomTypes"],
    queryFn: getRoomTypes,
  });

  const { data: allRooms = [] } = useQuery<Room[]>({
    queryKey: ["allRooms"],
    queryFn: getRooms,
  });

  const { data: affiliatedBookings, isLoading: isLoadingBookings } = useQuery({
    queryKey: ["affiliatedBookings", bookingPage, bookingTab],
    queryFn: () => getAffiliatedRoomBookings({ page: bookingPage, limit: 10, status: bookingTab }),
  });

  const { data: bookingVouchers = [], isLoading: isLoadingVouchers } = useQuery<any[]>({
    queryKey: ["vouchers", viewVouchers?.id],
    queryFn: () => (viewVouchers ? getVouchers("AFF_ROOM", viewVouchers.id) : []),
    enabled: !!viewVouchers,
  });

  // ─── Mutations ────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: createAffiliatedClub,
    onSuccess: () => {
      toast({ title: "Club created successfully" });
      queryClient.invalidateQueries({ queryKey: ["affiliatedClubs"] });
      setClubDialog(false);
    },
    onError: (error: { message?: string }) => toast({ title: "Failed to create club", description: error?.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: updateAffiliatedClub,
    onSuccess: () => {
      toast({ title: "Club updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["affiliatedClubs"] });
      setClubDialog(false);
    },
    onError: (error: { message?: string }) => toast({ title: "Failed to update club", description: error?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAffiliatedClub,
    onSuccess: () => {
      toast({ title: "Club deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["affiliatedClubs"] });
    },
    onError: (error: { message?: string }) => toast({ title: "Failed to delete club", description: error?.message, variant: "destructive" }),
  });

  const updateRequestStatusMutation = useMutation({
    mutationFn: updateAffiliatedClubRequestStatus,
    onSuccess: () => {
      toast({ title: "Request status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["affiliatedClubRequests"] });
      setViewRequest(null);
    },
    onError: (error: { message?: string }) => toast({ title: "Failed to update request status", description: error?.message, variant: "destructive" }),
  });

  const createBookingMutation = useMutation({
    mutationFn: createAffiliatedRoomBooking,
    onSuccess: () => {
      toast({ title: "Room booking created successfully" });
      setBookingDialog(false);
      resetBookingForm();
      queryClient.invalidateQueries({ queryKey: ["affiliatedBookings"] });
    },
    onError: (error: { message?: string }) => toast({ title: "Failed to create booking", description: error?.message, variant: "destructive" }),
  });

  const updateBookingMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) => updateAffiliatedRoomBooking(id, data),
    onSuccess: () => {
      toast({ title: "Booking updated successfully" });
      setEditBooking(null);
      queryClient.invalidateQueries({ queryKey: ["affiliatedBookings"] });
    },
    onError: (error: { message?: string }) => toast({ title: "Update failed", description: error?.message, variant: "destructive" }),
  });

  const cancelBookingMutation = useMutation({
    mutationFn: ({ bookID, reason }: { bookID: string; reason: string }) =>
      cancelReqBooking("room_aff", bookID, reason),
    onSuccess: () => {
      toast({ title: "Cancellation request sent successfully" });
      setCancelBooking(null);
      queryClient.invalidateQueries({ queryKey: ["affiliatedBookings"] });
    },
    onError: (error: { message?: string }) => toast({ title: "Cancellation request failed", description: error?.message, variant: "destructive" }),
  });

  const updateBookingCancellationMutation = useMutation({
    mutationFn: ({ bookID, status, remarks }: { bookID: string; status: "APPROVED" | "REJECTED"; remarks?: string }) =>
      updateCancellationReq("room_aff", bookID, status, remarks),
    onSuccess: () => {
      toast({ title: "Cancellation request updated successfully" });
      setDetailBooking(null);
      queryClient.invalidateQueries({ queryKey: ["affiliatedBookings"] });
    },
    onError: (error: { message?: string }) => toast({ title: "Failed to update cancellation request", description: error?.message, variant: "destructive" }),
  });

  const resetBookingForm = useCallback(() => {
    setForm(affInitialForm);
    setSelectedRoomIds([]);
    setAffClubId("");
    setAffMembershipNo("");
  }, []);

  const resetEditForm = useCallback(() => {
    setEditForm(affInitialForm);
    setEditBooking(null);
    setSelectedRoomIds([]);
    setAffClubId("");
    setAffMembershipNo("");
  }, []);

  const handleEditBooking = useCallback((booking: Booking) => {
    setEditBooking(booking);
    setEditForm({
      ...initialFormState,
      roomTypeId: booking.rooms[0]?.room?.roomTypeId?.toString() || "",
      checkIn: format(new Date(booking.checkIn), "yyyy-MM-dd'T'HH:mm"),
      checkOut: format(new Date(booking.checkOut), "yyyy-MM-dd'T'HH:mm"),
      guestName: booking.guestName || "",
      guestContact: booking.guestContact || "",
      guestCNIC: booking.guestCNIC || "",
      numberOfAdults: booking.numberOfAdults || 1,
      numberOfChildren: booking.numberOfChildren || 0,
      specialRequests: booking.specialRequests || "",
      paymentStatus: booking.paymentStatus,
      paymentMode: (booking.paymentMode as Booking["paymentMode"]) || "CASH",
      paidAmount: Number(booking.paidAmount),
      existingPaidAmount: Number(booking.paidAmount),
      newPaymentAmount: 0,
      totalPrice: Number(booking.totalPrice),
      card_number: booking.card_number || "",
      check_number: booking.check_number || "",
      bank_name: booking.bank_name || "",
      transaction_id: booking.transaction_id || "",
      paid_at: booking.paid_at ? format(new Date(booking.paid_at), "yyyy-MM-dd'T'HH:mm") : "",
      pricingType: "guest",
      paidBy: "GUEST",
      heads: (booking as any).extraCharges || [],
    });
    setAffClubId(booking.affiliatedClubId?.toString() || "");
    setAffMembershipNo(booking.affiliatedMembershipNo || "");
    setSelectedRoomIds(booking.rooms.map((r: { roomId: number }) => r.roomId.toString()));
  }, []);

  // ─── Club Handlers ────────────────────────────────────────

  const openCreateDialog = () => {
    setEditingClub(null);
    setClubForm({ name: "", location: "", contactNo: "", email: "", description: "", isActive: true, order: 0 });
    setClubDialog(true);
  };

  const openEditDialog = (club: AffiliatedClub) => {
    setEditingClub(club);
    setClubForm({
      id: club.id,
      name: club.name,
      location: club.location || "",
      contactNo: club.contactNo || "",
      email: club.email || "",
      description: club.description || "",
      isActive: club.isActive,
      order: club.order || 0,
      image: club.image,
    });
    setClubDialog(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setClubForm({ ...clubForm, file: e.target.files[0] });
    }
  };

  const handleRemoveImage = () => {
    setClubForm({ ...clubForm, image: "", file: undefined });
  };

  const handleCreateClub = () => {
    if (!clubForm.name.trim()) return toast({ title: "Name is required", variant: "destructive" });
    createMutation.mutate(clubForm);
  };

  const handleUpdateClub = () => {
    if (!clubForm.name.trim()) return toast({ title: "Name is required", variant: "destructive" });
    updateMutation.mutate(clubForm);
  };

  const handleDeleteClub = (id: number) => {
    if (window.confirm("Are you sure you want to delete this club?")) {
      deleteMutation.mutate(id);
    }
  };

  // ─── Request Handlers ─────────────────────────────────────

  const handleApproveRequest = (id: number) => {
    updateRequestStatusMutation.mutate({ id, status: "APPROVED" });
  };

  const handleRejectRequest = (id: number) => {
    updateRequestStatusMutation.mutate({ id, status: "REJECTED" });
  };

  // ─── Effects ──────────────────────────────────────────────

  useEffect(() => {
    const targetForm = editBooking ? editForm : form;
    if (targetForm.roomTypeId) {
      const filtered = allRooms.filter(r => r.roomTypeId.toString() === targetForm.roomTypeId && r.isActive);
      setAvailableRooms(filtered);
    } else {
      setAvailableRooms([]);
    }
  }, [form.roomTypeId, editForm.roomTypeId, allRooms, editBooking, form, editForm]);

  const sanitizeAffPayload = useCallback((formData: BookingForm) => ({
    affiliatedClubId: Number(affClubId),
    affiliatedMembershipNo: affMembershipNo,
    totalPrice: String(formData.totalPrice),
    paymentStatus: formData.paymentStatus,
    paymentMode: formData.paymentMode,
    paidAmount: formData.paidAmount,
    checkIn: formData.checkIn,
    checkOut: formData.checkOut,
    selectedRoomIds,
    numberOfAdults: formData.numberOfAdults,
    numberOfChildren: formData.numberOfChildren,
    specialRequests: formData.specialRequests,
    guestName: formData.guestName,
    guestContact: formData.guestContact,
    guestCNIC: formData.guestCNIC,
    heads: formData.heads,
    card_number: formData.card_number,
    check_number: formData.check_number,
    transaction_id: formData.transaction_id,
    bank_name: formData.bank_name,
    paid_at: formData.paid_at,
  }), [affClubId, affMembershipNo, selectedRoomIds]);

  const handleUpdate = useCallback(() => {
    if (!editBooking) return;
    updateBookingMutation.mutate({
      id: editBooking.id,
      data: {
        ...sanitizeAffPayload(editForm),
        paymentStatus: editForm.paymentStatus || editBooking.paymentStatus || "UNPAID",
        id: editBooking.id, // Update DTO requires id in body
      },
    });
  }, [editBooking, editForm, updateBookingMutation, sanitizeAffPayload]);

  // Form field change handler — guest pricing is always auto-applied
  const handleFormChange = useCallback((field: keyof BookingForm, value: BookingForm[keyof BookingForm], isEdit = false) => {
    const setter = isEdit ? setEditForm : setForm;
    setter(prev => {
      const newForm = { ...prev, [field]: value };

      if (["checkIn", "checkOut", "roomTypeId", "heads"].includes(field as string)) {
        if (newForm.checkIn && newForm.checkOut && newForm.roomTypeId) {
          const basePrice = calculatePrice(
            newForm.roomTypeId,
            "guest",
            newForm.checkIn,
            newForm.checkOut,
            roomTypes
          );
          const headsTotal = newForm.heads.reduce((sum: number, h: any) => sum + (Number(h.amount) || 0), 0);
          const totalPrice = (basePrice * selectedRoomIds.length) + headsTotal;
          const oldTotal = isEdit ? (Number(editBooking?.totalPrice) || 0) : (Number(prev.totalPrice) || 0);
          const oldPaid = isEdit ? (Number(editBooking?.paidAmount) || 0) : (Number(prev.paidAmount) || 0);
          const oldPending = isEdit ? (Number(editBooking?.pendingAmount) || 0) : (Number(prev.pendingAmount) || 0);
          const oldPaymentStatus = isEdit ? (editBooking?.paymentStatus || "UNPAID") : prev.paymentStatus;

          newForm.totalPrice = totalPrice;

          // Maintain the same price increase/decrease logic as RoomBookings.tsx
          if (isEdit) {
            if (totalPrice > oldTotal) {
              // PRICE INCREASE
              if (oldPaymentStatus === "PAID") {
                // Only downgrade if the new price actually exceeds what was already paid
                if (totalPrice > oldPaid) {
                  newForm.paymentStatus = "HALF_PAID";
                } else {
                  newForm.paymentStatus = "PAID";
                }
              }
              newForm.paidAmount = oldPaid;
              newForm.existingPaidAmount = oldPaid;
              newForm.newPaymentAmount = 0;
              newForm.pendingAmount = totalPrice - oldPaid;
            } else if (totalPrice < oldTotal) {
              // PRICE DECREASE
              newForm.paidAmount = oldPaid;
              newForm.existingPaidAmount = oldPaid;
              newForm.newPaymentAmount = 0;
              newForm.pendingAmount = totalPrice - oldPaid;

              if (newForm.pendingAmount <= 0) {
                newForm.paymentStatus = "PAID";
              } else if (oldPaymentStatus === "PAID" || oldPaymentStatus === "HALF_PAID") {
                newForm.paymentStatus = "HALF_PAID";
              }
            } else {
              newForm.paidAmount = oldPaid;
              newForm.existingPaidAmount = oldPaid;
              newForm.newPaymentAmount = 0;
              newForm.pendingAmount = totalPrice - oldPaid;
            }
          } else {
            const { pendingAmount } = calculateAccountingValues(newForm.paymentStatus, totalPrice, newForm.paidAmount);
            newForm.pendingAmount = pendingAmount;
          }
        }
      }

      if (field === "newPaymentAmount") {
        const newAmt = Number(value) || 0;
        newForm.paidAmount = (Number(newForm.existingPaidAmount) || 0) + newAmt;
        newForm.pendingAmount = Number(newForm.totalPrice) - newForm.paidAmount;

        if (newForm.paidAmount >= Number(newForm.totalPrice) && newForm.paymentStatus !== "PAID") {
          newForm.paymentStatus = "PAID";
        } else if (!editBooking && newForm.paidAmount > 0 && newForm.paidAmount < Number(newForm.totalPrice) && newForm.paymentStatus !== "HALF_PAID") {
          newForm.paymentStatus = "HALF_PAID";
        }
      }

      if (field === "paidAmount") {
        const { pendingAmount } = calculateAccountingValues(newForm.paymentStatus, Number(newForm.totalPrice), Number(value));
        newForm.pendingAmount = pendingAmount;
      }

      if (field === "paymentStatus") {
        if (value === "PAID") {
          const neededNewPayment = Math.max(0, Number(newForm.totalPrice) - (Number(newForm.existingPaidAmount) || 0));
          newForm.newPaymentAmount = neededNewPayment;
          newForm.paidAmount = Number(newForm.totalPrice);
          newForm.pendingAmount = 0;
        } else if (value === "UNPAID") {
          newForm.newPaymentAmount = 0;
          newForm.paidAmount = Number(newForm.existingPaidAmount) || 0;
          newForm.pendingAmount = Number(newForm.totalPrice) - newForm.paidAmount;
        } else if (value === "HALF_PAID" || value === "ADVANCE_PAYMENT") {
          newForm.pendingAmount = Number(newForm.totalPrice) - Number(newForm.paidAmount);
        }
      }

      return newForm;
    });
  }, [roomTypes, selectedRoomIds, editBooking]);

  const handleRoomSelection = useCallback((roomId: string) => {
    setSelectedRoomIds(prev => {
      const newIds = prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId];

      const updateForm = (f: BookingForm) => {
        const basePrice = calculatePrice(f.roomTypeId, "guest", f.checkIn, f.checkOut, roomTypes);
        const headsTotal = f.heads.reduce((sum: number, h: any) => sum + (Number(h.amount) || 0), 0);
        const totalPrice = (basePrice * newIds.length) + headsTotal;
        const isEdit = !!editBooking;

        let newPaid = f.paidAmount;
        let newPending = 0;
        let newStatus = f.paymentStatus;
        let newPaymentAmount = f.newPaymentAmount;

        if (isEdit) {
          const oldTotal = Number(editBooking?.totalPrice) || 0;
          const oldPaid = Number(editBooking?.paidAmount) || 0;
          const oldPaymentStatus = editBooking?.paymentStatus || "UNPAID";

          if (totalPrice > oldTotal) {
            // PRICE INCREASE
            if (oldPaymentStatus === "PAID") {
              if (totalPrice > oldPaid) {
                newStatus = "HALF_PAID";
              } else {
                newStatus = "PAID";
              }
            }
            newPaid = oldPaid;
            newPending = totalPrice - oldPaid;
            newPaymentAmount = 0;
          } else if (totalPrice < oldTotal) {
            // PRICE DECREASE
            newPaid = oldPaid;
            newPending = totalPrice - oldPaid;
            if (newPending <= 0) {
              newStatus = "PAID";
            } else if (oldPaymentStatus === "PAID" || oldPaymentStatus === "HALF_PAID") {
              newStatus = "HALF_PAID";
            }
            newPaymentAmount = 0;
          } else {
            newPaid = oldPaid;
            newPending = totalPrice - oldPaid;
            newPaymentAmount = 0;
          }
        } else {
          const accounting = calculateAccountingValues(newStatus, totalPrice, f.paidAmount);
          newPaid = accounting.paid;
          newPending = accounting.pendingAmount;
          newPaymentAmount = newPaid;
        }

        return {
          ...f,
          totalPrice,
          paidAmount: newPaid,
          paymentStatus: newStatus,
          existingPaidAmount: isEdit ? (Number(editBooking?.paidAmount) || 0) : 0,
          newPaymentAmount,
          pendingAmount: newPending
        };
      };

      if (editBooking) setEditForm(prevF => updateForm(prevF));
      else setForm(prevF => updateForm(prevF));

      return newIds;
    });
  }, [roomTypes, editBooking]);

  const handleCreateBooking = () => {
    if (!affClubId) return toast({ title: "Select an affiliated club", variant: "destructive" });
    if (!affMembershipNo.trim()) return toast({ title: "Enter the membership number", variant: "destructive" });
    if (selectedRoomIds.length === 0) return toast({ title: "Select at least one room", variant: "destructive" });
    if (!form.checkIn || !form.checkOut) return toast({ title: "Select check-in and check-out dates", variant: "destructive" });

    createBookingMutation.mutate(sanitizeAffPayload(form));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED": return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case "REJECTED": return <Badge variant="destructive">Rejected</Badge>;
      case "PENDING": return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

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
        return <Badge className="bg-purple-600 text-white">Advance Paid</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const DetailBookingView = ({ booking }: { booking: Booking }) => {
    const { data: detailVouchers = [], isLoading } = useQuery({
      queryKey: ['vouchers', 'ROOM', booking.id],
      queryFn: () => getVouchers('AFF_ROOM', booking.id.toString()),
      enabled: !!booking.id,
    });

    return (
      <BookingDetailsCard
        booking={booking}
        vouchers={isLoading ? [] : detailVouchers}
      />
    );
  };

  const BookingStatsView = ({ dateRange }: { dateRange: { from: Date; to: Date } }) => {
    const { data: bookingStats = [], isLoading } = useQuery({
      queryKey: ["affiliatedBookingStats", dateRange.from, dateRange.to],
      queryFn: () => getAffiliatedBookingStats(format(dateRange.from, "yyyy-MM-dd"), format(dateRange.to, "yyyy-MM-dd")),
      retry: 1,
    });

    if (isLoading) return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Analyzing revenue data...</p>
      </div>
    );

    const totals = bookingStats.reduce((acc: any, curr: any) => ({
      revenue: acc.revenue + curr.totalRevenue,
      paid: acc.paid + curr.totalPaid,
      pending: acc.pending + curr.totalPending,
      bookings: acc.bookings + curr.bookingCount,
    }), { revenue: 0, paid: 0, pending: 0, bookings: 0 });

    const SummaryCard = ({ title, value, icon: Icon, color, subValue }: any) => (
      <Card className="overflow-hidden border-none shadow-sm relative group">
        <div className={cn("absolute inset-0 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity", color)} />
        <CardContent className="p-5">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
              <h3 className="text-2xl font-bold tracking-tight">
                {typeof value === 'number' && title.includes('Amount') || title.includes('Revenue')
                  ? `Rs ${value.toLocaleString()}`
                  : value}
              </h3>
              {subValue && <p className="text-[10px] text-muted-foreground font-medium">{subValue}</p>}
            </div>
            <div className={cn("p-2.5 rounded-xl transition-transform group-hover:scale-110 duration-300", color.replace('bg-', 'bg-').replace('opacity-', 'opacity-10'))}>
              <Icon className={cn("h-5 w-5", color.replace('bg-', 'text-'))} />
            </div>
          </div>
        </CardContent>
      </Card>
    );

    return (
      <div className="space-y-6 animate-in fade-in duration-700">
        {/* Top Summary Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total Revenue"
            value={totals.revenue}
            icon={DollarSign}
            color="bg-blue-600 text-blue-600"
            subValue="Expected total from all bookings"
          />
          <SummaryCard
            title="Amount Realized"
            value={totals.paid}
            icon={CheckCircle2}
            color="bg-emerald-600 text-emerald-600"
            subValue={`${((totals.paid / (totals.revenue || 1)) * 100).toFixed(1)}% recovery rate`}
          />
          <SummaryCard
            title="Outstanding"
            value={totals.pending}
            icon={Clock}
            color="bg-orange-600 text-orange-600"
            subValue="Payments still to be received"
          />
          <SummaryCard
            title="Total Bookings"
            value={totals.bookings}
            icon={Activity}
            color="bg-primary text-primary"
            subValue={`Across ${bookingStats.length} active clubs`}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 shadow-xl border-none bg-gradient-to-b from-card to-secondary/5 overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <h4 className="text-lg font-bold">Revenue Performance</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">Comparative revenue analysis across affiliated clubs</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-[10px] font-bold text-white">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    <span>{format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}</span>
                  </div>
                </div>
              </div>

              <div className="h-[380px] w-full mt-4">
                {bookingStats.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-4 bg-secondary/10 rounded-2xl border border-dashed border-border/50">
                    <BarChart3 className="h-12 w-12 opacity-10" />
                    <div className="text-center">
                      <p className="font-semibold">No performance data</p>
                      <p className="text-xs opacity-60">Adjust the date filters to see results</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bookingStats} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis
                        dataKey="clubName"
                        axisLine={false}
                        tickLine={false}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                        height={60}
                        fontSize={11}
                        fontWeight={500}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        fontSize={11}
                        fontWeight={500}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(val) => `Rs ${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`}
                      />
                      <Tooltip
                        cursor={{ fill: 'hsl(var(--secondary) / 0.5)', radius: 8 }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border border-border shadow-2xl rounded-xl p-4 min-w-[200px] backdrop-blur-md bg-opacity-95">
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{data.clubName}</p>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center bg-primary/5 p-2 rounded-lg">
                                    <span className="text-[10px] font-medium">Total Price</span>
                                    <span className="text-xs font-bold">Rs {data.totalRevenue.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center bg-emerald-500/5 p-2 rounded-lg">
                                    <span className="text-[10px] font-medium text-emerald-600">Collected</span>
                                    <span className="text-xs font-bold text-emerald-600">Rs {data.totalPaid.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center bg-orange-500/5 p-2 rounded-lg">
                                    <span className="text-[10px] font-medium text-orange-600">Pending</span>
                                    <span className="text-xs font-bold text-orange-600">Rs {data.totalPending.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="totalRevenue" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={32}>
                        {bookingStats.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 h-[560px] flex flex-col">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <BarChart3 className="h-4 w-4" />
                <span>Club Insights</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-secondary/50 border-border/50">
                {bookingStats.length} Clubs
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {bookingStats.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-secondary/5 rounded-3xl border border-dashed border-border">
                  <Info className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-xs">No clubs found for this category</p>
                </div>
              ) : (
                bookingStats.map((item: any) => {
                  const payRate = (item.totalPaid / (item.totalRevenue || 1)) * 100;
                  return (
                    <Card key={item.clubName} className="group border-none shadow-sm hover:shadow-md transition-all duration-300 bg-card/40 backdrop-blur-sm overflow-hidden border-l-4 border-l-transparent hover:border-l-primary">
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-0.5">
                              <h5 className="text-xs font-black uppercase tracking-widest text-foreground group-hover:text-primary transition-colors">{item.clubName}</h5>
                              <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                {item.bookingCount} Room Bookings
                              </p>
                            </div>
                            <div className={cn(
                              "text-[10px] font-black px-2 py-1 rounded-md",
                              payRate >= 100 ? "bg-emerald-500/10 text-emerald-600" :
                                payRate > 50 ? "bg-orange-500/10 text-orange-600" : "bg-destructive/10 text-destructive"
                            )}>
                              {payRate.toFixed(0)}% PAID
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold mb-1 px-0.5">
                              <span className="text-muted-foreground">COLLECTION RATE</span>
                              <span>Rs {item.totalPaid.toLocaleString()} / Rs {item.totalRevenue.toLocaleString()}</span>
                            </div>
                            <Progress value={payRate} className="h-1.5 bg-secondary" />
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="bg-emerald-500/[0.03] border border-emerald-500/10 rounded-xl p-3 space-y-1">
                              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5 font-black">
                                <CheckCircle2 className="h-3 w-3" /> Fully Paid
                              </p>
                              <p className="text-sm font-black text-emerald-700">{item.paidBookingsCount}</p>
                            </div>
                            <div className="bg-orange-500/[0.03] border border-orange-500/10 rounded-xl p-3 space-y-1">
                              <p className="text-[9px] font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1.5 font-black">
                                <AlertCircle className="h-3 w-3" /> Pending
                              </p>
                              <p className="text-sm font-black text-orange-700">Rs {item.totalPending.toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[9px] text-muted-foreground font-black pt-2 uppercase tracking-widest border-t border-border/30 px-1">
                            <span className="flex items-center gap-1"><div className="h-1 w-1 rounded-full bg-slate-400" /> Unpaid: {item.unpaidBookingsCount}</span>
                            <span className="flex items-center gap-1"><div className="h-1 w-1 rounded-full bg-slate-400" /> Half: {item.halfPaidBookingsCount}</span>
                            <span className="flex items-center gap-1"><div className="h-1 w-1 rounded-full bg-slate-400" /> Adv: {item.advancePaidBookingsCount}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoadingClubs) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Affiliated Clubs</h2>
          <p className="text-muted-foreground">Manage affiliated clubs and member requests</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="clubs">Affiliated Clubs</TabsTrigger>
          <TabsTrigger value="requests">Club Requests</TabsTrigger>
          <TabsTrigger value="bookings">Room Bookings</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        {/* ─── Clubs Tab ─── */}
        <TabsContent value="clubs" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />Add Club
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clubs.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No clubs found</TableCell></TableRow>
                  ) : (
                    clubs.map((club) => (
                      <TableRow key={club.id}>
                        <TableCell>
                          <Avatar>
                            <AvatarImage src={club.image} alt={club.name} />
                            <AvatarFallback>{club.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{club.name}</TableCell>
                        <TableCell>{club.location || "N/A"}</TableCell>
                        <TableCell>{club.contactNo || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={club.isActive ? "default" : "secondary"}>
                            {club.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(club)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClub(club.id)}
                              disabled={deleteMutation.isPending}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Requests Tab ─── */}
        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">Date Range</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-[240px] justify-start text-left font-normal h-9", !requestDateRange && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {requestDateRange.from ? (
                          requestDateRange.to ? (
                            <>{format(requestDateRange.from, "LLL dd, y")} - {format(requestDateRange.to, "LLL dd, y")}</>
                          ) : format(requestDateRange.from, "LLL dd, y")
                        ) : <span>Pick a date range</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar initialFocus mode="range" defaultMonth={requestDateRange.from}
                        selected={{ from: requestDateRange.from, to: requestDateRange.to }}
                        onSelect={(range: { from?: Date; to?: Date } | undefined) => range?.from && range?.to && setRequestDateRange(range as { from: Date; to: Date })}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">Club</Label>
                  <Select value={requestClubId} onValueChange={setRequestClubId}>
                    <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="All Clubs" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Clubs</SelectItem>
                      {clubs.map((club) => (
                        <SelectItem key={club.id} value={String(club.id)}>{club.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead>Member No</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingRequests ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8">Loading requests...</TableCell></TableRow>
                  ) : requests.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No requests found</TableCell></TableRow>
                  ) : (
                    requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="text-sm">{format(new Date(request.createdAt), "MMM dd, yyyy")}</TableCell>
                        <TableCell className="font-medium">{request.affiliatedClub?.name}</TableCell>
                        <TableCell>{request.membershipNo}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => setViewRequest(request)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Room Bookings Tab ─── */}
        <TabsContent value="bookings" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-xl font-semibold">Affiliated Room Bookings</h3>
            <Button onClick={() => { resetBookingForm(); setBookingDialog(true); }}>
              <Plus className="h-4 w-4" />
              New Booking
            </Button>
          </div>

          <Tabs value={bookingTab} onValueChange={(val) => { setBookingTab(val); setBookingPage(1); }}>
            <TabsList className="w-full sm:w-auto grid grid-cols-4">
              <TabsTrigger value="ACTIVE">Active</TabsTrigger>
              <TabsTrigger value="REQUESTS">Requested</TabsTrigger>
              <TabsTrigger value="CANCELLED">Cancelled</TabsTrigger>
              <TabsTrigger value="CLOSED">Closed</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-4">
            <BookingsTable
              bookings={affiliatedBookings?.data || []}
              isLoading={isLoadingBookings}
              onDetail={(booking) => setDetailBooking(booking)}
              onEdit={bookingTab !== "CLOSED" ? (booking) => handleEditBooking(booking) : undefined}
              onCancel={bookingTab !== "CLOSED" ? (booking) => setCancelBooking(booking) : undefined}
              onClose={bookingTab === "ACTIVE" ? (booking) => setCloseBookingTarget(booking) : undefined}
              onViewVouchers={(booking) => setViewVouchers(booking)}
              getPaymentBadge={getPaymentBadge}
            />
            {affiliatedBookings?.lastPage > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => setBookingPage(p => Math.max(1, p - 1))} disabled={bookingPage === 1}>Previous</Button>
                <span className="flex items-center text-sm px-4">Page {bookingPage} of {affiliatedBookings.lastPage}</span>
                <Button variant="outline" size="sm" onClick={() => setBookingPage(p => Math.min(affiliatedBookings.lastPage, p + 1))} disabled={bookingPage === affiliatedBookings.lastPage}>Next</Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── Stats Tab ─── */}
        <TabsContent value="stats" className="space-y-6">
          <Tabs defaultValue="visit-stats" className="w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="visit-stats">Visit Stats</TabsTrigger>
                <TabsTrigger value="booking-stats">Booking Stats</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                        ) : format(dateRange.from, "LLL dd, y")
                      ) : <span>Pick a date range</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar initialFocus mode="range" defaultMonth={dateRange.from}
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range: { from?: Date; to?: Date } | undefined) => range?.from && range?.to && setDateRange(range as { from: Date; to: Date })}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <TabsContent value="visit-stats" className="space-y-6 mt-0">
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 shadow-sm border-none bg-secondary/10">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">Request Frequency by Club</h4>
                    </div>
                    <div className="h-[350px] w-full">
                      {isLoadingStats ? (
                        <div className="flex h-full items-center justify-center"><p className="text-muted-foreground">Loading stats...</p></div>
                      ) : stats.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-2">
                          <BarChart3 className="h-10 w-10 opacity-20" />
                          <p>No request data for this period</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                            <XAxis dataKey="clubName" axisLine={false} tickLine={false} angle={-45} textAnchor="end" interval={0} height={80} fontSize={12} />
                            <YAxis axisLine={false} tickLine={false} fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                            <Bar dataKey="requestCount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40}>
                              {stats.map((_: { clubName: string; requestCount: number }, index: number) => (
                                <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${Math.max(0.4, 1 - index * 0.1)})`} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">Top Requested Clubs</h4>
                    </div>
                    <div className="space-y-4">
                      {stats.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                      ) : (
                        stats.slice(0, 5).map((item: { clubName: string; requestCount: number }, index: number) => (
                          <div key={item.clubName} className="flex items-center justify-between p-3 rounded-md bg-secondary/30">
                            <div className="flex items-center gap-3">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</div>
                              <span className="text-sm font-medium">{item.clubName}</span>
                            </div>
                            <Badge variant="secondary" className="font-bold">{item.requestCount}</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="booking-stats" className="space-y-6 mt-0">
              <BookingStatsView dateRange={dateRange} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* ─── Club Dialog ─── */}
      <Dialog open={clubDialog} onOpenChange={setClubDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingClub ? "Edit Club" : "Add New Club"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Club Name *</Label>
                <Input id="name" value={clubForm.name} onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })} placeholder="Enter club name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={clubForm.location} onChange={(e) => setClubForm({ ...clubForm, location: e.target.value })} placeholder="Enter location" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactNo">Contact Number</Label>
                <Input id="contactNo" value={clubForm.contactNo} onChange={(e) => setClubForm({ ...clubForm, contactNo: e.target.value })} placeholder="Enter contact number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={clubForm.email} onChange={(e) => setClubForm({ ...clubForm, email: e.target.value })} placeholder="Enter email" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={clubForm.description} onChange={(e) => setClubForm({ ...clubForm, description: e.target.value })} placeholder="Enter description" rows={3} />
              <div className="grid gap-2">
                <Label htmlFor="image">Club Image (Max 5MB)</Label>
                <div className="flex items-center gap-4">
                  {(clubForm.image || clubForm.file) && (
                    <div className="relative">
                      <img src={clubForm.file ? URL.createObjectURL(clubForm.file) : clubForm.image} alt="Preview" className="h-20 w-20 object-cover rounded-md border" />
                      <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={handleRemoveImage}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <Input id="image" type="file" accept="image/*" onChange={handleFileChange} className="w-full" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Switch id="isActive" checked={clubForm.isActive ?? true} onCheckedChange={(checked) => setClubForm({ ...clubForm, isActive: checked })} />
                <Label htmlFor="isActive">Active</Label>
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="order">Display Order</Label>
                <Input id="order" type="number" value={clubForm.order} onChange={(e) => setClubForm({ ...clubForm, order: Number(e.target.value) })} placeholder="0" />
              </div>
            </div>
          </div>
          {editingClub && (
            <div className="mt-4 pt-4 border-t bg-gray-50/50 -mx-6 px-6 py-4">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-3">Audit Tracking</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-[10px] text-gray-400 uppercase">Created By</Label><div className="text-xs font-medium">{editingClub.createdBy || "System"}</div></div>
                <div><Label className="text-[10px] text-gray-400 uppercase">Created At</Label><div className="text-xs text-gray-600">{editingClub.createdAt ? new Date(editingClub.createdAt).toLocaleString("en-PK") : "N/A"}</div></div>
                <div><Label className="text-[10px] text-gray-400 uppercase">Last Updated By</Label><div className="text-xs font-medium">{editingClub.updatedBy || editingClub.createdBy || "System"}</div></div>
                <div><Label className="text-[10px] text-gray-400 uppercase">Last Updated</Label><div className="text-xs text-gray-600">{editingClub.updatedAt ? new Date(editingClub.updatedAt).toLocaleString("en-PK") : "N/A"}</div></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setClubDialog(false)} disabled={createMutation.isPending || updateMutation.isPending}>Cancel</Button>
            <Button onClick={editingClub ? handleUpdateClub : handleCreateClub} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? (
                <><span className="animate-spin mr-2">⏳</span>{editingClub ? "Updating..." : "Creating..."}</>
              ) : (editingClub ? "Update" : "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Room Booking Dialog ─── */}
      <Dialog open={bookingDialog} onOpenChange={(open) => { if (!open) resetBookingForm(); setBookingDialog(open); }}>
        <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-primary" />
              Book Room for Affiliated Club Member
            </DialogTitle>
          </DialogHeader>

          {/* ── Affiliated-specific header fields ─────────────── */}
          <div className="p-4 rounded-xl border bg-blue-50 shadow-sm mb-2">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">Affiliated Club Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="aff-club">Affiliated Club *</Label>
                <Select value={affClubId} onValueChange={setAffClubId}>
                  <SelectTrigger id="aff-club"><SelectValue placeholder="Select club..." /></SelectTrigger>
                  <SelectContent>
                    {clubs.filter(c => c.isActive).map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aff-memno">Affiliated Membership No. *</Label>
                <Input
                  id="aff-memno"
                  placeholder="e.g. AFC-12345"
                  value={affMembershipNo}
                  onChange={(e) => setAffMembershipNo(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">💡 Pricing is automatically set to guest rates for affiliated club bookings.</p>
          </div>

          {/* ── Shared booking form (member search hidden, pricing locked to guest) ── */}
          <BookingFormComponent
            form={form}
            onChange={handleFormChange}
            roomTypes={roomTypes as RoomType[]}
            availableRooms={availableRooms}
            isLoadingRoomTypes={false}
            memberSearch=""
            onMemberSearchChange={() => { }}
            showMemberResults={false}
            searchResults={[]}
            isSearching={false}
            selectedMember={null}
            onSelectMember={() => { }}
            onClearMember={() => { }}
            onSearchFocus={() => { }}
            dateStatuses={[]}
            isEdit={false}
            selectedRoomIds={selectedRoomIds}
            onRoomSelection={(roomId) => handleRoomSelection(roomId)}
            isAffiliated={true}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetBookingForm(); setBookingDialog(false); }} disabled={createBookingMutation.isPending}>Cancel</Button>
            <Button onClick={handleCreateBooking} disabled={createBookingMutation.isPending}>
              {createBookingMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
              ) : (
                <>Confirm Booking</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>      {/* ─── Request View Dialog ─── */}
      <Dialog open={!!viewRequest} onOpenChange={() => setViewRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Request Details</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Club Name</p>
                <p className="font-medium">{viewRequest?.affiliatedClub?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Membership No</p>
                <p className="font-medium">{viewRequest?.membershipNo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Requested Date</p>
                <p className="font-medium">{viewRequest && new Date(viewRequest.requestedDate).toLocaleDateString()}</p>
              </div>
            </div>
            {viewRequest?.purpose && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Purpose</p>
                <p className="font-medium">{viewRequest.purpose}</p>
              </div>
            )}
            {viewRequest && (
              <div className="mt-4 pt-4 border-t bg-gray-50/50 -mx-6 px-6 py-4">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-3">Audit Tracking</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-[10px] text-gray-400 uppercase">Created By</Label><div className="text-xs font-medium">{viewRequest.createdBy || "System"}</div></div>
                  <div><Label className="text-[10px] text-gray-400 uppercase">Created At</Label><div className="text-xs text-gray-600">{viewRequest.createdAt ? new Date(viewRequest.createdAt).toLocaleString("en-PK") : "N/A"}</div></div>
                  <div><Label className="text-[10px] text-gray-400 uppercase">Last Updated By</Label><div className="text-xs font-medium">{viewRequest.updatedBy || viewRequest.createdBy || "System"}</div></div>
                  <div><Label className="text-[10px] text-gray-400 uppercase">Last Updated</Label><div className="text-xs text-gray-600">{viewRequest.updatedAt ? new Date(viewRequest.updatedAt).toLocaleString("en-PK") : "N/A"}</div></div>
                </div>
              </div>
            )}
          </div>
          {viewRequest?.status === "PENDING" && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewRequest(null)}>Close</Button>
              <Button variant="destructive" onClick={() => { if (viewRequest) handleRejectRequest(viewRequest.id); }} disabled={updateRequestStatusMutation.isPending}>
                {updateRequestStatusMutation.isPending ? "Processing..." : "Reject"}
              </Button>
              <Button onClick={() => { if (viewRequest) handleApproveRequest(viewRequest.id); }} disabled={updateRequestStatusMutation.isPending}>
                {updateRequestStatusMutation.isPending ? "Processing..." : "Approve"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <EditBookingDialog
        editBooking={editBooking}
        editForm={editForm}
        onEditFormChange={(field, value) => handleFormChange(field, value, true)}
        roomTypes={roomTypes as RoomType[]}
        editAvailableRooms={availableRooms}
        isLoadingRoomTypes={false}
        dateStatuses={[]}
        onUpdate={handleUpdate}
        onClose={() => setEditBooking(null)}
        isUpdating={updateBookingMutation.isPending}
        selectedRoomIds={selectedRoomIds}
        onRoomSelection={(roomId) => handleRoomSelection(roomId)}
        isAffiliated={true}
        affClubId={affClubId}
        setAffClubId={setAffClubId}
        affMembershipNo={affMembershipNo}
        setAffMembershipNo={setAffMembershipNo}
        clubs={clubs}
      />

      <VouchersDialog
        viewVouchers={viewVouchers}
        onClose={() => setViewVouchers(null)}
        vouchers={bookingVouchers}
        isLoadingVouchers={isLoadingVouchers}
      />

      <CancelBookingDialog
        cancelBooking={cancelBooking}
        onClose={() => setCancelBooking(null)}
        onConfirm={(reason) => {
          if (cancelBooking) cancelBookingMutation.mutate({ bookID: String(cancelBooking.id), reason });
        }}
        isDeleting={cancelBookingMutation.isPending}
      />

      <CloseBookingDialog
        booking={closeBookingTarget}
        onClose={() => setCloseBookingTarget(null)}
        onConfirm={(bookingId, refundPayload) => {
          closeBooking("room_aff", bookingId, refundPayload).then(() => {
            toast({ title: "Booking closed successfully" });
            setCloseBookingTarget(null);
            queryClient.invalidateQueries({ queryKey: ["affiliatedBookings"] });
          }).catch((err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
          });
        }}
        isClosing={false}
      />

      <Dialog open={!!detailBooking} onOpenChange={(open) => !open && setDetailBooking(null)}>
        <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row justify-between items-center pr-10">
            <DialogTitle>Booking Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {detailBooking && (
              <>
                {bookingTab === "REQUESTS" && detailBooking.cancellationRequests?.some((r: { status: string }) => r.status === "PENDING") && (
                  <div className="flex justify-end gap-2 border-b pb-4 mb-4">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => updateBookingCancellationMutation.mutate({ bookID: String(detailBooking.id), status: "REJECTED", remarks: "Rejected by admin" })}
                      disabled={updateBookingCancellationMutation.isPending}
                    >
                      Reject Cancellation
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateBookingCancellationMutation.mutate({ bookID: String(detailBooking.id), status: "APPROVED", remarks: "Approved by admin" })}
                      disabled={updateBookingCancellationMutation.isPending}
                    >
                      Approve Cancellation
                    </Button>
                  </div>
                )}
                <DetailBookingView booking={detailBooking} />
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailBooking(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
