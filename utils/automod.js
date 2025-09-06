const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

const LOG_CHANNEL_ID = "1413623155318198353";
const MOD_ROLE_ID = "1407825640362872923";

// Load badwords.txt into an array
const badwordsPath = path.join(__dirname, "../data/badwords.txt");
const bannedWords = fs.readFileSync(badwordsPath, "utf-8")
  .split("\n")
  .map(w => w.trim().toLowerCase())
  .filter(Boolean);

module.exports = {
    handleMessage: async (message) => {
        if (message.author.bot) return;

        const lowerMsg = message.content.toLowerCase();

        // Check for banned words (match whole words)
        const containsBannedWord = bannedWords.some(word => 
            new RegExp(`\\b${word}\\b`, "i").test(lowerMsg)
        );

        if (!containsBannedWord) return;

        try {
            // Delete message
            if (message.guild.members.me.permissions.has("ManageMessages")) {
                await message.delete();
            }

            // Fetch log channel
            const logChannel = await message.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
            if (!logChannel) return;

            const embed = new EmbedBuilder()
                .setTitle("🚨 AutoMod Alert")
                .setColor("Red")
                .addFields(
                    { name: "User", value: `${message.author.tag} (${message.author.id})` },
                    { name: "Message", value: message.content || "*No content*" },
                    { name: "Channel", value: `<#${message.channel.id}>` }
                )
                .setTimestamp();

            await logChannel.send({
                content: `<@&${MOD_ROLE_ID}>`,
                embeds: [embed],
            });

        } catch (err) {
            console.error("AutoMod error:", err);
        }
    }
};
