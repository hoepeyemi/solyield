import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { useWallet } from '@/hooks/use-wallet';
import { ChatPanel } from '@/components/SolSeeker/ChatPanel';
import { AIRecommendations } from '@/components/SolSeeker/AIRecommendations';
import { Button } from '@/components/ui/button';
import { InfoIcon, Sparkles, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SolSeeker() {
  const { isConnected, connectWallet } = useWallet();
  const [activeTab, setActiveTab] = useState<string>("chat");

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="chat" className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat with AI
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="flex items-center">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Recommendations
              </TabsTrigger>
            </TabsList>
            <TabsContent value="chat">
              <ChatPanel />
            </TabsContent>
            <TabsContent value="recommendations">
              <AIRecommendations />
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <InfoIcon className="mr-2 h-5 w-5" />
                About SolSeeker
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                SolSeeker is your AI-powered assistant for finding the best yield opportunities on Solana. Ask questions about protocols, yield options, or request specific transactions in natural language.
              </p>
              
              <h3 className="font-medium mt-4 mb-2">Try asking:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• "What are the highest yield options right now?"</li>
                <li>• "Find low-risk opportunities with at least 5% APY"</li>
                <li>• "Compare Raydium and Marinade protocols"</li>
                <li>• "Invest 10 USDC in the best Raydium pool"</li>
                <li>• "Explain impermanent loss"</li>
              </ul>
            </CardContent>
            {!isConnected && (
              <CardFooter>
                <Button 
                  onClick={connectWallet} 
                  className="w-full"
                  variant="outline"
                >
                  Connect Wallet to Start
                </Button>
              </CardFooter>
            )}
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>AI Features</CardTitle>
              <CardDescription>
                SolSeeker uses advanced AI to help you maximize your yield
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Our AI continuously monitors the Solana ecosystem to find the best opportunities:
              </p>
              
              <ul className="space-y-2 text-sm text-muted-foreground mt-2">
                <li>• <span className="font-medium">Smart Recommendations</span> - Get personalized yield suggestions based on your risk profile</li>
                <li>• <span className="font-medium">Portfolio Analysis</span> - AI evaluates your current positions and suggests optimizations</li>
                <li>• <span className="font-medium">Auto-Invest</span> - Let AI automatically invest in the best opportunities</li>
                <li>• <span className="font-medium">Risk Assessment</span> - Each opportunity is evaluated for risk vs. reward</li>
              </ul>
              
              <div className="mt-4 p-3 bg-secondary rounded-md">
                <p className="text-xs font-medium">AI Advantage</p>
                <p className="text-xs text-muted-foreground">
                  Our AI monitors protocols 24/7 and uses advanced algorithms to identify opportunities before they become widely known.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}