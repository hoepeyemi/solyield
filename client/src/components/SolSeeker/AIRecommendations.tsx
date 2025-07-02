import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Zap, AlertCircle, BarChart3, Lock } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useSolanaWallet } from '@/contexts/SolanaWalletContext';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionModal } from '@/components/modals/subscription-modal';

interface YieldRecommendation {
  opportunityId: number;
  name: string;
  protocol: string;
  apy: number;
  riskLevel: string;
  confidence: number;
  reasoning: string;
}

interface PortfolioAnalysis {
  currentValue: number;
  projectedAnnualYield: number;
  riskAssessment: string;
  diversificationScore: number;
  recommendations: YieldRecommendation[];
}

export function AIRecommendations() {
  const [autoInvestAmount, setAutoInvestAmount] = useState<number>(10);
  const [isInvesting, setIsInvesting] = useState<boolean>(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(false);
  const { connected, isSubscribed } = useSolanaWallet();
  const { toast } = useToast();

  // Query for AI recommendations
  const { data: recommendations, isLoading: isLoadingRecommendations, refetch: refetchRecommendations, error: recommendationsError } = useQuery<YieldRecommendation[]>({
    queryKey: ['/api/ai/recommendations'],
    enabled: connected && isSubscribed,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for portfolio analysis
  const { data: analysis, isLoading: isLoadingAnalysis, error: analysisError } = useQuery<PortfolioAnalysis>({
    queryKey: ['/api/ai/portfolio/analysis'],
    enabled: connected && isSubscribed,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for best opportunity
  const { data: bestOpportunity, error: bestOpportunityError } = useQuery<YieldRecommendation>({
    queryKey: ['/api/ai/best-opportunity'],
    enabled: connected && isSubscribed,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Check if any API calls returned subscription required error
  const subscriptionRequired = 
    (recommendationsError as any)?.requiresSubscription || 
    (analysisError as any)?.requiresSubscription || 
    (bestOpportunityError as any)?.requiresSubscription;

  const handleAutoInvest = async () => {
    if (!connected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to use auto-invest",
        variant: "destructive"
      });
      return;
    }

    if (!isSubscribed) {
      setIsSubscriptionModalOpen(true);
      return;
    }

    setIsInvesting(true);
    
    try {
      const response = await apiRequest('POST', '/api/ai/auto-invest', { amount: autoInvestAmount });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Auto-Investment Successful",
          description: `Successfully invested ${autoInvestAmount} SOL based on AI recommendations`,
          variant: "default"
        });
        
        // Refetch recommendations after successful investment
        refetchRecommendations();
      } else {
        const errorData = await response.json();
        if (errorData.requiresSubscription) {
          setIsSubscriptionModalOpen(true);
        } else {
          throw new Error(errorData.error || 'Failed to auto-invest');
        }
      }
    } catch (error: any) {
      toast({
        title: "Auto-Investment Failed",
        description: error.message || "An error occurred during auto-investment",
        variant: "destructive"
      });
    } finally {
      setIsInvesting(false);
    }
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 60) return 'text-blue-500';
    if (confidence >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Render subscription required message
  if (connected && !isSubscribed) {
    return (
      <>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-center">Premium Feature</h3>
              <p className="text-sm text-muted-foreground text-center mt-2 max-w-md">
                AI-powered yield recommendations are available exclusively to subscribers.
                Subscribe now to unlock personalized recommendations and auto-invest features.
              </p>
              <Button 
                onClick={() => setIsSubscriptionModalOpen(true)} 
                className="mt-4"
                variant="default"
              >
                Subscribe Now
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <SubscriptionModal 
          isOpen={isSubscriptionModalOpen} 
          onClose={() => setIsSubscriptionModalOpen(false)} 
        />
      </>
    );
  }

  if (!connected) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-center">Connect your wallet</h3>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Connect your wallet to see AI-powered yield recommendations
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Portfolio Analysis */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-primary" />
              <CardTitle className="text-lg">AI Portfolio Analysis</CardTitle>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              AI Powered
            </Badge>
          </div>
          <CardDescription>
            Smart insights about your current portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAnalysis ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background p-3 rounded-lg border border-border">
                  <div className="text-sm text-muted-foreground">Current Value</div>
                  <div className="text-xl font-semibold">${analysis.currentValue.toLocaleString()}</div>
                </div>
                <div className="bg-background p-3 rounded-lg border border-border">
                  <div className="text-sm text-muted-foreground">Projected Annual Yield</div>
                  <div className="text-xl font-semibold text-primary">+${analysis.projectedAnnualYield.toLocaleString()}</div>
                </div>
              </div>
              
              <div className="bg-background p-3 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Risk Assessment</div>
                  <Badge variant="outline" className={getRiskBadgeColor(analysis.riskAssessment.split(' ')[0])}>
                    {analysis.riskAssessment.split(' ')[0]}
                  </Badge>
                </div>
                <div className="text-sm mt-1">{analysis.riskAssessment}</div>
              </div>
              
              <div className="bg-background p-3 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground mb-1">Diversification</div>
                <div className="flex items-center">
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded-full">
                      <div 
                        className="h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full" 
                        style={{ width: `${analysis.diversificationScore}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="ml-2 text-sm font-medium">{analysis.diversificationScore}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No portfolio analysis available
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-primary" />
              <CardTitle className="text-lg">Top Yield Recommendations</CardTitle>
            </div>
          </div>
          <CardDescription>
            AI-curated opportunities based on your risk profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRecommendations ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : recommendations && recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div key={`${rec.protocol}-${rec.opportunityId}`} className="bg-background p-3 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{rec.name}</div>
                    <Badge variant="outline" className={getRiskBadgeColor(rec.riskLevel)}>
                      {rec.riskLevel}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-muted-foreground">{rec.protocol}</div>
                    <div className="text-primary font-medium">{rec.apy.toFixed(2)}% APY</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{rec.reasoning}</div>
                  <div className="mt-2 flex items-center">
                    <div className="text-xs">AI Confidence:</div>
                    <div className="flex-1 mx-2">
                      <div className="h-1.5 bg-muted rounded-full">
                        <div 
                          className="h-1.5 bg-primary rounded-full" 
                          style={{ width: `${rec.confidence}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className={`text-xs font-medium ${getConfidenceColor(rec.confidence)}`}>
                      {rec.confidence}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No recommendations available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-Invest Card */}
      {bestOpportunity && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-primary" />
              <CardTitle className="text-lg">Auto-Invest</CardTitle>
            </div>
            <CardDescription>
              Let AI automatically invest in the best opportunity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-background p-3 rounded-lg border border-border mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Best Opportunity</div>
                <Badge variant="outline" className={getRiskBadgeColor(bestOpportunity.riskLevel)}>
                  {bestOpportunity.riskLevel}
                </Badge>
              </div>
              <div className="font-medium">{bestOpportunity.name}</div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-sm text-muted-foreground">{bestOpportunity.protocol}</div>
                <div className="text-primary font-medium">{bestOpportunity.apy.toFixed(2)}% APY</div>
              </div>
              <div className="mt-2 flex items-center">
                <div className="text-xs">AI Confidence:</div>
                <div className="flex-1 mx-2">
                  <div className="h-1.5 bg-muted rounded-full">
                    <div 
                      className="h-1.5 bg-primary rounded-full" 
                      style={{ width: `${bestOpportunity.confidence}%` }}
                    ></div>
                  </div>
                </div>
                <div className={`text-xs font-medium ${getConfidenceColor(bestOpportunity.confidence)}`}>
                  {bestOpportunity.confidence}%
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <div className="flex-1 pr-4">
                <label htmlFor="auto-invest-amount" className="text-sm text-muted-foreground mb-1 block">
                  Amount to invest (SOL)
                </label>
                <div className="relative">
                  <input
                    id="auto-invest-amount"
                    type="number"
                    min="1"
                    step="1"
                    value={autoInvestAmount}
                    onChange={(e) => setAutoInvestAmount(Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
              <Button 
                onClick={handleAutoInvest}
                disabled={isInvesting}
                className="mt-6"
              >
                {isInvesting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Auto-Invest
              </Button>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <p className="text-xs text-muted-foreground">
              AI will automatically invest in the opportunity with the highest confidence score based on your risk profile.
            </p>
          </CardFooter>
        </Card>
      )}

      <SubscriptionModal 
        isOpen={isSubscriptionModalOpen} 
        onClose={() => setIsSubscriptionModalOpen(false)} 
      />
    </div>
  );
} 