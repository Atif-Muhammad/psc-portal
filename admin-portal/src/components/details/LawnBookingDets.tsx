import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  User,
  Trees,
  CreditCard,
  Users,
  Phone,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Clock as TimeIcon,
  Receipt,
  XCircle,
  Ban,
  Palmtree,
  Trees as TreesIcon,
} from "lucide-react";
import { LawnBooking } from "@/pages/LawnBookings";
import { Voucher } from "@/types/room-booking.type";

interface LawnBookingDetailsCardProps {
  booking: LawnBooking;
  vouchers?: Voucher[];
  isLoadingVouchers?: boolean;
  showFullDetails?: boolean;
  className?: string;
}

// Utility functions
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatPrice = (price: string | number): string => {
  return `PKR ${Number(price).toLocaleString()}`;
};

const getEventTypeDisplay = (eventType: string): string => {
  const eventTypes: Record<string, string> = {
    "mehandi": "Mehandi",
    "barat": "Barat",
    "walima": "Walima",
    "birthday": "Birthday Party",
    "corporate": "Corporate Event",
    "wedding": "Wedding",
    "other": "Other Event",
  };
  return eventTypes[eventType] || eventType.charAt(0).toUpperCase() + eventType.slice(1);
};

const getTimeSlotDisplay = (time: string): string => {
  const timeSlots: Record<string, string> = {
    "DAY": "Day (2:00 PM - 8:00 PM)",
    "NIGHT": "Night (8:00 PM - 12:00 AM)",
  };
  return timeSlots[time] || time;
};

const getPaymentStatusBadge = (status: string) => {
  switch (status) {
    case "PAID":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      );
    case "HALF_PAID":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <Clock className="h-3 w-3 mr-1" />
          Half Paid
        </Badge>
      );
    case "UNPAID":
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100">
          <AlertCircle className="h-3 w-3 mr-1" />
          Unpaid
        </Badge>
      );
    case "ADVANCE_PAYMENT":
      return (
        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
          <Clock className="h-3 w-3 mr-1" />
          Advance Payment
        </Badge>
      );
    case "TO_BILL":
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          <DollarSign className="h-3 w-3 mr-1" />
          To Bill
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getPricingTypeBadge = (type: string) => {
  switch (type) {
    case "member":
      return (
        <Badge variant="outline" className="border-blue-300 text-blue-700">
          Member Rate
        </Badge>
      );
    case "guest":
      return (
        <Badge variant="outline" className="border-purple-300 text-purple-700">
          Guest Rate
        </Badge>
      );
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
};

const getPaidByBadge = (paidBy: string) => {
  switch (paidBy) {
    case "MEMBER":
      return (
        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
          Member
        </Badge>
      );
    case "GUEST":
      return (
        <Badge variant="secondary" className="bg-purple-50 text-purple-700">
          Guest
        </Badge>
      );
    default:
      return <Badge variant="secondary">{paidBy}</Badge>;
  }
};

const getMemberBalanceColor = (balance: number) => {
  if (balance >= 0) return "text-green-600";
  return "text-red-600";
};

const getTimeSlotIcon = (time: string) => {
  switch (time) {
    case "DAY":
      return "🌇";
    case "NIGHT":
      return "🌃";
    default:
      return "⏰";
  }
};

const getVoucherTypeBadge = (type: string) => {
  switch (type) {
    case "FULL_PAYMENT":
      return <Badge className="bg-green-100 text-green-800 text-xs">Full Payment</Badge>;
    case "HALF_PAYMENT":
      return <Badge className="bg-blue-100 text-blue-800 text-xs">Half Payment</Badge>;
    case "ADVANCE_PAYMENT":
      return <Badge className="bg-purple-100 text-purple-800 text-xs">Advance Payment</Badge>;
    case "REFUND":
      return <Badge className="bg-orange-100 text-orange-800 text-xs">Refund</Badge>;
    case "ADJUSTMENT":
      return <Badge className="bg-gray-100 text-gray-800 text-xs">Adjustment</Badge>;
    case "TO_BILL":
      return <Badge className="bg-indigo-100 text-indigo-800 text-xs">To Bill</Badge>;
    default:
      return <Badge className="text-xs">{type}</Badge>;
  }
};

const getVoucherStatusBadge = (status: string) => {
  switch (status) {
    case "CONFIRMED":
      return <Badge className="bg-green-100 text-green-800 text-xs">Confirmed</Badge>;
    case "PENDING":
      return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Pending</Badge>;
    case "CANCELLED":
      return <Badge variant="destructive" className="text-xs">Cancelled</Badge>;
    default:
      return <Badge className="text-xs">{status}</Badge>;
  }
};

const getRequestStatusBadge = (status: string) => {
  switch (status) {
    case "PENDING":
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    case "APPROVED":
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
    case "REJECTED":
      return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export function LawnBookingDetailsCard({
  booking,
  vouchers = [],
  isLoadingVouchers = false,
  showFullDetails = true,
  className = "",
}: LawnBookingDetailsCardProps) {
  const [activeTab, setActiveTab] = useState("info");
  const hasGuestInfo = booking.guestName && booking.pricingType === "guest";

  return (
    <Card className={`overflow-auto h-[90vh] border shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palmtree className="h-5 w-5 text-green-600" />
              Lawn Booking #{booking.id} - {booking.lawn?.description}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Created {booking.createdAt ? new Date(booking.createdAt).toLocaleString("en-PK", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }) : "N/A"}
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {getPaymentStatusBadge(booking.paymentStatus)}
            {getPricingTypeBadge(booking.pricingType || "member")}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="cancellation">Cancellation</TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Booking Details */}
              <div className="space-y-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
                    <Calendar className="h-4 w-4" />
                    Lawn Event Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Event Date(s)</Label>
                      <Value>
                        {formatDate(booking.bookingDate)}
                        {booking.endDate && booking.endDate !== booking.bookingDate && (
                          <> - {formatDate(booking.endDate)}</>
                        )}
                      </Value>
                    </div>
                    <div>
                      <Label>Primary Event</Label>
                      <Value>{getEventTypeDisplay(booking.eventType || "N/A")}</Value>
                    </div>
                    <div className="col-span-2">
                      <Label>Time Slot</Label>
                      <Value className="flex items-center gap-2">
                        {(() => {
                          if (booking.bookingDetails && booking.bookingDetails.length > 0) {
                            const details = booking.bookingDetails;
                            if (details.length === 1) {
                              return (
                                <>
                                  <span>{getTimeSlotIcon(details[0].timeSlot)}</span>
                                  {getTimeSlotDisplay(details[0].timeSlot)}
                                </>
                              );
                            }
                            return `${details.length} Slots Selected`;
                          }
                          return (
                            <>
                              <span>{getTimeSlotIcon(booking.bookingTime || "NIGHT")}</span>
                              {getTimeSlotDisplay(booking.bookingTime || "NIGHT")}
                            </>
                          );
                        })()}
                      </Value>
                    </div>
                  </div>
                </div>

                {/* Booking Schedule */}
                {booking.bookingDetails && booking.bookingDetails.length > 1 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
                      <TimeIcon className="h-4 w-4" />
                      Detailed Schedule
                    </h3>
                    <div className="grid grid-cols-1 gap-2 border rounded-md p-3 bg-gray-50/50 max-h-[150px] overflow-y-auto">
                      {booking.bookingDetails.map((detail, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs border-b last:border-0 pb-1.5 last:pb-0 pt-1.5 first:pt-0">
                          <span className="text-gray-600 font-medium">
                            {new Date(detail.date).toLocaleDateString("en-PK", { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[10px] py-0 h-4 bg-white">
                              {detail.eventType || booking.eventType}
                            </Badge>
                            <span>{getTimeSlotIcon(detail.timeSlot)}</span>
                            {detail.timeSlot}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
                    <Users className="h-4 w-4" />
                    Guest Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Total Guests</Label>
                      <Value className="font-bold">{booking.guestsCount?.toLocaleString() || 0}</Value>
                    </div>
                  </div>
                </div>

                {booking.remarks && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
                      <FileText className="h-4 w-4" />
                      Remarks
                    </h3>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm italic">
                      {booking.remarks}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Member info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
                    <User className="h-4 w-4" />
                    Member Information
                  </h3>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-blue-900">{booking.member?.Name || booking.memberName}</div>
                        <div className="text-sm text-blue-700">
                          Membership: #{booking.member?.Membership_No || booking.membershipNo}
                        </div>
                      </div>
                      <div className={`text-sm font-bold ${getMemberBalanceColor(booking.member?.Balance || 0)}`}>
                        Balance: {formatPrice((booking.member?.Balance || 0).toString())}
                      </div>
                    </div>
                  </div>
                </div>

                {hasGuestInfo && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
                      <Users className="h-4 w-4" />
                      Guest/Reference Details
                    </h3>
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                      <div className="space-y-1">
                        <div>
                          <Label>Guest Name</Label>
                          <div className="font-medium">{booking.guestName}</div>
                        </div>
                        {booking.guestContact && (
                          <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            {booking.guestContact}
                          </div>
                        )}
                        {booking.guestCNIC && (
                          <div className="text-xs text-gray-500">CNIC: {booking.guestCNIC}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Audit Information */}
                {showFullDetails && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-2">
                      <AlertCircle className="h-3 w-3" />
                      Audit Tracking
                    </h3>
                    <div className="p-3 bg-gray-50 border rounded-md shadow-inner">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Created By</Label>
                          <div className="text-xs font-medium">{booking.createdBy || "System"}</div>
                        </div>
                        <div>
                          <Label>Created At</Label>
                          <div className="text-xs text-gray-600">
                            {booking.createdAt ? new Date(booking.createdAt).toLocaleString("en-PK") : "N/A"}
                          </div>
                        </div>
                        <div>
                          <Label>Last Updated By</Label>
                          <div className="text-xs font-medium">{booking.updatedBy || booking.createdBy || "System"}</div>
                        </div>
                        <div>
                          <Label>Last Updated</Label>
                          <div className="text-xs text-gray-600">
                            {booking.updatedAt ? new Date(booking.updatedAt).toLocaleString("en-PK") : "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="m-0">
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
                  <CreditCard className="h-4 w-4" />
                  Payment Summary
                </h3>
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-green-200 rounded-xl shadow-sm">
                  <div className="space-y-4">
                    {/* Price Breakdown */}
                    {(booking as any).extraCharges && (booking as any).extraCharges.length > 0 && (
                      <div className="space-y-2 pb-3 border-b border-green-200/50">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Base Lawn Rent:</span>
                          <span className="font-medium text-gray-800">
                            {formatPrice((Number(booking.totalPrice) - (booking as any).extraCharges.reduce((sum: number, h: any) => sum + (Number(h.amount) || 0), 0)).toString())}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider block mb-1">Extra Charges Breakdown:</span>
                          {(booking as any).extraCharges.map((h: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-xs text-blue-900 font-medium">
                              <span className="text-emerald-700">{h.head}</span>
                              <span className="font-mono tracking-tighter">{formatPrice(h.amount.toString())}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-bold">Total Amount:</span>
                      <span className="text-2xl font-black text-slate-900">{formatPrice(booking.totalPrice)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Paid</span>
                        <span className="text-lg font-bold text-green-700">{formatPrice(booking.paidAmount || 0)}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Pending</span>
                        <span className="text-lg font-bold text-red-700">{formatPrice(booking.pendingAmount || 0)}</span>
                      </div>
                    </div>
                    {(booking.card_number || booking.check_number || booking.bank_name) && (
                      <div className="pt-3 border-t border-green-100 grid grid-cols-2 gap-2 text-xs">
                        {booking.paymentMode && <div><Label>Mode</Label><Value className="font-bold">{booking.paymentMode}</Value></div>}
                        {booking.bank_name && <div><Label>Bank</Label><Value>{booking.bank_name}</Value></div>}
                        {booking.check_number && <div><Label>Cheque #</Label><Value className="font-mono">{booking.check_number}</Value></div>}
                        {booking.card_number && <div><Label>Card #</Label><Value className="font-mono">****{booking.card_number}</Value></div>}
                      </div>
                    )}
                    <div className="pt-3 border-t border-green-200 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment By:</span>
                      {getPaidByBadge(booking.paidBy || "MEMBER")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Vouchers Section */}
              {vouchers && vouchers.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
                    <Receipt className="h-4 w-4" />
                    Payment Vouchers ({vouchers.length})
                  </h3>
                  {isLoadingVouchers ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-muted/10 rounded-xl border border-dashed">
                      <Clock className="h-8 w-8 animate-spin text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground animate-pulse">Loading vouchers...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {vouchers.map((voucher) => (
                        <div key={voucher.id} className="p-3 border rounded-lg bg-muted/30 shadow-sm transition-all hover:bg-muted/40">
                          <div className="flex justify-between items-start mb-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {getVoucherTypeBadge(voucher.voucher_type)}
                                {getVoucherStatusBadge(voucher.status)}
                              </div>
                              <div className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                                <span className="bg-muted px-1 rounded">Consumer: {voucher.consumer_number}</span>
                                {voucher.voucher_no && (
                                  <span className="bg-muted px-1 rounded">Voucher: {voucher.voucher_no}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-base font-bold ${voucher.voucher_type === 'REFUND' || voucher.voucher_type === 'ADJUSTMENT'
                                ? 'text-red-600'
                                : 'text-green-600'
                                }`}>
                                PKR {Number(voucher.amount).toLocaleString()}
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                {voucher.payment_mode.toLowerCase() === 'check' ? 'cheque' : voucher.payment_mode}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-1 text-[10px] text-muted-foreground">
                            <div className="flex justify-between border-t pt-1">
                              <span>Issued: {new Date(voucher.issued_at).toLocaleDateString()}</span>
                              <span>By: {voucher.issued_by}</span>
                            </div>
                            {voucher.paid_at && (
                              <div className="text-green-600 font-medium">Paid At: {new Date(voucher.paid_at).toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(!isLoadingVouchers && (!vouchers || vouchers.length === 0)) && (
                <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-xl border border-dashed">
                  <Receipt className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No payment vouchers found</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Cancellation Tab */}
          <TabsContent value="cancellation" className="m-0">
            {((booking as any).cancellationRequests && (booking as any).cancellationRequests.length > 0) ? (
              <div className="space-y-4">
                {(booking as any).cancellationRequests
                  .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((request: any, index: number) => (
                    <div key={index} className={`p-4 rounded-lg border ${request.status === 'PENDING' ? 'bg-orange-50 border-orange-200' :
                      request.status === 'APPROVED' ? 'bg-green-50 border-green-200' :
                        'bg-red-50 border-red-200'
                      }`}>
                      <div className="flex items-start gap-3 mb-3">
                        {request.status === 'PENDING' ? (
                          <Ban className="h-5 w-5 text-orange-600 mt-0.5" />
                        ) : request.status === 'APPROVED' ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-sm">
                            Cancellation Request {(booking as any).cancellationRequests!.length > 1 ? `#${(booking as any).cancellationRequests!.length - index}` : ""}
                          </h3>
                        </div>
                        {getRequestStatusBadge(request.status)}
                      </div>

                      <div className="space-y-3 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Requested By</Label>
                            <Value className="font-medium text-xs">{request.requestedBy || "Unknown"}</Value>
                          </div>
                          <div>
                            <Label>Requested At</Label>
                            <Value className="text-xs">
                              {new Date(request.createdAt).toLocaleString("en-PK")}
                            </Value>
                          </div>
                        </div>

                        <div>
                          <Label>Reason</Label>
                          <div className="p-2.5 bg-white border border-gray-200 rounded text-xs text-gray-700">
                            {request.reason || "No reason provided"}
                          </div>
                        </div>

                        {request.adminRemarks && (
                          <div>
                            <Label>Admin Remarks</Label>
                            <div className="p-2.5 bg-white border border-gray-200 rounded text-xs text-gray-700">
                              {request.adminRemarks}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-xl border border-dashed">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30 text-green-500" />
                <p className="text-lg font-medium">No Cancellation Request</p>
                <p className="text-sm mt-1">This booking has not been requested for cancellation</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent >
    </Card >
  );
}

// Helper Components
const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`text-xs font-medium text-gray-500 mb-1 ${className}`}>
    {children}
  </div>
);

const Value = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`text-sm ${className}`}>
    {children}
  </div>
);
