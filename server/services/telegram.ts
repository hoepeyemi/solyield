import { TelegramBotInfo } from '../../shared/schema';
import TelegramBot from 'node-telegram-bot-api';
import { storage } from '../storage';

export class TelegramService {
  private bot: TelegramBot | null = null;
  private userConnections: Map<string, { chatId: string; username: string }>;
  private pendingConnections: Map<string, string>; // Maps tokens to sessionIds
  private botUsername: string = 'SolYieldHunter2Bot';

  constructor() {
    this.userConnections = new Map();
    this.pendingConnections = new Map();
    this.initializeBot();
  }

  /**
   * Initialize the Telegram bot
   */
  private initializeBot() {
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      
      if (!token) {
        console.warn('TELEGRAM_BOT_TOKEN not provided. Telegram bot functionality will be limited.');
        return;
      }
      
      this.bot = new TelegramBot(token, { polling: true });
      
      // Set up command handlers
      this.setupCommandHandlers();
      
      console.log('Telegram bot initialized successfully');
    } catch (error) {
      console.error('Error initializing Telegram bot:', error);
    }
  }

  /**
   * Set up Telegram bot command handlers
   */
  private setupCommandHandlers() {
    if (!this.bot) return;
    
    // Start command
    this.bot.onText(/\/start (.+)/, async (msg, match) => {
      const chatId = msg.chat.id.toString();
      const username = msg.from?.username || 'unknown';
      const token = match?.[1];
      
      if (!token) {
        this.bot!.sendMessage(chatId, 'Welcome to Sol YieldHunter Bot! To connect your account, please use the link from the app.');
        return;
      }
      
      const sessionId = this.pendingConnections.get(token);
      if (!sessionId) {
        this.bot!.sendMessage(chatId, 'This connection link is invalid or expired. Please generate a new link from the app.');
        return;
      }
      
      // Store the connection
      this.userConnections.set(sessionId, { chatId, username });
      this.pendingConnections.delete(token);
      
      // Update user preferences in storage
      try {
        await storage.updateUserPreferences(sessionId, {
          telegramChatId: chatId,
          telegramUsername: username
        });
        
        this.bot!.sendMessage(
          chatId,
          '✅ Your account has been successfully connected to Sol YieldHunter!\n\n' +
          'You can now use the following commands:\n' +
          '/yields - Show best yield opportunities\n' +
          '/portfolio - View your portfolio\n' +
          '/invest - Create new investment\n' +
          '/alerts - Configure notifications'
        );
      } catch (error) {
        console.error('Error updating user preferences:', error);
        this.bot!.sendMessage(chatId, 'There was an error connecting your account. Please try again.');
      }
    });
    
    // Yields command
    this.bot.onText(/\/yields/, async (msg) => {
      const chatId = msg.chat.id.toString();
      const sessionId = this.getSessionIdFromChatId(chatId);
      
      if (!sessionId) {
        this.bot!.sendMessage(chatId, 'You need to connect your account first. Use the link from the app to connect.');
        return;
      }
      
      try {
        const opportunities = await storage.getYieldOpportunities(undefined, 'apy');
        const top5 = opportunities.slice(0, 5);
        
        let message = '🔥 *Top 5 Yield Opportunities*\n\n';
        
        top5.forEach((opp, index) => {
          message += `${index + 1}. *${opp.name}* (${opp.protocol})\n` +
                    `   APY: *${opp.apy}%* (${opp.baseApy}% + ${opp.rewardApy}% rewards)\n` +
                    `   Risk: ${opp.riskLevel} | TVL: $${Number(opp.tvl/1000000).toFixed(1)}M\n\n`;
        });
        
        message += 'Use /invest to invest in one of these opportunities.';
        
        this.bot!.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Error fetching yield opportunities:', error);
        this.bot!.sendMessage(chatId, 'Sorry, there was an error fetching yield opportunities. Please try again later.');
      }
    });
    
    // Portfolio command
    this.bot.onText(/\/portfolio/, async (msg) => {
      const chatId = msg.chat.id.toString();
      const sessionId = this.getSessionIdFromChatId(chatId);
      
      if (!sessionId) {
        this.bot!.sendMessage(chatId, 'You need to connect your account first. Use the link from the app to connect.');
        return;
      }
      
      try {
        const portfolio = await storage.getUserPortfolio(sessionId);
        
        if (!portfolio.positions || portfolio.positions.length === 0) {
          this.bot!.sendMessage(chatId, 'You don\'t have any active positions yet. Use /yields to view opportunities and /invest to create a position.');
          return;
        }
        
        let message = '📊 *Your Portfolio*\n\n' +
                     `Total Value: *$${portfolio.totalValue.toLocaleString()}*\n` +
                     `Change: *${portfolio.changePercentage > 0 ? '+' : ''}${portfolio.changePercentage}%*\n\n` +
                     '*Active Positions:*\n\n';
        
        portfolio.positions.forEach((pos: any, index: number) => {
          message += `${index + 1}. *${pos.name}* (${pos.protocol})\n` +
                    `   Amount: $${Number(pos.amount).toLocaleString()} | APY: ${pos.apy}%\n` +
                    `   Deposited: ${new Date(pos.depositDate).toLocaleDateString()}\n\n`;
        });
        
        this.bot!.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Error fetching portfolio:', error);
        this.bot!.sendMessage(chatId, 'Sorry, there was an error fetching your portfolio. Please try again later.');
      }
    });
    
    // Help command
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id.toString();
      
      this.bot!.sendMessage(
        chatId,
        '*Sol YieldHunter Bot Commands*\n\n' +
        '/yields - Show best yield opportunities\n' +
        '/portfolio - View your portfolio\n' +
        '/invest - Create new investment\n' +
        '/alerts - Configure notifications\n' +
        '/help - Show this help message',
        { parse_mode: 'Markdown' }
      );
    });
  }

  /**
   * Generate a connection link for a user to connect their Telegram account
   */
  async generateConnectLink(sessionId: string): Promise<{ success: boolean; telegramLink: string }> {
    try {
      // Generate a unique token for this connection
      const token = this.generateRandomToken();
      
      // Store the pending connection
      this.pendingConnections.set(token, sessionId);
      
      // Generate the bot link
      // In production, use the actual bot username
      const botLink = `https://t.me/${this.botUsername}?start=${token}`;
      
      return {
        success: true,
        telegramLink: botLink
      };
    } catch (error) {
      console.error('Error generating Telegram connect link:', error);
      throw new Error('Failed to generate Telegram connection link');
    }
  }

  /**
   * Check if a user has connected their Telegram account
   */
  async checkUserConnection(sessionId: string): Promise<TelegramBotInfo> {
    const connection = this.userConnections.get(sessionId);
    const userPrefs = await storage.getUserPreferences(sessionId);
    
    if (connection || (userPrefs && userPrefs.telegramChatId)) {
      return {
        botName: this.botUsername,
        isConnected: true,
        chatId: connection?.chatId || userPrefs?.telegramChatId || undefined,
        username: connection?.username || userPrefs?.telegramUsername || undefined
      };
    }
    
    return {
      botName: this.botUsername,
      isConnected: false
    };
  }

  /**
   * Send a notification to a user via Telegram
   */
  async sendNotification(sessionId: string, message: string): Promise<boolean> {
    if (!this.bot) return false;
    
    try {
      const connection = this.userConnections.get(sessionId);
      if (!connection) {
        // Check if the user has a Telegram connection in storage
        const userPrefs = await storage.getUserPreferences(sessionId);
        if (!userPrefs || !userPrefs.telegramChatId) {
          return false;
        }
        
        // Add the connection to our in-memory map
        this.userConnections.set(sessionId, { 
          chatId: userPrefs.telegramChatId, 
          username: userPrefs.telegramUsername || 'unknown' 
        });
        
        await this.bot.sendMessage(userPrefs.telegramChatId, message, { parse_mode: 'Markdown' });
        return true;
      }
      
      await this.bot.sendMessage(connection.chatId, message, { parse_mode: 'Markdown' });
      return true;
    } catch (error) {
      console.error('Error sending Telegram notification:', error);
      return false;
    }
  }

  /**
   * Send a yield alert to a user
   */
  async sendYieldAlert(
    sessionId: string, 
    opportunityName: string, 
    protocol: string, 
    apy: number
  ): Promise<boolean> {
    const message = '🔔 *New Yield Opportunity Alert*\n\n' +
                   `*${opportunityName}* on ${protocol}\n` +
                   `Current APY: *${apy}%*\n\n` +
                   'Use /yields to see more details.';
    
    return this.sendNotification(sessionId, message);
  }

  /**
   * Send a portfolio update to a user
   */
  async sendPortfolioUpdate(
    sessionId: string,
    totalValue: number,
    changePercentage: number
  ): Promise<boolean> {
    const message = '📊 *Portfolio Update*\n\n' +
                   `Total Value: *$${totalValue.toLocaleString()}*\n` +
                   `Change: *${changePercentage > 0 ? '+' : ''}${changePercentage}%*\n\n` +
                   'Use /portfolio to see more details.';
    
    return this.sendNotification(sessionId, message);
  }

  /**
   * Helper method to get a sessionId from a chatId
   */
  private getSessionIdFromChatId(chatId: string): string | null {
    for (const [sessionId, connection] of this.userConnections.entries()) {
      if (connection.chatId === chatId) {
        return sessionId;
      }
    }
    return null;
  }

  /**
   * Generate a random token for Telegram connection
   */
  private generateRandomToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}
