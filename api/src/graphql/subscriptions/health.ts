import { builder } from "../builder";

interface HealthPingShape {
  serverTs: number;
}

const HealthPingRef = builder.objectRef<HealthPingShape>("HealthPing");

builder.objectType(HealthPingRef, {
  fields: (t) => ({
    serverTs: t.exposeFloat("serverTs"),
  }),
});

export async function* healthPingGenerator() {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    while (true) {
      yield { serverTs: Date.now() };
      await new Promise<void>((resolve) => {
        timeoutId = setTimeout(resolve, 30_000);
      });
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

builder.subscriptionField("healthPing", (t) =>
  t.field({
    type: HealthPingRef,
    subscribe: () => healthPingGenerator(),
    resolve: (payload: HealthPingShape) => payload,
  }),
);
