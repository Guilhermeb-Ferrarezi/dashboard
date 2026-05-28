import { afterEach, describe, expect, mock, test } from "bun:test";
import mongoose from "mongoose";

import { deleteUser } from "./admin.controller";
import { User } from "../models/User";
import { UserAccessToken } from "../models/UserAccessToken";
import { AdminAccessToken } from "../models/AdminAccessToken";
import { createMockContext } from "../test-utils/mock-context";

describe("deleteUser", () => {
  const originalFindByIdAndDelete = User.findByIdAndDelete;
  const originalUserUpdateMany = UserAccessToken.updateMany;
  const originalAdminUpdateMany = AdminAccessToken.updateMany;

  afterEach(() => {
    User.findByIdAndDelete = originalFindByIdAndDelete;
    UserAccessToken.updateMany = originalUserUpdateMany;
    AdminAccessToken.updateMany = originalAdminUpdateMany;
  });

  test("retorna 400 para ObjectId inválido", async () => {
    const c = createMockContext({ params: { id: "id-invalido" } });
    const res = await deleteUser(c);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("ID inválido.");
  });

  test("retorna 404 quando o usuário não existe e não toca nos tokens", async () => {
    const validId = new mongoose.Types.ObjectId().toString();
    const c = createMockContext({ params: { id: validId } });

    User.findByIdAndDelete = mock(() => ({
      lean: async () => null,
    })) as typeof User.findByIdAndDelete;

    const userRevoke = mock(async () => ({ modifiedCount: 0 }));
    UserAccessToken.updateMany = userRevoke as unknown as typeof UserAccessToken.updateMany;

    const res = await deleteUser(c);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Usuário não encontrado.");
    expect(userRevoke).not.toHaveBeenCalled();
  });

  test("revoga UserAccessToken e AdminAccessToken ao excluir usuário existente", async () => {
    const validId = new mongoose.Types.ObjectId().toString();
    const c = createMockContext({ params: { id: validId } });

    User.findByIdAndDelete = mock(() => ({
      lean: async () => ({ _id: validId, username: "teste", role: "user" }),
    })) as typeof User.findByIdAndDelete;

    const userRevoke = mock(async () => ({ modifiedCount: 1 }));
    const adminRevoke = mock(async () => ({ modifiedCount: 0 }));
    UserAccessToken.updateMany = userRevoke as unknown as typeof UserAccessToken.updateMany;
    AdminAccessToken.updateMany = adminRevoke as unknown as typeof AdminAccessToken.updateMany;

    const res = await deleteUser(c);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Usuário removido.");
    expect(userRevoke).toHaveBeenCalledTimes(1);
    expect(adminRevoke).toHaveBeenCalledTimes(1);
  });

  test("passa filtro correto ao revogar UserAccessToken", async () => {
    const validId = new mongoose.Types.ObjectId().toString();
    const c = createMockContext({ params: { id: validId } });

    User.findByIdAndDelete = mock(() => ({
      lean: async () => ({ _id: validId, username: "teste", role: "user" }),
    })) as typeof User.findByIdAndDelete;

    const userRevoke = mock(async () => ({ modifiedCount: 1 }));
    const adminRevoke = mock(async () => ({ modifiedCount: 1 }));
    UserAccessToken.updateMany = userRevoke as unknown as typeof UserAccessToken.updateMany;
    AdminAccessToken.updateMany = adminRevoke as unknown as typeof AdminAccessToken.updateMany;

    await deleteUser(c);

    const [userFilter] = userRevoke.mock.calls[0] as [unknown];
    expect(userFilter).toEqual({ userId: validId, revokedAt: null });

    const [adminFilter] = adminRevoke.mock.calls[0] as [unknown];
    expect(adminFilter).toEqual({ adminId: validId, revokedAt: null });
  });
});
