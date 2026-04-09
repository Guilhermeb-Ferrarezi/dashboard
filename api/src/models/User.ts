import { Document, Schema } from "mongoose";
import Mongoose from "mongoose";

export interface IUser extends Document {
  username: string;
  email?: string | null;
  password: string;
  role: "user" | "admin";
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true },
);

export const User = Mongoose.model<IUser>("User", UserSchema);
