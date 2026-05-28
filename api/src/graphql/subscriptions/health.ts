import { Repeater } from "@repeaterjs/repeater";
import { builder } from "../builder";

interface HealthPingShape {
  serverTs: number;
}

const HealthPingRef = builder.objectRef<HealthPingShape>("HealthPing");

builder.objectType(HealthPingRef, {
  fields: (t) => ({
    serverTs: t.exposeInt("serverTs"),
  }),
});

export function healthPingGenerator(): Repeater<HealthPingShape> {
  return new Repeater<HealthPingShape>(async (push, stop) => {
    await push({ serverTs: Date.now() });
    const interval = setInterval(() => void push({ serverTs: Date.now() }), 30_000);
    await stop;
    clearInterval(interval);
  });
}

builder.subscriptionField("healthPing", (t) =>
  t.field({
    type: HealthPingRef,
    subscribe: () => healthPingGenerator(),
    resolve: (payload: HealthPingShape) => payload,
  }),
);
