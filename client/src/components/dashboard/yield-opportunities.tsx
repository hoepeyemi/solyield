import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvestmentModal } from "@/components/modals/investment-modal";
import { StakingModal } from "@/components/modals/StakingModal";
import { YieldOpportunity } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { fetchProtocolTVL, fetchRaydiumInfo } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";

export const YieldOpportunities = () => {
  const [protocol, setProtocol] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("apy");
  const [selectedOpportunity, setSelectedOpportunity] = useState<YieldOpportunity | null>(null);
  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false);
  const [isStakingModalOpen, setIsStakingModalOpen] = useState(false);
  const [marinadeTVL, setMarinadeTVL] = useState<number | null>(null);
  const [raydiumTVL, setRaydiumTVL] = useState<number | null>(null);
  const [raydiumVolume24h, setRaydiumVolume24h] = useState<number | null>(null);
  const [isLoadingTVL, setIsLoadingTVL] = useState(false);

  // Fetch protocol TVLs
  useEffect(() => {
    const fetchTVLData = async () => {
      setIsLoadingTVL(true);
      try {
        // Fetch Marinade TVL from DefiLlama
        const marinadeTvl = await fetchProtocolTVL('marinade');
        setMarinadeTVL(marinadeTvl);
        
        // Fetch Raydium info including TVL
        const raydiumInfo = await fetchRaydiumInfo();
        setRaydiumTVL(raydiumInfo.tvl);
        setRaydiumVolume24h(raydiumInfo.volume24h);
      } catch (error) {
        console.error("Error fetching TVL data:", error);
      } finally {
        setIsLoadingTVL(false);
      }
    };

    fetchTVLData();
  }, []);

  const { data: opportunities = [], isLoading } = useQuery<YieldOpportunity[]>({
    queryKey: ['/api/yields', protocol, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (protocol !== "all") {
        params.append("protocol", protocol);
      }
      params.append("sortBy", sortBy);
      
      const response = await apiRequest('GET', `/api/yields?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch yield opportunities');
      }
      return response.json();
    }
  });

  const handleInvest = (opportunity: YieldOpportunity) => {
    // Check if this is a SOL staking opportunity (Helius or Marinade)
    if ((opportunity.protocol === "Helius" || opportunity.protocol === "Marinade") && 
        opportunity.tokenPair.includes("SOL") && 
        (opportunity.tokenPair.length === 1 || opportunity.name.toLowerCase().includes("staking"))) {
      setIsStakingModalOpen(true);
    } else {
    setSelectedOpportunity(opportunity);
    setIsInvestModalOpen(true);
    }
  };

  const renderProtocolLogo = (protocol: string) => {
    const colors: Record<string, string> = {
      "Raydium": "bg-gradient-to-r from-pink-500 to-purple-500",
      "Marinade": "bg-orange-500",
      "Helius": "bg-green-500",
    };
    
    return (
      <div className={`h-6 w-6 rounded-full ${colors[protocol] || 'bg-gray-500'} mr-2`}></div>
    );
  };

  const renderTokenPair = (opportunity: YieldOpportunity) => {
    const getTokenAbbr = (token: string) => {
      const abbrs: Record<string, string> = {
        "SOL": "S",
        "USDC": "U",
        "USDT": "T",
        "BTC": "B",
        "ETH": "E",
        "mSOL": "M",
        "RAY": "R",
        "MNDE": "M",
      };
      return abbrs[token] || token[0];
    };

    if (!opportunity.tokenPair || opportunity.tokenPair.length <= 0) {
      return (
        <div className="h-8 w-8 rounded-full bg-gray-500 flex items-center justify-center">
          <span className="text-xs font-bold">?</span>
        </div>
      );
    }
    
    if (opportunity.tokenPair.length === 1) {
      return (
        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
          <span className="text-xs font-bold">{opportunity.tokenPair[0]}</span>
        </div>
      );
    }
    
    // For token pairs
    return (
      <div className="flex-shrink-0 h-8 w-8 relative">
        <div className="h-6 w-6 rounded-full bg-blue-500 absolute top-0 left-0 flex items-center justify-center text-xs font-bold">
          {getTokenAbbr(opportunity.tokenPair[0])}
        </div>
        <div className="h-6 w-6 rounded-full bg-orange-500 absolute bottom-0 right-0 flex items-center justify-center text-xs font-bold">
          {getTokenAbbr(opportunity.tokenPair[1])}
        </div>
      </div>
    );
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

  const getActionButtonText = (opportunity: YieldOpportunity) => {
    // For SOL staking opportunities
    if ((opportunity.protocol === "Helius" || opportunity.protocol === "Marinade") && 
        opportunity.tokenPair.includes("SOL") && 
        (opportunity.tokenPair.length === 1 || opportunity.name.toLowerCase().includes("staking"))) {
      return "Stake";
    }
    return "Invest";
  };

  // Format TVL to display in billions/millions with 2 decimal places
  const formatTVL = (tvl: number | null): string => {
    if (tvl === null) return "Loading...";
    
    if (tvl >= 1_000_000_000) {
      return `$${(tvl / 1_000_000_000).toFixed(2)}B`;
    } else if (tvl >= 1_000_000) {
      return `$${(tvl / 1_000_000).toFixed(2)}M`;
    } else {
      return `$${tvl.toLocaleString()}`;
    }
  };

  // Get the actual TVL for protocols
  const getProtocolTVL = (protocol: string, defaultTVL: number): string => {
    if (protocol === "Marinade" && marinadeTVL !== null) {
      return formatTVL(marinadeTVL);
    } else if (protocol === "Raydium" && raydiumTVL !== null) {
      return formatTVL(raydiumTVL);
    } else if (protocol === "Helius") {
      return "$0";
    }
    return `$${Number(defaultTVL).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
  };

  return (
    <>
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">Top Yield Opportunities</h2>
              <p className="text-sm text-muted-foreground">Curated opportunities across Marinade, Helius, and Raydium</p>
              <div className="mt-2 flex flex-col space-y-1">
                {marinadeTVL !== null && (
                  <div className="text-xs text-primary flex items-center">
                    <span>Marinade TVL: {formatTVL(marinadeTVL)}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <InfoIcon className="h-3 w-3 ml-1 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Live TVL data from DefiLlama</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
                {raydiumTVL !== null && (
                  <div className="text-xs text-primary flex items-center">
                    <span>Raydium TVL: {formatTVL(raydiumTVL)}</span>
                    {raydiumVolume24h !== null && (
                      <span className="ml-2">24h Volume: {formatTVL(raydiumVolume24h)}</span>
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <InfoIcon className="h-3 w-3 ml-1 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Live data from Raydium API</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
                <div className="text-xs text-primary flex items-center">
                  <span>Helius TVL: $0</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="h-3 w-3 ml-1 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>New protocol with no TVL yet</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
            <div className="flex space-x-3 mt-3 sm:mt-0">
              <Select value={protocol} onValueChange={setProtocol}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Protocols" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Protocols</SelectItem>
                  <SelectItem value="Raydium">Raydium</SelectItem>
                  <SelectItem value="Marinade">Marinade</SelectItem>
                  <SelectItem value="Helius">Helius</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by APY" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apy">Sort by APY</SelectItem>
                  <SelectItem value="risk">Sort by Risk</SelectItem>
                  <SelectItem value="tvl">Sort by TVL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Opportunities List */}
          <div className="overflow-x-auto custom-scrollbar">
            {isLoading ? (
              <div className="py-8 text-center">Loading yield opportunities...</div>
            ) : opportunities.length === 0 ? (
              <div className="py-8 text-center">No yield opportunities available at the moment.</div>
            ) : (
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-background">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Pool / Strategy</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Protocol</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">APY</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Level</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">TVL</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {opportunities.map((opportunity: YieldOpportunity) => (
                    <tr key={opportunity.id} className="hover:bg-background cursor-pointer">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {renderTokenPair(opportunity)}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-card-foreground">{opportunity.name}</div>
                            <div className="text-xs text-muted-foreground">{opportunity.assetType}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {renderProtocolLogo(opportunity.protocol)}
                          <div className="text-sm text-card-foreground">{opportunity.protocol}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-primary">{Number(opportunity.apy).toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">{Number(opportunity.baseApy).toFixed(1)}% + {Number(opportunity.rewardApy).toFixed(1)}% rewards</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRiskBadgeColor(opportunity.riskLevel)}`}>
                          {opportunity.riskLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                        {getProtocolTVL(opportunity.protocol, opportunity.tvl)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button 
                          variant="default" 
                          size="xs"
                          onClick={() => handleInvest(opportunity)}
                        >
                          {getActionButtonText(opportunity)}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedOpportunity && (
        <InvestmentModal
          isOpen={isInvestModalOpen}
          onClose={() => setIsInvestModalOpen(false)}
          opportunity={selectedOpportunity}
        />
      )}
      
      <StakingModal
        isOpen={isStakingModalOpen}
        onClose={() => setIsStakingModalOpen(false)}
      />
    </>
  );
};
