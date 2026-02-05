import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RoomType, Room, BookingForm, DateStatus } from "@/types/room-booking.type";
import { FormInput, SpecialRequestsInput } from "./FormInputs";
import { PaymentSection } from "./PaymentSection";
import { MemberSearchComponent } from "./MemberSearch";
import { Member } from "@/types/room-booking.type";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, Info } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface BookingFormProps {
  form: BookingForm;
  onChange: (field: keyof BookingForm, value: any) => void;
  roomTypes: RoomType[];
  availableRooms: Room[];
  isLoadingRoomTypes: boolean;
  // Member search props
  memberSearch: string;
  onMemberSearchChange: (value: string) => void;
  showMemberResults: boolean;
  searchResults: Member[];
  isSearching: boolean;
  selectedMember: Member | null;
  onSelectMember: (member: Member) => void;
  onClearMember: () => void;
  onSearchFocus: () => void;
  // Date status
  dateStatuses: DateStatus[];
  isEdit?: boolean;
  // Multi-room support
  selectedRoomIds?: string[];
  onRoomSelection?: (roomId: string) => void;
}

export const BookingFormComponent = React.memo(({
  form,
  onChange,
  roomTypes,
  availableRooms,
  isLoadingRoomTypes,
  // Member search
  memberSearch,
  onMemberSearchChange,
  showMemberResults,
  searchResults,
  isSearching,
  selectedMember,
  onSelectMember,
  onClearMember,
  onSearchFocus,
  // Date status
  dateStatuses,
  isEdit = false,
  // Multi-room support
  selectedRoomIds,
  onRoomSelection,
}: BookingFormProps) => {

  const isArmedForces =
    selectedMember?.memberType === "ARMED_FORCES" ||
    ["forces", "forces-self", "forces-guest"].includes(form.pricingType);
  const isPricingForces = ["forces", "forces-self", "forces-guest"].includes(form.pricingType);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

      {/* Row 1: Member Search & Basic Config */}
      {!isEdit && (
        <MemberSearchComponent
          className="col-span-12 md:col-span-4"
          label="Member *"
          searchTerm={memberSearch}
          onSearchChange={onMemberSearchChange}
          showResults={showMemberResults}
          searchResults={searchResults}
          isSearching={isSearching}
          selectedMember={selectedMember}
          onSelectMember={onSelectMember}
          onClearMember={onClearMember}
          onFocus={onSearchFocus}
        />
      )}

      <div className={cn("col-span-12", !isEdit ? "md:col-span-4" : "md:col-span-6")}>
        <Label className="text-sm font-medium">Room Type *</Label>
        {isLoadingRoomTypes ? (
          <div className="h-10 bg-muted animate-pulse rounded-md mt-2" />
        ) : (
          <Select
            value={form.roomTypeId}
            onValueChange={(val) => {
              onChange("roomTypeId", val);
              onChange("roomId", "");
            }}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {roomTypes?.map((type: RoomType) => (
                <SelectItem key={type.id} value={type.id.toString()}>
                  {type.type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className={cn("col-span-12", !isEdit ? "md:col-span-4" : "md:col-span-6")}>
        <Label className="text-sm font-medium">Pricing Type</Label>
        <Select
          value={form.pricingType}
          onValueChange={(val) => onChange("pricingType", val)}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Select pricing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member" disabled={isArmedForces}>Member</SelectItem>
            <SelectItem value="guest">Guest</SelectItem>
            {isArmedForces ? (
              <>
                <SelectItem value="forces-self">Forces -- Self</SelectItem>
                <SelectItem value="forces-guest">Forces -- Guest</SelectItem>
              </>
            ) : (
              <SelectItem value="forces">Forces</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Row 2: Room Selection (Full Width) */}
      <div className="col-span-12">
        <Label className="text-sm font-medium">
          {selectedRoomIds ? `Select Rooms (${selectedRoomIds.length} selected) *` : "Room Number *"}
        </Label>
        {onRoomSelection && selectedRoomIds ? (
          <div className="border rounded-md p-3 bg-muted/10 mt-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-[150px] overflow-y-auto">
              {availableRooms.map((room: Room) => (
                <div key={room.id} className="flex items-center space-x-2 bg-white p-2 rounded border">
                  <Checkbox
                    id={`room-${room.id}`}
                    checked={selectedRoomIds.includes(room.id.toString())}
                    onCheckedChange={() => onRoomSelection(room.id.toString())}
                  />
                  <Label
                    htmlFor={`room-${room.id}`}
                    className="text-xs cursor-pointer font-normal truncate w-full"
                    title={room.roomNumber}
                  >
                    {room.roomNumber}
                  </Label>
                </div>
              ))}
              {availableRooms.length === 0 && (
                <div className="col-span-full text-xs text-muted-foreground italic text-center py-2">
                  {!form.roomTypeId ? "Select type first" : "No rooms available"}
                </div>
              )}
            </div>
          </div>
        ) : (
          <Select
            value={form.roomId}
            onValueChange={(val) => onChange("roomId", val)}
            disabled={!form.roomTypeId || availableRooms.length === 0}
          >
            <SelectTrigger className="mt-2">
              <SelectValue
                placeholder={
                  !form.roomTypeId
                    ? "Select type first"
                    : availableRooms.length === 0
                      ? "No rooms available"
                      : "Select room"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableRooms.map((room: Room) => (
                <SelectItem key={room.id} value={room.id.toString()}>
                  {room.roomNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Row 3: Guest / Forces Info (Conditional) */}
      {(form.pricingType === "guest" || form.pricingType === "forces" || form.pricingType === "forces-guest") && (
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-lg bg-gray-50/50">
          <div className="col-span-3">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              {(isPricingForces || form.pricingType === "forces-guest") ? "PA Reference Details" : "Guest Information"}
            </h4>
          </div>
          <div>
            <FormInput
              label={(isPricingForces || form.pricingType === "forces-guest") ? "PA Ref Name *" : "Guest Name *"}
              type="text"
              value={form.guestName}
              onChange={(val) => onChange("guestName", val)}
            />
          </div>
          <div>
            <FormInput
              label={(isPricingForces || form.pricingType === "forces-guest") ? "PA Ref Contact" : "Guest Contact"}
              type="number"
              value={form.guestContact}
              onChange={(val) => onChange("guestContact", val)}
              min="0"
            />
          </div>
          <div>
            <FormInput
              label={(isPricingForces || form.pricingType === "forces-guest") ? "PA Ref CNIC" : "Guest CNIC"}
              type="text"
              value={form.guestCNIC || ""}
              onChange={(val) => onChange("guestCNIC", val)}
              placeholder="00000-0000000-0"
            />
          </div>
          <div className="col-span-1 md:col-span-3">
            <Label className="text-sm font-medium mb-1 block">Who will Pay?</Label>
            <Select
              value={form.paidBy}
              onValueChange={(val) => onChange("paidBy", val)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Who will pay?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="GUEST">Guest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Row 4: Dates & Occupancy */}
      <div className="col-span-12 md:col-span-6">
        <Label className="text-sm font-medium">Stay Period *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal h-10 mt-2",
                !form.checkIn && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {form.checkIn ? (
                form.checkOut && form.checkOut !== form.checkIn ? (
                  <>
                    {format(new Date(form.checkIn), "LLL dd, y")} -{" "}
                    {format(new Date(form.checkOut), "LLL dd, y")}
                  </>
                ) : (
                  format(new Date(form.checkIn), "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              initialFocus
              mode="range"
              defaultMonth={form.checkIn ? new Date(form.checkIn) : new Date()}
              selected={{
                from: form.checkIn ? new Date(form.checkIn) : undefined,
                to: form.checkOut ? new Date(form.checkOut) : undefined,
              }}
              onSelect={(range: DateRange | undefined) => {
                if (range?.from) {
                  onChange("checkIn", format(range.from, "yyyy-MM-dd'T'HH:mm"));
                  onChange("checkOut", range.to ? format(range.to, "yyyy-MM-dd'T'HH:mm") : format(range.from, "yyyy-MM-dd'T'HH:mm"));
                } else {
                  onChange("checkIn", "");
                  onChange("checkOut", "");
                }
              }}
              numberOfMonths={2}
              modifiers={{
                booked: dateStatuses?.filter(ds => ds.status === "BOOKED").map(ds => ds.date) || [],
                reserved: dateStatuses?.filter(ds => ds.status === "RESERVED").map(ds => ds.date) || [],
                outOfOrder: dateStatuses?.filter(ds => ds.status === "OUT_OF_ORDER").map(ds => ds.date) || [],
              }}
              modifiersClassNames={{
                booked: "bg-blue-100 border-blue-200 text-blue-900 font-semibold rounded-none",
                reserved: "bg-amber-100 border-amber-200 text-amber-900 font-semibold rounded-none",
                outOfOrder: "bg-red-100 border-red-200 text-red-900 font-semibold rounded-none",
              }}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today;
              }}
            />
          </PopoverContent>
        </Popover>
        {form.checkIn && form.checkOut && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            Total duration: {Math.ceil((new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / (1000 * 60 * 60 * 24))} nights
          </p>
        )}
      </div>

      <div className="col-span-12 md:col-span-6 grid grid-cols-2 gap-4">
        <div>
          <FormInput
            label="Adults *"
            type="number"
            value={form.numberOfAdults}
            onChange={(val) => onChange("numberOfAdults", val)}
            min="1"
            max="6"
          />
        </div>
        <div>
          <FormInput
            label="Children"
            type="number"
            value={form.numberOfChildren}
            onChange={(val) => onChange("numberOfChildren", val)}
            min="0"
            max="6"
          />
        </div>
      </div>

      {/* Row 5: Requests & Remarks */}
      <div className="col-span-12 md:col-span-6">
        <SpecialRequestsInput
          value={form.specialRequests || ""}
          onChange={(val) => onChange("specialRequests", val)}
        />
      </div>
      {isEdit && (
        <div className="col-span-12 md:col-span-6">
          <Label className="text-sm font-medium mb-1 block">Remarks</Label>
          <textarea
            className="w-full p-2 mt-1 border rounded-md resize-none h-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            placeholder="Reason for update..."
            value={form.remarks || ""}
            onChange={(e) => onChange("remarks", e.target.value)}
          />
        </div>
      )}


      {/* Row 7: Payment */}
      <div className="col-span-12 border-t pt-4">
        <PaymentSection
          form={form}
          onChange={onChange}
          isEdit={isEdit}
          roomCount={selectedRoomIds?.length || (form.roomId ? 1 : 0)}
        />
      </div>

    </div>
  );
});

BookingFormComponent.displayName = "BookingFormComponent";