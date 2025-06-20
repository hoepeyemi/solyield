import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SolanaWalletInfo, prisma } from '../../shared/schema';
import { storage } from '../storage';

export class SolanaService {
  private connection: Connection;
  private connectedWallets: Map<string, { keypair: Keypair; address: string; userId?: number }>;
  
  constructor() {
    // Use Solana devnet for development, mainnet-beta for production
    const endpoint = process.env.SOLANA_ENDPOINT || 'https://api.devnet.solana.com';
    this.connection = new Connection(endpoint, 'confirmed');
    this.connectedWallets = new Map();
  }

  /**
   * Check if a wallet is connected for a given session
   */
  async getWalletStatus(sessionId: string): Promise<{ connected: boolean; address?: string; balance?: number; userId?: number }> {
    const walletData = this.connectedWallets.get(sessionId);
    
    if (!walletData) {
      return { connected: false };
    }
    
    try {
      const balance = await this.connection.getBalance(new PublicKey(walletData.address));
      return {
        connected: true,
        address: walletData.address,
        balance: balance / LAMPORTS_PER_SOL,
        userId: walletData.userId
      };
    } catch (error) {
      console.error('Error getting wallet status:', error);
      return { connected: false };
    }
  }

  /**
   * Connect a wallet for a session (simulated for development)
   */
  async connectWallet(sessionId: string): Promise<{ success: boolean; address: string; balance: number; userId?: number }> {
    try {
      // For development, we'll create a new keypair each time
      // In production, this would use a proper wallet adapter
      const keypair = Keypair.generate();
      const address = keypair.publicKey.toString();
      
      // Try to find user by wallet address
      let user = await storage.getUserByWalletAddress(address);
      let userId: number | undefined = undefined;
      
      if (user) {
        userId = user.id;
        
        // Update last login time
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          });
        } catch (error) {
          console.error('Error updating last login time:', error);
          // Continue even if update fails
        }
      } else {
        // Create new user if not found
        try {
          const newUser = await storage.createUser({
            walletAddress: address,
            username: null,
            email: null,
            lastLogin: new Date()
          });
          userId = newUser.id;
          
          // Create default preferences
          try {
            await storage.createUserPreferences(userId.toString(), {
              userId,
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
        } catch (error: any) {
          // If there's a unique constraint error, try to fetch the user again
          if (error.code === 'P2002' && error.meta?.target?.includes('wallet_address')) {
            user = await storage.getUserByWalletAddress(address);
            if (user) {
              userId = user.id;
            } else {
              throw error; // Re-throw if we still can't find the user
            }
          } else {
            throw error; // Re-throw other errors
          }
        }
      }
      
      // Store the wallet data for this session
      this.connectedWallets.set(sessionId, { keypair, address, userId });
      
      // For development, we'll simulate having some SOL balance
      const balance = 42.55; // Simulated balance
      
      return {
        success: true,
        address,
        balance,
        userId
      };
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw new Error('Failed to connect wallet');
    }
  }

  /**
   * Disconnect a wallet for a session
   */
  async disconnectWallet(sessionId: string): Promise<void> {
    this.connectedWallets.delete(sessionId);
  }

  /**
   * Get wallet information including balances
   */
  async getWalletInfo(sessionId: string): Promise<SolanaWalletInfo> {
    const walletData = this.connectedWallets.get(sessionId);
    
    if (!walletData) {
      throw new Error('Wallet not connected');
    }
    
    try {
      // For development, we'll use simulated values
      // In production, this would fetch real balances from RPC
      const solBalance = 42.55;
      const usdcBalance = 1245.00;
      const solPrice = 120.75;
      
      return {
        address: walletData.address,
        balance: solBalance,
        balanceInUsd: solBalance * solPrice,
        totalValue: (solBalance * solPrice) + usdcBalance,
        valueChange: 5.3
      };
    } catch (error) {
      console.error('Error getting wallet info:', error);
      throw new Error('Failed to get wallet information');
    }
  }

  /**
   * Get the user ID associated with a session
   */
  async getUserId(sessionId: string): Promise<number> {
    const walletData = this.connectedWallets.get(sessionId);
    
    if (!walletData || !walletData.userId) {
      throw new Error('No user ID associated with this session');
    }
    
    return walletData.userId;
  }

  /**
   * Associate a user ID with a session
   */
  async setUserIdForSession(sessionId: string, userId: number): Promise<void> {
    const walletData = this.connectedWallets.get(sessionId);
    
    if (!walletData) {
      throw new Error('No wallet connected for this session');
    }
    
    walletData.userId = userId;
    this.connectedWallets.set(sessionId, walletData);
  }

  /**
   * Create a transaction to invest in a yield opportunity
   * In production, this would generate and send real transactions
   */
  async createInvestmentTransaction(
    sessionId: string,
    opportunityId: number,
    amount: number,
    token: string
  ): Promise<{ success: boolean; txHash: string }> {
    const walletData = this.connectedWallets.get(sessionId);
    
    if (!walletData) {
      throw new Error('Wallet not connected');
    }
    
    try {
      // Simulate a successful transaction
      // In production, this would create and send a real transaction
      const txHash = this.generateTransactionHash();
      
      return {
        success: true,
        txHash
      };
    } catch (error) {
      console.error('Error creating investment transaction:', error);
      throw new Error('Failed to create investment transaction');
    }
  }

  /**
   * Create a transaction to withdraw from a yield opportunity
   */
  async createWithdrawalTransaction(
    sessionId: string,
    opportunityId: number,
    amount: number,
    token: string
  ): Promise<{ success: boolean; txHash: string }> {
    const walletData = this.connectedWallets.get(sessionId);
    
    if (!walletData) {
      throw new Error('Wallet not connected');
    }
    
    try {
      // Simulate a successful transaction
      const txHash = this.generateTransactionHash();
      
      return {
        success: true,
        txHash
      };
    } catch (error) {
      console.error('Error creating withdrawal transaction:', error);
      throw new Error('Failed to create withdrawal transaction');
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txHash: string): Promise<string> {
    try {
      // In production, this would check the actual transaction status
      return 'confirmed';
    } catch (error) {
      console.error('Error getting transaction status:', error);
      throw new Error('Failed to get transaction status');
    }
  }

  /**
   * Helper to generate a transaction hash for development
   */
  private generateTransactionHash(): string {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
  }
}
