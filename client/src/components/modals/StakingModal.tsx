import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSolanaWallet } from "@/contexts/SolanaWalletContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  createStakeTransaction, 
  createUnstakeTransaction, 
  createWithdrawTransaction, 
  getWithdrawableAmount, 
  getHeliusStakeAccounts 
} from "@/lib/heliusStaking";

interface StakingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StakingModal = ({ isOpen, onClose }: StakingModalProps) => {
  const [activeTab, setActiveTab] = useState<string>("stake");
  const [stakeAmount, setStakeAmount] = useState<string>("1.0");
  const [selectedStakeAccount, setSelectedStakeAccount] = useState<any>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("0.0");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [recentStakeAccounts, setRecentStakeAccounts] = useState<any[]>([]);

  const { publicKey, signTransaction, connection, balance } = useSolanaWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Helius stake accounts
  const { data: stakeAccounts = [], isLoading: isLoadingStakeAccounts, refetch: refetchStakeAccounts } = useQuery({
    queryKey: ['heliusStakeAccounts', publicKey?.toString()],
    queryFn: async () => {
      if (!publicKey) return [];
      const accounts = await getHeliusStakeAccounts(publicKey);
      // Combine newly created accounts (not yet on-chain) with fetched accounts
      const newAccounts = recentStakeAccounts.filter(r => !accounts.find(a => a.pubkey === r.pubkey));
      return [...accounts, ...newAccounts];
    },
    enabled: !!publicKey && isOpen,
  });

  // Query for withdrawable amount
  const { data: withdrawableAmount, isLoading: isLoadingWithdrawable, refetch: refetchWithdrawable } = useQuery({
    queryKey: ['withdrawableAmount', selectedStakeAccount?.pubkey],
    queryFn: async () => {
      if (!selectedStakeAccount) return 0;
      return await getWithdrawableAmount(new PublicKey(selectedStakeAccount.pubkey));
    },
    enabled: !!selectedStakeAccount && (activeTab === "unstake" || activeTab === "withdraw")
  });

  useEffect(() => {
    if (stakeAccounts.length > 0 && !selectedStakeAccount) {
        setSelectedStakeAccount(stakeAccounts[0]);
    }
  }, [stakeAccounts, selectedStakeAccount]);

  useEffect(() => {
    if (withdrawableAmount !== undefined) {
      setWithdrawAmount((withdrawableAmount / LAMPORTS_PER_SOL).toFixed(9));
    }
  }, [withdrawableAmount]);

  // Handle stake amount change
  const handleStakeAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\\d*\\.?\\d*$/.test(value)) {
      setStakeAmount(value);
    }
  };
  
  // Handle withdraw amount change
  const handleWithdrawAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\\d*\\.?\\d*$/.test(value)) {
      setWithdrawAmount(value);
    }
  };

  const handleStake = async () => {
    if (!publicKey || !signTransaction || !connection) {
      toast({ title: "Wallet not connected", variant: "destructive" });
      return;
    }
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    if (amount > (balance || 0)) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const { transaction: tx, stakeAccountPubkey } = await createStakeTransaction(publicKey, amount);
      
      setRecentStakeAccounts(prev => [...prev, {
        pubkey: stakeAccountPubkey.toBase58(),
        account: { data: { parsed: { info: { stake: { delegation: { stake: amount * LAMPORTS_PER_SOL } } } } } }
      }]);

      const signedTx = await signTransaction(tx);
      const txId = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(txId);

      toast({ title: "Staking successful", description: `Staked ${amount} SOL.` });
      refetchStakeAccounts();
      onClose();
    } catch (error: any) {
      console.error("Staking error:", error);
      toast({ title: "Staking failed", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnstake = async () => {
    if (!publicKey || !signTransaction || !connection || !selectedStakeAccount) {
      toast({ title: "No stake account selected", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const tx = await createUnstakeTransaction(publicKey, new PublicKey(selectedStakeAccount.pubkey));
      
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      
      const signedTx = await signTransaction(tx);
      const txId = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(txId);

      toast({ title: "Unstake initiated", description: "Cooldown period has started." });
      refetchStakeAccounts();
      onClose();
    } catch (error: any) {
      console.error("Unstaking error:", error);
      toast({ title: "Unstaking failed", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!publicKey || !signTransaction || !connection || !selectedStakeAccount) {
      toast({ title: "No stake account selected", variant: "destructive" });
      return;
    }
    const amountLamports = parseFloat(withdrawAmount) * LAMPORTS_PER_SOL;
    if (isNaN(amountLamports) || amountLamports <= 0) {
      toast({ title: "Invalid withdrawal amount", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const tx = await createWithdrawTransaction(publicKey, new PublicKey(selectedStakeAccount.pubkey), publicKey, amountLamports);

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signedTx = await signTransaction(tx);
      const txId = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(txId);

      toast({ title: "Withdrawal successful" });
      refetchStakeAccounts();
      onClose();
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      toast({ title: "Withdrawal failed", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const formatStakeAccount = (account: any) => {
    if (!account || !account.pubkey) return "Unknown Account";
    const pubkey = account.pubkey.toBase58 ? account.pubkey.toBase58() : account.pubkey;
    const shortPubkey = `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
    const lamports = account.account?.data?.parsed?.info?.stake?.delegation?.stake || 0;
    return `${shortPubkey} (${(lamports / LAMPORTS_PER_SOL).toFixed(4)} SOL)`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Helius Staking</DialogTitle>
          <DialogDescription>
            Stake your SOL with Helius to earn rewards.
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
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Your Balance:</span>
                  <span>{balance?.toFixed(2) || "0.00"} SOL</span>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancel</Button>
              <Button onClick={handleStake} disabled={isProcessing}>
                {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : "Stake SOL"}
              </Button>
            </DialogFooter>
          </TabsContent>
          
          <TabsContent value="unstake">
             <div className="space-y-4 py-4">
              {isLoadingStakeAccounts ? (
                <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : stakeAccounts.length === 0 ? (
                <div className="text-center py-4"><p>No stake accounts found.</p></div>
              ) : (
                <RadioGroup onValueChange={(value) => setSelectedStakeAccount(JSON.parse(value))}>
                  <Label>Select account to unstake:</Label>
                  <div className="space-y-2 mt-2">
                  {stakeAccounts.map((account, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 border rounded-md">
                      <RadioGroupItem value={JSON.stringify(account)} id={account.pubkey} />
                      <Label htmlFor={account.pubkey} className="w-full">{formatStakeAccount(account)}</Label>
                    </div>
                  ))}
                  </div>
                </RadioGroup>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancel</Button>
              <Button onClick={handleUnstake} disabled={isProcessing || !selectedStakeAccount}>
                {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : "Unstake SOL"}
              </Button>
            </DialogFooter>
          </TabsContent>
          
          <TabsContent value="withdraw">
            <div className="space-y-4 py-4">
               {isLoadingStakeAccounts ? (
                <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : stakeAccounts.length === 0 ? (
                <div className="text-center py-4"><p>No stake accounts found.</p></div>
              ) : (
                <>
                  <RadioGroup onValueChange={(value) => setSelectedStakeAccount(JSON.parse(value))}>
                    <Label>Select account to withdraw from:</Label>
                    <div className="space-y-2 mt-2">
                    {stakeAccounts.map((account, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 border rounded-md">
                        <RadioGroupItem value={JSON.stringify(account)} id={`withdraw-${account.pubkey}`} />
                        <Label htmlFor={`withdraw-${account.pubkey}`} className="w-full">{formatStakeAccount(account)}</Label>
                      </div>
                    ))}
                    </div>
                  </RadioGroup>
                  {selectedStakeAccount && (
                     <div className="space-y-2 mt-4">
                      <Label htmlFor="withdraw-amount">Withdrawable Amount (SOL)</Label>
                      <Input
                        id="withdraw-amount"
                        type="text"
                        value={withdrawAmount}
                        onChange={handleWithdrawAmountChange}
                        disabled={isProcessing || isLoadingWithdrawable}
                      />
                       {isLoadingWithdrawable && <p className="text-sm text-muted-foreground">Fetching withdrawable amount...</p>}
                    </div>
                  )}
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancel</Button>
              <Button onClick={handleWithdraw} disabled={isProcessing || !selectedStakeAccount || !withdrawableAmount || withdrawableAmount <= 0}>
                {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : "Withdraw SOL"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};