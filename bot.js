// Robust WhatsApp Bot (Baileys)
// -----------------------------------------------------------
// Features implemented (no external paid APIs):
// - Command prefix system (. by default)
// - .help                 → lists commands by category
// - .tag / .tagall        → mention everyone in a group
// - .sticker              → convert replied image to sticker (static)
// - .toimg                → convert replied sticker to image (PNG)
// - .delete               → delete the bot's message or the message you reply to
// - .roll / .dice         → random 1-6
// - .8ball <question>     → fortune answers
// - .quote / .joke / .fact→ random fun texts
// - Admin-only (in groups): .kick @, .promote @, .demote @
// - Group controls: .welcome on|off, .antilink on|off
// - .mute <minutes>       → set admins-only mode for <minutes>, then restore
// - .poll "Question" opt1/opt2/opt3  → create WhatsApp poll
// - Owner-only: .shutdown, .restart, .broadcast <msg>, .setprefix <sym>
//
// Placeholders (add later if you want): .google, .wiki, .ytmp3, .ytmp4, .weather, .news, .tts, .qr, .readqr, .ss
// -----------------------------------------------------------

// This bot is designed to be a comprehensive WhatsApp group management and entertainment tool.
// Features:
// - Command prefix system with customizable prefix
// - Comprehensive help system with categorized commands
// - Group management tools (tagging, moderation)
// - Media conversion (images to stickers, stickers to images)
// - Entertainment commands (8ball, quotes, jokes, facts)
// - Admin tools for group management
// - Owner-only commands for bot management
// - Protection systems (anti-link, welcome messages)
// - Poll creation functionality
// =============================================

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    downloadContentFromMessage,
    jidDecode
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp"); // For image processing

// =============================================
// CONFIGURATION AND INITIALIZATION
// =============================================

// Environment variables and constants
const OWNER_JID = process.env.BOT_OWNER || ""; // Format: "2347080702920@s.whatsapp.net"
let PREFIX = process.env.BOT_PREFIX || ".";
const AUTH_DIR = "auth_info";
const STORE_FILE = path.join(__dirname, "bot_store.json");

// Data files for dynamic content
const QUOTES_FILE = "./quotes.json";
const JOKES_FILE = "./jokes.json";
const FACTS_FILE = "./facts.json";

// Default content if files are missing
const DEFAULT_QUOTES = [
    "The only way to do great work is to love what you do. - Steve Jobs",
    "Innovation distinguishes between a leader and a follower. - Steve Jobs"
];

const DEFAULT_JOKES = [
    "Why don't scientists trust atoms? Because they make up everything!",
    "Why did the scarecrow win an award? Because he was outstanding in his field!"
];

const DEFAULT_FACTS = [
    "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly edible.",
    "Octopuses have three hearts and blue blood."
];

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Load data from JSON file or return default data
 * @param {string} filePath - Path to JSON file
 * @param {Array} defaultData - Default data if file doesn't exist
 * @returns {Array} Array of data items
 */
function loadDataFromFile(filePath, defaultData) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, "utf8");
            return JSON.parse(data);
        }
        // Create file with default data if it doesn't exist
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
        return defaultData;
    } catch (e) {
        console.error(`Error reading file ${filePath}:`, e);
        return defaultData;
    }
}

/**
 * Add item to JSON file
 * @param {string} filePath - Path to JSON file
 * @param {string} item - Item to add
 * @returns {boolean} Success status
 */
function addToFile(filePath, item) {
    try {
        const data = fs.existsSync(filePath) ? 
            JSON.parse(fs.readFileSync(filePath, "utf8")) : [];
        data.push(item);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error(`Error writing to file ${filePath}:`, e);
        return false;
    }
}

/**
 * Load bot store from file or create new one
 * @returns {Object} Bot store data
 */
function loadStore() {
    try {
        if (fs.existsSync(STORE_FILE)) {
            return JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
        }
    } catch (e) {
        console.error("Error loading store:", e);
    }
    return { groups: {}, bans: {}, prefix: PREFIX };
}

/**
 * Save bot store to file
 */
function saveStore() {
    try {
        fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
    } catch (e) {
        console.error("Error saving store:", e);
    }
}

// Initialize store
const store = loadStore();

// Utility function for delays
const wait = (ms) => new Promise((res) => setTimeout(res, ms));

// =============================================
// BOT CORE FUNCTIONALITY
// =============================================

/**
 * Start the WhatsApp bot
 */
async function startBot() {
    console.log("🤖 Starting WhatsApp Bot...");
    
    // Initialize authentication
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    // Create socket connection
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: { level: 'silent' } // Reduce console noise
    });

    // =============================================
    // EVENT HANDLERS
    // =============================================

    // Handle connection updates
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Display QR code if needed
        if (qr) {
            console.log("\n📲 Scan this QR to link the bot:\n");
            qrcode.generate(qr, { small: false });
            console.log("\nIf it expires, a new one will appear.\n");
        }

        // Handle connection status
        if (connection === "open") {
            console.log("✅ WhatsApp connected successfully!");
            if (store.prefix && store.prefix !== PREFIX) {
                PREFIX = store.prefix;
            }
        }

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log("⚠️ Connection closed. Status:", statusCode, "| Reconnect:", shouldReconnect);
            
            if (shouldReconnect) {
                await wait(2000);
                startBot();
            } else {
                console.log("❌ Logged out. Delete", AUTH_DIR, "and restart to re-link.");
            }
        }
    });

    // Handle credential updates
    sock.ev.on("creds.update", saveCreds);

    // =============================================
    // HELPER FUNCTIONS
    // =============================================

    /**
     * Check if user is the bot owner
     * @param {string} jid - User JID
     * @returns {boolean} True if user is owner
     */
    const isOwner = (jid) => {
        if (!OWNER_JID) return false;
        return normalizeJid(jid) === normalizeJid(OWNER_JID);
    };

    /**
     * Normalize JID by removing any suffix
     * @param {string} jid - User JID
     * @returns {string} Normalized JID
     */
    const normalizeJid = (jid) => jid?.split(":")[0] || jid;

    /**
     * Execute function only if user is owner
     */
    async function ownerOnly(sender, fn, sock, m) {
        if (!OWNER_JID) return sock.sendMessage(m.key.remoteJid, { text: "Owner not set. Set BOT_OWNER env var." }, { quoted: m });
        if (!isOwner(sender)) return sock.sendMessage(m.key.remoteJid, { text: "Owner only." }, { quoted: m });
        await fn();
    }

    /**
     * Check if JID is a group
     * @param {string} jid - JID to check
     * @returns {boolean} True if group JID
     */
    const isGroupJid = (jid) => jid?.endsWith("@g.us");

    /**
     * Get group metadata
     * @param {string} jid - Group JID
     * @returns {Object|null} Group metadata or null
     */
    async function getGroupMeta(jid) {
        try {
            return await sock.groupMetadata(jid);
        } catch (error) {
            console.error("Error fetching group metadata:", error);
            return null;
        }
    }

    /**
     * Check admin status in group
     * @param {string} jid - Group JID
     * @param {string} userJid - User JID
     * @returns {Object} Admin status for bot and user
     */
    async function requireAdmin(jid, userJid) {
        const meta = await getGroupMeta(jid);
        if (!meta) return { meIsAdmin: false, userIsAdmin: false };
        
        const me = normalizeJid(sock.user.id);
        const meInfo = meta.participants.find((p) => normalizeJid(p.id) === me);
        const userInfo = meta.participants.find((p) => normalizeJid(p.id) === normalizeJid(userJid));
        
        const meIsAdmin = meInfo?.admin === "admin" || meInfo?.admin === "superadmin";
        const userIsAdmin = userInfo?.admin === "admin" || userInfo?.admin === "superadmin";
        
        return { meIsAdmin, userIsAdmin };
    }

    /**
     * Ensure group config exists in store
     * @param {string} gid - Group ID
     * @returns {Object} Group configuration
     */
    function ensureGroupConfig(gid) {
        if (!store.groups[gid]) {
            store.groups[gid] = { welcome: false, antilink: false };
        }
        return store.groups[gid];
    }

    /**
     * Extract text from message
     * @param {Object} m - Message object
     * @returns {string|null} Extracted text or null
     */
    function getText(m) {
        const msg = m.message;
        return (
            msg.conversation ||
            msg.extendedTextMessage?.text ||
            msg.imageMessage?.caption ||
            msg.videoMessage?.caption ||
            msg.documentMessage?.caption ||
            null
        );
    }

    /**
     * Check if command matches any in list
     * @param {string} cmd - Command to check
     * @param {Array} list - List of commands
     * @returns {boolean} True if match found
     */
    function match(cmd, list) {
        const lc = cmd.toLowerCase();
        return list.some((x) => x === lc);
    }

    /**
     * Extract mentions from message
     */
    function extractMentions(m, argline) {
        const ctx = m.message?.extendedTextMessage?.contextInfo;
        const quotedParticipant = ctx?.participant ? [ctx.participant] : [];
        const explicit = (ctx?.mentionedJid || []).concat(parseMentionsFromArg(argline));
        const all = [...new Set([...quotedParticipant, ...explicit])];
        return all.map(normalizeJid).map((j) => (j.includes("@s.whatsapp.net") ? j : j + "@s.whatsapp.net"));
    }

    /**
     * Parse mentions from argument text
     */
    function parseMentionsFromArg(s) {
        if (!s) return [];
        const ats = s.match(/@\d{5,}/g) || [];
        return ats.map((a) => a.replace("@", "") + "@s.whatsapp.net");
    }

    /**
     * 8ball fortune command
     */
    async function eightBall(jid, question, sock, m) {
        if (!question) return sock.sendMessage(jid, { text: "Ask a question: .8ball Will I pass?" }, { quoted: m });
        
        const answers = [
            "It is certain.", "Without a doubt.", "You may rely on it.", "Most likely.", "Outlook good.", "Yes.",
            "Reply hazy, try again.", "Ask again later.", "Better not tell you now.",
            "Don't count on it.", "My reply is no.", "Very doubtful."
        ];
        
        const pick = answers[Math.floor(Math.random() * answers.length)];
        sock.sendMessage(jid, { text: `🎱 ${pick}` }, { quoted: m });
    }

    /**
     * Broadcast message to all groups
     */
    async function broadcast(message, sock, m) {
        if (!message) return sock.sendMessage(m.key.remoteJid, { text: "Usage: .broadcast <message>" }, { quoted: m });
        
        const groups = await sock.groupFetchAllParticipating();
        const jids = Object.keys(groups || {});
        
        for (const gid of jids) {
            await sock.sendMessage(gid, { text: `📢 *Broadcast:*\n${message}` });
            await wait(300); // Avoid rate limiting
        }
    }

    // =============================================
    // MESSAGE PROCESSING
    // =============================================

    // Handle incoming messages
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        const m = messages?.[0];
        if (!m || !m.message) return;

        const from = m.key.remoteJid;
        const isGroup = isGroupJid(from);
        const sender = m.key.participant || from;

        // Get message text
        const txt = getText(m);
        if (!txt) {
            await handleProtections(m, sock);
            return;
        }

        // Run protection checks
        await handleProtections(m, sock, txt);

        // Process commands
        if (!txt.startsWith(PREFIX)) return;
        
        const body = txt.slice(PREFIX.length).trim();
        const [cmd, ...rest] = body.split(/\s+/);
        const argline = body.slice(cmd.length).trim();

        try {
            // Core commands
            if (match(cmd, ["help", "menu"])) return sendHelp(from, sock);
            if (match(cmd, ["tag", "tagall"])) return tagAll(from, sender, sock);
            if (cmd === "sticker") return makeSticker(m, from, sock);
            if (cmd === "toimg") return stickerToImage(m, from, sock);
            if (match(cmd, ["roll", "dice"])) return sendDice(from, sock, m);
            if (cmd === "8ball") return eightBall(from, argline, sock, m);
            if (cmd === "quote") return sendQuote(from, sock, m);
            if (cmd === "joke") return sendJoke(from, sock, m);
            if (cmd === "fact") return sendFact(from, sock, m);
            if (cmd === "delete" || cmd === "del") return deleteMsg(m, from, sock);

            // Admin/group commands
            if (cmd === "kick") return groupKick(from, sender, argline, sock, m);
            if (cmd === "promote") return groupPromote(from, sender, argline, sock, m);
            if (cmd === "demote") return groupDemote(from, sender, argline, sock, m);
            if (cmd === "welcome") return toggleWelcome(from, sender, argline, sock, m);
            if (cmd === "antilink") return toggleAntiLink(from, sender, argline, sock, m);
            if (cmd === "mute") return muteGroup(from, sender, argline, sock, m);
            if (cmd === "poll") return createPoll(from, argline, sock, m);

            // Content management commands
            if (cmd === "addquote") return addQuote(sender, argline, sock, m);
            if (cmd === "addjoke") return addJoke(sender, argline, sock, m);
            if (cmd === "addfact") return addFact(sender, argline, sock, m);

            // Owner-only commands
            if (cmd === "shutdown") return ownerOnly(sender, async () => process.exit(0), sock, m);
            if (cmd === "restart") return ownerOnly(sender, async () => process.exit(1), sock, m);
            if (cmd === "broadcast") return ownerOnly(sender, () => broadcast(argline, sock, m), sock, m);
            if (cmd === "setprefix") return ownerOnly(sender, () => setPrefix(argline, sock, m), sock, m);

            // Placeholder commands
            if (match(cmd, ["google", "wiki", "ytmp3", "ytmp4", "weather", "news", "tts", "qr", "readqr", "ss"])) {
                return sendPlaceholder(from, cmd, sock, m);
            }

            // Unknown command
            return sendUnknownCommand(from, cmd, sock, m);
        } catch (err) {
            console.error("Command error:", err);
            return sendErrorMessage(from, sock, m);
        }
    });

    // Handle group participant updates (welcome messages)
    sock.ev.on("group-participants.update", async (ev) => {
        const { id: gid, action, participants } = ev;
        const cfg = ensureGroupConfig(gid);
        
        if (cfg.welcome && action === "add") {
            const names = participants.map((p) => `@${normalizeJid(p).split("@")[0]}`).join(", ");
            await sock.sendMessage(gid, { 
                text: `👋 Welcome ${names}!`, 
                mentions: participants 
            });
        }
    });

    // =============================================
    // COMMAND IMPLEMENTATIONS
    // =============================================

    /**
     * Send help message with command list
     */
    async function sendHelp(jid, sock) {
        const helpText = `
🧭 *QA Solucity Bot Help* (prefix: ${PREFIX})

*Core Commands*
${PREFIX}help - Show this help menu
${PREFIX}tag | ${PREFIX}tagall - Mention everyone in the group
${PREFIX}sticker - Convert replied image to sticker
${PREFIX}toimg - Convert replied sticker to image
${PREFIX}delete - Delete replied message
${PREFIX}roll | ${PREFIX}dice - Roll a dice (1-6)
${PREFIX}8ball <question> - Get a fortune answer
${PREFIX}quote - Get a random quote
${PREFIX}joke - Get a random joke
${PREFIX}fact - Get a random fact

*Admin Commands (Group Only)*
${PREFIX}kick @user - Remove user from group
${PREFIX}promote @user - Make user admin
${PREFIX}demote @user - Remove admin privileges
${PREFIX}welcome on|off - Toggle welcome messages
${PREFIX}antilink on|off - Toggle link protection
${PREFIX}mute <minutes> - Mute group for specified time
${PREFIX}poll "Question" opt1/opt2/opt3 - Create a poll

*Content Management*
${PREFIX}addquote <text> - Add a new quote (Owner only)
${PREFIX}addjoke <text> - Add a new joke (Owner only)
${PREFIX}addfact <text> - Add a new fact (Owner only)

*Owner Commands*
${PREFIX}shutdown - Stop the bot
${PREFIX}restart - Restart the bot
${PREFIX}broadcast <message> - Broadcast to all groups
${PREFIX}setprefix <symbol> - Change command prefix

*Placeholder Commands*
${PREFIX}google, ${PREFIX}wiki, ${PREFIX}ytmp3, ${PREFIX}ytmp4, ${PREFIX}weather, ${PREFIX}news, ${PREFIX}tts, ${PREFIX}qr, ${PREFIX}readqr, ${PREFIX}ss
        `.trim();

        await sock.sendMessage(jid, { text: helpText });
    }

    /**
     * Tag all members in a group
     */
    async function tagAll(jid, sender, sock) {
        if (!isGroupJid(jid)) {
            return sock.sendMessage(jid, { text: "This command works in groups only." });
        }
        
        const meta = await getGroupMeta(jid);
        if (!meta) return;
        
        const mentions = meta.participants.map((p) => p.id);
        const names = meta.participants.map((p) => `@${normalizeJid(p.id).split("@")[0]}`).join(" ");
        
        await sock.sendMessage(jid, { 
            text: `📢 ${names}`, 
            mentions 
        });
    }

    /**
     * Convert image to sticker
     */
    async function makeSticker(m, jid, sock) {
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const img = quoted?.imageMessage || m.message?.imageMessage;
        
        if (!img) {
            return sock.sendMessage(jid, { 
                text: `Reply to an *image* with ${PREFIX}sticker` 
            }, { quoted: m });
        }

        try {
            const stream = await downloadContentFromMessage(img, "image");
            let buff = Buffer.from([]);
            for await (const chunk of stream) {
                buff = Buffer.concat([buff, chunk]);
            }

            const webp = await sharp(buff)
                .webp({ quality: 90 })
                .toBuffer();
                
            await sock.sendMessage(jid, { sticker: webp }, { quoted: m });
        } catch (error) {
            console.error("Sticker creation error:", error);
            await sock.sendMessage(jid, { 
                text: "Error creating sticker. Please try again." 
            }, { quoted: m });
        }
    }

    /**
     * Convert sticker to image
     */
    async function stickerToImage(m, jid, sock) {
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const stk = quoted?.stickerMessage || m.message?.stickerMessage;
        
        if (!stk) {
            return sock.sendMessage(jid, { 
                text: `Reply to a *sticker* with ${PREFIX}toimg` 
            }, { quoted: m });
        }

        try {
            const stream = await downloadContentFromMessage(stk, "sticker");
            let buff = Buffer.from([]);
            for await (const chunk of stream) {
                buff = Buffer.concat([buff, chunk]);
            }

            const png = await sharp(buff).png().toBuffer();
            await sock.sendMessage(jid, { 
                image: png, 
                caption: "Here's your image" 
            }, { quoted: m });
        } catch (error) {
            console.error("Image conversion error:", error);
            await sock.sendMessage(jid, { 
                text: "Error converting sticker to image. Please try again." 
            }, { quoted: m });
        }
    }

    /**
     * Send dice roll result
     */
    async function sendDice(jid, sock, m) {
        const result = 1 + Math.floor(Math.random() * 6);
        await sock.sendMessage(jid, { 
            text: `🎲 ${result}` 
        }, { quoted: m });
    }

    /**
     * Delete a message
     */
    async function deleteMsg(m, jid, sock) {
        const ctx = m.message?.extendedTextMessage?.contextInfo;
        
        if (ctx?.stanzaId && ctx?.participant) {
            return sock.sendMessage(jid, { 
                delete: { 
                    id: ctx.stanzaId, 
                    remoteJid: jid, 
                    fromMe: false 
                } 
            });
        }
        
        if (m.key.fromMe) {
            return sock.sendMessage(jid, { delete: m.key });
        }
        
        return sock.sendMessage(jid, { 
            text: "Nothing to delete (reply to a message)." 
        }, { quoted: m });
    }

    /**
     * Kick user from group
     */
    async function groupKick(jid, sender, argline, sock, m) {
        if (!isGroupJid(jid)) return sock.sendMessage(jid, { text: "Group only." }, { quoted: m });
        const { meIsAdmin, userIsAdmin } = await requireAdmin(jid, sender);
        if (!meIsAdmin) return sock.sendMessage(jid, { text: "I need to be admin." }, { quoted: m });
        if (!userIsAdmin && !isOwner(sender)) return sock.sendMessage(jid, { text: "Admins only." }, { quoted: m });

        const targets = extractMentions(m, argline);
        if (targets.length === 0) return sock.sendMessage(jid, { text: "Mention users to kick." }, { quoted: m });
        await sock.groupParticipantsUpdate(jid, targets, "remove");
    }

    /**
     * Promote user to admin
     */
    async function groupPromote(jid, sender, argline, sock, m) {
        if (!isGroupJid(jid)) return sock.sendMessage(jid, { text: "Group only." }, { quoted: m });
        const { meIsAdmin, userIsAdmin } = await requireAdmin(jid, sender);
        if (!meIsAdmin) return sock.sendMessage(jid, { text: "I need to be admin." }, { quoted: m });
        if (!userIsAdmin && !isOwner(sender)) return sock.sendMessage(jid, { text: "Admins only." }, { quoted: m });

        const targets = extractMentions(m, argline);
        if (!targets.length) return sock.sendMessage(jid, { text: "Mention users to promote." }, { quoted: m });
        await sock.groupParticipantsUpdate(jid, targets, "promote");
    }

    /**
     * Demote user from admin
     */
    async function groupDemote(jid, sender, argline, sock, m) {
        if (!isGroupJid(jid)) return sock.sendMessage(jid, { text: "Group only." }, { quoted: m });
        const { meIsAdmin, userIsAdmin } = await requireAdmin(jid, sender);
        if (!meIsAdmin) return sock.sendMessage(jid, { text: "I need to be admin." }, { quoted: m });
        if (!userIsAdmin && !isOwner(sender)) return sock.sendMessage(jid, { text: "Admins only." }, { quoted: m });

        const targets = extractMentions(m, argline);
        if (!targets.length) return sock.sendMessage(jid, { text: "Mention users to demote." }, { quoted: m });
        await sock.groupParticipantsUpdate(jid, targets, "demote");
    }

    /**
     * Toggle welcome messages
     */
    async function toggleWelcome(jid, sender, argline, sock, m) {
        if (!isGroupJid(jid)) return sock.sendMessage(jid, { text: "Group only." }, { quoted: m });
        const { meIsAdmin, userIsAdmin } = await requireAdmin(jid, sender);
        if (!meIsAdmin) return sock.sendMessage(jid, { text: "I need to be admin." }, { quoted: m });
        if (!userIsAdmin && !isOwner(sender)) return sock.sendMessage(jid, { text: "Admins only." }, { quoted: m });

        const cfg = ensureGroupConfig(jid);
        if (/on/i.test(argline)) cfg.welcome = true; 
        else if (/off/i.test(argline)) cfg.welcome = false; 
        else return sock.sendMessage(jid, { text: "Use: .welcome on|off" }, { quoted: m });
        
        saveStore();
        await sock.sendMessage(jid, { text: `Welcome is now *${cfg.welcome ? "ON" : "OFF"}*` }, { quoted: m });
    }

    /**
     * Toggle anti-link protection
     */
    async function toggleAntiLink(jid, sender, argline, sock, m) {
        if (!isGroupJid(jid)) return sock.sendMessage(jid, { text: "Group only." }, { quoted: m });
        const { meIsAdmin, userIsAdmin } = await requireAdmin(jid, sender);
        if (!meIsAdmin) return sock.sendMessage(jid, { text: "I need to be admin." }, { quoted: m });
        if (!userIsAdmin && !isOwner(sender)) return sock.sendMessage(jid, { text: "Admins only." }, { quoted: m });

        const cfg = ensureGroupConfig(jid);
        if (/on/i.test(argline)) cfg.antilink = true; 
        else if (/off/i.test(argline)) cfg.antilink = false; 
        else return sock.sendMessage(jid, { text: "Use: .antilink on|off" }, { quoted: m });
        
        saveStore();
        await sock.sendMessage(jid, { text: `Antilink is now *${cfg.antilink ? "ON" : "OFF"}*` }, { quoted: m });
    }

    /**
     * Mute group for specified minutes
     */
    async function muteGroup(jid, sender, argline, sock, m) {
        if (!isGroupJid(jid)) return sock.sendMessage(jid, { text: "Group only." }, { quoted: m });
        const { meIsAdmin, userIsAdmin } = await requireAdmin(jid, sender);
        if (!meIsAdmin) return sock.sendMessage(jid, { text: "I need to be admin." }, { quoted: m });
        if (!userIsAdmin && !isOwner(sender)) return sock.sendMessage(jid, { text: "Admins only." }, { quoted: m });

        const minutes = parseInt(argline) || 0;
        if (minutes <= 0) return sock.sendMessage(jid, { text: "Usage: .mute <minutes>" }, { quoted: m });

        await sock.groupSettingUpdate(jid, "announcement"); // admins only can send
        await sock.sendMessage(jid, { text: `🔇 Group muted for ${minutes} minute(s).` }, { quoted: m });

        setTimeout(async () => {
            try {
                await sock.groupSettingUpdate(jid, "not_announcement");
                await sock.sendMessage(jid, { text: "🔊 Group unmuted." });
            } catch {}
        }, minutes * 60 * 1000);
    }

    /**
     * Create a poll in the group
     */
    async function createPoll(jid, argline, sock, m) {
        // format: .poll "Question" opt1/opt2/opt3
        const match = argline.match(/\"(.+?)\"\s+(.+)/);
        if (!match) return sock.sendMessage(jid, { text: 'Usage: .poll "Question" option1/option2/option3' }, { quoted: m });
        
        const question = match[1];
        const options = match[2].split("/").map((s) => s.trim()).filter(Boolean);
        
        if (options.length < 2) return sock.sendMessage(jid, { text: "Provide at least 2 options." }, { quoted: m });

        await sock.sendMessage(jid, { poll: { name: question, values: options } }, { quoted: m });
    }

    /**
     * Set new command prefix
     */
    function setPrefix(newPrefix, sock, m) {
        if (!newPrefix) return sock.sendMessage(m.key.remoteJid, { text: "Usage: .setprefix <symbol>" }, { quoted: m });
        
        PREFIX = newPrefix.trim();
        store.prefix = PREFIX;
        saveStore();
        
        sock.sendMessage(m.key.remoteJid, { text: `✅ Prefix set to: ${PREFIX}` }, { quoted: m });
    }

    // =============================================
    // PROTECTION SYSTEMS
    // =============================================

    /**
     * Handle protection systems (anti-link, etc.)
     */
    async function handleProtections(m, sock, text = "") {
        const jid = m.key.remoteJid;
        if (!isGroupJid(jid)) return;
        
        const cfg = ensureGroupConfig(jid);
        if (!cfg.antilink) return;

        // Simple URL detection
        if (/https?:\/\//i.test(text)) {
            const { userIsAdmin } = await requireAdmin(jid, m.key.participant || jid);
            if (userIsAdmin) return; // Allow admins
            
            try {
                await sock.sendMessage(jid, { delete: m.key });
                await sock.sendMessage(jid, { text: "🚫 Links are not allowed here." });
            } catch (error) {
                console.error("Error handling protection:", error);
            }
        }
    }

    // =============================================
    // CONTENT MANAGEMENT
    // =============================================

    // Load initial content
    const quotes = loadDataFromFile(QUOTES_FILE, DEFAULT_QUOTES);
    const jokes = loadDataFromFile(JOKES_FILE, DEFAULT_JOKES);
    const facts = loadDataFromFile(FACTS_FILE, DEFAULT_FACTS);

    /**
     * Send random quote
     */
    async function sendQuote(jid, sock, m) {
        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        await sock.sendMessage(jid, { 
            text: `💬 ${quote}` 
        }, { quoted: m });
    }

    /**
     * Send random joke
     */
    async function sendJoke(jid, sock, m) {
        const joke = jokes[Math.floor(Math.random() * jokes.length)];
        await sock.sendMessage(jid, { 
            text: `😄 ${joke}` 
        }, { quoted: m });
    }

    /**
     * Send random fact
     */
    async function sendFact(jid, sock, m) {
        const fact = facts[Math.floor(Math.random() * facts.length)];
        await sock.sendMessage(jid, { 
            text: `🧠 ${fact}` 
        }, { quoted: m });
    }

    /**
     * Add new quote
     */
    async function addQuote(sender, argline, sock, m) {
        if (!isOwner(sender)) {
            return sock.sendMessage(m.key.remoteJid, { 
                text: "Owner only command." 
            }, { quoted: m });
        }
        
        if (!argline) {
            return sock.sendMessage(m.key.remoteJid, { 
                text: `Usage: ${PREFIX}addquote <your quote>` 
            }, { quoted: m });
        }
        
        const ok = addToFile(QUOTES_FILE, argline);
        await sock.sendMessage(m.key.remoteJid, { 
            text: ok ? "✅ Quote added!" : "❌ Failed to add quote." 
        }, { quoted: m });
    }

    /**
     * Add new joke
     */
    async function addJoke(sender, argline, sock, m) {
        if (!isOwner(sender)) {
            return sock.sendMessage(m.key.remoteJid, { 
                text: "Owner only command." 
            }, { quoted: m });
        }
        
        if (!argline) {
            return sock.sendMessage(m.key.remoteJid, { 
                text: `Usage: ${PREFIX}addjoke <your joke>` 
            }, { quoted: m });
        }
        
        const ok = addToFile(JOKES_FILE, argline);
        await sock.sendMessage(m.key.remoteJid, { 
            text: ok ? "✅ Joke added!" : "❌ Failed to add joke." 
        }, { quoted: m });
    }

    /**
     * Add new fact
     */
    async function addFact(sender, argline, sock, m) {
        if (!isOwner(sender)) {
            return sock.sendMessage(m.key.remoteJid, { 
                text: "Owner only command." 
            }, { quoted: m });
        }
        
        if (!argline) {
            return sock.sendMessage(m.key.remoteJid, { 
                text: `Usage: ${PREFIX}addfact <your fact>` 
            }, { quoted: m });
        }
        
        const ok = addToFile(FACTS_FILE, argline);
        await sock.sendMessage(m.key.remoteJid, { 
            text: ok ? "✅ Fact added!" : "❌ Failed to add fact." 
        }, { quoted: m });
    }

    // =============================================
    // ERROR HANDLING
    // =============================================

    /**
     * Send placeholder message for unimplemented commands
     */
    async function sendPlaceholder(jid, cmd, sock, m) {
        await sock.sendMessage(jid, { 
            text: `🧩 ${PREFIX}${cmd} requires additional setup. This feature is a placeholder for now.` 
        }, { quoted: m });
    }

    /**
     * Send unknown command message
     */
    async function sendUnknownCommand(jid, cmd, sock, m) {
        await sock.sendMessage(jid, { 
            text: `❓ Unknown command: ${PREFIX}${cmd}\nTry ${PREFIX}help for available commands.` 
        }, { quoted: m });
    }

    /**
     * Send generic error message
     */
    async function sendErrorMessage(jid, sock, m) {
        await sock.sendMessage(jid, { 
            text: "⚠️ Error while processing command. Please try again later." 
        }, { quoted: m });
    }
}

// =============================================
// START THE BOT
// =============================================

// Error handling for bot startup
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
});

// Start the bot
startBot().catch((error) => {
    console.error("Fatal error during bot startup:", error);
    process.exit(1);
});