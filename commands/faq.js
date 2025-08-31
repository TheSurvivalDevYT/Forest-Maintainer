const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const faqs = require('../data/faq.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('faq')
        .setDescription('Display frequently asked questions')
        .addIntegerOption(option =>
            option.setName('number')
                .setDescription('The FAQ number to display')
                .setRequired(true)
                .setMinValue(1)
        ),
    
    async execute(interaction) {
        const faqNumber = interaction.options.getInteger('number');
        
        // Check if FAQ exists
        if (faqNumber > faqs.length || faqNumber < 1) {
            return await interaction.reply({
                content: `❌ FAQ #${faqNumber} does not exist. Available FAQs: 1-${faqs.length}`,
                ephemeral: true
            });
        }
        
        const faq = faqs[faqNumber - 1];
        
        const embed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle(`❓ FAQ #${faqNumber}: ${faq.question}`)
            .setDescription(faq.answer)
            .setTimestamp();
        
        if (faq.category) {
            embed.setFooter({ text: `Category: ${faq.category}` });
        }
        
        await interaction.reply({ embeds: [embed] });
    }
};