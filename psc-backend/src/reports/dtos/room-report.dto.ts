export class RoomBookingReportDto {
  id: number;
  memberName: string;
  memberNumber: string;
  roomNumber: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  days: number;
  rent: number;
  gst: number;
  food: number;
  serviceCharge: number;
  mattress: number;
  laundry: number;
  total: number;
  paymentStatus: string;
  bookingStatus: string;
  bookedBy: string;
}

export class RoomMonthlyCheckoutDto {
  rooms: {
    roomNumber: string;
    days: Record<number, string>; // day-of-month -> occupant name or empty
    total: number;
  }[];
  dailyTotals: Record<number, number>; // day-of-month -> count of occupied rooms
}

export class RoomDailyCheckoutDto {
  openingBalance: number;
  entries: {
    roomNumber: string;
    guestName: string;
    from: string;
    to: string;
    days: number;
    rent: number;
    mattress: number;
    gst: number;
    food: number;
    serviceCharge: number;
    laundry: number;
    total: number;
    voucherNumber: string;
  }[];
  accumulativeTotal: number;
}

export class RoomSalesReportDto {
  entries: {
    date: string;
    food: number;
    gst: number;
    serviceCharge: number;
    numberOfBills: number;
    total: number;
  }[];
  totals: {
    food: number;
    gst: number;
    serviceCharge: number;
    numberOfBills: number;
    total: number;
  };
}

export class RoomCancellationReportDto {
  entries: {
    roomType: string;
    roomNumber: string;
    daysInMonth: number;
    daysCanceled: number;
    cancellationPercentage: number;
  }[];
}

export class RoomMonthlyBillsDto {
  summary: {
    member: number;
    guest: number;
    forces: number;
    affClub: number;
  };
  entries: {
    sNo: number;
    memberNumber: string;
    guestName: string;
    roomNumber: string;
    from: string;
    to: string;
    rent: number;
    gst: number;
    food: number;
    foodGst: number;
    serviceCharge: number;
    mattress: number;
    mattressGst: number;
    laundry: number;
    total: number;
    advance: number;
    netTotal: number;
  }[];
}
