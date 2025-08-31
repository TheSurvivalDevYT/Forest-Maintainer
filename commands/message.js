const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkPermissions } = require('../middleware/permissions');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('message')
        .setDescription('Send an anonymous message to a channel')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send the message to')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('content')
                .setDescription('The message content to send')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Optional title for the message')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Embed color (hex code without #)')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        // Check permissions - only authorized users can send anonymous messages
        if (!checkPermissions(interaction.user, 'ADMIN')) {
            return await interaction.reply({
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
        }
        
        const channel = interaction.options.getChannel('channel');
        const content = interaction.options.getString('content');
        const title = interaction.options.getString('title');
        const color = interaction.options.getString('color');
        
        // Validate channel type
        if (!channel.isTextBased()) {
            return await interaction.reply({
                content: '❌ You can only send messages to text channels.',
                ephemeral: true
            });
        }
        
        // Validate color if provided
        let embedColor = '#3498db'; // Default blue
        if (color) {
            const hexPattern = /^[0-9A-Fa-f]{6}$/;
            if (hexPattern.test(color)) {
                embedColor = `#${color}`;
            } else {
                return await interaction.reply({
                    content: '❌ Invalid color format. Please use a 6-digit hex code (e.g., ff0000 for red).',
                    ephemeral: true
                });
            }
        }
        
        try {
            // Create embed for the anonymous message
            const messageEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setDescription(content)
                .setTimestamp();
            
            if (title) {
                messageEmbed.setTitle(title);
            }
            
            // Send the message to the specified channel
            await channel.send({ embeds: [messageEmbed] });
            
            // Confirm to the user (privately)
            const confirmEmbed = new EmbedBuilder()
                .setColor('#27ae60')
                .setTitle('✅ Anonymous Message Sent')
                .setDescription(`Your message has been sent to ${channel.toString()}`)
                .addFields(
                    { name: 'Content Preview', value: content.length > 100 ? content.substring(0, 100) + '...' : content }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
            
            // Log the action (with user info for audit purposes)
            logger.log(`${interaction.user.tag} sent anonymous message to #${channel.name}: ${content.substring(0, 50)}...`, 'ANONYMOUS_MESSAGE');
            
        } catch (error) {
            console.error('Error sending anonymous message:', error);
            await interaction.reply({
                content: '❌ An error occurred while trying to send the message. Please check that I have permission to send messages in that channel.',
                ephemeral: true
            });
        }
    }
};
