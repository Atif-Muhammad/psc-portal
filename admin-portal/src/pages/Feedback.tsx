import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Clock, User, Send, Settings, Plus, Trash2 } from "lucide-react";
import {
    getFeedbacks,
    updateFeedbackStatus,
    addFeedbackRemark,
    userWho,
    getFeedbackCategories,
    createFeedbackCategory,
    deleteFeedbackCategory,
    getFeedbackSubCategories,
    createFeedbackSubCategory,
    deleteFeedbackSubCategory,
    assignFeedbackCategory,
    assignFeedbackSubCategory,
} from "../../config/apis";
import { cn } from "@/lib/utils";

export default function Feedback() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
    const [newRemark, setNewRemark] = useState("");
    const [showConfig, setShowConfig] = useState(false);
    const [newCategory, setNewCategory] = useState("");
    const [newSubCategory, setNewSubCategory] = useState("");
    const [otherSubCategoryText, setOtherSubCategoryText] = useState("");

    const { data: adminUser } = useQuery({
        queryKey: ["userWho"],
        queryFn: userWho,
    });

    const { data: feedbacks = [], isLoading } = useQuery({
        queryKey: ["feedbacks"],
        queryFn: getFeedbacks,
    });

    const { data: categories = [] } = useQuery({
        queryKey: ["feedbackCategories"],
        queryFn: getFeedbackCategories,
    });

    const { data: subCategories = [] } = useQuery({
        queryKey: ["feedbackSubCategories"],
        queryFn: getFeedbackSubCategories,
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            updateFeedbackStatus(id, status),
        onSuccess: () => {
            toast({ title: "Status updated successfully" });
            queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
        },
        onError: (error: any) => {
            toast({ title: error?.message || "Failed to update status", variant: "destructive" });
        },
    });

    const remarkMutation = useMutation({
        mutationFn: ({ id, remark }: { id: number; remark: string }) =>
            addFeedbackRemark(id, { remark, adminName: adminUser?.name || "Admin" }),
        onSuccess: () => {
            toast({ title: "Remark added successfully" });
            setNewRemark("");
            queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
            // Refresh the selected feedback to show the new remark
            const updated = feedbacks.find((f: any) => f.id === selectedFeedback?.id);
            if (updated) setSelectedFeedback(updated);
        },
        onError: (error: any) => {
            toast({ title: error?.message || "Failed to add remark", variant: "destructive" });
        },
    });

    const categoryMutation = useMutation({
        mutationFn: createFeedbackCategory,
        onSuccess: () => {
            setNewCategory("");
            queryClient.invalidateQueries({ queryKey: ["feedbackCategories"] });
            toast({ title: "Category added" });
        },
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: deleteFeedbackCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["feedbackCategories"] });
            toast({ title: "Category deleted" });
        },
    });

    const subCategoryMutation = useMutation({
        mutationFn: createFeedbackSubCategory,
        onSuccess: () => {
            setNewSubCategory("");
            queryClient.invalidateQueries({ queryKey: ["feedbackSubCategories"] });
            toast({ title: "Sub Category added" });
        },
    });

    const deleteSubCategoryMutation = useMutation({
        mutationFn: deleteFeedbackSubCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["feedbackSubCategories"] });
            toast({ title: "Sub Category deleted" });
        },
    });

    const assignCategoryMutation = useMutation({
        mutationFn: ({ id, categoryId }: { id: number; categoryId: number | null }) =>
            assignFeedbackCategory(id, categoryId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
            toast({ title: "Category assigned" });
        },
    });

    const assignSubCategoryMutation = useMutation({
        mutationFn: ({ id, subCategoryId, otherSubCategory }: { id: number; subCategoryId: number | null; otherSubCategory?: string }) =>
            assignFeedbackSubCategory(id, subCategoryId, otherSubCategory),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
            setOtherSubCategoryText("");
            toast({ title: "Sub Category assigned" });
        },
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING":
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
            case "IN_PROCESS":
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">In Process</Badge>;
            case "COMPLETED":
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const handleAddRemark = () => {
        if (!newRemark.trim()) return;
        remarkMutation.mutate({ id: selectedFeedback.id, remark: newRemark });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Member Feedback</h2>
                    <p className="text-muted-foreground">
                        Review and respond to feedback from club members
                    </p>
                </div>
                <Button variant="outline" onClick={() => setShowConfig(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configure
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Member</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8">
                                            Loading feedback...
                                        </TableCell>
                                    </TableRow>
                                ) : feedbacks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            No feedback found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    feedbacks.map((item: any) => (
                                        <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedFeedback(item)}>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(item.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{item.member?.Name}</div>
                                                <div className="text-xs text-muted-foreground">{item.memberNo}</div>
                                            </TableCell>
                                            <TableCell>
                                                {item.category && (
                                                    <Badge variant="secondary" className="mr-1">{item.category.name}</Badge>
                                                )}
                                                {item.subCategory && (
                                                    <Badge variant="outline" className="text-[10px]">{item.subCategory.name}</Badge>
                                                )}
                                                {item.otherSubCategory && (
                                                    <Badge variant="outline" className="text-[10px]">Other: {item.otherSubCategory}</Badge>
                                                )}
                                                {!item.category && !item.subCategory && !item.otherSubCategory && (
                                                    <span className="text-xs text-muted-foreground italic">Unassigned</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">{item.subject}</TableCell>
                                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">View Details</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2 border-b">
                        <div className="flex justify-between items-start">
                            <div>
                                <DialogTitle className="text-xl">{selectedFeedback?.subject}</DialogTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    From: {selectedFeedback?.member?.Name} ({selectedFeedback?.memberNo})
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Select
                                    value={selectedFeedback?.status}
                                    onValueChange={(val) => statusMutation.mutate({ id: selectedFeedback.id, status: val })}
                                >
                                    <SelectTrigger className="w-[140px] h-9">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="IN_PROCESS">In Process</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-4">
                            <div className="flex-1">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">Category</Label>
                                <Select
                                    value={selectedFeedback?.categoryId?.toString() || "none"}
                                    onValueChange={(val) => assignCategoryMutation.mutate({
                                        id: selectedFeedback.id,
                                        categoryId: val === "none" ? null : parseInt(val)
                                    })}
                                >
                                    <SelectTrigger className="h-8 mt-1">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {categories.map((c: any) => (
                                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">Sub Category</Label>
                                <Select
                                    value={
                                        selectedFeedback?.otherSubCategory ? "other" :
                                            selectedFeedback?.subCategoryId?.toString() || "none"
                                    }
                                    onValueChange={(val) => {
                                        if (val === "other") {
                                            // Just set to other, don't submit yet
                                            setOtherSubCategoryText(selectedFeedback?.otherSubCategory || "");
                                        } else {
                                            assignSubCategoryMutation.mutate({
                                                id: selectedFeedback.id,
                                                subCategoryId: val === "none" ? null : parseInt(val)
                                            });
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-8 mt-1">
                                        <SelectValue placeholder="Select Sub Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {subCategories.map((sc: any) => (
                                            <SelectItem key={sc.id} value={sc.id.toString()}>{sc.name}</SelectItem>
                                        ))}
                                        <SelectItem value="other">Other (Please Specify)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {(selectedFeedback?.otherSubCategory ||
                                    (selectedFeedback?.subCategoryId === null && otherSubCategoryText !== "") ||
                                    (!selectedFeedback?.subCategoryId && !selectedFeedback?.otherSubCategory && otherSubCategoryText === "")) ? null : null}
                            </div>
                        </div>

                        {/* Other Sub Category Input */}
                        {(selectedFeedback?.otherSubCategory ||
                            (!selectedFeedback?.subCategoryId && selectedFeedback?.otherSubCategory !== undefined)) && (
                                <div className="mt-4">
                                    <Label className="text-xs uppercase font-bold text-muted-foreground">Specify Other Sub Category</Label>
                                    <div className="flex gap-2 mt-1">
                                        <Input
                                            placeholder="Enter custom sub category..."
                                            value={otherSubCategoryText || selectedFeedback?.otherSubCategory || ""}
                                            onChange={(e) => setOtherSubCategoryText(e.target.value)}
                                        />
                                        <Button
                                            size="sm"
                                            onClick={() => assignSubCategoryMutation.mutate({
                                                id: selectedFeedback.id,
                                                subCategoryId: null,
                                                otherSubCategory: otherSubCategoryText
                                            })}
                                            disabled={!otherSubCategoryText.trim()}
                                        >
                                            Save
                                        </Button>
                                    </div>
                                </div>
                            )}
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Original Message */}
                        <div className="bg-muted/30 p-4 rounded-lg border border-muted ring-1 ring-inset ring-black/5">
                            <div className="flex items-start gap-3">
                                <div className="bg-primary/10 p-2 rounded-full mt-1">
                                    <MessageSquare className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Member Message</Label>
                                    <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
                                        {selectedFeedback?.message}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {new Date(selectedFeedback?.createdAt || "").toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Remarks Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-bold flex items-center gap-2">
                                    Admin Remarks ({selectedFeedback?.remarks?.length || 0})
                                </Label>
                            </div>

                            <div className="space-y-3">
                                {selectedFeedback?.remarks?.map((remark: any) => (
                                    <div key={remark.id} className="bg-card border rounded-lg p-3 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <User className="h-3 w-3 text-slate-500" />
                                                </div>
                                                <span className="text-xs font-bold text-slate-700">{remark.adminName}</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">
                                                {new Date(remark.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 pl-8">{remark.remark}</p>
                                    </div>
                                ))}

                                {(!selectedFeedback?.remarks || selectedFeedback.remarks.length === 0) && (
                                    <p className="text-xs text-center text-muted-foreground py-4 border-2 border-dashed rounded-lg italic">
                                        No remarks added yet.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 border-t bg-muted/20">
                        <div className="flex w-full gap-2">
                            <Textarea
                                placeholder="Add a new remark..."
                                value={newRemark}
                                onChange={(e) => setNewRemark(e.target.value)}
                                className="min-h-[60px] resize-none text-sm"
                            />
                            <Button
                                size="icon"
                                className="h-[60px] w-[60px] shrink-0"
                                onClick={handleAddRemark}
                                disabled={!newRemark.trim() || remarkMutation.isPending}
                            >
                                <Send className="h-5 w-5" />
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={showConfig} onOpenChange={setShowConfig}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Feedback Configuration</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-8 py-4">
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                Categories
                            </h3>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add Category..."
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                />
                                <Button size="icon" onClick={() => categoryMutation.mutate({ name: newCategory })} disabled={!newCategory.trim()}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                {categories.map((c: any) => (
                                    <div key={c.id} className="flex justify-between items-center p-2 rounded-md bg-muted/50 border">
                                        <span className="text-sm font-medium">{c.name}</span>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCategoryMutation.mutate(c.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {categories.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic text-center py-4">No categories added</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                Sub Categories
                            </h3>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add Sub Category..."
                                    value={newSubCategory}
                                    onChange={(e) => setNewSubCategory(e.target.value)}
                                />
                                <Button size="icon" onClick={() => subCategoryMutation.mutate({ name: newSubCategory })} disabled={!newSubCategory.trim()}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                {subCategories.map((sc: any) => (
                                    <div key={sc.id} className="flex justify-between items-center p-2 rounded-md bg-muted/50 border">
                                        <span className="text-sm font-medium">{sc.name}</span>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteSubCategoryMutation.mutate(sc.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {subCategories.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic text-center py-4">No sub categories added</p>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
