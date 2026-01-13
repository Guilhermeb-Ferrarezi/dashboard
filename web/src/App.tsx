import Dashboard from "./pages/Dashboard.tsx";
import { useState } from "react";
import { login } from "./services/auth";
import { getUserData } from "./services/user";

export default function App() {
  const [user, setUser] = useState<any>(null);

  const handleLogin = async () => {
    try {
      await login({ email: "teste@mail.com", password: "123456" });
      const userData = await getUserData();
      setUser(userData);
    } catch (err: any) {
      alert(err.message);
    }
  };
  return (
    <div>
      <div className="btn-teste">
          <h1>Frontend / Backend Teste</h1>
          <button onClick={handleLogin}>Login & Buscar Dados</button>
          {user && <pre>{JSON.stringify(user, null, 2)}</pre>}
        </div>
      <Dashboard />
    </div>
  )
}

