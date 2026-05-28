import type { Context } from "hono";
import type { AppEnv, AuthUserPayload } from "../types/hono";

export type MockContextOptions = {
  user?: Partial<AuthUserPayload>;
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
};

/**
 * Cria um mock de Context<AppEnv> do Hono para uso nos testes de controllers e middlewares.
 *
 * - `c.get("user")` retorna `options.user` (ou null)
 * - `c.set("user", ...)` atualiza o user capturado (acessível via `c.get("user")`)
 * - `c.req.json()` resolve para `options.body`
 * - `c.req.param(name)` retorna `options.params[name]`
 * - `c.req.query(name)` retorna `options.query[name]`
 * - `c.req.header(name)` retorna `options.headers[name]` (case-insensitive)
 * - `c.json(data, status?)` retorna uma Response com JSON
 * - `c.text(data, status?)` retorna uma Response com texto
 * - `c.body(null, status?)` retorna uma Response vazia (204)
 */
export function createMockContext(options: MockContextOptions = {}): Context<AppEnv> {
  let storedUser = options.user as AuthUserPayload | undefined;

  // Build headers object for the raw Request
  const headersInit: Record<string, string> = { ...(options.headers ?? {}) };
  const rawRequest = new Request("http://localhost/test", {
    headers: headersInit,
  });

  const mockCtx = {
    get(key: string) {
      if (key === "user") return storedUser;
      return undefined;
    },
    set(key: string, value: unknown) {
      if (key === "user") storedUser = value as AuthUserPayload;
    },
    req: {
      raw: rawRequest,
      json: async () => options.body ?? {},
      param: (name: string) => options.params?.[name] ?? "",
      query: (name: string) => options.query?.[name] ?? "",
      header: (name: string) => {
        const lower = name.toLowerCase();
        if (!options.headers) return undefined;
        const entry = Object.entries(options.headers).find(
          ([k]) => k.toLowerCase() === lower,
        );
        return entry?.[1];
      },
      method: "GET",
      url: "http://localhost/test",
    },
    json(data: unknown, status = 200) {
      return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    },
    text(data: string, status = 200) {
      return new Response(data, { status });
    },
    body(data: null, status = 204) {
      return new Response(data, { status });
    },
    html(data: string, status = 200) {
      return new Response(data, {
        status,
        headers: { "Content-Type": "text/html" },
      });
    },
    header() {},
  } as unknown as Context<AppEnv>;

  return mockCtx;
}
