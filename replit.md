# Discord Moderation Bot

## Overview

This is a Discord moderation bot built with Discord.js v14 that provides automated moderation capabilities for Discord servers. The bot features slash commands for common moderation actions including banning, kicking, muting, and temporary bans. It includes a permission system that restricts certain commands to authorized users and provides logging functionality for tracking moderation actions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Bot Framework
- **Discord.js v14**: Uses the official Discord.js library with gateway intents for guilds, messages, members, and moderation
- **Slash Commands**: All interactions are handled through Discord's slash command system
- **Event-Driven Architecture**: Uses Discord.js event handlers for bot lifecycle and interaction management

### Command System
- **Modular Command Structure**: Commands are organized in separate files under `/commands` directory
- **Dynamic Command Loading**: Commands are automatically loaded and registered through the command handler
- **Slash Command Registration**: Commands are registered both globally and per-guild based on configuration

### Permission System
- **Hierarchical Permissions**: Four-tier permission system (USER, MODERATOR, ADMIN, OWNER)
- **Username-Based Authorization**: Primary authorization through configurable username matching
- **Middleware Layer**: Permission checks implemented as reusable middleware functions

### Configuration Management
- **Environment Variables**: Bot token, client ID, guild ID, and authorized users configured via environment variables
- **Centralized Config**: All configuration constants managed in a single config.js file
- **Flexible Authorization**: Configurable authorized user and permission levels

### Logging System
- **File and Console Logging**: Dual logging to both files and console output
- **Timestamped Entries**: All log entries include ISO timestamps
- **Log Level Categorization**: Different log levels for INFO, ERROR, and moderation actions
- **Daily Log Files**: Logs organized by date for easy management

### Moderation Features
- **User Management**: Ban, kick, mute, and temporary ban functionality
- **Configurable Durations**: Predefined time intervals for temporary actions
- **Reason Tracking**: All moderation actions support reason logging
- **Role-Based Muting**: Uses configurable mute role for member restrictions

### Data Storage
- **JSON Configuration**: Server rules stored in structured JSON format
- **No Database Dependency**: Currently uses file-based storage for rules and configuration
- **Extensible Data Layer**: Architecture supports future database integration

## External Dependencies

### Core Dependencies
- **discord.js**: Official Discord API wrapper for bot functionality
- **dotenv**: Environment variable management for configuration

### Discord API Integration
- **Bot Permissions**: Requires specific Discord permissions for moderation actions
- **Guild Management**: Integrates with Discord's guild and member management systems
- **Role Management**: Interacts with Discord's role system for muting functionality

### Runtime Requirements
- **Node.js**: Requires Node.js runtime environment
- **Discord Bot Token**: Requires registered Discord application and bot token
- **Server Permissions**: Bot must have appropriate permissions in target Discord servers