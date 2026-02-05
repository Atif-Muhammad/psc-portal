export interface Member {
  id: number;
  Name: string;
  email?: string;
  phone?: string;
  membershipNumber?: string;
  Membership_No?: string;
  Balance?: number;
  drAmount?: number;
  crAmount?: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  memberType?: "CIVILIAN" | "ARMED_FORCES";
}

export interface RoomType {
  id: number;
  type: string;
  priceMember: string;
  priceGuest: string;
  priceForces: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Room {
  id: number;
  roomNumber: string;
  roomType: string;
  roomTypeId: number;
  isActive: boolean;
  isOutOfOrder?: boolean;
  outOfOrderTo?: string;
  isReserved?: boolean;
  reservedFrom?: string;
  reservedTo?: string;
  outOfOrders?: any[]
  reservations?: any[];
  bookings?: any[];
  status?: "AVAILABLE" | "OUT_OF_ORDER" | "RESERVED";
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Booking {
  id: number;
  Membership_No: string;
  memberName: string;
  roomId?: number;
  roomNumber: string;
  roomTypeId: number;
  roomType: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  paymentStatus: "UNPAID" | "HALF_PAID" | "PAID" | "TO_BILL";
  paymentMode?: "CASH" | "ONLINE" | "CARD" | "CHECK";
  card_number?: string;
  check_number?: string;
  bank_name?: string;
  pricingType: "member" | "guest" | "forces" | "forces-self" | "forces-guest";
  paidBy: "MEMBER" | "GUEST",
  guestContact: "",
  guestName: "",
  guestCNIC?: string;
  paidAmount: number;
  pendingAmount: number;
  member?: Member;
  rooms?: any[];
  room?: {
    id: number;
    roomNumber: string;
    outOfOrders?: any[];
    createdAt?: string;
    specialRequests?: string
    roomType: {
      type: string;
      id: number;
    };
  };
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  numberOfAdults: number;
  numberOfChildren: number;
  specialRequests?: string;
  remarks?: string;
}

export interface BookingForm {
  reservationId?: number | string;
  membershipNo: string;
  memberName: string;
  memberId: string;
  category: string;
  roomTypeId: string;
  roomId: string;
  pricingType: "member" | "guest" | "forces" | "forces-self" | "forces-guest";
  paidBy: "MEMBER" | "GUEST" | "FORCES",
  guestName: "",
  guestContact: "",
  guestCNIC?: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  paymentStatus: "UNPAID" | "HALF_PAID" | "PAID" | "TO_BILL" | "ADVANCE_PAYMENT";
  paidAmount: number;
  pendingAmount: number;
  paymentMode: "CASH" | "CARD" | "CHECK" | "ONLINE";
  card_number?: string;
  check_number?: string;
  bank_name?: string;
  numberOfAdults: number;
  numberOfChildren: number;
  specialRequests?: string;
  remarks?: string;
  generateAdvanceVoucher?: boolean;
  advanceVoucherAmount?: number;
}

export interface Voucher {
  id: number;
  consumer_number: string;
  voucher_no?: string;
  booking_type: string;
  booking_id: number;
  membership_no: string;
  amount: string | number;
  payment_mode: "CASH" | "ONLINE" | "CARD" | "CHECK";
  card_number?: string;
  check_number?: string;
  bank_name?: string;
  transaction_id: string | null;
  remarks: string;
  voucher_type: "FULL_PAYMENT" | "HALF_PAYMENT" | "REFUND" | "ADJUSTMENT" | "ADVANCE_PAYMENT";
  status: "CONFIRMED" | "PENDING" | "CANCELLED";
  issued_at: string;
  issued_by: string;
  paid_at?: string;
  createdBy?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface DateStatus {
  date: Date;
  status: "BOOKED" | "OUT_OF_ORDER" | "RESERVED" | "AVAILABLE";
  bookingId?: number;
  reservationId?: number | string
}