import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileArchive, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { uploadMonthlyBills } from "../../config/apis";
import { toast } from "sonner";

interface BillUploadProps {
    onUploadSuccess?: () => void;
}

export default function BillUpload({ onUploadSuccess }: BillUploadProps) {
    const [month, setMonth] = useState<string>(new Date().getMonth().toString());
    const [year, setYear] = useState<string>(new Date().getFullYear().toString());
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);

    const months = [
        { value: "0", label: "January" },
        { value: "1", label: "February" },
        { value: "2", label: "March" },
        { value: "3", label: "April" },
        { value: "4", label: "May" },
        { value: "5", label: "June" },
        { value: "6", label: "July" },
        { value: "7", label: "August" },
        { value: "8", label: "September" },
        { value: "9", label: "October" },
        { value: "10", label: "November" },
        { value: "11", label: "December" },
    ];

    const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.name.endsWith(".zip")) {
                setFile(selectedFile);
                setSuccess(false);
            } else {
                toast.error("Please upload a ZIP file");
                e.target.value = "";
            }
        }
    };

    const handleUpload = async () => {
        if (!file || !month || !year) {
            toast.error("Please select all fields and a file");
            return;
        }

        try {
            setUploading(true);
            // Backend expects numeric month or name? 
            // Requirement said "automatically create a new folder based on selected Month and Year".
            // Let's use the label for readability in folders if preferred, or value.
            // Usually numeric is better for sorting. Let's use 01, 02 format.
            const monthLabel = (parseInt(month) + 1).toString().padStart(2, "0");

            await uploadMonthlyBills(monthLabel, year, file);

            setSuccess(true);
            setFile(null);
            toast.success("Bills uploaded and extracted successfully");
            if (onUploadSuccess) onUploadSuccess();
        } catch (error: any) {
            console.error("Upload failed:", error);
            toast.error(error.message || "Failed to upload bills");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground ml-1">Year</label>
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="bg-background border-primary/20 hover:border-primary transition-colors h-11">
                            <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((y) => (
                                <SelectItem key={y} value={y}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground ml-1">Month</label>
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="bg-background border-primary/20 hover:border-primary transition-colors h-11">
                            <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((m) => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-4">
                <div
                    className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 group flex flex-col items-center justify-center gap-3 cursor-pointer ${file
                        ? "border-primary bg-primary/5 shadow-inner"
                        : "border-muted-foreground/10 hover:border-primary/30 hover:bg-primary/5"
                        }`}
                    onClick={() => document.getElementById("bill-zip-input")?.click()}
                >
                    <input
                        id="bill-zip-input"
                        type="file"
                        accept=".zip"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    <div className={`p-4 rounded-full transition-transform duration-300 ${file ? "bg-primary text-primary-foreground scale-110" : "bg-muted text-muted-foreground group-hover:scale-110"}`}>
                        <FileArchive className="h-8 w-8" />
                    </div>

                    <div className="text-center">
                        <p className="font-semibold text-lg">{file ? file.name : "Select ZIP File"}</p>
                        <p className="text-sm text-muted-foreground mt-1 px-4">
                            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Zip file containing member ID bills (e.g. 3002_bill.pdf)"}
                        </p>
                    </div>

                    {file && (
                        <div className="absolute top-4 right-4 animate-in zoom-in duration-300">
                            <CheckCircle2 className="h-6 w-6 text-primary fill-primary/20" />
                        </div>
                    )}
                </div>

                {success && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-400 animate-in slide-in-from-top-2">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <p className="text-sm font-medium">Bills for {months.find(m => m.value === month)?.label} {year} processed successfully.</p>
                    </div>
                )}
            </div>

            <Button
                className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
                onClick={handleUpload}
                disabled={!file || uploading}
            >
                {uploading ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Uploading & Extracting...
                    </>
                ) : (
                    <>
                        <Upload className="mr-2 h-5 w-5" />
                        Upload Monthly Bills
                    </>
                )}
            </Button>

            <div className="flex items-center gap-2 justify-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold pb-2">
                <AlertCircle className="h-3 w-3" />
                Note: Existing matching folders will be overwritten
            </div>
        </div>
    );
}
