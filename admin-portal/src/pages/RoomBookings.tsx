import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import {
  getBookings,
  createBooking,
  updateBooking,
  deleteBooking,
  getRoomTypes,
  getAvailRooms,
  getRooms,
  searchMembers,
  getVouchers,
  getRoomDateStatuses,
} from "../../config/apis";
import { Plus, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Import reusable components
import { BookingsTable } from "@/components/BookingsTable";
import { EditBookingDialog } from "@/components/EditBookingDialog";
import { VouchersDialog } from "@/components/VouchersDialog";
import { CancelBookingDialog } from "@/components/CancelBookingDialog";
import { BookingFormComponent } from "@/components/BookingForm";

// Import types and utilities
import {
  Booking,
  BookingForm,
  Room,
  Member,
  RoomType,
  DateStatus,
} from "@/types/room-booking.type";

import {
  initialFormState,
  calculateAccountingValues,
  getDateStatuses,
  calculatePrice,
} from "@/utils/bookingUtils";
import { parseLocalDate } from "@/utils/hallBookingUtils";
import { format, startOfDay, addYears } from "date-fns";
import { BookingDetailsCard } from "@/components/details/RoomBookingDets";

// ShadCN components for inlined form
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function RoomBookings() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);
  const [viewVouchers, setViewVouchers] = useState<Booking | null>(null);
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [form, setForm] = useState<BookingForm>(initialFormState);
  const [editForm, setEditForm] = useState<BookingForm>(initialFormState);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [editAvailableRooms, setEditAvailableRooms] = useState<Room[]>([]);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [openDetails, setOpenDetails] = useState(false);

  // Multi-room selection states
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [editSelectedRoomIds, setEditSelectedRoomIds] = useState<string[]>([]);

  // Member search states for create dialog
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberResults, setShowMemberResults] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // API Queries
  // Infinite Query for Bookings
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingBookings,
  } = useInfiniteQuery({
    queryKey: ["bookings", "rooms"],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await getBookings({ bookingsFor: "rooms", pageParam });
      return res as Booking[];
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage && lastPage.length === 20 ? allPages.length + 1 : undefined;
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

  const { data: roomTypes = [], isLoading: isLoadingRoomTypes } = useQuery<
    RoomType[]
  >({
    queryKey: ["roomTypes"],
    queryFn: async () => (await getRoomTypes()) as RoomType[],
  });

  const { data: allRooms = [] } = useQuery<Room[]>({
    queryKey: ["allRooms"],
    queryFn: async () => (await getRooms()) as Room[],
  });

  // Vouchers query - only enabled when viewing vouchers
  const { data: vouchers = [], isLoading: isLoadingVouchers } = useQuery<any[]>(
    {
      queryKey: ["vouchers", viewVouchers?.id],
      queryFn: () => (viewVouchers ? getVouchers("ROOM", viewVouchers.id) : []),
      enabled: !!viewVouchers,
    }
  );

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

  // Fetch date statuses for selected room(s) - fetch 1 year from today
  const targetRoomIds = useMemo(() => {
    const ids: string[] = [];
    if (form.roomId) ids.push(form.roomId);
    if (selectedRoomIds.length > 0) ids.push(...selectedRoomIds);
    if (editForm.roomId) ids.push(editForm.roomId);
    // Unique
    return [...new Set(ids)];
  }, [form.roomId, selectedRoomIds, editForm.roomId]);

  const { data: fetchedStatuses } = useQuery({
    queryKey: ["roomDateStatuses", "upcoming", targetRoomIds.join(",")],
    queryFn: async () => {
      const from = format(new Date(), "yyyy-MM-dd");
      const to = format(addYears(new Date(), 1), "yyyy-MM-dd"); // Fetch 1 year
      return await getRoomDateStatuses(from, to, targetRoomIds);
    },
    enabled: targetRoomIds.length > 0,
  });

  // Helper to process fetched statuses deeply
  const processFetchedStatuses = useCallback((rawData: any, roomIds: string[]) => {
    if (!rawData) return [];
    const apiStatuses: DateStatus[] = [];
    const roomIdsNum = roomIds.map(Number);

    // Process Bookings
    rawData.bookings?.filter((b: any) => roomIdsNum.includes(b.roomId)).forEach((b: any) => {
      let current = startOfDay(new Date(b.checkIn));
      const end = startOfDay(new Date(b.checkOut));
      while (current < end) {
        apiStatuses.push({
          date: new Date(current),
          status: "BOOKED",
          bookingId: b.id.toString(),
          // You might want to include roomId here if needed for differentiating
        });
        current.setDate(current.getDate() + 1);
      }
    });

    // Process Reservations
    rawData.reservations?.filter((r: any) => roomIdsNum.includes(r.roomId)).forEach((r: any) => {
      let current = startOfDay(new Date(r.reservedFrom));
      const end = startOfDay(new Date(r.reservedTo));
      while (current < end) {
        apiStatuses.push({ date: new Date(current), status: "RESERVED", reservationId: r.id.toString() });
        current.setDate(current.getDate() + 1);
      }
    });

    // Process Out Of Orders
    rawData.outOfOrders?.filter((ooo: any) => roomIdsNum.includes(ooo.roomId)).forEach((ooo: any) => {
      let current = startOfDay(new Date(ooo.startDate));
      const end = startOfDay(new Date(ooo.endDate));
      while (current <= end) {
        apiStatuses.push({ date: new Date(current), status: "OUT_OF_ORDER" });
        current.setDate(current.getDate() + 1);
      }
    });

    return apiStatuses;
  }, []);

  // Date statuses for the create/edit dialogs
  const createDateStatuses = useMemo(() => {
    // Combine statuses from nested room data (fallback/immediate) with fetched upcoming data
    const internalStatuses = getDateStatuses(form.roomId, bookings, allRooms);

    // Only use fetched data if we have it and it matches the selected room
    const relevantRoomIds = [form.roomId, ...selectedRoomIds].filter(Boolean);
    if (!fetchedStatuses || relevantRoomIds.length === 0) return internalStatuses;

    const apiStatuses = processFetchedStatuses(fetchedStatuses, relevantRoomIds) as DateStatus[];

    // Merge: favor API statuses (they are simpler flat list) 
    // Just blindly concat and let the UI handler find "some" blocking status
    return [...internalStatuses, ...apiStatuses];
  }, [form.roomId, selectedRoomIds, bookings, allRooms, fetchedStatuses, processFetchedStatuses]);

  const editDateStatuses = useMemo(() => {
    // Similar logic for edit
    if (!editBooking) return [];

    // We don't have multi-room support for EDIT yet usually, just editForm.roomId
    const internalStatuses = getDateStatuses(editForm.roomId, bookings, allRooms);

    if (!fetchedStatuses || !editForm.roomId) return internalStatuses;

    const apiStatuses = processFetchedStatuses(fetchedStatuses, [editForm.roomId]) as DateStatus[];

    return [...internalStatuses, ...apiStatuses];
  }, [editBooking, editForm.roomId, bookings, allRooms, fetchedStatuses, processFetchedStatuses]);

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

  // Mutations
  const createMutation = useMutation<any, Error, Record<string, any>>({
    mutationFn: (payload) => createBooking(payload),
    onSuccess: () => {
      toast({ title: "Booking created successfully" });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setIsAddOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create booking",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation<any, Error, Record<string, any>>({
    mutationFn: (payload) => updateBooking(payload),
    onSuccess: () => {
      toast({ title: "Booking updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setEditBooking(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update booking",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation<
    any,
    Error,
    { bookingFor: string; bookID: string }
  >({
    mutationFn: ({ bookingFor, bookID }) => deleteBooking(bookingFor, bookID),
    onSuccess: () => {
      toast({ title: "Booking cancelled successfully" });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setCancelBooking(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to cancel booking",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Derive available rooms whenever form.roomTypeId or allRooms changes
  useEffect(() => {
    if (form.roomTypeId) {
      const filtered = allRooms.filter(
        (r) => r.roomTypeId.toString() === form.roomTypeId
      );
      setAvailableRooms(filtered);
    } else {
      setAvailableRooms([]);
    }
  }, [form.roomTypeId, allRooms]);

  // Update edit form when editBooking changes
  useEffect(() => {
    if (editBooking) {
      // ── EXTRACT DATA ─────────────────────────────────────────
      // Get roomTypeId and roomNumber from rooms relation or legacy fields
      const firstRoom = editBooking.rooms?.[0];
      const roomTypeId = editBooking.roomTypeId || firstRoom?.room?.roomType?.id || firstRoom?.roomType?.id || editBooking.room?.roomType?.id;
      const roomId = editBooking.roomId || firstRoom?.room?.id || firstRoom?.id;

      // Helper function to convert backend date to datetime-local format
      const convertToDateTimeLocal = (dateString: string): string => {
        if (!dateString) return "";
        const date = new Date(dateString.replace(" ", "T"));
        return format(date, "yyyy-MM-dd'T'HH:mm");
      };

      const newEditForm: BookingForm = {
        membershipNo: editBooking.Membership_No || "",
        memberName: editBooking.memberName || editBooking.member?.Name || "",
        memberId: editBooking.member?.id?.toString() || "",
        category: "Room",
        roomTypeId: roomTypeId?.toString() || "",
        roomId: roomId?.toString() || "",
        pricingType: editBooking.pricingType || "member",
        paidBy: editBooking.paidBy || "MEMBER",
        guestName: editBooking.guestName || "",
        guestContact: editBooking.guestContact || "",
        checkIn: editBooking.checkIn
          ? convertToDateTimeLocal(editBooking.checkIn)
          : "",
        checkOut: editBooking.checkOut
          ? convertToDateTimeLocal(editBooking.checkOut)
          : "",
        totalPrice: editBooking.totalPrice || 0,
        paymentStatus: editBooking.paymentStatus || "UNPAID",
        paidAmount: editBooking.paidAmount || 0,
        pendingAmount: editBooking.pendingAmount || 0,
        paymentMode: "CASH",
        numberOfAdults: editBooking.numberOfAdults || 1,
        numberOfChildren: editBooking.numberOfChildren || 0,
        specialRequests: editBooking.specialRequests || "",
        remarks: editBooking.remarks || "",
      };

      setEditForm(newEditForm);

      // Initialize editSelectedRoomIds
      const bookedRoomIds = editBooking.rooms
        ? editBooking.rooms.map((r: any) => (r.room?.id || r.roomId || r.id).toString())
        : roomId ? [roomId.toString()] : [];

      setEditSelectedRoomIds(bookedRoomIds);

      // Populate editAvailableRooms from allRooms for the type immediately
      if (roomTypeId) {
        const filtered = allRooms.filter(
          (r) => r.roomTypeId.toString() === roomTypeId.toString()
        );
        setEditAvailableRooms(filtered);
      }
    }
  }, [editBooking, allRooms]);

  // Updated Conflict Check
  const checkConflicts = (roomIds: string[], checkIn: string, checkOut: string, excludeBookingId?: number) => {
    if (!roomIds.length) return null;

    const selStart = new Date(checkIn);
    const selEnd = new Date(checkOut);
    selStart.setHours(0, 0, 0, 0);
    selEnd.setHours(0, 0, 0, 0);

    for (const roomId of roomIds) {
      const room = allRooms.find((r) => r.id.toString() === roomId);
      if (!room) continue;

      // 1. Check Out of Order
      const ooConflict = room.outOfOrders?.find((oo: any) => {
        const ooStart = new Date(oo.startDate);
        const ooEnd = new Date(oo.endDate);
        ooStart.setHours(0, 0, 0, 0);
        ooEnd.setHours(0, 0, 0, 0);
        return selStart <= ooEnd && selEnd > ooStart;
      });
      if (ooConflict) return `Room ${room.roomNumber} is out of service from ${format(new Date(ooConflict.startDate), "PP")} to ${format(new Date(ooConflict.endDate), "PP")}`;

      // 2. Check Reservations
      const resConflict = room.reservations?.find((res: any) => {
        const resStart = new Date(res.reservedFrom);
        const resEnd = new Date(res.reservedTo);
        resStart.setHours(0, 0, 0, 0);
        resEnd.setHours(0, 0, 0, 0);
        return selStart < resEnd && selEnd > resStart;
      });
      if (resConflict) return `Room ${room.roomNumber} has a reservation from ${format(new Date(resConflict.reservedFrom), "PP")} to ${format(new Date(resConflict.reservedTo), "PP")}`;

      // 3. Check Other Bookings
      const bookingConflict = room.bookings?.find((book: any) => {
        if (excludeBookingId && book.id === excludeBookingId) return false;
        const bStart = new Date(book.checkIn);
        const bEnd = new Date(book.checkOut);
        bStart.setHours(0, 0, 0, 0);
        bEnd.setHours(0, 0, 0, 0);
        return selStart < bEnd && selEnd > bStart;
      });
      if (bookingConflict) return `Room ${room.roomNumber} is already booked from ${format(new Date(bookingConflict.checkIn), "PP")} to ${format(new Date(bookingConflict.checkOut), "PP")}`;
    }
    return null;
  };

  // Updated Price Calculation
  const calculateTotal = (roomTypeId: string, pricingType: string, checkIn: string, checkOut: string, roomCount: number) => {
    if (!roomTypeId || !checkIn || !checkOut || roomCount === 0) return 0;
    const basePrice = calculatePrice(roomTypeId, pricingType, checkIn, checkOut, roomTypes);
    return basePrice * roomCount;
  };

  // Unified form change handler
  const createFormChangeHandler = (isEdit: boolean) => {
    return (field: keyof BookingForm, value: any) => {
      const setFormFn = isEdit ? setEditForm : setForm;
      const currentSelectedRoomIds = isEdit ? editSelectedRoomIds : selectedRoomIds;

      setFormFn((prev) => {
        const newForm = { ...prev, [field]: value };

        if (field === "roomTypeId") {
          const clearIds = isEdit ? setEditSelectedRoomIds : setSelectedRoomIds;
          clearIds([]);
        }

        // Recalculate price when relevant fields change
        if (
          ["roomTypeId", "pricingType", "checkIn", "checkOut"].includes(field)
        ) {
          const oldTotal = prev.totalPrice || 0;
          const oldPaid = prev.paidAmount || 0;
          const oldPaymentStatus = prev.paymentStatus;

          const newPrice = calculateTotal(
            field === "roomTypeId" ? value : newForm.roomTypeId,
            field === "pricingType" ? value : newForm.pricingType,
            field === "checkIn" ? value : newForm.checkIn,
            field === "checkOut" ? value : newForm.checkOut,
            field === "roomTypeId" ? 0 : currentSelectedRoomIds.length
          );
          newForm.totalPrice = newPrice;

          // AUTO-ADJUST PAYMENT STATUS WHEN DATES OR PRICING CHANGE IN EDIT MODE
          if (isEdit) {
            if (newPrice > oldPaid && oldPaymentStatus === "PAID") {
              // Price Increased and was Fully Paid -> Downgrade to Half Paid
              newForm.paymentStatus = "HALF_PAID";
              newForm.paidAmount = oldPaid; // Preserve existing paid amount
              newForm.pendingAmount = newPrice - oldPaid;
            } else if (newPrice > oldTotal && (oldPaymentStatus === "HALF_PAID" || oldPaymentStatus === "UNPAID")) {
              // Price Increased and was already partial/unpaid -> Preserve existing paid amount
              newForm.paidAmount = oldPaid;
              newForm.pendingAmount = newPrice - oldPaid;
            } else {
              // Standard accounting update
              const accounting = calculateAccountingValues(
                newForm.paymentStatus,
                newPrice,
                oldPaid
              );
              newForm.paidAmount = accounting.paid;
              newForm.pendingAmount = accounting.pendingAmount;
            }
          } else {
            // Creation mode - use standard accounting
            const accounting = calculateAccountingValues(
              newForm.paymentStatus,
              newPrice,
              newForm.paidAmount
            );
            newForm.paidAmount = accounting.paid;
            newForm.pendingAmount = accounting.pendingAmount;
          }
        }

        if (field === "paymentStatus") {
          // If manually changing status to PAID, auto-fill paidAmount
          if (value === "PAID") {
            newForm.paidAmount = newForm.totalPrice;
            newForm.pendingAmount = 0;
          } else if (value === "UNPAID") {
            newForm.paidAmount = 0;
            newForm.pendingAmount = newForm.totalPrice;
          } else if (value === "HALF_PAID") {
            // Keep existing paid amount if possible
            newForm.pendingAmount = newForm.totalPrice - newForm.paidAmount;
          } else if (value === "TO_BILL") {
            newForm.pendingAmount = 0; // In UI, TO_BILL clears pending as it goes to ledger
          }
        }

        if (field === "paidAmount" && newForm.paymentStatus === "HALF_PAID") {
          newForm.pendingAmount = newForm.totalPrice - value;
        }

        return newForm;
      });
    };
  };

  // Derive editAvailableRooms whenever editForm.roomTypeId or allRooms changes
  useEffect(() => {
    if (editForm.roomTypeId) {
      const filtered = allRooms.filter(
        (r) => r.roomTypeId.toString() === editForm.roomTypeId
      );
      setEditAvailableRooms(filtered);
    } else {
      setEditAvailableRooms([]);
    }
  }, [editForm.roomTypeId, allRooms]);

  const handleFormChange = createFormChangeHandler(false);
  const handleEditFormChange = createFormChangeHandler(true);

  const handleRoomSelection = (roomId: string, isEdit: boolean) => {
    const currentIds = isEdit ? editSelectedRoomIds : selectedRoomIds;
    const setIds = isEdit ? setEditSelectedRoomIds : setSelectedRoomIds;
    const currentForm = isEdit ? editForm : form;
    const setFormFn = isEdit ? setEditForm : setForm;

    let newIds = [];
    if (currentIds.includes(roomId)) {
      newIds = currentIds.filter(id => id !== roomId);
    } else {
      newIds = [...currentIds, roomId];
    }
    setIds(newIds);

    // Recalculate Price
    const newTotal = calculateTotal(currentForm.roomTypeId, currentForm.pricingType, currentForm.checkIn, currentForm.checkOut, newIds.length);

    setFormFn(prev => {
      // Determine new payment values
      let newPaid = prev.paidAmount;
      let newPending = 0;
      let newStatus = prev.paymentStatus;

      if (isEdit) {
        if (newTotal > prev.paidAmount && prev.paymentStatus === 'PAID') {
          // Auto downgrade
          newStatus = 'HALF_PAID';
          newPaid = prev.paidAmount; // Keep old paid
          newPending = newTotal - prev.paidAmount;
        } else {
          // Standard manual or price-change logic for edit
          const accounting = calculateAccountingValues(newStatus, newTotal, prev.paidAmount);
          newPaid = accounting.paid;
          newPending = accounting.pendingAmount;
        }
      } else {
        // Create Mode - Use standard accounting
        const accounting = calculateAccountingValues(newStatus, newTotal, prev.paidAmount);
        newPaid = accounting.paid;
        newPending = accounting.pendingAmount;
      }

      return {
        ...prev,
        totalPrice: newTotal,
        paymentStatus: newStatus,
        paidAmount: newPaid,
        pendingAmount: newPending
      }
    });
  };

  const handleCreate = () => {
    if (
      !form.membershipNo ||
      !form.roomTypeId ||
      selectedRoomIds.length === 0 ||
      !form.checkIn ||
      !form.checkOut ||
      !form.numberOfAdults
    ) {
      toast({
        title: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    if (form.numberOfAdults < 1) {
      toast({
        title: "At least one adult is required",
        variant: "destructive",
      });
      return;
    }

    const checkInDate = new Date(form.checkIn);
    const checkOutDate = new Date(form.checkOut);

    if (checkInDate >= checkOutDate) {
      toast({
        title: "Invalid dates",
        description: "Check-out must be after check-in",
        variant: "destructive",
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const normalizedCheckIn = new Date(checkInDate);
    normalizedCheckIn.setHours(0, 0, 0, 0);
    if (normalizedCheckIn < today) {
      toast({ title: "Invalid check-in date", description: "Cannot book in the past", variant: "destructive" });
      return;
    }

    const conflict = checkConflicts(selectedRoomIds, form.checkIn, form.checkOut);
    if (conflict) {
      toast({
        title: "Booking Conflict",
        description: conflict,
        variant: "destructive",
      });
      return;
    }

    const payload = {
      category: "Room",
      membershipNo: form.membershipNo,
      subCategoryId: form.roomTypeId,
      entityId: selectedRoomIds[0],
      selectedRoomIds: selectedRoomIds,
      pricingType: form.pricingType,
      checkIn: form.checkIn.split("T")[0],
      checkOut: form.checkOut.split("T")[0],
      totalPrice: form.totalPrice.toString(),
      paymentStatus: form.paymentStatus,
      paidAmount: form.paidAmount,
      pendingAmount: form.pendingAmount,
      paymentMode: "CASH",
      numberOfAdults: form.numberOfAdults,
      numberOfChildren: form.numberOfChildren,
      specialRequests: form.specialRequests,
      paidBy: form.paidBy,
      guestName: form.guestName,
      guestContact: form.guestContact,
      remarks: form.remarks,
    };

    createMutation.mutate(payload);
  };

  const handleUpdate = () => {
    if (
      !editForm.membershipNo ||
      !editForm.roomTypeId ||
      editSelectedRoomIds.length === 0 ||
      !editForm.checkIn ||
      !editForm.checkOut
    ) {
      toast({
        title: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    const conflict = checkConflicts(editSelectedRoomIds, editForm.checkIn, editForm.checkOut, editBooking?.id);
    if (conflict) {
      toast({
        title: "Booking Conflict",
        description: conflict,
        variant: "destructive",
      });
      return;
    }

    const payload = {
      id: editBooking?.id?.toString(),
      category: "Room",
      membershipNo: editForm.membershipNo,
      subCategoryId: editForm.roomTypeId,
      entityId: editSelectedRoomIds[0],
      selectedRoomIds: editSelectedRoomIds,
      pricingType: editForm.pricingType,
      checkIn: editForm.checkIn.split("T")[0],
      checkOut: editForm.checkOut.split("T")[0],
      totalPrice: editForm.totalPrice.toString(),
      paymentStatus: editForm.paymentStatus,
      paidAmount: editForm.paidAmount,
      pendingAmount: editForm.pendingAmount,
      paymentMode: "CASH",
      prevRoomId: editBooking?.roomId?.toString(),
      paidBy: editForm.paidBy,
      guestContact: editForm.guestContact,
      guestName: editForm.guestName,
      numberOfAdults: editForm.numberOfAdults,
      numberOfChildren: editForm.numberOfChildren,
      specialRequests: editForm.specialRequests,
      remarks: editForm.remarks,
    };

    updateMutation.mutate(payload);
  };

  const handleDelete = () => {
    if (cancelBooking) {
      deleteMutation.mutate({
        bookingFor: "rooms",
        bookID: cancelBooking.id.toString(),
      });
    }
  };

  const handleViewVouchers = (booking: Booking) => {
    setViewVouchers(booking);
  };

  const filteredBookings =
    paymentFilter === "ALL"
      ? bookings
      : bookings?.filter((b: any) => b.paymentStatus === paymentFilter);

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
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const resetForm = () => {
    setForm(initialFormState);
    setAvailableRooms([]);
    setMemberSearch("");
    setSelectedMember(null);
    setShowMemberResults(false);
    setSelectedRoomIds([]);
  };

  const resetEditForm = () => {
    setEditForm(initialFormState);
    setEditAvailableRooms([]);
    setEditBooking(null);
    setEditSelectedRoomIds([]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Room Bookings
          </h2>
          <p className="text-muted-foreground">Manage room reservations</p>
        </div>
        <div className="flex gap-2">
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="HALF_PAID">Half Paid</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="TO_BILL">To Bill</SelectItem>
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
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Room Booking</DialogTitle>
              </DialogHeader>

              <BookingFormComponent
                form={form}
                onChange={handleFormChange}
                roomTypes={roomTypes}
                availableRooms={availableRooms}
                isLoadingRoomTypes={isLoadingRoomTypes}
                memberSearch={memberSearch}
                onMemberSearchChange={handleMemberSearch}
                showMemberResults={showMemberResults}
                searchResults={searchResults}
                isSearching={isSearching}
                selectedMember={selectedMember}
                onSelectMember={handleSelectMember}
                onClearMember={handleClearMember}
                onSearchFocus={handleSearchFocus}
                dateStatuses={createDateStatuses}
                isEdit={false}
                selectedRoomIds={selectedRoomIds}
                onRoomSelection={(roomId) => handleRoomSelection(roomId, false)}
              />

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending || !selectedMember}>
                  {createMutation.isPending ? "Creating..." : "Create Booking"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <BookingsTable
        bookings={filteredBookings}
        isLoading={isLoadingBookings}
        onEdit={setEditBooking}
        onDetail={(booking: Booking) => {
          setOpenDetails(true);
          setDetailBooking(booking);
        }}
        onViewVouchers={handleViewVouchers}
        onCancel={setCancelBooking}
        getPaymentBadge={getPaymentBadge}
      />
      {/* Scroll Trigger & Loader */}
      <div ref={lastElementRef} className="h-10 w-full flex items-center justify-center">
        {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        {!hasNextPage && bookings.length > 0 && (
          <span className="text-xs text-muted-foreground">No more bookings</span>
        )}
      </div>

      <EditBookingDialog
        editBooking={editBooking}
        editForm={editForm}
        onEditFormChange={handleEditFormChange}
        roomTypes={roomTypes}
        editAvailableRooms={editAvailableRooms}
        isLoadingRoomTypes={isLoadingRoomTypes}
        dateStatuses={editDateStatuses}
        onUpdate={handleUpdate}
        onClose={resetEditForm}
        isUpdating={updateMutation.isPending}
        selectedRoomIds={editSelectedRoomIds}
        onRoomSelection={handleRoomSelection}
      />

      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
        <DialogContent className="p-0 max-w-5xl min-w-[60vw] overflow-hidden">
          {detailBooking && (
            <BookingDetailsCard
              booking={detailBooking}
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

      <CancelBookingDialog
        cancelBooking={cancelBooking}
        onClose={() => setCancelBooking(null)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
