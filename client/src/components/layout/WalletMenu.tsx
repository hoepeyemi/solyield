import { useState } from 'react';
import { useSolanaWallet } from '@/contexts/SolanaWalletContext';
import { Copy, LogOut, Wallet, Check } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { cn } from '@/lib/utils';

interface WalletMenuProps {
  showFullAddress?: boolean;
  variant?: 'default' | 'minimal';
  className?: string;
  buttonClassName?: string;
  fullWidth?: boolean;
}

export function WalletMenu({ 
  showFullAddress = false, 
  variant = 'default',
  className,
  buttonClassName,
  fullWidth = false
}: WalletMenuProps) {
  const { publicKey, disconnect, connected } = useSolanaWallet();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const walletAddress = publicKey?.toString() || '';
  const displayAddress = showFullAddress 
    ? walletAddress 
    : walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : '';

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast({
        title: 'Address Copied',
        description: 'Wallet address copied to clipboard',
      });
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // If not connected, show the connect button
  if (!connected) {
    return (
      <div className={cn(fullWidth && "w-full", className)}>
        <WalletMultiButton className={cn("wallet-adapter-button", buttonClassName)} />
        <style dangerouslySetInnerHTML={{
          __html: `
            .wallet-adapter-button {
              background-color: hsl(var(--primary));
              color: hsl(var(--primary-foreground));
              font-size: 0.875rem;
              font-weight: 500;
              height: 2.25rem;
              padding: 0 0.75rem;
              border-radius: 0.375rem;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              ${fullWidth ? 'width: 100%;' : ''}
            }
            .wallet-adapter-button:hover {
              background-color: hsl(var(--primary) / 0.9);
            }
            .wallet-adapter-button .wallet-adapter-button-start-icon {
              margin-right: 0.5rem;
            }
          `
        }} />
      </div>
    );
  }

  // If connected, show the wallet menu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant === 'minimal' ? 'ghost' : 'outline'} 
          className={cn("flex items-center gap-2", fullWidth && "w-full", buttonClassName)}
        >
          <Wallet className="h-4 w-4" />
          <span className="font-mono text-sm">{displayAddress}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Wallet Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyAddress}>
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              <span>Copy Address</span>
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => disconnect()}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Disconnect</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="p-2">
          <WalletMultiButton className="wallet-adapter-button-menu w-full" />
          <style dangerouslySetInnerHTML={{
            __html: `
              .wallet-adapter-button-menu {
                background-color: hsl(var(--primary));
                color: hsl(var(--primary-foreground));
                font-size: 0.875rem;
                font-weight: 500;
                height: 2.25rem;
                padding: 0 0.75rem;
                border-radius: 0.375rem;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 100%;
              }
              .wallet-adapter-button-menu:hover {
                background-color: hsl(var(--primary) / 0.9);
              }
            `
          }} />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 