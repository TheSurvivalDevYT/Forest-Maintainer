const { Client, GatewayIntentBits, Collection } = require('discord.js');
const config = require('./config');
const commandHandler = require('./handlers/commandHandler');
const logger = require('./utils/logger');

// Create Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration
    ]
});

// Initialize commands collection
client.commands = new Collection();

// Load commands
commandHandler.loadCommands(client);

// Bot ready event
client.once('ready', () => {
    console.log(`${client.user.tag} is online and ready!`);
    logger.log('Bot started successfully', 'INFO');
    
    // Register slash commands
    commandHandler.registerSlashCommands(client);
});

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
        logger.log(`Command ${interaction.commandName} executed by ${interaction.user.tag}`, 'INFO');
    } catch (error) {
        console.error('Error executing command:', error);
        logger.log(`Error executing command ${interaction.commandName}: ${error.message}`, 'ERROR');
        
        const errorMessage = 'There was an error while executing this command!';
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

// Handle errors
client.on('error', (error) => {
    console.error('Discord client error:', error);
    logger.log(`Discord client error: ${error.message}`, 'ERROR');
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
    logger.log(`Unhandled rejection: ${error.message}`, 'ERROR');
});

// Login to Discord
client.login(config.BOT_TOKEN);
