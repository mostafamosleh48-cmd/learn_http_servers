import argon2 from "argon2";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Request } from "express";
import { UnauthorizedError } from "./errors.js";
import crypto from "crypto";


export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password);
}

export async function checkPasswordHash(
  password: string,
  hash: string,
): Promise<boolean> {
  return await argon2.verify(hash, password);
}


export function makeJWT(userID: string, expiresIn: number, secret: string): string {
  const iat = Math.floor(Date.now() / 1000); 
  
  const payload: Pick<JwtPayload, "iss" | "sub" | "iat" | "exp"> = {
    iss: "chirpy",        
    sub: userID,            
    iat: iat,                
    exp: iat + expiresIn,    
  };

  return jwt.sign(payload, secret);
}


export function validateJWT(tokenString: string, secret: string): string {
  try {
    const decoded = jwt.verify(tokenString, secret) as JwtPayload;
    if (!decoded.sub) {
      throw new UnauthorizedError("Invalid token payload");
    }
    return decoded.sub;
  } catch (err) {
  
    throw new UnauthorizedError("Unauthorized: Invalid or expired token");
  }
}

export function getBearerToken(req: Request): string {
  const authHeader = req.get("Authorization"); 
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  return authHeader.replace("Bearer ", "").trim();
}

export function makeRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex"); // 32 byte = 256 bit
}

export function getAPIKey(req: Request): string {
  const authHeader = req.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("ApiKey ")) {
   
    return "";
  }

  return authHeader.replace("ApiKey ", "").trim();
}