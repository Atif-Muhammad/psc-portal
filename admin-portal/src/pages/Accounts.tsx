import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Search, User, FileText, Download, Eye, Receipt,
  CreditCard, Calendar, ArrowUpRight, ArrowDownRight,
  Wallet, Hash, Clock, X, ChevronRight, Filter, RefreshCcw,
  Upload, FileArchive, AlertCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { exportVoucherPDF } from "@/lib/pdfExport";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccountMembers, getMemberVouchers, getMemberBookings, getBillPaymentHistory, cancelBalanceVoucher, listMonthlyBills } from "../../config/apis";
import { DetailedCardSkeleton } from "@/components/Skeletons";
import { formatDateForDisplay, formatDateTimeForDisplay } from "@/utils/pakDate";
import BillUpload from "@/components/BillUpload";


export default function Accounts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [memberVouchers, setMemberVouchers] = useState<any[]>([]);
  const [memberBookings, setMemberBookings] = useState<any[]>([]);
  const [billPaymentHistory, setBillPaymentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Detail dialog states
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedBillPayment, setSelectedBillPayment] = useState<any>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
    fetchMembers(1, true, debouncedSearch);
  }, [debouncedSearch]);

  useEffect(() => {
    if (selectedMember) {
      fetchMemberVouchers(selectedMember.Membership_No);
      fetchMemberBookings(selectedMember.Membership_No);
      fetchBillPaymentHistory(selectedMember.Membership_No);
    }
  }, [selectedMember]);

  const fetchMembers = async (pageToFetch: number, isNewSearch = false, searchStr = debouncedSearch) => {
    try {
      if (pageToFetch === 1) setLoading(true);
      else setLoadingMore(true);
      const data = await getAccountMembers(pageToFetch, 20, searchStr);
      const newMembers = data.data || [];
      if (isNewSearch || pageToFetch === 1) setMembers(newMembers);
      else setMembers(prev => [...prev, ...newMembers]);
      setHasMore(newMembers.length === 20);
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMembers(nextPage);
    }
  };

  const fetchMemberVouchers = async (membershipNo: string) => {
    try {
      const data = await getMemberVouchers(membershipNo);
      setMemberVouchers(data || []);
    } catch { setMemberVouchers([]); }
  };

  const fetchMemberBookings = async (membershipNo: string) => {
    try {
      const data = await getMemberBookings(membershipNo);
      setMemberBookings(data || []);
    } catch { setMemberBookings([]); }
  };

  const fetchBillPaymentHistory = async (membershipNo: string) => {
    try {
      const data = await getBillPaymentHistory(membershipNo);
      setBillPaymentHistory(data || []);
    } catch { setBillPaymentHistory([]); }
  };

  const handleCancelVoucher = async (voucherId: number) => {
    try {
      if (!window.confirm("Are you sure you want to cancel this balance voucher?")) return;
      setIsCancelling(true);
      await cancelBalanceVoucher(voucherId);
      // Refresh vouchers
      if (selectedMember) {
        fetchMemberVouchers(selectedMember.Membership_No);
      }
      setSelectedVoucher(null);
    } catch (error: any) {
      alert(error.message || "Failed to cancel voucher");
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
      case "CONFIRMED":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Paid</Badge>;
      case "HALF_PAID":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Half Paid</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">Pending</Badge>;
      case "UNPAID":
        return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Unpaid</Badge>;
      case "CANCELLED":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100">Cancelled</Badge>;
      case "ADVANCE_PAYMENT":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">Advance</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getVoucherTypeBadge = (type: string) => {
    switch (type) {
      case "FULL_PAYMENT":
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Full Payment</Badge>;
      case "HALF_PAYMENT":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">Half Payment</Badge>;
      case "ADVANCE_PAYMENT":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100">Advance</Badge>;
      case "REFUND":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100">Refund</Badge>;
      case "ADJUSTMENT":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100">Adjustment</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatDate = (dateString: string) => formatDateForDisplay(dateString);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-[300px] mb-2" />
          <Skeleton className="h-4 w-[400px]" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <DetailedCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Member Accounts</h2>
          <p className="text-muted-foreground mt-1">View member payment vouchers, booking history & bill payments</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm py-1 px-3">
            {members.length} members
          </Badge>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-fit grid-cols-2 mb-6">
          <TabsTrigger value="members" className="px-8">Members</TabsTrigger>
          <TabsTrigger value="upload-bills" className="px-8 font-semibold">Monthly Bills</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6 animate-in fade-in duration-500">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, membership no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-background"
            />
          </div>

          {/* Member Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
              <Card
                key={member.Sno}
                className="cursor-pointer group hover:shadow-xl hover:border-primary/30 transition-all duration-300 overflow-hidden"
                onClick={() => setSelectedMember(member)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-2 ring-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base group-hover:text-primary transition-colors">{member.Name}</CardTitle>
                        <p className="text-xs text-muted-foreground font-mono">{member.Membership_No}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5" /> Balance
                      </span>
                      <span className={`font-semibold tabular-nums ${Number(member.Balance) > 0 ? "text-red-600" : Number(member.Balance) < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        PKR {Number(member.Balance || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> Last Booking
                      </span>
                      <span className="text-xs font-medium">{member.lastBookingDate ? formatDate(member.lastBookingDate) : '—'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t">
                      <span className="text-muted-foreground text-xs">Bookings: {member.totalBookings || 0}</span>
                      <Badge variant={member.Status === "ACTIVE" || member.Status === "active" ? "default" : "secondary"} className="text-[10px] px-2 py-0">
                        {member.Status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div
              className="flex justify-center p-4"
              ref={(el) => {
                if (el) {
                  const observer = new IntersectionObserver(
                    (entries) => {
                      if (entries[0].isIntersecting && !loadingMore) loadMore();
                    },
                    { threshold: 1.0 }
                  );
                  observer.observe(el);
                }
              }}
            >
              {loadingMore && <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload-bills">
          <MonthlyBillsTab />
        </TabsContent>
      </Tabs>

      {/* ──────────────── MAIN MEMBER DIALOG ──────────────── */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Dialog Header with gradient */}
          <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent p-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                {selectedMember?.Name}
              </DialogTitle>
            </DialogHeader>
            {/* Member summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 border shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-black font-medium">Membership No</p>
                <p className="font-semibold text-sm font-mono mt-0.5">{selectedMember?.Membership_No}</p>
              </div>
              <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 border shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-black font-medium">Balance</p>
                <p className={`font-semibold text-sm mt-0.5 tabular-nums ${Number(selectedMember?.Balance) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  PKR {Number(selectedMember?.Balance || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 border shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Bookings</p>
                <p className="font-semibold text-sm mt-0.5">{selectedMember?.totalBookings || 0}</p>
              </div>
              <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 border shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</p>
                <div className="mt-0.5">
                  <Badge variant={selectedMember?.Status === "ACTIVE" || selectedMember?.Status === "active" ? "default" : "secondary"} className="text-[10px]">
                    {selectedMember?.Status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex-1 overflow-y-auto p-6 pt-4">
            <Tabs defaultValue="vouchers" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-10">
                <TabsTrigger value="vouchers" className="gap-1.5 text-xs">
                  <Receipt className="h-3.5 w-3.5" /> Payment Vouchers
                </TabsTrigger>
                <TabsTrigger value="bookings" className="gap-1.5 text-xs">
                  <Calendar className="h-3.5 w-3.5" /> Booking History
                </TabsTrigger>
                <TabsTrigger value="bill-history" className="gap-1.5 text-xs">
                  <CreditCard className="h-3.5 w-3.5" /> Bill Payments
                </TabsTrigger>
              </TabsList>

              {/* ──── Payment Vouchers Tab ──── */}
              <TabsContent value="vouchers" className="mt-4">
                {memberVouchers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Receipt className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm">No payment vouchers found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {memberVouchers.map((voucher) => (
                      <div
                        key={voucher.id}
                        className="group/row flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/30 hover:border-primary/20 transition-all cursor-pointer"
                        onClick={() => setSelectedVoucher(voucher)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${voucher.voucher_type === 'REFUND' ? 'bg-orange-100' : voucher.status === 'CONFIRMED' ? 'bg-emerald-100' : 'bg-yellow-100'}`}>
                            {voucher.voucher_type === 'REFUND'
                              ? <ArrowDownRight className="h-5 w-5 text-orange-600" />
                              : <ArrowUpRight className="h-5 w-5 text-emerald-600" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              {getVoucherTypeBadge(voucher.voucher_type)}
                              {getStatusBadge(voucher.status)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 font-mono">
                              {voucher.consumer_number || `#${voucher.id}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`font-bold tabular-nums ${voucher.voucher_type === 'REFUND' ? 'text-orange-600' : 'text-foreground'}`}>
                              PKR {Number(voucher.amount || 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatDateTimeForDisplay(voucher.issued_at || voucher.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover/row:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); exportVoucherPDF(voucher); }}
                              title="Download PDF"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover/row:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ──── Booking History Tab ──── */}
              <TabsContent value="bookings" className="mt-4">
                {memberBookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm">No bookings found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {memberBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="group/row flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/30 hover:border-primary/20 transition-all cursor-pointer"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{booking.name || booking.type}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{booking.type}</Badge>
                              {getStatusBadge(booking.status)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold tabular-nums">PKR {Number(booking.amount || 0).toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{booking.date}</p>
                          </div>
                          <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover/row:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ──── Bill Payment History Tab ──── */}
              <TabsContent value="bill-history" className="mt-4">
                {billPaymentHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm">No bill payment history found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {billPaymentHistory.map((history) => (
                      <div
                        key={history.id}
                        className="group/row flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/30 hover:border-primary/20 transition-all cursor-pointer"
                        onClick={() => setSelectedBillPayment(history)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${history.status === 'PAID' ? 'bg-emerald-100' : 'bg-yellow-100'}`}>
                            <CreditCard className={`h-5 w-5 ${history.status === 'PAID' ? 'text-emerald-600' : 'text-yellow-600'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Balance Settlement</p>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusBadge(history.status)}
                              <span className="text-[10px] font-mono text-muted-foreground">{history.consumerNo}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold tabular-nums text-emerald-600">PKR {Number(history.amount || 0).toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatDateTimeForDisplay(history.paidAt || history.createdAt)}
                            </p>
                          </div>
                          <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover/row:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* ──────────────── VOUCHER DETAIL DIALOG ──────────────── */}
      <Dialog open={!!selectedVoucher} onOpenChange={() => setSelectedVoucher(null)}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <div className={`p-6 pb-4 ${selectedVoucher?.voucher_type === 'REFUND' ? 'bg-gradient-to-br from-orange-50 to-transparent' : 'bg-gradient-to-br from-emerald-50 to-transparent'}`}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" /> Voucher Details
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 text-center">
              <p className={`text-3xl font-bold tabular-nums ${selectedVoucher?.voucher_type === 'REFUND' ? 'text-orange-600' : 'text-emerald-600'}`}>
                PKR {Number(selectedVoucher?.amount || 0).toLocaleString()}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                {selectedVoucher && getVoucherTypeBadge(selectedVoucher.voucher_type)}
                {selectedVoucher && getStatusBadge(selectedVoucher.status)}
              </div>
            </div>
          </div>
          <div className="p-6 pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <DetailItem icon={<Hash className="h-3.5 w-3.5" />} label="Consumer No" value={selectedVoucher?.consumer_number} mono />
              <DetailItem icon={<CreditCard className="h-3.5 w-3.5" />} label="Payment Mode" value={selectedVoucher?.payment_mode?.toLowerCase() === 'check' ? 'Cheque' : selectedVoucher?.payment_mode} />
              <DetailItem icon={<FileText className="h-3.5 w-3.5" />} label="Booking Type" value={selectedVoucher?.booking_type || '—'} />
              <DetailItem icon={<User className="h-3.5 w-3.5" />} label="Issued By" value={selectedVoucher?.issued_by || '—'} />
              <DetailItem icon={<Clock className="h-3.5 w-3.5" />} label="Issued At" value={selectedVoucher?.issued_at ? formatDateTimeForDisplay(selectedVoucher.issued_at) : '—'} />
              {selectedVoucher?.paid_at && (
                <DetailItem icon={<Clock className="h-3.5 w-3.5" />} label="Paid At" value={formatDateTimeForDisplay(selectedVoucher.paid_at)} />
              )}
            </div>

            {/* Payment details */}
            {(selectedVoucher?.card_number || selectedVoucher?.check_number || selectedVoucher?.bank_name || selectedVoucher?.transaction_id) && (
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg space-y-2">
                <p className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                  <CreditCard className="h-3 w-3" /> Payment Info
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedVoucher?.card_number && <div><span className="text-blue-700 font-medium">Card:</span> <span className="font-mono">{selectedVoucher.card_number}</span></div>}
                  {selectedVoucher?.check_number && <div><span className="text-blue-700 font-medium">Cheque:</span> <span className="font-mono">{selectedVoucher.check_number}</span></div>}
                  {selectedVoucher?.bank_name && <div className="col-span-2"><span className="text-blue-700 font-medium">Bank:</span> {selectedVoucher.bank_name}</div>}
                  {selectedVoucher?.transaction_id && <div className="col-span-2"><span className="text-blue-700 font-medium">Transaction:</span> <span className="font-mono">{selectedVoucher.transaction_id}</span></div>}
                </div>
              </div>
            )}

            {selectedVoucher?.remarks && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Remarks</p>
                <p className="text-sm">{selectedVoucher.remarks}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {selectedVoucher?.remarks === 'Balance' && selectedVoucher?.status === 'PENDING' && (
                <Button
                  className="flex-1"
                  variant="destructive"
                  onClick={() => handleCancelVoucher(selectedVoucher.id)}
                  disabled={isCancelling}
                >
                  {isCancelling ? "Cancelling..." : "Cancel Voucher"}
                </Button>
              )}
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => { exportVoucherPDF(selectedVoucher); }}
              >
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
              <Button variant="ghost" onClick={() => setSelectedVoucher(null)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ──────────────── BOOKING DETAIL DIALOG ──────────────── */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <div className="p-6 pb-4 bg-gradient-to-br from-blue-50 to-transparent">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" /> Booking Details
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-6 pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">{selectedBooking?.name || selectedBooking?.type}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{selectedBooking?.type}</Badge>
                  {selectedBooking && getStatusBadge(selectedBooking.status)}
                </div>
              </div>
              <p className="text-2xl font-bold tabular-nums">PKR {Number(selectedBooking?.amount || 0).toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DetailItem icon={<Calendar className="h-3.5 w-3.5" />} label="Date" value={selectedBooking?.date || '—'} />
              <DetailItem icon={<FileText className="h-3.5 w-3.5" />} label="Booking ID" value={selectedBooking?.id ? `#${selectedBooking.id}` : '—'} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setSelectedBooking(null)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ──────────────── BILL PAYMENT DETAIL DIALOG ──────────────── */}
      <Dialog open={!!selectedBillPayment} onOpenChange={() => setSelectedBillPayment(null)}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <div className="p-6 pb-4 bg-gradient-to-br from-emerald-50 to-transparent">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Bill Payment Details
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 text-center">
              <p className="text-3xl font-bold tabular-nums text-emerald-600">
                PKR {Number(selectedBillPayment?.amount || 0).toLocaleString()}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                {selectedBillPayment && getStatusBadge(selectedBillPayment.status)}
              </div>
            </div>
          </div>
          <div className="p-6 pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <DetailItem icon={<Hash className="h-3.5 w-3.5" />} label="Consumer No" value={selectedBillPayment?.consumerNo || '—'} mono />
              <DetailItem icon={<User className="h-3.5 w-3.5" />} label="Membership No" value={selectedBillPayment?.membershipNo || '—'} mono />
              <DetailItem icon={<Clock className="h-3.5 w-3.5" />} label="Paid At" value={selectedBillPayment?.paidAt ? formatDateTimeForDisplay(selectedBillPayment.paidAt) : '—'} />
              <DetailItem icon={<Clock className="h-3.5 w-3.5" />} label="Created At" value={selectedBillPayment?.createdAt ? formatDateTimeForDisplay(selectedBillPayment.createdAt) : '—'} />
            </div>

            {selectedBillPayment?.remarks && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Remarks</p>
                <p className="text-sm">{selectedBillPayment.remarks}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setSelectedBillPayment(null)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MonthlyBillsTab() {
  const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, "0"));
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [bills, setBills] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());

  const fetchBills = async () => {
    try {
      setFetching(true);
      const data = await listMonthlyBills(month, year);
      setBills(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch bills");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="border-primary/10 shadow-sm bg-background">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-semibold text-muted-foreground ml-1 flex items-center gap-2">
                <Calendar className="h-3 w-3 text-primary" /> Select Period
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                className="flex-1 md:flex-none border-primary/20 hover:bg-primary/5 hover:text-primary transition-all group"
                onClick={fetchBills}
                disabled={fetching}
              >
                {fetching ? <RefreshCcw className="h-4 w-4 animate-spin mr-2" /> : <Filter className="h-4 w-4 mr-2 text-primary group-hover:scale-110 transition-transform" />}
                Fetch Bills
              </Button>

              <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogTrigger asChild>
                  <Button className="flex-1 md:flex-none shadow-lg shadow-primary/10 transition-all active:scale-95">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Bills
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl">
                  <div className="p-6 bg-background">
                    <DialogHeader className="mb-4">
                      <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-primary">
                        <Upload className="h-6 w-6 text-primary" /> Upload Monthly Bills
                      </DialogTitle>
                      <DialogDescription>
                        Select a month and year to upload a ZIP file containing member bills.
                      </DialogDescription>
                    </DialogHeader>
                    <BillUpload onUploadSuccess={() => {
                      setIsUploadOpen(false);
                      fetchBills();
                    }} />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/10 shadow-md overflow-hidden bg-background">
        <Table>
          <TableHeader className="bg-muted/30 border-b">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold text-black px-6 py-4">Membership No</TableHead>
              <TableHead className="font-semibold text-black py-4 text-center">Month/Year</TableHead>
              <TableHead className="font-semibold text-black py-4">Filename</TableHead>
              <TableHead className="font-semibold text-black py-4 text-right pr-6">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fetching ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-muted animate-pulse rounded w-20" /></TableCell>
                  <TableCell className="py-4 text-center"><div className="h-4 bg-muted animate-pulse rounded w-16 mx-auto" /></TableCell>
                  <TableCell className="py-4"><div className="h-4 bg-muted animate-pulse rounded w-32" /></TableCell>
                  <TableCell className="text-right pr-6 py-4"><div className="h-8 bg-muted animate-pulse rounded w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : bills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <FileArchive className="h-12 w-12 text-primary opacity-20" />
                    <p className="text-lg font-medium">No bills found for this period</p>
                    <p className="text-sm">Try selecting a different month or year</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              bills.map((bill) => (
                <TableRow key={bill.membershipNo} className="hover:bg-accent/5 transition-colors group">
                  <TableCell className="font-mono px-6 py-4">{bill.membershipNo}</TableCell>
                  <TableCell className="text-center py-4">{month}/{year}</TableCell>
                  <TableCell className="text-muted-foreground text-sm py-4">{bill.filename}</TableCell>
                  <TableCell className="text-right pr-6 py-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:bg-primary/10 hover:text-primary-foreground transition-all"
                      asChild
                    >
                      <a href={`https://admin.peshawarservicesclub.com${bill.url}`} target="_blank" rel="noreferrer">
                        View Bill
                      </a>
                      {/* <a href={`http://localhost:3000${bill.url}`} target="_blank" rel="noreferrer">
                        View Bill
                      </a> */}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground py-2 italic">
        <AlertCircle className="h-3 w-3" />
        Note: Bills are stored as individual PDF files extracted from ZIP uploads.
      </div>
    </div>
  );
}

/* ──────────────── Reusable Detail Item Component ──────────────── */
function DetailItem({ icon, label, value, mono = false }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
        {icon} {label}
      </p>
      <p className={`text-sm font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}
