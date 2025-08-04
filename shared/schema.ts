import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Servers (Discord Guilds)
export const servers = pgTable("servers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  imageUrl: varchar("image_url"),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Server Members
export const serverMembers = pgTable("server_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serverId: varchar("server_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: varchar("role", { length: 20 }).default("member"), // owner, admin, member
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Channels
export const channels = pgTable("channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).default("text"), // text, voice
  description: text("description"),
  serverId: varchar("server_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content"),
  imageUrl: varchar("image_url"),
  channelId: varchar("channel_id"), // nullable for DMs
  userId: varchar("user_id").notNull(),
  recipientId: varchar("recipient_id"), // for direct messages
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Direct Message Conversations
export const dmConversations = pgTable("dm_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user1Id: varchar("user1_id").notNull(),
  user2Id: varchar("user2_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Server Invites
export const serverInvites = pgTable("server_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 10 }).notNull().unique(),
  serverId: varchar("server_id").notNull(),
  createdById: varchar("created_by_id").notNull(),
  maxUses: varchar("max_uses"), // null for unlimited
  usedCount: varchar("used_count").default("0"),
  expiresAt: timestamp("expires_at"), // null for no expiration
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  serverMembers: many(serverMembers),
  ownedServers: many(servers),
  messages: many(messages),
}));

export const serversRelations = relations(servers, ({ one, many }) => ({
  owner: one(users, {
    fields: [servers.ownerId],
    references: [users.id],
  }),
  members: many(serverMembers),
  channels: many(channels),
}));

export const serverMembersRelations = relations(serverMembers, ({ one }) => ({
  server: one(servers, {
    fields: [serverMembers.serverId],
    references: [servers.id],
  }),
  user: one(users, {
    fields: [serverMembers.userId],
    references: [users.id],
  }),
}));

export const channelsRelations = relations(channels, ({ one, many }) => ({
  server: one(servers, {
    fields: [channels.serverId],
    references: [servers.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  channel: one(channels, {
    fields: [messages.channelId],
    references: [channels.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
  }),
}));

export const dmConversationsRelations = relations(dmConversations, ({ one, many }) => ({
  user1: one(users, {
    fields: [dmConversations.user1Id],
    references: [users.id],
  }),
  user2: one(users, {
    fields: [dmConversations.user2Id],
    references: [users.id],
  }),
}));

export const serverInvitesRelations = relations(serverInvites, ({ one }) => ({
  server: one(servers, {
    fields: [serverInvites.serverId],
    references: [servers.id],
  }),
  createdBy: one(users, {
    fields: [serverInvites.createdById],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertServerSchema = createInsertSchema(servers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServerInviteSchema = createInsertSchema(serverInvites).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Server = typeof servers.$inferSelect;
export type InsertServer = z.infer<typeof insertServerSchema>;
export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type ServerMember = typeof serverMembers.$inferSelect;
export type DmConversation = typeof dmConversations.$inferSelect;
export type ServerInvite = typeof serverInvites.$inferSelect;
export type InsertServerInvite = z.infer<typeof insertServerInviteSchema>;

// Extended types with relations  
export type ServerWithChannels = Server & {
  channels: Channel[];
};

export type MessageWithUser = Message & {
  user: User;
  recipient?: User;
};

export type DmConversationWithUser = DmConversation & {
  otherUser: User;
  lastMessage?: MessageWithUser;
};
