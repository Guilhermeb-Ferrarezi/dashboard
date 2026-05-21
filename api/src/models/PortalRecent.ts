import { Document, Schema } from "mongoose";
import Mongoose from "mongoose";

export interface PortalRecentItemPayload {
  id: string;
  href: string;
  label: string;
  description: string;
  group: string;
  iconKey: string;
  kind: "page" | "resource";
  pinned: boolean;
  updatedAt: number;
}

export interface IPortalRecent extends Document {
  userId: string;
  items: PortalRecentItemPayload[];
  updatedAt: Date;
}

const PortalRecentItemSchema = new Schema<PortalRecentItemPayload>(
  {
    id: { type: String, required: true },
    href: { type: String, required: true },
    label: { type: String, required: true },
    description: { type: String, default: "" },
    group: { type: String, default: "" },
    iconKey: { type: String, default: "sparkles" },
    kind: { type: String, enum: ["page", "resource"], default: "page" },
    pinned: { type: Boolean, default: false },
    updatedAt: { type: Number, required: true },
  },
  { _id: false },
);

const PortalRecentSchema = new Schema<IPortalRecent>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    items: { type: [PortalRecentItemSchema], default: [] },
  },
  { timestamps: true },
);

export default Mongoose.models.PortalRecent ||
  Mongoose.model<IPortalRecent>("PortalRecent", PortalRecentSchema);
