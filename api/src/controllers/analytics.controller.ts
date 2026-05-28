import { BetaAnalyticsDataClient } from "@google-analytics/data";
import type { Request, Response } from "express";

import { aggregateRealtimeRows, SALES_PAGES } from "../lib/analytics";

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const CREDENTIALS_JSON = process.env.GA4_CREDENTIALS_JSON;

function getClient() {
  if (!PROPERTY_ID || !CREDENTIALS_JSON) return null;
  try {
    const credentials = JSON.parse(Buffer.from(CREDENTIALS_JSON, "base64").toString("utf-8"));
    return { client: new BetaAnalyticsDataClient({ credentials }), propertyId: PROPERTY_ID };
  } catch {
    return null;
  }
}

export async function getRealtimeAnalytics(_req: Request, res: Response) {
  const ga4 = getClient();
  if (!ga4) {
    return res.status(503).json({ message: "GA4 não configurado." });
  }

  try {
    // Realtime API só aceita unifiedScreenName (título da página), não pagePath
    // Duas chamadas em paralelo: 30 min (padrão) e últimos 5 min
    const [rt30, rt5] = await Promise.all([
      ga4.client.runRealtimeReport({
        property: `properties/${ga4.propertyId}`,
        dimensions: [{ name: "unifiedScreenName" }],
        metrics: [{ name: "activeUsers" }],
      }),
      ga4.client.runRealtimeReport({
        property: `properties/${ga4.propertyId}`,
        dimensions: [{ name: "unifiedScreenName" }],
        metrics: [{ name: "activeUsers" }],
        minuteRanges: [{ startMinutesAgo: 4, endMinutesAgo: 0 }],
      }),
    ]);

    const w30 = aggregateRealtimeRows(rt30[0].rows);
    const w5 = aggregateRealtimeRows(rt5[0].rows);

    return res.json({
      pages: w30.pages,
      totalActive: w30.total,
      pages5min: w5.pages,
      totalActive5min: w5.total,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ message: msg });
  }
}

export async function getSalesPagesAnalytics(req: Request, res: Response) {
  const ga4 = getClient();
  if (!ga4) {
    return res.status(503).json({
      error: "GA4 not configured",
      message: "GA4_PROPERTY_ID e GA4_CREDENTIALS_JSON são necessários.",
    });
  }

  const startDate = (req.query.startDate as string) || "30daysAgo";
  const endDate = (req.query.endDate as string) || "today";

  const analyticsClient = ga4.client;

  type PageMetrics = {
    path: string;
    sessions: number;
    activeUsers: number;
    avgSessionDuration: number;
    topChannels: { channel: string; sessions: number }[];
    conversions: { checkoutClicks: number; whatsappClicks: number; ctaVisible: number };
  };

  const pageMap: Record<string, PageMetrics> = {};
  for (const page of SALES_PAGES) {
    pageMap[page] = {
      path: page,
      sessions: 0,
      activeUsers: 0,
      avgSessionDuration: 0,
      topChannels: [],
      conversions: { checkoutClicks: 0, whatsappClicks: 0, ctaVisible: 0 },
    };
  }

  const channelMap: Record<string, Record<string, number>> = {};

  try {
    const [[sessionReport], [eventsReport]] = await Promise.all([
      analyticsClient.runReport({
        property: `properties/${ga4.propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }, { name: "sessionDefaultChannelGrouping" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "averageSessionDuration" },
        ],
        dimensionFilter: {
          filter: {
            fieldName: "pagePath",
            inListFilter: { values: [...SALES_PAGES] },
          },
        },
      }),
      analyticsClient.runReport({
        property: `properties/${ga4.propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }, { name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              {
                filter: {
                  fieldName: "pagePath",
                  inListFilter: { values: [...SALES_PAGES] },
                },
              },
              {
                filter: {
                  fieldName: "eventName",
                  inListFilter: { values: ["checkout_click", "whatsapp_click", "cta_visible"] },
                },
              },
            ],
          },
        },
      }),
    ]);

    for (const row of sessionReport.rows ?? []) {
      const path = row.dimensionValues?.[0]?.value ?? "";
      const channel = row.dimensionValues?.[1]?.value ?? "Unknown";
      if (!pageMap[path]) continue;

      const sessions = parseInt(row.metricValues?.[0]?.value ?? "0", 10);
      pageMap[path].sessions += sessions;
      pageMap[path].activeUsers += parseInt(row.metricValues?.[1]?.value ?? "0", 10);
      pageMap[path].avgSessionDuration = parseFloat(row.metricValues?.[2]?.value ?? "0");

      if (!channelMap[path]) channelMap[path] = {};
      channelMap[path][channel] = (channelMap[path][channel] ?? 0) + sessions;
    }

    for (const path of SALES_PAGES) {
      const channels = channelMap[path];
      const page = pageMap[path];
      if (channels && page) {
        page.topChannels = Object.entries(channels)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([channel, sessions]) => ({ channel, sessions }));
      }
    }

    for (const row of eventsReport.rows ?? []) {
      const path = row.dimensionValues?.[0]?.value ?? "";
      const event = row.dimensionValues?.[1]?.value ?? "";
      if (!pageMap[path]) continue;
      const count = parseInt(row.metricValues?.[0]?.value ?? "0", 10);
      if (event === "checkout_click") pageMap[path].conversions.checkoutClicks += count;
      if (event === "whatsapp_click") pageMap[path].conversions.whatsappClicks += count;
      if (event === "cta_visible") pageMap[path].conversions.ctaVisible += count;
    }

    return res.json({ pages: Object.values(pageMap) });
  } catch (err: unknown) {
    console.error("[analytics] GA4 error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ message: msg });
  }
}
