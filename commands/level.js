const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const levelingSystem = require('../utils/levelingSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Check your or another user\'s message count and level')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check (optional)')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        
        try {
            const messageCount = await levelingSystem.getUserMessageCount(targetUser.id);
            
            // Find the user's current milestone
            const milestones = [
                { messages: 100, roleName: '100 Messages' },
                { messages: 500, roleName: '500 Messages' },
                { messages: 1000, roleName: '1000 Messages' },
                { messages: 2500, roleName: '2500 Messages' },
                { messages: 5000, roleName: '5000 Messages' },
                { messages: 10000, roleName: '10000 Messages' },
                { messages: 25000, roleName: '25000 Messages' },
                { messages: 50000, roleName: '50000 Messages' }
            ];
            
            let currentMilestone = null;
            let nextMilestone = null;
            
            for (let i = 0; i < milestones.length; i++) {
                if (messageCount >= milestones[i].messages) {
                    currentMilestone = milestones[i];
                } else {
                    nextMilestone = milestones[i];
                    break;
                }
            }
            
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle(`📊 ${targetUser.username}'s Level Statistics`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '📝 Total Messages', value: messageCount.toString(), inline: true }
                )
                .setTimestamp();
            
            if (currentMilestone) {
                embed.addFields({ 
                    name: '🏆 Current Milestone', 
                    value: currentMilestone.roleName, 
                    inline: true 
                });
            }
            
            if (nextMilestone) {
                const remaining = nextMilestone.messages - messageCount;
                embed.addFields({ 
                    name: '🎯 Next Milestone', 
                    value: `${nextMilestone.roleName}\n(${remaining} messages to go)`, 
                    inline: true 
                });
            } else if (messageCount >= 50000) {
                embed.addFields({ 
                    name: '👑 Status', 
                    value: 'Maximum level reached!', 
                    inline: true 
                });
            }
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error checking level:', error);
            await interaction.reply({
                content: '❌ An error occurred while checking the level information.',
                ephemeral: true
            });
        }
    }
};