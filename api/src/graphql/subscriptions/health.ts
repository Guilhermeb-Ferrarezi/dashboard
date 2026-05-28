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

builder.subscriptionField("healthPing", (t) =>
  t.field({
    type: HealthPingRef,
    subscribe: () =>
      (async function* () {
        while (true) {
          yield { serverTs: Date.now() };
          await new Promise<void>((resolve) => setTimeout(resolve, 30_000));
        }
      })(),
    resolve: (payload: HealthPingShape) => payload,
  }),
);
