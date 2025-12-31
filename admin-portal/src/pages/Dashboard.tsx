import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, UserCheck, UserX, Ban, Calendar as CalendarIcon, DollarSign, Activity, TrendingUp, ArrowRight, ChevronLeft, ChevronRight, Trophy, Megaphone, Globe, Building2, Ticket, PieChart as PieChartIcon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { DashboardSkeleton } from "@/components/Skeletons";
import { getDashboardStats } from "../../config/apis";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

import { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, addMonths, addWeeks, subWeeks } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";

interface DashboardStats {
  totalMembers: number;
  memberStats: Record<string, number>;
  upcomingBookings: {
    room: number;
    hall: number;
    lawn: number;
    photoshoot: number;
  };
  occupancy: {
    room: number;
    hall: number;
    lawn: number;
    photoshoot: number;
  };
  sports: {
    total: number;
    breakdown: Array<{ name: string; count: number }>;
  };
  clubs: {
    total: number;
    pendingRequests: number;
  };
  content: {
    events: number;
    announcements: number;
    ads: number;
  };
  vouchers: Array<{ type: string; count: number }>;
  paymentsUnpaid: number;
  paymentsHalfPaid: number;
  paymentsPaid: number;
  monthlyTrend: Array<{
    month: string;
    bookings: number;
    revenue: number;
  }>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [filterMode, setFilterMode] = useState<"weekly" | "monthly" | "overall">("monthly");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const dateRange = useMemo(() => {
    if (filterMode === "overall") return { from: undefined, to: undefined };
    if (filterMode === "weekly") {
      return {
        from: startOfWeek(selectedDate, { weekStartsOn: 1 }).toISOString(),
        to: endOfWeek(selectedDate, { weekStartsOn: 1 }).toISOString(),
      };
    }
    return {
      from: startOfMonth(selectedDate).toISOString(),
      to: endOfMonth(selectedDate).toISOString(),
    };
  }, [filterMode, selectedDate]);

  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["dashboardStats", dateRange.from, dateRange.to, filterMode],
    queryFn: () => getDashboardStats(dateRange.from, dateRange.to),
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-destructive">
        <p className="text-lg font-medium">Error loading dashboard stats</p>
      </div>
    );
  }

  // --- Chart Data Preparation ---

  const memberChartData = stats?.memberStats ? Object.entries(stats.memberStats).map(([status, count]) => {
    let color = "hsl(var(--muted))";
    if (status === "CLEAR") color = "hsl(var(--success))";
    if (status === "CANCELLED") color = "hsl(var(--warning))";
    if (status === "TERMINATED") color = "hsl(var(--destructive))";
    if (status === "SUSPENDED") color = "hsl(var(--warning))";
    if (status === "DEFAULTER") color = "hsl(var(--destructive))";
    return { name: status, value: count, color };
  }) : [];

  const bookingsChartData = [
    { name: "Rooms", bookings: stats?.upcomingBookings.room || 0, fill: "#8884d8" },
    { name: "Halls", bookings: stats?.upcomingBookings.hall || 0, fill: "#82ca9d" },
    { name: "Lawns", bookings: stats?.upcomingBookings.lawn || 0, fill: "#ffc658" },
    { name: "Photoshoot", bookings: stats?.upcomingBookings.photoshoot || 0, fill: "#ff8042" },
  ];

  const paymentChartData = [
    { name: "Unpaid", value: stats?.paymentsUnpaid || 0, color: "hsl(var(--destructive))" },
    { name: "Half Paid", value: stats?.paymentsHalfPaid || 0, color: "hsl(var(--warning))" },
    { name: "Paid", value: stats?.paymentsPaid || 0, color: "hsl(var(--success))" },
  ];

  const sportsChartData = stats?.sports.breakdown.map((s, i) => ({
    name: s.name,
    value: s.count,
    color: `hsl(var(--primary) / ${1 - (i * 0.15)})`
  })) || [];

  const voucherChartData = stats?.vouchers.map(v => ({
    name: v.type.replace(/_/g, " "),
    count: v.count
  })) || [];

  // Helper to safely navigate to members with filter
  const handleMemberClick = (filter: string) => {
    navigate("/members", { state: { filter } });
  };

  const adjustDate = (direction: number) => {
    if (filterMode === "weekly") {
      setSelectedDate(prev => direction > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    } else if (filterMode === "monthly") {
      setSelectedDate(prev => direction > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
    }
  };

  const getFilterLabel = () => {
    if (filterMode === "overall") return "Showing Overall Stats";
    if (filterMode === "weekly") {
      return `Week of ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "MMM d")} - ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "MMM d, yyyy")}`;
    }
    return format(selectedDate, "MMMM yyyy");
  };

  return (
    <div className="space-y-8 animate-fade-in p-2 sm:p-4 pb-20">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">
            Dashboard Overview
          </h2>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's what's happening at the club.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterMode} onValueChange={(v: any) => setFilterMode(v)}>
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="Filter Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="overall">Overall</SelectItem>
            </SelectContent>
          </Select>

          {filterMode !== "overall" && (
            <div className="flex items-center gap-2 bg-background border rounded-lg p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => adjustDate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="px-3 py-1 text-sm font-medium min-w-[150px] text-center hover:bg-secondary/50">
                    {getFilterLabel()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => d && setSelectedDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => adjustDate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {filterMode === "overall" && (
            <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-lg text-sm text-muted-foreground font-medium">
              <CalendarIcon className="h-4 w-4" />
              All-time Stats (Last 6 Months Trend)
            </div>
          )}
        </div>
      </div>

      {/* 1. Member Status Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="relative overflow-hidden bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Members</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMembers}</div>
            <p className="text-xs text-muted-foreground mt-1">Active in community</p>
          </CardContent>
        </Card>

        {/* Dynamic Status Cards */}
        {stats?.memberStats && Object.entries(stats.memberStats).slice(0, 4).map(([status, count]) => {
          const isDestructive = ["TERMINATED", "DEFAULTER", "DIED"].includes(status);
          const isWarning = ["SUSPENDED", "CANCELLED", "ABSENT"].includes(status);
          const isSuccess = ["CLEAR", "HONORARY"].includes(status);

          let Icon = Users;
          if (status === "CLEAR") Icon = UserCheck;
          if (status === "TERMINATED" || status === "DEFAULTER") Icon = Ban;
          if (status === "SUSPENDED" || status === "CANCELLED") Icon = UserX;

          return (
            <Card key={status} onClick={() => handleMemberClick(status)} className="group cursor-pointer hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground capitalize">{status.toLowerCase()}</CardTitle>
                <Icon className={cn("h-4 w-4", isSuccess && "text-green-500", isWarning && "text-yellow-500", isDestructive && "text-red-500")} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 2. Main Analytics & Facility Performance */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Revenue Trend (Large) */}
        <Card className="lg:col-span-2 shadow-sm border-none bg-secondary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Financial & Booking Momentum
            </CardTitle>
            <CardDescription>Visualizing revenue and booking volume together</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.monthlyTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" hide />
                <YAxis yAxisId="right" orientation="right" hide />
                <Tooltip />
                <Legend />
                <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--success))" fill="url(#colorRevenue)" name="Revenue" />
                <Area yAxisId="left" type="monotone" dataKey="bookings" stroke="hsl(var(--primary))" fill="transparent" strokeWidth={3} name="Bookings" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Facility Utilization (Occupancy) */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Facility Utilization
            </CardTitle>
            <CardDescription>Occupancy rate for current period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {stats?.occupancy && Object.entries(stats.occupancy).map(([facility, rate]) => {
              if (facility === 'photoshoot') return null;
              return (
                <div key={facility} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize font-medium">{facility}s</span>
                    <span className="text-muted-foreground">{Math.round(rate)}%</span>
                  </div>
                  <Progress value={rate} className="h-2" />
                </div>
              );
            })}
            <div className="pt-4 border-t text-xs text-muted-foreground italic text-center">
              Derived from total active facilities vs. booked days
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Community & Sports Visuals */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

        {/* Sports Breakdown */}
        {/* <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Sports Subscriptions
              </CardTitle>
              <CardDescription>Total active: {stats?.sports.total}</CardDescription>
            </div>
            <PieChartIcon className="h-5 w-5 text-muted-foreground opacity-50" />
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sportsChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {sportsChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />)}
                </Pie>
                <Tooltip />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card> */}

        {/* Content Management Summary */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Content Hub
            </CardTitle>
            <CardDescription>Active visibility items</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between p-3 rounded-md bg-secondary/30">
              <span className="text-sm">Upcoming Events</span>
              <span className="font-bold text-primary">{stats?.content.events}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-secondary/30">
              <span className="text-sm">Announcements</span>
              <span className="font-bold text-primary">{stats?.content.announcements}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-secondary/30">
              <span className="text-sm">Promotional Ads</span>
              <span className="font-bold text-primary">{stats?.content.ads}</span>
            </div>
          </CardContent>
        </Card>

        {/* Affiliated Clubs Summary */}
        <Card className="lg:col-span-1 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Affiliated Network
            </CardTitle>
            <CardDescription>External club connectivity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4 bg-primary/5 rounded-lg">
              <div className="text-3xl font-bold text-primary">{stats?.clubs.total}</div>
              <div className="text-xs text-muted-foreground">Partner Clubs</div>
            </div>
            {/* <div className="flex items-center gap-3 p-3 text-sm border rounded-md">
              <Building2 className="h-5 w-5 text-orange-500" />
              <div>
                <div className="font-medium">{stats?.clubs.pendingRequests} Pending</div>
                <div className="text-xs text-muted-foreground">Certification requests</div>
              </div>
            </div> */}
          </CardContent>
        </Card>
      </div>

      {/* 4. Financial & Voucher Analysis */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Financial Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Payment Liquidity
            </CardTitle>
            <CardDescription>Status breakdown for selected range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                {paymentChartData.map(item => (
                  <div key={item.name} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={paymentChartData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value" startAngle={90} endAngle={450}>
                    {paymentChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Voucher Type Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              Transaction Mix
            </CardTitle>
            <CardDescription>Distribution of voucher types issued</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={voucherChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} interval={0} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
