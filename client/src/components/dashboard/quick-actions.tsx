import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TelegramModal } from "@/components/modals/telegram-modal";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, RefreshCw, Bell } from "lucide-react";

interface RiskProfile {
  level: string;
  percentage: number;
}

export const QuickActions = () => {
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  
  const { data: riskProfile } = useQuery<RiskProfile>({
    queryKey: ['/api/user/risk-profile'],
  });

  const riskLevel = riskProfile?.level || "moderate-conservative";
  const riskPercentage = () => {
    switch(riskLevel) {
      case 'conservative': return "20%";
      case 'moderate-conservative': return "35%";
      case 'moderate': return "50%";
      case 'moderate-aggressive': return "70%";
      case 'aggressive': return "90%";
      default: return "35%";
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold text-card-foreground mb-4">Quick Actions</h2>
        
        {/* Telegram Bot Integration */}
        <div className="space-y-3">
          <div className="p-4 bg-background rounded-lg border border-border">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-sm font-medium text-card-foreground">Telegram Bot</h3>
                <p className="mt-1 text-xs text-muted-foreground">Interact with your portfolio via Telegram</p>
                <div className="mt-3">
                  <Button 
                    variant="telegram" 
                    size="sm"
                    className="w-full"
                    onClick={() => setIsTelegramModalOpen(true)}
                  >
                    Setup Bot
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Auto-Compound Yields */}
          <div className="p-4 bg-background rounded-lg border border-border">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-sm font-medium text-card-foreground">Auto-Compounding</h3>
                <p className="mt-1 text-xs text-muted-foreground">Automatically reinvest your yields</p>
                <div className="mt-3">
                  <Button 
                    variant="default" 
                    size="sm"
                    className="w-full"
                  >
                    Configure
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Yield Alerts Setup */}
          <div className="p-4 bg-background rounded-lg border border-border">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-sm font-medium text-card-foreground">Yield Alerts</h3>
                <p className="mt-1 text-xs text-muted-foreground">Get notified about high APY opportunities</p>
                <div className="mt-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full border-amber-500 text-amber-500 hover:bg-amber-500/10"
                  >
                    Set Alert
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Risk Profile Settings */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-card-foreground mb-2">Your Risk Profile</h3>
          <div className="bg-background rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Conservative</span>
              <span className="text-xs text-muted-foreground">Aggressive</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mb-2">
              <div className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-2 rounded-full" style={{ width: riskPercentage() }}></div>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-white border-2 border-primary" style={{ marginLeft: riskPercentage() }}></div>
              <span className="ml-2 text-xs text-muted-foreground">{riskLevel.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
            </div>
          </div>
        </div>

        <TelegramModal 
          isOpen={isTelegramModalOpen} 
          onClose={() => setIsTelegramModalOpen(false)} 
        />
      </CardContent>
    </Card>
  );
};
