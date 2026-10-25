export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type SupabaseDatabaseError = {
  code?: string;
  message?: string;
};

export function throwDatabaseError(error?: SupabaseDatabaseError | null): never {
  const code = error?.code ?? "UNKNOWN";
  console.error("Supabase database request failed.", {
    code,
    message: error?.message ?? "No database error details were provided.",
  });

  if (code === "42P01" || code === "PGRST205") {
    throw new ApiError(
      503,
      "DATABASE_SCHEMA_MISSING",
      "ClassVault database tables are missing. Apply database/schema.sql and both database migrations in Supabase SQL Editor, then restart the backend."
    );
  }

  if (code === "42703" || code === "PGRST204" || code === "PGRST200") {
    throw new ApiError(
      503,
      "DATABASE_SCHEMA_OUTDATED",
      "ClassVault database schema is incomplete or stale. Apply database/schema.sql and both database migrations in Supabase SQL Editor, then restart the backend."
    );
  }

  if (code === "42501" || code === "PGRST301" || code === "PGRST302") {
    throw new ApiError(
      503,
      "DATABASE_PERMISSION_ERROR",
      "Supabase denied the database request. Check the backend SUPABASE_SECRET_KEY and make sure it is a server-side secret key."
    );
  }

  if (code === "UNKNOWN") {
    throw new ApiError(503, "DATABASE_ERROR", "The backend could not complete a Supabase database request. Check the backend log for details.");
  }

  throw new ApiError(
    503,
    "DATABASE_ERROR",
    `Supabase rejected the database request (code ${code}). Check the backend log for details.`
  );
}

export function getRequiredUserId(userId: string | undefined): string {
  if (!userId) {
    throw new ApiError(401, "UNAUTHENTICATED", "Sign in to access this resource.");
  }
  return userId;
}
