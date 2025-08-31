const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('../config');

class CommandHandler {
    /**
     * Load all command files from the commands directory
     * @param {Client} client - Discord client instance
     */
    loadCommands(client) {
        const commandsPath = path.join(__dirname, '../commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        console.log(`Loading ${commandFiles.length} commands...`);
        
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            
            // Validate command structure
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                console.log(`✅ Loaded command: ${command.data.name}`);
            } else {
                console.log(`⚠️  Warning: Command at ${filePath} is missing required "data" or "execute" property.`);
            }
        }
        
        console.log('Command loading complete!');
    }
    
    /**
     * Register slash commands with Discord
     * @param {Client} client - Discord client instance
     */
    async registerSlashCommands(client) {
        const commands = [];
        
        // Convert all loaded commands to JSON for registration
        client.commands.forEach(command => {
            commands.push(command.data.toJSON());
        });
        
        const rest = new REST({ version: '10' }).setToken(config.BOT_TOKEN);
        
        try {
            console.log('🔄 Started refreshing application (/) commands...');
            
            if (config.GUILD_ID) {
                // Register commands for a specific guild (faster for development)
                await rest.put(
                    Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
                    { body: commands }
                );
                console.log(`✅ Successfully reloaded ${commands.length} guild commands.`);
            } else {
                // Register commands globally (takes up to 1 hour to update)
                await rest.put(
                    Routes.applicationCommands(config.CLIENT_ID),
                    { body: commands }
                );
                console.log(`✅ Successfully reloaded ${commands.length} global commands.`);
            }
        } catch (error) {
            console.error('Error registering slash commands:', error);
        }
    }
    
    /**
     * Reload a specific command
     * @param {Client} client - Discord client instance
     * @param {string} commandName - Name of the command to reload
     */
    reloadCommand(client, commandName) {
        const commandPath = path.join(__dirname, '../commands', `${commandName}.js`);
        
        if (!fs.existsSync(commandPath)) {
            throw new Error(`Command file ${commandName}.js not found`);
        }
        
        // Delete from require cache
        delete require.cache[require.resolve(commandPath)];
        
        // Reload the command
        const command = require(commandPath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`✅ Reloaded command: ${command.data.name}`);
            return true;
        } else {
            throw new Error(`Command at ${commandPath} is missing required "data" or "execute" property.`);
        }
    }
    
    /**
     * Get command information
     * @param {Client} client - Discord client instance
     * @returns {Array} Array of command information
     */
    getCommandInfo(client) {
        const commandInfo = [];
        
        client.commands.forEach(command => {
            commandInfo.push({
                name: command.data.name,
                description: command.data.description,
                options: command.data.options?.length || 0
            });
        });
        
        return commandInfo;
    }
}

module.exports = new CommandHandler();
