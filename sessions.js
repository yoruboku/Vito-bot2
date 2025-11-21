// sessions.js
import fs from "fs";
import path from "path";

const BASE_DIR = path.join(process.cwd(), "gem-cli-chats");
if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR, { recursive: true });

const sessions = new Map(); // userId -> sessionDir

export function newSessionForUser(userId, username) {
  const safeName = username.replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  const dir = path.join(BASE_DIR, `${safeName}_${stamp}`);
  fs.mkdirSync(dir, { recursive: true });
  sessions.set(userId, dir);
  return dir;
}

export function getSessionDir(userId) {
  if (!sessions.has(userId)) {
    // lazy session
    const dir = path.join(BASE_DIR, `${userId}_default`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    sessions.set(userId, dir);
  }
  return sessions.get(userId);
}
