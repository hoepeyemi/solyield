import { Switch, Route } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Opportunities from "@/pages/opportunities";
import Transactions from "@/pages/transactions";
import FAQ from "@/pages/faq";
import Settings from "@/pages/settings";
import SolSeeker from "@/pages/solseeker";
import { Sidebar } from "@/components/layout/sidebar";
import { SolanaWalletProvider } from "@/contexts/SolanaWalletContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/opportunities" component={Opportunities} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/faq" component={FAQ} />
      <Route path="/settings" component={Settings} />
      <Route path="/solseeker" component={SolSeeker} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <SolanaWalletProvider>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col md:flex-row">
          <Sidebar />
          <main className="flex-1 md:ml-64 bg-background min-h-screen">
            <Router />
          </main>
        </div>
      </TooltipProvider>
    </SolanaWalletProvider>
  );
}

export default App;
