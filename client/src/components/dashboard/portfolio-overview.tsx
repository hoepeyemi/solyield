import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { UserPortfolio, PortfolioData } from "@shared/schema";

export const PortfolioOverview = () => {
  const [timeRange, setTimeRange] = useState("1M");
  
  const { data: portfolioData, isLoading: isPortfolioLoading, refetch } = useQuery<PortfolioData>({
    queryKey: ['/api/portfolio', timeRange],
  });

  const renderProtocolIcon = (protocol: string | undefined) => {
    if (!protocol) return null;
    
    const colors: Record<string, string> = {
      "Raydium": "bg-gradient-to-r from-pink-500 to-purple-500",
      "Marinade": "bg-orange-500",
      "Orca": "bg-blue-600",
      "Solend": "bg-purple-600",
    };
    
    return (
      <div className={`w-8 h-8 rounded-full ${colors[protocol] || 'bg-gray-500'} flex items-center justify-center`}>
        <span className="text-xs font-bold text-white">{protocol.charAt(0)}</span>
      </div>
    );
  };

  const formatDate = (dateString: string | Date) => {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    return `Deposited ${diffDays} days ago`;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-card-foreground">Your Portfolio</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary hover:text-primary-foreground"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
        
        {/* Portfolio Chart */}
        <div className="bg-background rounded-lg p-4 border border-border mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-card-foreground">Total Value</h3>
              <div className="text-2xl font-semibold text-card-foreground mt-1">
                {isPortfolioLoading ? "$..." : `$${portfolioData?.totalValue?.toLocaleString() || "0.00"}`}
              </div>
            </div>
            <div className="flex space-x-2">
              {["1D", "1W", "1M", "1Y", "All"].map(range => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "outline"}
                  size="xs"
                  onClick={() => setTimeRange(range)}
                  className={timeRange !== range ? "bg-card border-border text-muted-foreground hover:bg-background" : ""}
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Chart Area */}
          <div className="w-full h-40 relative">
            <div className="absolute inset-0 flex items-end">
              <div className="w-full h-full flex items-end">
                {portfolioData?.chartData?.map((value: number, index: number) => (
                  <div 
                    key={index}
                    style={{ height: `${value}%` }} 
                    className={`flex-1 mx-0.5 bg-muted ${index === portfolioData.chartData.length - 1 ? 'bg-primary/50' : ''}`}
                  ></div>
                )) || (
                  <>
                    <div style={{ height: "30%" }} className="flex-1 mx-0.5 bg-muted"></div>
                    <div style={{ height: "40%" }} className="flex-1 mx-0.5 bg-muted"></div>
                    <div style={{ height: "35%" }} className="flex-1 mx-0.5 bg-muted"></div>
                    <div style={{ height: "60%" }} className="flex-1 mx-0.5 bg-muted"></div>
                    <div style={{ height: "50%" }} className="flex-1 mx-0.5 bg-muted"></div>
                    <div style={{ height: "70%" }} className="flex-1 mx-0.5 bg-muted"></div>
                    <div style={{ height: "65%" }} className="flex-1 mx-0.5 bg-muted"></div>
                    <div style={{ height: "90%" }} className="flex-1 mx-0.5 bg-muted"></div>
                    <div style={{ height: "80%" }} className="flex-1 mx-0.5 bg-muted"></div>
                    <div style={{ height: "100%" }} className="flex-1 mx-0.5 bg-primary/50"></div>
                  </>
                )}
              </div>
            </div>
            <div className="absolute inset-0">
              <div className="w-full h-full bg-gradient-to-t from-primary/20 to-transparent"></div>
              <div className="absolute bottom-0 w-full h-px bg-primary"></div>
            </div>
            {portfolioData?.changePercentage && (
              <div className={`absolute top-0 right-0 px-2 py-1 ${portfolioData.changePercentage > 0 ? 'bg-primary' : 'bg-red-500'} rounded-lg text-xs text-white`}>
                {portfolioData.changePercentage > 0 ? '+' : ''}{portfolioData.changePercentage}%
              </div>
            )}
          </div>
        </div>
        
        {/* Current Positions */}
        <h3 className="text-sm font-medium text-card-foreground mb-2">Current Positions</h3>
        <div className="space-y-3">
          {isPortfolioLoading ? (
            <div className="text-center py-4 text-sm text-muted-foreground">Loading positions...</div>
          ) : !portfolioData?.positions || portfolioData.positions.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">No active positions found.</div>
          ) : (
            portfolioData.positions.map((position: UserPortfolio) => (
              <div key={position.id} className="p-3 bg-background rounded-lg border border-border">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    {position.protocol && renderProtocolIcon(position.protocol)}
                    <div className="ml-3">
                      <div className="text-sm font-medium text-card-foreground">{position.name || `Position ${position.id}`}</div>
                      <div className="text-xs text-muted-foreground">{position.protocol || "Unknown Protocol"}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-card-foreground">${position.amount.toLocaleString()}</div>
                    <div className="text-xs text-primary">+{position.apy || 0}% APY</div>
                  </div>
                </div>
                <div className="mt-3 flex justify-between">
                  <div className="text-xs text-muted-foreground">{formatDate(position.depositDate)}</div>
                  <Button variant="link" size="sm" className="text-primary p-0 h-auto">Manage</Button>
                </div>
              </div>
            ))
          )}
          
          {/* Add New Position */}
          <Button 
            variant="outline" 
            className="w-full p-3 border border-dashed border-muted hover:border-muted-foreground hover:text-card-foreground justify-center text-sm text-muted-foreground"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add New Position
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
