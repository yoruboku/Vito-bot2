// services/gemini_api.js
import axios from "axios";
import { EmbedBuilder } from "discord.js";
import CONFIG from "../config.js";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

export async function geminiAPIChat(prompt, context) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  const res = await axios.post(`${GEMINI_URL}?key=${CONFIG.geminiApiKey}`, body);

  const text =
    res.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "No response from Gemini API.";

  if (context?.cancelled) return null;

  return new EmbedBuilder()
    .setColor(0x01308c)
    .setTitle("Vito-bot")
    .setDescription(text)
    .setFooter({ text: "Mode: Gemini API" })
    .setTimestamp();
}
