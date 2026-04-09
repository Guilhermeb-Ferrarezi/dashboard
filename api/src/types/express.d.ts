import "express";

export interface AuthUserPayload {
  id: string;
  username: string;
  email?: string | null;
  role: "user" | "admin";
  exp?: number;
  iat?: number;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUserPayload;
  }
}
