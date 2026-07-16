import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError.js";

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ detail: error.message });
  }

  if (error instanceof Error && error.name === "ZodError") {
    return res.status(422).json({ detail: JSON.parse(error.message) });
  }

  console.error(error);
  return res.status(500).json({ detail: "Internal server error" });
}
