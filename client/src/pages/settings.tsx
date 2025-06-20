import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['/api/user/preferences'],
  });

  // State for form values
  const [riskTolerance, setRiskTolerance] = useState(preferences?.riskTolerance || "medium");
  const [notificationsEnabled, setNotificationsEnabled] = useState(preferences?.notificationsEnabled || true);
  const [preferredTokens, setPreferredTokens] = useState<string[]>(preferences?.preferredTokens || []);
  const [telegramNotifications, setTelegramNotifications] = useState(preferences?.telegramNotifications || true);
  const [autoCompound, setAutoCompound] = useState(preferences?.autoCompound || false);
  const [riskToleranceValue, setRiskToleranceValue] = useState<number[]>([50]);

  // Update user preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updatedPreferences: any) => {
      return await apiRequest('PATCH', '/api/user/preferences', updatedPreferences);
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
    },
    onError: (error) => {
      toast({
        title: "Error saving settings",
        description: error.message || "There was an error updating your preferences.",
        variant: "destructive"
      });
    }
  });

  const handleSaveSettings = () => {
    // Convert slider value to risk tolerance string
    const riskMap: Record<number, string> = {
      0: "conservative",
      25: "moderate-conservative",
      50: "moderate",
      75: "moderate-aggressive",
      100: "aggressive"
    };
    
    const closestKey = Object.keys(riskMap).reduce((prev, curr) => {
      return Math.abs(parseInt(curr) - riskToleranceValue[0]) < Math.abs(parseInt(prev) - riskToleranceValue[0]) 
        ? curr 
        : prev;
    });
    
    const mappedRiskTolerance = riskMap[parseInt(closestKey)];

    // Prepare the updated preferences
    const updatedPreferences = {
      riskTolerance: mappedRiskTolerance,
      notificationsEnabled,
      preferredTokens,
      telegramNotifications,
      autoCompound
    };

    // Call the mutation
    updatePreferencesMutation.mutate(updatedPreferences);
  };

  // Maps risk tolerance string to slider value
  const mapRiskToleranceToSlider = (risk: string): number => {
    const riskMap: Record<string, number> = {
      "conservative": 0,
      "moderate-conservative": 25,
      "moderate": 50,
      "moderate-aggressive": 75,
      "aggressive": 100
    };
    return riskMap[risk] || 50;
  };

  // Initialize state values when preferences are loaded
  if (!isLoading && preferences && riskToleranceValue[0] === 50) {
    setRiskToleranceValue([mapRiskToleranceToSlider(preferences.riskTolerance)]);
    setNotificationsEnabled(preferences.notificationsEnabled);
    setPreferredTokens(preferences.preferredTokens || []);
    setTelegramNotifications(preferences.telegramNotifications);
    setAutoCompound(preferences.autoCompound);
  }

  // Handle token selection changes
  const handleTokenChange = (value: string) => {
    if (preferredTokens.includes(value)) {
      setPreferredTokens(preferredTokens.filter(token => token !== value));
    } else {
      setPreferredTokens([...preferredTokens, value]);
    }
  };

  return (
    <div>
      <Header title="Settings" subtitle="Configure your preferences and account settings" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* User Preferences Card */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-6">User Preferences</h2>
              
              <div className="space-y-6">
                {/* Risk Tolerance */}
                <div>
                  <div className="flex justify-between mb-2">
                    <Label htmlFor="risk-tolerance">Risk Tolerance</Label>
                    <span className="text-sm text-muted-foreground">
                      {riskToleranceValue[0] <= 25 ? 'Conservative' : 
                       riskToleranceValue[0] <= 40 ? 'Moderate Conservative' :
                       riskToleranceValue[0] <= 60 ? 'Moderate' :
                       riskToleranceValue[0] <= 80 ? 'Moderate Aggressive' : 'Aggressive'}
                    </span>
                  </div>
                  <Slider
                    id="risk-tolerance"
                    value={riskToleranceValue}
                    max={100}
                    step={5}
                    onValueChange={setRiskToleranceValue}
                    className="mb-4"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Lower Risk</span>
                    <span>Higher Return</span>
                  </div>
                </div>
                
                {/* Preferred Tokens */}
                <div>
                  <Label htmlFor="preferred-tokens" className="mb-2 block">Preferred Tokens</Label>
                  <div className="flex flex-wrap gap-2">
                    {["SOL", "USDC", "ETH", "BTC", "RAY", "SRM"].map((token) => (
                      <Button
                        key={token}
                        variant={preferredTokens.includes(token) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleTokenChange(token)}
                        className="min-w-[80px]"
                      >
                        {token}
                      </Button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Select the tokens you're interested in for yield opportunities
                  </p>
                </div>
                
                {/* Default Slippage */}
                <div>
                  <Label htmlFor="slippage" className="mb-2 block">Default Slippage Tolerance</Label>
                  <Select defaultValue="0.5">
                    <SelectTrigger id="slippage" className="w-full">
                      <SelectValue placeholder="Select slippage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.1">0.1%</SelectItem>
                      <SelectItem value="0.5">0.5%</SelectItem>
                      <SelectItem value="1.0">1.0%</SelectItem>
                      <SelectItem value="2.0">2.0%</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Maximum allowed price change when executing transactions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Notification Settings Card */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-6">Notification Settings</h2>
              
              <div className="space-y-6">
                {/* General Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notifications" className="block">Enable Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive alerts about your portfolio and opportunities</p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>
                
                {/* Telegram Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="telegram-notifications" className="block">Telegram Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive alerts via Telegram</p>
                  </div>
                  <Switch
                    id="telegram-notifications"
                    checked={telegramNotifications}
                    onCheckedChange={setTelegramNotifications}
                    disabled={!preferences?.telegramConnected}
                  />
                </div>
                
                {/* Auto-compound Setting */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-compound" className="block">Auto-compound Yields</Label>
                    <p className="text-sm text-muted-foreground">Automatically reinvest your yields</p>
                  </div>
                  <Switch
                    id="auto-compound"
                    checked={autoCompound}
                    onCheckedChange={setAutoCompound}
                  />
                </div>
                
                {/* Minimum APY Alert */}
                <div>
                  <Label htmlFor="min-apy" className="mb-2 block">Minimum APY Alert</Label>
                  <Select defaultValue="5">
                    <SelectTrigger id="min-apy" className="w-full">
                      <SelectValue placeholder="Select minimum APY" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3% APY</SelectItem>
                      <SelectItem value="5">5% APY</SelectItem>
                      <SelectItem value="10">10% APY</SelectItem>
                      <SelectItem value="15">15% APY</SelectItem>
                      <SelectItem value="20">20% APY</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Only notify about opportunities above this APY
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <Button 
            onClick={handleSaveSettings}
            disabled={updatePreferencesMutation.isPending}
          >
            {updatePreferencesMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
