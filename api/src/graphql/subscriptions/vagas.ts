import { Repeater } from "@repeaterjs/repeater";
import { builder } from "../builder";
import { VagasPayloadRef, type VagasPayloadShape } from "../types/corujao";
import { getVagasPayload } from "../../lib/vagas-sse";

export function vagasUpdateGenerator(): Repeater<VagasPayloadShape | null> {
  return new Repeater<VagasPayloadShape | null>(async (push, stop) => {
    getVagasPayload()
      .then((payload) => push(payload))
      .catch((err) => stop(err instanceof Error ? err : new Error(String(err))));
    const interval = setInterval(() => {
      getVagasPayload()
        .then((payload) => push(payload))
        .catch((err) => stop(err instanceof Error ? err : new Error(String(err))));
    }, 5_000);
    await stop;
    clearInterval(interval);
  });
}

builder.subscriptionField("vagasUpdate", (t) =>
  t.field({
    type: VagasPayloadRef,
    nullable: true,
    subscribe: () => vagasUpdateGenerator(),
    resolve: (payload: VagasPayloadShape | null) => payload,
  }),
);
