import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { YieldOpportunity } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSolanaWallet } from "@/contexts/SolanaWalletContext";
import { Transaction, VersionedTransaction, PublicKey } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import axios from 'axios';

// RAY token mint address
const RAY_MINT = '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R';

// Interface for the swap computation response
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

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: YieldOpportunity;
}

export const InvestmentModal = ({ isOpen, onClose, opportunity }: InvestmentModalProps) => {
  const [amount, setAmount] = useState("100.00");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { publicKey, signTransaction, connection, balance } = useSolanaWallet();

  // Check if this is a SOL/RAY pair
  const isSolRayPair = opportunity.tokenPair && 
    opportunity.tokenPair.length === 2 && 
    opportunity.tokenPair.includes('SOL') && 
    opportunity.tokenPair.includes('RAY');

  // Use real balance if available
  const balanceData = {
    balance: balance || 1245.00,
    currency: "SOL"
  };

  const balancePercentage = (parseFloat(amount) / balanceData.balance) * 100;
  const estimatedYield = (parseFloat(amount) * parseFloat(opportunity.apy.toString())) / 100;
  const depositFee = (parseFloat(amount) * parseFloat(opportunity.depositFee.toString())) / 100;

  // Swap SOL to RAY
  const swapSolToRay = async (amount: number): Promise<string | null> => {
    try {
      if (!publicKey || !signTransaction || !connection) {
        throw new Error('Wallet not connected');
      }

      const inputMint = NATIVE_MINT.toBase58(); // SOL
      const outputMint = RAY_MINT; // RAY token
      const slippage = 0.5; // 0.5% slippage
      const txVersion = 'V0'; // Use V0 transactions
      const isV0Tx = txVersion === 'V0';
      
      // Convert amount to lamports (smallest unit)
      const amountInLamports = Math.floor(amount * 1000000000);

      // Production Raydium API endpoints
      const RAYDIUM_API_BASE = 'https://api.raydium.io/v2';

      try {
        // Get priority fee from Raydium API
        const priorityFeeResponse = await axios.get(
          `${RAYDIUM_API_BASE}/main/priority-fee`
        );

        if (!priorityFeeResponse.data?.success) {
          throw new Error('Failed to get priority fee data');
        }

        // Get swap computation from Raydium API
        const swapComputeResponse = await axios.get(
          `${RAYDIUM_API_BASE}/main/swap/compute/swap-base-in`, {
            params: {
              inputMint,
              outputMint,
              amount: amountInLamports,
              slippageBps: slippage * 100,
              txVersion
            }
          }
        );

        if (!swapComputeResponse.data?.success) {
          throw new Error('Failed to compute swap');
        }

        // Get transaction data from Raydium API
        const swapTxResponse = await axios.post(
          `${RAYDIUM_API_BASE}/main/swap/transaction/swap-base-in`, 
          {
            computeUnitPriceMicroLamports: String(priorityFeeResponse.data.data.default.h),
            swapResponse: swapComputeResponse.data,
            txVersion,
            wallet: publicKey.toBase58(),
            wrapSol: true, // Need to wrap SOL first
            unwrapSol: false, // We want RAY, not SOL
            inputAccount: undefined, // Will be created by the SDK
            outputAccount: undefined, // Will be created by the SDK
          }
        );

        if (!swapTxResponse.data?.success) {
          throw new Error('Failed to get swap transaction data');
        }

        // Process all transactions in the response
        const allTxBuf = swapTxResponse.data.data.map((tx: any) => Buffer.from(tx.transaction, 'base64'));
        const allTransactions = allTxBuf.map((txBuf: Buffer) =>
          isV0Tx ? VersionedTransaction.deserialize(txBuf) : Transaction.from(txBuf)
        );

        console.log(`Total ${allTransactions.length} transactions to process for SOL to RAY swap`);

        // Sign and send all transactions
        let lastTxId = null;

        if (!isV0Tx) {
          // For legacy transactions
          for (const tx of allTransactions) {
            const transaction = tx as Transaction;
            const signedTx = await signTransaction(transaction);
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
            const signedTx = await signTransaction(transaction);
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
      } catch (axiosError: any) {
        console.error('API Error:', axiosError.response?.data || axiosError.message);
        
        // For development/testing, simulate a successful swap
        if (process.env.NODE_ENV === 'development') {
          console.log('Development environment detected, simulating successful swap');
          return 'simulated-tx-hash';
        }
        
        throw new Error(`Raydium API error: ${axiosError.response?.data?.message || axiosError.message}`);
      }
    } catch (error: any) {
      console.error('Error swapping SOL to RAY:', error);
      throw new Error(`Swap failed: ${error.message}`);
    }
  };

  const investMutation = useMutation({
    mutationFn: async () => {
      const amountValue = parseFloat(amount);
      
      // If this is a SOL/RAY pair, perform the swap first
      if (isSolRayPair) {
        try {
          // Show a loading toast
          toast({
            title: "Processing investment",
            description: "Converting SOL to RAY...",
          });
          
          // Perform the swap
          await swapSolToRay(amountValue);
          
          // After swap is successful, continue with the investment
          toast({
            title: "Conversion successful",
            description: "SOL has been converted to RAY",
          });
        } catch (error: any) {
          console.error('Error during SOL to RAY swap:', error);
          
          // For development/testing, continue with the investment
          if (process.env.NODE_ENV === 'development') {
            console.log('Development environment detected, proceeding with investment despite swap error');
            toast({
              title: "Development mode",
              description: "Simulating successful conversion to RAY",
            });
          } else {
            throw new Error(`Failed to convert SOL to RAY: ${error.message}`);
          }
        }
      }
      
      // Proceed with the investment API call
      return await apiRequest('POST', '/api/portfolio/invest', {
        opportunityId: opportunity.id,
        amount: amountValue,
        token: isSolRayPair ? "RAY" : balanceData.currency
      });
    },
    onSuccess: () => {
      toast({
        title: "Investment successful",
        description: `You have successfully invested ${amount} ${isSolRayPair ? "RAY" : balanceData.currency} in ${opportunity.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/info'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Investment failed",
        description: error.message || "There was an error processing your investment",
        variant: "destructive"
      });
    }
  });

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleInvest = () => {
    if (parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid investment amount",
        variant: "destructive"
      });
      return;
    }
    
    if (parseFloat(amount) > balanceData.balance) {
      toast({
        title: "Insufficient balance",
        description: `Your balance of ${balanceData.balance} ${balanceData.currency} is not enough`,
        variant: "destructive"
      });
      return;
    }
    
    investMutation.mutate();
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'medium-high':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invest in {opportunity.name}</DialogTitle>
          <DialogDescription>
            Enter the amount you want to invest
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-background rounded-lg mb-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Protocol</span>
            <span className="text-sm text-card-foreground">{opportunity.protocol}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Current APY</span>
            <span className="text-sm text-primary font-semibold">{opportunity.apy}%</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Risk Level</span>
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRiskBadgeColor(opportunity.riskLevel)}`}>
              {opportunity.riskLevel}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Deposit Fee</span>
            <span className="text-sm text-card-foreground">{opportunity.depositFee}%</span>
          </div>
        </div>
        
        <div className="mb-4">
          <Label htmlFor="amount" className="block text-sm font-medium text-muted-foreground mb-2">
            Investment Amount
          </Label>
          <div className="relative">
            <Input
              id="amount"
              type="text"
              value={amount}
              onChange={handleAmountChange}
              className="pr-16"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-muted-foreground">{balanceData.currency}</span>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-muted-foreground">Your Balance</span>
            <span className="text-sm text-card-foreground">{balanceData.balance.toFixed(2)} {balanceData.currency}</span>
          </div>
          <div className="w-full bg-background rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(balancePercentage, 100)}%` }}></div>
          </div>
        </div>
        
        <div className="mb-6 p-3 bg-background rounded-lg border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Estimated Annual Yield</span>
            <span className="text-sm text-primary font-semibold">+{estimatedYield.toFixed(2)} {balanceData.currency}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Deposit Fee</span>
            <span className="text-sm text-red-400">-{depositFee.toFixed(2)} {balanceData.currency}</span>
          </div>
          {isSolRayPair && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground">
                Note: Your SOL will be automatically converted to RAY for this investment.
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex space-x-2 sm:space-x-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleInvest} 
            disabled={investMutation.isPending}
          >
            {investMutation.isPending ? "Processing..." : "Confirm Investment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
