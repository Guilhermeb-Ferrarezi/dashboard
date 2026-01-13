import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/auth";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  async function handleLogin() {
    try {
      await login(username, password);
      navigate("/dashboard");
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div>
      <h1>Login</h1>

      <input
        placeholder="Usuário"
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        type="password"
        placeholder="Senha"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleLogin}>Entrar</button>

      <hr />

      <button onClick={() => navigate("/register")}>
        Criar conta
      </button>
    </div>
  );
}
