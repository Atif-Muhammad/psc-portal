import { Member, Voucher, DateStatus } from "@/types/room-booking.type";

export type HallBookingTime = "DAY" | "NIGHT";
export type PricingType = "member" | "guest" | "corporate";
export type PaymentStatus = "UNPAID" | "HALF_PAID" | "PAID" | "TO_BILL" | "ADVANCE_PAYMENT";


export interface HallBooking {
  id: string;
  memberId: string;
  hallId: string;
  bookingDate: string;
  totalPrice: string; // API returns string
  paymentStatus: string;
  pricingType: string;
  paidAmount: string; // API returns string
  pendingAmount: string; // API returns string
  eventType: string;
  bookingTime: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  numberOfGuests: number;
  paidBy?: "MEMBER" | "GUEST";
  paymentMode?: "CASH" | "ONLINE" | "CARD" | "CHECK";
  card_number?: string;
  check_number?: string;
  bank_name?: string;
  guestName?: "";
  guestContact?: "";
  guestCNIC?: "";
  numberOfDays?: number;
  endDate?: string;
  bookingDetails?: { date: string; timeSlot: string; eventType?: string }[];
  remarks?: string;
  extraCharges?: { head: string; amount: number }[];
  cancellationRequest?: {
    id: number;
    reason: string;
    requestedBy: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    adminRemarks?: string;
    createdAt: string;
    updatedAt: string;
  };
  cancellationRequests?: {
    id: number;
    reason: string;
    requestedBy: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    adminRemarks?: string;
    createdAt: string;
    updatedAt: string;
  }[];

  member?: {
    id: string;
    Name: string;
    Membership_No: string;
    Balance: number;
    drAmount: number;
    crAmount: number;
  };
  hall?: {
    id: string;
    name: string;
    capacity: number;
    chargesMembers: number;
    chargesGuests: number;
    chargesCorporate: number;
    outOfOrders?: any[];
  };
  // Add these for backward compatibility
  Membership_No?: string;
  memberName?: string;
  hallName?: string;
}

export interface Hall {
  id: string;
  name: string;
  capacity: number;
  chargesMembers: number;
  chargesGuests: number;
  chargesCorporate: number;
  description: string;
  isActive: boolean;
  isExclusive: boolean;
  isOutOfService: boolean;
  isReserved: boolean;
  isBooked: boolean;
  outOfServiceReason?: string;
  outOfServiceFrom?: string;
  outOfServiceTo?: string;
  paidBy?: "MEMBER" | "GUEST";
  guestName?: string;
  guestContact?: string;
  guestCNIC?: string;
  paymentMode?: "CASH" | "ONLINE" | "CARD" | "CHECK";
  card_number?: string;
  check_number?: string;
  bank_name?: string;
  reservations: any[];
  bookings: HallBooking[];
  holdings?: any[];
  images: any[];
  outOfOrders?: any[];
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HallBookingForm {
  reservationId?: number | string;
  membershipNo: string;
  memberName: string;
  memberId: string;
  category: string;
  hallId: string;
  bookingDate: string;
  eventType: string;
  eventTime: string; // Use string instead of HallBookingTime
  pricingType: string; // Use string instead of PricingType
  totalPrice: number;
  paymentStatus: string; // Use string instead of PaymentStatus
  numberOfGuests: number;
  paidAmount: number;
  pendingAmount: number;
  paymentMode: string;
  card_number?: string;
  check_number?: string;
  bank_name?: string;
  paidBy?: "MEMBER" | "GUEST";
  guestName?: "";
  guestContact?: "";
  guestCNIC?: "";
  endDate: string;
  numberOfDays: number;
  bookingDetails: { date: string; timeSlot: string; eventType?: string; reservationId?: number | string }[];
  remarks?: string;
  heads?: { head: string; amount: number }[];
}

export type HallVoucher = Voucher;

export type HallDateStatus = DateStatus;

export enum PaymentMode {
  CASH = "CASH",
  ONLINE = "ONLINE",
  CARD = "CARD",
  CHECK = "CHECK",
}

export enum Channel {
  ADMIN_PORTAL = "ADMIN_PORTAL",
  MOBILE_APP = "MOBILE_APP",
  KUICKPAY = "KUICKPAY",
}

