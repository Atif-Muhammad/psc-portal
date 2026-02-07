import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  User,
  Home,
  CreditCard,
  Users,
  Phone,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Receipt,
  XCircle,
  Ban,
  Plus,
} from "lucide-react";
import { Booking, Voucher } from "@/types/room-booking.type";

interface OutOfOrderPeriod {
  id: number;
  roomId: number;
  reason: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

interface RoomType {
  id: number;
  type: string;
}

interface Room {
  id: number;
  roomNumber: string;
  roomType: RoomType;
  outOfOrders: OutOfOrderPeriod[];
}

interface Member {
  Membership_No: string;
  Name: string;
  Balance: number;
}


interface BookingDetailsCardProps {
  booking: Booking;
  vouchers?: Voucher[];
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

const formatPrice = (price: string): string => {
  return `PKR ${Number(price).toLocaleString()}`;
};

const calculateNights = (checkIn: string, checkOut: string): number => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
    case "forces":
    case "forces-self":
    case "forces-guest":
      return (
        <Badge variant="outline" className="border-green-300 text-green-700">
          Forces Rate {type === "forces-self" ? "(Self)" : type === "forces-guest" ? "(Guest)" : ""}
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

export function BookingDetailsCard({
  booking,
  vouchers = [],
  showFullDetails = true,
  className = "",
}: BookingDetailsCardProps) {
  const [activeTab, setActiveTab] = useState("info");
  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const hasGuestInfo = booking.guestName && booking.pricingType === "guest";
  const rooms = booking.rooms && booking.rooms.length > 0 ? booking.rooms : booking.room ? [booking.room] : [];
  const roomNumbers = rooms.map((r: any) => r.room?.roomNumber || r.roomNumber).join(", ");
  const roomType = rooms[0]?.roomType?.type || rooms[0]?.room?.roomType?.type || booking.room?.roomType?.type || "N/A";

  return (
    <Card className={`overflow-auto h-[90vh] border shadow-sm hover:shadow-md transition-shadow  ${className}`}>
      <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5 text-blue-600" />
              Booking #{booking.id} - {rooms.length > 1 ? "Rooms" : "Room"} {roomNumbers}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Created {new Date(booking.createdAt).toLocaleString("en-PK", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {getPaymentStatusBadge(booking.paymentStatus)}
            {getPricingTypeBadge(booking.pricingType)}
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
                {/* Dates & Duration */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
                    <Calendar className="h-4 w-4" />
                    Booking Period
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Check-in</Label>
                      <Value>{formatDate(booking.checkIn)}</Value>
                    </div>
                    <div>
                      <Label>Check-out</Label>
                      <Value>{formatDate(booking.checkOut)}</Value>
                    </div>
                    <div>
                      <Label>Duration</Label>
                      <Value>{nights} night{nights !== 1 ? 's' : ''}</Value>
                    </div>
                    <div>
                      <Label>Guests</Label>
                      <Value>
                        {booking.numberOfAdults} adult{booking.numberOfAdults !== 1 ? 's' : ''}
                        {booking.numberOfChildren > 0 && `, ${booking.numberOfChildren} child${booking.numberOfChildren !== 1 ? 'ren' : ''}`}
                      </Value>
                    </div>
                  </div>
                </div>

                {/* Room Information */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
                    <Home className="h-4 w-4" />
                    Room Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{rooms.length > 1 ? "Room Numbers" : "Room Number"}</Label>
                      <Value className="font-bold">{roomNumbers}</Value>
                    </div>
                    <div>
                      <Label>Room Type</Label>
                      <Value>{roomType}</Value>
                    </div>
                  </div>
                </div>

                {/* Special Requests */}
                {booking.specialRequests && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
                      <FileText className="h-4 w-4" />
                      Special Requests
                    </h3>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
                      {booking.specialRequests}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Member & Guest Info */}
              <div className="space-y-4">
                {/* Member Information */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
                    <User className="h-4 w-4" />
                    Member Information
                  </h3>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{booking.member.Name}</div>
                        <div className="text-sm text-gray-600">
                          Membership: #{booking.member.Membership_No}
                        </div>
                      </div>
                      <div className={`text-sm font-bold ${getMemberBalanceColor(booking.member.Balance)}`}>
                        Balance: {formatPrice(booking.member.Balance.toString())}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guest / Forces Information (if applicable) */}
                {(booking.pricingType === "guest" || booking.pricingType === "forces" || booking.pricingType === "forces-guest") && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
                      <Users className="h-4 w-4" />
                      {(booking.pricingType === "forces" || booking.pricingType === "forces-guest") ? "PA Reference Details" : "Guest Information"}
                    </h3>
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                      <div className="space-y-1">
                        <div>
                          <Label>{(booking.pricingType === "forces" || booking.pricingType === "forces-guest") ? "PA Ref Name" : "Guest Name"}</Label>
                          <div className="font-medium">{booking.guestName || "N/A"}</div>
                        </div>
                        {booking.guestContact && (
                          <div className="mt-2">
                            <Label>{(booking.pricingType === "forces" || booking.pricingType === "forces-guest") ? "PA Ref Contact" : "Guest Contact"}</Label>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              {booking.guestContact}
                            </div>
                          </div>
                        )}
                        {booking.guestCNIC && (
                          <div className="mt-2">
                            <Label>{(booking.pricingType === "forces" || booking.pricingType === "forces-guest") ? "PA Ref CNIC" : "Guest CNIC"}</Label>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <CreditCard className="h-3 w-3" />
                              {booking.guestCNIC}
                            </div>
                          </div>
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
                    <div className="p-3 bg-gray-50 border rounded-md">
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
              {/* Payment Summary */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
                  <CreditCard className="h-4 w-4" />
                  Payment Summary
                </h3>
                <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl shadow-sm">
                  <div className="space-y-4">
                    {/* Price Breakdown */}
                    {booking.extraCharges && booking.extraCharges.length > 0 && (
                      <div className="space-y-2 pb-3 border-b border-blue-200/50">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Base Room Rent:</span>
                          <span className="font-medium text-gray-800">
                            {formatPrice((booking.totalPrice - booking.extraCharges.reduce((sum: number, h: any) => sum + (Number(h.amount) || 0), 0)).toString())}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">Extra Charges Breakdown:</span>
                          {booking.extraCharges.map((h: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                              <span className="text-slate-500">{h.head}</span>
                              <span className="text-slate-700 font-mono tracking-tighter">{formatPrice(h.amount.toString())}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-bold">Total Amount:</span>
                      <span className="text-2xl font-black text-slate-900">{formatPrice(booking.totalPrice.toString())}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Paid</span>
                        <span className="text-lg font-bold text-green-700">{formatPrice(booking.paidAmount.toString())}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Pending</span>
                        <span className="text-lg font-bold text-red-700">{formatPrice(booking.pendingAmount.toString())}</span>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-blue-200 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment By:</span>
                      {getPaidByBadge(booking.paidBy)}
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
                  <div className="space-y-3">
                    {vouchers.map((voucher: Voucher) => (
                      <div key={voucher.id} className="p-3 border rounded-lg bg-muted/30">
                        <div className="flex justify-between items-start mb-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getVoucherTypeBadge(voucher.voucher_type)}
                              {getVoucherStatusBadge(voucher.status)}
                            </div>
                            <div className="text-xs font-mono text-muted-foreground">
                              Consumer: {voucher.consumer_number}
                            </div>
                            {voucher.voucher_no && (
                              <div className="text-xs font-mono text-muted-foreground">
                                Voucher: {voucher.voucher_no}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className={`text-base font-bold ${voucher.voucher_type === 'REFUND' || voucher.voucher_type === 'ADJUSTMENT'
                              ? 'text-red-600'
                              : 'text-green-600'
                              }`}>
                              PKR {Number(voucher.amount).toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {voucher.payment_mode.toLowerCase() === 'check' ? 'cheque' : voucher.payment_mode.toLowerCase()}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">Issued At:</span> {new Date(voucher.issued_at).toLocaleDateString()} {new Date(voucher.issued_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            <span className="font-medium">Paid At:</span> {voucher.paid_at ? `${new Date(voucher.paid_at).toLocaleDateString()} ${new Date(voucher.paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Not Paid"}
                          </div>
                          <div>
                            <span className="font-medium">By:</span> {voucher.issued_by}
                          </div>
                        </div>
                        {(voucher.card_number || voucher.check_number || voucher.bank_name) && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                            {voucher.card_number && <div><span className="">Card:</span> •••• {voucher.card_number}</div>}
                            {voucher.check_number && <div><span className="">Cheque:</span> {voucher.check_number}</div>}
                            {voucher.bank_name && <div><span className="font-medium">Bank:</span> {voucher.bank_name}</div>}
                          </div>
                        )}
                        {voucher.transaction_id && (
                          <div className="mt-2 text-xs">
                            <span className="font-medium">Transaction ID:</span> <span className="font-mono text-muted-foreground">{voucher.transaction_id}</span>
                          </div>
                        )}
                        {voucher.remarks && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-muted-foreground">
                            {voucher.remarks}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!vouchers || vouchers.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No payment vouchers available</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Cancellation Tab */}
          <TabsContent value="cancellation" className="m-0">
            {booking.cancellationRequests && booking.cancellationRequests.length > 0 ? (
              <div className="space-y-4">
                {booking.cancellationRequests
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((request, index) => (
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
                          <CheckCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-0.5">
                            Cancellation Request {booking.cancellationRequests!.length > 1 ? `#${booking.cancellationRequests!.length - index}` : ""}
                          </h3>
                          <p className="text-xs text-gray-500">
                            Status: <span className="font-medium underline capitalize">{request.status.toLowerCase()}</span>
                          </p>
                        </div>
                        {getRequestStatusBadge(request.status)}
                      </div>

                      <div className="space-y-3 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Requested By</Label>
                            <Value className="font-medium">{request.requestedBy || "Unknown"}</Value>
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
                          <div className="p-2.5 bg-white border border-gray-200 rounded text-sm text-gray-700">
                            {request.reason || "No reason provided"}
                          </div>
                        </div>

                        {request.adminRemarks && (
                          <div>
                            <Label>Admin Remarks</Label>
                            <div className="p-2.5 bg-white border border-gray-200 rounded text-sm text-gray-700">
                              {request.adminRemarks}
                            </div>
                          </div>
                        )}

                        {request.status !== 'PENDING' && (
                          <div className="pt-2 border-t border-gray-200 italic">
                            <Label>Processed At</Label>
                            <Value className="text-xs">
                              {new Date(request.updatedAt).toLocaleString("en-PK")}
                            </Value>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : booking.cancellationRequest ? (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <Ban className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Cancellation Request</h3>
                    <p className="text-sm text-gray-600">
                      This booking has a cancellation request
                    </p>
                  </div>
                  {getRequestStatusBadge(booking.cancellationRequest.status)}
                </div>

                <div className="space-y-3 mt-4">
                  <div>
                    <Label>Requested By</Label>
                    <Value className="font-medium">{booking.cancellationRequest?.requestedBy || "Unknown"}</Value>
                  </div>

                  <div>
                    <Label>Reason</Label>
                    <div className="p-3 bg-white border border-orange-200 rounded text-sm">
                      {booking.cancellationRequest.reason || "No reason provided"}
                    </div>
                  </div>

                  {booking.cancellationRequest.adminRemarks && (
                    <div>
                      <Label>Admin Remarks</Label>
                      <div className="p-3 bg-white border border-orange-200 rounded text-sm">
                        {booking.cancellationRequest.adminRemarks}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-orange-200">
                    <div>
                      <Label>Requested At</Label>
                      <Value className="text-xs">
                        {new Date(booking.cancellationRequest.createdAt).toLocaleString("en-PK")}
                      </Value>
                    </div>
                    <div>
                      <Label>Last Updated</Label>
                      <Value className="text-xs">
                        {new Date(booking.cancellationRequest.updatedAt).toLocaleString("en-PK")}
                      </Value>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
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