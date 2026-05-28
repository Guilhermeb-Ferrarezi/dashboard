import { builder } from "../builder";
import { VagasPayloadRef, type VagasPayloadShape } from "../types/corujao";
import { getVagasPayload } from "../../lib/vagas-sse";

builder.subscriptionField("vagasUpdate", (t) =>
  t.field({
    type: VagasPayloadRef,
    nullable: true,
    subscribe: () =>
      (async function* () {
        while (true) {
          const payload = await getVagasPayload();
          yield payload;
          await new Promise<void>((resolve) => setTimeout(resolve, 5_000));
        }
      })(),
    resolve: (payload: VagasPayloadShape | null) => payload,
  }),
);
