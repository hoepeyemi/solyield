import { Header } from "@/components/layout/header";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { YieldOpportunities } from "@/components/dashboard/yield-opportunities";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { PortfolioOverview } from "@/components/dashboard/portfolio-overview";

export default function Dashboard() {
  return (
    <div>
      <Header 
        title="Yield Optimizer Dashboard" 
        subtitle="Instantly find the best DeFi yields on Solana" 
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SummaryCards />
        
        <YieldOpportunities />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <QuickActions />
          </div>
          
          <div className="lg:col-span-2">
            <PortfolioOverview />
          </div>
        </div>
      </div>
    </div>
  );
}
