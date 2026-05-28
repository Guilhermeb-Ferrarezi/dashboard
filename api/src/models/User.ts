import { Document, Schema } from "mongoose";
import Mongoose from "mongoose";

import {
  DEFAULT_THEME_PREFERENCES,
  type ThemePreferences,
} from "../lib/theme-preferences";

export interface IUser extends Document {
  authUserId?: number;
  username: string;
  email?: string | null;
  password?: string;
  role: "user" | "admin";
  preferences?: ThemePreferences;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    authUserId: { type: Number, unique: true, sparse: true },
    username: { type: String, required: true, unique: true },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    preferences: {
      mode: {
        type: String,
        enum: ["light", "dark", "system", "onix"],
        default: DEFAULT_THEME_PREFERENCES.mode,
      },
      accent: {
        type: String,
        enum: ["ember", "sky", "emerald", "violet", "custom"],
        default: DEFAULT_THEME_PREFERENCES.accent,
      },
      customAccentColor: {
        type: String,
        default: DEFAULT_THEME_PREFERENCES.customAccentColor,
      },
      radius: {
        type: String,
        enum: ["sm", "md", "lg"],
        default: DEFAULT_THEME_PREFERENCES.radius,
      },
      density: {
        type: String,
        enum: ["compact", "comfortable", "spacious"],
        default: DEFAULT_THEME_PREFERENCES.density,
      },
    },
  },
  { timestamps: true },
);

export const User = Mongoose.model<IUser>("User", UserSchema);
