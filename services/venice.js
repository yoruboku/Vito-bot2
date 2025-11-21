// services/venice.js
import axios from "axios";
import { EmbedBuilder } from "discord.js";
import CONFIG from "../config.js";

// Adjust base URL & model to match your Venice.ai account/docs.
const VENICE_BASE_URL = "https://api.venice.ai/v1/chat/completions";
const VENICE_MODEL = "venice-uncensored";

export async function veniceChat(prompt, context) {
  const res = await axios.post(
    VENICE_BASE_URL,
    {
      model: VENICE_MODEL,
      messages: [{ role: "user", content: prompt }]
    },
    {
      headers: {
        Authorization: `Bearer ${CONFIG.veniceApiKey}`
      }
    }
  );

  const text = res.data?.choices?.[0]?.message?.content || "No response from Venice.ai.";

  if (context?.cancelled) return null;

  return new EmbedBuilder()
    .setColor(0x01308c)
    .setTitle("Vito-bot")
    .setDescription(text)
    .setFooter({ text: "Mode: Venice.ai" })
    .setTimestamp();
}
