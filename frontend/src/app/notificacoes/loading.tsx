import React from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="flex-1 p-8 ml-64 bg-[var(--bg-primary)] min-h-screen text-[var(--text-primary)]">
            <Skeleton className="h-10 w-48 mb-6" />

            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-[var(--glass-border)] pb-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
            </div>

            {/* Content area */}
            <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-lg border border-[var(--glass-border)] bg-[var(--bg-surface)]">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2 py-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-3 w-1/4" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
