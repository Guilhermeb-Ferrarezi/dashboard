import { builder } from "./builder";

// Types
import "./types/user";
import "./types/project";
import "./types/dashboard";
import "./types/corujao";
import "./types/vct";

// Queries
import "./queries/user";
import "./queries/project";
import "./queries/dashboard";
import "./queries/corujao";
import "./queries/vct";

// Mutations
import "./mutations/user";
import "./mutations/corujao";
import "./mutations/vct";

// Subscriptions — registra o tipo antes de exportar o schema
builder.subscriptionType({});
import "./subscriptions/health";
import "./subscriptions/vagas";

export const schema = builder.toSchema();
