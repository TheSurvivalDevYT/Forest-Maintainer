const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const levelingSystem = require('../utils/levelingSystem');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Shows the top users by message count')
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of users to show (default: 10, max: 25)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(25)
        ),
    
    async execute(interaction) {
        // Check if command is being used in #bot-commands channel
        const allowedChannelName = '🤖bot-commands🤖';
        if (interaction.channel.name !== allowedChannelName) {
            return await interaction.reply({
                content: `❌ This command can only be used in #${allowedChannelName}`,
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const limit = interaction.options.getInteger('limit') || 10;
            
            // Get top users from database
            const topUsers = await levelingSystem.getTopUsers(limit);
            
            if (topUsers.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('📊 Leaderboard')
                    .setDescription('No users found. Use `/sync` to populate message counts.')
                    .setTimestamp();

                return await interaction.editReply({ embeds: [embed] });
            }

            // Create leaderboard embed
            const embed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setTitle('🏆 Message Leaderboard')
                .setDescription('Top users by total message count')
                .setTimestamp();

            let leaderboardText = '';
            
            for (let i = 0; i < topUsers.length; i++) {
                const user = topUsers[i];
                const position = i + 1;
                
                // Get emoji for position
                let emoji;
                if (position === 1) emoji = '🥇';
                else if (position === 2) emoji = '🥈';
                else if (position === 3) emoji = '🥉';
                else emoji = `${position}.`;

                // Try to get Discord user info
                let username = user.username;
                try {
                    const discordUser = await interaction.client.users.fetch(user.discordId);
                    username = discordUser.username;
                } catch (error) {
                    // Use stored username if Discord user not found
                }

                // Get current milestone
                const milestones = levelingSystem.getMilestones();
                let currentMilestone = 'No Role';
                for (let j = milestones.length - 1; j >= 0; j--) {
                    if (user.messageCount >= milestones[j].messages) {
                        currentMilestone = milestones[j].roleName;
                        break;
                    }
                }

                leaderboardText += `${emoji} **${username}** - ${user.messageCount.toLocaleString()} messages\n`;
                leaderboardText += `   *${currentMilestone}*\n\n`;
            }

            embed.setDescription(leaderboardText);

            // Add footer with total stats
            const totalUsers = await levelingSystem.getTotalUserCount();
            embed.setFooter({ 
                text: `Showing top ${topUsers.length} of ${totalUsers} users • Use /sync to update counts` 
            });

            await interaction.editReply({ embeds: [embed] });
            logger.log(`Leaderboard command executed by ${interaction.user.username}`, 'INFO');

        } catch (error) {
            console.error('Error executing leaderboard command:', error);
            logger.error(`Leaderboard error: ${error.message}`);

            const errorEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('❌ Error')
                .setDescription('An error occurred while fetching the leaderboard.')
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};