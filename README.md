# WhatsApp Group Management Bot (Baileys)

A robust, feature-rich WhatsApp bot built using [Baileys](https://github.com/WhiskeySockets/Baileys) for group management, entertainment, and automation.  
No external paid APIs required.

---

## Features

- **Command Prefix System**: Customizable prefix (default: `.`)
- **Help Menu**: `.help` lists all commands by category
- **Group Tagging**: `.tag` / `.tagall` mentions everyone in a group
- **Media Conversion**:
  - `.sticker` — Convert replied image to sticker
  - `.toimg` — Convert replied sticker to image (PNG)
- **Message Management**: `.delete` — Delete bot's or replied message
- **Fun & Entertainment**:
  - `.roll` / `.dice` — Random dice roll (1-6)
  - `.8ball <question>` — Fortune answers
  - `.quote` / `.joke` / `.fact` — Random fun texts
- **Admin Commands** (group only):
  - `.kick @user` — Remove user
  - `.promote @user` — Make user admin
  - `.demote @user` — Remove admin privileges
- **Group Controls**:
  - `.welcome on|off` — Welcome messages
  - `.antilink on|off` — Anti-link protection
  - `.mute <minutes>` — Admins-only mode for set time
  - `.poll "Question" opt1/opt2/opt3` — Create WhatsApp poll
- **Owner Commands**:
  - `.shutdown`, `.restart`, `.broadcast <msg>`, `.setprefix <sym>`
- **Content Management**:
  - `.addquote <text>`, `.addjoke <text>`, `.addfact <text>` (owner only)
- **Protection Systems**: Anti-link, welcome messages
- **Error Handling**: Graceful error messages and logging
- **Extensible**: Placeholders for `.google`, `.wiki`, `.ytmp3`, `.ytmp4`, `.weather`, `.news`, `.tts`, `.qr`, `.readqr`, `.ss`

---

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- WhatsApp account (for bot authentication)
- [Baileys](https://github.com/WhiskeySockets/Baileys) library

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/yourusername/whatsapp_bot.git
   cd whatsapp_bot
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure environment variables:**

   Create a `.env` file or set these variables in your shell:
   ```
   BOT_OWNER=234XXXXXXXXXX@s.whatsapp.net   # Your WhatsApp JID
   BOT_PREFIX=.                             # Optional: command prefix
   ```

4. **Run the bot:**
   ```sh
   node bot.js
   ```

   - On first run, scan the QR code in your terminal with your WhatsApp app.

---

## Usage

### Command Reference

Type `.help` in any chat to see all available commands.

#### Core Commands

| Command                | Description                                 |
|------------------------|---------------------------------------------|
| `.help`                | Show help menu                              |
| `.tag` / `.tagall`     | Mention everyone in group                   |
| `.sticker`             | Convert replied image to sticker            |
| `.toimg`               | Convert replied sticker to image            |
| `.delete`              | Delete bot's or replied message             |
| `.roll` / `.dice`      | Roll a dice (1-6)                           |
| `.8ball <question>`    | Get a fortune answer                        |
| `.quote`               | Get a random quote                          |
| `.joke`                | Get a random joke                           |
| `.fact`                | Get a random fact                           |

#### Admin Commands (Group Only)

| Command                | Description                                 |
|------------------------|---------------------------------------------|
| `.kick @user`          | Remove user from group                      |
| `.promote @user`       | Make user admin                             |
| `.demote @user`        | Remove admin privileges                     |
| `.welcome on|off`      | Toggle welcome messages                     |
| `.antilink on|off`     | Toggle link protection                      |
| `.mute <minutes>`      | Mute group for specified time               |
| `.poll "Q" opt1/opt2`  | Create a poll                               |

#### Owner Commands

| Command                | Description                                 |
|------------------------|---------------------------------------------|
| `.shutdown`            | Stop the bot                                |
| `.restart`             | Restart the bot                             |
| `.broadcast <msg>`     | Broadcast to all groups                     |
| `.setprefix <symbol>`  | Change command prefix                       |

#### Content Management

| Command                | Description                                 |
|------------------------|---------------------------------------------|
| `.addquote <text>`     | Add a new quote (owner only)                |
| `.addjoke <text>`      | Add a new joke (owner only)                 |
| `.addfact <text>`      | Add a new fact (owner only)                 |

#### Placeholders

| Command                | Description                                 |
|------------------------|---------------------------------------------|
| `.google`, `.wiki`, etc| Not yet implemented (placeholder)           |

---

## File Structure

```
whatsapp_bot/
├── bot.js           # Main bot source code
├── .gitignore       # Ignore auth and store files
├── quotes.json      # Quotes database
├── jokes.json       # Jokes database
├── facts.json       # Facts database
```

---

## Security & Privacy

- **Auth files and bot_store.json are ignored by git** (see `.gitignore`).
- **Never share your auth_info folder or bot_store.json.**
- **Owner commands are restricted to the JID set in `BOT_OWNER`.**

---

## Extending & Customizing

- Add new commands by editing `bot.js`.
- Add new content to `quotes.json`, `jokes.json`, or `facts.json`.
- Implement placeholder features as needed.

---

## Troubleshooting

- **QR code not showing?** Make sure your terminal supports Unicode.
- **Bot not responding?** Check your environment variables and WhatsApp connection.
- **Errors?** See terminal logs for details.

---

## License

MIT

---

## Credits

- [Baileys](https://github.com/WhiskeySockets/Baileys) for WhatsApp API
- Inspired by open-source WhatsApp bots

---

## Contributing

Pull requests and suggestions welcome!