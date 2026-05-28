import { builder } from "../builder";

export interface ProjectShape {
  id: string;
  name: string;
  displayName?: string | null;
}

export interface LogEntryShape {
  id: string;
  level: string;
  message: string;
  occurredAt: string | Date;
}

export interface LogPageShape {
  items: LogEntryShape[];
  total: number;
  page: number;
  limit: number;
}

export const ProjectRef = builder.objectRef<ProjectShape>("Project");
export const LogEntryRef = builder.objectRef<LogEntryShape>("LogEntry");
export const LogPageRef = builder.objectRef<LogPageShape>("LogPage");

builder.objectType(ProjectRef, {
  fields: (t) => ({
    id: t.exposeString("id"),
    name: t.exposeString("name"),
    displayName: t.string({ nullable: true, resolve: (p) => p.displayName ?? null }),
  }),
});

builder.objectType(LogEntryRef, {
  fields: (t) => ({
    id: t.exposeString("id"),
    level: t.exposeString("level"),
    message: t.exposeString("message"),
    occurredAt: t.field({ type: "Date", resolve: (l) => new Date(l.occurredAt) }),
  }),
});

builder.objectType(LogPageRef, {
  fields: (t) => ({
    items: t.field({ type: [LogEntryRef], resolve: (p) => p.items }),
    total: t.exposeInt("total"),
    page: t.exposeInt("page"),
    limit: t.exposeInt("limit"),
  }),
});
