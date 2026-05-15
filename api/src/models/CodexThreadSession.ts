import { Document, Schema } from "mongoose";
import Mongoose from "mongoose";

export interface ICodexThreadSession extends Document {
  userId: string;
  threadId: string;
  name?: string | null;
  preview?: string | null;
  status?: string | null;
  timeline?: unknown[];
  lastOpenedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const CodexThreadSessionSchema = new Schema<ICodexThreadSession>(
  {
    userId: { type: String, required: true, index: true },
    threadId: { type: String, required: true, unique: true },
    name: { type: String, default: null },
    preview: { type: String, default: null },
    status: { type: String, default: null },
    timeline: { type: [Schema.Types.Mixed], default: [] },
    lastOpenedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

CodexThreadSessionSchema.index({ userId: 1, updatedAt: -1 });

export const CodexThreadSession = Mongoose.model<ICodexThreadSession>(
  "CodexThreadSession",
  CodexThreadSessionSchema,
);
