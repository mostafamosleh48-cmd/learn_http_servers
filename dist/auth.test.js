import { describe, it, expect } from "vitest";
import { hashPassword, checkPasswordHash, makeJWT, validateJWT } from "./auth.js";
describe("Security Functions", () => {
    const secret = "supersecretkey";
    const userID = "123-abc";
    describe("Password Hashing", () => {
        it("should verify correct password", async () => {
            const hash = await hashPassword("pass123");
            const match = await checkPasswordHash("pass123", hash);
            expect(match).toBe(true);
        });
    });
    describe("JWT Operations", () => {
        it("should create and validate a valid JWT", () => {
            const token = makeJWT(userID, 3600, secret);
            const decodedID = validateJWT(token, secret);
            expect(decodedID).toBe(userID);
        });
        it("should reject JWT with wrong secret", () => {
            const token = makeJWT(userID, 3600, secret);
            expect(() => validateJWT(token, "wrong-secret")).toThrow();
        });
        it("should reject expired JWT", () => {
            // إنشاء رمز منتهي الصلاحية (مدة بقاء 0 ثانية)
            const token = makeJWT(userID, -10, secret);
            expect(() => validateJWT(token, secret)).toThrow();
        });
    });
});
