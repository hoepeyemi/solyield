import { 
  Transaction, 
  VersionedTransaction, 
  PublicKey, 
  Connection 
} from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import axios from 'axios';
import { API_URLS } from '@raydium-io/raydium-sdk-v2';

interface SwapCompute {
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
 * Swap SOL to RAY using Raydium SDK
 * @param wallet Connected wallet from wallet adapter
 * @param connection Solana connection
 * @param amount Amount of SOL to swap
 * @returns Transaction signature if successful
 */
export const swapSolToRay = async (
  wallet: any,
  connection: Connection,
  amount: number
): Promise<string | null> => {
  try {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    const inputMint = NATIVE_MINT.toBase58(); // SOL
    const outputMint = '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'; // RAY token
    const slippage = 0.5; // 0.5% slippage
    const txVersion = 'V0'; // Use V0 transactions
    const isV0Tx = txVersion === 'V0';
    
    // Convert amount to lamports (smallest unit)
    const amountInLamports = Math.floor(amount * 1000000000);

    // Get token accounts for the user
    // In a real implementation, you would fetch the user's token accounts
    // For now, we'll just assume we need to create new accounts
    
    // Get priority fee from Raydium API
    const { data: priorityFeeResponse } = await axios.get<{
      id: string;
      success: boolean;
      data: { default: { vh: number; h: number; m: number } };
    }>(`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`);

    // Get swap computation from Raydium API
    const { data: swapResponse } = await axios.get<SwapCompute>(
      `${API_URLS.SWAP_HOST}/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInLamports}&slippageBps=${slippage * 100}&txVersion=${txVersion}`
    );

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
      wallet: wallet.publicKey.toBase58(),
      wrapSol: true, // Need to wrap SOL first
      unwrapSol: false, // We want RAY, not SOL
      inputAccount: undefined, // Will be created by the SDK
      outputAccount: undefined, // Will be created by the SDK
    });

    // Process all transactions in the response
    const allTxBuf = swapTransactions.data.map((tx) => Buffer.from(tx.transaction, 'base64'));
    const allTransactions = allTxBuf.map((txBuf) =>
      isV0Tx ? VersionedTransaction.deserialize(txBuf) : Transaction.from(txBuf)
    );

    console.log(`Total ${allTransactions.length} transactions to process`);

    // Sign and send all transactions
    let lastTxId = null;

    if (!isV0Tx) {
      // For legacy transactions
      for (const tx of allTransactions) {
        const transaction = tx as Transaction;
        const signedTx = await wallet.signTransaction(transaction);
        lastTxId = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });
        
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
          blockhash,
          lastValidBlockHeight,
          signature: lastTxId
        }, 'confirmed');
        
        console.log(`Transaction confirmed: ${lastTxId}`);
      }
    } else {
      // For versioned transactions
      for (const tx of allTransactions) {
        const transaction = tx as VersionedTransaction;
        const signedTx = await wallet.signTransaction(transaction);
        lastTxId = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });
        
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
          blockhash,
          lastValidBlockHeight,
          signature: lastTxId
        }, 'confirmed');
        
        console.log(`Transaction confirmed: ${lastTxId}`);
      }
    }

    return lastTxId;
  } catch (error) {
    console.error('Error swapping SOL to RAY:', error);
    throw error;
  }
};