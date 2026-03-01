import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Booking, BookingForm, RoomType, Room, DateStatus } from "@/types/room-booking.type";
import { BookingFormComponent } from "./BookingForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { AffiliatedClub } from "@/types/affiliated-club.type";

interface EditBookingDialogProps {
  editBooking: Booking | null;
  editForm: BookingForm;
  onEditFormChange: (field: keyof BookingForm, value: any) => void;
  roomTypes: RoomType[];
  editAvailableRooms: Room[];
  isLoadingRoomTypes: boolean;
  dateStatuses: DateStatus[];
  onUpdate: () => void;
  onClose: () => void;
  isUpdating: boolean;
  selectedRoomIds?: string[];
  onRoomSelection?: (roomId: string, isEdit: boolean) => void;
  isAffiliated?: boolean;
  affClubId?: string;
  setAffClubId?: (id: string) => void;
  affMembershipNo?: string;
  setAffMembershipNo?: (no: string) => void;
  clubs?: AffiliatedClub[];
}

export const EditBookingDialog = React.memo(({
  editBooking,
  editForm,
  onEditFormChange,
  roomTypes,
  editAvailableRooms,
  isLoadingRoomTypes,
  dateStatuses,
  onUpdate,
  onClose,
  isUpdating,
  selectedRoomIds,
  onRoomSelection,
  isAffiliated = false,
  affClubId,
  setAffClubId,
  affMembershipNo,
  setAffMembershipNo,
  clubs = [],
}: EditBookingDialogProps) => {
  return (
    <Dialog open={!!editBooking} onOpenChange={onClose}>
      <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Room Booking</DialogTitle>
        </DialogHeader>

        {/* Member summary / Affiliated Edit Section */}
        {editBooking && (
          <div className={cn(
            "p-4 rounded-xl border shadow-sm mb-4",
            isAffiliated ? "bg-blue-50 border-blue-100" :
              editBooking.member?.Status?.toLowerCase() === "active" ? "bg-green-50 border-green-100" :
                editBooking.member?.Status?.toLowerCase() === "inactive" ? "bg-red-50 border-red-100" :
                  editBooking.member?.Status?.toLowerCase() === "suspended" ? "bg-amber-50 border-amber-100" :
                    "bg-slate-50 border-slate-100"
          )}>
            {isAffiliated ? (
              <div className="space-y-4">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Affiliated Club Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-aff-club">Affiliated Club *</Label>
                    <Select value={affClubId} onValueChange={setAffClubId}>
                      <SelectTrigger id="edit-aff-club" className="bg-white"><SelectValue placeholder="Select club..." /></SelectTrigger>
                      <SelectContent>
                        {clubs.filter(c => c.isActive).map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-aff-memno">Affiliated Membership No. *</Label>
                    <Input
                      id="edit-aff-memno"
                      placeholder="e.g. AFC-12345"
                      value={affMembershipNo}
                      onChange={(e) => setAffMembershipNo?.(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm flex items-center">
                    <User className={cn(
                      "h-4 w-4 mr-2",
                      editBooking.member?.Status?.toLowerCase() === "active" ? "text-green-600" :
                        editBooking.member?.Status?.toLowerCase() === "inactive" ? "text-red-600" :
                          editBooking.member?.Status?.toLowerCase() === "suspended" ? "text-amber-600" :
                            "text-slate-600"
                    )} />
                    {editBooking.member?.Name || editBooking.memberName}
                    <Badge
                      variant="outline"
                      className={cn(
                        "ml-2 text-[10px] h-4 px-1.5 uppercase font-bold",
                        editBooking.member?.Status?.toLowerCase() === "active" ? "bg-green-100 text-green-700 border-green-200" :
                          editBooking.member?.Status?.toLowerCase() === "inactive" ? "bg-red-100 text-red-700 border-red-200" :
                            editBooking.member?.Status?.toLowerCase() === "suspended" ? "bg-amber-100 text-amber-700 border-amber-200" :
                              "bg-slate-100 text-slate-700 border-slate-200"
                      )}
                    >
                      {editBooking.member?.Status || "Unknown"}
                    </Badge>
                  </div>
                  <div className={cn(
                    "text-xs mt-1",
                    editBooking.member?.Status?.toLowerCase() === "active" ? "text-green-600" :
                      editBooking.member?.Status?.toLowerCase() === "inactive" ? "text-red-600" :
                        editBooking.member?.Status?.toLowerCase() === "suspended" ? "text-amber-600" :
                          "text-slate-600"
                  )}>
                    {editBooking.Membership_No && `Membership: #${editBooking.Membership_No}`}
                    {editBooking.member && editBooking.member.Balance !== undefined && (
                      <div className="mt-1 space-y-1">
                        <Badge
                          variant={editBooking.member.Balance >= 0 ? "outline" : "destructive"}
                          className="bg-blue-100 text-blue-800"
                        >
                          Account Balance: PKR {editBooking.member.Balance.toLocaleString()}
                        </Badge>
                        <div className="text-xs">
                          <span className="text-green-700">
                            DR: PKR {editBooking.member.drAmount?.toLocaleString() || "0"}
                          </span>
                          {" • "}
                          <span className="text-red-700">
                            CR: PKR {editBooking.member.crAmount?.toLocaleString() || "0"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  Current Booking
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Main edit form: reuse BookingFormComponent so UI matches create form */}
        <BookingFormComponent
          form={editForm}
          onChange={onEditFormChange}
          roomTypes={roomTypes}
          availableRooms={editAvailableRooms}
          isLoadingRoomTypes={isLoadingRoomTypes}
          memberSearch=""
          onMemberSearchChange={() => { }}
          showMemberResults={false}
          searchResults={[]}
          isSearching={false}
          selectedMember={editBooking?.member || null}
          onSelectMember={() => { }}
          onClearMember={() => { }}
          onSearchFocus={() => { }}
          dateStatuses={dateStatuses}
          isEdit={true}
          selectedRoomIds={selectedRoomIds}
          onRoomSelection={onRoomSelection ? (id) => onRoomSelection(id, true) : undefined}
          isAffiliated={isAffiliated}
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onUpdate} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Updating...
              </>
            ) : (
              "Update Booking"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

EditBookingDialog.displayName = "EditBookingDialog";
