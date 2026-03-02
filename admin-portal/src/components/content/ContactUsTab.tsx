
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Plus, Phone, Mail, Clock, X } from "lucide-react";
import { getContactUs, upsertContactUs, deleteContactUs } from "../../../config/apis";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ContactUsTab() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<any>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [contactToDelete, setContactToDelete] = useState<any>(null);

    const { data: contacts = [], isLoading } = useQuery({
        queryKey: ["content_contact_us"],
        queryFn: getContactUs
    });

    const upsertMutation = useMutation({
        mutationFn: upsertContactUs,
        onSuccess: () => {
            toast({ title: "Success", description: `Contact info ${editingContact ? "updated" : "created"}` });
            queryClient.invalidateQueries({ queryKey: ["content_contact_us"] });
            setIsDialogOpen(false);
            setEditingContact(null);
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
    });

    const deleteMutation = useMutation({
        mutationFn: deleteContactUs,
        onSuccess: () => {
            toast({ title: "Success", description: "Contact info deleted" });
            queryClient.invalidateQueries({ queryKey: ["content_contact_us"] });
            setIsDeleteConfirmOpen(false);
            setContactToDelete(null);
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
    });

    const handleOpenDialog = (contact: any = null) => {
        setEditingContact(contact);
        setIsDialogOpen(true);
    };

    const handleDeleteClick = (contact: any) => {
        setContactToDelete(contact);
        setIsDeleteConfirmOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Contact Settings</h3>
                <Button onClick={() => handleOpenDialog()} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Contact Category
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead>Phone Numbers</TableHead>
                                <TableHead>Timing</TableHead>
                                <TableHead>Email (Optional)</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                                </TableRow>
                            ) : contacts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No contact info found. Add one to get started.</TableCell>
                                </TableRow>
                            ) : (
                                contacts.map((contact: any) => (
                                    <TableRow key={contact.id}>
                                        <TableCell className="font-medium">{contact.category}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {(contact.phoneNumbers || []).map((phone: string, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <Phone className="h-3 w-3 text-muted-foreground" />
                                                        <span className="text-sm">{phone}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-sm">{contact.time}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {contact.email ? (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-sm">{contact.email}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs italic">N/A</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(contact)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(contact)}>
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

            {/* Upsert Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>{editingContact ? "Edit" : "Add"} Contact Category</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6 pt-0">
                        <ContactForm
                            initialData={editingContact}
                            isSubmitting={upsertMutation.isPending}
                            onSubmit={(data: any) => upsertMutation.mutate({ ...data, id: editingContact?.id })}
                            onCancel={() => setIsDialogOpen(false)}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Contact Category</DialogTitle>
                    </DialogHeader>
                    <p>Are you sure you want to delete contact info for <strong>{contactToDelete?.category}</strong>? This action cannot be undone.</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} disabled={deleteMutation.isPending}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteMutation.mutate(contactToDelete.id)} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ContactForm({ initialData, onSubmit, onCancel, isSubmitting }: any) {
    const [form, setForm] = useState({
        category: initialData?.category || "",
        phoneNumbers: initialData?.phoneNumbers || [""],
        time: initialData?.time || "",
        email: initialData?.email || ""
    });

    const handleAddPhone = () => {
        setForm({ ...form, phoneNumbers: [...form.phoneNumbers, ""] });
    };

    const handleRemovePhone = (index: number) => {
        if (form.phoneNumbers.length === 1) return;
        const newPhones = form.phoneNumbers.filter((_: any, i: number) => i !== index);
        setForm({ ...form, phoneNumbers: newPhones });
    };

    const handlePhoneChange = (index: number, value: string) => {
        const newPhones = [...form.phoneNumbers];
        newPhones[index] = value;
        setForm({ ...form, phoneNumbers: newPhones });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validPhones = form.phoneNumbers.filter((p: string) => p.trim() !== "");
        if (!form.category || validPhones.length === 0 || !form.time) return;
        onSubmit({ ...form, phoneNumbers: validPhones });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="category">Category / Department</Label>
                <Input
                    id="category"
                    placeholder="e.g., Info Desk, Room Reservation"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label>Phone Numbers</Label>
                <div className="space-y-2">
                    {form.phoneNumbers.map((phone: string, index: number) => (
                        <div key={index} className="flex gap-2">
                            <Input
                                placeholder="e.g., +92-XXX-XXXXXXX"
                                value={phone}
                                onChange={(e) => handlePhoneChange(index, e.target.value)}
                                required={index === 0}
                            />
                            {form.phoneNumbers.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemovePhone(index)}
                                    className="text-destructive shrink-0"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPhone}
                    className="mt-2 w-full gap-2 border-dashed"
                >
                    <Plus className="h-3 w-3" /> Add Another Number
                </Button>
            </div>

            <div className="space-y-2">
                <Label htmlFor="time">Timing</Label>
                <Input
                    id="time"
                    placeholder="e.g., 09:00 AM - 05:00 PM"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="e.g., info@peshawarsclub.pk"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
            </div>

            <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting || !form.category || form.phoneNumbers.every((p: string) => !p) || !form.time}>
                    {isSubmitting ? "Saving..." : "Save"}
                </Button>
            </DialogFooter>
        </form>
    );
}
