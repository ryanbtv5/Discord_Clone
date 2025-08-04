import {
  users,
  servers,
  serverMembers,
  channels,
  messages,
  dmConversations,
  serverInvites,
  type User,
  type UpsertUser,
  type Server,
  type InsertServer,
  type Channel,
  type InsertChannel,
  type Message,
  type InsertMessage,
  type ServerWithChannels,
  type MessageWithUser,
  type DmConversation,
  type DmConversationWithUser,
  type ServerInvite,
  type InsertServerInvite,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Server operations
  createServer(server: InsertServer): Promise<Server>;
  getServersByUserId(userId: string): Promise<Server[]>;
  getServerWithChannels(serverId: string): Promise<ServerWithChannels | undefined>;
  joinServer(serverId: string, userId: string): Promise<void>;
  
  // Channel operations
  createChannel(channel: InsertChannel): Promise<Channel>;
  getChannelsByServerId(serverId: string): Promise<Channel[]>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByChannelId(channelId: string): Promise<MessageWithUser[]>;
  
  // Check permissions
  isUserInServer(userId: string, serverId: string): Promise<boolean>;
  isUserInChannel(userId: string, channelId: string): Promise<boolean>;
  
  // Direct message operations
  createDmConversation(user1Id: string, user2Id: string): Promise<DmConversation>;
  getDmConversation(user1Id: string, user2Id: string): Promise<DmConversation | undefined>;
  getDmConversationsByUserId(userId: string): Promise<DmConversationWithUser[]>;
  createDirectMessage(senderId: string, recipientId: string, content?: string, imageUrl?: string): Promise<Message>;
  getDirectMessages(user1Id: string, user2Id: string): Promise<MessageWithUser[]>;
  
  // Server invite operations
  createServerInvite(inviteData: InsertServerInvite): Promise<ServerInvite>;
  getServerInviteByCode(code: string): Promise<ServerInvite | undefined>;
  useServerInvite(code: string): Promise<void>;
  getServerInvitesByServerId(serverId: string): Promise<ServerInvite[]>;
  
  // User search
  searchUsers(query: string, excludeUserId?: string): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Server operations
  async createServer(serverData: InsertServer): Promise<Server> {
    const [server] = await db
      .insert(servers)
      .values(serverData)
      .returning();
    
    // Add the owner as a member
    await db.insert(serverMembers).values({
      serverId: server.id,
      userId: serverData.ownerId,
      role: "owner",
    });
    
    // Create a default general channel
    await db.insert(channels).values({
      name: "general",
      type: "text",
      serverId: server.id,
    });
    
    return server;
  }

  async getServersByUserId(userId: string): Promise<Server[]> {
    const userServers = await db
      .select({
        id: servers.id,
        name: servers.name,
        imageUrl: servers.imageUrl,
        ownerId: servers.ownerId,
        createdAt: servers.createdAt,
        updatedAt: servers.updatedAt,
      })
      .from(servers)
      .innerJoin(serverMembers, eq(servers.id, serverMembers.serverId))
      .where(eq(serverMembers.userId, userId));
    
    return userServers;
  }

  async getServerWithChannels(serverId: string): Promise<ServerWithChannels | undefined> {
    const [server] = await db.select().from(servers).where(eq(servers.id, serverId));
    if (!server) return undefined;

    const serverChannels = await db
      .select()
      .from(channels)
      .where(eq(channels.serverId, serverId));

    return {
      ...server,
      channels: serverChannels,
    };
  }

  async joinServer(serverId: string, userId: string): Promise<void> {
    await db.insert(serverMembers).values({
      serverId,
      userId,
      role: "member",
    });
  }

  // Channel operations
  async createChannel(channelData: InsertChannel): Promise<Channel> {
    const [channel] = await db
      .insert(channels)
      .values(channelData)
      .returning();
    return channel;
  }

  async getChannelsByServerId(serverId: string): Promise<Channel[]> {
    return await db
      .select()
      .from(channels)
      .where(eq(channels.serverId, serverId));
  }

  // Message operations
  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    return message;
  }

  async getMessagesByChannelId(channelId: string): Promise<MessageWithUser[]> {
    return await db
      .select({
        id: messages.id,
        content: messages.content,
        imageUrl: messages.imageUrl,
        channelId: messages.channelId,
        userId: messages.userId,
        recipientId: messages.recipientId,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(messages)
      .innerJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.channelId, channelId))
      .orderBy(desc(messages.createdAt));
  }

  // Permission checks
  async isUserInServer(userId: string, serverId: string): Promise<boolean> {
    const [member] = await db
      .select()
      .from(serverMembers)
      .where(and(eq(serverMembers.userId, userId), eq(serverMembers.serverId, serverId)));
    return !!member;
  }

  async isUserInChannel(userId: string, channelId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(channels)
      .innerJoin(serverMembers, eq(channels.serverId, serverMembers.serverId))
      .where(and(eq(channels.id, channelId), eq(serverMembers.userId, userId)));
    return !!result;
  }

  async getServerMembers(serverId: string): Promise<Array<User & { isOwner: boolean }>> {
    const server = await db.select().from(servers).where(eq(servers.id, serverId)).limit(1);
    if (!server.length) return [];
    
    const ownerId = server[0].ownerId;
    
    const members = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .innerJoin(serverMembers, eq(users.id, serverMembers.userId))
      .where(eq(serverMembers.serverId, serverId));

    return members.map(member => ({
      ...member,
      isOwner: member.id === ownerId,
    }));
  }

  // Direct message operations
  async createDmConversation(user1Id: string, user2Id: string): Promise<DmConversation> {
    // Check if conversation already exists
    const existing = await this.getDmConversation(user1Id, user2Id);
    if (existing) return existing;

    const [conversation] = await db
      .insert(dmConversations)
      .values({
        user1Id: user1Id < user2Id ? user1Id : user2Id, // Always store smaller ID first
        user2Id: user1Id < user2Id ? user2Id : user1Id,
      })
      .returning();
    return conversation;
  }

  async getDmConversation(user1Id: string, user2Id: string): Promise<DmConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(dmConversations)
      .where(
        or(
          and(eq(dmConversations.user1Id, user1Id), eq(dmConversations.user2Id, user2Id)),
          and(eq(dmConversations.user1Id, user2Id), eq(dmConversations.user2Id, user1Id))
        )
      );
    return conversation;
  }

  async getDmConversationsByUserId(userId: string): Promise<DmConversationWithUser[]> {
    const conversations = await db
      .select({
        id: dmConversations.id,
        user1Id: dmConversations.user1Id,
        user2Id: dmConversations.user2Id,
        createdAt: dmConversations.createdAt,
        updatedAt: dmConversations.updatedAt,
        otherUser: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(dmConversations)
      .innerJoin(
        users,
        or(
          and(eq(dmConversations.user1Id, userId), eq(users.id, dmConversations.user2Id)),
          and(eq(dmConversations.user2Id, userId), eq(users.id, dmConversations.user1Id))
        )
      )
      .where(or(eq(dmConversations.user1Id, userId), eq(dmConversations.user2Id, userId)));

    return conversations as DmConversationWithUser[];
  }

  async createDirectMessage(senderId: string, recipientId: string, content?: string, imageUrl?: string): Promise<Message> {
    // Ensure DM conversation exists
    await this.createDmConversation(senderId, recipientId);

    const [message] = await db
      .insert(messages)
      .values({
        content,
        imageUrl,
        userId: senderId,
        recipientId,
        channelId: null, // null for DMs
      })
      .returning();
    return message;
  }

  async getDirectMessages(user1Id: string, user2Id: string): Promise<MessageWithUser[]> {
    return await db
      .select({
        id: messages.id,
        content: messages.content,
        imageUrl: messages.imageUrl,
        channelId: messages.channelId,
        userId: messages.userId,
        recipientId: messages.recipientId,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(messages)
      .innerJoin(users, eq(messages.userId, users.id))
      .where(
        and(
          sql`${messages.channelId} IS NULL`, // DMs only
          or(
            and(eq(messages.userId, user1Id), eq(messages.recipientId, user2Id)),
            and(eq(messages.userId, user2Id), eq(messages.recipientId, user1Id))
          )
        )
      )
      .orderBy(desc(messages.createdAt));
  }

  // Server invite operations
  async createServerInvite(inviteData: InsertServerInvite): Promise<ServerInvite> {
    const [invite] = await db
      .insert(serverInvites)
      .values(inviteData)
      .returning();
    return invite;
  }

  async getServerInviteByCode(code: string): Promise<ServerInvite | undefined> {
    const [invite] = await db
      .select()
      .from(serverInvites)
      .where(eq(serverInvites.code, code));
    return invite;
  }

  async useServerInvite(code: string): Promise<void> {
    await db
      .update(serverInvites)
      .set({
        usedCount: sql`CAST(COALESCE(${serverInvites.usedCount}, '0') AS INTEGER) + 1`,
      })
      .where(eq(serverInvites.code, code));
  }

  async getServerInvitesByServerId(serverId: string): Promise<ServerInvite[]> {
    return await db
      .select()
      .from(serverInvites)
      .where(eq(serverInvites.serverId, serverId));
  }

  // User search
  async searchUsers(query: string, excludeUserId?: string): Promise<User[]> {
    let whereCondition = or(
      sql`LOWER(${users.firstName}) LIKE LOWER(${`%${query}%`})`,
      sql`LOWER(${users.lastName}) LIKE LOWER(${`%${query}%`})`,
      sql`LOWER(${users.email}) LIKE LOWER(${`%${query}%`})`
    );

    if (excludeUserId) {
      whereCondition = and(whereCondition, sql`${users.id} != ${excludeUserId}`);
    }

    return await db
      .select()
      .from(users)
      .where(whereCondition)
      .limit(20);
  }
}

export const storage = new DatabaseStorage();
