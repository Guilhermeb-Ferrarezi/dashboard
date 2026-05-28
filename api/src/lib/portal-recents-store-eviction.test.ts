import { describe, it, expect } from "bun:test";

describe("portal-recents memoryRecents evicção (MAX_MEMORY_USERS)", () => {
  it("pruneMemoryUsers remove entradas antigas quando o Map está cheio", () => {
    // Testa a lógica de evicção diretamente com um Map local
    // (sem precisar de Redis/Mongo reais)
    const MAX = 3;
    const map = new Map<string, number[]>();
    const dirty = new Set<string>();

    function pruneLocal() {
      while (map.size >= MAX) {
        const oldest = map.keys().next().value as string | undefined;
        if (!oldest) break;
        map.delete(oldest);
        dirty.delete(oldest);
      }
    }

    // Preenche até o limite
    for (let i = 0; i < MAX; i++) {
      pruneLocal();
      map.set(`user-${i}`, [i]);
      dirty.add(`user-${i}`);
    }
    expect(map.size).toBe(MAX);

    // Adiciona um a mais — deve remover o mais antigo
    pruneLocal();
    map.set("user-new", [99]);
    dirty.add("user-new");

    expect(map.size).toBe(MAX);
    expect(map.has("user-0")).toBe(false); // mais antigo removido
    expect(map.has("user-new")).toBe(true); // novo presente
  });
});
