const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { checkPermissions } = require('../middleware/permissions');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to ban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('delete_days')
                .setDescription('Number of days of messages to delete (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
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
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteDays = interaction.options.getInteger('delete_days') || 0;
        
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
        
        try {
            // Send DM to the user before banning (if they're in the server)
            if (target.send) {
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setTitle('🔨 You have been banned')
                        .setDescription(`You have been banned from **${interaction.guild.name}**`)
                        .addFields(
                            { name: 'Reason', value: reason },
                            { name: 'Moderator', value: interaction.user.tag }
                        )
                        .setTimestamp();
                    
                    await target.send({ embeds: [dmEmbed] });
                } catch (error) {
                    // User has DMs disabled or blocked the bot
                    console.log('Could not send DM to banned user');
                }
            }
            
            // Ban the user
            await interaction.guild.members.ban(target.id, {
                reason: reason,
                deleteMessageDays: deleteDays
            });
            
            // Success response
            const successEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('🔨 User Banned')
                .setDescription(`**${target.tag || target.user.tag}** has been banned from the server.`)
                .addFields(
                    { name: 'Reason', value: reason },
                    { name: 'Moderator', value: interaction.user.tag },
                    { name: 'Messages Deleted', value: `${deleteDays} days` }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [successEmbed] });
            
            // Log the action
            logger.log(`${interaction.user.tag} banned ${target.tag || target.user.tag} for: ${reason}`, 'MODERATION');
            
        } catch (error) {
            console.error('Error banning user:', error);
            await interaction.reply({
                content: '❌ An error occurred while trying to ban the user.',
                ephemeral: true
            });
        }
    }
};
