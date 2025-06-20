import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSolanaWallet } from "@/contexts/SolanaWalletContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createStakeTransaction, createUnstakeTransaction, createWithdrawTransaction, getHeliusStakeAccounts, getWithdrawableAmount } from "@/lib/heliusStaking";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface StakingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StakingModal = ({ isOpen, onClose }: StakingModalProps) => {
  const [activeTab, setActiveTab] = useState<string>("stake");
  const [stakeAmount, setStakeAmount] = useState<string>("1.0");
  const [selectedStakeAccount, setSelectedStakeAccount] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("0.0");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  const { publicKey, signTransaction, connection, balance } = useSolanaWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch stake accounts
  const { data: stakeAccounts = [], isLoading: isLoadingStakeAccounts, refetch: refetchStakeAccounts } = useQuery({
    queryKey: ['heliusStakeAccounts', publicKey?.toString()],
    queryFn: async () => {
      if (!publicKey) return [];
      return await getHeliusStakeAccounts(publicKey);
    },
    enabled: !!publicKey && isOpen
  });
  
  // Query for withdrawable amount
  const { data: withdrawableAmount, isLoading: isLoadingWithdrawable, refetch: refetchWithdrawable } = useQuery({
    queryKey: ['withdrawableAmount', selectedStakeAccount],
    queryFn: async () => {
      if (!selectedStakeAccount) return 0;
      const amount = await getWithdrawableAmount(new PublicKey(selectedStakeAccount), true);
      return amount / LAMPORTS_PER_SOL; // Convert lamports to SOL
    },
    enabled: !!selectedStakeAccount && activeTab === "withdraw"
  });
  
  // Effect to update withdraw amount when withdrawable amount changes
  useEffect(() => {
    if (withdrawableAmount && !isLoadingWithdrawable) {
      setWithdrawAmount(withdrawableAmount.toString());
    }
  }, [withdrawableAmount, isLoadingWithdrawable]);
  
  // Effect to reset selected stake account when tab changes
  useEffect(() => {
    if (activeTab === "unstake" || activeTab === "withdraw") {
      // Select the first stake account by default if available
      if (stakeAccounts.length > 0 && !selectedStakeAccount) {
        setSelectedStakeAccount(stakeAccounts[0].pubkey);
      }
    }
  }, [activeTab, stakeAccounts, selectedStakeAccount]);
  
  // Handle stake amount change
  const handleStakeAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setStakeAmount(value);
    }
  };
  
  // Handle withdraw amount change
  const handleWithdrawAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      // Ensure withdraw amount doesn't exceed withdrawable amount
      if (withdrawableAmount && parseFloat(value) > withdrawableAmount) {
        setWithdrawAmount(withdrawableAmount.toString());
      } else {
        setWithdrawAmount(value);
      }
    }
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
      
      // Create stake transaction - Pass connection as parameter
      const { transaction, stakeAccountPubkey } = await createStakeTransaction(
        publicKey,
        amount,
        connection
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
      
      // Simulate the transaction first to catch any errors
      try {
        const simulation = await connection.simulateTransaction(signedTx);
        if (simulation.value.err) {
          console.error("Transaction simulation error:", simulation.value.err);
          throw new Error(`Simulation error: ${JSON.stringify(simulation.value.err)}`);
        }
        console.log("Transaction simulation successful:", simulation);
      } catch (simError) {
        console.error("Error simulating transaction:", simError);
        // Continue anyway since some wallets might not support simulation
      }
      
      // Send the transaction
      console.log("Sending transaction...");
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      console.log("Transaction sent with signature:", signature);
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: transaction.recentBlockhash!,
        lastValidBlockHeight: transaction.lastValidBlockHeight!
      }, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      console.log("Transaction confirmed successfully:", confirmation);
      
      toast({
        title: "Staking successful",
        description: `You have successfully staked ${amount} SOL`
      });
      
      // Refetch stake accounts
      refetchStakeAccounts();
      
      // Close modal
      onClose();
    } catch (error: any) {
      console.error('Error staking SOL:', error);
      
      // Extract more detailed error information
      let errorMessage = error.message || "There was an error processing your stake";
      
      // Check for SendTransactionError with logs
      if (error.logs) {
        console.error('Transaction logs:', error.logs);
        errorMessage = `${errorMessage}\n\nLogs: ${error.logs.slice(0, 2).join('\n')}`;
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
    if (!publicKey || !signTransaction || !connection || !selectedStakeAccount) {
      toast({
        title: "Error",
        description: "Missing required information to unstake",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Create unstake transaction - Pass connection as parameter
      const transaction = await createUnstakeTransaction(
        publicKey,
        new PublicKey(selectedStakeAccount),
        connection
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
        preflightCommitment: 'confirmed'
      });
      console.log("Transaction sent with signature:", signature);
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: transaction.recentBlockhash!,
        lastValidBlockHeight: transaction.lastValidBlockHeight!
      }, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      console.log("Transaction confirmed successfully:", confirmation);
      
      toast({
        title: "Unstaking initiated",
        description: "Your SOL will be available for withdrawal after the cooldown period"
      });
      
      // Refetch stake accounts
      refetchStakeAccounts();
      
      // Close modal
      onClose();
    } catch (error: any) {
      console.error('Error unstaking SOL:', error);
      
      // Extract more detailed error information
      let errorMessage = error.message || "There was an error processing your unstake request";
      
      // Check for SendTransactionError with logs
      if (error.logs) {
        console.error('Transaction logs:', error.logs);
        errorMessage = `${errorMessage}\n\nLogs: ${error.logs.slice(0, 2).join('\n')}`;
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
  
  // Handle withdraw action
  const handleWithdraw = async () => {
    if (!publicKey || !signTransaction || !connection || !selectedStakeAccount) {
      toast({
        title: "Error",
        description: "Missing required information to withdraw",
        variant: "destructive"
      });
      return;
    }
    
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive"
      });
      return;
    }
    
    if (withdrawableAmount && amount > withdrawableAmount) {
      toast({
        title: "Invalid amount",
        description: `Maximum withdrawable amount is ${withdrawableAmount} SOL`,
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Create withdraw transaction - Pass connection as parameter
      const transaction = await createWithdrawTransaction(
        publicKey,
        new PublicKey(selectedStakeAccount),
        publicKey, // Withdraw to the same wallet
        Math.floor(amount * LAMPORTS_PER_SOL), // Convert SOL to lamports
        connection
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
        preflightCommitment: 'confirmed'
      });
      console.log("Transaction sent with signature:", signature);
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: transaction.recentBlockhash!,
        lastValidBlockHeight: transaction.lastValidBlockHeight!
      }, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      console.log("Transaction confirmed successfully:", confirmation);
      
      toast({
        title: "Withdrawal successful",
        description: `You have successfully withdrawn ${amount} SOL`
      });
      
      // Refetch stake accounts and withdrawable amount
      refetchStakeAccounts();
      refetchWithdrawable();
      
      // Close modal
      onClose();
    } catch (error: any) {
      console.error('Error withdrawing SOL:', error);
      
      // Extract more detailed error information
      let errorMessage = error.message || "There was an error processing your withdrawal";
      
      // Check for SendTransactionError with logs
      if (error.logs) {
        console.error('Transaction logs:', error.logs);
        errorMessage = `${errorMessage}\n\nLogs: ${error.logs.slice(0, 2).join('\n')}`;
      }
      
      toast({
        title: "Withdrawal failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Format stake account for display
  const formatStakeAccount = (account: any) => {
    if (!account) return "Unknown";
    
    const pubkey = account.pubkey;
    const shortPubkey = `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
    
    let stakeAmount = 0;
    let status = "Unknown";
    
    if (account.account && account.account.data && account.account.data.parsed) {
      const parsedData = account.account.data.parsed;
      if (parsedData.info && parsedData.info.stake && parsedData.info.stake.delegation) {
        stakeAmount = parsedData.info.stake.delegation.stake / LAMPORTS_PER_SOL;
        
        if (parsedData.info.stake.delegation.activationEpoch) {
          status = "Active";
        }
      }
    }
    
    return `${shortPubkey} (${stakeAmount.toFixed(2)} SOL)`;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>SOL Staking</DialogTitle>
          <DialogDescription>
            Stake your SOL with Helius validator to earn rewards
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stake">Stake</TabsTrigger>
            <TabsTrigger value="unstake">Unstake</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
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
                <span>{balance?.toFixed(2) || "0.00"} SOL</span>
              </div>
              
              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="font-medium">Staking Information:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2 text-muted-foreground">
                  <li>Earn ~6-7% APY on your staked SOL</li>
                  <li>Staked SOL requires a cooldown period to unstake</li>
                  <li>A small amount of SOL is required for account rent</li>
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
              {isLoadingStakeAccounts ? (
                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : stakeAccounts.length === 0 ? (
                <div className="text-center py-4">
                  <p>No stake accounts found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Stake some SOL first to see your accounts here
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="stake-account">Select Stake Account</Label>
                    <select
                      id="stake-account"
                      className="w-full p-2 border rounded-md"
                      value={selectedStakeAccount}
                      onChange={(e) => setSelectedStakeAccount(e.target.value)}
                      disabled={isProcessing}
                    >
                      {stakeAccounts.map((account: any, index: number) => (
                        <option key={index} value={account.pubkey}>
                          {formatStakeAccount(account)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="bg-muted p-3 rounded-md text-sm">
                    <p className="font-medium">Unstaking Information:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-2 text-muted-foreground">
                      <li>Unstaking initiates a cooldown period</li>
                      <li>SOL will be available for withdrawal after the current epoch ends</li>
                      <li>An epoch typically lasts about 2-3 days</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button 
                onClick={handleUnstake} 
                disabled={isProcessing || stakeAccounts.length === 0 || !selectedStakeAccount}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Unstake SOL"
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
          
          <TabsContent value="withdraw">
            <div className="space-y-4 py-4">
              {isLoadingStakeAccounts ? (
                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : stakeAccounts.length === 0 ? (
                <div className="text-center py-4">
                  <p>No stake accounts found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Stake some SOL first to see your accounts here
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-account">Select Stake Account</Label>
                    <select
                      id="withdraw-account"
                      className="w-full p-2 border rounded-md"
                      value={selectedStakeAccount}
                      onChange={(e) => {
                        setSelectedStakeAccount(e.target.value);
                        refetchWithdrawable();
                      }}
                      disabled={isProcessing}
                    >
                      {stakeAccounts.map((account: any, index: number) => (
                        <option key={index} value={account.pubkey}>
                          {formatStakeAccount(account)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="withdraw-amount">Withdraw Amount (SOL)</Label>
                      {isLoadingWithdrawable ? (
                        <span className="text-sm text-muted-foreground">Loading...</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Max: {withdrawableAmount?.toFixed(4) || "0.00"} SOL
                        </span>
                      )}
                    </div>
                    <Input
                      id="withdraw-amount"
                      type="text"
                      value={withdrawAmount}
                      onChange={handleWithdrawAmountChange}
                      disabled={isProcessing || isLoadingWithdrawable}
                    />
                  </div>
                  
                  <div className="bg-muted p-3 rounded-md text-sm">
                    <p className="font-medium">Withdrawal Information:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-2 text-muted-foreground">
                      <li>You can only withdraw after the cooldown period has ended</li>
                      <li>Withdrawing the full amount will close the stake account</li>
                      <li>Partial withdrawals will keep the stake account active</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button 
                onClick={handleWithdraw} 
                disabled={
                  isProcessing || 
                  stakeAccounts.length === 0 || 
                  !selectedStakeAccount ||
                  isLoadingWithdrawable ||
                  !withdrawableAmount ||
                  withdrawableAmount <= 0
                }
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Withdraw SOL"
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};