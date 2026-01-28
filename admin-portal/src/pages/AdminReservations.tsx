import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthAdmins, getAdminReservations } from "../../config/apis";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface Admin {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface Reservation {
    id: number;
    type: "ROOM" | "HALL" | "LAWN" | "PHOTOSHOOT";
    resourceName: string;
    startTime: string;
    endTime: string;
    remarks: string | null;
    createdAt: string;
}

const AdminReservations = () => {
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [selectedAdminId, setSelectedAdminId] = useState<string>("");
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAdmins();
    }, []);

    useEffect(() => {
        if (selectedAdminId) {
            fetchReservations();
        }
    }, [selectedAdminId, dateRange]);

    const fetchAdmins = async () => {
        try {
            const data = await getAuthAdmins();
            setAdmins(data);
        } catch (error) {
            console.error("Failed to fetch admins", error);
        }
    };

    const fetchReservations = async () => {
        setLoading(true);
        try {
            const params: any = { adminId: selectedAdminId };
            if (dateRange?.from) params.fromDate = dateRange.from.toISOString();
            if (dateRange?.to) params.toDate = dateRange.to.toISOString();

            const res = await getAdminReservations(params);
            setReservations(res);
        } catch (error) {
            console.error("Failed to fetch reservations", error);
        } finally {
            setLoading(false);
        }
    };

    const getBadgeStyles = (type: string) => {
        switch (type) {
            case "ROOM": return "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200";
            case "HALL": return "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200";
            case "LAWN": return "bg-green-100 text-green-700 border-green-200 hover:bg-green-200";
            case "PHOTOSHOOT": return "bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200";
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    const handleConvertToBooking = useCallback((res: any) => {
        const paths: Record<string, string> = {
            "ROOM": "/bookings/rooms",
            "HALL": "/bookings/halls",
            "LAWN": "/bookings/lawns",
            "PHOTOSHOOT": "/bookings/photoshoot"
        };

        navigate(paths[res.type], {
            state: {
                fromReservation: true,
                reservationId: res.id,
                resourceId: res.resourceId,
                roomTypeId: res.roomTypeId,
                startTime: res.startTime,
                endTime: res.endTime,
                timeSlot: res.timeSlot,
                remarks: res.remarks
            }
        });
    }, [navigate]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Admin Reservations</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-[300px]">
                        <Select
                            value={selectedAdminId}
                            onValueChange={setSelectedAdminId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Admin" />
                            </SelectTrigger>
                            <SelectContent>
                                {admins.map((admin) => (
                                    <SelectItem key={admin.id} value={String(admin.id)}>
                                        {admin.name} ({admin.role})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                        "w-[300px] justify-start text-left font-normal",
                                        !dateRange && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                                {format(dateRange.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(dateRange.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : reservations.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            {selectedAdminId
                                ? "No reservations found for selected filters."
                                : "Select an admin to view reservations."}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Resource</TableHead>
                                    <TableHead>Reserved From</TableHead>
                                    <TableHead>Reserved To</TableHead>
                                    <TableHead>Remarks</TableHead>
                                    <TableHead>Created At</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reservations.map((res: any) => (
                                    <TableRow key={`${res.type}-${res.id}`} className="hover:bg-muted/30 transition-colors">
                                        <TableCell>
                                            <Badge variant="outline" className={cn("px-2 py-0.5 font-bold uppercase text-[10px]", getBadgeStyles(res.type))}>
                                                {res.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">{res.resourceName}</TableCell>
                                        <TableCell className="text-sm font-medium">
                                            {format(new Date(res.startTime), "PPP p")}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {format(new Date(res.endTime), "PPP p")}
                                        </TableCell>
                                        <TableCell className="max-w-[150px] truncate text-muted-foreground text-xs">{res.remarks || "-"}</TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {format(new Date(res.createdAt), "PPP")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 gap-2 border border-primary/20 hover:border-primary hover:bg-primary/5 text-primary font-bold text-xs"
                                                onClick={() => handleConvertToBooking(res)}
                                            >
                                                Shift to Booking
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminReservations;
