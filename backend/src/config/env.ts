import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET ?? process.env.SECRET_KEY ?? "dev-secret-key-change-me",
  accessTokenMinutes: Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES ?? 20),
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_EXPIRE_DAYS ?? 7),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is required");
}
