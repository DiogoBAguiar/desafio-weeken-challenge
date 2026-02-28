import React from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="flex-1 p-8 ml-64 flex justify-center bg-[var(--bg-primary)] min-h-screen">
            <div className="w-full max-w-4xl max-w-[800px] mt-8 bg-[var(--bg-surface)] p-6 rounded-xl border border-[var(--glass-border)] shadow-md">
                <div className="flex flex-col items-center gap-4 mb-8 border-b border-[var(--glass-border)] pb-8">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>

                <div className="flex gap-4 border-b border-[var(--glass-border)] pb-4 mb-6">
                    <Skeleton className="h-8 w-24 rounded" />
                    <Skeleton className="h-8 w-24 rounded" />
                    <Skeleton className="h-8 w-24 rounded" />
                    <Skeleton className="h-8 w-24 rounded" />
                </div>

                <div className="space-y-6">
                    <Skeleton className="h-12 w-full rounded" />
                    <Skeleton className="h-12 w-full rounded" />
                    <Skeleton className="h-12 w-full rounded" />
                </div>
            </div>
        </div>
    );
}
