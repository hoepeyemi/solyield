import { 
  Transaction, 
  VersionedTransaction, 
  PublicKey, 
  Connection 
} from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import axios from 'axios';
import { API_URLS } from '@raydium-io/raydium-sdk-v2';

// RAY token mint address
export const RAY_MINT = '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R';

// Interface for the swap computation response
export interface SwapCompute {
  id: string;
  success: true;
  version: 'V0' | 'V1';
  openTime?: undefined;
  msg: undefined;
  data: {
    swapType: 'BaseIn' | 'BaseOut';
    inputMint: string;
    inputAmount: string;
    outputMint: string;
    outputAmount: string;
    otherAmountThreshold: string;
    slippageBps: number;
    priceImpactPct: number;
    routePlan: {
      poolId: string;
      inputMint: string;
      outputMint: string;
      feeMint: string;
      feeRate: number;
      feeAmount: string;
    }[];
  };
}

/**
 * Swap SOL to RAY using Raydium API
 * 
 * @param connection - Solana connection
 * @param publicKey - User's public key
 * @param signTransaction - Function to sign transactions
 * @param amountSol - Amount of SOL to swap
 * @returns The transaction signature of the last transaction
 */
export const swapSolToRay = async (
  connection: any,
  publicKey: PublicKey,
  signTransaction: (transaction: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>,
  amountSol: number
): Promise<string | null> => {
  try {
    console.log(`Swapping ${amountSol} SOL to RAY`);
    
    const inputMint = NATIVE_MINT.toBase58(); // SOL
    const outputMint = RAY_MINT; // RAY token
    const slippage = 0.5; // 0.5% slippage
    const txVersion = 'V0'; // Use V0 transactions
    const isV0Tx = txVersion === 'V0';
    
    // Convert amount to lamports (smallest unit)
    const amountInLamports = Math.floor(amountSol * 1000000000);

    console.log(`Amount in lamports: ${amountInLamports}`);

    // Get priority fee from Raydium API
    const { data: priorityFeeResponse } = await axios.get<{
      id: string;
      success: boolean;
      data: { default: { vh: number; h: number; m: number } }
    }>(`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`);

    console.log('Priority fee retrieved:', priorityFeeResponse.data.default);

    // Get swap computation from Raydium API
    const { data: swapResponse } = await axios.get<SwapCompute>(
      `${API_URLS.SWAP_HOST}/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInLamports}&slippageBps=${slippage * 100}&txVersion=${txVersion}`
    );

    console.log('Swap computation retrieved:', swapResponse.id);

    // Get transaction data from Raydium API
    const { data: swapTransactions } = await axios.post<{
      id: string;
      version: string;
      success: boolean;
      data: { transaction: string }[];
    }>(`${API_URLS.SWAP_HOST}/transaction/swap-base-in`, {
      computeUnitPriceMicroLamports: String(priorityFeeResponse.data.default.h),
      swapResponse,
      txVersion,
      wallet: publicKey.toBase58(),
      wrapSol: true, // Need to wrap SOL first
      unwrapSol: false, // We want RAY, not SOL
      inputAccount: undefined, // Will be created by the SDK
      outputAccount: undefined, // Will be created by the SDK
    });

    console.log('Swap transactions retrieved:', swapTransactions.id);

    // Process all transactions in the response
    const allTxBuf = swapTransactions.data.map((tx) => Buffer.from(tx.transaction, 'base64'));
    const allTransactions = allTxBuf.map((txBuf) =>
      isV0Tx ? VersionedTransaction.deserialize(txBuf) : Transaction.from(txBuf)
    );

    console.log(`Total ${allTransactions.length} transactions to process for SOL to RAY swap`);

    // Sign and send all transactions
    let lastTxId = null;
    let txIndex = 0;

    if (!isV0Tx) {
      // For legacy transactions
      for (const tx of allTransactions) {
        txIndex++;
        console.log(`Processing legacy transaction ${txIndex}/${allTransactions.length}`);
        
        const transaction = tx as Transaction;
        const signedTx = await signTransaction(transaction);
        lastTxId = await connection.sendRawTransaction((signedTx as Transaction).serialize(), { skipPreflight: true });
        
        console.log(`Transaction ${txIndex} sent with signature: ${lastTxId}`);
        
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
          blockhash,
          lastValidBlockHeight,
          signature: lastTxId
        }, 'confirmed');
        
        console.log(`Transaction ${txIndex} confirmed`);
      }
    } else {
      // For versioned transactions
      for (const tx of allTransactions) {
        txIndex++;
        console.log(`Processing versioned transaction ${txIndex}/${allTransactions.length}`);
        
        const transaction = tx as VersionedTransaction;
        const signedTx = await signTransaction(transaction);
        lastTxId = await connection.sendRawTransaction((signedTx as VersionedTransaction).serialize(), { skipPreflight: true });
        
        console.log(`Transaction ${txIndex} sent with signature: ${lastTxId}`);
        
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
          blockhash,
          lastValidBlockHeight,
          signature: lastTxId
        }, 'confirmed');
        
        console.log(`Transaction ${txIndex} confirmed`);
      }
    }

    console.log(`SOL to RAY swap completed successfully. Final transaction ID: ${lastTxId}`);
    return lastTxId;
  } catch (error) {
    console.error('Error swapping SOL to RAY:', error);
    throw error;
  }
};

/**
 * Get the estimated output amount of RAY for a given amount of SOL
 * 
 * @param amountSol - Amount of SOL to swap
 * @returns The estimated amount of RAY
 */
export const getEstimatedRayOutput = async (amountSol: number): Promise<number> => {
  try {
    const inputMint = NATIVE_MINT.toBase58(); // SOL
    const outputMint = RAY_MINT; // RAY token
    const amountInLamports = Math.floor(amountSol * 1000000000);
    
    const { data: swapResponse } = await axios.get<SwapCompute>(
      `${API_URLS.SWAP_HOST}/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInLamports}&slippageBps=50&txVersion=V0`
    );
    
    // Convert from smallest unit to RAY
    const estimatedRay = Number(swapResponse.data.outputAmount) / 1000000000;
    return estimatedRay;
  } catch (error) {
    console.error('Error getting estimated RAY output:', error);
    return 0;
  }
};