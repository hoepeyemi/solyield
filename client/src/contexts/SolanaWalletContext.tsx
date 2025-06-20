import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { Connection, PublicKey, clusterApiUrl, Transaction } from '@solana/web3.js';
import { checkSubscription } from '@/lib/subscription';
import { useToast } from '@/hooks/use-toast';
import { 
  useWallet, 
  WalletProvider, 
  ConnectionProvider, 
  WalletContextState
} from '@solana/wallet-adapter-react';
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
  LedgerWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

// Import the wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

// Default admin public key (replace with your admin wallet when deploying)
export const ADMIN_PUBKEY = new PublicKey('11111111111111111111111111111111');

// Extended wallet context type with our custom properties
interface SolanaWalletContextType extends WalletContextState {
  balance: number | null;
  isSubscribed: boolean;
  connection: Connection | null;
  checkUserSubscription: () => Promise<void>;
  updateBalance: () => Promise<void>;
  connectWallet: () => Promise<void>;
  isConnected: boolean; // Alias for connected for better naming consistency
}

// Create the wallet context
const SolanaWalletContext = createContext<SolanaWalletContextType>({} as SolanaWalletContextType);

// Hook to use the wallet context
export const useSolanaWallet = () => useContext(SolanaWalletContext);

// Custom provider component that extends wallet adapter functionality
export const SolanaWalletProvider = ({ children }: { children: ReactNode }) => {
  // Get RPC endpoint from environment variable or use devnet as fallback
  const endpoint = import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl('devnet');
  
  // Setup wallet adapters
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new CoinbaseWalletAdapter(),
    new LedgerWalletAdapter(),
    new TorusWalletAdapter(),
  ], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <SolanaWalletContextProvider>
            {children}
          </SolanaWalletContextProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

// Inner context provider that uses the wallet adapter
const SolanaWalletContextProvider = ({ children }: { children: ReactNode }) => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  // Update balance when connection/publicKey changes
  const updateBalance = async (): Promise<void> => {
    if (connection && wallet.publicKey) {
      try {
        const balance = await connection.getBalance(wallet.publicKey);
        setBalance(balance / 1000000000); // Convert lamports to SOL
      } catch (error) {
        console.error('Error fetching balance:', error);
      }
    }
  };

  // Check if user has an active subscription
  const checkUserSubscription = async (): Promise<void> => {
    if (connection && wallet.publicKey) {
      try {
        // First check the database for subscription
        const response = await fetch(`/api/wallet/subscription?address=${wallet.publicKey.toString()}`);
        const data = await response.json();
        
        if (data.isSubscribed) {
          setIsSubscribed(true);
          return;
        }
        
        // If not found in database, check on-chain
        const subscribed = await checkSubscription(connection, wallet.publicKey);
        setIsSubscribed(subscribed);
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    }
  };

  // Update balance and subscription status when wallet is connected
  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      updateBalance();
      
      // Register the user in the database when wallet is connected
      const registerUser = async () => {
        try {
          // First register the user
          const registerResponse = await fetch('/api/wallet/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              walletAddress: wallet.publicKey?.toString()
            })
          });
          
          if (!registerResponse.ok) {
            console.error('Failed to register user');
          }
          
          // Then connect the wallet in our backend
          const connectResponse = await fetch('/api/wallet/connect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              walletAddress: wallet.publicKey?.toString()
            })
          });
          
          if (!connectResponse.ok) {
            console.error('Failed to connect wallet in backend');
          }
          
          // After connecting, check subscription status
        await checkUserSubscription();
        
          // Also get wallet info which includes subscription status
          const infoResponse = await fetch('/api/wallet/info');
          if (infoResponse.ok) {
            const walletInfo = await infoResponse.json();
            if (walletInfo.isSubscribed) {
              setIsSubscribed(true);
    }
          }
        } catch (error) {
          console.error('Error connecting wallet in backend:', error);
        }
      };
      
      registerUser();
    } else {
        setBalance(null);
        setIsSubscribed(false);
        
      // Disconnect wallet in backend when disconnected in frontend
      if (!wallet.connected) {
        fetch('/api/wallet/disconnect', { method: 'POST' })
          .catch(error => console.error('Error disconnecting wallet in backend:', error));
      }
    }
  }, [wallet.connected, wallet.publicKey, connection]);

  // Show toast notifications for wallet connection events
  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      toast({
        title: 'Wallet connected',
        description: `Connected to ${wallet.publicKey.toString().slice(0, 4)}...${wallet.publicKey.toString().slice(-4)}`,
      });
    }
  }, [wallet.connected]);

  // Context value
  const contextValue: SolanaWalletContextType = {
    ...wallet,
    balance,
    isSubscribed,
    connection,
    checkUserSubscription,
    updateBalance,
    connectWallet: async () => {
      try {
        if (wallet.wallet && !wallet.connected) {
          await wallet.connect();
          return;
        }
        
        // If no wallet is selected, open the wallet modal
        if (wallet.select && !wallet.wallet) {
          (wallet.select as () => void)();
        }
      } catch (error) {
        console.error('Error connecting wallet:', error);
        throw error;
      }
    },
    isConnected: wallet.connected
  };

  return (
    <SolanaWalletContext.Provider value={contextValue}>
      {children}
    </SolanaWalletContext.Provider>
  );
};

// Helper hook to get the connection from the context
function useConnection() {
  const [connection, setConnection] = useState<Connection | null>(null);

  useEffect(() => {
    const conn = new Connection(
      import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl('devnet'),
      'confirmed'
    );
    setConnection(conn);
  }, []);

  return { connection };
}

// Add this type definition for window to recognize wallet extensions
declare global {
  interface Window {
    phantom?: {
      solana?: any;
    };
    solflare?: any;
  }
}