\#!/bin/bash
set -e

echo "Installing Vito-bot with isolated Gemini environment..."

sudo apt update
sudo apt install -y nodejs npm whiptail systemd-container debootstrap curl

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

echo "Creating isolated Gemini environment..."

if [ ! -d "/opt/vito-gemini-env" ]; then
  sudo debootstrap jammy /opt/vito-gemini-env http://archive.ubuntu.com/ubuntu/
fi

echo "Installing Gemini CLI inside isolated environment..."
sudo systemd-nspawn -D /opt/vito-gemini-env bash -lc "curl -fsSL https://ai.google.dev/install.sh | bash"

echo "Login to Gemini CLI (one-time)..."
sudo systemd-nspawn -D /opt/vito-gemini-env gemini login

echo "Starting Vito-bot..."
node index.js
