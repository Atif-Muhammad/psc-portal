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
          <p>
            Are you sure you want to request cancellation for this booking for{" "}
            <strong>{cancelBooking?.memberName}</strong>?
          </p>
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