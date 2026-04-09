const fallbackApiUrl = "http://localhost:4000/api";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.API_URL ??
  fallbackApiUrl
).replace(/\/$/, "");
