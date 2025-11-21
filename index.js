// index.js
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Partials
} from "discord.js";
import CONFIG from "./config.js";
import { loadRoles, getUserRole, getPriority } from "./roles.js";
import { newSessionForUser } from "./sessions.js";
import { routeAIRequest } from "./router.js";

loadRoles();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const PREFIX = "/mention";

let statusMessageId = null;
let statusChannel = null;

// Simple queue + preemption
const queue = [];
let processing = false;
let currentContext = null;
let currentJobMessage = null;

function processQueue() {
  if (processing) return;
  if (queue.length === 0) return;
  processing = true;

  (async () => {
    try {
      // pick highest priority job
      let bestIndex = 0;
      for (let i = 1; i < queue.length; i++) {
        if (getPriority(queue[i].role) > getPriority(queue[bestIndex].role)) {
          bestIndex = i;
        }
      }

      const job = queue.splice(bestIndex, 1)[0];
      const { message, role, content } = job;
      const context = { cancelled: false, cliProcess: null, role };

      currentContext = context;
      currentJobMessage = message;

      const embed = await routeAIRequest({
        content,
        role,
        user: message.author,
        context
      });

      if (!context.cancelled && embed) {
        await message.reply({
          content: `<@${message.author.id}>`,
          embeds: embed.data ? [new EmbedBuilder(embed.data)] : [embed]
        });
      }
    } catch (err) {
      console.error("Error in processQueue:", err);
      if (currentJobMessage) {
        await currentJobMessage.reply(
          "Something went wrong while processing your request."
        );
      }
    } finally {
      currentContext = null;
      currentJobMessage = null;
      processing = false;
      if (queue.length > 0) processQueue();
    }
  })();
}

function enqueueJob(message, role, content) {
  queue.push({ message, role, content });
  processQueue();
}

client.once("ready", async () => {
  console.log(`Vito-bot online as ${client.user.tag}`);

  try {
    statusChannel = await client.channels.fetch(CONFIG.statusChannelId);
    const embed = new EmbedBuilder()
      .setTitle("Vito-bot")
      .setDescription("AI Core Online")
      .setColor(0x01308c)
      .addFields(
        { name: "Mode", value: "Idle", inline: true },
        { name: "Latency", value: "-- ms", inline: true }
      )
      .setFooter({ text: "Cyber Interface Active" })
      .setTimestamp();

    const msg = await statusChannel.send({ embeds: [embed] });
    statusMessageId = msg.id;

    setInterval(async () => {
      try {
        const fetched = await statusChannel.messages.fetch(statusMessageId);
        const newEmbed = EmbedBuilder.from(fetched.embeds[0])
          .setFields(
            {
              name: "Mode",
              value: processing ? "Active" : "Idle",
              inline: true
            },
            {
              name: "Latency",
              value: `${Math.round(client.ws.ping)} ms`,
              inline: true
            }
          )
          .setTimestamp();
        await fetched.edit({ embeds: [newEmbed] });
      } catch {
        // ignore
      }
    }, 3000);
  } catch (e) {
    console.error("Failed to setup status panel:", e);
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  let content = message.content.trim();
  let used = false;

  // /mention ...
  if (content.startsWith(PREFIX)) {
    content = content.slice(PREFIX.length).trim();
    used = true;
  } else if (message.mentions.has(client.user)) {
    // @Vito-bot ...
    content = content
      .replace(`<@${client.user.id}>`, "")
      .replace(`<@!${client.user.id}>`, "")
      .trim();
    used = true;
  }

  if (!used || content.length === 0) return;

  const username = message.author.username;
  const role = getUserRole(username);

  // STOP logic
  if (content.toLowerCase() === "stop") {
    if (role === "creator") {
      // creator can stop any current job
      if (currentContext) {
        currentContext.cancelled = true;
        if (currentContext.cliProcess) {
          currentContext.cliProcess.kill("SIGTERM");
        }
        await message.reply("All active processes stopped by creator.");
      } else {
        await message.reply("No active processes to stop.");
      }
    } else {
      // non-creator can only stop their own job, and never creator's
      if (currentJobMessage && currentJobMessage.author.id === message.author.id) {
        if (currentContext && currentContext.role !== "creator") {
          currentContext.cancelled = true;
          if (currentContext.cliProcess) {
            currentContext.cliProcess.kill("SIGTERM");
          }
          await message.reply("Your current request has been stopped.");
        } else {
          await message.reply("You cannot stop the creator.");
        }
      } else {
        await message.reply("You have no active request to stop.");
      }
    }
    return;
  }

  // NEWCHAT logic
  if (content.toLowerCase() === "newchat") {
    const dir = newSessionForUser(message.author.id, username);
    await message.reply(
      `<@${message.author.id}> started a new clean chat.\nSession folder: \`${dir}\``
    );
    return;
  }

  // Creator preemption: if creator speaks while someone else is running, kill and jump
  if (role === "creator" && currentContext && currentContext.role !== "creator") {
    currentContext.cancelled = true;
    if (currentContext.cliProcess) {
      currentContext.cliProcess.kill("SIGTERM");
    }
  }

  // Queue the job (priority handled inside processQueue)
  enqueueJob(message, role, content);
});

client.login(CONFIG.discordToken);
