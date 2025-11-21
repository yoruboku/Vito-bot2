import { spawn } from 'child_process';
import { EmbedBuilder } from 'discord.js';

export function geminiCLIChat(prompt) {
  return new Promise((resolve) => {
    const process = spawn('systemd-nspawn', [
      '-D',
      '/opt/vito-gemini-env',
      'gemini',
      prompt
    ]);

    let output = '';

    process.stdout.on('data', data => {
      output += data.toString();
    });

    process.on('close', () => {
      resolve(new EmbedBuilder()
        .setColor(0x01308c)
        .setTitle('Vito-bot')
        .setDescription(output.trim())
        .setFooter({ text: 'Mode: Gemini CLI (Isolated)' })
        .setTimestamp());
    });
  });
}
