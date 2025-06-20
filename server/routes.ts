import type { Express, Request } from "express";

// Extend Request type to include sessionID
declare global {
  namespace Express {
    interface Request {
      sessionID: string;
    }
  }
}
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { SolanaService } from "./services/solana";
import { TelegramService } from "./services/telegram";
import { YieldAnalyzer } from "./services/yield-analyzer";
import { OpenAIService } from "./services/openai";
import { z } from "zod";
import {
  insertUserPreferencesSchema,
  insertUserPortfolioSchema,
  insertTransactionSchema,
  insertUserSchema,
  insertSolanaSubscriptionSchema,
  prisma
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize services
  const solanaService = new SolanaService();
  const telegramService = new TelegramService();
  const yieldAnalyzer = new YieldAnalyzer();
  const openAIService = new OpenAIService();

  // API routes
  // ===========================================================

  // Wallet Routes
  app.get("/api/wallet/status", async (req, res) => {
    try {
      const walletStatus = await solanaService.getWalletStatus(req.sessionID);
      res.json(walletStatus);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // New endpoint to register users
  app.post("/api/wallet/register", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      // Check if user already exists
      let user = await storage.getUserByWalletAddress(walletAddress);
      let isNewUser = false;
      
      // If user doesn't exist, create a new one
      if (!user) {
        try {
          user = await storage.createUser({
            walletAddress,
            username: null,
            email: null,
            lastLogin: new Date()
          });
          isNewUser = true;
        } catch (error: any) {
          // If there's a unique constraint error, try to fetch the user again
          if (error.code === 'P2002' && error.meta?.target?.includes('wallet_address')) {
            user = await storage.getUserByWalletAddress(walletAddress);
            if (!user) {
              throw error; // Re-throw if we still can't find the user
            }
          } else {
            throw error; // Re-throw other errors
          }
        }
        
        // Create default user preferences for new users
        if (isNewUser) {
          try {
            await storage.createUserPreferences(user.id.toString(), {
              userId: user.id,
              riskTolerance: 'moderate-conservative',
              preferredChains: ['solana'],
              preferredTokens: ['SOL', 'USDC'],
              notificationsEnabled: true,
              telegramChatId: null,
              telegramUsername: null
            });
          } catch (error) {
            console.error('Error creating user preferences:', error);
            // Continue even if preferences creation fails
          }
        }
      } else {
        // Update last login time
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() }
        });
      }
      
      // Associate the session with the user ID
      req.sessionID = user.id.toString();
      
      res.json({ success: true, userId: user.id });
    } catch (error: any) {
      console.error('Error registering user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/wallet/connect", async (req, res) => {
    try {
      // In a real app, we would handle wallet signature validation
      // For this demo, we'll simulate connecting with a test wallet
      const walletData = await solanaService.connectWallet(req.sessionID);
      
      // If a user ID was returned, we've successfully registered the user
      if (walletData.userId) {
        console.log(`User ${walletData.userId} connected with wallet ${walletData.address}`);
      }
      
      res.json(walletData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/wallet/disconnect", async (req, res) => {
    try {
      await solanaService.disconnectWallet(req.sessionID);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/wallet/info", async (req, res) => {
    try {
      // First check if there's a wallet connected for this session
      const walletStatus = await solanaService.getWalletStatus(req.sessionID);
      
      if (!walletStatus.connected || !walletStatus.address) {
        return res.status(401).json({ error: "Not connected" });
      }
      
      // Get the wallet info
      const walletInfo = await solanaService.getWalletInfo(req.sessionID);
      
      // Check for subscription status
      let isSubscribed = false;
      if (walletStatus.userId) {
        isSubscribed = await storage.checkUserIsSubscribed(walletStatus.userId);
      } else {
        // Try to find user by wallet address
        const user = await storage.getUserByWalletAddress(walletInfo.address);
        if (user) {
          isSubscribed = await storage.checkUserIsSubscribed(user.id);
          
          // Update the session with the user ID if found
          await solanaService.setUserIdForSession(req.sessionID, user.id);
        }
      }
      
      // Add subscription status to the response
      res.json({
        ...walletInfo,
        isSubscribed
      });
    } catch (error: any) {
      console.error('Error getting wallet info:', error);
      res.status(401).json({ error: "Not connected" });
    }
  });
  
  // Subscription endpoints
  app.get("/api/wallet/subscription", async (req, res) => {
    try {
      const address = req.query.address as string;
      
      if (!address) {
        return res.status(400).json({ error: "Wallet address required" });
      }
      
      // Find user by wallet address
      const user = await storage.getUserByWalletAddress(address);
      
      if (!user) {
        return res.json({ isSubscribed: false });
      }
      
      // Check if user has an active subscription
      const isSubscribed = await storage.checkUserIsSubscribed(user.id);
      
      res.json({ isSubscribed });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/wallet/subscribe", async (req, res) => {
    try {
      const subscriptionSchema = z.object({
        walletAddress: z.string(),
        transactionHash: z.string(),
        amount: z.number(),
        currency: z.string().default("USDC")
      });
      
      const { walletAddress, transactionHash, amount, currency } = subscriptionSchema.parse(req.body);
      
      // Get wallet status to check if connected and get user ID
      const walletStatus = await solanaService.getWalletStatus(req.sessionID);
      let userId: number;
      
      if (walletStatus.connected && walletStatus.userId) {
        userId = walletStatus.userId;
      } else {
        // Find or create user if not connected through the session
      let user = await storage.getUserByWalletAddress(walletAddress);
      
      if (!user) {
          try {
        user = await storage.createUser({
          walletAddress,
          username: null,
          email: null,
          lastLogin: new Date()
            });
          } catch (error: any) {
            // If there's a unique constraint error, try to fetch the user again
            if (error.code === 'P2002' && error.meta?.target?.includes('wallet_address')) {
              user = await storage.getUserByWalletAddress(walletAddress);
              if (!user) {
                throw error; // Re-throw if we still can't find the user
              }
            } else {
              throw error; // Re-throw other errors
            }
          }
        }
        
        userId = user.id;
        
        // Associate the user ID with the session if there's a wallet connected
        if (walletStatus.connected) {
          await solanaService.setUserIdForSession(req.sessionID, userId);
        }
      }
      
      // Check if user already has an active subscription
      const existingSubscription = await storage.getUserSubscription(userId);
      
      if (existingSubscription && existingSubscription.isActive) {
        return res.json({ 
          success: true, 
          subscription: existingSubscription,
          message: "Subscription already active" 
        });
      }
      
      // Create subscription record
      const subscription = await storage.createSubscription({
        userId,
        transactionHash,
        amount: amount.toString(),
        currency,
        isActive: true
      });
      
      res.json({ success: true, subscription });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Yield Routes
  app.get("/api/yields", async (req, res) => {
    try {
      const protocol = req.query.protocol as string;
      const sortBy = req.query.sortBy as string;
      console.log(`Fetching yield opportunities - protocol: ${protocol || 'all'}, sortBy: ${sortBy || 'apy'}`);
      const opportunities = await yieldAnalyzer.getYieldOpportunities(protocol, sortBy);
      res.json(opportunities);
    } catch (error: any) {
      console.error('Error fetching yield opportunities:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/yields/best", async (req, res) => {
    try {
      const bestYield = await yieldAnalyzer.getBestYieldOpportunity();
      res.json(bestYield);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/yields/stats", async (req, res) => {
    try {
      const stats = await yieldAnalyzer.getYieldStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Portfolio Routes
  app.get("/api/portfolio", async (req, res) => {
    try {
      const timeRange = req.query.timeRange as string || "1M";
      
      // Get wallet status to check if connected and get user ID
      const walletStatus = await solanaService.getWalletStatus(req.sessionID);
      
      if (!walletStatus.connected) {
        return res.status(401).json({ error: "Not connected" });
      }
      
      let userId = walletStatus.userId;
      
      // If no user ID in session but we have a wallet address, try to find the user
      if (!userId && walletStatus.address) {
        const user = await storage.getUserByWalletAddress(walletStatus.address);
        if (user) {
          userId = user.id;
          // Update the session with the user ID
          await solanaService.setUserIdForSession(req.sessionID, userId);
        }
      }
      
      if (!userId) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const portfolio = await storage.getUserPortfolio(userId.toString(), timeRange);
      res.json(portfolio);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/portfolio/summary", async (req, res) => {
    try {
      // Get wallet status to check if connected and get user ID
      const walletStatus = await solanaService.getWalletStatus(req.sessionID);
      
      if (!walletStatus.connected) {
        return res.status(401).json({ error: "Not connected" });
      }
      
      let userId = walletStatus.userId;
      
      // If no user ID in session but we have a wallet address, try to find the user
      if (!userId && walletStatus.address) {
        const user = await storage.getUserByWalletAddress(walletStatus.address);
        if (user) {
          userId = user.id;
          // Update the session with the user ID
          await solanaService.setUserIdForSession(req.sessionID, userId);
        }
      }
      
      if (!userId) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const summary = await storage.getPortfolioSummary(userId.toString());
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/portfolio/invest", async (req, res) => {
    try {
      // Get wallet status to check if connected and get user ID
      const walletStatus = await solanaService.getWalletStatus(req.sessionID);
      
      if (!walletStatus.connected || !walletStatus.userId) {
        return res.status(401).json({ error: "Not connected or user not found" });
      }
      
      const investData = insertUserPortfolioSchema.parse(req.body);
      const result = await storage.createInvestment(walletStatus.userId.toString(), investData);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Transaction Routes
  app.get("/api/transactions", async (req, res) => {
    try {
      const filter = req.query.filter as string || "all";
      
      // Get wallet status to check if connected and get user ID
      const walletStatus = await solanaService.getWalletStatus(req.sessionID);
      
      if (!walletStatus.connected || !walletStatus.userId) {
        return res.status(401).json({ error: "Not connected or user not found" });
      }
      
      const transactions = await storage.getUserTransactions(walletStatus.userId.toString(), filter);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      // Get wallet status to check if connected and get user ID
      const walletStatus = await solanaService.getWalletStatus(req.sessionID);
      
      if (!walletStatus.connected || !walletStatus.userId) {
        return res.status(401).json({ error: "Not connected or user not found" });
      }
      
      const transactionData = insertTransactionSchema.parse(req.body);
      const result = await storage.createTransaction(walletStatus.userId.toString(), transactionData);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // User Preference Routes
  app.get("/api/user/preferences", async (req, res) => {
    try {
      // Get wallet status to check if connected and get user ID
      const walletStatus = await solanaService.getWalletStatus(req.sessionID);
      
      if (!walletStatus.connected) {
        return res.status(401).json({ error: "Not connected" });
      }
      
      let userId = walletStatus.userId;
      
      // If no user ID in session but we have a wallet address, try to find the user
      if (!userId && walletStatus.address) {
        const user = await storage.getUserByWalletAddress(walletStatus.address);
        if (user) {
          userId = user.id;
          // Update the session with the user ID
          await solanaService.setUserIdForSession(req.sessionID, userId);
        }
      }
      
      if (!userId) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const preferences = await storage.getUserPreferences(userId.toString());
      res.json(preferences);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/user/preferences", async (req, res) => {
    try {
      // Get wallet status to check if connected and get user ID
      const walletStatus = await solanaService.getWalletStatus(req.sessionID);
      
      if (!walletStatus.connected || !walletStatus.userId) {
        return res.status(401).json({ error: "Not connected or user not found" });
      }
      
      const preferencesData = insertUserPreferencesSchema.partial().parse(req.body);
      const result = await storage.updateUserPreferences(walletStatus.userId.toString(), preferencesData);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/user/risk-profile", async (req, res) => {
    try {
      // Get wallet status to check if connected and get user ID
      const walletStatus = await solanaService.getWalletStatus(req.sessionID);
      
      // For risk profile, we'll return a default even if not connected
      let userId = walletStatus.userId;
      
      // If no user ID in session but we have a wallet address, try to find the user
      if (!userId && walletStatus.address) {
        const user = await storage.getUserByWalletAddress(walletStatus.address);
        if (user) {
          userId = user.id;
          // Update the session with the user ID
          await solanaService.setUserIdForSession(req.sessionID, userId);
        }
      }
      
      // If we have a user ID, get their risk profile
      if (userId) {
        const riskProfile = await storage.getUserRiskProfile(userId.toString());
        return res.json(riskProfile);
      }
      
      // Return default risk profile if not connected or user not found
      res.json({ level: 'moderate-conservative', percentage: 35 });
    } catch (error: any) {
      // Return default risk profile on error
      res.json({ level: 'moderate-conservative', percentage: 35 });
    }
  });

  // Telegram Routes
  app.post("/api/telegram/connect", async (req, res) => {
    try {
      const telegramInfo = await telegramService.generateConnectLink(req.sessionID);
      res.json(telegramInfo);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/user/telegram-status", async (req, res) => {
    try {
      const telegramStatus = await telegramService.checkUserConnection(req.sessionID);
      res.json(telegramStatus);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // SolSeeker AI Chat Routes
  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }
      
      // Check if wallet is connected
      const walletStatus = await solanaService.getWalletStatus(req.sessionID);
      
      if (!walletStatus.connected) {
        return res.status(401).json({ error: "Wallet not connected" });
      }
      
      // Process message with OpenAI
      const result = await openAIService.processMessage(req.sessionID, message);
      
      res.json(result);
    } catch (error: any) {
      console.error('Error processing chat message:', error);
      res.status(500).json({ error: error.message || 'Failed to process message' });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
