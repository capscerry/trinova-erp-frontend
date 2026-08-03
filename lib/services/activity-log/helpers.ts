import { ActivityStatus } from "./types";

import { ActivityModules } from "./activity-constants";

import type { ActivityModule } from "./types";

export function visibleTo(
    ...modules: ActivityModule[]
): ActivityModule[] {
    return modules;
}

export function toIso(raw?: string | null): string {
    if (!raw) return new Date(0).toISOString();

    try {
        return new Date(raw).toISOString();
    } catch {
        return new Date(0).toISOString();
    }
}

export function rupiah(value?: number | null): string {
    if (value == null) return "-";

    return new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 0,
    }).format(value);
}

export function statusFromActivityType(
    activityType: string
): ActivityStatus {

    const type = activityType.toLowerCase();

    if (
        type.includes("cancel") ||
        type.includes("failed") ||
        type.includes("reject")
    ) {
        return "error";
    }

    if (
        type.includes("approved") ||
        type.includes("completed") ||
        type.includes("paid") ||
        type.includes("received")
    ) {
        return "success";
    }

    if (
        type.includes("pending") ||
        type.includes("partial")
    ) {
        return "warning";
    }

    return "info";
}

export function activityTypeLabel(type: string): string {

    return type
        .replace(/_/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}

