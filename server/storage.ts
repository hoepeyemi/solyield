import { 
  User, UserPreference, YieldOpportunity, UserPortfolio, 
  Transaction, SolanaSubscription, InsertUser, InsertUserPreference,
  InsertYieldOpportunity, InsertUserPortfolio, InsertTransaction,
  InsertSolanaSubscription, ProtocolInfo, SolanaWalletInfo,
  PortfolioData, PortfolioSummary
} from "../shared/schema";

import { prisma } from "./db";

// Storage interface for database operations
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  
  // Subscriptions
  getUserSubscription(userId: number): Promise<SolanaSubscription | undefined>;
  createSubscription(insertSubscription: InsertSolanaSubscription): Promise<SolanaSubscription>;
  checkUserIsSubscribed(userId: number): Promise<boolean>;
  
  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreference | undefined>;
  createUserPreferences(userId: string, data: InsertUserPreference): Promise<UserPreference>;
  updateUserPreferences(userId: string, data: Partial<InsertUserPreference>): Promise<UserPreference>;
  getUserRiskProfile(userId: string): Promise<{ level: string; percentage: number }>;

  // Yield Opportunities
  getYieldOpportunities(protocol?: string, sortBy?: string): Promise<YieldOpportunity[]>;
  getYieldOpportunity(id: number): Promise<YieldOpportunity | undefined>;
  getBestYieldOpportunity(): Promise<YieldOpportunity | undefined>;
  getProtocolInfo(name: string): Promise<ProtocolInfo | undefined>;
  getYieldStats(): Promise<{ avgApy: number; protocolCount: number; opportunityCount: number }>;

  // User Portfolios
  getUserPortfolio(userId: string, timeRange: string): Promise<PortfolioData>;
  getPortfolioSummary(userId: string): Promise<PortfolioSummary>;
  createInvestment(userId: string, data: InsertUserPortfolio): Promise<UserPortfolio>;
  
  // Transactions
  getUserTransactions(userId: string, filter: string): Promise<Transaction[]>;
  createTransaction(userId: string, data: InsertTransaction): Promise<Transaction>;
}

// Implementation of the storage interface using a database
export class DatabaseStorage implements IStorage {
  private protocolsInfo: Map<string, ProtocolInfo>;

  constructor() {
    // Initialize protocol info
    this.protocolsInfo = new Map<string, ProtocolInfo>([
      ['Raydium', { name: 'Raydium', logo: '/protocols/raydium.png', url: 'https://raydium.io' }],
      ['Marinade', { name: 'Marinade', logo: '/protocols/marinade.png', url: 'https://marinade.finance' }],
      ['Orca', { name: 'Orca', logo: '/protocols/orca.png', url: 'https://www.orca.so' }],
      ['Solend', { name: 'Solend', logo: '/protocols/solend.png', url: 'https://solend.fi' }],
      ['Tulip', { name: 'Tulip', logo: '/protocols/tulip.png', url: 'https://tulip.garden' }],
    ]);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return await prisma.user.findUnique({ where: { id } }) as User | undefined;
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    return await prisma.user.findUnique({ where: { walletAddress } }) as User | undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return await prisma.user.create({
      data: {
        walletAddress: insertUser.walletAddress,
        username: insertUser.username,
        email: insertUser.email,
        lastLogin: insertUser.lastLogin
      }
    }) as User;
  }

  // Subscription methods
  async getUserSubscription(userId: number): Promise<SolanaSubscription | undefined> {
    return await prisma.solanaSubscription.findFirst({
      where: { 
        userId,
        isActive: true
      },
      orderBy: {
        subscriptionDate: 'desc'
      }
    }) as SolanaSubscription | undefined;
  }

  async createSubscription(insertSubscription: InsertSolanaSubscription): Promise<SolanaSubscription> {
    return await prisma.solanaSubscription.create({
      data: {
        userId: insertSubscription.userId,
        transactionHash: insertSubscription.transactionHash,
        amount: insertSubscription.amount as any, // Handle numeric conversion
        currency: insertSubscription.currency,
        isActive: insertSubscription.isActive
      }
    }) as SolanaSubscription;
  }

  async checkUserIsSubscribed(userId: number): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    return !!subscription && subscription.isActive;
  }

  // User Preferences methods
  async getUserPreferences(userId: string): Promise<UserPreference | undefined> {
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
      return undefined;
    }
    
    return await prisma.userPreference.findUnique({
      where: { userId: numericUserId }
    }) as UserPreference | undefined;
  }

  async createUserPreferences(userId: string, data: InsertUserPreference): Promise<UserPreference> {
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
      throw new Error('Invalid user ID');
    }

    return await prisma.userPreference.create({
      data: {
        userId: numericUserId,
        telegramChatId: data.telegramChatId,
        telegramUsername: data.telegramUsername,
        riskTolerance: data.riskTolerance,
        preferredChains: data.preferredChains || [],
        preferredTokens: data.preferredTokens || [],
        notificationsEnabled: data.notificationsEnabled
      }
    }) as UserPreference;
  }

  async updateUserPreferences(userId: string, data: Partial<InsertUserPreference>): Promise<UserPreference> {
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
      throw new Error('Invalid user ID');
    }

    // Check if preferences exist
    const existingPreferences = await prisma.userPreference.findUnique({
      where: { userId: numericUserId }
    });

    if (!existingPreferences) {
      // Create new preferences if they don't exist
      return await this.createUserPreferences(userId, {
        userId: numericUserId,
        telegramChatId: data.telegramChatId || null,
        telegramUsername: data.telegramUsername || null,
        riskTolerance: data.riskTolerance || 'medium',
        preferredChains: data.preferredChains || [],
        preferredTokens: data.preferredTokens || [],
        notificationsEnabled: data.notificationsEnabled !== undefined ? data.notificationsEnabled : true
      });
    }

      // Update existing preferences
    return await prisma.userPreference.update({
      where: { userId: numericUserId },
      data: {
        telegramChatId: data.telegramChatId !== undefined ? data.telegramChatId : existingPreferences.telegramChatId,
        telegramUsername: data.telegramUsername !== undefined ? data.telegramUsername : existingPreferences.telegramUsername,
        riskTolerance: data.riskTolerance || existingPreferences.riskTolerance,
        preferredChains: data.preferredChains || existingPreferences.preferredChains,
        preferredTokens: data.preferredTokens || existingPreferences.preferredTokens,
        notificationsEnabled: data.notificationsEnabled !== undefined ? data.notificationsEnabled : existingPreferences.notificationsEnabled
      }
    }) as UserPreference;
  }

  async getUserRiskProfile(userId: string): Promise<{ level: string; percentage: number }> {
    const preferences = await this.getUserPreferences(userId);
    
    if (!preferences) {
      // Default to moderate-conservative if no preferences are set
      return { level: 'moderate-conservative', percentage: 35 };
    }

    // Map risk tolerance to percentage
    const riskPercentages: Record<string, number> = {
      'conservative': 20,
      'moderate-conservative': 35,
      'moderate': 50,
      'moderate-aggressive': 70,
      'aggressive': 90
    };

    return {
      level: preferences.riskTolerance,
      percentage: riskPercentages[preferences.riskTolerance] || 35
    };
  }

  // Yield Opportunities methods
  async getYieldOpportunities(protocol?: string, sortBy: string = 'apy'): Promise<YieldOpportunity[]> {
    // In a real implementation, this would query the database
    // For now, we'll return mock data
    
    // TODO: Replace with actual database query
    const opportunities = await prisma.yieldOpportunity.findMany({
      where: protocol ? { protocol: { equals: protocol, mode: 'insensitive' } } : undefined,
      orderBy: sortBy === 'apy' 
        ? { apy: 'desc' } 
        : sortBy === 'risk' 
          ? { riskLevel: 'asc' } 
          : { tvl: 'desc' }
    }) as YieldOpportunity[];
    
    return opportunities;
  }

  async getYieldOpportunity(id: number): Promise<YieldOpportunity | undefined> {
    return await prisma.yieldOpportunity.findUnique({
      where: { id }
    }) as YieldOpportunity | undefined;
  }

  async getBestYieldOpportunity(): Promise<YieldOpportunity | undefined> {
    const opportunities = await this.getYieldOpportunities();
    return opportunities.length > 0 ? opportunities[0] : undefined;
  }

  async getProtocolInfo(name: string): Promise<ProtocolInfo | undefined> {
    return this.protocolsInfo.get(name);
  }

  async getYieldStats(): Promise<{ avgApy: number; protocolCount: number; opportunityCount: number }> {
    const opportunities = await this.getYieldOpportunities();
    
    if (opportunities.length === 0) {
      return { avgApy: 0, protocolCount: 0, opportunityCount: 0 };
    }
    
    // Calculate average APY
    const totalApy = opportunities.reduce((sum, opp) => sum + Number(opp.apy), 0);
    const avgApy = totalApy / opportunities.length;
    
    // Count unique protocols
    const protocols = new Set(opportunities.map(o => o.protocol));
    
    return {
      avgApy: parseFloat(avgApy.toFixed(2)),
      protocolCount: protocols.size,
      opportunityCount: opportunities.length
    };
  }

  // User Portfolio methods
  async getUserPortfolio(userId: string, timeRange: string = '1M'): Promise<PortfolioData> {
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
      throw new Error('Invalid user ID');
    }

    // In a real implementation, this would query the database
    // For now, we'll return mock data
    
    // Get user's active positions
    const positions = await prisma.userPortfolio.findMany({
      where: {
        userId: numericUserId,
        active: true
      },
      include: {
        opportunity: true
      }
    });

    // Format the positions to match the expected UserPortfolio interface
    const formattedPositions = positions.map(position => {
      return {
        id: position.id,
        userId: position.userId,
        opportunityId: position.opportunityId,
        amount: Number(position.amount),
        depositDate: position.depositDate,
        token: position.token,
        active: position.active,
        name: position.opportunity.name,
        protocol: position.opportunity.protocol,
        apy: Number(position.opportunity.apy)
      };
    });

    // Calculate total value
    const totalValue = formattedPositions.reduce((sum, position) => sum + Number(position.amount), 0);
    
    // Generate chart data based on time range
    const chartData = this.generateChartData(timeRange);
    
    // Calculate change percentage
    const changePercentage = this.calculateChangePercentage(timeRange);

    return {
      totalValue,
      positions: formattedPositions,
      chartData,
      changePercentage
    };
  }

  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
      throw new Error('Invalid user ID');
    }

    // In a real implementation, this would query the database
    // For now, we'll return mock data
    
    // Get user's active positions
    const positions = await prisma.userPortfolio.findMany({
      where: {
        userId: numericUserId,
        active: true
      },
      include: {
        opportunity: true
      }
    });

    // Count active positions
    const activePositions = positions.length;
    
    // Get unique protocols
    const protocols = [...new Set(positions.map(position => position.opportunity.protocol))];

    return {
      activePositions,
      protocolCount: protocols.length,
      protocols
    };
  }

  async createInvestment(userId: string, data: InsertUserPortfolio): Promise<UserPortfolio> {
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
      throw new Error('Invalid user ID');
    }

    // Create the investment record
    const investment = await prisma.userPortfolio.create({
      data: {
        userId: numericUserId,
        opportunityId: data.opportunityId,
        amount: data.amount as any, // Handle numeric conversion
        depositDate: data.depositDate,
        token: data.token,
        active: data.active
      }
    });

    // Create a transaction record for this investment
    const transactionHash = this.generateFakeTransactionHash();
    await prisma.transaction.create({
      data: {
        userId: numericUserId,
      opportunityId: data.opportunityId,
      transactionType: 'invest',
        amount: data.amount as any, // Handle numeric conversion
      token: data.token,
      transactionDate: new Date(),
      status: 'completed',
        transactionHash,
        details: {}
      }
    });

    // Get the opportunity details to return a complete portfolio item
    const opportunity = await prisma.yieldOpportunity.findUnique({
      where: { id: data.opportunityId }
    });

    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    // Return the investment with opportunity details
    return {
      id: investment.id,
      userId: investment.userId,
      opportunityId: investment.opportunityId,
      amount: Number(investment.amount),
      depositDate: investment.depositDate,
      token: investment.token,
      active: investment.active,
      name: opportunity.name,
      protocol: opportunity.protocol,
      apy: Number(opportunity.apy)
    } as UserPortfolio;
  }

  // Transaction methods
  async getUserTransactions(userId: string, filter: string = 'all'): Promise<Transaction[]> {
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
      throw new Error('Invalid user ID');
    }

    // Query conditions
    const whereClause: any = { userId: numericUserId };
    
    // Apply filter if specified
    if (filter !== 'all') {
      whereClause.transactionType = filter;
    }
    
    // Get transactions
    const userTransactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: {
        transactionDate: 'desc'
      },
      include: {
        opportunity: true
      }
    });

    // Format transactions to match the expected Transaction interface
    return Promise.all(userTransactions.map(async tx => {
      return {
        id: tx.id,
        userId: tx.userId,
        opportunityId: tx.opportunityId,
        transactionType: tx.transactionType,
        amount: Number(tx.amount),
        token: tx.token,
        transactionDate: tx.transactionDate,
        status: tx.status,
        transactionHash: tx.transactionHash,
        details: tx.details,
        protocol: tx.opportunity.protocol,
        opportunityName: tx.opportunity.name
      } as unknown as Transaction;
    }));
  }

  async createTransaction(userId: string, data: InsertTransaction): Promise<Transaction> {
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
      throw new Error('Invalid user ID');
    }
    
    // Create the transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: numericUserId,
        opportunityId: data.opportunityId,
        transactionType: data.transactionType,
        amount: data.amount as any, // Handle numeric conversion
        token: data.token,
        transactionDate: data.transactionDate,
        status: data.status,
        transactionHash: data.transactionHash || this.generateFakeTransactionHash(),
        details: data.details || {}
      },
      include: {
        opportunity: true
      }
    });

    // Return the transaction with opportunity details
    return {
      id: transaction.id,
      userId: transaction.userId,
      opportunityId: transaction.opportunityId,
      transactionType: transaction.transactionType,
      amount: Number(transaction.amount),
      token: transaction.token,
      transactionDate: transaction.transactionDate,
      status: transaction.status,
      transactionHash: transaction.transactionHash,
      details: transaction.details,
      protocol: transaction.opportunity.protocol,
      opportunityName: transaction.opportunity.name
    } as unknown as Transaction;
  }

  // Helper methods
  private generateChartData(timeRange: string): number[] {
    // Generate mock chart data based on time range
    // In a real implementation, this would query historical data
    const dataPoints = {
      '1D': 24,
      '1W': 7,
      '1M': 30,
      '1Y': 12,
      'All': 10
    };
    
    const points = dataPoints[timeRange as keyof typeof dataPoints] || 10;
    const result = [];
    
    let lastValue = 50;
    for (let i = 0; i < points; i++) {
      // Random walk with upward bias
      const change = (Math.random() * 20) - 8;
      lastValue = Math.max(10, Math.min(100, lastValue + change));
      result.push(lastValue);
    }
    
    return result;
  }

  private calculateChangePercentage(timeRange: string): number {
    // Generate mock change percentage based on time range
    // In a real implementation, this would calculate from historical data
    const ranges = {
      '1D': [-2, 3],
      '1W': [-5, 8],
      '1M': [-10, 15],
      '1Y': [-20, 40],
      'All': [-30, 100]
    };
    
    const [min, max] = ranges[timeRange as keyof typeof ranges] || [-5, 10];
    const change = min + Math.random() * (max - min);
    
    return parseFloat(change.toFixed(2));
  }

  private generateFakeTransactionHash(): string {
    // Generate a random transaction hash for development
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
  }
}

// Create and export a singleton instance
export const storage = new DatabaseStorage();