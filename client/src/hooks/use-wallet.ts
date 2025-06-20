import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export interface WalletInfo {
  isConnected: boolean;
  walletAddress: string | null;
  walletBalance: number | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

export const useWallet = (): WalletInfo => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if wallet is already connected on mount
  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    try {
      const response = await fetch('/api/wallet/status', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.connected) {
          setIsConnected(true);
          setWalletAddress(data.address);
          setWalletBalance(data.balance);
        }
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };

  const connectWallet = async () => {
    try {
      // This is a placeholder for the actual wallet connection logic
      // In a real app, we would use a wallet adapter like @solana/wallet-adapter-react
      
      // For now, we'll simulate connecting to a wallet by calling our API
      const response = await apiRequest('POST', '/api/wallet/connect', {});
      const data = await response.json();
      
      if (data.success) {
        setIsConnected(true);
        setWalletAddress(data.address);
        setWalletBalance(data.balance);
        
        toast({
          title: 'Wallet connected',
          description: `Connected to ${data.address.substring(0, 4)}...${data.address.substring(data.address.length - 4)}`,
        });
        
        // Invalidate queries that depend on wallet connection
        queryClient.invalidateQueries();
      } else {
        throw new Error(data.message || 'Failed to connect wallet');
      }
    } catch (error: any) {
      toast({
        title: 'Connection failed',
        description: error.message || 'Failed to connect wallet',
        variant: 'destructive',
      });
    }
  };

  const disconnectWallet = async () => {
    try {
      await apiRequest('POST', '/api/wallet/disconnect', {});
      
      setIsConnected(false);
      setWalletAddress(null);
      setWalletBalance(null);
      
      toast({
        title: 'Wallet disconnected',
        description: 'Your wallet has been disconnected',
      });
      
      // Invalidate queries that depend on wallet connection
      queryClient.invalidateQueries();
    } catch (error: any) {
      toast({
        title: 'Disconnection failed',
        description: error.message || 'Failed to disconnect wallet',
        variant: 'destructive',
      });
    }
  };

  return {
    isConnected,
    walletAddress,
    walletBalance,
    connectWallet,
    disconnectWallet,
  };
};
