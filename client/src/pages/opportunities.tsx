import { Header } from "@/components/layout/header";
import { YieldOpportunities } from "@/components/dashboard/yield-opportunities";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export default function Opportunities() {
  const { data: stats } = useQuery({
    queryKey: ['/api/yields/stats'],
  });

  return (
    <div>
      <Header 
        title="Yield Opportunities" 
        subtitle="Explore and compare the best yields across Solana" 
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Average APY</h3>
              <p className="text-2xl font-semibold">{stats?.avgApy || '0.00'}%</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Protocols Analyzed</h3>
              <p className="text-2xl font-semibold">{stats?.protocolCount || '0'}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Opportunities</h3>
              <p className="text-2xl font-semibold">{stats?.opportunityCount || '0'}</p>
            </CardContent>
          </Card>
        </div>
        
        <YieldOpportunities />
      </div>
    </div>
  );
}
