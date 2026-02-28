import React from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="flex-1 p-8 ml-64 bg-[var(--bg-primary)] min-h-screen">
            {/* Header / Config */}
            <div className="flex flex-col gap-4 mb-8">
                <Skeleton className="h-40 w-full rounded-xl" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
            </div>

            <div className="mt-8 space-y-4">
                <Skeleton className="h-10 w-64" />
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
            </div>
        </div>
    );
}
