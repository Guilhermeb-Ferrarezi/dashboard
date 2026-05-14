import { Schema } from "mongoose";
import Mongoose from "mongoose";

export interface IAdminAccessToken extends Mongoose.Document {
  adminId: string;
  type: string;
  label: string;
  tokenHash: string;
  encryptedToken?: string | null;
  revokedAt?: Date | null;
  lastUsedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const AdminAccessTokenSchema = new Schema<IAdminAccessToken>(
  {
    adminId: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    label: { type: String, required: true, trim: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    encryptedToken: { type: String, default: null, select: false },
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

AdminAccessTokenSchema.index({ adminId: 1, type: 1, revokedAt: 1 });

export const AdminAccessToken = Mongoose.model<IAdminAccessToken>(
  "AdminAccessToken",
  AdminAccessTokenSchema,
);
