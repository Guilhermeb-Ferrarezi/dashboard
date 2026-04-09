"use client";

import { useState } from "react";
import {
  LoaderCircleIcon,
  PlusIcon,
  ShieldIcon,
  User2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clientApi } from "@/lib/api";
import type { PortalUserSummary } from "@/types/portal";

interface AdminUsersPanelProps {
  initialUsers: PortalUserSummary[];
}

export function AdminUsersPanel({ initialUsers }: AdminUsersPanelProps) {
  const [users, setUsers] = useState(initialUsers);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "user" as "user" | "admin",
  });

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    try {
      const response = await clientApi<{ user: PortalUserSummary; message: string }>(
        "/admin/users",
        {
          method: "POST",
          body: JSON.stringify(form),
        },
      );

      setUsers((current) => [response.user, ...current]);
      setOpen(false);
      setForm({ username: "", email: "", password: "", role: "user" });
      toast.success(response.message);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel criar.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Alert>
        <ShieldIcon className="text-primary" />
        <AlertTitle>Usuarios do home central</AlertTitle>
        <AlertDescription>
          Este cadastro controla contas do portal universal. O acesso ao sistema
          externo ainda depende do email existir no projeto de destino.
        </AlertDescription>
      </Alert>

      <Card className="border-border/60 bg-card/90">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Base de usuarios</CardTitle>
            <CardDescription>
              {users.length} usuarios disponiveis no banco do home.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
              <Button>
                <PlusIcon />
                Novo usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar usuario</DialogTitle>
                <DialogDescription>
                  O email sera usado para integracoes futuras e para o piloto de
                  SSO.
                </DialogDescription>
              </DialogHeader>
              <form className="flex flex-col gap-4" onSubmit={handleCreateUser}>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Nome de usuario</span>
                  <Input
                    value={form.username}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        username: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Email</span>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Senha</span>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Perfil</span>
                  <Tabs
                    value={form.role}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        role: value as "user" | "admin",
                      }))
                    }
                  >
                    <TabsList>
                      <TabsTrigger value="user">Usuario</TabsTrigger>
                      <TabsTrigger value="admin">Admin</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <Button type="submit" disabled={pending}>
                  {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
                  Criar conta
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User2Icon className="size-4 text-muted-foreground" />
                      {user.username}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {user.email ?? "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("pt-BR")
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
