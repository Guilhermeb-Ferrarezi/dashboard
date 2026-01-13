import { useNavigate } from "react-router-dom";
import { login } from "../services/auth";
import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  async function handleLogin() {
    try {
      await login(password);
      navigate("/");
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="btn-teste">
      <h1>Login</h1>

      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleLogin}>Entrar</button>
    </div>
  );
}