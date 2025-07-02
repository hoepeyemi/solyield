import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { initSdk, txVersion } from '@/components/dashboard/config';
import { isValidAmm } from '@/components/dashboard/utils';
import { TokenAmount, toToken, Percent, ApiV3PoolInfoStandardItem } from '@raydium-io/raydium-sdk-v2';
import Decimal from 'decimal.js';

/**
 * Check USDC balance for liquidity
 * 
 * @param connection Solana connection
 * @param publicKey User's wallet public key
 * @param rayAmount Amount of RAY tokens to check USDC requirement for
 * @returns Object with USDC balance information
 */
export const checkUsdcBalanceForLiquidity = async (
  connection: Connection,
  publicKey: PublicKey,
  rayAmount: number
): Promise<{ hasEnoughUsdc: boolean; requiredUsdc: number; usdcBalance: number }> => {
  try {
    // Initialize the Raydium SDK
    const raydium = await initSdk({ loadToken: true });
    
    // RAY-USDC pool ID
    const poolId = '6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg';
    
    // Get pool info
    const data = await raydium.api.fetchPoolById({ ids: poolId });
    const poolInfo = data[0] as ApiV3PoolInfoStandardItem;
    
    // Convert to string for computation
    const inputAmount = rayAmount.toString();
    
    // Compute the corresponding amount of USDC needed
    const pairAmountResult = raydium.liquidity.computePairAmount({
      poolInfo,
      amount: inputAmount,
      baseIn: true,
      slippage: new Percent(1, 100), // 1% slippage
    });
    
    // Find user's USDC token account
    const usdcMint = poolInfo.mintB.address;
    const usdcTokenAccount = raydium.account.tokenAccountRawInfos.find(
      (a) => a.accountInfo.mint.toBase58() === usdcMint
    );
    
    // Calculate USDC balance
    let usdcBalance = 0;
    if (usdcTokenAccount) {
      const usdcDecimals = poolInfo.mintB.decimals;
      usdcBalance = Number(usdcTokenAccount.accountInfo.amount.toString()) / Math.pow(10, usdcDecimals);
    } else {
      // Try direct query for USDC accounts
      const usdcAccounts = await connection.getTokenAccountsByOwner(publicKey, {
        mint: new PublicKey(usdcMint)
      });
      
      if (usdcAccounts.value.length > 0) {
        // Parse the USDC account data
        for (const account of usdcAccounts.value) {
          const accountInfo = account.account;
          const parsed = await connection.getParsedAccountInfo(account.pubkey);
          if (parsed.value && 'parsed' in parsed.value.data) {
            const parsedData = parsed.value.data.parsed;
            if (parsedData.info && parsedData.info.tokenAmount) {
              usdcBalance += parsedData.info.tokenAmount.uiAmount || 0;
            }
          }
        }
      }
    }
    
    // Get required USDC amount
    const requiredUsdc = parseFloat(pairAmountResult.maxAnotherAmount.toExact());
    
    // Check if user has enough USDC
    const hasEnoughUsdc = usdcBalance >= requiredUsdc;
    
    return { hasEnoughUsdc, requiredUsdc, usdcBalance };
  } catch (error) {
    console.error('Error checking USDC balance:', error);
    return { hasEnoughUsdc: false, requiredUsdc: 0, usdcBalance: 0 };
  }
};

/**
 * Add liquidity to the RAY-USDC pool
 * 
 * @param connection Solana connection
 * @param publicKey User's wallet public key
 * @param signTransaction Function to sign transactions
 * @param rayAmount Amount of RAY tokens to add to liquidity
 * @returns Transaction signature
 */
export const addRayUsdcLiquidity = async (
  connection: Connection,
  publicKey: PublicKey,
  signTransaction: any,
  rayAmount: number
): Promise<string> => {
  try {
    // Ensure rayAmount is positive
    if (rayAmount <= 0) {
      throw new Error('RAY amount must be greater than zero');
    }

    console.log('Starting liquidity addition with RAY amount:', rayAmount);
    
    // Initialize the Raydium SDK
    let raydium = await initSdk({ loadToken: true });
    
    // RAY-USDC pool ID
    const poolId = '6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg';
    
    // Get pool info
    const data = await raydium.api.fetchPoolById({ ids: poolId });
    const poolInfo = data[0] as ApiV3PoolInfoStandardItem;
    
    if (!isValidAmm(poolInfo.programId)) {
      throw new Error('Target pool is not a valid AMM pool');
    }
    
    // Get RAY mint address
    const rayMint = poolInfo.mintA.address;
    console.log('RAY mint address:', rayMint);
    
    // First try to find RAY token account using Raydium SDK
    let rayTokenAccount = raydium.account.tokenAccountRawInfos.find(
      (a) => a.accountInfo.mint.toBase58() === rayMint
    );
    
    // If not found using SDK, try direct query
    if (!rayTokenAccount) {
      console.log('RAY token account not found in SDK, trying direct query');
      const rayTokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
        mint: new PublicKey(rayMint)
      });
      
      if (rayTokenAccounts.value.length > 0) {
        console.log('Found RAY token account via direct query');
        // We found the account but we can't use it directly with the SDK
        // Instead, we'll reload the SDK with token accounts
        raydium = await initSdk({ loadToken: true });
        
        // Try again to find the account
        rayTokenAccount = raydium.account.tokenAccountRawInfos.find(
          (a) => a.accountInfo.mint.toBase58() === rayMint
        );
      }
    }
    
    // If still not found, we can't proceed
    if (!rayTokenAccount) {
      console.error('RAY token accounts:', await connection.getTokenAccountsByOwner(publicKey, {
        mint: new PublicKey(rayMint)
      }));
      throw new Error('RAY token account not found. Make sure you have RAY tokens in your wallet.');
    }
    
    // Calculate actual RAY balance
    const rayDecimals = poolInfo.mintA.decimals;
    const actualRayBalance = Number(rayTokenAccount.accountInfo.amount.toString()) / Math.pow(10, rayDecimals);
    
    console.log('RAY balance check:', {
      requestedAmount: rayAmount,
      actualBalance: actualRayBalance
    });
    
    // Use the minimum of requested amount and actual balance
    const finalRayAmount = Math.min(rayAmount, actualRayBalance);
    
    if (finalRayAmount <= 0) {
      throw new Error('Insufficient RAY balance');
    }
    
    // Convert to string for computation
    const inputAmount = finalRayAmount.toString();
    
    // Compute the corresponding amount of USDC needed
    const pairAmountResult = raydium.liquidity.computePairAmount({
      poolInfo,
      amount: inputAmount,
      baseIn: true,
      slippage: new Percent(1, 100), // 1% slippage
    });
    
    // Find user's USDC token account
    const usdcMint = poolInfo.mintB.address;
    const usdcTokenAccount = raydium.account.tokenAccountRawInfos.find(
      (a) => a.accountInfo.mint.toBase58() === usdcMint
    );
    
    if (!usdcTokenAccount) {
      throw new Error('USDC token account not found');
    }
    
    // Calculate actual USDC balance
    const usdcDecimals = poolInfo.mintB.decimals;
    const usdcBalance = Number(usdcTokenAccount.accountInfo.amount.toString()) / Math.pow(10, usdcDecimals);
    const requiredUsdc = parseFloat(pairAmountResult.maxAnotherAmount.toExact());
    
    if (usdcBalance < requiredUsdc) {
      throw new Error(`Insufficient USDC balance. Required: ${requiredUsdc.toFixed(2)}, Available: ${usdcBalance.toFixed(2)}`);
    }
    
    console.log('Adding liquidity with:', {
      rayAmount: inputAmount,
      usdcAmount: pairAmountResult.maxAnotherAmount.toExact(),
      rayDecimals,
      usdcDecimals
    });
    
    // Convert to raw amounts with correct decimals
    const rayRawAmount = new Decimal(inputAmount).mul(new Decimal(10).pow(rayDecimals)).toFixed(0);
    const usdcRawAmount = new Decimal(pairAmountResult.maxAnotherAmount.toExact()).mul(new Decimal(10).pow(usdcDecimals)).toFixed(0);
    
    console.log('Raw amounts:', {
      rayRawAmount,
      usdcRawAmount
    });
    
    // Ensure amounts are not zero
    if (rayRawAmount === '0' || usdcRawAmount === '0') {
      throw new Error('Cannot add liquidity with zero amounts');
    }
    
    // Create add liquidity transaction
    const { execute, transaction } = await raydium.liquidity.addLiquidity({
      poolInfo,
      amountInA: new TokenAmount(
        toToken(poolInfo.mintA),
        rayRawAmount
      ),
      amountInB: new TokenAmount(
        toToken(poolInfo.mintB),
        usdcRawAmount
      ),
      otherAmountMin: pairAmountResult.minAnotherAmount,
      fixedSide: 'a',
      txVersion,
      computeBudgetConfig: {
        units: 600000,
        microLamports: 46591500,
      },
    });
    
    // Handle signing and sending the transaction
    if (transaction instanceof VersionedTransaction) {
      // Sign with the user's wallet
      const signedTx = await signTransaction(transaction);
      
      // Send the transaction
      const txId = await connection.sendTransaction(signedTx, {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(txId, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      return txId;
    } else {
      // For regular Transaction
      const tx = transaction as Transaction;
      
      // Set fee payer
      tx.feePayer = publicKey;
      
      // Sign with the user's wallet
      const signedTx = await signTransaction(tx);
      
      // Send the transaction
      const txId = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(txId, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      return txId;
    }
  } catch (error) {
    console.error('Error adding RAY-USDC liquidity:', error);
    throw error;
  }
};

/**
 * Stake RAY tokens in the RAY-USDC farm
 * 
 * @param connection Solana connection
 * @param publicKey User's wallet public key
 * @param signTransaction Function to sign transactions
 * @returns Transaction signature
 */
export const stakeRayToFarm = async (
  connection: Connection,
  publicKey: PublicKey,
  signTransaction: any
): Promise<string> => {
  try {
    // Initialize the Raydium SDK
    const raydium = await initSdk({ loadToken: true });
    
    // Target farm ID for RAY-USDC
    const targetFarm = 'CHYrUBX2RKX8iBg7gYTkccoGNBzP44LdaazMHCLcdEgS'; // RAY-USDC farm
    
    // Fetch farm information
    const farmInfo = (await raydium.api.fetchFarmInfoById({ ids: targetFarm }))[0];
    if (!farmInfo) {
      throw new Error('Failed to fetch farm information');
    }
    
    console.log('Farm info:', farmInfo);
    
    // Find user's LP token amount
    const lpTokenAccount = raydium.account.tokenAccountRawInfos.find(
      (a) => a.accountInfo.mint.toBase58() === farmInfo.lpMint.address
    );
    
    if (!lpTokenAccount || lpTokenAccount.accountInfo.amount.isZero()) {
      throw new Error('No LP tokens found for this farm');
    }
    
    const amount = lpTokenAccount.accountInfo.amount;
    console.log('LP token amount:', amount.toString());
    
    // Prepare farm deposit transaction
    const { transaction, signers } = await raydium.farm.deposit({
      farmInfo,
      amount,
      txVersion,
      // Optional: set up priority fee here
      computeBudgetConfig: {
        units: 600000,
        microLamports: 46591500,
      }
    });
    
    // Handle signing differently based on transaction type
    if (transaction instanceof VersionedTransaction) {
      // For VersionedTransaction, we need to use sign instead of partialSign
      if (signers.length > 0) {
        // Create a list of all signers including the user's wallet
        transaction.sign(signers);
      }
      
      // Sign with the user's wallet
      const signedTx = await signTransaction(transaction);
      
      // Send the transaction
      const txId = await connection.sendTransaction(signedTx, {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(txId, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      return txId;
    } else {
      // For regular Transaction
      const tx = transaction as Transaction;
      
      // Set fee payer
      tx.feePayer = publicKey;
      
      // If there are additional signers, sign with them first
      if (signers.length > 0) {
        tx.partialSign(...signers);
      }
      
      // Sign with the user's wallet
      const signedTx = await signTransaction(tx);
      
      // Send the transaction
      const txId = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(txId, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      return txId;
    }
  } catch (error) {
    console.error('Error staking RAY:', error);
    throw error;
  }
}

/**
 * Get LP token balance for RAY-USDC farm
 * 
 * @param connection Solana connection
 * @param publicKey User's wallet public key
 * @returns LP token balance
 */
export const getRayLpBalance = async (
  connection: Connection,
  publicKey: PublicKey
): Promise<number> => {
  try {
    // Initialize the Raydium SDK
    const raydium = await initSdk({ loadToken: true });
    
    // Target farm ID for RAY-USDC
    const targetFarm = 'CHYrUBX2RKX8iBg7gYTkccoGNBzP44LdaazMHCLcdEgS'; // RAY-USDC farm
    
    // Fetch farm information
    const farmInfo = (await raydium.api.fetchFarmInfoById({ ids: targetFarm }))[0];
    if (!farmInfo) {
      throw new Error('Failed to fetch farm information');
    }
    
    // Find user's LP token amount
    const lpTokenAccount = raydium.account.tokenAccountRawInfos.find(
      (a) => a.accountInfo.mint.toBase58() === farmInfo.lpMint.address
    );
    
    if (!lpTokenAccount) {
      return 0;
    }
    
    // Convert to human-readable number
    const amount = lpTokenAccount.accountInfo.amount;
    
    // RAY-USDC LP token typically has 9 decimals
    const decimals = 9;
    const balance = Number(amount.toString()) / Math.pow(10, decimals);
    
    return balance;
  } catch (error) {
    console.error('Error getting RAY LP balance:', error);
    return 0;
  }
}

/**
 * Get RAY token balance
 * 
 * @param connection Solana connection
 * @param publicKey User's wallet public key
 * @returns RAY token balance
 */
export const getRayBalance = async (
  connection: Connection,
  publicKey: PublicKey
): Promise<{ balance: number; found: boolean }> => {
  try {
    // RAY token mint
    const rayMint = new PublicKey('4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R');
    
    // Get all token accounts owned by the user
    const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
      mint: rayMint
    });
    
    // If no accounts found, return 0 balance
    if (tokenAccounts.value.length === 0) {
      return { balance: 0, found: false };
    }
    
    // Parse account data
    let totalBalance = 0;
    for (const account of tokenAccounts.value) {
      const accountInfo = account.account;
      const data = accountInfo.data;
      
      // Parse token account data
      const parsed = await connection.getParsedAccountInfo(account.pubkey);
      if (parsed.value && 'parsed' in parsed.value.data) {
        const parsedData = parsed.value.data.parsed;
        if (parsedData.info && parsedData.info.tokenAmount) {
          const amount = parsedData.info.tokenAmount.uiAmount || 0;
          totalBalance += amount;
        }
      }
    }
    
    return { balance: totalBalance, found: true };
  } catch (error) {
    console.error('Error getting RAY balance:', error);
    return { balance: 0, found: false };
  }
};

/**
 * Get USDC token balance
 * 
 * @param connection Solana connection
 * @param publicKey User's wallet public key
 * @returns USDC token balance
 */
export const getUsdcBalance = async (
  connection: Connection,
  publicKey: PublicKey
): Promise<{ balance: number; found: boolean }> => {
  try {
    // USDC token mint on Solana
    const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    
    // Get all token accounts owned by the user
    const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
      mint: usdcMint
    });
    
    // If no accounts found, return 0 balance
    if (tokenAccounts.value.length === 0) {
      return { balance: 0, found: false };
    }
    
    // Parse account data
    let totalBalance = 0;
    for (const account of tokenAccounts.value) {
      const accountInfo = account.account;
      const data = accountInfo.data;
      
      // Parse token account data
      const parsed = await connection.getParsedAccountInfo(account.pubkey);
      if (parsed.value && 'parsed' in parsed.value.data) {
        const parsedData = parsed.value.data.parsed;
        if (parsedData.info && parsedData.info.tokenAmount) {
          const amount = parsedData.info.tokenAmount.uiAmount || 0;
          totalBalance += amount;
        }
      }
    }
    
    return { balance: totalBalance, found: true };
  } catch (error) {
    console.error('Error getting USDC balance:', error);
    return { balance: 0, found: false };
  }
}; 