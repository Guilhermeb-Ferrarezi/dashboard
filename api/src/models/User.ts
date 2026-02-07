import { Schema, Document } from "mongoose";
import Mongoose from "mongoose";

export interface IUser extends Document {
  username: string;
  password: string;
  role: "user" | "admin";
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
});

export const User = Mongoose.model<IUser>("User", UserSchema);
