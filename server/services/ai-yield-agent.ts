import OpenAI from 'openai';
import { YieldOpportunity } from '@shared/schema';
import { storage } from '../storage';
import { YieldAnalyzer } from './yield-analyzer';
import { SolanaService } from './solana';
import { prisma } from '@shared/schema';

interface YieldRecommendation {
  opportunityId: number;
  name: string;
  protocol: string;
  apy: number;
  riskLevel: string;
  confidence: number; // 0-100 score indicating AI confidence in this recommendation
  reasoning: string;
}

interface PortfolioAnalysis {
  currentValue: number;
  projectedAnnualYield: number;
  riskAssessment: string;
  diversificationScore: number; // 0-100 score
  recommendations: YieldRecommendation[];
}

export class AIYieldAgent {
  private openai: OpenAI | null;
  private yieldAnalyzer: YieldAnalyzer;
  private solanaService: SolanaService;
  private lastScan: Date = new Date(0); // Initialize with epoch time
  private scanInterval: number = 60 * 60 * 1000; // 1 hour in milliseconds
  private recommendationsCache: Map<string, YieldRecommendation[]> = new Map();
  
  constructor() {
    this.yieldAnalyzer = new YieldAnalyzer();
    this.solanaService = new SolanaService();
    
    // Initialize OpenAI client
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.warn("OPENAI_API_KEY not provided. AI yield agent functionality will be limited.");
        this.openai = null;
      } else {
        this.openai = new OpenAI({
          apiKey: apiKey
        });
      }
    } catch (error) {
      console.error("Error initializing OpenAI client for AI yield agent:", error);
      this.openai = null;
    }
    
    // Start periodic scanning
    this.startPeriodicScanning();
  }
  
  /**
   * Start periodic scanning of yield opportunities
   */
  private startPeriodicScanning(): void {
    // Run initial scan
    this.scanYieldOpportunities();
    
    // Set up interval for regular scans
    setInterval(() => {
      this.scanYieldOpportunities();
    }, this.scanInterval);
    
    console.log("AI Yield Agent started periodic scanning");
  }
  
  /**
   * Scan all yield opportunities and update recommendations
   */
  public async scanYieldOpportunities(): Promise<void> {
    try {
      console.log("AI Yield Agent scanning yield opportunities...");
      
      // Get all yield opportunities
      const opportunities = await this.yieldAnalyzer.getYieldOpportunities();
      
      // Get all users with their risk profiles
      const users = await prisma.user.findMany({
        include: {
          preferences: true
        }
      });
      
      // Generate recommendations for each user based on their risk profile
      for (const user of users) {
        if (user.preferences) {
          const userRiskProfile = user.preferences.riskTolerance;
          const recommendations = await this.generateRecommendations(
            opportunities, 
            userRiskProfile,
            user.id.toString()
          );
          
          // Cache recommendations for this user
          this.recommendationsCache.set(user.id.toString(), recommendations);
          
          console.log(`Generated ${recommendations.length} recommendations for user ${user.id}`);
        }
      }
      
      this.lastScan = new Date();
      console.log("AI Yield Agent scan completed at", this.lastScan);
    } catch (error) {
      console.error("Error during AI Yield Agent scan:", error);
    }
  }
  
  /**
   * Generate yield recommendations for a user based on their risk profile
   */
  private async generateRecommendations(
    opportunities: YieldOpportunity[],
    riskProfile: string,
    userId: string
  ): Promise<YieldRecommendation[]> {
    if (!this.openai || opportunities.length === 0) {
      return [];
    }
    
    try {
      // Get user's current portfolio
      const portfolio = await storage.getUserPortfolio(userId);
      
      // Prepare context for the AI
      const context = {
        opportunities: opportunities.map(o => ({
          id: o.id,
          name: o.name,
          protocol: o.protocol,
          apy: o.apy,
          baseApy: o.baseApy,
          rewardApy: o.rewardApy,
          riskLevel: o.riskLevel,
          tvl: o.tvl,
          assetType: o.assetType,
          tokenPair: o.tokenPair,
          depositFee: o.depositFee,
          withdrawalFee: o.withdrawalFee
        })),
        riskProfile,
        currentPortfolio: portfolio.positions.map(p => ({
          opportunityId: p.opportunityId,
          amount: p.amount,
          protocol: p.protocol,
          name: p.name
        })),
        totalPortfolioValue: portfolio.totalValue
      };
      
      // Call OpenAI to generate recommendations
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an AI yield optimization agent for a Solana-based yield aggregator platform. 
            Your task is to analyze yield opportunities and recommend the best options based on the user's risk profile.
            
            Risk profiles:
            - conservative: Prioritize capital preservation, focus on low-risk opportunities
            - moderate-conservative: Balance between safety and returns, prefer low to medium risk
            - moderate: Balanced approach, accept medium risk for better returns
            - moderate-aggressive: Prioritize returns, accept medium to high risk
            - aggressive: Maximize returns, accept high risk
            
            Consider:
            1. APY (higher is better)
            2. Risk level (should match user's profile)
            3. TVL (higher is safer)
            4. Protocol reputation (established protocols are safer)
            5. Portfolio diversification
            6. Fee structure
            
            Provide recommendations as a JSON array of objects with:
            - opportunityId: number
            - name: string
            - protocol: string
            - apy: number
            - riskLevel: string
            - confidence: number (0-100)
            - reasoning: string (brief explanation)
            
            Limit to 3-5 top recommendations.`
          },
          {
            role: "user",
            content: `Analyze these yield opportunities and recommend the best options for a user with ${riskProfile} risk profile: ${JSON.stringify(context)}`
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });
      
      const result = completion.choices[0].message.content;
      
      if (result) {
        try {
          const parsedResult = JSON.parse(result);
          if (Array.isArray(parsedResult.recommendations)) {
            return parsedResult.recommendations;
          }
        } catch (e) {
          console.error('Error parsing AI recommendations:', e);
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error generating yield recommendations:', error);
      return [];
    }
  }
  
  /**
   * Get recommendations for a specific user
   */
  public async getRecommendationsForUser(userId: string): Promise<YieldRecommendation[]> {
    // Check if we have cached recommendations
    const cachedRecommendations = this.recommendationsCache.get(userId);
    
    // If we have recent recommendations, return them
    if (cachedRecommendations && this.lastScan.getTime() > Date.now() - this.scanInterval) {
      return cachedRecommendations;
    }
    
    // Otherwise, generate new recommendations
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      include: { preferences: true }
    });
    
    if (!user || !user.preferences) {
      return [];
    }
    
    const opportunities = await this.yieldAnalyzer.getYieldOpportunities();
    const recommendations = await this.generateRecommendations(
      opportunities,
      user.preferences.riskTolerance,
      userId
    );
    
    // Cache the recommendations
    this.recommendationsCache.set(userId, recommendations);
    
    return recommendations;
  }
  
  /**
   * Analyze a user's portfolio and provide recommendations
   */
  public async analyzePortfolio(userId: string): Promise<PortfolioAnalysis | null> {
    if (!this.openai) {
      return null;
    }
    
    try {
      // Get user's current portfolio
      const portfolio = await storage.getUserPortfolio(userId);
      
      // Get user's risk profile
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
        include: { preferences: true }
      });
      
      if (!user || !user.preferences) {
        return null;
      }
      
      // Get recommendations
      const recommendations = await this.getRecommendationsForUser(userId);
      
      // If we have no portfolio or recommendations, return null
      if (portfolio.positions.length === 0 && recommendations.length === 0) {
        return null;
      }
      
      // Prepare context for the AI
      const context = {
        portfolio: {
          totalValue: portfolio.totalValue,
          positions: portfolio.positions.map(p => ({
            opportunityId: p.opportunityId,
            amount: p.amount,
            protocol: p.protocol,
            name: p.name,
            apy: p.apy
          }))
        },
        riskProfile: user.preferences.riskTolerance,
        recommendations
      };
      
      // Call OpenAI to analyze portfolio
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an AI portfolio analyzer for a Solana-based yield aggregator platform.
            Analyze the user's portfolio and provide insights and recommendations.
            
            Return a JSON object with:
            - currentValue: number (total portfolio value)
            - projectedAnnualYield: number (estimated annual yield in USD)
            - riskAssessment: string (assessment of portfolio risk)
            - diversificationScore: number (0-100, higher is better diversified)
            - recommendations: array of recommendation objects`
          },
          {
            role: "user",
            content: `Analyze this portfolio: ${JSON.stringify(context)}`
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });
      
      const result = completion.choices[0].message.content;
      
      if (result) {
        try {
          const parsedResult = JSON.parse(result);
          return {
            currentValue: parsedResult.currentValue || portfolio.totalValue,
            projectedAnnualYield: parsedResult.projectedAnnualYield || 0,
            riskAssessment: parsedResult.riskAssessment || "Unknown",
            diversificationScore: parsedResult.diversificationScore || 0,
            recommendations: parsedResult.recommendations || recommendations
          };
        } catch (e) {
          console.error('Error parsing AI portfolio analysis:', e);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error analyzing portfolio:', error);
      return null;
    }
  }
  
  /**
   * Get the best yield opportunity for a specific user based on their risk profile
   */
  public async getBestOpportunityForUser(userId: string): Promise<YieldRecommendation | null> {
    const recommendations = await this.getRecommendationsForUser(userId);
    
    if (recommendations.length === 0) {
      return null;
    }
    
    // Sort by confidence and return the highest
    recommendations.sort((a, b) => b.confidence - a.confidence);
    return recommendations[0];
  }
  
  /**
   * Auto-invest for a user based on AI recommendations
   * This is a placeholder for actual auto-investment functionality
   */
  public async autoInvest(userId: string, amount: number): Promise<boolean> {
    try {
      // Get the best opportunity for this user
      const bestOpportunity = await this.getBestOpportunityForUser(userId);
      
      if (!bestOpportunity) {
        console.log(`No suitable investment opportunities found for user ${userId}`);
        return false;
      }
      
      console.log(`Auto-investing ${amount} for user ${userId} in ${bestOpportunity.name}`);
      
      // In a real implementation, this would execute the actual investment
      // For now, we'll just log it
      
      // Record the investment in the database
      await storage.createInvestment(userId, {
        userId: Number(userId),
        opportunityId: bestOpportunity.opportunityId,
        amount,
        depositDate: new Date(),
        token: "SOL", // Assuming SOL for simplicity
        active: true
      });
      
      // Record the transaction
      await storage.createTransaction(userId, {
        userId: Number(userId),
        opportunityId: bestOpportunity.opportunityId,
        transactionType: "invest",
        amount,
        token: "SOL",
        transactionDate: new Date(),
        status: "completed",
        transactionHash: this.generateMockTransactionHash(),
        details: {
          aiRecommended: true,
          confidence: bestOpportunity.confidence,
          reasoning: bestOpportunity.reasoning
        }
      });
      
      return true;
    } catch (error) {
      console.error(`Error auto-investing for user ${userId}:`, error);
      return false;
    }
  }
  
  /**
   * Generate a mock transaction hash for development purposes
   */
  private generateMockTransactionHash(): string {
    return Array.from({ length: 64 }, () => 
      "0123456789abcdef"[Math.floor(Math.random() * 16)]
    ).join("");
  }
}

// Export a singleton instance
export const aiYieldAgent = new AIYieldAgent(); 