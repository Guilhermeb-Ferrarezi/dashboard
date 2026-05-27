import { BetaAnalyticsDataClient } from "@google-analytics/data";
import type { Request, Response } from "express";

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const CREDENTIALS_JSON = process.env.GA4_CREDENTIALS_JSON;

const SALES_PAGES = ["/play/corujao", "/play/mix"];

export async function getSalesPagesAnalytics(req: Request, res: Response) {
  if (!PROPERTY_ID || !CREDENTIALS_JSON) {
    return res.status(503).json({
      error: "GA4 not configured",
      message: "GA4_PROPERTY_ID e GA4_CREDENTIALS_JSON são necessários.",
    });
  }

  let credentials: object;
  try {
    credentials = JSON.parse(
      Buffer.from(CREDENTIALS_JSON, "base64").toString("utf-8")
    );
  } catch {
    return res.status(500).json({ error: "Invalid GA4 credentials format" });
  }

  const startDate = (req.query.startDate as string) || "30daysAgo";
  const endDate = (req.query.endDate as string) || "today";

  const analyticsClient = new BetaAnalyticsDataClient({ credentials });

  try {
    const [sessionReport] = await analyticsClient.runReport({
      property: `properties/${PROPERTY_ID}`,
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
          inListFilter: { values: SALES_PAGES },
        },
      },
    });

    const [eventsReport] = await analyticsClient.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "pagePath" }, { name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            {
              filter: {
                fieldName: "pagePath",
                inListFilter: { values: SALES_PAGES },
              },
            },
            {
              filter: {
                fieldName: "eventName",
                inListFilter: { values: ["whatsapp_click", "cta_visible"] },
              },
            },
          ],
        },
      },
    });

    type PageMetrics = {
      path: string;
      sessions: number;
      activeUsers: number;
      avgSessionDuration: number;
      topChannels: { channel: string; sessions: number }[];
      conversions: { whatsappClicks: number; ctaVisible: number };
    };

    const pageMap: Record<string, PageMetrics> = {};
    for (const page of SALES_PAGES) {
      pageMap[page] = {
        path: page,
        sessions: 0,
        activeUsers: 0,
        avgSessionDuration: 0,
        topChannels: [],
        conversions: { whatsappClicks: 0, ctaVisible: 0 },
      };
    }

    const channelMap: Record<string, Record<string, number>> = {};

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
