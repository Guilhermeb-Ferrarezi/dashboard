import { Repeater } from "@repeaterjs/repeater";
import { builder } from "../builder";
import { VagasPayloadRef, type VagasPayloadShape } from "../types/corujao";
import { getVagasPayload } from "../../lib/vagas-sse";

export function vagasUpdateGenerator(): Repeater<VagasPayloadShape | null> {
  return new Repeater<VagasPayloadShape | null>(async (push, stop) => {
    void push(await getVagasPayload());
    const interval = setInterval(async () => {
      void push(await getVagasPayload());
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
