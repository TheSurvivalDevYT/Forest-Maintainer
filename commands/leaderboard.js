const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const levelingSystem = require('../utils/levelingSystem');

module.exports = {
		data: new SlashCommandBuilder()
				.setName('leaderboard')
				.setDescription('Show the top users by message count')
				.addIntegerOption(option =>
						option.setName('limit')
								.setDescription('Number of top users to show (default 10)')
								.setRequired(false)
				),

		async execute(interaction) {
				const limit = interaction.options.getInteger('limit') || 10;

				try {
						const topUsers = await levelingSystem.getTopUsers(limit);

						if (!topUsers || topUsers.length === 0) {
								return interaction.reply({
										content: 'No users found in the database yet. Have your members send some messages first!',
										ephemeral: true
								});
						}

						// Map top users to leaderboard string with Discord mentions if available
						const leaderboard = topUsers
								.map((user, index) => {
										// Check if the user is in the guild to mention them
										const member = interaction.guild.members.cache.get(user.discordId);
										const displayName = member ? `<@${user.discordId}>` : user.username;
										return `**${index + 1}.** ${displayName} — ${user.messageCount} messages`;
								})
								.join('\n');

						const embed = new EmbedBuilder()
								.setTitle('📊 Message Leaderboard')
								.setDescription(leaderboard)
								.setColor('#3498db')
								.setTimestamp()
								.setFooter({ text: `Top ${topUsers.length} users` });

						await interaction.reply({ embeds: [embed] });

				} catch (error) {
						console.error('Error fetching leaderboard:', error);
						await interaction.reply({
								content: '❌ An error occurred while fetching the leaderboard.',
								ephemeral: true
						});
				}
		}
};
