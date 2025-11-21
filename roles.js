// roles.js
import fs from "fs";

const ROLES_FILE = "./roles.json";

let roles = {
  creator: "yoruboku",
  admins: [],
  everyone: []
};

export function loadRoles() {
  if (fs.existsSync(ROLES_FILE)) {
    const data = JSON.parse(fs.readFileSync(ROLES_FILE, "utf8"));
    roles = { ...roles, ...data };
  } else {
    fs.writeFileSync(ROLES_FILE, JSON.stringify(roles, null, 2));
  }
}

export function getUserRole(username) {
  if (username === roles.creator) return "creator";
  if (roles.admins.includes(username)) return "admin";
  return "everyone";
}

export function getPriority(role) {
  if (role === "creator") return 3;
  if (role === "admin") return 2;
  return 1;
}
