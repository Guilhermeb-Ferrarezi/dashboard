import { useState } from "react";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleRegister() {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      alert("Erro ao criar conta");
      return;
    }

    alert("Conta criada com sucesso!");
  }

  return (
    <div>
      <h1>Criar Conta</h1>
      <input placeholder="Usuário" onChange={e => setUsername(e.target.value)} />
      <input placeholder="Senha" type="password" onChange={e => setPassword(e.target.value)} />
      <button onClick={handleRegister}>Criar</button>
    </div>
  );
}
