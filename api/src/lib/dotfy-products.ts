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
  discountPercent?: number | null;
  slug?: string;
  imageUrl?: string;
  isActive?: boolean;
};

export type DotfyProductResult =
  | { ok: true; productId: string; slug: string }
  | { ok: false; error: string };

export async function createDotfyProduct(input: DotfyProductInput): Promise<DotfyProductResult> {
  if (!DOTFY_API_KEY) {
    return { ok: false, error: "DOTFY_API_KEY not configured" };
  }

  const slug = input.slug || toSlug(input.title);
  const price = input.priceCents / 100;

  const response = await fetch(`${DOTFY_API_URL}/api/products`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      title: input.title,
      description: input.description || input.title,
      price,
      slug,
      isActive: input.isActive ?? true,
      ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
      ...(input.discountPercent ? { discountPercent: input.discountPercent } : {})
    })
  });

  const json = (await response.json()) as {
    success?: boolean;
    data?: { id?: string; slug?: string; [k: string]: unknown };
    error?: string;
  };

  console.log("[dotfy] create product response", response.status, json.error ?? "ok");

  if (!response.ok || json.error || !json.data) {
    return { ok: false, error: json.error ?? `HTTP ${response.status}` };
  }

  const productId = json.data.id ?? "";

  // Se o create não aceitou discountPercent inline, tenta aplicar via PATCH
  if (input.discountPercent && productId) {
    await applyDotfyDiscount(productId, input.discountPercent);
  }

  return {
    ok: true,
    productId,
    slug: json.data.slug ?? slug
  };
}

async function applyDotfyDiscount(productId: string, discountPercent: number): Promise<void> {
  try {
    const res = await fetch(`${DOTFY_API_URL}/api/products/${productId}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ discountPercent })
    });
    console.log("[dotfy] apply discount response", res.status);
  } catch (err) {
    console.warn("[dotfy] apply discount error:", err);
  }
}

export async function deleteDotfyProduct(productId: string): Promise<{ ok: boolean; error?: string }> {
  if (!DOTFY_API_KEY || !productId) {
    return { ok: false, error: "missing key or productId" };
  }

  const response = await fetch(`${DOTFY_API_URL}/api/products/${productId}`, {
    method: "DELETE",
    headers: headers()
  });

  console.log("[dotfy] delete product response", response.status);

  if (response.ok) return { ok: true };

  return { ok: false, error: `HTTP ${response.status}` };
}

export async function updateDotfyProduct(
  oldProductId: string | null,
  input: DotfyProductInput
): Promise<DotfyProductResult> {
  if (oldProductId) {
    await deleteDotfyProduct(oldProductId);
  }
  return createDotfyProduct(input);
}
