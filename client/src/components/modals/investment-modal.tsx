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
import { PublicKey } from '@solana/web3.js';
import { swapSolToRay, getEstimatedRayOutput } from '@/lib/solanaSwap';
import { stakeRayToFarm, addRayUsdcLiquidity, checkUsdcBalanceForLiquidity, getRayBalance, getUsdcBalance } from '@/lib/rayStaking';
import { Checkbox } from "@/components/ui/checkbox";

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: YieldOpportunity;
}

export const InvestmentModal = ({ isOpen, onClose, opportunity }: InvestmentModalProps) => {
  const [amount, setAmount] = useState("100.00");
  const [estimatedRayAmount, setEstimatedRayAmount] = useState<number | null>(null);
  const [autoStake, setAutoStake] = useState<boolean>(true);
  const [usdcInfo, setUsdcInfo] = useState<{ 
    required: number; 
    balance: number; 
    isLoading: boolean;
    hasEnough: boolean;
  }>({
    required: 0,
    balance: 0,
    isLoading: false,
    hasEnough: false
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { publicKey, signTransaction, connection, balance } = useSolanaWallet();
  const [debugMode, setDebugMode] = useState<boolean>(false);

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

  // Get estimated RAY amount when amount changes for SOL/RAY pairs
  useEffect(() => {
    const fetchEstimatedRay = async () => {
      if (isSolRayPair && parseFloat(amount) > 0) {
        try {
          const rayAmount = await getEstimatedRayOutput(parseFloat(amount));
          debugLog('Estimated RAY output', rayAmount);
          setEstimatedRayAmount(rayAmount);
        } catch (error) {
          console.error("Error estimating RAY output:", error);
          debugLog('Error estimating RAY output', error);
          setEstimatedRayAmount(null);
        }
      }
    };

    fetchEstimatedRay();
  }, [amount, isSolRayPair]);

  // Add a useEffect to check USDC balance when amount changes and autoStake is enabled
  useEffect(() => {
    const checkUsdcBalance = async () => {
      if (isSolRayPair && autoStake && estimatedRayAmount && parseFloat(amount) > 0 && publicKey && connection) {
        setUsdcInfo(prev => ({ ...prev, isLoading: true }));
        try {
          debugLog('Checking USDC balance for RAY amount', estimatedRayAmount);
          
          // First check if user has USDC tokens
          const { balance: directUsdcBalance, found: usdcFound } = await getUsdcBalance(
            connection,
            publicKey
          );
          
          if (!usdcFound || directUsdcBalance <= 0) {
            setUsdcInfo({
              required: 0,
              balance: 0,
              isLoading: false,
              hasEnough: false
            });
            return;
          }
          
          // Then check if they have enough for this specific liquidity addition
          const { hasEnoughUsdc, requiredUsdc, usdcBalance } = await checkUsdcBalanceForLiquidity(
            connection,
            publicKey,
            estimatedRayAmount
          );
          
          debugLog('USDC balance check result', { hasEnoughUsdc, requiredUsdc, usdcBalance, directUsdcBalance });
          setUsdcInfo({
            required: requiredUsdc,
            balance: usdcBalance || directUsdcBalance,
            isLoading: false,
            hasEnough: hasEnoughUsdc
          });
        } catch (error) {
          console.error("Error checking USDC balance:", error);
          debugLog('Error checking USDC balance', error);
          setUsdcInfo({
            required: 0,
            balance: 0,
            isLoading: false,
            hasEnough: false
          });
        }
      }
    };
    
    checkUsdcBalance();
  }, [isSolRayPair, autoStake, estimatedRayAmount, amount, publicKey, connection]);

  const debugLog = (message: string, data?: any) => {
    if (debugMode) {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  };

  const investMutation = useMutation({
    mutationFn: async () => {
      const amountValue = parseFloat(amount);
      debugLog('Starting investment process', { amountValue, isSolRayPair });
      
      // If this is a SOL/RAY pair, perform the swap first
      if (isSolRayPair) {
        try {
          if (!publicKey || !signTransaction || !connection) {
            throw new Error('Wallet not connected');
          }
          
          // Show a loading toast
          toast({
            title: "Processing investment",
            description: "Converting SOL to RAY...",
          });
          
          // Perform the swap using the utility function
          debugLog('Converting SOL to RAY', amountValue);
          await swapSolToRay(
            connection,
            publicKey,
            signTransaction,
            amountValue
          );
          
          // After swap is successful, continue with the investment
          toast({
            title: "Conversion successful",
            description: "SOL has been converted to RAY",
          });
          debugLog('SOL to RAY conversion successful');
          
          // If auto-stake is enabled, add liquidity and stake the RAY tokens
          if (autoStake) {
            try {
              // First, verify that the RAY swap was successful and we have RAY tokens
              debugLog('Verifying RAY tokens in wallet');
              
              // Check RAY balance and get the actual amount to use
              const actualRayAmount = await (async () => {
                // Wait a moment for the tokens to be recognized by all systems
                debugLog('Waiting for RAY tokens to settle');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Check RAY balance directly
                const { balance: rayBalance, found: rayFound } = await getRayBalance(
                  connection,
                  publicKey
                );
                
                debugLog('RAY balance check', { rayBalance, rayFound });
                
                if (!rayFound || rayBalance <= 0) {
                  toast({
                    title: "RAY tokens not found",
                    description: "The SOL to RAY conversion may have failed or the tokens aren't available yet.",
                    variant: "destructive"
                  });
                  throw new Error("RAY tokens not found in wallet");
                }
                
                // Return the actual RAY amount with the actual balance
                return Math.min(rayBalance, estimatedRayAmount || amountValue);
              })();
              
              // Check USDC balance first
              debugLog('Checking USDC balance for liquidity', actualRayAmount);
              const { hasEnoughUsdc, requiredUsdc, usdcBalance } = await checkUsdcBalanceForLiquidity(
                connection,
                publicKey,
                actualRayAmount
              );
              
              debugLog('USDC balance check result', { hasEnoughUsdc, requiredUsdc, usdcBalance });
              if (!hasEnoughUsdc) {
                toast({
                  title: "Insufficient USDC balance",
                  description: `You need ${requiredUsdc.toFixed(2)} USDC but only have ${usdcBalance.toFixed(2)} USDC`,
                  variant: "destructive"
                });
                throw new Error(`Insufficient USDC balance. Required: ${requiredUsdc.toFixed(2)} USDC`);
              }
              
              // First, add liquidity to create LP tokens
              toast({
                title: "Adding liquidity",
                description: "Creating LP tokens for RAY-USDC pair...",
              });
              
              // Add liquidity to RAY-USDC pool
              debugLog('Adding liquidity', actualRayAmount);
              const liquidityTxId = await addRayUsdcLiquidity(
                connection,
                publicKey,
                signTransaction,
                actualRayAmount
              );
              
              toast({
                title: "Liquidity added",
                description: "Successfully created LP tokens for RAY-USDC pair",
              });
              
              debugLog('Liquidity transaction completed', liquidityTxId);
              console.log("Liquidity transaction:", liquidityTxId);
              
              // Wait a moment for the liquidity transaction to settle
              debugLog('Waiting for liquidity transaction to settle');
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Now stake the LP tokens
              toast({
                title: "Staking LP tokens",
                description: "Automatically staking your LP tokens...",
              });
              
              debugLog('Staking LP tokens');
              const stakeTxId = await stakeRayToFarm(
                connection,
                publicKey,
                signTransaction
              );
              
              toast({
                title: "Staking successful",
                description: "Your LP tokens have been staked successfully",
              });
              
              debugLog('Staking transaction completed', stakeTxId);
              console.log("Staking transaction:", stakeTxId);
            } catch (stakeError) {
              console.error('Error in liquidity/staking process:', stakeError);
              debugLog('Error in liquidity/staking process', stakeError);
              
              // Check if the error is related to adding liquidity
              const errorMessage = stakeError instanceof Error ? stakeError.message : "Unknown error";
              const isLiquidityError = errorMessage.includes('liquidity') || 
                                      errorMessage.includes('USDC') || 
                                      errorMessage.includes('amounts') ||
                                      errorMessage.includes('RAY token');
              
              if (isLiquidityError) {
                // Offer the option to just hold RAY tokens
                toast({
                  title: "Adding liquidity failed",
                  description: "Would you like to continue holding RAY tokens instead?",
                  action: (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: "RAY tokens kept",
                          description: "Your RAY tokens have been kept in your wallet. You can add liquidity manually later."
                        });
                        
                        // Continue with the investment recording but with RAY tokens only
                        apiRequest('POST', '/api/portfolio/invest', {
                          opportunityId: opportunity.id,
                          amount: amountValue,
                          token: "RAY"
                        }).then(() => {
                          queryClient.invalidateQueries({ queryKey: ['/api/portfolio'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/wallet/info'] });
                          onClose();
                        }).catch(err => {
                          console.error("Error recording RAY investment:", err);
                        });
                      }}
                    >
                      Keep RAY
                    </Button>
                  ),
                  variant: "destructive"
                });
              } else {
                // Generic staking error
                toast({
                  title: "Staking failed",
                  description: errorMessage,
                  variant: "destructive"
                });
              }
              // We continue with the investment even if staking fails
            }
          }
        } catch (error) {
          console.error('Error during SOL to RAY swap:', error);
          debugLog('Error during SOL to RAY swap', error);
          throw new Error('Failed to convert SOL to RAY. Please try again.');
        }
      }
      
      // Proceed with the investment API call
      debugLog('Recording investment in database');
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
                {estimatedRayAmount !== null && (
                  <div className="mt-1 font-medium">
                    Estimated RAY: ~{estimatedRayAmount.toFixed(4)} RAY
                  </div>
                )}
              </div>
              
              {debugMode && (
                <div className="mt-3 p-2 bg-black/20 rounded text-xs font-mono overflow-auto max-h-40">
                  <p className="font-medium mb-1">Debug Information:</p>
                  <div>
                    <p>RAY Estimate: {estimatedRayAmount?.toString() || 'N/A'}</p>
                    <p>USDC Required: {usdcInfo.required.toFixed(6)}</p>
                    <p>USDC Balance: {usdcInfo.balance.toFixed(6)}</p>
                    <p>Has Enough USDC: {usdcInfo.hasEnough ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              )}
              
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="auto-stake" 
                    checked={autoStake} 
                    onCheckedChange={(checked) => setAutoStake(checked === true)}
                  />
                  <Label htmlFor="auto-stake" className="text-xs">
                    Automatically create LP tokens and stake in RAY-USDC farm (higher APY)
                  </Label>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setDebugMode(!debugMode)}
                >
                  {debugMode ? 'Hide Debug' : 'Debug'}
                </Button>
              </div>
              
              {autoStake && (
                <div className="mt-2 text-xs text-muted-foreground bg-secondary/30 p-2 rounded-md">
                  <p className="font-medium mb-1">This process will:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Convert SOL to RAY tokens</li>
                    <li>Create RAY-USDC LP tokens (requires USDC in your wallet)</li>
                    <li>Stake the LP tokens in the Raydium farm</li>
                  </ol>
                  
                  {usdcInfo.isLoading ? (
                    <p className="mt-2">Checking USDC balance...</p>
                  ) : (
                    <div className="mt-2">
                      <p className={`font-medium ${usdcInfo.hasEnough ? 'text-green-500' : 'text-red-500'}`}>
                        USDC Balance: {usdcInfo.balance.toFixed(2)} USDC
                        {usdcInfo.required > 0 && ` (Required: ~${usdcInfo.required.toFixed(2)} USDC)`}
                      </p>
                      {!usdcInfo.hasEnough && usdcInfo.required > 0 && (
                        <p className="text-red-500 mt-1">
                          Insufficient USDC balance. You need to add more USDC to your wallet.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:justify-between sm:space-x-2">
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => setDebugMode(!debugMode)}
            >
              {debugMode ? 'Hide Debug' : 'Debug Mode'}
            </Button>
            {debugMode && (
              <span className="text-xs text-muted-foreground">Debug mode enabled</span>
            )}
          </div>
          <div className="flex space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleInvest} 
            disabled={investMutation.isPending}
          >
            {investMutation.isPending ? "Processing..." : "Confirm Investment"}
          </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
