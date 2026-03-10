import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Booking } from "@/types/room-booking.type";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CancelBookingDialogProps {
  cancelBooking: Booking | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isDeleting: boolean;
}

export const CancelBookingDialog = React.memo(({
  cancelBooking,
  onClose,
  onConfirm,
  isDeleting,
}: CancelBookingDialogProps) => {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason);
  };

  return (
    <Dialog open={!!cancelBooking} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Booking Cancellation</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="p-3 bg-muted/30 border rounded-lg space-y-2">
            <p className="text-sm">
              Are you sure you want to request cancellation for this booking for{" "}
              <strong className="text-primary">{cancelBooking?.memberName}</strong>?
            </p>
            <div className="pt-2 border-t space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Price:</span>
                <span className="font-semibold">PKR {Number(cancelBooking?.totalPrice || 0).toLocaleString()}</span>
              </div>
              {cancelBooking?.extraCharges && cancelBooking.extraCharges.length > 0 && (
                <div className="pl-2 border-l-2 border-primary/20 space-y-1 mt-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground italic">
                    <span>Base Rent:</span>
                    <span>PKR {(Number(cancelBooking.totalPrice || 0) - (cancelBooking.extraCharges.reduce((sum, h) => sum + (Number(h.amount) || 0), 0))).toLocaleString()}</span>
                  </div>
                  {cancelBooking.extraCharges.map((h, i) => (
                    <div key={i} className="flex justify-between text-[11px] text-muted-foreground italic">
                      <span>{h.head}:</span>
                      <span>+ PKR {Number(h.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cancellation-reason">Reason for Cancellation</Label>
            <Textarea
              id="cancellation-reason"
              placeholder="Enter reason e.g. Guest requested, accidental booking etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            No
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting || !reason.trim()}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Requesting...
              </>
            ) : (
              "Request Cancellation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

CancelBookingDialog.displayName = "CancelBookingDialog";