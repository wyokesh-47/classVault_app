import type { RequestHandler } from "express";
import { ApiError } from "../errors";
import { supabase } from "../supabase";

export const requireAuth: RequestHandler = async (request, _response, next) => {
  const authorization = request.header("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    next(new ApiError(401, "UNAUTHENTICATED", "A Supabase access token is required."));
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    next(new ApiError(401, "INVALID_TOKEN", "The Supabase access token is invalid or expired."));
    return;
  }

  request.user = data.user;
  next();
};
