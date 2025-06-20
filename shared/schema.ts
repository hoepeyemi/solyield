import { z } from "zod";
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Zod schemas for validation
export const insertUserSchema = z.object({
  walletAddress: z.string(),
  username: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  lastLogin: z.date().optional()
});

export const insertUserPreferencesSchema = z.object({
  userId: z.number(),
  telegramChatId: z.string().nullable().optional(),
  telegramUsername: z.string().nullable().optional(),
  riskTolerance: z.string().default("medium"),
  preferredChains: z.array(z.string()).optional(),
  preferredTokens: z.array(z.string()).optional(),
  notificationsEnabled: z.boolean().default(true)
});

export const insertYieldOpportunitySchema = z.object({
  name: z.string(),
  protocol: z.string(),
  apy: z.number().or(z.string()),
  baseApy: z.number().or(z.string()),
  rewardApy: z.number().or(z.string()),
  riskLevel: z.string(),
  tvl: z.number().or(z.string()),
  assetType: z.string(),
  tokenPair: z.array(z.string()).optional(),
  depositFee: z.number().or(z.string()).default("0"),
  withdrawalFee: z.number().or(z.string()).default("0"),
  lastUpdated: z.date(),
  link: z.string().nullable().optional()
});

export const insertUserPortfolioSchema = z.object({
  userId: z.number(),
  opportunityId: z.number(),
  amount: z.number().or(z.string()),
  depositDate: z.date(),
  token: z.string(),
  active: z.boolean().default(true)
});

export const insertTransactionSchema = z.object({
  userId: z.number(),
  opportunityId: z.number(),
  transactionType: z.string(),
  amount: z.number().or(z.string()),
  token: z.string(),
  transactionDate: z.date(),
  status: z.string(),
  transactionHash: z.string().nullable().optional(),
  details: z.record(z.any()).nullable().optional()
});

export const insertSolanaSubscriptionSchema = z.object({
  userId: z.number(),
  transactionHash: z.string().nullable().optional(),
  amount: z.number().or(z.string()),
  currency: z.string().default("USDC"),
  isActive: z.boolean().default(true)
});

// Define types based on the Prisma schema structure
export interface User {
  id: number;
  walletAddress: string;
  username: string | null;
  email: string | null;
  createdAt: Date;
  lastLogin: Date | null;
}

export interface UserPreference {
  id: number;
  userId: number;
  telegramChatId: string | null;
  telegramUsername: string | null;
  riskTolerance: string;
  preferredChains: string[];
  preferredTokens: string[];
  notificationsEnabled: boolean;
}

export interface YieldOpportunity {
  id: number;
  name: string;
  protocol: string;
  apy: number;
  baseApy: number;
  rewardApy: number;
  riskLevel: string;
  tvl: number;
  assetType: string;
  tokenPair: string[];
  depositFee: number;
  withdrawalFee: number;
  lastUpdated: Date;
  link: string | null;
}

export interface UserPortfolio {
  id: number;
  userId: number;
  opportunityId: number;
  amount: number;
  depositDate: Date;
  token: string;
  active: boolean;
  protocol?: string;
  name?: string;
  apy?: number;
}

export interface Transaction {
  id: number;
  userId: number;
  opportunityId: number;
  transactionType: string;
  amount: number;
  token: string;
  transactionDate: Date;
  status: string;
  transactionHash: string | null;
  details: any | null;
}

export interface SolanaSubscription {
  id: number;
  userId: number;
  subscriptionDate: Date;
  transactionHash: string | null;
  amount: number;
  currency: string;
  isActive: boolean;
}

// Custom types for API responses
export interface SolanaWalletInfo {
  address: string;
  balance: number;
  balanceInUsd: number;
  totalValue: number;
  valueChange: number;
}

export interface ProtocolInfo {
  name: string;
  logo: string;
  url: string;
}

export interface TelegramBotInfo {
  botName: string;
  isConnected: boolean;
  chatId?: string;
  username?: string;
}

// Portfolio data returned by getUserPortfolio
export interface PortfolioData {
  totalValue: number;
  positions: UserPortfolio[];
  chartData: number[];
  changePercentage: number;
}

// Portfolio summary returned by getPortfolioSummary
export interface PortfolioSummary {
  activePositions: number;
  protocolCount: number;
  protocols: string[];
}

// Type aliases for insert schemas
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertUserPreference = z.infer<typeof insertUserPreferencesSchema>;
export type InsertYieldOpportunity = z.infer<typeof insertYieldOpportunitySchema>;
export type InsertUserPortfolio = z.infer<typeof insertUserPortfolioSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertSolanaSubscription = z.infer<typeof insertSolanaSubscriptionSchema>;
