import { useEffect, useState } from "react";
import { format } from "date-fns";
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

    const getBadgeColor = (type: string) => {
        switch (type) {
            case "ROOM": return "bg-blue-500 hover:bg-blue-600";
            case "HALL": return "bg-purple-500 hover:bg-purple-600";
            case "LAWN": return "bg-green-500 hover:bg-green-600";
            case "PHOTOSHOOT": return "bg-pink-500 hover:bg-pink-600";
            default: return "bg-gray-500";
        }
    };

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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reservations.map((res) => (
                                    <TableRow key={`${res.type}-${res.id}`}>
                                        <TableCell>
                                            <Badge className={getBadgeColor(res.type)}>
                                                {res.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">{res.resourceName}</TableCell>
                                        <TableCell>
                                            {format(new Date(res.startTime), "PPP p")}
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(res.endTime), "PPP p")}
                                        </TableCell>
                                        <TableCell>{res.remarks || "-"}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {format(new Date(res.createdAt), "PPP")}
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
