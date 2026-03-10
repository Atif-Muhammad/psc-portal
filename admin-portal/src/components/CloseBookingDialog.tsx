import React, { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { Booking } from "@/types/room-booking.type";

interface CloseBookingDialogProps {
    booking: Booking | null;
    onClose: () => void;
    onConfirm: (
        bookingId: number,
        refundPayload?: {
            refund: boolean;
            paymentMode?: string;
            transaction_id?: string;
            bank_name?: string;
            check_number?: string;
            paid_at?: string;
        }
    ) => void;
    isClosing: boolean;
}

export const CloseBookingDialog: React.FC<CloseBookingDialogProps> = ({
    booking,
    onClose,
    onConfirm,
    isClosing,
}) => {
    const [step, setStep] = useState<"check" | "refund" | "confirm">("check");
    const [wantsRefund, setWantsRefund] = useState<boolean | null>(null);
    const [paymentMode, setPaymentMode] = useState<string>("CASH");
    const [transactionId, setTransactionId] = useState("");
    const [bankName, setBankName] = useState("");
    const [checkNumber, setCheckNumber] = useState("");
    const [paidAt, setPaidAt] = useState("");

    const pendingAmount = useMemo(
        () => (booking ? Number(booking.pendingAmount) : 0),
        [booking]
    );
    const isOverpaid = pendingAmount < 0;
    const hasOutstanding = pendingAmount > 0;
    const isZero = pendingAmount === 0;
    const refundAmount = Math.abs(pendingAmount);

    const resetState = () => {
        setStep("check");
        setWantsRefund(null);
        setPaymentMode("CASH");
        setTransactionId("");
        setBankName("");
        setCheckNumber("");
        setPaidAt("");
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            resetState();
            onClose();
        }
    };

    const handleConfirmClose = () => {
        if (!booking) return;

        if (isZero) {
            onConfirm(booking.id);
        } else if (isOverpaid && wantsRefund) {
            onConfirm(booking.id, {
                refund: true,
                paymentMode,
                transaction_id: transactionId || undefined,
                bank_name: bankName || undefined,
                check_number: checkNumber || undefined,
                paid_at: paidAt || undefined,
            });
        }
    };

    if (!booking) return null;

    return (
        <Dialog open={!!booking} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Close Booking
                    </DialogTitle>
                    <DialogDescription>
                        Closing a booking prevents any further updates.
                    </DialogDescription>
                </DialogHeader>

                {/* Step: Check / Initial */}
                {step === "check" && (
                    <div className="space-y-4 py-2">
                        <div className="rounded-lg border p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Booking ID</span>
                                <span className="font-medium">#{booking.id}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total Price</span>
                                <span className="font-medium">
                                    PKR {booking.totalPrice?.toLocaleString()}
                                </span>
                            </div>

                            {/* Extra Charges Breakdown */}
                            {booking.extraCharges && booking.extraCharges.length > 0 && (
                                <div className="ml-4 space-y-1 py-1 border-l-2 border-blue-100 pl-3">
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-muted-foreground italic">Base Rent</span>
                                        <span className="text-slate-600 font-medium">
                                            PKR {(Number(booking.totalPrice || 0) - (booking.extraCharges.reduce((sum, h) => sum + (Number(h.amount) || 0), 0))).toLocaleString()}
                                        </span>
                                    </div>
                                    {booking.extraCharges.map((head, idx) => (
                                        <div key={idx} className="flex justify-between text-[11px]">
                                            <span className="text-muted-foreground italic">{head.head}</span>
                                            <span className="text-slate-600 font-medium font-mono">
                                                + PKR {Number(head.amount).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Paid Amount</span>
                                <span className="font-medium">
                                    PKR {booking.paidAmount?.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Pending Amount</span>
                                <span
                                    className={`font-bold ${pendingAmount < 0 ? "text-orange-600" : pendingAmount > 0 ? "text-red-600" : "text-green-600"}`}
                                >
                                    PKR {pendingAmount.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {hasOutstanding && (
                            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800">
                                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                        Cannot Close Booking
                                    </p>
                                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                        There is an outstanding balance of{" "}
                                        <strong>PKR {pendingAmount.toLocaleString()}</strong>.
                                        Please settle the balance before closing.
                                    </p>
                                </div>
                            </div>
                        )}

                        {isZero && (
                            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                        Ready to Close
                                    </p>
                                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                        All payments are settled. No further updates will be allowed
                                        after closing.
                                    </p>
                                </div>
                            </div>
                        )}

                        {isOverpaid && (
                            <div className="flex items-start gap-3 p-4 rounded-lg bg-orange-50 border border-orange-200 dark:bg-orange-950/30 dark:border-orange-800">
                                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                                        Overpayment Detected
                                    </p>
                                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                                        This booking has an overpayment of{" "}
                                        <strong>PKR {refundAmount.toLocaleString()}</strong>. Would
                                        you like to generate a refund voucher?
                                    </p>
                                    <div className="flex gap-2 mt-3">
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={() => {
                                                setWantsRefund(true);
                                                setStep("refund");
                                            }}
                                        >
                                            Yes, Generate Refund
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleOpenChange(false)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step: Refund Payment Mode */}
                {step === "refund" && (
                    <div className="space-y-4 py-2">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                Refund Amount: PKR {refundAmount.toLocaleString()}
                            </Badge>
                        </div>

                        <div className="space-y-2">
                            <Label>Payment Mode</Label>
                            <Select value={paymentMode} onValueChange={setPaymentMode}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select payment mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="ONLINE">Online Transfer</SelectItem>
                                    <SelectItem value="KUICKPAY">KuickPay</SelectItem>
                                    <SelectItem value="CHECK">Cheque</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {(paymentMode === "ONLINE" || paymentMode === "KUICKPAY") && (
                            <>
                                <div className="space-y-2">
                                    <Label>Transaction ID</Label>
                                    <Input
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value)}
                                        placeholder="Enter transaction ID"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Paid At</Label>
                                    <Input
                                        type="datetime-local"
                                        value={paidAt}
                                        onChange={(e) => setPaidAt(e.target.value)}
                                    />
                                </div>
                                {paymentMode === "ONLINE" && (
                                    <div className="space-y-2">
                                        <Label>Bank Name</Label>
                                        <Input
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value)}
                                            placeholder="Enter bank name"
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {paymentMode === "CHECK" && (
                            <>
                                <div className="space-y-2">
                                    <Label>Cheque Number</Label>
                                    <Input
                                        value={checkNumber}
                                        onChange={(e) => setCheckNumber(e.target.value)}
                                        placeholder="Enter cheque number"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Bank Name</Label>
                                    <Input
                                        value={bankName}
                                        onChange={(e) => setBankName(e.target.value)}
                                        placeholder="Enter bank name"
                                    />
                                </div>
                            </>
                        )}

                        <Button
                            className="w-full"
                            onClick={() => setStep("confirm")}
                            disabled={
                                ((paymentMode === "ONLINE" || paymentMode === "KUICKPAY") && !transactionId) ||
                                (paymentMode === "CHECK" && !checkNumber)
                            }
                        >
                            Continue to Confirmation
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => {
                                setStep("check");
                                setWantsRefund(null);
                            }}
                        >
                            Back
                        </Button>
                    </div>
                )}

                {/* Step: Confirm */}
                {step === "confirm" && isOverpaid && wantsRefund && (
                    <div className="space-y-4 py-2">
                        <div className="rounded-lg border p-4 space-y-3">
                            <p className="text-sm font-medium">Refund Summary</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="text-muted-foreground">Refund Amount</span>
                                <span className="font-medium text-right">
                                    PKR {refundAmount.toLocaleString()}
                                </span>
                                <span className="text-muted-foreground">Payment Mode</span>
                                <span className="font-medium text-right">{paymentMode}</span>
                                {transactionId && (
                                    <>
                                        <span className="text-muted-foreground">Transaction ID</span>
                                        <span className="font-medium text-right">{transactionId}</span>
                                    </>
                                )}
                                {bankName && (
                                    <>
                                        <span className="text-muted-foreground">Bank Name</span>
                                        <span className="font-medium text-right">{bankName}</span>
                                    </>
                                )}
                                {checkNumber && (
                                    <>
                                        <span className="text-muted-foreground">Cheque No</span>
                                        <span className="font-medium text-right">{checkNumber}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            A refund voucher will be generated and the booking will be closed.
                            No further updates will be allowed.
                        </p>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    {isZero && step === "check" && (
                        <Button onClick={handleConfirmClose} disabled={isClosing}>
                            {isClosing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Close
                        </Button>
                    )}
                    {step === "confirm" && isOverpaid && wantsRefund && (
                        <Button onClick={handleConfirmClose} disabled={isClosing}>
                            {isClosing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Generate Refund & Close
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
