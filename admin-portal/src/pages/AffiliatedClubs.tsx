import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { Plus, Edit, Trash2, Eye, Check, X, Calendar as CalendarIcon, TrendingUp, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAffiliatedClubs,
  getAffiliatedClubRequests,
  createAffiliatedClub,
  updateAffiliatedClub,
  deleteAffiliatedClub,
  updateAffiliatedClubRequestStatus,
  getAffiliatedClubStats,
} from "../../config/apis";
import type { AffiliatedClub, CreateAffiliatedClubDto, AffiliatedClubRequest } from "@/types/affiliated-club.type";
import { useToast } from "@/hooks/use-toast";

export default function AffiliatedClubs() {
  const [activeTab, setActiveTab] = useState("clubs");
  const [clubDialog, setClubDialog] = useState(false);
  const [editingClub, setEditingClub] = useState<AffiliatedClub | null>(null);
  const [clubForm, setClubForm] = useState<CreateAffiliatedClubDto>({
    name: "",
    location: "",
    contactNo: "",
    email: "",
    description: "",
    isActive: true,
  });
  const [viewRequest, setViewRequest] = useState<AffiliatedClubRequest | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: clubs = [], isLoading: isLoadingClubs } = useQuery<AffiliatedClub[]>({
    queryKey: ["affiliatedClubs"],
    queryFn: getAffiliatedClubs,
    retry: 1
  });

  const { data: requests = [], isLoading: isLoadingRequests } = useQuery<AffiliatedClubRequest[]>({
    queryKey: ["affiliatedClubRequests"],
    queryFn: () => getAffiliatedClubRequests(),
    retry: 1
  });

  const { data: stats = [], isLoading: isLoadingStats } = useQuery({
    queryKey: ["affiliatedClubStats", dateRange.from, dateRange.to],
    queryFn: () => getAffiliatedClubStats(dateRange.from.toISOString(), dateRange.to.toISOString()),
    retry: 1
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createAffiliatedClub,
    onSuccess: () => {
      toast({ title: "Club created successfully" });
      queryClient.invalidateQueries({ queryKey: ["affiliatedClubs"] });
      setClubDialog(false);
      resetClubForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create club",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAffiliatedClub,
    onSuccess: () => {
      toast({ title: "Club updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["affiliatedClubs"] });
      setClubDialog(false);
      resetClubForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update club",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAffiliatedClub,
    onSuccess: () => {
      toast({ title: "Club deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["affiliatedClubs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete club",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const updateRequestStatusMutation = useMutation({
    mutationFn: updateAffiliatedClubRequestStatus,
    onSuccess: () => {
      toast({ title: "Request status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["affiliatedClubRequests"] });
      setViewRequest(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update request status",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  /* New Handlers */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: "Image must be under 5MB.",
          variant: "destructive",
        });
        e.target.value = ""; // Reset input
        return;
      }
      setClubForm({ ...clubForm, file });
    }
  };

  const handleRemoveImage = () => {
    setClubForm({ ...clubForm, image: "", file: undefined });
  };

  // Handlers
  const handleCreateClub = () => {
    const formData = new FormData();
    formData.append("name", clubForm.name);
    if (clubForm.location) formData.append("location", clubForm.location);
    if (clubForm.contactNo) formData.append("contactNo", clubForm.contactNo);
    if (clubForm.email) formData.append("email", clubForm.email);
    if (clubForm.description) formData.append("description", clubForm.description);
    // If active is boolean, convert to strong if needed or let formData handle it (usually string 'true'/'false')
    formData.append("isActive", String(clubForm.isActive ?? true));

    if (clubForm.file) {
      formData.append("image", clubForm.file);
    }

    createMutation.mutate(formData);
  };

  const handleUpdateClub = () => {
    if (!editingClub) return;

    const formData = new FormData();
    formData.append("id", String(editingClub.id));
    formData.append("name", clubForm.name);
    if (clubForm.location) formData.append("location", clubForm.location);
    if (clubForm.contactNo) formData.append("contactNo", clubForm.contactNo);
    if (clubForm.email) formData.append("email", clubForm.email);
    if (clubForm.description) formData.append("description", clubForm.description);
    formData.append("isActive", String(clubForm.isActive));

    if (clubForm.file) {
      formData.append("image", clubForm.file);
    } else if (clubForm.image) {
      // If we have an existing image URL and no new file, we might want to send it 
      // OR the backend logic "Keep existing if not replaced" handles it if we send nothing.
      // Based on backend logic: `let imageUrl = payload.image; if(file)...`
      // So we should send the existing image URL back if we want to keep it? 
      // OR if the backend treats missing payload.image as "remove"?
      // Backend: `let imageUrl = payload.image; // Keep existing if not replaced` -> Wait, if payload.image is undefined, imageUrl is undefined.
      // Actually typically `payload` structure from `Body` decorator might have it.
      // Backend code:
      // `let imageUrl = payload.image;`
      // `if (file) { ... }`
      // `data: { ... image: imageUrl }`
      // If I send nothing for image, `imageUrl` is undefined. Prisma update with `image: undefined` usually means "do nothing/no change" 
      // BUT `payload` is DTO. 
      // If I append `image` with current URL, it's fine.
      formData.append("image", clubForm.image);
    } else {
      // If explicit removal (image is empty string), we should send empty string or null?
      // Backend `image` field is optional string.
      // If I send "", it might save as "". 
      // Let's assume sending empty string clears it.
      formData.append("image", "");
    }

    updateMutation.mutate(formData);
  };

  const handleDeleteClub = (id: number) => {
    if (!confirm("Are you sure you want to delete this club?")) return;
    deleteMutation.mutate(id);
  };

  const handleApproveRequest = (id: number) => {
    updateRequestStatusMutation.mutate({ id, status: "APPROVED" });
  };

  const handleRejectRequest = (id: number) => {
    updateRequestStatusMutation.mutate({ id, status: "REJECTED" });
  };

  const openCreateDialog = () => {
    resetClubForm();
    setEditingClub(null);
    setClubDialog(true);
  };

  const openEditDialog = (club: AffiliatedClub) => {
    setEditingClub(club);
    setClubForm({
      name: club.name,
      location: club.location || "",
      contactNo: club.contactNo || "",
      email: club.email || "",
      description: club.description || "",
      image: club.image || "",
      isActive: club.isActive,
    });
    setClubDialog(true);
  };

  const resetClubForm = () => {
    setClubForm({
      name: "",
      location: "",
      contactNo: "",
      email: "",
      description: "",
      isActive: true,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      case "PENDING":
        return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoadingClubs) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Affiliated Clubs</h2>
          <p className="text-muted-foreground">Manage affiliated clubs and member requests</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="clubs">Affiliated Clubs</TabsTrigger>
          <TabsTrigger value="requests">Club Requests</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="clubs" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Club
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clubs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No clubs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    clubs.map((club) => (
                      <TableRow key={club.id}>
                        <TableCell>
                          <Avatar>
                            <AvatarImage src={club.image} alt={club.name} />
                            <AvatarFallback>{club.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{club.name}</TableCell>
                        <TableCell>{club.location || "N/A"}</TableCell>
                        <TableCell>{club.contactNo || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={club.isActive ? "default" : "secondary"}>
                            {club.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(club)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClub(club.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-xl font-semibold">Visit Statistics</h3>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[280px] justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
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
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range: any) =>
                      range?.from && range?.to && setDateRange(range)
                    }
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 shadow-sm border-none bg-secondary/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Request Frequency by Club</h4>
                </div>
                <div className="h-[350px] w-full">
                  {isLoadingStats ? (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-muted-foreground">Loading stats...</p>
                    </div>
                  ) : stats.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-2">
                      <BarChart3 className="h-10 w-10 opacity-20" />
                      <p>No request data for this period</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                        <XAxis
                          dataKey="clubName"
                          axisLine={false}
                          tickLine={false}
                          angle={-45}
                          textAnchor="end"
                          interval={0}
                          height={80}
                          fontSize={12}
                        />
                        <YAxis axisLine={false} tickLine={false} fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar
                          dataKey="requestCount"
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                          barSize={40}
                        >
                          {stats.map((entry: any, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={`hsl(var(--primary) / ${Math.max(0.4, 1 - index * 0.1)})`}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Top Requested Clubs</h4>
                </div>
                <div className="space-y-4">
                  {stats.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No data available
                    </p>
                  ) : (
                    stats.slice(0, 5).map((item: any, index: number) => (
                      <div key={item.clubName} className="flex items-center justify-between p-3 rounded-md bg-secondary/30">
                        <div className="flex items-center gap-3">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium">{item.clubName}</span>
                        </div>
                        <Badge variant="secondary" className="font-bold">
                          {item.requestCount}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Club Create/Edit Dialog */}
      <Dialog open={clubDialog} onOpenChange={setClubDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingClub ? "Edit Club" : "Add New Club"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Club Name *</Label>
                <Input
                  id="name"
                  value={clubForm.name}
                  onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })}
                  placeholder="Enter club name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={clubForm.location}
                  onChange={(e) => setClubForm({ ...clubForm, location: e.target.value })}
                  placeholder="Enter location"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactNo">Contact Number</Label>
                <Input
                  id="contactNo"
                  value={clubForm.contactNo}
                  onChange={(e) => setClubForm({ ...clubForm, contactNo: e.target.value })}
                  placeholder="Enter contact number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={clubForm.email}
                  onChange={(e) => setClubForm({ ...clubForm, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={clubForm.description}
                onChange={(e) => setClubForm({ ...clubForm, description: e.target.value })}
                placeholder="Enter description"
                rows={3}
              />
              <div className="grid gap-2">
                <Label htmlFor="image">Club Image (Max 5MB)</Label>
                <div className="flex items-center gap-4">
                  {(clubForm.image || clubForm.file) && (
                    <div className="relative">
                      <img
                        src={
                          clubForm.file
                            ? URL.createObjectURL(clubForm.file)
                            : clubForm.image
                        }
                        alt="Preview"
                        className="h-20 w-20 object-cover rounded-md border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <Switch
                  id="isActive"
                  checked={clubForm.isActive ?? true}
                  onCheckedChange={(checked) => setClubForm({ ...clubForm, isActive: checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
          </div>

          {editingClub && (
            <div className="mt-4 pt-4 border-t bg-gray-50/50 -mx-6 px-6 py-4">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                Audit Tracking
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] text-gray-400 uppercase">Created By</Label>
                  <div className="text-xs font-medium">{editingClub.createdBy || "System"}</div>
                </div>
                <div>
                  <Label className="text-[10px] text-gray-400 uppercase">Created At</Label>
                  <div className="text-xs text-gray-600">
                    {editingClub.createdAt ? new Date(editingClub.createdAt).toLocaleString("en-PK") : "N/A"}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-gray-400 uppercase">Last Updated By</Label>
                  <div className="text-xs font-medium">{editingClub.updatedBy || editingClub.createdBy || "System"}</div>
                </div>
                <div>
                  <Label className="text-[10px] text-gray-400 uppercase">Last Updated</Label>
                  <div className="text-xs text-gray-600">
                    {editingClub.updatedAt ? new Date(editingClub.updatedAt).toLocaleString("en-PK") : "N/A"}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setClubDialog(false)} disabled={createMutation.isPending || updateMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={editingClub ? handleUpdateClub : handleCreateClub} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {editingClub ? "Updating..." : "Creating..."}
                </>
              ) : (
                editingClub ? "Update" : "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request View Dialog */}
      <Dialog open={!!viewRequest} onOpenChange={() => setViewRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Club Name</p>
                <p className="font-medium">{viewRequest?.affiliatedClub?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Membership No</p>
                <p className="font-medium">{viewRequest?.membershipNo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Requested Date</p>
                <p className="font-medium">
                  {viewRequest && new Date(viewRequest.requestedDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {viewRequest?.purpose && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Purpose</p>
                <p className="font-medium">{viewRequest.purpose}</p>
              </div>
            )}

            {viewRequest && (
              <div className="mt-4 pt-4 border-t bg-gray-50/50 -mx-6 px-6 py-4">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                  Audit Tracking
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[10px] text-gray-400 uppercase">Created By</Label>
                    <div className="text-xs font-medium">{viewRequest.createdBy || "System"}</div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-400 uppercase">Created At</Label>
                    <div className="text-xs text-gray-600">
                      {viewRequest.createdAt ? new Date(viewRequest.createdAt).toLocaleString("en-PK") : "N/A"}
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-400 uppercase">Last Updated By</Label>
                    <div className="text-xs font-medium">{viewRequest.updatedBy || viewRequest.createdBy || "System"}</div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-400 uppercase">Last Updated</Label>
                    <div className="text-xs text-gray-600">
                      {viewRequest.updatedAt ? new Date(viewRequest.updatedAt).toLocaleString("en-PK") : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {viewRequest?.status === "PENDING" && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewRequest(null)}>
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (viewRequest) handleRejectRequest(viewRequest.id);
                }}
                disabled={updateRequestStatusMutation.isPending}
              >
                {updateRequestStatusMutation.isPending ? "Processing..." : "Reject"}
              </Button>
              <Button
                onClick={() => {
                  if (viewRequest) handleApproveRequest(viewRequest.id);
                }}
                disabled={updateRequestStatusMutation.isPending}
              >
                {updateRequestStatusMutation.isPending ? "Processing..." : "Approve"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div >
  );
}
