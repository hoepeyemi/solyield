import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";

export default function FAQ() {
  const faqItems = [
    {
      question: "What is a yield aggregator?",
      answer: "A yield aggregator is a platform that automates the process of finding and investing in the highest-yielding opportunities across different DeFi protocols. It helps users optimize their returns without having to manually search and compare yields across multiple platforms."
    },
    {
      question: "How does the YieldAggr platform work?",
      answer: "YieldAggr analyzes all available yield opportunities on the Solana blockchain in real-time, compares their APYs, risk levels, and other factors, and provides recommendations based on your preferences. You can then invest directly through our platform, which generates the necessary on-chain transactions for you."
    },
    {
      question: "Is my investment safe?",
      answer: "While we strive to recommend only reputable protocols and analyze risks carefully, all DeFi investments carry inherent risks including smart contract vulnerabilities, market volatility, and protocol-specific risks. We recommend diversifying your investments and only investing what you can afford to lose."
    },
    {
      question: "How do I connect my Solana wallet?",
      answer: "Click the 'Connect Wallet' button at the top of the page and select your preferred wallet provider (Phantom, Solflare, etc.). Approve the connection request in your wallet, and you'll be ready to start using the platform."
    },
    {
      question: "What are the fees for using YieldAggr?",
      answer: "YieldAggr charges a small performance fee on the yields earned through our platform. We do not charge any deposit or withdrawal fees beyond what the underlying protocols may charge. Each yield opportunity displays the associated fees clearly before you invest."
    },
    {
      question: "How does the Telegram bot integration work?",
      answer: "Our Telegram bot allows you to manage your yield farming portfolio on the go. After connecting your account to Telegram, you can check your portfolio, receive yield alerts, and even execute basic transactions through chat commands. To set it up, click the 'Connect Telegram' button in the sidebar."
    },
    {
      question: "What is auto-compounding and how does it work?",
      answer: "Auto-compounding automatically reinvests your yield earnings back into the same pool, allowing you to earn compound interest over time. Our platform handles this process for you, optimizing the timing of reinvestments to maximize returns while minimizing transaction costs."
    },
    {
      question: "How is the risk level of each opportunity determined?",
      answer: "We analyze multiple factors to determine risk, including protocol security history, smart contract audits, TVL (Total Value Locked), token price volatility, protocol age and reputation, and impermanent loss potential for liquidity pools. These factors are combined to create our risk ratings from Low to High."
    },
    {
      question: "Can I withdraw my funds at any time?",
      answer: "Yes, you can withdraw your funds at any time, though some protocols may have lockup periods or withdrawal fees. These constraints are clearly displayed for each opportunity before you invest."
    },
    {
      question: "What should I do if I encounter an issue or have a question?",
      answer: "For technical support or questions, you can reach our team via the 'Help' section in the app or by emailing support@yieldaggr.io. We typically respond within 24 hours."
    }
  ];

  return (
    <div>
      <Header title="FAQ & Help" subtitle="Frequently asked questions and help resources" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            
            <div className="mt-8 p-4 bg-background rounded-lg border border-border">
              <h3 className="text-lg font-semibold mb-2">Still Have Questions?</h3>
              <p className="text-muted-foreground mb-4">
                Our support team is here to help you with any questions or issues you might have.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="bg-card p-4 rounded-lg border border-border flex-1">
                  <h4 className="font-medium mb-2">Email Support</h4>
                  <p className="text-sm text-muted-foreground mb-2">Send us a detailed message and we'll get back to you.</p>
                  <a href="mailto:support@yieldaggr.io" className="text-primary hover:underline">support@yieldaggr.io</a>
                </div>
                <div className="bg-card p-4 rounded-lg border border-border flex-1">
                  <h4 className="font-medium mb-2">Telegram Community</h4>
                  <p className="text-sm text-muted-foreground mb-2">Join our community for quick answers and updates.</p>
                  <a href="#" className="text-primary hover:underline">Join Telegram Group</a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
