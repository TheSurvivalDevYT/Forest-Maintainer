const { pgTable, serial, varchar, integer, timestamp } = require('drizzle-orm/pg-core');

const users = pgTable('users', {
  id: serial('id').primaryKey(),
  discordId: varchar('discord_id', { length: 20 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull(),
  messageCount: integer('message_count').default(0).notNull(),
  lastMessageAt: timestamp('last_message_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

module.exports = {
  users,
};