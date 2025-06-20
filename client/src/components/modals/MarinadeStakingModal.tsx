import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSolanaWallet } from "@/contexts/SolanaWalletContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  stakeSol, 
  liquidUnstakeSol, 
  getMSolBalance, 
  getSolMSolExchangeRate 
} from "@/lib/marinadeStaking";

interface MarinadeStakingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarinadeStakingModal = ({ isOpen, onClose }: MarinadeStakingModalProps) => {
  const [activeTab, setActiveTab] = useState<string>("stake");
  const [stakeAmount, setStakeAmount] = useState<string>("1.0");
  const [unstakeAmount, setUnstakeAmount] = useState<string>("0.0");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  const { publicKey, signTransaction, connection, balance } = useSolanaWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Query for mSOL balance
  const { data: mSolBalance = 0, isLoading: isLoadingMSolBalance, refetch: refetchMSolBalance } = useQuery({
    queryKey: ["mSolBalance", publicKey?.toString()],
    queryFn: async () => {
      if (!publicKey || !connection) return 0;
      const balance = await getMSolBalance(connection, publicKey);
      return balance / LAMPORTS_PER_SOL; // Convert lamports to SOL
    },
    enabled: !!publicKey && !!connection && isOpen
  });
  
  // Query for SOL/mSOL exchange rate
  const { data: exchangeRate = 1, isLoading: isLoadingExchangeRate } = useQuery({
    queryKey: ["solMSolExchangeRate"],
    queryFn: async () => {
      if (!connection) return 1;
      return await getSolMSolExchangeRate(connection);
    },
    enabled: !!connection && isOpen
  });
  
  // Effect to update unstake amount when mSOL balance changes
  useEffect(() => {
    if (mSolBalance > 0 && !isLoadingMSolBalance && activeTab === "unstake") {
      setUnstakeAmount(mSolBalance.toString());
    }
  }, [mSolBalance, isLoadingMSolBalance, activeTab]);
  
  // Handle stake amount change
  const handleStakeAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setStakeAmount(value);
    }
  };
  
  // Handle unstake amount change
  const handleUnstakeAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      // Ensure unstake amount doesn't exceed mSOL balance
      if (parseFloat(value) > mSolBalance) {
        setUnstakeAmount(mSolBalance.toString());
      } else {
        setUnstakeAmount(value);
      }
    }
  };
  
  // Calculate estimated mSOL to receive
  const calculateEstimatedMSol = () => {
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) return 0;
    
    // mSOL amount = SOL amount / mSOL price
    return amount / exchangeRate;
  };
  
  // Calculate estimated SOL to receive from unstaking
  const calculateEstimatedSol = () => {
    const amount = parseFloat(unstakeAmount);
    if (isNaN(amount) || amount <= 0) return 0;
    
    // SOL amount = mSOL amount * mSOL price
    return amount * exchangeRate;
  };
  
  // Handle stake action
  const handleStake = async () => {
    if (!publicKey || !signTransaction || !connection) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to stake SOL",
        variant: "destructive"
      });
      return;
    }
    
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid stake amount",
        variant: "destructive"
      });
      return;
    }
    
    if (amount > (balance || 0)) {
      toast({
        title: "Insufficient balance",
        description: `Your balance of ${balance?.toFixed(2)} SOL is not enough`,
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Create stake transaction
      const { transaction } = await stakeSol(
        connection,
        publicKey,
        Math.floor(amount * LAMPORTS_PER_SOL) // Convert SOL to lamports
      );
      
      // Make sure the transaction has a recent blockhash
      if (!transaction.recentBlockhash) {
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
        transaction.feePayer = publicKey;
        console.log("Added blockhash manually:", blockhash);
      }
      
      console.log("Transaction before signing:", transaction);
      
      // Sign the transaction
      const signedTx = await signTransaction(transaction);
      console.log("Transaction signed successfully");
      
      // Send the transaction
      console.log("Sending transaction...");
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed"
      });
      console.log("Transaction sent with signature:", signature);
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: transaction.recentBlockhash!,
        lastValidBlockHeight: transaction.lastValidBlockHeight!
      }, "confirmed");
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      console.log("Transaction confirmed successfully:", confirmation);
      
      toast({
        title: "Staking successful",
        description: `You have successfully staked ${amount} SOL with Marinade`
      });
      
      // Refetch mSOL balance
      refetchMSolBalance();
      
      // Close modal
      onClose();
    } catch (error: any) {
      console.error("Error staking SOL with Marinade:", error);
      
      // Extract more detailed error information
      let errorMessage = error.message || "There was an error processing your stake";
      
      // Check for SendTransactionError with logs
      if (error.logs) {
        console.error("Transaction logs:", error.logs);
        errorMessage = `${errorMessage}\n\nLogs: ${error.logs.slice(0, 2).join("\n")}`;
      }
      
      toast({
        title: "Staking failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle unstake action
  const handleUnstake = async () => {
    if (!publicKey || !signTransaction || !connection) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to unstake mSOL",
        variant: "destructive"
      });
      return;
    }
    
    const amount = parseFloat(unstakeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid unstake amount",
        variant: "destructive"
      });
      return;
    }
    
    if (amount > mSolBalance) {
      toast({
        title: "Insufficient balance",
        description: `Your mSOL balance of ${mSolBalance.toFixed(4)} is not enough`,
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Create liquid unstake transaction
      const { transaction } = await liquidUnstakeSol(
        connection,
        publicKey,
        Math.floor(amount * LAMPORTS_PER_SOL) // Convert SOL to lamports
      );
      
      // Make sure the transaction has a recent blockhash
      if (!transaction.recentBlockhash) {
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
        transaction.feePayer = publicKey;
        console.log("Added blockhash manually:", blockhash);
      }
      
      console.log("Transaction before signing:", transaction);
      
      // Sign the transaction
      const signedTx = await signTransaction(transaction);
      console.log("Transaction signed successfully");
      
      // Send the transaction
      console.log("Sending transaction...");
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed"
      });
      console.log("Transaction sent with signature:", signature);
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: transaction.recentBlockhash!,
        lastValidBlockHeight: transaction.lastValidBlockHeight!
      }, "confirmed");
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      console.log("Transaction confirmed successfully:", confirmation);
      
      toast({
        title: "Unstaking successful",
        description: `You have successfully unstaked ${amount} mSOL with Marinade`
      });
      
      // Refetch mSOL balance
      refetchMSolBalance();
      
      // Close modal
      onClose();
    } catch (error: any) {
      console.error("Error unstaking mSOL with Marinade:", error);
      
      // Extract more detailed error information
      let errorMessage = error.message || "There was an error processing your unstake";
      
      // Check for SendTransactionError with logs
      if (error.logs) {
        console.error("Transaction logs:", error.logs);
        errorMessage = `${errorMessage}\n\nLogs: ${error.logs.slice(0, 2).join("\n")}`;
      }
      
      toast({
        title: "Unstaking failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Marinade SOL Staking</DialogTitle>
          <DialogDescription>
            Stake your SOL with Marinade to earn yield and receive mSOL
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stake">Stake</TabsTrigger>
            <TabsTrigger value="unstake">Unstake</TabsTrigger>
          </TabsList>
          
          <TabsContent value="stake">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="stake-amount">Stake Amount (SOL)</Label>
                <Input
                  id="stake-amount"
                  type="text"
                  value={stakeAmount}
                  onChange={handleStakeAmountChange}
                  disabled={isProcessing}
                />
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Balance:</span>
                <span>{balance?.toFixed(4) || "0.0000"} SOL</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">You Will Receive:</span>
                <span className="text-primary">{calculateEstimatedMSol().toFixed(4)} mSOL</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Exchange Rate:</span>
                <span>1 SOL = {(1 / exchangeRate).toFixed(4)} mSOL</span>
              </div>
              
              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="font-medium">Staking Information:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2 text-muted-foreground">
                  <li>Earn ~6% APY on your staked SOL</li>
                  <li>Receive mSOL tokens that represent your staked SOL</li>
                  <li>mSOL can be used in DeFi protocols while earning staking rewards</li>
                  <li>You can unstake instantly with a small fee via the liquidity pool</li>
                </ul>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={handleStake} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Stake SOL"
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
          
          <TabsContent value="unstake">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="unstake-amount">Unstake Amount (mSOL)</Label>
                <Input
                  id="unstake-amount"
                  type="text"
                  value={unstakeAmount}
                  onChange={handleUnstakeAmountChange}
                  disabled={isProcessing || isLoadingMSolBalance}
                />
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your mSOL Balance:</span>
                <span>
                  {isLoadingMSolBalance ? "Loading..." : `${mSolBalance.toFixed(4)} mSOL`}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">You Will Receive:</span>
                <span className="text-primary">{calculateEstimatedSol().toFixed(4)} SOL</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Exchange Rate:</span>
                <span>1 mSOL = {exchangeRate.toFixed(4)} SOL</span>
              </div>
              
              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="font-medium">Unstaking Information:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2 text-muted-foreground">
                  <li>Instant unstaking uses the liquidity pool</li>
                  <li>A small fee is charged for instant unstaking</li>
                  <li>For larger amounts, delayed unstaking may be more cost-effective</li>
                </ul>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button 
                onClick={handleUnstake} 
                disabled={
                  isProcessing || 
                  isLoadingMSolBalance || 
                  mSolBalance <= 0 ||
                  parseFloat(unstakeAmount) <= 0
                }
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Unstake mSOL"
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
