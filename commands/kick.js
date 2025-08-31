const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { checkPermissions } = require('../middleware/permissions');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to kick')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kick')
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
        
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        if (!target) {
            return await interaction.reply({
                content: '❌ User not found in this server.',
                ephemeral: true
            });
        }
        
        // Check if target is kickable
        if (!target.kickable) {
            return await interaction.reply({
                content: '❌ I cannot kick this user. They may have higher permissions or be the server owner.',
                ephemeral: true
            });
        }
        
        // Check if trying to kick themselves
        if (target.id === interaction.user.id) {
            return await interaction.reply({
                content: '❌ You cannot kick yourself.',
                ephemeral: true
            });
        }
        
        try {
            // Send DM to the user before kicking
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('🦶 You have been kicked')
                    .setDescription(`You have been kicked from **${interaction.guild.name}**`)
                    .addFields(
                        { name: 'Reason', value: reason },
                        { name: 'Moderator', value: interaction.user.tag }
                    )
                    .setTimestamp();
                
                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                // User has DMs disabled or blocked the bot
                console.log('Could not send DM to kicked user');
            }
            
            // Kick the user
            await target.kick(reason);
            
            // Success response
            const successEmbed = new EmbedBuilder()
                .setColor('#27ae60')
                .setTitle('✅ User Kicked')
                .setDescription(`**${target.user.tag}** has been kicked from the server.`)
                .addFields(
                    { name: 'Reason', value: reason },
                    { name: 'Moderator', value: interaction.user.tag }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [successEmbed] });
            
            // Log the action
            logger.log(`${interaction.user.tag} kicked ${target.user.tag} for: ${reason}`, 'MODERATION');
            
        } catch (error) {
            console.error('Error kicking user:', error);
            await interaction.reply({
                content: '❌ An error occurred while trying to kick the user.',
                ephemeral: true
            });
        }
    }
};
