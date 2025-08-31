const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Database setup
const db = new sqlite3.Database(path.join(__dirname, "leaderboard.db"), (err) => {
    if (err) return console.error("SQLite error:", err.message);
    console.log("✅ Connected to leaderboard SQLite database");
});

// Create table if not exists
db.run(`
    CREATE TABLE IF NOT EXISTS messages (
        userId TEXT PRIMARY KEY,
        count INTEGER
    )
`);

function trackMessage(message) {
    if (message.author.bot) return;
    const userId = message.author.id;

    db.get("SELECT count FROM messages WHERE userId = ?", [userId], (err, row) => {
        if (err) return console.error(err.message);
        if (!row) {
            db.run("INSERT INTO messages(userId, count) VALUES(?, ?)", [userId, 1]);
        } else {
            db.run("UPDATE messages SET count = ? WHERE userId = ?", [row.count + 1, userId]);
        }
    });
}

async function getTopUsers(limit = 10) {
    return new Promise((resolve, reject) => {
        db.all(
            "SELECT * FROM messages ORDER BY count DESC LIMIT ?",
            [limit],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

async function getUserRank(userId) {
    return new Promise((resolve, reject) => {
        db.all(
            "SELECT userId FROM messages ORDER BY count DESC",
            [],
            (err, rows) => {
                if (err) return reject(err);
                const rank = rows.findIndex(row => row.userId === userId);
                resolve(rank !== -1 ? rank + 1 : null);
            }
        );
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("Shows the top users by message count")
        .addIntegerOption(option =>
            option.setName("limit")
                .setDescription("Number of users to show (default: 10)")
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(25)
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const limit = interaction.options.getInteger("limit") || 10;

        const topUsers = await getTopUsers(limit);
        if (!topUsers.length) return interaction.editReply("No messages tracked yet.");

        let leaderboard = "";
        for (let i = 0; i < topUsers.length; i++) {
            const userId = topUsers[i].userId;
            const count = topUsers[i].count;
            const user = await interaction.client.users.fetch(userId).catch(() => null);
            leaderboard += `**#${i + 1}** ${user ? user.username : "Unknown"} — ${count} messages\n`;
        }

        const callerId = interaction.user.id;
        const callerRank = await getUserRank(callerId);
        if (callerRank) {
            const userCount = await new Promise((res, rej) => {
                db.get("SELECT count FROM messages WHERE userId = ?", [callerId], (err, row) => {
                    if (err) return rej(err);
                    res(row?.count || 0);
                });
            });
            leaderboard += `\n👤 **Your Rank:** #${callerRank} — ${userCount} messages`;
        } else {
            leaderboard += "\n👤 You have no messages counted yet.";
        }

        const embed = new EmbedBuilder()
            .setColor("#f1c40f")
            .setTitle("🏆 Message Leaderboard")
            .setDescription(leaderboard)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    trackMessage
};
