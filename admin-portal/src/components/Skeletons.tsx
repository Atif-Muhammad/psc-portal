import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function CardSkeleton() {
    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-8 w-[60px] mb-1" />
                <Skeleton className="h-3 w-[120px]" />
            </CardContent>
        </Card>
    );
}

export function DetailedCardSkeleton() {
    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-[150px]" />
                            <Skeleton className="h-3 w-[100px]" />
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <Skeleton className="h-3 w-[80px]" />
                        <Skeleton className="h-3 w-[60px]" />
                    </div>
                    <div className="flex justify-between">
                        <Skeleton className="h-3 w-[80px]" />
                        <Skeleton className="h-3 w-[40px]" />
                    </div>
                    <div className="flex justify-between">
                        <Skeleton className="h-3 w-[80px]" />
                        <Skeleton className="h-3 w-[90px]" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-10 w-[200px]" />
                <Skeleton className="h-4 w-[300px]" />
            </div>

            <div className="space-y-4">
                <Skeleton className="h-6 w-[150px]" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <CardSkeleton key={i} />
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <Skeleton className="h-6 w-[150px]" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <CardSkeleton key={i} />
                    ))}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="w-full">
                        <CardHeader>
                            <Skeleton className="h-6 w-[180px]" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-[300px] w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-[250px]" />
                <Skeleton className="h-10 w-[100px]" />
            </div>
            <div className="rounded-md border">
                <div className="h-12 border-b bg-muted/50 px-4 flex items-center gap-4">
                    {[...Array(cols)].map((_, i) => (
                        <Skeleton key={i} className="h-4 flex-1" />
                    ))}
                </div>
                {[...Array(rows)].map((_, i) => (
                    <div key={i} className="h-16 border-b px-4 flex items-center gap-4">
                        {[...Array(cols)].map((_, j) => (
                            <Skeleton key={j} className="h-4 flex-1" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
