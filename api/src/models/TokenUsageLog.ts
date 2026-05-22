import { Schema } from "mongoose";
import Mongoose from "mongoose";

export interface ITokenUsageLog extends Mongoose.Document {
  tokenId: string;
  tokenHash: string;
  ownerType: "user" | "admin";
  ownerId: string;
  method: string;
  path: string;
  ip: string | null;
  userAgent: string | null;
  usedAt: Date;
}

const TokenUsageLogSchema = new Schema<ITokenUsageLog>(
  {
    tokenId:   { type: String, required: true },
    tokenHash: { type: String, required: true },
    ownerType: { type: String, required: true, enum: ["user", "admin"] },
    ownerId:   { type: String, required: true },
    method:    { type: String, required: true },
    path:      { type: String, required: true },
    ip:        { type: String, default: null },
    userAgent: { type: String, default: null },
    usedAt:    { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: false },
);

TokenUsageLogSchema.index({ tokenId: 1, usedAt: -1 });
// TTL: auto-deletar registros após 90 dias
TokenUsageLogSchema.index({ usedAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

export const TokenUsageLog = Mongoose.model<ITokenUsageLog>(
  "TokenUsageLog",
  TokenUsageLogSchema,
);
