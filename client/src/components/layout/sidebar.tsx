import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useSolanaWallet } from "@/contexts/SolanaWalletContext";
import { TelegramModal } from "@/components/modals/telegram-modal";
import { SubscriptionModal } from "@/components/modals/subscription-modal";
import { WalletMenu } from "./WalletMenu";
import { 
  BarChart3, 
  ArrowLeftRight, 
  HelpCircle, 
  Settings, 
  Scale, 
  X, 
  Menu,
  Bot
} from "lucide-react";

export const Sidebar = () => {
  const [location] = useLocation();
  const { publicKey, balance, connected, isSubscribed } = useSolanaWallet();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  // Check if user needs to subscribe
  useEffect(() => {
    // Show subscription modal after wallet is connected but user is not subscribed
    if (connected && !isSubscribed) {
      setIsSubscriptionModalOpen(true);
    }
  }, [connected, isSubscribed]);

  const navigationItems = [
    { path: "/", label: "Dashboard", icon: <BarChart3 className="h-5 w-5 mr-3" /> },
    { path: "/opportunities", label: "Opportunities", icon: <Scale className="h-5 w-5 mr-3" /> },
    { path: "/transactions", label: "Transactions", icon: <ArrowLeftRight className="h-5 w-5 mr-3" /> },
    { path: "/solseeker", label: "SolSeeker AI", icon: <Bot className="h-5 w-5 mr-3" /> },
    { path: "/faq", label: "FAQ & Help", icon: <HelpCircle className="h-5 w-5 mr-3" /> },
    { path: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-3" /> }
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      <aside className={`w-full md:w-64 bg-sidebar bg-sidebar-background md:min-h-screen p-4 md:fixed ${isMobileMenuOpen ? "fixed inset-0 z-50" : "md:relative hidden md:block"}`}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-sidebar-accent to-sidebar-primary flex items-center justify-center text-white font-bold text-xl">
              SY
            </div>
            <span className="ml-3 text-xl font-semibold text-sidebar-foreground">Sol YieldHunter</span>
          </div>
          <button 
            className="md:hidden text-sidebar-foreground"
            onClick={toggleMobileMenu}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Wallet Section */}
          <div className="p-3 bg-background rounded-xl mb-6 border border-sidebar-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Wallet</span>
            {connected && <span className="h-2 w-2 rounded-full bg-primary"></span>}
            </div>
          {connected ? (
            <>
            <div className="truncate font-mono text-sm mb-2 text-sidebar-foreground">
                {publicKey?.toString().substring(0, 4)}...{publicKey?.toString().substring(publicKey.toString().length - 4)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Balance</span>
              <span className="text-sm font-medium text-sidebar-foreground">{balance?.toFixed(2)} SOL</span>
            </div>
            {isSubscribed && (
              <div className="mt-2 flex items-center text-xs text-green-400">
                <span className="mr-1">●</span>
                <span>Subscription Active</span>
              </div>
            )}
            {!isSubscribed && (
              <Button
                variant="outline"
                size="xs"
                className="w-full mt-2 border-amber-500 text-amber-500 hover:bg-amber-500/10"
                onClick={() => setIsSubscriptionModalOpen(true)}
              >
                Subscribe Now
              </Button>
            )}
            </>
          ) : (
            <div className="text-center py-2 text-sm text-muted-foreground">
              Not connected
            </div>
          )}
          <div className="mt-3">
            <WalletMenu showFullAddress={false} variant="default" fullWidth />
          </div>
          </div>
        
        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                location === item.path
                  ? "bg-gradient-to-r from-background to-sidebar-background text-sidebar-foreground"
                  : "text-muted-foreground hover:bg-background hover:text-sidebar-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        
        <div className="mt-6 p-3 bg-background rounded-xl border border-sidebar-border">
          <div className="flex items-center mb-3">
            <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm-2.5 11.5l1.5 1.5 4.5-4.5-1.5-1.5-3 3-1-1-1.5 1.5z"/>
            </svg>
            <span className="ml-2 text-sm font-medium text-sidebar-foreground">Telegram Bot</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Get yield alerts and manage your portfolio via Telegram</p>
          <Button 
            variant="telegram" 
            size="default" 
            className="w-full"
            onClick={() => setIsTelegramModalOpen(true)}
          >
            Connect Telegram
          </Button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between p-4 bg-sidebar-background">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-sidebar-accent to-sidebar-primary flex items-center justify-center text-white font-bold text-xl">
            SY
          </div>
          <span className="ml-3 text-xl font-semibold text-sidebar-foreground">Sol YieldHunter</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMobileMenu}
          className="text-sidebar-foreground"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Modals */}
      <TelegramModal 
        isOpen={isTelegramModalOpen} 
        onClose={() => setIsTelegramModalOpen(false)} 
      />

      <SubscriptionModal 
        isOpen={isSubscriptionModalOpen} 
        onClose={() => setIsSubscriptionModalOpen(false)} 
      />
    </>
  );
};
