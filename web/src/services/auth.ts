interface LoginData {
  email: string;
  password: string;
}

export async function login({ email, password }: LoginData) {
  const basicUser = import.meta.env.REACT_APP_BASIC_USER || "admin";
  const basicPass = import.meta.env.REACT_APP_BASIC_PASS || "admin123";

  const basicAuth = btoa(`${basicUser}:${basicPass}`);

  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || "Erro ao logar");
  }

  const data = await response.json();
  localStorage.setItem("token", data.token);
  return data;
}
