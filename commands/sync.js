const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkPermissions } = require('../middleware/permissions');
const levelingSystem = require('../utils/levelingSystem');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync')
        .setDescription('Sync message counts for all users based on their total message history')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Specific channel to scan (optional - scans all channels if not specified)')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('award_roles')
                .setDescription('Whether to award milestone roles immediately (default: true)')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        // Only allow @elijah.cc to run this command
        if (!checkPermissions(interaction.user, 'ADMIN')) {
            return await interaction.reply({
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const targetChannel = interaction.options.getChannel('channel');
            const awardRoles = interaction.options.getBoolean('award_roles') ?? true;
            const messageCounts = new Map(); // userId -> count

            let totalMessages = 0;
            let channelsScanned = 0;

            // Get channels to scan
            const channelsToScan = targetChannel ? [targetChannel] : 
                interaction.guild.channels.cache.filter(channel => 
                    channel.type === 0 && // Text channels only
                    channel.permissionsFor(interaction.guild.members.me).has(['ViewChannel', 'ReadMessageHistory'])
                );

            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('🔄 Scanning Message History...')
                .setDescription('This may take a while for large servers.')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            // Scan each channel
            for (const channel of channelsToScan.values()) {
                try {
                    let lastMessageId = null;
                    let channelMessageCount = 0;

                    while (true) {
                        const options = { limit: 100 };
                        if (lastMessageId) {
                            options.before = lastMessageId;
                        }

                        const messages = await channel.messages.fetch(options);
                        if (messages.size === 0) break;

                        for (const message of messages.values()) {
                            if (!message.author.bot) { // Don't count bot messages
                                const userId = message.author.id;
                                messageCounts.set(userId, (messageCounts.get(userId) || 0) + 1);
                                totalMessages++;
                                channelMessageCount++;
                            }
                        }

                        lastMessageId = messages.last().id;

                        // Update progress every 1000 messages
                        if (totalMessages % 1000 === 0) {
                            embed.setDescription(`Scanned ${totalMessages} messages so far...\nCurrent channel: ${channel.name}`);
                            await interaction.editReply({ embeds: [embed] });
                        }
                    }

                    channelsScanned++;
                    logger.log(`Scanned ${channelMessageCount} messages from #${channel.name}`, 'INFO');

                } catch (error) {
                    console.error(`Error scanning channel ${channel.name}:`, error);
                    logger.error(`Error scanning channel ${channel.name}: ${error.message}`);
                }
            }

            // Update database with message counts
            let usersUpdated = 0;
            let rolesAwarded = 0;

            for (const [userId, messageCount] of messageCounts) {
                try {
                    // Get user info
                    const member = await interaction.guild.members.fetch(userId).catch(() => null);
                    if (!member) continue;

                    // Update database
                    let user = await levelingSystem.getUser(userId);
                    if (!user) {
                        user = await levelingSystem.createUser(userId, member.user.username);
                    }

                    const oldCount = user.messageCount;
                    await levelingSystem.updateMessageCount(userId, messageCount);

                    // Award roles if requested
                    if (awardRoles) {
                        const milestones = await levelingSystem.getMilestones();
                        for (const milestone of milestones) {
                            if (messageCount >= milestone.messages && oldCount < milestone.messages) {
                                try {
                                    await levelingSystem.awardMilestoneRole(member, milestone, false); // false = don't announce
                                    rolesAwarded++;
                                } catch (error) {
                                    console.error(`Error awarding role to ${member.user.tag}:`, error);
                                }
                            }
                        }
                    }

                    usersUpdated++;
                } catch (error) {
                    console.error(`Error updating user ${userId}:`, error);
                }
            }

            // Final results
            const resultEmbed = new EmbedBuilder()
                .setColor('#27ae60')
                .setTitle('✅ Message History Sync Complete')
                .addFields(
                    { name: '📊 Statistics', value: 
                        `**${totalMessages}** total messages scanned\n` +
                        `**${channelsScanned}** channels processed\n` +
                        `**${usersUpdated}** users updated\n` +
                        `**${rolesAwarded}** milestone roles awarded`, inline: false
                    }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [resultEmbed] });

            logger.log(`Sync completed: ${totalMessages} messages, ${usersUpdated} users, ${rolesAwarded} roles`, 'INFO');

        } catch (error) {
            console.error('Error during message sync:', error);
            logger.error(`Sync error: ${error.message}`);

            const errorEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('❌ Sync Error')
                .setDescription('An error occurred during the message history sync. Check the logs for details.')
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};