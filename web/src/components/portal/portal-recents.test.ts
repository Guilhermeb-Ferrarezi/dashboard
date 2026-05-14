import { afterEach, describe, expect, test } from "bun:test";

import {
  getPortalRecentsKey,
  readPortalRecents,
  togglePortalRecentPin,
  trackPortalRecent,
} from "./portal-recents";

type LocalStorageMap = Record<string, string>;

function installWindowMock(initialStorage: LocalStorageMap = {}) {
  const storage = new Map(Object.entries(initialStorage));
  const eventHandlers = new Map<string, Set<() => void>>();

  globalThis.window = {
    localStorage: {
      getItem(key: string) {
        return storage.has(key) ? storage.get(key)! : null;
      },
      setItem(key: string, value: string) {
        storage.set(key, value);
      },
      removeItem(key: string) {
        storage.delete(key);
      },
      clear() {
        storage.clear();
      },
    },
    dispatchEvent(event: Event) {
      eventHandlers.get(event.type)?.forEach((handler) => handler());
      return true;
    },
    addEventListener(type: string, handler: () => void) {
      if (!eventHandlers.has(type)) {
        eventHandlers.set(type, new Set());
      }

      eventHandlers.get(type)!.add(handler);
    },
    removeEventListener(type: string, handler: () => void) {
      eventHandlers.get(type)?.delete(handler);
    },
  } as unknown as Window & typeof globalThis.window;

  return storage;
}

afterEach(() => {
  delete globalThis.window;
});

describe("portal-recents", () => {
  test("ignora home e preserva a ordem dos itens mais recentes", () => {
    const storage = installWindowMock();
    const userId = "user-1";

    trackPortalRecent(userId, {
      id: "home",
      href: "/home",
      label: "Home",
      description: "Launcher geral e atalhos do portal",
      group: "Conta",
      iconKey: "home",
      kind: "page",
    });
    trackPortalRecent(userId, {
      id: "/vct",
      href: "/vct",
      label: "VCT",
      description: "Area principal do VCT",
      group: "Jogos",
      iconKey: "vct",
      kind: "page",
    });
    trackPortalRecent(userId, {
      id: "/logs",
      href: "/logs",
      label: "Logs",
      description: "Observabilidade e historico de eventos",
      group: "Operacao",
      iconKey: "logs",
      kind: "resource",
    });

    const recents = readPortalRecents(userId);

    expect(recents.map((item) => item.id)).toEqual(["logs", "/vct"]);
    expect(storage.get(getPortalRecentsKey(userId))).toContain('"id":"logs"');
    expect(storage.get(getPortalRecentsKey(userId))).not.toContain('"home"');
  });

  test("permite fixar um recente e mantem o fixado no topo", () => {
    installWindowMock();
    const userId = "user-2";

    trackPortalRecent(userId, {
      id: "/vct",
      href: "/vct",
      label: "VCT",
      description: "Area principal do VCT",
      group: "Jogos",
      iconKey: "vct",
      kind: "page",
    });
    trackPortalRecent(userId, {
      id: "logs",
      href: "/logs",
      label: "Logs",
      description: "Observabilidade e historico de eventos",
      group: "Operacao",
      iconKey: "logs",
      kind: "resource",
    });

    togglePortalRecentPin(userId, "/vct");

    const recents = readPortalRecents(userId);

    expect(recents[0]?.id).toBe("/vct");
    expect(recents[0]?.pinned).toBe(true);
    expect(recents[1]?.id).toBe("logs");
  });

  test("colapsa logs raiz e logs de projeto em um unico recente", () => {
    installWindowMock();
    const userId = "user-3";

    trackPortalRecent(userId, {
      id: "/logs",
      href: "/logs",
      label: "Logs",
      description: "Observabilidade e historico de eventos",
      group: "Operacao",
      iconKey: "logs",
      kind: "resource",
    });
    trackPortalRecent(userId, {
      id: "/logs/portal-aluno",
      href: "/logs/portal-aluno",
      label: "Logs",
      description: "Projeto selecionado: portal-aluno",
      group: "Logs / Portal aluno",
      iconKey: "logs",
      kind: "resource",
    });

    const recents = readPortalRecents(userId);

    expect(recents).toHaveLength(1);
    expect(recents[0]?.id).toBe("logs");
    expect(recents[0]?.href).toBe("/logs/portal-aluno");
    expect(recents[0]?.group).toBe("Logs / Portal aluno");
  });
});
