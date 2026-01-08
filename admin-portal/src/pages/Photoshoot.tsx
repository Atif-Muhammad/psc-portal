import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, FileDown, Plus, Trash2, Loader2, Calendar as CalendarIcon, Eye, Sun, Moon, Sunset, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { exportPhotoshootReport } from "@/lib/pdfExport";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPhotoshoot as createPhotoShootApi,
  updatePhotoshoot as updatePhotoShootApi,
  deletePhotoshoot as deletePhotoshootApi,
  getPhotoshoots,
  reservePhotoshoot,
  getPhotoshootLogs
} from "../../config/apis";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/ImageUpload";

interface PhotoshootForm {
  description: string;
  memberCharges: string;
  guestCharges: string;
  images: File[];
  existingImages: string[];
}

const initialFormState: PhotoshootForm = {
  description: "",
  memberCharges: "",
  guestCharges: "",
  images: [],
  existingImages: [],
};

const getTimeSlotIcon = (slot: string) => {
  if (slot === "MORNING") return <Sun className="h-3 w-3 text-amber-500" />;
  if (slot === "EVENING") return <Sunset className="h-3 w-3 text-orange-500" />;
  return <Moon className="h-3 w-3 text-indigo-500" />;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

export default function Photoshoot() {
  const [editPhotoshoot, setEditPhotoshoot] = useState<any>(null);
  const [deletePhotoshoot, setDeletePhotoshoot] = useState<any>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [reserveDialog, setReserveDialog] = useState(false);
  const [selectedPhotoshoots, setSelectedPhotoshoots] = useState<number[]>([]);
  const [reserveDates, setReserveDates] = useState({
    from: new Date().toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("MORNING");
  const [reserveRemarks, setReserveRemarks] = useState("");

  // Detail Dialog states
  const [detailPhotoshoot, setDetailPhotoshoot] = useState<any | null>(null);
  const [detailLogs, setDetailLogs] = useState<any>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [detailDateRange, setDetailDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  });
  const [activeTab, setActiveTab] = useState("reservations");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<PhotoshootForm>(initialFormState);
  const [editForm, setEditForm] = useState<PhotoshootForm>(initialFormState);
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);

  const { data: photoshoots = [], isLoading: isLoadingPhotoshoots } = useQuery({
    queryKey: ["photoshoots"],
    queryFn: getPhotoshoots,
  });

  const fetchLogs = useCallback(async () => {
    if (!detailPhotoshoot || !detailDateRange?.from || !detailDateRange?.to) return;
    setLogLoading(true);
    try {
      const data = await getPhotoshootLogs(
        detailPhotoshoot.id,
        detailDateRange.from.toISOString(),
        detailDateRange.to.toISOString()
      );
      setDetailLogs(data);
    } catch (error) {
      toast({ title: "Failed to fetch logs", variant: "destructive" });
    } finally {
      setLogLoading(false);
    }
  }, [detailPhotoshoot, detailDateRange, toast]);

  useEffect(() => {
    if (detailPhotoshoot) fetchLogs();
  }, [detailPhotoshoot, detailDateRange, fetchLogs]);

  const createMutation = useMutation({
    mutationFn: createPhotoShootApi,
    onSuccess: () => {
      toast({ title: "Photoshoot package created successfully" });
      queryClient.invalidateQueries({ queryKey: ["photoshoots"] });
      setIsAddOpen(false);
      setForm({ ...initialFormState, images: [], existingImages: [] });
    },
    onError: (err: any) => toast({ title: "Failed to create photoshoot package", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: updatePhotoShootApi,
    onSuccess: () => {
      toast({ title: "Photoshoot package updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["photoshoots"] });
      setEditPhotoshoot(null);
      setEditForm({ ...initialFormState, images: [], existingImages: [] });
    },
    onError: (err: any) => toast({ title: "Failed to update photoshoot package", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePhotoshootApi,
    onSuccess: () => {
      toast({ title: "Photoshoot package deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["photoshoots"] });
      setDeletePhotoshoot(null);
    },
    onError: () => toast({ title: "Failed to delete photoshoot package", variant: "destructive" }),
  });

  const reserveMutation = useMutation({
    mutationFn: (data: any) => reservePhotoshoot(data.photoshootIds, data.reserve, data.timeSlot, data.reserveFrom, data.reserveTo, data.remarks),
    onSuccess: (data) => {
      toast({ title: "Success", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["photoshoots"] });
      setSelectedPhotoshoots([]);
      setReserveRemarks("");
      setReserveDialog(false);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleCreate = () => {
    if (!form.description || !form.memberCharges || !form.guestCharges) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }

    if (form.images.length > 5) {
      toast({ title: "Maximum 5 images allowed", variant: "destructive" });
      return;
    }

    const fd = new FormData();
    fd.append("description", form.description);
    fd.append("memberCharges", form.memberCharges);
    fd.append("guestCharges", form.guestCharges);
    form.images.forEach((file) => fd.append("files", file));

    createMutation.mutate(fd);
  };

  const handleUpdate = () => {
    if (!editForm.description || !editForm.memberCharges || !editForm.guestCharges) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }

    const totalImages = editForm.existingImages.length + editForm.images.length;
    if (totalImages > 5) {
      toast({ title: "Maximum 5 images allowed", variant: "destructive" });
      return;
    }

    const fd = new FormData();
    fd.append("id", editPhotoshoot.id.toString());
    fd.append("description", editForm.description);
    fd.append("memberCharges", editForm.memberCharges);
    fd.append("guestCharges", editForm.guestCharges);

    // Add existing image public IDs
    editForm.existingImages.forEach((publicId) => fd.append("existingimgs", publicId));

    // Add new images
    editForm.images.forEach((file) => fd.append("files", file));

    updateMutation.mutate(fd);
  };

  const handleDelete = () => {
    if (deletePhotoshoot) {
      deleteMutation.mutate(deletePhotoshoot.id);
    }
  };

  const handleReserve = () => {
    if (selectedPhotoshoots.length === 0) {
      toast({ title: "Please select at least one photoshoot package", variant: "destructive" });
      return;
    }

    const someAlreadyReserved = selectedPhotoshoots.some(id => {
      const pkg = photoshoots.find((p: any) => p.id === id);
      return pkg?.reservations?.some((r: any) =>
        r.reservedFrom.split("T")[0] === reserveDates.from &&
        r.reservedTo.split("T")[0] === reserveDates.to &&
        r.timeSlot === selectedTimeSlot
      );
    });

    reserveMutation.mutate({
      photoshootIds: selectedPhotoshoots,
      reserve: !someAlreadyReserved,
      timeSlot: selectedTimeSlot,
      reserveFrom: reserveDates.from,
      reserveTo: reserveDates.to,
      remarks: reserveRemarks,
    });
  };

  // Update edit form when editPhotoshoot changes
  useEffect(() => {
    if (editPhotoshoot) {
      const existingImageUrls = Array.isArray(editPhotoshoot.images)
        ? editPhotoshoot.images.map((img: any) => img.url)
        : [];
      const existingPublicIds = Array.isArray(editPhotoshoot.images)
        ? editPhotoshoot.images.map((img: any) => img.publicId)
        : [];

      setEditForm({
        description: editPhotoshoot.description || "",
        memberCharges: editPhotoshoot.memberCharges?.toString() || "",
        guestCharges: editPhotoshoot.guestCharges?.toString() || "",
        images: [],
        existingImages: existingPublicIds,
      });

      // Store URLs for preview (separate state)
      setEditImagePreviews(existingImageUrls);
    }
  }, [editPhotoshoot]);

  // Auto-select already reserved photoshoots when dates or timeslot change
  useEffect(() => {
    if (reserveDialog && photoshoots.length > 0) {
      const alreadyReserved = photoshoots
        .filter((pkg: any) => {
          return pkg.reservations?.some((r: any) =>
            r.reservedFrom.split("T")[0] === reserveDates.from &&
            r.reservedTo.split("T")[0] === reserveDates.to &&
            r.timeSlot === selectedTimeSlot
          );
        })
        .map((pkg: any) => pkg.id);

      setSelectedPhotoshoots(alreadyReserved);
    }
  }, [reserveDialog, reserveDates.from, reserveDates.to, selectedTimeSlot, photoshoots]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Manage Photoshoot</h2>
          <p className="text-muted-foreground">Configure photoshoot studio packages and pricing</p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setReserveDialog(true)}
            className="gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            Reserve Packages
          </Button>

          {/* Add Dialog */}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Package
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Photoshoot Package</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Description *</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., Studio portrait session, Outdoor fashion shoot..."
                    className="mt-2"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Member Charges (PKR) *</Label>
                  <Input
                    type="number"
                    value={form.memberCharges}
                    onChange={(e) => setForm(prev => ({ ...prev, memberCharges: e.target.value }))}
                    placeholder="5000"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Guest Charges (PKR) *</Label>
                  <Input
                    type="number"
                    value={form.guestCharges}
                    onChange={(e) => setForm(prev => ({ ...prev, guestCharges: e.target.value }))}
                    placeholder="7500"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Package Images (Max 5, Max 5MB each)</Label>
                  <div className="mt-2">
                    <ImageUpload
                      images={form.images.map(f => URL.createObjectURL(f))}
                      onChange={(files) => {
                        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
                        const oversizedFiles = files.filter((f) => f.size > MAX_FILE_SIZE);
                        if (oversizedFiles.length > 0) {
                          toast({
                            title: "File too large",
                            description: `Each image must be under 5MB. ${oversizedFiles.length} file(s) exceeded the limit.`,
                            variant: "destructive",
                          });
                          return;
                        }
                        setForm(prev => ({ ...prev, images: [...prev.images, ...files].slice(0, 5) }));
                      }}
                      onRemove={(index) => setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))}
                      maxImages={5}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    "Create Package"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Photoshoot Packages Table */}
      <Card className="">
        <CardContent className="p-0">
          {isLoadingPhotoshoots ? (
            <div className="flex justify-center items-center py-32">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            </div>
          ) : photoshoots.length === 0 ? (
            <div className="text-center py-32 text-muted-foreground text-lg">
              No photoshoot packages found. Create your first package to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Description</TableHead>
                  <TableHead>Member Charges</TableHead>
                  <TableHead>Guest Charges</TableHead>
                  <TableHead>Upcoming Reservations</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {photoshoots.map((item: any) => (
                  <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium max-w-md">
                      <div className="space-y-1">
                        <p className="font-semibold">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      PKR {Number(item.memberCharges).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-semibold">
                      PKR {Number(item.guestCharges).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {item.reservations?.filter((r: any) => new Date(r.reservedFrom).getTime() >= new Date().setUTCHours(0, 0, 0, 0))
                          .sort((a: any, b: any) => new Date(a.reservedFrom).getTime() - new Date(b.reservedFrom).getTime())
                          .slice(0, 2).map((r: any) => (
                            <div key={r.id} className="text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                              {getTimeSlotIcon(r.timeSlot)} {formatDate(r.reservedFrom)} - {formatDate(r.reservedTo)}
                            </div>
                          ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        onClick={() => setDetailPhotoshoot(item)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditPhotoshoot(item)}
                        disabled={updateMutation.isPending}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletePhotoshoot(item)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reservation Dialog */}
      <Dialog open={reserveDialog} onOpenChange={(open) => {
        setReserveDialog(open);
        if (!open) {
          setSelectedPhotoshoots([]);
          setReserveRemarks("");
        }
      }}>
        <DialogContent className="max-w-7xl">
          <DialogHeader><DialogTitle>Bulk Reservations</DialogTitle></DialogHeader>
          <div className="flex flex-col md:flex-row gap-4 p-4 bg-muted/40 rounded-lg items-end">
            <div className="flex-1">
              <Label className="text-xs font-semibold">Select Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal h-10 bg-white border-input shadow-sm mt-1",
                      !reserveDates.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {reserveDates.from ? (
                      reserveDates.to && reserveDates.to !== reserveDates.from ? (
                        <>
                          {format(new Date(reserveDates.from), "LLL dd, y")} -{" "}
                          {format(new Date(reserveDates.to), "LLL dd, y")}
                        </>
                      ) : (
                        format(new Date(reserveDates.from), "LLL dd, y")
                      )
                    ) : (
                      <span>Select dates</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={reserveDates.from ? new Date(reserveDates.from) : new Date()}
                    selected={{
                      from: reserveDates.from ? new Date(reserveDates.from) : undefined,
                      to: reserveDates.to ? new Date(reserveDates.to) : undefined,
                    }}
                    onSelect={(range) => {
                      if (range?.from) {
                        const fromStr = format(range.from, "yyyy-MM-dd");
                        const toStr = range.to ? format(range.to, "yyyy-MM-dd") : fromStr;
                        setReserveDates({ from: fromStr, to: toStr });
                      } else {
                        setReserveDates({ from: "", to: "" });
                      }
                    }}
                    numberOfMonths={2}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="w-full md:w-[300px]">
              <Label className="text-xs font-semibold">Time Slot</Label>
              <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
                <SelectTrigger className="mt-1 h-10 bg-white shadow-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MORNING">Morning (8:00 AM - 1:00 PM)</SelectItem>
                  <SelectItem value="EVENING">Evening (2:00 PM - 7:00 PM)</SelectItem>
                  <SelectItem value="NIGHT">Night (8:00 PM - 1:00 AM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs font-semibold">Reservation Remarks</Label>
              <Input
                className="mt-1 h-10 bg-white shadow-sm"
                placeholder="Optional remarks (e.g. Member name, Event type)"
                value={reserveRemarks}
                onChange={(e) => setReserveRemarks(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-[50vh] overflow-auto border rounded-md">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={selectedPhotoshoots.length === photoshoots.length && photoshoots.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPhotoshoots(photoshoots.map((p: any) => p.id));
                        } else {
                          setSelectedPhotoshoots([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Package Detail</TableHead>
                  <TableHead>Availability Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {photoshoots.map((pkg: any) => {
                  const activeReservation = pkg.reservations?.find((r: any) =>
                    r.reservedFrom.split("T")[0] === reserveDates.from &&
                    r.reservedTo.split("T")[0] === reserveDates.to &&
                    r.timeSlot === selectedTimeSlot
                  );

                  return (
                    <TableRow key={pkg.id} className={activeReservation ? "bg-blue-50/50" : ""}>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={selectedPhotoshoots.includes(pkg.id)}
                          onCheckedChange={checked => setSelectedPhotoshoots(prev => checked ? [...prev, pkg.id] : prev.filter(id => id !== pkg.id))}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{pkg.description}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Member: PKR {Number(pkg.memberCharges).toLocaleString()} | Guest: PKR {Number(pkg.guestCharges).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {activeReservation && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 w-fit">
                            Reserved by you
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReserveDialog(false)}>Cancel</Button>
            <Button onClick={handleReserve} disabled={reserveMutation.isPending}>
              {reserveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                selectedPhotoshoots.some(id => {
                  const pkg = photoshoots.find((p: any) => p.id === id);
                  return pkg?.reservations?.some((r: any) =>
                    r.reservedFrom.split("T")[0] === reserveDates.from &&
                    r.reservedTo.split("T")[0] === reserveDates.to &&
                    r.timeSlot === selectedTimeSlot
                  );
                }) ? "Un-Reserve Selected" : "Reserve Selected"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog - matching Halls.tsx design */}
      <Dialog open={!!detailPhotoshoot} onOpenChange={(open) => !open && setDetailPhotoshoot(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  {detailPhotoshoot?.description}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="font-normal border-primary/20 bg-primary/5 text-primary">
                    Photoshoot Package
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ID: {detailPhotoshoot?.id}
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
            <Card className="p-3 bg-muted/20 border border-border/50 shadow-none transition-all hover:bg-muted/30 text-left">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 rounded-md">
                  <DollarSign className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">
                    Member Price
                  </p>
                  <p className="text-sm font-bold text-slate-700">
                    Rs. {Number(detailPhotoshoot?.memberCharges || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-3 bg-muted/20 border border-border/50 shadow-none transition-all hover:bg-muted/30 text-left">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 rounded-md">
                  <DollarSign className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">
                    Guest Price
                  </p>
                  <p className="text-sm font-bold text-slate-700">
                    Rs. {Number(detailPhotoshoot?.guestCharges || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex items-center gap-4 py-2 border-y border-border/40">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              <span className="text-[11px] font-medium text-slate-500">
                Reservations: <span className="text-slate-900">{detailLogs?.reservations?.length || 0}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 border-l pl-4 border-border/40">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              <span className="text-[11px] font-medium text-slate-500">
                Bookings: <span className="text-slate-900">{detailLogs?.bookings?.length || 0}</span>
              </span>
            </div>
          </div>

          <div className="space-y-6 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                Activity Logs
                {logLoading && <div className="h-3 w-3 animate-spin rounded-full border border-slate-400 border-t-transparent" />}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Filter Logs:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal h-9",
                        !detailDateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {detailDateRange?.from ? (
                        detailDateRange.to ? (
                          <>
                            {format(detailDateRange.from, "LLL dd, y")} -{" "}
                            {format(detailDateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(detailDateRange.from, "LLL dd, y")
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
                      defaultMonth={detailDateRange?.from}
                      selected={detailDateRange}
                      onSelect={setDetailDateRange}
                      numberOfMonths={2}
                      classNames={{
                        day_today: "border-2 border-primary text-primary bg-transparent font-bold",
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-slate-100 rounded-md">
                <TabsTrigger value="reservations" className="text-[11px] rounded-sm data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border border-slate-200">
                  Reservations ({detailLogs?.reservations?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="bookings" className="text-[11px] rounded-sm data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border border-slate-200">
                  Bookings ({detailLogs?.bookings?.length || 0})
                </TabsTrigger>
              </TabsList>

              <div className="mt-4 min-h-[300px]">
                {logLoading ? (
                  <div className="flex flex-col items-center justify-center h-[300px] gap-2 text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-300"></div>
                    <p className="text-[11px] font-medium">Loading history...</p>
                  </div>
                ) : (
                  <>
                    <TabsContent value="reservations" className="mt-0 outline-none">
                      <div className="border border-slate-100 rounded-lg overflow-hidden bg-white">
                        <Table>
                          <TableHeader className="bg-slate-50/50">
                            <TableRow className="hover:bg-transparent border-slate-100">
                              <TableHead className="text-[11px] h-9 text-slate-500">Reserved From</TableHead>
                              <TableHead className="text-[11px] h-9 text-slate-500">Reserved To</TableHead>
                              <TableHead className="text-[11px] h-9 text-slate-500">Time Slot</TableHead>
                              <TableHead className="text-[11px] h-9 text-slate-500">Reserved By</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detailLogs?.reservations?.length ? (
                              detailLogs.reservations.map((res: any) => (
                                <TableRow key={res.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                                  <TableCell className="text-xs py-2 text-slate-600">
                                    {format(new Date(res.reservedFrom), "LLL dd, y")}
                                  </TableCell>
                                  <TableCell className="text-xs py-2 text-slate-600">
                                    {format(new Date(res.reservedTo), "LLL dd, y")}
                                  </TableCell>
                                  <TableCell className="text-xs py-2 text-slate-600">
                                    {res.timeSlot}
                                  </TableCell>
                                  <TableCell className="text-xs py-2">
                                    <div className="flex items-center gap-2 text-slate-600">
                                      <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500">
                                        {res.admin?.name?.substring(0, 1).toUpperCase()}
                                      </div>
                                      {res.admin?.name}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell
                                  colSpan={4}
                                  className="text-center py-10 text-slate-400"
                                >
                                  <div className="flex flex-col items-center gap-1.5">
                                    <CalendarIcon className="h-6 w-6 opacity-10" />
                                    <p className="text-[11px]">No reservations found.</p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    <TabsContent value="bookings" className="mt-0 outline-none">
                      <div className="border border-slate-100 rounded-lg overflow-hidden bg-white">
                        <Table>
                          <TableHeader className="bg-slate-50/50">
                            <TableRow className="hover:bg-transparent border-slate-100">
                              <TableHead className="text-[11px] h-9 text-slate-500">Member</TableHead>
                              <TableHead className="text-[11px] h-9 text-slate-500">Date</TableHead>
                              <TableHead className="text-[11px] h-9 text-slate-500">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detailLogs?.bookings?.length ? (
                              detailLogs.bookings.map((book: any) => (
                                <TableRow key={book.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                                  <TableCell className="py-2">
                                    <div>
                                      <p className="font-semibold text-xs text-slate-700">
                                        {book.member?.Name || "Guest"}
                                      </p>
                                      <p className="text-[10px] text-slate-400">
                                        {book.member?.Membership_No || "-"}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs py-2 text-slate-600">
                                    {format(new Date(book.bookingDate), "LLL dd, y")}
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <Badge
                                      variant="secondary"
                                      className={cn(
                                        "capitalize text-[9px] font-semibold px-2 py-0 h-4 bg-slate-100 text-slate-600 border-none shadow-none"
                                      )}
                                    >
                                      {book.paymentStatus?.toLowerCase()}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell
                                  colSpan={3}
                                  className="text-center py-10 text-slate-400"
                                >
                                  <div className="flex flex-col items-center gap-1.5">
                                    <CalendarIcon className="h-6 w-6 opacity-10" />
                                    <p className="text-[11px]">No bookings found.</p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  </>
                )}
              </div>
            </Tabs>
          </div>
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setDetailPhotoshoot(null)}>Close Details</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editPhotoshoot} onOpenChange={() => setEditPhotoshoot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Photoshoot Package</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Description *</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                className="mt-2"
                rows={3}
              />
            </div>
            <div>
              <Label>Member Charges (PKR) *</Label>
              <Input
                type="number"
                value={editForm.memberCharges}
                onChange={(e) => setEditForm(prev => ({ ...prev, memberCharges: e.target.value }))}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Guest Charges (PKR) *</Label>
              <Input
                type="number"
                value={editForm.guestCharges}
                onChange={(e) => setEditForm(prev => ({ ...prev, guestCharges: e.target.value }))}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Package Images (Max 5, Max 5MB each)</Label>
              <div className="mt-2">
                <ImageUpload
                  images={[
                    ...editImagePreviews,
                    ...editForm.images.map(f => URL.createObjectURL(f))
                  ]}
                  onChange={(files) => {
                    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
                    const oversizedFiles = files.filter((f) => f.size > MAX_FILE_SIZE);
                    if (oversizedFiles.length > 0) {
                      toast({
                        title: "File too large",
                        description: `Each image must be under 5MB. ${oversizedFiles.length} file(s) exceeded the limit.`,
                        variant: "destructive",
                      });
                      return;
                    }
                    setEditForm(prev => ({
                      ...prev,
                      images: [...prev.images, ...files].slice(0, 5 - prev.existingImages.length)
                    }));
                  }}
                  onRemove={(index) => {
                    if (index < editImagePreviews.length) {
                      // Removing existing image
                      const publicIdToRemove = editForm.existingImages[index];
                      setEditForm(prev => ({
                        ...prev,
                        existingImages: prev.existingImages.filter((_, i) => i !== index)
                      }));
                      setEditImagePreviews(prev => prev.filter((_, i) => i !== index));
                    } else {
                      // Removing new image
                      const newIndex = index - editImagePreviews.length;
                      setEditForm(prev => ({
                        ...prev,
                        images: prev.images.filter((_, i) => i !== newIndex)
                      }));
                    }
                  }}
                  maxImages={5}
                />
              </div>
            </div>
            {editPhotoshoot?.isBooked && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> This package is currently booked and cannot be modified until the booking is completed.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPhotoshoot(null)}>Cancel</Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending || editPhotoshoot?.isBooked}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update Package"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletePhotoshoot} onOpenChange={() => setDeletePhotoshoot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Photoshoot Package</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete the package "{deletePhotoshoot?.description}"?
              This action cannot be undone.
            </p>
            {deletePhotoshoot?.isBooked && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This package is currently booked and cannot be deleted.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePhotoshoot(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending || deletePhotoshoot?.isBooked}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Package"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}