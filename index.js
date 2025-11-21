// ======================= index.js (Main Controller) =======================
// Core controller for Vito-bot using Node.js
// Handles Discord events, role priority, mode switching, and AI routing

import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { routeAIRequest } from './router.js';
import { getUserRole } from './roles.js';
import CONFIG from './config.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

let statusMessageId = null;

client.once('ready', async () => {
  console.log(`Vito-bot online as ${client.user.tag}`);
  const channel = await client.channels.fetch(CONFIG.statusChannelId);

  const embed = new EmbedBuilder()
    .setTitle('Vito-bot')
    .setDescription('AI Core Online')
    .setColor(0x01308c)
    .addFields(
      { name: 'Mode', value: 'Idle', inline: true },
      { name: 'Latency', value: '-- ms', inline: true }
    )
    .setFooter({ text: 'Cyber Interface Active' })
    .setTimestamp();

  const msg = await channel.send({ embeds: [embed] });
  statusMessageId = msg.id;

  setInterval(async () => {
    try {
      const fetched = await channel.messages.fetch(statusMessageId);
      embed.setFields(
        { name: 'Mode', value: 'Active', inline: true },
        { name: 'Latency', value: `${Math.round(client.ws.ping)} ms`, inline: true }
      );
      await fetched.edit({ embeds: [embed] });
    } catch (e) {}
  }, 3000);
});

client.on('messageCreate', async message => {
  if (!message.content.startsWith('/mention')) return;
  if (message.author.bot) return;

  const content = message.content.replace('/mention', '').trim();
  const role = getUserRole(message.author.username);

  if (content === 'stop' && role !== 'creator') {
    return message.reply(`${message.author} cannot stop active processes.`);
  }

  const responseEmbed = await routeAIRequest(content, role);
  message.reply({ content: `${message.author}`, embeds: [responseEmbed] });
});

client.login(CONFIG.discordToken);


// ======================= router.js =======================
import { geminiAPIChat } from './services/gemini_api.js';
import { geminiCLIChat } from './services/gemini_cli.js';
import { veniceChat } from './services/venice.js';
import CONFIG from './config.js';

export async function routeAIRequest(prompt, role) {
  if (prompt.startsWith('notnice') && CONFIG.geminiQuotaActive) {
    return await veniceChat(prompt.replace('notnice', '').trim());
  }
  if (prompt.startsWith('archboku') && (role === 'creator' || role === 'admin')) {
    return await geminiCLIChat(prompt.replace('archboku', '').trim());
  }
  if (CONFIG.geminiQuotaActive) return await geminiAPIChat(prompt);
  return await geminiCLIChat(prompt);
}


// ======================= roles.js =======================
const ROLES = {
  'yoruboku': 'creator'
};

export function getUserRole(username) {
  return ROLES[username] || 'everyone';
}


// ======================= config.js =======================
export default {
  discordToken: '',
  statusChannelId: '',
  geminiApiKey: '',
  veniceApiKey: '',
  geminiQuotaActive: true
};


// ======================= install.sh =======================
#!/bin/bash

# Universal Linux installer for Vito-bot
# Works across Debian, Ubuntu, Arch, Fedora, Alpine, OpenSUSE and more

clear
PS3='Select option: '
options=("Install" "Start" "Exit")

install_deps() {
  echo "Detecting package manager..."

  if command -v apt >/dev/null; then
    sudo apt update
    sudo apt install -y nodejs npm curl whiptail firejail
  elif command -v pacman >/dev/null; then
    sudo pacman -Sy --noconfirm nodejs npm curl firejail
  elif command -v dnf >/dev/null; then
    sudo dnf install -y nodejs npm curl firejail
  elif command -v zypper >/dev/null; then
    sudo zypper install -y nodejs npm curl firejail
  elif command -v apk >/dev/null; then
    sudo apk add nodejs npm curl firejail
  else
    echo "Unsupported distro. Install nodejs, npm, curl, firejail manually."
    exit 1
  fi
}

select opt in "${options[@]}"; do
  case $opt in
    "Install")
      echo "Installing Vito-bot (universal mode)..."
      install_deps

      npm install discord.js axios

      read -p "Enter Gemini API Key: " GEMINIKEY
      read -p "Enter Venice API Key: " VENICEKEY
      read -p "Enter Discord Bot Token: " DISCORDTOKEN
      read -p "Enter Status Channel ID: " CHANNELID

cat <<EOF > config.js
export default {
  discordToken: "$DISCORDTOKEN",
  statusChannelId: "$CHANNELID",
  geminiApiKey: "$GEMINIKEY",
  veniceApiKey: "$VENICEKEY",
  geminiQuotaActive: true
};
EOF

      mkdir -p gem-cli-chats

      echo "Installing Gemini CLI in Firejail sandbox..."
      curl -fsSL https://ai.google.dev/install.sh | bash

      echo "Gemini CLI will now always run inside a sandboxed shell."

      echo "Starting Vito-bot..."
      node index.js
      break
      ;;

    "Start")
      node index.js
      break
      ;;

    "Exit") break;;
  esac
done

// ======================= services/gemini_api.js =======================
import axios from 'axios';
import CONFIG from '../config.js';
import { EmbedBuilder } from 'discord.js';

export async function geminiAPIChat(prompt) {
  const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + CONFIG.geminiApiKey, {
    contents: [{ parts: [{ text: prompt }] }]
  });

  const text = response.data.candidates[0].content.parts[0].text;

  return new EmbedBuilder()
    .setColor(0x01308c)
    .setTitle('Vito-bot')
    .setDescription(text)
    .setFooter({ text: 'Mode: Gemini API' })
    .setTimestamp();
}


// ======================= services/venice.js =======================
import axios from 'axios';
import CONFIG from '../config.js';
import { EmbedBuilder } from 'discord.js';

export async function veniceChat(prompt) {
  const response = await axios.post('https://api.venice.ai/v1/chat/completions', {
    model: 'venice-uncensored',
    messages: [{ role: 'user', content: prompt }]
  }, {
    headers: { Authorization: `Bearer ${CONFIG.veniceApiKey}` }
  });

  const text = response.data.choices[0].message.content;

  return new EmbedBuilder()
    .setColor(0x01308c)
    .setTitle('Vito-bot')
    .setDescription(text)
    .setFooter({ text: 'Mode: Venice AI' })
    .setTimestamp();
}


// ======================= services/gemini_cli.js =======================
import { spawn } from 'child_process';
import { EmbedBuilder } from 'discord.js';

export function geminiCLIChat(prompt) {
  return new Promise((resolve) => {
    const process = spawn('firejail', ['--private', 'gemini', prompt]);

    let output = '';
    process.stdout.on('data', data => output += data.toString());

    process.on('close', () => {
      resolve(new EmbedBuilder()
        .setColor(0x01308c)
        .setTitle('Vito-bot')
        .setDescription(output.trim())
        .setFooter({ text: 'Mode: Gemini CLI (Universal Sandbox)' })
        .setTimestamp());
    });
  });
}
