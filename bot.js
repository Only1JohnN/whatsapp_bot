const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason 
} = require("@whiskeysockets/baileys");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const sock = makeWASocket({ auth: state });

  // Save session
  sock.ev.on("creds.update", saveCreds);

  // Listen for new messages
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    const sender = msg.key.participant || msg.key.remoteJid;

    // Example command
    if (text?.toLowerCase() === ".zushi tag") {
      await sock.sendMessage(msg.key.remoteJid, { 
        text: `allowed commands for @${sender.split("@")[0]}\n• sticker\n• tag`, 
        mentions: [sender] 
      });
    }
  });
}

startBot();
