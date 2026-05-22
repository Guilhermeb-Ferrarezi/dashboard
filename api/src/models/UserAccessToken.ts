import { Schema } from "mongoose";
import Mongoose from "mongoose";

export interface IUserAccessToken extends Mongoose.Document {
  userId: string;
  type: "account" | "codex";
  label: string;
  tokenHash: string;
  encryptedToken?: string | null;
  permissions: string[];
  expiresAt?: Date | null;
  description: string;
  revokedAt?: Date | null;
  lastUsedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserAccessTokenSchema = new Schema<IUserAccessToken>(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ["account", "codex"], default: "account", index: true },
    label: { type: String, required: true, trim: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    encryptedToken: { type: String, default: null, select: false },
    permissions: { type: [String], default: [] },
    expiresAt: { type: Date, default: null },
    description: { type: String, default: "" },
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

UserAccessTokenSchema.index({ userId: 1, type: 1, revokedAt: 1 });

export const UserAccessToken = Mongoose.model<IUserAccessToken>(
  "UserAccessToken",
  UserAccessTokenSchema,
);
