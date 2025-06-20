import { PublicKey, Transaction, SystemProgram, Connection, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';

// Mock stake accounts for development
const MOCK_STAKE_ACCOUNTS = [
  {
    pubkey: 'mock-stake-account-1',
    account: {
      data: {
        parsed: {
          info: {
            stake: {
              delegation: {
                stake: 2000000000, // 2 SOL in lamports
                activationEpoch: '123'
              }
            }
          }
        }
      }
    }
  }
];

// Helius validator address (mock for development)
const HELIUS_VALIDATOR_ADDRESS = new PublicKey('HeL1sZx9r7PufU8ZWTJwvNzYmGR3qs1yBJ8jJYfPtQA4');

/**
 * Create a stake transaction
 * @param ownerPublicKey The public key of the owner
 * @param amountInSol Amount of SOL to stake
 * @param connection Solana connection
 * @returns Transaction object and stake account public key
 */
export const createStakeTransaction = async (
  ownerPublicKey: PublicKey,
  amountInSol: number,
  connection: Connection
) => {
  try {
    console.log(`Creating stake transaction for ${ownerPublicKey.toString()} with amount ${amountInSol}`);
    
    // Generate a random stake account public key
    // In a real implementation with Helius, we would use their API
    // For mock purposes, we'll create a random public key
    const stakeAccountKeypair = Keypair.generate();
    const stakeAccountPubkey = stakeAccountKeypair.publicKey;
    
    // Calculate the amount in lamports
    const lamports = Math.floor(amountInSol * LAMPORTS_PER_SOL);
    
    // Create a new transaction
    const transaction = new Transaction();
    
    // Add a simple transfer instruction as a placeholder
    // In a real implementation, we would use StakeProgram.createAccount
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: ownerPublicKey,
        toPubkey: HELIUS_VALIDATOR_ADDRESS, // Use the mock Helius validator address
        lamports: lamports
      })
    );
    
    // Get a recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = ownerPublicKey;
    
    console.log("Transaction created with blockhash:", blockhash);
    
    return {
      transaction,
      stakeAccountPubkey
    };
  } catch (error) {
    console.error('Error creating stake transaction:', error);
    throw error;
  }
};

/**
 * Create an unstake transaction
 * @param ownerPublicKey The public key of the owner
 * @param stakeAccountPubkey The public key of the stake account
 * @param connection Solana connection
 * @returns Transaction object
 */
export const createUnstakeTransaction = async (
  ownerPublicKey: PublicKey,
  stakeAccountPubkey: PublicKey,
  connection: Connection
) => {
  try {
    console.log(`Creating unstake transaction for ${ownerPublicKey.toString()} with stake account ${stakeAccountPubkey.toString()}`);
    
    // Create a new transaction
    const transaction = new Transaction();
    
    // Add a simple transfer instruction as a placeholder
    // In a real implementation, we would use StakeProgram.deactivate
    // For mock purposes, we just send a small amount back to the owner
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: ownerPublicKey,
        toPubkey: ownerPublicKey,
        lamports: 1000 // Minimal amount for demonstration
      })
    );
    
    // Get a recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = ownerPublicKey;
    
    console.log("Transaction created with blockhash:", blockhash);
    
    return transaction;
  } catch (error) {
    console.error('Error creating unstake transaction:', error);
    throw error;
  }
};

/**
 * Get the withdrawable amount from a stake account
 * @param stakeAccountPubkey The public key of the stake account
 * @param includeRentExempt Whether to include the rent-exempt minimum in the withdrawable amount
 * @returns Withdrawable amount in lamports
 */
export const getWithdrawableAmount = async (
  stakeAccountPubkey: PublicKey,
  includeRentExempt: boolean = false
) => {
  try {
    console.log(`Getting withdrawable amount for ${stakeAccountPubkey.toString()}`);
    
    // For mock purposes, return a fixed amount
    return 1000000000; // 1 SOL in lamports
  } catch (error) {
    console.error('Error getting withdrawable amount:', error);
    throw error;
  }
};

/**
 * Create a withdraw transaction
 * @param ownerPublicKey The public key of the owner
 * @param stakeAccountPubkey The public key of the stake account
 * @param destinationPubkey The public key of the destination account
 * @param amount Amount to withdraw in lamports
 * @param connection Solana connection
 * @returns Transaction object
 */
export const createWithdrawTransaction = async (
  ownerPublicKey: PublicKey,
  stakeAccountPubkey: PublicKey,
  destinationPubkey: PublicKey,
  amount: number,
  connection: Connection
) => {
  try {
    console.log(`Creating withdraw transaction from ${stakeAccountPubkey.toString()} to ${destinationPubkey.toString()} with amount ${amount}`);
    
    // Create a new transaction
    const transaction = new Transaction();
    
    // Add a simple transfer instruction as a placeholder
    // In a real implementation, we would use StakeProgram.withdraw
    // For mock purposes, we just send a small amount from owner to destination
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: ownerPublicKey,
        toPubkey: destinationPubkey,
        lamports: amount
      })
    );
    
    // Get a recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = ownerPublicKey;
    
    console.log("Transaction created with blockhash:", blockhash);
    
    return transaction;
  } catch (error) {
    console.error('Error creating withdraw transaction:', error);
    throw error;
  }
};

/**
 * Get all stake accounts delegated to Helius validator for a wallet
 * @param walletPubkey The public key of the wallet
 * @returns Array of stake accounts
 */
export const getHeliusStakeAccounts = async (walletPubkey: PublicKey) => {
  try {
    console.log(`Getting stake accounts for ${walletPubkey.toString()}`);
    
    // For mock purposes, return a fixed set of accounts
    return MOCK_STAKE_ACCOUNTS;
  } catch (error) {
    console.error('Error getting Helius stake accounts:', error);
    throw error;
  }
}; 