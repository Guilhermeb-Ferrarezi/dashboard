import SchemaBuilder from "@pothos/core";
import type { AuthUserPayload } from "../types/hono";

export type GraphQLContext = {
  user: AuthUserPayload | null;
};

export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  Scalars: {
    Date: { Input: Date; Output: Date };
  };
}>({});

builder.scalarType("Date", {
  serialize: (value) => (value instanceof Date ? value.toISOString() : String(value)),
  parseValue: (value) => new Date(String(value)),
});

// Sem queries ou mutations ainda — registrar um placeholder para o schema compilar
builder.queryType({});
builder.mutationType({});
