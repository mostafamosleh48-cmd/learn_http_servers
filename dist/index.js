import express from "express";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { config } from "./config.js";
import { ApiError, BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError, } from "./errors.js";
import { createUser, deleteAllUsers, getUserByEmail, updateUser, upgradeUser, } from "./db/queries/users.js";
import { deleteChirp, getChirpById, getChirps, createChirp, } from "./db/queries/chirps.js";
import { getAPIKey, hashPassword, checkPasswordHash } from "./auth.js";
import { makeRefreshToken, getBearerToken, validateJWT, makeJWT, } from "./auth.js";
import { saveRefreshToken, getRefreshToken, revokeRefreshToken, } from "./db/queries/tokens.js";
const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);
console.log("✅ Database is up-to-date!");
const app = express();
const port = 8080;
app.use(express.json());
function cleanBody(text) {
    const profaneWords = ["kerfuffle", "sharbert", "fornax"];
    return text
        .split(" ")
        .map((word) => (profaneWords.includes(word.toLowerCase()) ? "****" : word))
        .join(" ");
}
async function handlerPolkaWebhook(req, res, next) {
    try {
        const apiKey = getAPIKey(req);
        if (apiKey !== config.api.polkaKey) {
            return res.status(401).send();
        }
        const { event, data } = req.body;
        if (event !== "user.upgraded") {
            return res.status(204).send();
        }
        const user = await upgradeUser(data.userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        return res.status(204).send();
    }
    catch (err) {
        next(err);
    }
}
async function handlerDeleteChirp(req, res, next) {
    try {
        const token = getBearerToken(req);
        const userId = validateJWT(token, config.api.jwtSecret);
        const { chirpId } = req.params;
        const chirp = await getChirpById(chirpId);
        if (!chirp) {
            throw new NotFoundError("Chirp not found");
        }
        if (chirp.userId !== userId) {
            throw new ForbiddenError("You are not the author of this chirp");
        }
        await deleteChirp(chirpId);
        return res.status(204).send();
    }
    catch (err) {
        next(err);
    }
}
async function handlerUpdateUser(req, res, next) {
    try {
        const token = getBearerToken(req);
        const userId = validateJWT(token, config.api.jwtSecret);
        const { email, password } = req.body;
        if (!email || !password) {
            throw new BadRequestError("Email and password are required");
        }
        const hashedPassword = await hashPassword(password);
        const updatedUser = await updateUser(userId, email, hashedPassword);
        if (!updatedUser) {
            throw new NotFoundError("User not found");
        }
        const { hashedPassword: _, ...userResponse } = updatedUser;
        return res.status(200).json(userResponse);
    }
    catch (err) {
        next(err);
    }
}
async function handlerCreateUser(req, res, next) {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            throw new BadRequestError("Email and password required");
        const hashedPassword = await hashPassword(password);
        const user = await createUser({ email, hashedPassword });
        const { hashedPassword: _, ...userResponse } = user;
        res.status(201).json(userResponse);
    }
    catch (err) {
        next(err);
    }
}
async function handlerLogin(req, res, next) {
    try {
        const { email, password } = req.body;
        const user = await getUserByEmail(email);
        if (!user || !(await checkPasswordHash(password, user.hashedPassword))) {
            throw new UnauthorizedError("incorrect email or password");
        }
        const accessToken = makeJWT(user.id, 3600, config.api.jwtSecret);
        const refreshToken = makeRefreshToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 60);
        await saveRefreshToken({ token: refreshToken, userId: user.id, expiresAt });
        const { hashedPassword: _, ...userResponse } = user;
        res.status(200).json({ ...userResponse, token: accessToken, refreshToken });
    }
    catch (err) {
        next(err);
    }
}
async function handlerRefresh(req, res, next) {
    try {
        const tokenStr = getBearerToken(req);
        const storedToken = await getRefreshToken(tokenStr);
        if (!storedToken ||
            storedToken.revokedAt ||
            storedToken.expiresAt < new Date()) {
            throw new UnauthorizedError("Invalid, expired, or revoked refresh token");
        }
        const newToken = makeJWT(storedToken.userId, 3600, config.api.jwtSecret);
        res.status(200).json({ token: newToken });
    }
    catch (err) {
        next(err);
    }
}
async function handlerRevoke(req, res, next) {
    try {
        const tokenStr = getBearerToken(req);
        await revokeRefreshToken(tokenStr);
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
}
async function handlerCreateChirp(req, res, next) {
    try {
        const token = getBearerToken(req);
        const userId = validateJWT(token, config.api.jwtSecret);
        const { body } = req.body;
        if (!body || body.length > 140) {
            throw new BadRequestError("Chirp is too long");
        }
        const chirp = await createChirp({
            body: cleanBody(body),
            userId: userId,
        });
        res.status(201).json(chirp);
    }
    catch (err) {
        next(err);
    }
}
async function handlerGetChirpById(req, res, next) {
    try {
        const { chirpId } = req.params;
        if (typeof chirpId !== "string") {
            throw new BadRequestError("Invalid chirpId format");
        }
        const chirp = await getChirpById(chirpId);
        if (!chirp) {
            return res.status(404).json({ error: "Chirp not found" });
        }
        return res.status(200).json(chirp);
    }
    catch (err) {
        next(err);
    }
}
async function handlerGetChirps(req, res, next) {
    try {
        const authorIdQuery = req.query.authorId;
        const sortQuery = req.query.sort;
        let authorId = undefined;
        if (typeof authorIdQuery === "string") {
            authorId = authorIdQuery;
        }
        const chirpsList = await getChirps(authorId);
        if (sortQuery === "desc") {
            chirpsList.reverse();
        }
        return res.status(200).json(chirpsList);
    }
    catch (err) {
        next(err);
    }
}
async function handlerReset(req, res, next) {
    console.log("📥 Received Reset Request...");
    try {
        const currentPlatform = config.api.platform.replace(/['"]+/g, "").trim();
        if (currentPlatform !== "dev") {
            console.log(` Reset denied. Platform is: ${currentPlatform}`);
            throw new ForbiddenError("Only allowed in dev environment");
        }
        config.api.fileserverHits = 0;
        await deleteAllUsers();
        console.log(" Reset successful!");
        return res
            .status(200)
            .set("Content-Type", "text/plain; charset=utf-8")
            .send("OK");
    }
    catch (err) {
        console.error(" Reset error:", err);
        next(err);
    }
}
function handlerMetrics(req, res) {
    return res.status(200).set("Content-Type", "text/html; charset=utf-8").send(`
<html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.api.fileserverHits} times!</p>
  </body>
</html>
  `);
}
// --- 3. Routes ---
app.get("/api/healthz", (req, res) => res.status(200).send("OK"));
app.post("/api/users", handlerCreateUser);
app.put("/api/users", handlerUpdateUser);
app.post("/admin/reset", handlerReset);
app.get("/admin/metrics", handlerMetrics);
app.post("/api/chirps", handlerCreateChirp);
app.get("/api/chirps", handlerGetChirps);
app.get("/api/chirps/:chirpId", handlerGetChirpById);
app.delete("/api/chirps/:chirpId", handlerDeleteChirp);
app.post("/api/login", handlerLogin);
app.post("/api/refresh", handlerRefresh);
app.post("/api/revoke", handlerRevoke);
app.post("/api/polka/webhooks", handlerPolkaWebhook);
app.use("/app", (req, res, next) => {
    config.api.fileserverHits++;
    next();
}, express.static("./src/app"));
app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("🔥 Internal Error:", err);
    res.status(500).json({ error: "Something went wrong on our end" });
});
app.listen(port, () => console.log(`🚀 Server running on http://localhost:${port}`));
