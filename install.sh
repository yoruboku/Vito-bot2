#!/bin/bash
set -e

echo "Vito-bot Universal Installer"

install_deps() {
  echo "Detecting package manager..."

  if command -v apt >/dev/null; then
    sudo apt update
    sudo apt install -y nodejs npm curl firejail whiptail

  elif command -v pacman >/dev/null; then
    sudo pacman -Sy --noconfirm nodejs npm curl firejail

  elif command -v dnf >/dev/null; then
    sudo dnf install -y nodejs npm curl firejail

  elif command -v zypper >/dev/null; then
    sudo zypper install -y nodejs npm curl firejail

  elif command -v apk >/dev/null; then
    sudo apk add nodejs npm curl firejail

  else
    echo "Unsupported Linux distro."
    echo "Install nodejs, npm, curl and firejail manually."
    exit 1
  fi
}

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

echo "Installing Gemini CLI..."
curl -fsSL https://ai.google.dev/install.sh | bash

echo "Gemini will run sandboxed using Firejail."
echo "Starting Vito-bot..."
node index.js
