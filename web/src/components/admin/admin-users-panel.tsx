"use client";

import { useState } from "react";
import {
  InfoIcon,
  MoreHorizontalIcon,
  PlusIcon,
  ShieldIcon,
  User2Icon,
} from "@/components/ui/icons";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { clientApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { PortalUserSummary } from "@/types/portal";

interface AdminUsersPanelProps {
  initialUsers: PortalUserSummary[];
}

const emptyCreateForm = { username: "", email: "", password: "", role: "user" as "user" | "admin" };

export function AdminUsersPanel({ initialUsers }: AdminUsersPanelProps) {
  const [users, setUsers] = useState(initialUsers);

  // criar
  const [createOpen, setCreateOpen] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);

  // editar
  const [editTarget, setEditTarget] = useState<PortalUserSummary | null>(null);
  const [editPending, setEditPending] = useState(false);
  const [editForm, setEditForm] = useState({ username: "", email: "", password: "", role: "user" as "user" | "admin" });

  // excluir
  const [deleteTarget, setDeleteTarget] = useState<PortalUserSummary | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  function openEdit(user: PortalUserSummary) {
    setEditForm({ username: user.username, email: user.email ?? "", password: "", role: user.role });
    setEditTarget(user);
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatePending(true);
    try {
      const response = await clientApi<{ user: PortalUserSummary; message: string }>(
        "/admin/users",
        { method: "POST", body: JSON.stringify(createForm) },
      );
      setUsers((cur) => [response.user, ...cur]);
      setCreateOpen(false);
      setCreateForm(emptyCreateForm);
      toast.success(response.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar.");
    } finally {
      setCreatePending(false);
    }
  }

  async function handleEditUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTarget) return;
    setEditPending(true);
    try {
      const body: Record<string, string> = {
        username: editForm.username,
        email: editForm.email,
        role: editForm.role,
      };
      if (editForm.password) body.password = editForm.password;

      const response = await clientApi<{ user: PortalUserSummary; message: string }>(
        `/admin/users/${editTarget.id}`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      setUsers((cur) => cur.map((u) => u.id === editTarget.id ? response.user : u));
      setEditTarget(null);
      toast.success(response.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    } finally {
      setEditPending(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return;
    setDeletePending(true);
    try {
      await clientApi(`/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      setUsers((cur) => cur.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Usuário removido.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover.");
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Usuários"
        description="Gerencie as contas que acessam o portal universal e definem o piloto de SSO."
      />
      <Alert variant="info">
        <ShieldIcon />
        <AlertTitle>Usuários do home central</AlertTitle>
        <AlertDescription>
          Este cadastro controla contas do portal universal. O acesso ao sistema
          externo ainda depende do email existir no projeto de destino.
        </AlertDescription>
      </Alert>

      {/* Dialog: Editar */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>Deixe a senha em branco para não alterar.</DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={handleEditUser}>
            <Label className="flex flex-col items-start gap-2">
              <span>Nome de usuário</span>
              <Input
                value={editForm.username}
                onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                autoComplete="off"
                required
              />
            </Label>
            <Label className="flex flex-col items-start gap-2">
              <span>Email</span>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                autoComplete="off"
              />
            </Label>
            <Label className="flex flex-col items-start gap-2">
              <span>Nova senha</span>
              <Input
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Deixe vazio para não alterar"
                autoComplete="new-password"
              />
            </Label>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Perfil</span>
              <Tabs
                value={editForm.role}
                onValueChange={(v) => setEditForm((f) => ({ ...f, role: v as "user" | "admin" }))}
              >
                <TabsList>
                  <TabsTrigger value="user">Usuário</TabsTrigger>
                  <TabsTrigger value="admin">Admin</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditTarget(null)} disabled={editPending}>
                Cancelar
              </Button>
              <Button type="submit" loading={editPending}>
                Salvar alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar exclusão */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.username}</span>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deletePending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void handleDeleteUser()} disabled={deletePending}>
              {deletePending ? <Spinner className="size-4" /> : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-border/60 bg-card/90">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Base de usuarios</CardTitle>
            <CardDescription>
              {users.length} usuarios disponiveis no banco do home.
            </CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button />}>
              <PlusIcon />
              Novo usuario
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar usuario</DialogTitle>
                <DialogDescription>
                  O email sera usado para integracoes futuras e para o piloto de SSO.
                </DialogDescription>
              </DialogHeader>
              <form className="flex flex-col gap-4" onSubmit={handleCreateUser}>
                <Label className="flex flex-col items-start gap-2">
                  <span>Nome de usuário</span>
                  <Input
                    value={createForm.username}
                    onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                    autoComplete="off"
                    required
                  />
                </Label>
                <Label className="flex flex-col items-start gap-2">
                  <span>Email</span>
                  <Input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                    autoComplete="email"
                    required
                  />
                </Label>
                <Label className="flex flex-col items-start gap-2">
                  <span>Senha</span>
                  <Input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                    autoComplete="new-password"
                    required
                  />
                </Label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Perfil</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger
                          aria-label="Explicar diferenca entre admin e usuario comum"
                          className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <InfoIcon className="size-4" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <div className="space-y-2">
                            <p>
                              <span className="font-semibold">Admin:</span>{" "}
                              acessa a area administrativa, cria usuarios e gerencia inscricoes e times do VCT.
                            </p>
                            <p>
                              <span className="font-semibold">Usuario comum:</span>{" "}
                              acessa apenas as areas padrao do portal e o proprio perfil, sem permissoes administrativas.
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Tabs
                    value={createForm.role}
                    onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v as "user" | "admin" }))}
                  >
                    <TabsList>
                      <TabsTrigger value="user">Usuario</TabsTrigger>
                      <TabsTrigger value="admin">Admin</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <Button type="submit" loading={createPending}>
                  Criar conta
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <EmptyState
              icon={User2Icon}
              title="Nenhum usuário cadastrado"
              description='Crie a primeira conta clicando em "Novo usuário".'
              className="min-h-[220px]"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody className="list-fade-in">
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
                        ? formatDate(user.createdAt)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(user)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(user)}
                          >
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
