const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkPermissions } = require('../middleware/permissions');
const config = require('../config');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempban')
        .setDescription('Temporarily ban a member from the server')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to temporarily ban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration of the ban')
                .setRequired(true)
                .addChoices(
                    { name: '1 hour', value: '1h' },
                    { name: '6 hours', value: '6h' },
                    { name: '12 hours', value: '12h' },
                    { name: '1 day', value: '1d' },
                    { name: '3 days', value: '3d' },
                    { name: '7 days', value: '7d' }
                )
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the temporary ban')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        // Check permissions
        if (!checkPermissions(interaction.user, 'MODERATOR')) {
            return await interaction.reply({
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
        }
        
        const target = interaction.options.getMember('target') || interaction.options.getUser('target');
        const duration = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        if (!target) {
            return await interaction.reply({
                content: '❌ User not found.',
                ephemeral: true
            });
        }
        
        // Check if target is bannable (if they're in the server)
        if (target.bannable !== undefined && !target.bannable) {
            return await interaction.reply({
                content: '❌ I cannot ban this user. They may have higher permissions or be the server owner.',
                ephemeral: true
            });
        }
        
        // Check if trying to ban themselves
        if (target.id === interaction.user.id) {
            return await interaction.reply({
                content: '❌ You cannot ban yourself.',
                ephemeral: true
            });
        }
        
        const banDuration = config.TEMPBAN_DURATIONS[duration];
        if (!banDuration) {
            return await interaction.reply({
                content: '❌ Invalid duration specified.',
                ephemeral: true
            });
        }
        
        const unbanTime = Date.now() + banDuration;
        
        try {
            // Send DM to the user before banning (if they're in the server)
            if (target.send) {
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setColor('#e67e22')
                        .setTitle('⏰ You have been temporarily banned')
                        .setDescription(`You have been temporarily banned from **${interaction.guild.name}**`)
                        .addFields(
                            { name: 'Reason', value: reason },
                            { name: 'Duration', value: duration },
                            { name: 'Unban Time', value: `<t:${Math.floor(unbanTime / 1000)}:F>` },
                            { name: 'Moderator', value: interaction.user.tag }
                        )
                        .setTimestamp();
                    
                    await target.send({ embeds: [dmEmbed] });
                } catch (error) {
                    // User has DMs disabled or blocked the bot
                    console.log('Could not send DM to temp banned user');
                }
            }
            
            // Ban the user
            await interaction.guild.members.ban(target.id, {
                reason: `Temporary ban (${duration}): ${reason}`
            });
            
            // Set timeout for automatic unban
            setTimeout(async () => {
                try {
                    await interaction.guild.members.unban(target.id, 'Automatic unban - temporary ban expired');
                    logger.log(`${target.tag || target.user.tag} automatically unbanned after ${duration}`, 'MODERATION');
                } catch (error) {
                    console.error('Error auto-unbanning user:', error);
                    logger.log(`Failed to automatically unban ${target.tag || target.user.tag}: ${error.message}`, 'ERROR');
                }
            }, banDuration);
            
            // Success response
            const successEmbed = new EmbedBuilder()
                .setColor('#e67e22')
                .setTitle('⏰ User Temporarily Banned')
                .setDescription(`**${target.tag || target.user.tag}** has been temporarily banned.`)
                .addFields(
                    { name: 'Reason', value: reason },
                    { name: 'Duration', value: duration },
                    { name: 'Unban Time', value: `<t:${Math.floor(unbanTime / 1000)}:F>` },
                    { name: 'Moderator', value: interaction.user.tag }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [successEmbed] });
            
            // Log the action
            logger.log(`${interaction.user.tag} temp banned ${target.tag || target.user.tag} for ${duration}: ${reason}`, 'MODERATION');
            
        } catch (error) {
            console.error('Error temp banning user:', error);
            await interaction.reply({
                content: '❌ An error occurred while trying to temporarily ban the user.',
                ephemeral: true
            });
        }
    }
};
