import { useState } from "react";
import { register } from "../services/register";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  async function handleRegister() {
    if (!username || !password) {
      alert("Preencha tudo");
      return;
    }

    try {
      await register(username, password);
      alert("Conta criada!");
      navigate("/login");
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div>
      <h1>Criar Conta</h1>

      <input
        placeholder="Usuário"
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        placeholder="Senha"
        type="password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleRegister}>Criar Conta</button>
    </div>
  );
}
