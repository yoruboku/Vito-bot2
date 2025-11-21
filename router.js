// router.js
import CONFIG from "./config.js";
import { geminiAPIChat } from "./services/gemini_api.js";
import { geminiCLIChat } from "./services/gemini_cli.js";
import { veniceChat } from "./services/venice.js";
import { getSessionDir } from "./sessions.js";

export async function routeAIRequest({ content, role, user, context }) {
  let prompt = content.trim();

  // notnice -> Venice.ai, only while Gemini API tier is active
  if (prompt.toLowerCase().startsWith("notnice")) {
    if (!CONFIG.geminiQuotaActive) {
      return basicTextEmbed(
        "Vito-bot",
        "The Venice /notnice feature is disabled because Gemini API free tier is over."
      );
    }
    prompt = prompt.slice("notnice".length).trim();
    return veniceChat(prompt, context);
  }

  // archboku -> Gemini CLI with “do stuff on PC” permission, admins + creator only
  if (prompt.toLowerCase().startsWith("archboku")) {
    if (!(role === "creator" || role === "admin")) {
      return basicTextEmbed(
        "Vito-bot",
        "Only creator and admins can use /archboku commands."
      );
    }
    prompt = prompt.slice("archboku".length).trim();
    const sessionDir = getSessionDir(user.id);
    return geminiCLIChat(prompt, sessionDir, "archboku", context);
  }

  // Normal chat: Gemini API if active, else Gemini CLI
  if (CONFIG.geminiQuotaActive) {
    return geminiAPIChat(prompt, context);
  } else {
    const sessionDir = getSessionDir(user.id);
    return geminiCLIChat(prompt, sessionDir, "normal", context);
  }
}

function basicTextEmbed(title, text) {
  return {
    data: {
      title,
      description: text,
      color: 0x01308c
    }
  };
}
