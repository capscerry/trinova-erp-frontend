import {
    ActivityModules,
    ActivityStatuses,
    ActivityTypes,
} from "./activity-constants";

import type { ActivityEntry } from "./types";

import { toIso } from "./helpers";

export function mapForecasts(
    entries: ActivityEntry[],
    forecasts: any[]
) {
    if (!forecasts.length) return;

    // Semua data pada latest berasal dari 1 batch generate
    const latest = forecasts[0];

    entries.push({
        id: `forecast-${latest.forecast_month}`,

        ownerModule: ActivityModules.AI,

        visibleModules: [
            ActivityModules.INVENTORY,
        ],

        activityType:
            ActivityTypes.FORECAST_GENERATED,

        documentType:
            "Monthly Forecast",

        documentNumber:
            latest.forecast_month,

        title:
            "Monthly Forecast Generated",

        description:
            [
                `Forecast Period : ${latest.forecast_month}`,
                `Training Period : ${latest.last_training_period}`,
                `${forecasts.length} products forecasted`,
            ].join(" • "),

        createdAt:
            toIso(latest.generated_at),

        status:
            ActivityStatuses.SUCCESS,

        href:
            "/persediaan/demand-forecast",
    });
}