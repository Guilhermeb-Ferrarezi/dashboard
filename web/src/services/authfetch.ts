export async function authFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Missing token");
  }

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return response;
}
