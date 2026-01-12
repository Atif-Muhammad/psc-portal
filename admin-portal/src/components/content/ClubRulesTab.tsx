import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Plus, Eye } from "lucide-react";
import { getRules, createRule, updateRule, deleteRule } from "../../../config/apis";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ClubRulesTabProps {
    type: string;
    title: string;
}

export default function ClubRulesTab({ type, title }: ClubRulesTabProps) {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editRule, setEditRule] = useState<any>(null);
    const [deleteData, setDeleteData] = useState<any>(null);
    const [previewRule, setPreviewRule] = useState<any>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: rules = [], isLoading } = useQuery({
        queryKey: ["content_rules", type],
        queryFn: () => getRules(type),
    });

    // ... (mutations remain same)

    const createMutation = useMutation({
        mutationFn: (data: any) => createRule({ ...data, type }),
        onSuccess: () => {
            toast({ title: "Success", description: "Rule created successfully" });
            queryClient.invalidateQueries({ queryKey: ["content_rules", type] });
            setIsAddOpen(false);
        },
        onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: any; data: any }) => updateRule({ id, data: { ...data, type } }),
        onSuccess: () => {
            toast({ title: "Success", description: "Rule updated successfully" });
            queryClient.invalidateQueries({ queryKey: ["content_rules", type] });
            setEditRule(null);
        },
        onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteRule,
        onSuccess: () => {
            toast({ title: "Success", description: "Rule deleted successfully" });
            queryClient.invalidateQueries({ queryKey: ["content_rules", type] });
            setDeleteData(null);
        },
        onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });

    const handleSubmit = (data: any, isEdit = false) => {
        if (isEdit) {
            updateMutation.mutate({ id: editRule.id, data });
        } else {
            createMutation.mutate(data);
        }
    }

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    if (isLoading) return <p>Loading rules...</p>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-semibold">{title}</h3>
                <Button onClick={() => setIsAddOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Rule Section
                </Button>
            </div>

            <div className="space-y-4">
                {rules.map((rule: any) => (
                    <Card key={rule.id}>
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="ql-snow max-h-[200px] overflow-hidden relative group">
                                    <div className="ql-editor prose max-w-none p-0" dangerouslySetInnerHTML={{ __html: rule.content }} />
                                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                                </div>
                                <div className="flex gap-2 shrink-0 ml-4">
                                    <Button variant="ghost" size="icon" onClick={() => setPreviewRule(rule)} title="Preview">
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setEditRule(rule)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => setDeleteData(rule)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={!!previewRule} onOpenChange={() => setPreviewRule(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Preview Rule</DialogTitle>
                    </DialogHeader>
                    <div className="ql-snow py-4">
                        <div className="ql-editor prose max-w-none p-0" dangerouslySetInnerHTML={{ __html: previewRule?.content }} />
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setPreviewRule(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Add Rule Section</DialogTitle></DialogHeader>
                    <RuleForm onSubmit={(data: any) => handleSubmit(data)} onCancel={() => setIsAddOpen(false)} isSubmitting={isSubmitting} />
                </DialogContent>
            </Dialog>

            <Dialog open={!!editRule} onOpenChange={() => setEditRule(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Edit Rule Section</DialogTitle></DialogHeader>
                    {editRule && <RuleForm initialData={editRule} onSubmit={(data: any) => handleSubmit(data, true)} onCancel={() => setEditRule(null)} isSubmitting={isSubmitting} />}
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteData} onOpenChange={() => setDeleteData(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Delete Rule</DialogTitle></DialogHeader>
                    <p>Are you sure you want to delete this rule section?</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteData(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteData.id)} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function RuleForm({ initialData, onSubmit, onCancel, isSubmitting }: any) {
    const [content, setContent] = useState(initialData?.content || "");

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            [{ 'align': [] }],
            ['link', 'image'],
            [{ 'color': [] }, { 'background': [] }],
            ['clean']
        ],
    }

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'bullet', 'indent', 'align',
        'link', 'image', 'color', 'background'
    ]

    return (
        <div className="space-y-4 py-4">
            <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                className="h-64 mb-12"
                modules={modules}
                formats={formats}
            />

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
                    onSubmit({ content, isActive: true })
                }} disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save"}
                </Button>
            </DialogFooter>
        </div>
    )
}
