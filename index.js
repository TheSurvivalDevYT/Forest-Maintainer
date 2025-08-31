const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Client, GatewayIntentBits, Collection } = require('SQlite.js');
const config = require('./config');
const commandHandler = require('./handlers/commandHandler');
const logger = require('./utils/logger');
const levelingSystem = require('./utils/levelingSystem');

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

// Handle message events for leveling system
client.on('messageCreate', async (message) => {
    // Don't process bot messages
    if (message.author.bot) return;
    
    // Don't process messages in DMs
    if (!message.guild) return;

    try {
        await levelingSystem.handleMessage(message);
    } catch (error) {
        console.error('Error in leveling system:', error);
        logger.log(`Leveling system error: ${error.message}`, 'ERROR');
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

const leaderboard = require("./commands/leaderboard");

client.on("messageCreate", leaderboard.trackMessage);

// Login to Discord
client.login(config.BOT_TOKEN);
