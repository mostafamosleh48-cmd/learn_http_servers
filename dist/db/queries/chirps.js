// src/db/queries/chirps.ts
import { db } from "../index.js";
import { chirps } from "../schema.js";
import { asc, eq } from "drizzle-orm";
export async function createChirp(chirp) {
    const [result] = await db
        .insert(chirps)
        .values(chirp)
        .returning();
    return result;
}
export async function getChirps(authorId) {
    let query = db.select().from(chirps);
    if (authorId) {
        return await query
            .where(eq(chirps.userId, authorId))
            .orderBy(asc(chirps.createdAt));
    }
    return await query.orderBy(asc(chirps.createdAt));
}
export async function getChirpById(id) {
    const [result] = await db
        .select()
        .from(chirps)
        .where(eq(chirps.id, id))
        .limit(1);
    return result;
}
export async function deleteChirp(id) {
    await db
        .delete(chirps)
        .where(eq(chirps.id, id));
}
