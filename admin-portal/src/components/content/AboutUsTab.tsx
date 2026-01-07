
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Plus } from "lucide-react";
import { getAboutUs, upsertAboutUs, getHistory, createHistory, updateHistory, deleteHistory } from "../../../config/apis";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

// Quill editor configuration
const quillModules = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['link', 'image'],
        [{ 'color': [] }, { 'background': [] }],
        ['clean']
    ],
};

const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent', 'align',
    'link', 'image', 'color', 'background'
];

export default function AboutUsTab() {
    const [clubInfo, setClubInfo] = useState("");
    const [aboutUsId, setAboutUsId] = useState<number | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isAddHistory, setIsAddHistory] = useState(false);
    const [editHistory, setEditHistory] = useState<any>(null);
    const [deleteHistoryData, setDeleteHistoryData] = useState<any>(null);

    // About Us Data
    const { data: aboutUsData } = useQuery({ queryKey: ["content_about_us"], queryFn: getAboutUs });

    useEffect(() => {
        if (aboutUsData) {
            setClubInfo(aboutUsData.clubInfo);
            setAboutUsId(aboutUsData.id);
        }
    }, [aboutUsData]);

    const upsertAboutUsMutation = useMutation({
        mutationFn: upsertAboutUs,
        onSuccess: () => toast({ title: "Success", description: "Club Info updated" }),
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
    });

    const handleSaveInfo = () => {
        if (upsertAboutUsMutation.isPending) return;
        upsertAboutUsMutation.mutate({ id: aboutUsId, clubInfo });
    }

    // History Data
    const { data: historyList = [] } = useQuery({ queryKey: ["content_history"], queryFn: getHistory });

    const createHistoryMutation = useMutation({
        mutationFn: createHistory,
        onSuccess: () => {
            toast({ title: "Success", description: "History Item created" });
            queryClient.invalidateQueries({ queryKey: ["content_history"] });
            setIsAddHistory(false);
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
    });

    const updateHistoryMutation = useMutation({
        mutationFn: updateHistory,
        onSuccess: () => {
            toast({ title: "Success", description: "History Item updated" });
            queryClient.invalidateQueries({ queryKey: ["content_history"] });
            setEditHistory(null);
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
    });

    const deleteHistoryMutation = useMutation({
        mutationFn: deleteHistory,
        onSuccess: () => {
            toast({ title: "Success", description: "History Item deleted" });
            queryClient.invalidateQueries({ queryKey: ["content_history"] });
            setDeleteHistoryData(null);
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
    });

    const handleHistorySubmit = (data: any, isEdit = false) => {
        if (isHistorySubmitting) return;
        const formData = new FormData();
        formData.append("description", data.description);

        if (data.image instanceof File) {
            formData.append("image", data.image);
        } else if (data.image) {
            formData.append("image", data.image);
        }

        if (data.removeImage) {
            formData.append("removeImage", "true");
        }

        if (isEdit) {
            updateHistoryMutation.mutate({ id: editHistory.id, data: formData });
        } else {
            createHistoryMutation.mutate(formData);
        }
    }

    const isHistorySubmitting = createHistoryMutation.isPending || updateHistoryMutation.isPending;

    return (
        <div className="space-y-8">
            {/* Club Info Section */}
            <Card>
                <CardContent className="p-6 space-y-4">
                    <h3 className="text-xl font-bold">Club Info</h3>
                    <div>
                        <Label className="mb-2 block">Description</Label>
                        <ReactQuill
                            theme="snow"
                            value={clubInfo}
                            onChange={setClubInfo}
                            className="mt-2 h-64 mb-12"
                            modules={quillModules}
                            formats={quillFormats}
                        />
                    </div>
                    <Button onClick={handleSaveInfo} disabled={upsertAboutUsMutation.isPending}>
                        {upsertAboutUsMutation.isPending ? "Saving..." : "Save Club Info"}
                    </Button>

                    {aboutUsData && (
                        <div className="mt-6 pt-4 border-t bg-gray-50/50 -mx-6 px-6 py-4">
                            <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                                Audit Tracking
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-[10px] text-gray-400 uppercase">Created By</Label>
                                    <div className="text-xs font-medium">{aboutUsData.createdBy || "System"}</div>
                                </div>
                                <div>
                                    <Label className="text-[10px] text-gray-400 uppercase">Created At</Label>
                                    <div className="text-xs text-gray-600">
                                        {aboutUsData.createdAt ? new Date(aboutUsData.createdAt).toLocaleString("en-PK") : "N/A"}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-[10px] text-gray-400 uppercase">Last Updated By</Label>
                                    <div className="text-xs font-medium">{aboutUsData.updatedBy || aboutUsData.createdBy || "System"}</div>
                                </div>
                                <div>
                                    <Label className="text-[10px] text-gray-400 uppercase">Last Updated</Label>
                                    <div className="text-xs text-gray-600">
                                        {aboutUsData.updatedAt ? new Date(aboutUsData.updatedAt).toLocaleString("en-PK") : "N/A"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* History Section */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Club History</h3>
                    <Button onClick={() => setIsAddHistory(true)} className="gap-2"><Plus className="h-4 w-4" /> Add History Item</Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {historyList.map((item: any) => (
                        <Card key={item.id} className="overflow-hidden">
                            <div className="flex flex-col md:flex-row">
                                {item.image && (
                                    <div className="w-full md:w-1/3 aspect-square bg-muted">
                                        <img src={item.image} alt="history" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="p-4 flex-1 flex flex-col justify-between">
                                    <div className="text-sm prose max-w-none" dangerouslySetInnerHTML={{ __html: item.description }} />
                                    <div className="flex justify-end gap-2 mt-2">
                                        <Button variant="ghost" size="icon" onClick={() => setEditHistory(item)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => setDeleteHistoryData(item)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* History Dialogs */}
            <Dialog open={isAddHistory} onOpenChange={setIsAddHistory}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Add History</DialogTitle></DialogHeader>
                    <HistoryForm
                        onSubmit={handleHistorySubmit}
                        onCancel={() => setIsAddHistory(false)}
                        isSubmitting={isHistorySubmitting}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={!!editHistory} onOpenChange={() => setEditHistory(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Edit History</DialogTitle></DialogHeader>
                    {editHistory && (
                        <HistoryForm
                            initialData={editHistory}
                            onSubmit={(data: any) => handleHistorySubmit(data, true)}
                            onCancel={() => setEditHistory(null)}
                            isSubmitting={isHistorySubmitting}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteHistoryData} onOpenChange={() => setDeleteHistoryData(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Delete History Item</DialogTitle></DialogHeader>
                    <p>Are you sure?</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteHistoryData(null)} disabled={deleteHistoryMutation.isPending}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteHistoryMutation.mutate(deleteHistoryData.id)} disabled={deleteHistoryMutation.isPending}>
                            {deleteHistoryMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function HistoryForm({ initialData, onSubmit, onCancel, isSubmitting }: any) {
    const [form, setForm] = useState({
        description: initialData?.description || "",
        image: initialData?.image || null, // Can be string (URL) or eventually File
        removeImage: false // Track if user wants to remove existing image
    });

    // To track specifically the new file for preview, or use form.image if it's a File
    const [preview, setPreview] = useState<string | null>(initialData?.image || null);

    const handleFileChange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
            setForm({ ...form, image: file, removeImage: false });
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleRemoveImage = () => {
        setForm({ ...form, image: null, removeImage: true });
        setPreview(null);
    };

    return (
        <div className="space-y-4 py-4">
            <div>
                <Label className="mb-2 block">Description</Label>
                <ReactQuill
                    theme="snow"
                    value={form.description}
                    onChange={(value) => setForm({ ...form, description: value })}
                    className="mt-1 h-48 mb-12"
                    modules={quillModules}
                    formats={quillFormats}
                />
            </div>
            <div>
                <Label>Image</Label>
                <Input type="file" accept="image/*" onChange={handleFileChange} className="mt-1" />
                <div className="mt-2">
                    {preview ? (
                        <div className="relative inline-block">
                            <div className="w-32 h-32 rounded border overflow-hidden">
                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                                onClick={handleRemoveImage}
                            >
                                ×
                            </Button>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground mt-1">No image selected</p>
                    )}
                </div>
            </div>

            {initialData && (
                <div className="mt-6 pt-4 border-t bg-gray-50/50 -mx-6 px-6 py-4">
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                        Audit Tracking
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-[10px] text-gray-400 uppercase">Created By</Label>
                            <div className="text-xs font-medium">{initialData.createdBy || "System"}</div>
                        </div>
                        <div>
                            <Label className="text-[10px] text-gray-400 uppercase">Created At</Label>
                            <div className="text-xs text-gray-600">
                                {initialData.createdAt ? new Date(initialData.createdAt).toLocaleString("en-PK") : "N/A"}
                            </div>
                        </div>
                        <div>
                            <Label className="text-[10px] text-gray-400 uppercase">Last Updated By</Label>
                            <div className="text-xs font-medium">{initialData.updatedBy || initialData.createdBy || "System"}</div>
                        </div>
                        <div>
                            <Label className="text-[10px] text-gray-400 uppercase">Last Updated</Label>
                            <div className="text-xs text-gray-600">
                                {initialData.updatedAt ? new Date(initialData.updatedAt).toLocaleString("en-PK") : "N/A"}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <DialogFooter>
                <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={() => {
                    if (isSubmitting) return;
                    onSubmit(form)
                }} disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save"}
                </Button>
            </DialogFooter>
        </div>
    )
}
