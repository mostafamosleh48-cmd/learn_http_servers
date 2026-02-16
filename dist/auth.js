import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "./errors.js";
import crypto from "crypto";
export async function hashPassword(password) {
    return await argon2.hash(password);
}
export async function checkPasswordHash(password, hash) {
    return await argon2.verify(hash, password);
}
export function makeJWT(userID, expiresIn, secret) {
    const iat = Math.floor(Date.now() / 1000);
    const payload = {
        iss: "chirpy",
        sub: userID,
        iat: iat,
        exp: iat + expiresIn,
    };
    return jwt.sign(payload, secret);
}
export function validateJWT(tokenString, secret) {
    try {
        const decoded = jwt.verify(tokenString, secret);
        if (!decoded.sub) {
            throw new UnauthorizedError("Invalid token payload");
        }
        return decoded.sub;
    }
    catch (err) {
        throw new UnauthorizedError("Unauthorized: Invalid or expired token");
    }
}
export function getBearerToken(req) {
    const authHeader = req.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new UnauthorizedError("Missing or invalid Authorization header");
    }
    return authHeader.replace("Bearer ", "").trim();
}
export function makeRefreshToken() {
    return crypto.randomBytes(32).toString("hex"); // 32 byte = 256 bit
}
export function getAPIKey(req) {
    const authHeader = req.get("Authorization");
    if (!authHeader || !authHeader.startsWith("ApiKey ")) {
        return "";
    }
    return authHeader.replace("ApiKey ", "").trim();
}
