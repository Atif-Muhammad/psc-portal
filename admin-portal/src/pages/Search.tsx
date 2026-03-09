import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { unifiedSearch, getVouchers, getUnifiedBooking } from "../../config/apis";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, Loader2, User, Calendar, CreditCard, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// Import Detail components
import { BookingDetailsCard as RoomDetailView } from "@/components/details/RoomBookingDets";
import { HallBookingDetailsCard as HallDetailView } from "@/components/details/HallBookingDets";
import { LawnBookingDetailsCard as LawnDetailView } from "@/components/details/LawnBookingDets";
import { PhotoshootBookingDetailsCard as PhotoshootDetailView } from "@/components/details/PhotoshootBookingDets";

export default function Search() {
    const [query, setQuery] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
    const [openDetails, setOpenDetails] = useState(false);

    const { data: results = [], isLoading, isError, error } = useQuery({
        queryKey: ["unifiedSearch", searchTerm],
        queryFn: () => unifiedSearch(searchTerm),
        enabled: searchTerm.length > 0,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchTerm(query.trim());
    };

    const getCategoryColor = (category: string) => {
        switch (category.toUpperCase()) {
            case "ROOM": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            case "HALL": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
            case "LAWN": return "bg-green-500/10 text-green-500 border-green-500/20";
            case "PHOTOSHOOT": return "bg-pink-500/10 text-pink-500 border-pink-500/20";
            case "AFF_ROOM": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
            default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
        }
    };

    const handleRowClick = (res: any) => {
        setSelectedBooking(res);
        setOpenDetails(true);
    };

    // Unified Detail View Component
    const UnifiedDetailView = ({ result }: { result: any }) => {
        const { category, bookingId, booking: initialBooking } = result;
        const cat = category.toUpperCase();

        // Query for full booking details if not already present
        // Ensure we don't use initialData if it's just a summary/voucher hit metadata
        const hasFullBooking = initialBooking && (initialBooking.totalPrice !== undefined || initialBooking.paidAmount !== undefined);

        const { data: booking, isLoading: loadingBooking } = useQuery({
            queryKey: ['unifiedBooking', cat, bookingId],
            queryFn: () => getUnifiedBooking(cat, bookingId.toString()),
            enabled: !hasFullBooking && !!cat && !!bookingId,
            initialData: hasFullBooking ? initialBooking : undefined
        });

        // Secondary query for vouchers for ANY booking category
        const { data: vouchers = [], isLoading: loadingVouchers } = useQuery({
            queryKey: ['vouchers', cat, bookingId],
            queryFn: () => getVouchers(cat, bookingId.toString()),
            enabled: !!cat && !!bookingId,
        });

        if (loadingBooking) {
            return (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
                    <p className="text-lg font-medium text-muted-foreground">Loading booking details...</p>
                </div>
            );
        }

        if (!booking) {
            return <div className="p-8 text-center text-red-500">Failed to load booking details.</div>;
        }

        const commonProps = {
            booking: booking,
            vouchers: loadingVouchers ? [] : vouchers,
            className: "rounded-none border-0 shadow-none p-0",
            showFullDetails: true
        };

        if (cat === 'ROOM' || cat === 'AFF_ROOM') return <RoomDetailView {...commonProps} />;
        if (cat === 'HALL') return <HallDetailView {...commonProps} />;
        if (cat === 'LAWN') return <LawnDetailView {...commonProps} />;
        if (cat === 'PHOTOSHOOT') return <PhotoshootDetailView {...commonProps} />;

        return <div className="p-8 text-center">Detail view not available for this category.</div>;
    };

    return (
        <div className="container mx-auto py-8 max-w-5xl space-y-10">
            <div className="space-y-3">
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground/90">Unified Search</h1>
                <p className="text-muted-foreground text-lg">
                    Lookup records across Rooms, Halls, Lawns, and Photoshoots.
                </p>
            </div>

            <Card className="border shadow-lg bg-card/50 backdrop-blur-md overflow-hidden ring-1 ring-border/50">
                <CardContent className="p-8">
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <div className="relative flex-1 group">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
                            <Input
                                placeholder="Consumer Number or Booking ID..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="pl-12 h-14 text-xl border-2 border-amber-500/20 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 bg-background/50 transition-all rounded-xl shadow-inner"
                            />
                        </div>
                        <Button
                            type="submit"
                            size="lg"
                            disabled={isLoading}
                            className="px-10 h-14 text-xl font-bold bg-[#FFBF00] hover:bg-[#E6AC00] text-black shadow-xl active:scale-95 transition-all rounded-xl shrink-0"
                        >
                            {isLoading ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : <SearchIcon className="h-6 w-6 mr-3" />}
                            Search
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="space-y-6">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-24 space-y-4">
                        <div className="relative">
                            <Loader2 className="h-16 w-16 animate-spin text-amber-500" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-3 w-3 bg-amber-500 rounded-full animate-bounce" />
                            </div>
                        </div>
                        <p className="text-xl font-medium text-muted-foreground">Scanning database...</p>
                    </div>
                )}

                {!isLoading && searchTerm && results.length === 0 && (
                    <div className="border-2 border-dashed border-border/60 rounded-3xl py-24 text-center bg-muted/10 animate-fade-in">
                        <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-muted/40 mb-6">
                            <SearchIcon className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                        <h2 className="text-3xl font-bold mb-3 text-foreground/80">Record Not Found</h2>
                        <p className="text-muted-foreground text-lg max-w-sm mx-auto">
                            No bookings matched "{searchTerm}". Verify the ID or Consumer Number and try again.
                        </p>
                    </div>
                )}

                <div className="grid gap-6">
                    {results.map((res: any, idx: number) => {
                        const booking = res.booking;
                        const member = booking?.member || booking?.affiliatedClub || res.member;
                        const dateStr = booking?.checkIn || booking?.bookingDate || booking?.requestedDate;

                        return (
                            <Card
                                key={`${res.category}-${res.bookingId}-${idx}`}
                                className="group relative overflow-hidden border-border/50 hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 cursor-pointer animate-in fade-in slide-in-from-bottom-4 bg-card/40 backdrop-blur-sm"
                                onClick={() => handleRowClick(res)}
                            >
                                <div className="flex">
                                    <div className={`w-1.5 shrink-0 ${getCategoryColor(res.category).split(' ')[0]}`} />
                                    <CardContent className="p-7 flex-1 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-8">
                                        <div className="space-y-5 flex-1">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <Badge variant="outline" className={`font-bold tracking-widest text-[10px] uppercase h-6 px-3 rounded-full border-2 ${getCategoryColor(res.category)}`}>
                                                    {res.category.replace('_', ' ')}
                                                </Badge>
                                                <Badge variant="secondary" className="font-bold text-[10px] h-6 px-3 rounded-full bg-muted/80 text-muted-foreground/80 border border-border/50">
                                                    ID: #{res.bookingId}
                                                </Badge>
                                                {res.type === 'Voucher' && (
                                                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-bold h-6 px-3 rounded-full">
                                                        Matched by Voucher
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-12">
                                                <div className="flex items-center gap-4 text-foreground/70 group-hover:text-foreground transition-colors">
                                                    <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                                                        <User className="h-5 w-5 text-primary/70" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-lg leading-tight">{member?.Name || member?.name || "Guest Booking"}</span>
                                                        <span className="text-xs text-muted-foreground font-medium">({member?.Membership_No || member?.membershipNo || booking?.affiliatedMembershipNo || "N/A"})</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 text-foreground/70 group-hover:text-foreground transition-colors">
                                                    <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                                                        <Calendar className="h-5 w-5 text-primary/70" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        {res.type === 'Voucher' ? (
                                                            <>
                                                                <span className="font-bold text-lg leading-tight">
                                                                    {res.issuedAt ? format(new Date(res.issuedAt), "MMM do, yy - hh:mm a") : "N/A"}
                                                                </span>
                                                                <span className="text-[10px] uppercase text-muted-foreground font-bold leading-none mt-0.5">Issued At</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="font-bold text-lg leading-tight">
                                                                    {dateStr ? format(new Date(dateStr), "MMMM do, yyyy") : "N/A"}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground font-medium">Check-in / Date</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 text-foreground/70 group-hover:text-foreground transition-colors">
                                                    <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                                                        <CreditCard className="h-5 w-5 text-primary/70" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-lg font-bold leading-tight">
                                                            {booking ? `Rs. ${Number(booking.totalPrice || 0).toLocaleString()}` : res.amount ? `Rs. ${Number(res.amount).toLocaleString()}` : "N/A"}
                                                        </span>
                                                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-600/90">
                                                            {booking?.paymentStatus || res.status || "PENDING"}
                                                        </span>
                                                    </div>
                                                </div>

                                                {res.type === 'Voucher' && res.paidAt && (
                                                    <div className="flex items-center gap-4 text-foreground/70 group-hover:text-foreground transition-colors">
                                                        <div className="h-10 w-10 rounded-full bg-green-500/5 flex items-center justify-center shrink-0 border border-green-500/10">
                                                            <Calendar className="h-4 w-4 text-green-500/50" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold tracking-tight text-green-600/80">
                                                                {format(new Date(res.paidAt), "MMM do, yy - hh:mm a")}
                                                            </span>
                                                            <span className="text-[10px] uppercase text-muted-foreground font-bold">Paid At</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {res.type === 'Voucher' && res.issuedBy && (
                                                    <div className="flex items-center gap-4 text-foreground/70 group-hover:text-foreground transition-colors">
                                                        <div className="h-10 w-10 rounded-full bg-blue-500/5 flex items-center justify-center shrink-0 border border-blue-500/10">
                                                            <User className="h-4 w-4 text-blue-500/50" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold tracking-tight text-blue-600/80">{res.issuedBy}</span>
                                                            <span className="text-[10px] uppercase text-muted-foreground font-bold">Issued By</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {res.type === 'Voucher' && res.paymentMode && (
                                                    <div className="flex items-center gap-4 text-foreground/70 group-hover:text-foreground transition-colors">
                                                        <div className="h-10 w-10 rounded-full bg-purple-500/5 flex items-center justify-center shrink-0 border border-purple-500/10">
                                                            <CreditCard className="h-4 w-4 text-purple-500/50" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold tracking-tight text-purple-600/80">{res.paymentMode}</span>
                                                            <span className="text-[10px] uppercase text-muted-foreground font-bold">Payment Mode</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {res.consumerNumber && (
                                                    <div className="flex items-center gap-4 text-foreground/70 group-hover:text-foreground transition-colors">
                                                        <div className="h-10 w-10 rounded-full bg-amber-500/5 flex items-center justify-center shrink-0 border border-amber-500/10">
                                                            <SearchIcon className="h-4 w-4 text-amber-500/50" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-mono font-bold tracking-tight text-amber-600/80">{res.consumerNumber}</span>
                                                            <span className="text-[10px] uppercase text-muted-foreground font-bold">Consumer No</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-center">
                                            <div className="h-14 w-14 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-black transition-all duration-300 ring-1 ring-primary/10 group-hover:ring-amber-500 shadow-sm">
                                                <ArrowRight className="h-7 w-7 transition-transform group-hover:translate-x-1" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Unified Detail Dialog */}
            <Dialog open={openDetails} onOpenChange={setOpenDetails}>
                <DialogContent className="p-0 max-w-5xl min-w-[65vw] max-h-[95vh] overflow-y-auto rounded-3xl border-none shadow-2xl bg-card">
                    {selectedBooking && <UnifiedDetailView result={selectedBooking} />}
                </DialogContent>
            </Dialog>
        </div>
    );
}
