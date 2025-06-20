import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelegramModal = ({ isOpen, onClose }: TelegramModalProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const connectTelegramMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/telegram/connect', {});
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Telegram connection initiated",
        description: "Please use the link to connect your Telegram account",
      });
      
      // Open the Telegram link in a new window
      if (data.telegramLink) {
        window.open(data.telegramLink, '_blank');
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/user/telegram-status'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Connection failed",
        description: error.message || "There was an error connecting to Telegram",
        variant: "destructive"
      });
    }
  });

  const handleConnectTelegram = () => {
    connectTelegramMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect to Telegram</DialogTitle>
          <DialogDescription>
            Connect your account to our Telegram bot for real-time updates and notifications
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-background rounded-lg mb-6 border border-border">
          <div className="flex items-center mb-4">
            <div className="h-16 w-16 rounded-xl bg-blue-500 flex items-center justify-center">
              <svg className="h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm-2.5 11.5l1.5 1.5 4.5-4.5-1.5-1.5-3 3-1-1-1.5 1.5z"/>
              </svg>
            </div>
            <div className="ml-4">
              <h4 className="text-md font-semibold text-card-foreground">SolYieldHunter2Bot</h4>
              <p className="text-sm text-muted-foreground">Official Sol YieldHunter Bot</p>
            </div>
          </div>
          
          <p className="text-sm text-card-foreground mb-4">
            Get real-time notifications, manage your positions, and receive yield recommendations directly in Telegram.
          </p>
          
          <div className="bg-card rounded-lg p-3 text-sm text-card-foreground mb-4 border border-muted">
            <p className="mb-1"><strong>Available Commands:</strong></p>
            <p className="mb-1 font-mono text-xs">/yields - Show best yields</p>
            <p className="mb-1 font-mono text-xs">/portfolio - View your portfolio</p>
            <p className="mb-1 font-mono text-xs">/invest - Create new position</p>
            <p className="font-mono text-xs">/alerts - Configure notifications</p>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-muted"></div>
            <span className="flex-shrink mx-3 text-muted-foreground text-sm">Connect Now</span>
            <div className="flex-grow border-t border-muted"></div>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={onClose} className="mb-2 sm:mb-0">
            Cancel
          </Button>
          <Button 
            variant="telegram" 
            onClick={handleConnectTelegram}
            disabled={connectTelegramMutation.isPending}
          >
            {connectTelegramMutation.isPending ? "Connecting..." : "Open Telegram"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
