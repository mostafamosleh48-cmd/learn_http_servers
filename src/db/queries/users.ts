import { db } from "../index.js";
import { NewUser, users } from "../schema.js";
import { eq } from "drizzle-orm";

export async function createUser(user: NewUser) {
  const [result] = await db
    .insert(users)
    .values(user)
    .onConflictDoNothing()
    .returning();
  return result;
}

export async function deleteAllUsers() {
  await db.delete(users);
}
// دالة البحث بالبريد الإلكتروني
export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}
export async function updateUser(id: string, email: string, hashedPassword: string) {
  const [result] = await db
    .update(users)
    .set({ 
      email: email, 
      hashedPassword: hashedPassword,
      updatedAt: new Date() 
    })
    .where(eq(users.id, id))
    .returning();
  return result;
}
export async function upgradeUser(id: string) {
  const [result] = await db
    .update(users)
    .set({ isChirpyRed: true })
    .where(eq(users.id, id))
    .returning();
  return result;
}