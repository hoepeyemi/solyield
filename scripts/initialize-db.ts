import { db } from "../server/db";
import { yieldOpportunities } from "../shared/schema";

async function initializeDatabase() {
  try {
    console.log("Initializing database with sample data...");

    // Check if yield opportunities already exist
    const existingOpportunities = await db.select().from(yieldOpportunities);
    
    if (existingOpportunities.length > 0) {
      console.log(`Database already contains ${existingOpportunities.length} yield opportunities.`);
      return;
    }

    // Define sample yield opportunities
    const yields = [
      {
        name: "SOL-USDC LP",
        protocol: "Raydium",
        apy: "14.2",
        baseApy: "10.6",
        rewardApy: "3.6",
        riskLevel: "Medium",
        tvl: "24500000",
        assetType: "Liquidity Provider",
        tokenPair: ["SOL", "USDC"],
        depositFee: "0.25",
        withdrawalFee: "0.25",
        lastUpdated: new Date(),
        link: "https://raydium.io/pools"
      },
      {
        name: "Staked SOL (mSOL)",
        protocol: "Marinade",
        apy: "6.8",
        baseApy: "6.1",
        rewardApy: "0.7",
        riskLevel: "Low",
        tvl: "154200000",
        assetType: "Liquid Staking",
        tokenPair: ["SOL"],
        depositFee: "0",
        withdrawalFee: "0",
        lastUpdated: new Date(),
        link: "https://marinade.finance"
      },
      {
        name: "USDT-USDC LP",
        protocol: "Orca",
        apy: "4.3",
        baseApy: "1.2",
        rewardApy: "3.1",
        riskLevel: "Low",
        tvl: "89700000",
        assetType: "Stable Pair",
        tokenPair: ["USDT", "USDC"],
        depositFee: "0.3",
        withdrawalFee: "0.3",
        lastUpdated: new Date(),
        link: "https://www.orca.so"
      },
      {
        name: "BTC-SOL LP",
        protocol: "Raydium",
        apy: "9.7",
        baseApy: "7.2",
        rewardApy: "2.5",
        riskLevel: "Medium-High",
        tvl: "12300000",
        assetType: "Concentrated Liquidity",
        tokenPair: ["BTC", "SOL"],
        depositFee: "0.25",
        withdrawalFee: "0.25",
        lastUpdated: new Date(),
        link: "https://raydium.io/pools"
      },
      {
        name: "USDC Lending",
        protocol: "Solend",
        apy: "3.4",
        baseApy: "2.1",
        rewardApy: "1.3",
        riskLevel: "Low",
        tvl: "201100000",
        assetType: "Money Market",
        tokenPair: ["USDC"],
        depositFee: "0",
        withdrawalFee: "0",
        lastUpdated: new Date(),
        link: "https://solend.fi"
      }
    ];

    // Insert yield opportunities into the database
    const insertResult = await db.insert(yieldOpportunities).values(yields);
    
    console.log(`Successfully inserted ${yields.length} yield opportunities into the database.`);
  } catch (error) {
    console.error("Error initializing database:", error);
  } finally {
    // Close the database connection pool
    await (db.$client as any)?.end?.();
  }
}

// Run the initialization function
initializeDatabase();