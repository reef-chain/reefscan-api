import { Request, Response, NextFunction } from "express";
import config from "./config";
import { StatusError } from "./utils";

export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.body.password || req.body.password !== config.adminPassword) {
    throw new StatusError("Not authorized", 401);
  }
  next();
};
