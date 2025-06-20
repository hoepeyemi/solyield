import React from 'react';
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
import { Button } from '@/components/ui/button';
import { InfoIcon } from 'lucide-react';

export default function SolSeeker() {
  const { isConnected, connectWallet } = useWallet();

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChatPanel />
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
              <CardTitle>Transaction Assistant</CardTitle>
              <CardDescription>
                SolSeeker can help you execute transactions by understanding your natural language commands.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Simply describe what you want to do, and SolSeeker will prepare the transaction for your approval. For example:
              </p>
              
              <ul className="space-y-2 text-sm text-muted-foreground mt-2">
                <li>• "Invest 50 USDC in the highest yield option"</li>
                <li>• "Put 10 SOL into Marinade staking"</li>
                <li>• "Withdraw my investment from Orca"</li>
              </ul>
              
              <div className="mt-4 p-3 bg-secondary rounded-md">
                <p className="text-xs font-medium">Security Note</p>
                <p className="text-xs text-muted-foreground">
                  You'll always be asked to review and confirm any transaction before it's submitted to the blockchain.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}