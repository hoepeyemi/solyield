import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

// Mock implementation for browser environments
// We'll create a simplified version that doesn't rely on the actual Marinade SDK
// This avoids "process is not defined" and other Node.js-specific errors

// Marinade referral code - replace with your actual referral code if you have one
const MARINADE_REFERRAL_CODE = "9udxuXVLiJYJcJcJHZVpQBtY7da95NU2ZQM7QLXvLzU5";

// Mock validator address for Marinade - DO NOT send SOL directly to this address
const MOCK_VALIDATOR_IDENTITY = new PublicKey("MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD");

// Create a PDA for receiving SOL instead of sending directly to the program
const MOCK_STAKE_POOL_PDA = PublicKey.findProgramAddressSync(
  [Buffer.from("stake-pool-pda")],
  SystemProgram.programId
)[0];

/**
 * Initialize a mock Marinade client
 */
export const initializeMarinade = (connection: Connection, publicKey: PublicKey) => {
  return {
    connection,
    publicKey,
    referralCode: new PublicKey(MARINADE_REFERRAL_CODE),
    getMSolAccountAddress: async (owner: PublicKey) => {
      // In a real implementation, this would derive the associated token account
      // For mock purposes, we'll just derive a deterministic address from the owner
      return PublicKey.findProgramAddressSync(
        [Buffer.from("msol-token"), owner.toBuffer()],
        SystemProgram.programId
      )[0];
    },
    deposit: async (lamports: number) => {
      // Create a simple transfer transaction as a mock
      // Important: Send to a PDA, not directly to the program
      const transaction = new Transaction();
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: MOCK_STAKE_POOL_PDA, // Use PDA instead of validator identity
          lamports,
        })
      );

      // Mock mSOL token account address
      const associatedMSolTokenAccountAddress = PublicKey.findProgramAddressSync(
        [Buffer.from("msol-token"), publicKey.toBuffer()],
        SystemProgram.programId
      )[0];

      return { transaction, associatedMSolTokenAccountAddress };
    },
    liquidUnstake: async (lamports: number) => {
      // Create a simple transfer transaction as a mock
      // For unstaking, we're simulating the PDA sending SOL back to the user
      const transaction = new Transaction();
      
      // In a real implementation, this would be a program instruction
      // For our mock, we'll just simulate the transfer
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey, // Self-transfer as a workaround for mock
          toPubkey: publicKey,
          lamports: Math.min(lamports, 10000), // Small amount for simulation
        })
      );

      // Mock mSOL token account address
      const associatedMSolTokenAccountAddress = PublicKey.findProgramAddressSync(
        [Buffer.from("msol-token"), publicKey.toBuffer()],
        SystemProgram.programId
      )[0];

      return { transaction, associatedMSolTokenAccountAddress };
    }
  };
};

/**
 * Stake SOL using Marinade (Mock implementation)
 * @param connection Solana connection
 * @param publicKey User's public key
 * @param amountSol Amount of SOL to stake
 * @returns Transaction and mSOL token account address
 */
export const stakeSOL = async (
  connection: Connection,
  publicKey: PublicKey,
  amountSol: number
) => {
  try {
    console.log(`Staking ${amountSol} SOL with Marinade (Mock)`);
    
    // Convert SOL to lamports
    const amountLamports = amountSol * 1_000_000_000;
    
    // Initialize mock Marinade
    const marinade = initializeMarinade(connection, publicKey);
    
    // Create deposit transaction
    const { 
      associatedMSolTokenAccountAddress, 
      transaction 
    } = await marinade.deposit(amountLamports);
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = publicKey;
    
    console.log("Mock Marinade deposit transaction created");
    
    return {
      transaction,
      mSolTokenAccount: associatedMSolTokenAccountAddress
    };
  } catch (error) {
    console.error('Error creating mock Marinade stake transaction:', error);
    throw error;
  }
};

/**
 * Stake SOL using Marinade Native with referral code (Mock implementation)
 * @param connection Solana connection
 * @param publicKey User's public key
 * @param amountSol Amount of SOL to stake
 * @returns Transaction (not versioned in mock)
 */
export const stakeSOLNative = async (
  connection: Connection,
  publicKey: PublicKey,
  amountSol: number
) => {
  try {
    console.log(`Staking ${amountSol} SOL with Marinade Native (Mock)`);
    
    // Convert SOL to lamports
    const amountLamports = amountSol * 1_000_000_000;
    
    // Create a simple transfer transaction as a mock
    // Important: Send to a PDA, not directly to the program
    const transaction = new Transaction();
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: MOCK_STAKE_POOL_PDA, // Use PDA instead of validator identity
        lamports: amountLamports,
      })
    );
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = publicKey;
    
    console.log("Mock Marinade native stake transaction created");
    
    return transaction;
  } catch (error) {
    console.error('Error creating mock Marinade native stake transaction:', error);
    throw error;
  }
};

/**
 * Unstake SOL from Marinade (Mock implementation)
 * @param connection Solana connection
 * @param publicKey User's public key
 * @param amountSol Amount of SOL to unstake
 * @returns Transaction and mSOL token account address
 */
export const unstakeSOL = async (
  connection: Connection,
  publicKey: PublicKey,
  amountSol: number
) => {
  try {
    console.log(`Unstaking ${amountSol} SOL from Marinade (Mock)`);
    
    // Convert SOL to lamports
    const amountLamports = amountSol * 1_000_000_000;
    
    // Initialize mock Marinade
    const marinade = initializeMarinade(connection, publicKey);
    
    // Create liquid unstake transaction
    const { 
      associatedMSolTokenAccountAddress, 
      transaction 
    } = await marinade.liquidUnstake(amountLamports);
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = publicKey;
    
    console.log("Mock Marinade liquid unstake transaction created");
    
    return {
      transaction,
      mSolTokenAccount: associatedMSolTokenAccountAddress
    };
  } catch (error) {
    console.error('Error creating mock Marinade unstake transaction:', error);
    throw error;
  }
};

/**
 * Prepare for unstaking from Marinade Native (Mock implementation)
 * @param connection Solana connection
 * @param publicKey User's public key
 * @param amountSol Amount of SOL to unstake
 * @returns Transaction with fee payment instructions
 */
export const prepareUnstakeSOLNative = async (
  connection: Connection,
  publicKey: PublicKey,
  amountSol: number
) => {
  try {
    console.log(`Preparing to unstake ${amountSol} SOL from Marinade Native (Mock)`);
    
    // Convert SOL to lamports
    const amountLamports = amountSol * 1_000_000_000;
    
    // Create a simple transfer transaction as a mock
    // For unstaking, we're simulating the PDA sending SOL back to the user
    // In a real implementation, this would be a program instruction
    // For our mock, we'll just simulate a small self-transfer
    const transaction = new Transaction();
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: publicKey, // Self-transfer as a workaround for mock
        toPubkey: publicKey,
        lamports: Math.min(amountLamports / 100, 10000), // Small amount for simulation
      })
    );
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = publicKey;
    
    console.log("Mock Marinade prepare unstake transaction created");
    
    return {
      transaction,
      authIx: {
        onPaid: async () => {
          console.log("Mock auth instruction paid");
        }
      }
    };
  } catch (error) {
    console.error('Error creating mock Marinade prepare unstake transaction:', error);
    throw error;
  }
};

/**
 * Get Marinade staking accounts for a wallet (Mock implementation)
 * @param connection Solana connection
 * @param publicKey User's public key
 * @returns Array of stake accounts
 */
export const getMarinadeStakeAccounts = async (
  connection: Connection,
  publicKey: PublicKey
) => {
  try {
    console.log(`Getting mock Marinade stake accounts for ${publicKey.toString()}`);
    
    // Mock mSOL token account
    const mSolTokenAccount = PublicKey.findProgramAddressSync(
      [Buffer.from("msol-token"), publicKey.toBuffer()],
      SystemProgram.programId
    )[0];
    
    // Mock mSOL balance (1.5 SOL)
    const mSolBalance = 1.5;
    
    // Return a mock stake account with the mSOL balance
    return [
      {
        pubkey: mSolTokenAccount.toString(),
        account: {
          data: {
            parsed: {
              info: {
                stake: {
                  delegation: {
                    stake: mSolBalance * 1_000_000_000, // Convert to lamports
                    activationEpoch: '123'
                  }
                }
              }
            }
          }
        },
        balance: mSolBalance
      }
    ];
  } catch (error) {
    console.error('Error getting mock Marinade stake accounts:', error);
    return [];
  }
}; 