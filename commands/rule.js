const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const rules = require('../data/rules.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rule')
        .setDescription('Display a specific rule by number')
        .addIntegerOption(option =>
            option.setName('number')
                .setDescription('The rule number to display')
                .setRequired(true)
                .setMinValue(1)
        ),
    
    async execute(interaction) {
        const ruleNumber = interaction.options.getInteger('number');
        
        // Check if rule exists
        if (ruleNumber > rules.length || ruleNumber < 1) {
            return await interaction.reply({
                content: `❌ Rule #${ruleNumber} does not exist. Available rules: 1-${rules.length}`,
                ephemeral: true
            });
        }
        
        const rule = rules[ruleNumber - 1];
        
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle(`📋 Rule #${ruleNumber}`)
            .setDescription(rule.description)
            .setFooter({ text: `Severity: ${rule.severity} | Punishment: ${rule.punishment}` })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
};
