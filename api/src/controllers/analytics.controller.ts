import { BetaAnalyticsDataClient } from "@google-analytics/data";
import type { Request, Response } from "express";

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const CREDENTIALS_JSON = process.env.GA4_CREDENTIALS_JSON;

const SALES_PAGES = ["/play/corujao", "/play/mix"];

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

  // Substrings únicas para identificar cada página via unifiedScreenName do GA4
  // Títulos reais: "Corujão — Santos Games Arena" | "Mix — SGA Gaming"
  const PAGE_TITLES: Record<string, string> = {
    "/play/corujao": "coruj",
    "/play/mix": "mix",
  };

  try {
    // Realtime API só aceita unifiedScreenName (título da página), não pagePath
    const [rtAll] = await ga4.client.runRealtimeReport({
      property: `properties/${ga4.propertyId}`,
      dimensions: [{ name: "unifiedScreenName" }],
      metrics: [{ name: "activeUsers" }],
    });

    const result: Record<string, number> = {};
    for (const page of SALES_PAGES) result[page] = 0;

    let totalActive = 0;
    for (const row of rtAll.rows ?? []) {
      const screenName = (row.dimensionValues?.[0]?.value ?? "").toLowerCase();
      const users = parseInt(row.metricValues?.[0]?.value ?? "0", 10);
      totalActive += users;

      for (const [path, title] of Object.entries(PAGE_TITLES)) {
        if (screenName.includes(title.toLowerCase())) {
          result[path] = (result[path] ?? 0) + users;
        }
      }
    }

    return res.json({ pages: result, totalActive });
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

  try {
    const [sessionReport] = await analyticsClient.runReport({
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
          inListFilter: { values: SALES_PAGES },
        },
      },
    });

    const [eventsReport] = await analyticsClient.runReport({
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
                inListFilter: { values: SALES_PAGES },
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
    });

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
