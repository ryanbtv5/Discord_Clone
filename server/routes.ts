import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertServerSchema, insertChannelSchema, insertMessageSchema, insertServerInviteSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Store SSE connections
const sseConnections = new Map<string, Response[]>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Server routes
  app.post('/api/servers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const serverData = insertServerSchema.parse({
        ...req.body,
        ownerId: userId,
      });
      
      const server = await storage.createServer(serverData);
      res.json(server);
    } catch (error) {
      console.error("Error creating server:", error);
      res.status(500).json({ message: "Failed to create server" });
    }
  });

  app.get('/api/servers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const servers = await storage.getServersByUserId(userId);
      res.json(servers);
    } catch (error) {
      console.error("Error fetching servers:", error);
      res.status(500).json({ message: "Failed to fetch servers" });
    }
  });

  app.get('/api/servers/:serverId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { serverId } = req.params;
      
      const isUserInServer = await storage.isUserInServer(userId, serverId);
      if (!isUserInServer) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const server = await storage.getServerWithChannels(serverId);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }
      
      res.json(server);
    } catch (error) {
      console.error("Error fetching server:", error);
      res.status(500).json({ message: "Failed to fetch server" });
    }
  });

  // Channel routes
  app.post('/api/channels', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const channelData = insertChannelSchema.parse(req.body);
      
      const isUserInServer = await storage.isUserInServer(userId, channelData.serverId);
      if (!isUserInServer) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const channel = await storage.createChannel(channelData);
      res.json(channel);
    } catch (error) {
      console.error("Error creating channel:", error);
      res.status(500).json({ message: "Failed to create channel" });
    }
  });

  // Message routes
  app.get('/api/channels/:channelId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { channelId } = req.params;
      
      const isUserInChannel = await storage.isUserInChannel(userId, channelId);
      if (!isUserInChannel) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const messages = await storage.getMessagesByChannelId(channelId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/channels/:channelId/messages', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { channelId } = req.params;
      
      const isUserInChannel = await storage.isUserInChannel(userId, channelId);
      if (!isUserInChannel) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      let imageUrl = null;
      if (req.file) {
        // In a real app, you'd upload to a cloud storage service
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const filePath = path.join("uploads", fileName);
        await fs.rename(req.file.path, filePath);
        imageUrl = `/uploads/${fileName}`;
      }
      
      const messageData = insertMessageSchema.parse({
        content: req.body.content || null,
        imageUrl,
        channelId,
        userId,
      });
      
      const message = await storage.createMessage(messageData);
      
      // Get the full message with user data
      const [fullMessage] = await storage.getMessagesByChannelId(channelId);
      
      // Broadcast to SSE connections for this channel
      const connections = sseConnections.get(channelId) || [];
      connections.forEach(connection => {
        try {
          connection.write(`data: ${JSON.stringify({ type: 'message', data: fullMessage })}\n\n`);
        } catch (error) {
          console.error("Error sending SSE message:", error);
        }
      });
      
      res.json(fullMessage);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Server-Sent Events for real-time messaging
  app.get('/api/channels/:channelId/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { channelId } = req.params;
      
      const isUserInChannel = await storage.isUserInChannel(userId, channelId);
      if (!isUserInChannel) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });
      
      // Add connection to the channel's connection list
      if (!sseConnections.has(channelId)) {
        sseConnections.set(channelId, []);
      }
      sseConnections.get(channelId)!.push(res);
      
      // Send initial connection message
      res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
      
      // Clean up on disconnect
      req.on('close', () => {
        const connections = sseConnections.get(channelId) || [];
        const index = connections.indexOf(res);
        if (index !== -1) {
          connections.splice(index, 1);
        }
      });
      
    } catch (error) {
      console.error("Error setting up SSE:", error);
      res.status(500).json({ message: "Failed to setup real-time connection" });
    }
  });

  // Direct message routes
  app.get('/api/dm/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getDmConversationsByUserId(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching DM conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get('/api/dm/:userId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const { userId } = req.params;
      
      const messages = await storage.getDirectMessages(currentUserId, userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching DM messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/dm/:userId/messages', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const senderId = req.user.claims.sub;
      const { userId: recipientId } = req.params;
      
      let imageUrl = null;
      if (req.file) {
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const filePath = path.join("uploads", fileName);
        await fs.rename(req.file.path, filePath);
        imageUrl = `/uploads/${fileName}`;
      }
      
      const message = await storage.createDirectMessage(
        senderId,
        recipientId,
        req.body.content || undefined,
        imageUrl || undefined
      );
      
      // Get the full message with user data
      const [fullMessage] = await storage.getDirectMessages(senderId, recipientId);
      
      // Broadcast to SSE connections for both users
      const dmKey = `dm-${[senderId, recipientId].sort().join('-')}`;
      const connections = sseConnections.get(dmKey) || [];
      connections.forEach(connection => {
        try {
          connection.write(`data: ${JSON.stringify({ type: 'message', data: fullMessage })}\n\n`);
        } catch (error) {
          console.error("Error sending SSE message:", error);
        }
      });
      
      res.json(fullMessage);
    } catch (error) {
      console.error("Error creating DM:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // DM SSE events
  app.get('/api/dm/:userId/events', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const { userId } = req.params;
      
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });
      
      // Create consistent key for both users
      const dmKey = `dm-${[currentUserId, userId].sort().join('-')}`;
      if (!sseConnections.has(dmKey)) {
        sseConnections.set(dmKey, []);
      }
      sseConnections.get(dmKey)!.push(res);
      
      res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
      
      req.on('close', () => {
        const connections = sseConnections.get(dmKey) || [];
        const index = connections.indexOf(res);
        if (index !== -1) {
          connections.splice(index, 1);
        }
      });
      
    } catch (error) {
      console.error("Error setting up DM SSE:", error);
      res.status(500).json({ message: "Failed to setup real-time connection" });
    }
  });

  // User search route
  app.get('/api/users/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { q } = req.query;
      
      if (!q || typeof q !== 'string' || q.trim().length < 2) {
        return res.json([]);
      }
      
      const users = await storage.searchUsers(q.trim(), userId);
      res.json(users);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Get user by ID
  app.get('/api/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Server invite routes
  app.post('/api/servers/:serverId/invites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { serverId } = req.params;
      
      const isUserInServer = await storage.isUserInServer(userId, serverId);
      if (!isUserInServer) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Generate unique invite code
      const code = Math.random().toString(36).substring(2, 12).toUpperCase();
      
      const inviteData = insertServerInviteSchema.parse({
        code,
        serverId,
        createdById: userId,
        maxUses: req.body.maxUses || null,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
        usedCount: "0",
      });
      
      const invite = await storage.createServerInvite(inviteData);
      res.json(invite);
    } catch (error) {
      console.error("Error creating server invite:", error);
      res.status(500).json({ message: "Failed to create invite" });
    }
  });

  app.get('/api/servers/:serverId/invites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { serverId } = req.params;
      
      const isUserInServer = await storage.isUserInServer(userId, serverId);
      if (!isUserInServer) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const invites = await storage.getServerInvitesByServerId(serverId);
      res.json(invites);
    } catch (error) {
      console.error("Error fetching server invites:", error);
      res.status(500).json({ message: "Failed to fetch invites" });
    }
  });

  app.post('/api/invites/:code/join', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code } = req.params;
      
      const invite = await storage.getServerInviteByCode(code);
      if (!invite) {
        return res.status(404).json({ message: "Invalid or expired invite" });
      }
      
      // Check if invite is expired
      if (invite.expiresAt && new Date() > invite.expiresAt) {
        return res.status(400).json({ message: "Invite has expired" });
      }
      
      // Check if max uses reached
      if (invite.maxUses && parseInt(invite.usedCount) >= parseInt(invite.maxUses)) {
        return res.status(400).json({ message: "Invite has reached maximum uses" });
      }
      
      // Check if user is already in server
      const isAlreadyMember = await storage.isUserInServer(userId, invite.serverId);
      if (isAlreadyMember) {
        return res.status(400).json({ message: "You are already a member of this server" });
      }
      
      // Join server and increment usage
      await storage.joinServer(invite.serverId, userId);
      await storage.useServerInvite(code);
      
      const server = await storage.getServerWithChannels(invite.serverId);
      res.json(server);
    } catch (error) {
      console.error("Error joining server:", error);
      res.status(500).json({ message: "Failed to join server" });
    }
  });

  app.get('/api/invites/:code', async (req, res) => {
    try {
      const { code } = req.params;
      
      const invite = await storage.getServerInviteByCode(code);
      if (!invite) {
        return res.status(404).json({ message: "Invalid invite" });
      }
      
      const server = await storage.getServerWithChannels(invite.serverId);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }
      
      res.json({
        code: invite.code,
        server: {
          id: server.id,
          name: server.name,
          imageUrl: server.imageUrl,
        },
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        usedCount: invite.usedCount,
      });
    } catch (error) {
      console.error("Error fetching invite info:", error);
      res.status(500).json({ message: "Failed to fetch invite" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    next();
  });

  const httpServer = createServer(app);
  return httpServer;
}
