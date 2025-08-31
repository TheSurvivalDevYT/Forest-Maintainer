const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { checkPermissions } = require('../middleware/permissions');
const config = require('../config');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a member in the server')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to mute')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the mute')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration of the mute (e.g., 1h, 6h, 1d)')
                .setRequired(false)
                .addChoices(
                    { name: '1 hour', value: '1h' },
                    { name: '6 hours', value: '6h' },
                    { name: '12 hours', value: '12h' },
                    { name: '1 day', value: '1d' },
                    { name: '3 days', value: '3d' },
                    { name: '7 days', value: '7d' },
                    { name: 'Permanent', value: 'permanent' }
                )
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
        const duration = interaction.options.getString('duration') || 'permanent';
        
        if (!target) {
            return await interaction.reply({
                content: '❌ User not found in this server.',
                ephemeral: true
            });
        }
        
        // Check if trying to mute themselves
        if (target.id === interaction.user.id) {
            return await interaction.reply({
                content: '❌ You cannot mute yourself.',
                ephemeral: true
            });
        }
        
        try {
            // Find or create mute role
            let muteRole = interaction.guild.roles.cache.find(role => role.name === config.MUTE_ROLE_NAME);
            
            if (!muteRole) {
                muteRole = await interaction.guild.roles.create({
                    name: config.MUTE_ROLE_NAME,
                    color: '#95a5a6',
                    permissions: [],
                    reason: 'Mute role for moderation'
                });
                
                // Set permissions for all channels
                interaction.guild.channels.cache.forEach(async (channel) => {
                    await channel.permissionOverwrites.edit(muteRole, {
                        SendMessages: false,
                        Speak: false,
                        AddReactions: false
                    });
                });
            }
            
            // Check if user is already muted
            if (target.roles.cache.has(muteRole.id)) {
                return await interaction.reply({
                    content: '❌ This user is already muted.',
                    ephemeral: true
                });
            }
            
            // Add mute role
            await target.roles.add(muteRole, reason);
            
            // Calculate unmute time
            let unmuteTime = null;
            let durationText = 'Permanent';
            
            if (duration !== 'permanent' && config.TEMPBAN_DURATIONS[duration]) {
                unmuteTime = Date.now() + config.TEMPBAN_DURATIONS[duration];
                durationText = duration;
                
                // Set timeout for automatic unmute
                setTimeout(async () => {
                    try {
                        const member = await interaction.guild.members.fetch(target.id);
                        if (member && member.roles.cache.has(muteRole.id)) {
                            await member.roles.remove(muteRole, 'Automatic unmute - duration expired');
                            logger.log(`${target.user.tag} automatically unmuted after ${duration}`, 'MODERATION');
                        }
                    } catch (error) {
                        console.error('Error auto-unmuting user:', error);
                    }
                }, config.TEMPBAN_DURATIONS[duration]);
            }
            
            // Send DM to the user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#f39c12')
                    .setTitle('🔇 You have been muted')
                    .setDescription(`You have been muted in **${interaction.guild.name}**`)
                    .addFields(
                        { name: 'Reason', value: reason },
                        { name: 'Duration', value: durationText },
                        { name: 'Moderator', value: interaction.user.tag }
                    )
                    .setTimestamp();
                
                if (unmuteTime) {
                    dmEmbed.addFields({ name: 'Unmute Time', value: `<t:${Math.floor(unmuteTime / 1000)}:F>` });
                }
                
                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                // User has DMs disabled or blocked the bot
                console.log('Could not send DM to muted user');
            }
            
            // Success response
            const successEmbed = new EmbedBuilder()
                .setColor('#f39c12')
                .setTitle('🔇 User Muted')
                .setDescription(`**${target.user.tag}** has been muted.`)
                .addFields(
                    { name: 'Reason', value: reason },
                    { name: 'Duration', value: durationText },
                    { name: 'Moderator', value: interaction.user.tag }
                )
                .setTimestamp();
            
            if (unmuteTime) {
                successEmbed.addFields({ name: 'Unmute Time', value: `<t:${Math.floor(unmuteTime / 1000)}:F>` });
            }
            
            await interaction.reply({ embeds: [successEmbed] });
            
            // Log the action
            logger.log(`${interaction.user.tag} muted ${target.user.tag} for ${duration}: ${reason}`, 'MODERATION');
            
        } catch (error) {
            console.error('Error muting user:', error);
            await interaction.reply({
                content: '❌ An error occurred while trying to mute the user.',
                ephemeral: true
            });
        }
    }
};
