import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt } from "lucide-react";
import { BookingForm } from "@/types/room-booking.type";
import { PaidAmountInput } from "./FormInputs";
import { calculateAdvanceDetails } from "@/utils/bookingUtils";

interface PaymentSectionProps {
  form: BookingForm;
  onChange: (field: keyof BookingForm, value: any) => void;
  isEdit?: boolean;
  roomCount?: number;
}

export const PaymentSection = React.memo(({
  form,
  onChange,
  isEdit = false,
  roomCount = 0,
}: PaymentSectionProps) => {
  // Calculate accounting values in real-time
  const calculateRealTimeAccounting = () => {
    const total = form.totalPrice || 0;
    const paid = form.paidAmount || 0;
    let pending = total - paid;

    // Ensure pending amount is never negative
    if (pending < 0) pending = 0;

    return {
      total,
      paid,
      pending
    };
  };

  const accounting = calculateRealTimeAccounting();

  const handlePaidAmountChange = (value: number) => {
    console.log('Real-time paid amount change:', value);

    // Update paid amount immediately
    onChange("paidAmount", value);

    // Auto-update payment status based on amount
    if (value === accounting.total && form.paymentStatus !== "PAID") {
      onChange("paymentStatus", "PAID");
    } else if (value > 0 && value < accounting.total && form.paymentStatus !== "HALF_PAID") {
      onChange("paymentStatus", "HALF_PAID");
    } else if (value === 0 && form.paymentStatus !== "UNPAID") {
      onChange("paymentStatus", "UNPAID");
    }
  };

  return (
    <div className="md:col-span-2 border-t pt-4">
      <Label className="text-lg font-semibold">Payment Details</Label>

      {/* Advance Payment Policy Section */}
      <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <Label className="text-sm font-semibold text-purple-800 mb-2 block flex items-center gap-2">
          Advance Payment Policy ({roomCount} {roomCount === 1 ? 'Room' : 'Rooms'})
        </Label>

        {(() => {
          // Calculate base rent (Total Price - Sum of all Heads)
          const headsTotal = (form.heads || []).reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
          const roomRentOnly = Math.max(0, accounting.total - headsTotal);

          const adv = calculateAdvanceDetails(roomCount, roomRentOnly);
          const remainingAdv = adv.requiredAmount - accounting.paid;

          return (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-purple-700">Policy:</span>
                  <span className="font-bold text-purple-700">
                    {adv.percentage}% Advance
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-purple-700">Required:</span>
                  <span className="font-bold text-purple-700">
                    PKR {adv.requiredAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-purple-700">Paid:</span>
                  <span
                    className={`font-bold ${accounting.paid >= adv.requiredAmount ? "text-green-700" : "text-purple-700"}`}
                  >
                    PKR {accounting.paid.toLocaleString()}
                  </span>
                </div>
              </div>

              {remainingAdv > 0 ? (
                <div className="text-[10px] text-red-600 font-medium bg-red-50 p-1 px-2 rounded-sm inline-block">
                  Remaining Advance Needed: PKR {remainingAdv.toLocaleString()}
                </div>
              ) : (
                accounting.total > 0 && (
                  <div className="text-[10px] text-green-600 font-medium bg-green-50 p-1 px-2 rounded-sm inline-block">
                    Advance Requirement Met
                  </div>
                )
              )}
            </div>
          );
        })()}
      </div>

      <div className="mt-4">
        <Label>Total Amount</Label>
        <Input
          type="text"
          className="mt-2 font-bold text-lg"
          value={`PKR ${accounting.total.toLocaleString()}`}
          disabled
        />
      </div>

      <div className="mt-4">
        <Label>Payment Status</Label>
        <Select
          value={form.paymentStatus}
          onValueChange={(val) => onChange("paymentStatus", val)}
        >
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UNPAID">Unpaid</SelectItem>
            <SelectItem value="HALF_PAID">Half Paid</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="TO_BILL">To Bill</SelectItem>
            <SelectItem value="ADVANCE_PAYMENT">Advance Payment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Show paid amount input for all statuses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <Label>Paid Amount (PKR) *</Label>
          <PaidAmountInput
            value={form.paidAmount || 0}
            onChange={handlePaidAmountChange}
            max={accounting.total}
            disabled={form.paymentStatus === "PAID"}
          />
          {form.paymentStatus === "HALF_PAID" && (
            <div className="text-xs text-muted-foreground mt-1">
              Enter amount between 1 and {accounting.total - 1}
            </div>
          )}
        </div>
        <div>
          <Label>Pending Amount (PKR)</Label>
          <Input
            type="number"
            value={accounting.pending}
            className="mt-2 font-semibold"
            readOnly
            disabled
            style={{
              color: accounting.pending > 0 ? '#dc2626' : '#16a34a',
              fontWeight: 'bold'
            }}
          />
          <div className="text-xs text-muted-foreground mt-1">
            {accounting.pending > 0 ? 'Amount remaining' : 'Fully paid'}
          </div>
        </div>
      </div>
      {/* Payment Mode Selection */}
      {(form.paymentStatus === "PAID" || form.paymentStatus === "HALF_PAID" || form.paymentStatus === "ADVANCE_PAYMENT") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 border rounded-lg bg-gray-50">
          <div className="col-span-2">
            <Label className="font-semibold text-blue-800">Payment Medium Details</Label>
          </div>
          <div>
            <Label>Payment Mode *</Label>
            <Select
              value={form.paymentMode}
              onValueChange={(val) => onChange("paymentMode", val)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="CHECK">Cheque</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.paymentMode === "CARD" && (
            <div>
              <Label>Card Number (Last 4) *</Label>
              <Input
                className="mt-2"
                placeholder="e.g. 1234"
                value={form.card_number || ""}
                onChange={(e) => onChange("card_number", e.target.value)}
              />
            </div>
          )}

          {form.paymentMode === "CHECK" && (
            <div>
              <Label>Check Number *</Label>
              <Input
                className="mt-2"
                placeholder="Enter check number"
                value={form.check_number || ""}
                onChange={(e) => onChange("check_number", e.target.value)}
              />
            </div>
          )}

          {(form.paymentMode === "CARD" || form.paymentMode === "CHECK") && (
            <div className="col-span-2">
              <Label>Bank Name *</Label>
              <Input
                className="mt-2"
                placeholder="Enter bank name"
                value={form.bank_name || ""}
                onChange={(e) => onChange("bank_name", e.target.value)}
              />
            </div>
          )}
        </div>
      )}



      {/* Real-time Accounting Summary */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Label className="text-sm font-semibold text-blue-800 mb-2 block">
          Live Accounting Summary
        </Label>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-blue-700">Total:</span>
            <span className="font-semibold text-blue-700">
              PKR {accounting.total.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-green-700">Paid (DR):</span>
            <span className="font-semibold text-green-700">
              PKR {accounting.paid.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-red-700">Pending (CR):</span>
            <span className="font-semibold text-red-700">
              PKR {accounting.pending.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="mt-2 text-xs text-blue-600">
          Updates in real-time as you type
        </div>
      </div>

      {/* Voucher Information */}
      {(form.paymentStatus === "PAID" || form.paymentStatus === "HALF_PAID") && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <Receipt className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-800">
              {form.paymentStatus === "PAID"
                ? "Full Payment Voucher will be generated automatically"
                : "Half Payment Voucher will be generated automatically"}
            </span>
          </div>
        </div>
      )}
      {form.paymentStatus === "TO_BILL" && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center">
            <Receipt className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-800">
              Remaining amount will be added to Member's Ledger/Balance
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

PaymentSection.displayName = "PaymentSection";