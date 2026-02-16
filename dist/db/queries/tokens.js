// src/db/queries/tokens.ts
import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { refreshTokens } from "../schema.js";
export async function saveRefreshToken(data) {
    await db.insert(refreshTokens).values(data);
}
export async function getRefreshToken(token) {
    const [result] = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.token, token))
        .limit(1);
    return result;
}
export async function revokeRefreshToken(token) {
    await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.token, token));
}
