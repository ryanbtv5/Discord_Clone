import {
  users,
  servers,
  serverMembers,
  channels,
  messages,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
