import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  User,
  Camera,
  CreditCard,
  Users,
  Phone,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Clock as TimeIcon,
  Timer,
  Receipt,
  XCircle,
  Ban,
} from "lucide-react";
import { PhotoshootBooking } from "@/pages/PhotoshootBookings";
import { Voucher } from "@/types/room-booking.type";

interface PhotoshootOutOfOrderPeriod {
  id: number;
  photoshootId: number;
  reason: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

interface Photoshoot {
  id: number;
  description: string;
  memberCharges: string;
  guestCharges: string;
  isBooked: boolean;
  onHold: boolean;
  holdBy: string | null;
  createdAt: string;
  updatedAt: string;
  outOfOrders?: PhotoshootOutOfOrderPeriod[];
}

interface Member {
  Membership_No: string;
  Name: string;
  Balance: number;
}


interface PhotoshootBookingDetailsCardProps {
  booking: PhotoshootBooking;
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

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatPrice = (price: string): string => {
  return `PKR ${Number(price).toLocaleString()}`;
};

const calculateDuration = (startTime: string, endTime: string): string => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours === 0) {
    return `${diffMinutes} minutes`;
  } else if (diffMinutes === 0) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  } else {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ${diffMinutes} minutes`;
  }
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
      return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Pending</Badge>;
    case "APPROVED":
      return <Badge className="bg-green-100 text-green-800 text-xs">Approved</Badge>;
    case "REJECTED":
      return <Badge className="bg-red-100 text-red-800 text-xs">Rejected</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
};

export function PhotoshootBookingDetailsCard({
  booking,
  vouchers = [],
  isLoadingVouchers = false,
  showFullDetails = true,
  className = "",
}: PhotoshootBookingDetailsCardProps) {
  const [activeTab, setActiveTab] = useState("info");
  const hasGuestInfo = booking.guestName && booking.pricingType === "guest";
  const hasOutOfOrders = booking.photoshoot.outOfOrders && booking.photoshoot.outOfOrders.length > 0;
  const duration = calculateDuration(booking.startTime, booking.endTime);
  const isCurrentlyBooked = booking.photoshoot.isBooked;

  return (
    <Card className={`overflow-auto h-[90vh] border shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5 text-purple-600" />
              Photoshoot Booking #{booking.id} - {booking.photoshoot?.description}
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
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            {/* <TabsTrigger value="cancellation">Cancellation</TabsTrigger> */}
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Session Details */}
              <div className="space-y-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
                    <Timer className="h-4 w-4" />
                    Session Details
                  </h3>
                  {booking.bookingDetails && booking.bookingDetails.length > 0 ? (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                      {booking.bookingDetails.map((detail, idx) => {
                        const startTime = new Date(detail.timeSlot);
                        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
                        return (
                          <div key={idx} className="bg-muted/40 p-3 rounded-md border border-muted">
                            <div className="grid grid-cols-1 gap-2">
                              <div>
                                <Label className="mb-0">Date</Label>
                                <Value>{formatDate(detail.date)}</Value>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="mb-0">Time</Label>
                                  <Value className="font-medium">
                                    {startTime.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })} - {endTime.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                                  </Value>
                                </div>
                                <div>
                                  <Label className="mb-0">Duration</Label>
                                  <Value>2 hours</Value>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <Label>Booking Date</Label>
                        <Value>{formatDate(booking.bookingDate)}</Value>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Start Time</Label>
                          <Value className="font-medium">{formatTime(booking.startTime)}</Value>
                        </div>
                        <div>
                          <Label>End Time</Label>
                          <Value className="font-medium">{formatTime(booking.endTime)}</Value>
                        </div>
                      </div>
                      <div>
                        <Label>Duration</Label>
                        <Value className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          {duration}
                        </Value>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
                    <Camera className="h-4 w-4" />
                    Photoshoot Details
                  </h3>
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-purple-800">{booking.photoshoot.description}</div>
                        <div className="text-sm text-purple-600 mt-1">ID: #{booking.photoshootId}</div>
                      </div>
                      {isCurrentlyBooked && (
                        <Badge className="bg-red-100 text-red-800">Currently Booked</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div>
                        <span className="text-gray-600">Member Rate:</span>
                        <div className="font-medium">{formatPrice(booking.photoshoot.memberCharges)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Guest Rate:</span>
                        <div className="font-medium">{formatPrice(booking.photoshoot.guestCharges)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {hasOutOfOrders && showFullDetails && (
                  <div className="mt-6 pt-4 border-t">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700 mb-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      Maintenance Periods
                    </h3>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto">
                      {booking.photoshoot.outOfOrders!.map((period, pIdx) => {
                        const bookingStart = new Date(booking.startTime);
                        const bookingEnd = new Date(booking.endTime);
                        const periodStart = new Date(period.startDate);
                        const periodEnd = new Date(period.endDate);
                        const isOverlapping = bookingStart < periodEnd && bookingEnd > periodStart;

                        return (
                          <div key={pIdx} className={`p-3 rounded-md border text-sm ${isOverlapping ? "bg-red-50 border-red-300" : "bg-gray-50 border-gray-200"}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{formatDate(period.startDate)} - {formatDate(period.endDate)}</div>
                                <div className="text-gray-600 mt-1">{period.reason}</div>
                              </div>
                              {isOverlapping && (
                                <Badge variant="destructive" className="text-xs">Affects Session</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
                        <div className="font-medium text-blue-900">{booking.member.Name}</div>
                        <div className="text-sm text-blue-700">Membership: #{booking.member.Membership_No}</div>
                      </div>
                      <div className={`text-sm font-bold ${getMemberBalanceColor(booking.member.Balance)}`}>
                        Balance: {formatPrice(booking.member.Balance.toString())}
                      </div>
                    </div>
                  </div>
                </div>

                {hasGuestInfo && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
                      <Users className="h-4 w-4" />
                      Guest Information
                    </h3>
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                      <div className="space-y-1">
                        <div className="font-medium">{booking.guestName}</div>
                        {booking.guestContact && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
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
                          <Label>Last Updated At</Label>
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
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-xl shadow-sm">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-bold">Total Amount:</span>
                      <span className="text-2xl font-black text-slate-900">{formatPrice(booking.totalPrice)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Paid</span>
                        <span className="text-lg font-bold text-green-700">{formatPrice(booking.paidAmount)}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Pending</span>
                        <span className="text-lg font-bold text-red-700">{formatPrice(booking.pendingAmount)}</span>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-purple-100 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment Responsibility:</span>
                      {getPaidByBadge(booking.paidBy || "MEMBER")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Vouchers Section */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
                  <Receipt className="h-4 w-4" />
                  Payment Vouchers {vouchers ? `(${vouchers.length})` : ""}
                </h3>
                {isLoadingVouchers ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-muted/10 rounded-xl border border-dashed">
                    <Clock className="h-8 w-8 animate-spin text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground animate-pulse">Loading vouchers...</p>
                  </div>
                ) : vouchers && vouchers.length > 0 ? (
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
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-base font-bold ${voucher.voucher_type === 'REFUND' || voucher.voucher_type === 'ADJUSTMENT' ? 'text-red-600' : 'text-green-600'}`}>
                              PKR {Number(voucher.amount).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                              {voucher.payment_mode.toLowerCase() === 'check' ? 'cheque' : voucher.payment_mode}
                            </div>
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex justify-between border-t pt-1">
                          <span>Issued: {new Date(voucher.issued_at).toLocaleDateString()}</span>
                          <span>By: {voucher.issued_by}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-xl border border-dashed">
                    <Receipt className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No payment vouchers found</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Cancellation Tab */}
          <TabsContent value="cancellation" className="m-0">
            {((booking as any).cancellationRequests && (booking as any).cancellationRequests.length > 0) ? (
              <div className="space-y-4">
                {(booking as any).cancellationRequests.map((request: any, index: number) => (
                  <div key={index} className={`p-4 rounded-lg border ${request.status === 'PENDING' ? 'bg-orange-50 border-orange-200' : request.status === 'APPROVED' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-start gap-3 mb-3">
                      {request.status === 'PENDING' ? <Ban className="h-5 w-5 text-orange-600 mt-0.5" /> : request.status === 'APPROVED' ? <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" /> : <XCircle className="h-5 w-5 text-red-600 mt-0.5" />}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm">Cancellation Request</h3>
                      </div>
                      {getRequestStatusBadge(request.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs mt-2">
                      <div><Label>Requested By</Label><Value>{request.requestedBy || "Unknown"}</Value></div>
                      <div><Label>Requested At</Label><Value>{new Date(request.createdAt).toLocaleString("en-PK")}</Value></div>
                      <div className="col-span-2">
                        <Label>Reason</Label>
                        <div className="p-2 bg-white border rounded mt-1">{request.reason || "No reason provided"}</div>
                      </div>
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
      </CardContent>
    </Card>
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