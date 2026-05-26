const DOTFY_API_URL = process.env.DOTFY_API_URL || "https://app.dotfy.com.br";
const DOTFY_API_KEY = process.env.DOTFY_API_KEY || "";

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${DOTFY_API_KEY}`
  };
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export type DotfyProductInput = {
  title: string;
  description?: string;
  priceCents: number;
  slug?: string;
  imageUrl?: string;
  isActive?: boolean;
};

export type DotfyProductResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

export async function createDotfyProduct(input: DotfyProductInput): Promise<DotfyProductResult> {
  if (!DOTFY_API_KEY) {
    return { ok: false, error: "DOTFY_API_KEY not configured" };
  }

  const slug = input.slug || toSlug(input.title);

  const response = await fetch(`${DOTFY_API_URL}/api/products`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      title: input.title,
      description: input.description || input.title,
      price: input.priceCents / 100,
      slug,
      isActive: input.isActive ?? true,
      ...(input.imageUrl ? { imageUrl: input.imageUrl } : {})
    })
  });

  const json = (await response.json()) as { success?: boolean; data?: Record<string, unknown>; error?: string };

  console.log("[dotfy] create product response", response.status, json.error ?? "ok");

  if (!response.ok || json.error || !json.data) {
    return { ok: false, error: json.error ?? `HTTP ${response.status}` };
  }

  return { ok: true, data: json.data };
}
