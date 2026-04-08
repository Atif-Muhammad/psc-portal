export class HallBookingReportDto {
  id: number;
  venueName: string;
  venueType: string; // HALL or LAWN
  memberName: string;
  memberNumber: string;
  eventDate: string;
  eventType: string;
  timeSlot: string;
  rent: number;
  serviceCharge: number;
  gst: number;
  food: number;
  total: number;
  paymentStatus: string;
  bookingStatus: string;
  bookedBy: string;
}

export class HallDailyCheckoutDto {
  openingBalance: number;
  entries: {
    hallName: string;
    contactPersonName: string;
    from: string;
    to: string;
    days: number;
    rent: number;
    serviceCharge: number;
    gst: number;
    food: number;
    total: number;
  }[];
  accumulativeTotal: number;
}

export class HallMonthlyGridDto {
  venues: {
    name: string;
    type: string;
    days: Record<number, string>; // day-of-month -> time slot or empty
    total: number;
  }[];
  dailyTotals: Record<number, number>;
}
