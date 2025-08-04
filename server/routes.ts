import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertServerSchema, insertChannelSchema, insertMessageSchema } from "@shared/schema";
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

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    next();
  });

  const httpServer = createServer(app);
  return httpServer;
}
