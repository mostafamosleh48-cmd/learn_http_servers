import type { MigrationConfig } from "drizzle-orm/migrator";

process.loadEnvFile();

function envOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Missing environment variable: ${key}`);
  }
  return value;
}


type DBConfig = {
  url: string;
  migrationConfig: MigrationConfig;
};

export type APIConfig = {
  fileserverHits: number;
  platform: string;
  jwtSecret: string;
  polkaKey: string;
};


export const config = {
  api: {
    fileserverHits: 0,
    platform: envOrThrow("PLATFORM"),
    jwtSecret: envOrThrow("JWT_SECRET"),
    polkaKey: envOrThrow("POLKA_KEY"),
  } as APIConfig,
  db: {
    url: envOrThrow("DB_URL"),
    migrationConfig: {
      migrationsFolder: "./src/db/migrations",
    },
  } as DBConfig,
};