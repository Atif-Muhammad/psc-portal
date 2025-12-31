import { useQuery } from '@tanstack/react-query'
import { memberBookings, searchMembers } from '../../config/apis'
import React, { useState } from 'react'
import { MemberSearchComponent } from "@/components/MemberSearch";
import { Member } from "@/types/room-booking.type";
import * as Select from '@radix-ui/react-select'
import { ChevronDownIcon, SearchIcon, CalendarIcon, DollarSignIcon, UserIcon, CreditCardIcon } from 'lucide-react'
import { DetailedCardSkeleton } from "@/components/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";


// Define types for our bookings
type RoomBooking = {
  id: number
  Membership_No: string
  roomId: number
  checkIn: string
  checkOut: string
  totalPrice: string
  paymentStatus: string
  pricingType: string
  paidAmount: string
  pendingAmount: string
  numberOfAdults: number
  numberOfChildren: number
  guestName: string
  guestContact: string
  paidBy: string
  refundAmount: string
  refundReturned: boolean
  isCancelled: boolean
  remarks?: string
  details?: { adults: number; children: number }
}

type HallBooking = {
  id: number
  memberId: number
  hallId: number
  bookingDate: string
  totalPrice: string
  paymentStatus: string
  pricingType: string
  paidAmount: string
  pendingAmount: string
  eventType: string
  numberOfGuests: number
  bookingTime: string
  guestName: string
  guestContact: string
  paidBy: string
  refundAmount: string
  isCancelled: boolean
  remarks?: string
  details?: { guests: number }
  bookingDetails?: any
}

type LawnBooking = {
  id: number
  memberId: number
  lawnId: number
  bookingDate: string
  bookingTime: string
  guestsCount: number
  totalPrice: string
  paymentStatus: string
  pricingType: string
  paidAmount: string
  pendingAmount: string
  guestName: string
  guestContact: string
  paidBy: string
  refundAmount: string
  isCancelled: boolean
  remarks?: string
  details?: { guests: number }
  eventType?: string
}

type PhotoshootBooking = {
  id: number
  memberId: number
  photoshootId: number
  bookingDate: string
  startTime: string
  endTime: string
  totalPrice: string
  paymentStatus: string
  pricingType: string
  paidAmount: string
  pendingAmount: string
  guestName: string
  guestContact: string
  paidBy: string
  refundAmount: string
  bookingDetails?: { date: string; timeSlot: string }[]
  isCancelled: boolean
  remarks?: string
}

type BookingType = RoomBooking | HallBooking | LawnBooking | PhotoshootBooking

// Utility function to format dates
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Utility function to format currency
const formatCurrency = (amount: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(amount))
}

// Status badge component (unchanged)
const StatusBadge = ({ status, isCancelled }: { status: string, isCancelled?: boolean }) => {
  if (isCancelled) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-red-100 text-red-800 border-red-200">
        Cancelled
      </span>
    )
  }

  const getStatusColor = () => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800 border-green-200'
      case 'HALF_PAID': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'UNPAID': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor()}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

// Payment info component (unchanged)
const PaymentInfo = ({ paid, pending, total }: { paid: string; pending: string; total: string }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">Paid:</span>
      <span className="font-medium text-green-600">{formatCurrency(paid)}</span>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">Pending:</span>
      <span className="font-medium text-red-600">{formatCurrency(pending)}</span>
    </div>
    <div className="flex items-center justify-between pt-1 border-t">
      <span className="text-sm font-medium text-gray-700">Total:</span>
      <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
    </div>
  </div>
)

// Booking card component
const BookingCard = ({ booking, type }: { booking: BookingType; type: string }) => {
  const isRoomBooking = 'roomId' in booking
  const isHallBooking = 'hallId' in booking
  const isLawnBooking = 'lawnId' in booking
  const isPhotoshootBooking = 'photoshootId' in booking

  return (
    <div className={`bg-white rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow ${booking.isCancelled ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Booking #{booking.id}
            </h3>
            <StatusBadge status={booking.paymentStatus} isCancelled={booking.isCancelled} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            {isRoomBooking && (
              <>
                <span>Room #{booking.roomId}</span>
                <span>•</span>
                <span>{booking.details?.adults || booking.numberOfAdults} Adult(s), {booking.details?.children || booking.numberOfChildren} Child(ren)</span>
              </>
            )}
            {isHallBooking && (
              <>
                <span>Hall #{booking.hallId}</span>
                <span>•</span>
                <span className="capitalize">{booking.eventType}</span>
                <span>•</span>
                <span>{booking.details?.guests || booking.numberOfGuests} Guests</span>
              </>
            )}
            {isLawnBooking && (
              <>
                <span>Lawn #{booking.lawnId}</span>
                <span>•</span>
                <span>{booking.details?.guests || booking.guestsCount} Guests</span>
                <span>•</span>
                <span className="capitalize">{booking.bookingTime}</span>
                {booking.eventType && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{booking.eventType}</span>
                  </>
                )}
              </>
            )}
            {isPhotoshootBooking && (
              <>
                <span>Photoshoot #{booking.photoshootId}</span>
                <span>•</span>
                <span>{formatDate(booking.startTime)} - {formatDate(booking.endTime)}</span>
              </>
            )}
          </div>
          {booking.remarks && (
            <div className="mt-2 text-sm text-gray-500 italic">
              Note: {booking.remarks}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(booking.totalPrice)}
          </div>
          <div className="text-sm text-gray-500">
            {booking.pricingType === 'member' ? 'Member Rate' : 'Guest Rate'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 font-medium border-b pb-1 mb-2">
            <CalendarIcon className="w-4 h-4" />
            <span>Dates & Times</span>
          </div>
          {isRoomBooking ? (
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Check-in:</span>
                <span className="font-medium">{formatDate(booking.checkIn)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Check-out:</span>
                <span className="font-medium">{formatDate(booking.checkOut)}</span>
              </div>
            </div>
          ) : isPhotoshootBooking ? (
            <div className="text-sm space-y-2 max-h-32 overflow-y-auto pr-1">
              {(booking.bookingDetails && booking.bookingDetails.length > 0) ? (
                booking.bookingDetails.map((detail, idx) => {
                  const start = new Date(detail.timeSlot);
                  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
                  return (
                    <div key={idx} className="flex flex-col text-xs border-b border-gray-100 last:border-0 pb-1">
                      <span className="font-medium">{formatDate(detail.date)}</span>
                      <span className="text-gray-500">
                        {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div>
                  {formatDate(booking.bookingDate)}
                  <div className="text-xs text-muted-foreground">
                    {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm">
              <span className="font-medium">{formatDate(booking.bookingDate)}</span>
              {(booking as any).bookingTime && <div className="text-xs text-gray-500 capitalize">{(booking as any).bookingTime}</div>}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 font-medium border-b pb-1 mb-2">
            <DollarSignIcon className="w-4 h-4" />
            <span>Payment Breakdown</span>
          </div>
          <PaymentInfo
            paid={booking.paidAmount}
            pending={booking.pendingAmount}
            total={booking.totalPrice}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 font-medium border-b pb-1 mb-2">
            <UserIcon className="w-4 h-4" />
            <span>Billing Info</span>
          </div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Paid By:</span>
              <span className="font-medium">{booking.paidBy || 'Member'}</span>
            </div>
            {booking.guestName && (
              <div className="flex flex-col mt-1">
                <span className="text-gray-500 text-xs">Guest Details:</span>
                <span className="font-medium">{booking.guestName}</span>
                {booking.guestContact && <span className="text-xs text-gray-400">{booking.guestContact}</span>}
              </div>
            )}
            {booking.refundAmount && Number(booking.refundAmount) > 0 && (
              <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                <span className="text-red-500 font-medium flex justify-between">
                  <span>Refund:</span>
                  <span>{formatCurrency(booking.refundAmount)}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 px-6 py-3 rounded-b-lg">
        <div className="text-xs text-gray-500">
          Booking ID: {booking.id} • Created: {formatDate((booking as any).createdAt)}
        </div>
        {/* Actions can be added here */}
      </div>
    </div>
  )
}

// Empty state component (unchanged)
const EmptyState = ({ type }: { type: string }) => (
  <div className="text-center py-12">
    <div className="mx-auto w-24 h-24 text-gray-300 mb-4">
      <CalendarIcon className="w-full h-full" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">No {type.toLowerCase()} bookings found</h3>
    <p className="text-gray-500 max-w-md mx-auto">
      No bookings have been made for this membership number in the {type.toLowerCase()} category.
    </p>
  </div>
)

function Bookings() {
  const [bookingType, setBookingType] = useState<"Room" | "Hall" | "Lawn" | "Photoshoot">("Room")
  const [membershipNo, setMembershipNo] = useState<string | null>(null)

  // Member Search State
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberResults, setShowMemberResults] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Member Search Query
  const {
    data: searchResults = [],
    isLoading: isSearching,
  } = useQuery<Member[]>({
    queryKey: ["memberSearch", memberSearch],
    queryFn: async () => (await searchMembers(memberSearch)) as Member[],
    enabled: memberSearch.length > 0,
  });

  const handleMemberSearch = (val: string) => {
    setMemberSearch(val);
    if (val.length > 0) setShowMemberResults(true);
    else setShowMemberResults(false);
  };

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    setMemberSearch(member.Name);
    setMembershipNo(member.Membership_No);
    setShowMemberResults(false);
  };

  const handleClearMember = () => {
    setSelectedMember(null);
    setMemberSearch("");
    setMembershipNo(null);
  };

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["bookings-member", bookingType, membershipNo],
    queryFn: () => memberBookings(bookingType, membershipNo),
    enabled: false
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    refetch()
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Management</h1>
          <p className="text-gray-600">View and manage all bookings across different categories</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
          <form onSubmit={handleSearch} className="space-y-4 md:space-y-0 md:flex md:items-end md:space-x-4">
            <div className="flex-1">
              <MemberSearchComponent
                searchTerm={memberSearch}
                onSearchChange={handleMemberSearch}
                showResults={showMemberResults}
                searchResults={searchResults}
                isSearching={isSearching}
                selectedMember={selectedMember}
                onSelectMember={handleSelectMember}
                onClearMember={handleClearMember}
                onFocus={() => { if (memberSearch) setShowMemberResults(true) }}
              />
            </div>

            <div className="flex-1">
              <label htmlFor="bookingType" className="block text-sm font-medium text-gray-700 mb-2">
                Booking Type
              </label>
              <Select.Root value={bookingType} onValueChange={(value: any) => setBookingType(value)}>
                <Select.Trigger className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
                  <Select.Value />
                  <Select.Icon>
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
                    <Select.Viewport>
                      <Select.Item value="Room" className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer outline-none">
                        <Select.ItemText>Room Bookings</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="Hall" className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer outline-none">
                        <Select.ItemText>Hall Bookings</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="Lawn" className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer outline-none">
                        <Select.ItemText>Lawn Bookings</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="Photoshoot" className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer outline-none">
                        <Select.ItemText>Photoshoot Bookings</Select.ItemText>
                      </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            <div>
              <button
                type="submit"
                className="w-full md:w-auto px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Search Bookings
              </button>
            </div>
          </form>
        </div>

        {/* Stats Summary */}
        {data.length > 0 && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">Total Bookings</div>
              <div className="text-2xl font-bold text-gray-900">{data.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-green-200 bg-green-50">
              <div className="text-sm text-green-700">Paid</div>
              <div className="text-2xl font-bold text-green-700">
                {data.filter((b: any) => b.paymentStatus === "PAID" && !b.isCancelled).length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-yellow-200 bg-yellow-50">
              <div className="text-sm text-yellow-700">Half Paid</div>
              <div className="text-2xl font-bold text-yellow-700">
                {data.filter((b: any) => b.paymentStatus === "HALF_PAID" && !b.isCancelled).length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-red-200 bg-red-50">
              <div className="text-sm text-red-700">Unpaid</div>
              <div className="text-2xl font-bold text-red-700">
                {data.filter((b: any) => (b.paymentStatus === "UNPAID" || b.paymentStatus === "TO_BILL") && !b.isCancelled).length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">Cancelled</div>
              <div className="text-2xl font-bold text-gray-600">
                {data.filter((b: any) => b.isCancelled).length}
              </div>
            </div>
          </div>
        )}

        {/* Bookings List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-8 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
              {[...Array(3)].map((_, i) => (
                <DetailedCardSkeleton key={i} />
              ))}
            </div>
          ) : data.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {bookingType} Bookings ({data.length})
                </h2>
                <div className="text-sm text-gray-500">
                  For Membership #{membershipNo}
                </div>
              </div>
              {data.map((booking: any) => (
                <BookingCard key={booking.id} booking={booking} type={bookingType} />
              ))}
            </>
          ) : (
            <EmptyState type={bookingType} />
          )}
        </div>
      </div>
    </div>
  )
}

export default Bookings;