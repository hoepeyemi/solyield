import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// This is a utility class to interact with the Solana blockchain
export class SolanaUtils {
  private static connection = new Connection(process.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');

  // Get account information for a wallet
  public static async getAccountInfo(address: string) {
    try {
      const publicKey = new PublicKey(address);
      const accountInfo = await this.connection.getAccountInfo(publicKey);
      return accountInfo;
    } catch (error) {
      console.error('Error getting account info:', error);
      throw error;
    }
  }

  // Get SOL balance for a wallet
  public static async getBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  // Create a simple SOL transfer transaction
  public static createTransferTransaction(
    fromPublicKey: PublicKey,
    toPublicKey: PublicKey,
    amount: number
  ): Transaction {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromPublicKey,
        toPubkey: toPublicKey,
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );

    return transaction;
  }

  // Get transaction information
  public static async getTransaction(signature: string) {
    try {
      const transaction = await this.connection.getTransaction(signature);
      return transaction;
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw error;
    }
  }

  // Get recent block hash
  public static async getRecentBlockhash() {
    try {
      const { blockhash } = await this.connection.getLatestBlockhash();
      return blockhash;
    } catch (error) {
      console.error('Error getting recent blockhash:', error);
      throw error;
    }
  }

  // Confirm transaction
  public static async confirmTransaction(signature: string) {
    try {
      const confirmation = await this.connection.confirmTransaction(signature);
      return confirmation;
    } catch (error) {
      console.error('Error confirming transaction:', error);
      throw error;
    }
  }
}
