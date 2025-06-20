import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowUp, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SolanaWalletInfo, PortfolioSummary, YieldOpportunity } from "@shared/schema";

export const SummaryCards = () => {
  const { data: walletData, isLoading: isWalletLoading } = useQuery<SolanaWalletInfo>({
    queryKey: ['/api/wallet/info'],
  });
  
  const { data: bestYieldData, isLoading: isYieldLoading } = useQuery<YieldOpportunity>({
    queryKey: ['/api/yields/best'],
  });
  
  const { data: positionsData, isLoading: isPositionsLoading } = useQuery<PortfolioSummary>({
    queryKey: ['/api/portfolio/summary'],
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Total Value Locked Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">Total Value Locked</h2>
            <Activity className="h-5 w-5 text-chart-2" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-semibold text-card-foreground">
              {isWalletLoading ? "$..." : `$${walletData?.totalValue?.toLocaleString() || "0.00"}`}
            </span>
            {walletData?.valueChange && (
              <span className={`ml-2 text-sm ${walletData.valueChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {walletData.valueChange > 0 ? '+' : ''}{walletData.valueChange}%
              </span>
            )}
          </div>
          <div className="mt-3">
            <div className="w-full bg-background rounded-full h-1.5">
              <div className="bg-gradient-to-r from-chart-1 to-chart-2 h-1.5 rounded-full" style={{ width: "75%" }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Best Yield Found Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">Best Yield Found</h2>
            <TrendingUp className="h-5 w-5 text-chart-1" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-semibold text-card-foreground">
              {isYieldLoading ? "..." : `${bestYieldData?.apy || "0.0"}% APY`}
            </span>
            <span className="ml-2 text-xs text-muted-foreground">
              {isYieldLoading ? "" : `on ${bestYieldData?.protocol || ""}`}
            </span>
          </div>
          <div className="mt-3 flex items-center text-sm">
            <span className="text-muted-foreground">
              {isYieldLoading ? "" : bestYieldData?.tokenPair || ""}
            </span>
            <span className="mx-2 text-gray-600">•</span>
            <span className="text-primary flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {isYieldLoading ? "" : bestYieldData?.lastUpdated || "Updated recently"}
            </span>
          </div>
        </CardContent>
      </Card>
      
      {/* Active Positions Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">Active Positions</h2>
            <ArrowUp className="h-5 w-5 text-chart-2" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-semibold text-card-foreground">
              {isPositionsLoading ? "..." : positionsData?.activePositions || "0"}
            </span>
            <span className="ml-2 text-sm text-primary">
              {isPositionsLoading ? "" : `across ${positionsData?.protocolCount || "0"} protocols`}
            </span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between items-center text-xs">
              {positionsData?.protocols?.map((protocol: string, index: number) => (
                <div key={protocol} className="flex space-x-1">
                  <span className={`w-2 h-2 rounded-full bg-chart-${(index % 5) + 1} mt-1`}></span>
                  <span className="text-muted-foreground">{protocol}</span>
                </div>
              )) || (
                <>
                  <div className="flex space-x-1">
                    <span className="w-2 h-2 rounded-full bg-chart-1 mt-1"></span>
                    <span className="text-muted-foreground">No positions</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
