import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2, X, Upload, ChevronRight, ArrowLeft } from "lucide-react";
import {
    getMessingCategories,
    createMessingCategory,
    updateMessingCategory,
    deleteMessingCategory,
    getMessingSubCategoriesByCategory,
    createMessingSubCategory,
    updateMessingSubCategory,
    deleteMessingSubCategory,
    getMessingItemsBySubCategory,
    createMessingItem,
    updateMessingItem,
    deleteMessingItem,
} from "../../config/apis";

export default function Messing() {
    const [activeTab, setActiveTab] = useState("categories");

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight">Messing Management</h2>
                <p className="text-muted-foreground">Manage messing categories, sub-categories, and menu items.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList>
                    <TabsTrigger value="categories">Categories</TabsTrigger>
                    <TabsTrigger value="menu">Menu Items</TabsTrigger>
                </TabsList>

                <TabsContent value="categories" className="mt-4">
                    <CategoriesTab />
                </TabsContent>

                <TabsContent value="menu" className="mt-4">
                    <MenuItemsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// -------------------- CATEGORIES TAB -------------------- //

function CategoriesTab() {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: categories = [], isLoading } = useQuery<any[]>({
        queryKey: ["messing-categories"],
        queryFn: async () => (await getMessingCategories()) as any[],
    });

    const deleteMutation = useMutation({
        mutationFn: deleteMessingCategory,
        onSuccess: () => {
            toast({ title: "Category deleted" });
            queryClient.invalidateQueries({ queryKey: ["messing-categories"] });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    if (isLoading) return <Loader2 className="h-8 w-8 animate-spin mx-auto" />;

    // If a category is selected, show its sub-categories
    if (selectedCategory) {
        return (
            <SubCategoriesView
                category={selectedCategory}
                onBack={() => setSelectedCategory(null)}
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={() => setIsAddOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Category
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories?.map((cat: any) => (
                    <Card key={cat.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedCategory(cat)}>
                        {cat.images?.length > 0 && (
                            <div className="aspect-video relative group">
                                <img src={cat.images[0].url} alt={cat.category} className="w-full h-full object-cover" />
                                {cat.images.length > 1 && (
                                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                                        +{cat.images.length - 1}
                                    </div>
                                )}
                            </div>
                        )}
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <CardTitle>{cat.category}</CardTitle>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" onClick={() => setEditingCategory(cat)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => {
                                        if (confirm("Delete this category?")) deleteMutation.mutate(cat.id);
                                    }}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <CardDescription>{cat._count?.subCategories || 0} sub-categories</CardDescription>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            <CategoryDialog
                open={isAddOpen || !!editingCategory}
                onOpenChange={(open: boolean) => {
                    if (!open) {
                        setIsAddOpen(false);
                        setEditingCategory(null);
                    }
                }}
                initialData={editingCategory}
            />
        </div>
    );
}

// -------------------- SUB-CATEGORIES VIEW -------------------- //

function SubCategoriesView({ category, onBack }: { category: any; onBack: () => void }) {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingSubCategory, setEditingSubCategory] = useState<any>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: subCategories = [], isLoading } = useQuery<any[]>({
        queryKey: ["messing-subcategories", category.id],
        queryFn: async () => (await getMessingSubCategoriesByCategory(category.id)) as any[],
    });

    const deleteMutation = useMutation({
        mutationFn: deleteMessingSubCategory,
        onSuccess: () => {
            toast({ title: "Sub-category deleted" });
            queryClient.invalidateQueries({ queryKey: ["messing-subcategories", category.id] });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    if (isLoading) return <Loader2 className="h-8 w-8 animate-spin mx-auto" />;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h3 className="text-xl font-semibold">{category.category}</h3>
                        <p className="text-sm text-muted-foreground">Sub-categories</p>
                    </div>
                </div>
                <Button onClick={() => setIsAddOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Sub-Category
                </Button>
            </div>

            {subCategories.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                    No sub-categories yet. Add one to get started.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subCategories.map((sub: any) => (
                        <Card key={sub.id} className="overflow-hidden">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">{sub.name}</CardTitle>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => setEditingSubCategory(sub)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => {
                                            if (confirm("Delete this sub-category?")) deleteMutation.mutate(sub.id);
                                        }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <CardDescription>{sub._count?.items || 0} items</CardDescription>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            )}

            <SubCategoryDialog
                open={isAddOpen || !!editingSubCategory}
                onOpenChange={(open: boolean) => {
                    if (!open) {
                        setIsAddOpen(false);
                        setEditingSubCategory(null);
                    }
                }}
                initialData={editingSubCategory}
                categoryId={category.id}
            />
        </div>
    );
}

// -------------------- CATEGORY DIALOG -------------------- //

function CategoryDialog({ open, onOpenChange, initialData }: any) {
    const [name, setName] = useState("");
    const [order, setOrder] = useState<number | string>(0);
    const [existingImages, setExistingImages] = useState<any[]>([]);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (initialData) {
            setName(initialData.category);
            setOrder(initialData.order || 0);
            setExistingImages(initialData.images || []);
        } else {
            setName("");
            setOrder(0);
            setExistingImages([]);
        }
        setNewFiles([]);
        setImagesToDelete([]);
    }, [initialData, open]);

    const createMutation = useMutation({
        mutationFn: createMessingCategory,
        onSuccess: () => {
            toast({ title: "Category created" });
            queryClient.invalidateQueries({ queryKey: ["messing-categories"] });
            onOpenChange(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const updateMutation = useMutation({
        mutationFn: updateMessingCategory,
        onSuccess: () => {
            toast({ title: "Category updated" });
            queryClient.invalidateQueries({ queryKey: ["messing-categories"] });
            onOpenChange(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const totalCount = existingImages.length + newFiles.length + e.target.files.length;
            if (totalCount > 5) {
                toast({ title: "Max 5 images allowed", variant: "destructive" });
                return;
            }

            const filesToAdd: File[] = [];
            for (let i = 0; i < e.target.files.length; i++) {
                const file = e.target.files[i];
                if (file.size > 5 * 1024 * 1024) {
                    toast({ title: `File ${file.name} too large (max 5MB)`, variant: "destructive" });
                    continue;
                }
                filesToAdd.push(file);
            }
            setNewFiles([...newFiles, ...filesToAdd]);
        }
    };

    const handleRemoveExisting = (publicId: string) => {
        setExistingImages(prev => prev.filter(img => img.public_id !== publicId));
        setImagesToDelete(prev => [...prev, publicId]);
    };

    const handleRemoveNew = (index: number) => {
        setNewFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
        if (!name) return toast({ title: "Name is required", variant: "destructive" });

        const formData = new FormData();
        formData.append("category", name);
        formData.append("order", String(order));

        newFiles.forEach(file => {
            formData.append("files", file);
        });

        if (initialData) {
            imagesToDelete.forEach(id => {
                formData.append("imagesToDelete", id);
            });
            updateMutation.mutate({ id: initialData.id, updates: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Edit Category" : "Add Category"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Breakfast, Lunch" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="order">Display Order</Label>
                            <Input id="order" type="number" value={order} onChange={(e) => setOrder(e.target.value)} placeholder="0" />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Images</Label>
                        <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
                            <div className="grid grid-cols-3 gap-2">
                                {existingImages.map((img: any, idx) => (
                                    <div key={img.public_id || idx} className="relative aspect-square border rounded-md overflow-hidden group bg-background">
                                        <img src={img.url} alt="existing" className="w-full h-full object-cover" />
                                        <button onClick={() => handleRemoveExisting(img.public_id)} className="absolute top-1 right-1 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}

                                {newFiles.map((file, idx) => (
                                    <div key={idx} className="relative aspect-square border rounded-md overflow-hidden group bg-background">
                                        <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                                        <button onClick={() => handleRemoveNew(idx)} className="absolute top-1 right-1 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}

                                {(existingImages.length + newFiles.length) < 5 && (
                                    <label className="border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-muted aspect-square transition-colors bg-background">
                                        <Upload className="h-6 w-6 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground mt-1">Upload</span>
                                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                                    </label>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">Max 5 images, 5MB each.</p>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button disabled={createMutation.isPending || updateMutation.isPending} onClick={handleSubmit}>
                        {initialData ? "Save Changes" : "Create Category"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// -------------------- SUB-CATEGORY DIALOG -------------------- //

function SubCategoryDialog({ open, onOpenChange, initialData, categoryId }: any) {
    const [name, setName] = useState("");
    const [order, setOrder] = useState<number | string>(0);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setOrder(initialData.order || 0);
        } else {
            setName("");
            setOrder(0);
        }
    }, [initialData, open]);

    const createMutation = useMutation({
        mutationFn: createMessingSubCategory,
        onSuccess: () => {
            toast({ title: "Sub-category created" });
            queryClient.invalidateQueries({ queryKey: ["messing-subcategories", categoryId] });
            onOpenChange(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const updateMutation = useMutation({
        mutationFn: updateMessingSubCategory,
        onSuccess: () => {
            toast({ title: "Sub-category updated" });
            queryClient.invalidateQueries({ queryKey: ["messing-subcategories", categoryId] });
            onOpenChange(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const handleSubmit = () => {
        if (!name) return toast({ title: "Name is required", variant: "destructive" });

        const payload = {
            name,
            order: Number(order),
            messingCategoryId: categoryId
        };

        if (initialData) {
            updateMutation.mutate({ id: initialData.id, updates: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Edit Sub-Category" : "Add Sub-Category"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="subcat-name">Name</Label>
                            <Input id="subcat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Eggs, Breads" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="subcat-order">Order</Label>
                            <Input id="subcat-order" type="number" value={order} onChange={(e) => setOrder(e.target.value)} placeholder="0" />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button disabled={createMutation.isPending || updateMutation.isPending} onClick={handleSubmit}>
                        {initialData ? "Save Changes" : "Create Sub-Category"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


// -------------------- MENU ITEMS TAB -------------------- //

function MenuItemsTab() {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: categories = [] } = useQuery<any[]>({
        queryKey: ["messing-categories"],
        queryFn: async () => (await getMessingCategories()) as any[],
    });

    const { data: subCategories = [] } = useQuery<any[]>({
        queryKey: ["messing-subcategories", selectedCategory],
        queryFn: async () => (await getMessingSubCategoriesByCategory(Number(selectedCategory))) as any[],
        enabled: !!selectedCategory,
    });

    const { data: items = [], isLoading } = useQuery<any[]>({
        queryKey: ["messing-items", selectedSubCategory],
        queryFn: async () => (await getMessingItemsBySubCategory(Number(selectedSubCategory))) as any[],
        enabled: !!selectedSubCategory,
    });

    const deleteMutation = useMutation({
        mutationFn: deleteMessingItem,
        onSuccess: () => {
            toast({ title: "Item deleted" });
            queryClient.invalidateQueries({ queryKey: ["messing-items", selectedSubCategory] });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    // Reset sub-category when category changes
    useEffect(() => {
        setSelectedSubCategory(null);
    }, [selectedCategory]);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex gap-3">
                    <div className="w-[200px]">
                        <Select value={selectedCategory || ""} onValueChange={setSelectedCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories?.map((cat: any) => (
                                    <SelectItem key={cat.id} value={String(cat.id)}>
                                        {cat.category}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-[200px]">
                        <Select value={selectedSubCategory || ""} onValueChange={setSelectedSubCategory} disabled={!selectedCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Sub-Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {subCategories?.map((sub: any) => (
                                    <SelectItem key={sub.id} value={String(sub.id)}>
                                        {sub.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Button disabled={!selectedSubCategory} onClick={() => setIsAddOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
            </div>

            {!selectedCategory ? (
                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                    Select a category to view sub-categories.
                </div>
            ) : !selectedSubCategory ? (
                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                    Select a sub-category to view and manage menu items.
                </div>
            ) : isLoading ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            ) : items?.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    No items in this sub-category.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {items?.map((item: any) => (
                        <Card key={item.id}>
                            <CardContent className="p-4 flex justify-between items-center">
                                <div>
                                    <h3 className="font-semibold text-lg">{item.name}</h3>
                                    <p className="text-sm text-muted-foreground">{item.description}</p>
                                    <p className="font-medium mt-1">PKR {item.price}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => setEditingItem(item)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => {
                                        if (confirm("Delete this item?")) deleteMutation.mutate(item.id);
                                    }}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <ItemDialog
                open={isAddOpen || !!editingItem}
                onOpenChange={(open: boolean) => {
                    if (!open) {
                        setIsAddOpen(false);
                        setEditingItem(null);
                    }
                }}
                initialData={editingItem}
                subCategoryId={Number(selectedSubCategory)}
            />
        </div>
    );
}

function ItemDialog({ open, onOpenChange, initialData, subCategoryId }: any) {
    const [form, setForm] = useState({
        name: initialData?.name || "",
        description: initialData?.description || "",
        price: initialData?.price || "",
        order: initialData?.order || 0,
    });

    useEffect(() => {
        if (open && initialData) {
            setForm({
                name: initialData.name,
                description: initialData.description || "",
                price: initialData.price,
                order: initialData.order || 0,
            });
        } else if (open && !initialData) {
            setForm({ name: "", description: "", price: "", order: 0 });
        }
    }, [open, initialData]);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createMessingItem,
        onSuccess: () => {
            toast({ title: "Item added" });
            queryClient.invalidateQueries({ queryKey: ["messing-items", String(subCategoryId)] });
            onOpenChange(false);
            setForm({ name: "", description: "", price: "" });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const updateMutation = useMutation({
        mutationFn: updateMessingItem,
        onSuccess: () => {
            toast({ title: "Item updated" });
            queryClient.invalidateQueries({ queryKey: ["messing-items", String(subCategoryId)] });
            onOpenChange(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const handleSubmit = () => {
        if (!form.name || !form.price) return toast({ title: "Name and Price are required", variant: "destructive" });

        const payload = {
            ...form,
            price: Number(form.price),
            messingSubCategoryId: subCategoryId
        };

        if (initialData) {
            updateMutation.mutate({ id: initialData.id, updates: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="item-name">Name</Label>
                        <Input id="item-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Item Name" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="item-price">Price (PKR)</Label>
                            <Input id="item-price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="item-order">Display Order</Label>
                            <Input id="item-order" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} placeholder="0" />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="item-desc">Description</Label>
                        <Textarea id="item-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description of the item..." className="min-h-[100px]" />
                    </div>
                </div>
                <DialogFooter>
                    <Button disabled={createMutation.isPending || updateMutation.isPending} onClick={handleSubmit}>
                        {initialData ? "Save Changes" : "Add Item"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
