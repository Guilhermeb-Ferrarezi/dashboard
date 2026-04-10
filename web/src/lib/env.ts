const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL;

if (!apiUrl) {
  throw new Error(
    "Missing API URL. Set NEXT_PUBLIC_API_URL or API_URL in web/.env.",
  );
}

export const API_BASE_URL = apiUrl.replace(/\/$/, "");
