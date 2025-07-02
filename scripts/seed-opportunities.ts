import { prisma } from '../server/db';

async function seedYieldOpportunities() {
  console.log('Seeding yield opportunities...');

  // Clear existing opportunities
  await prisma.yieldOpportunity.deleteMany({});

  // Create opportunities - focusing on Marinade, Helius, and Raydium only
  await prisma.yieldOpportunity.createMany({
    data: [
      // Raydium opportunities
      {
        name: 'SOL-USDC LP',
        protocol: 'Raydium',
        apy: 8.5,
        baseApy: 2.5,
        rewardApy: 6.0,
        riskLevel: 'medium',
        tvl: 45.2,
        assetType: 'Liquidity Pool',
        tokenPair: ['SOL', 'USDC'],
        depositFee: 0.1,
        withdrawalFee: 0.1,
        lastUpdated: new Date(),
        link: 'https://raydium.io/pools'
      },
      {
        name: 'SOL-RAY LP',
        protocol: 'Raydium',
        apy: 18.5,
        baseApy: 12.3,
        rewardApy: 6.2,
        riskLevel: 'medium-high',
        tvl: 15.8,
        assetType: 'Liquidity Pool',
        tokenPair: ['SOL', 'RAY'],
        depositFee: 0.25,
        withdrawalFee: 0.25,
        lastUpdated: new Date(),
        link: 'https://raydium.io/pools'
      },
      {
        name: 'RAY-USDC LP',
        protocol: 'Raydium',
        apy: 12.3,
        baseApy: 3.3,
        rewardApy: 9.0,
        riskLevel: 'medium-high',
        tvl: 18.9,
        assetType: 'Liquidity Pool',
        tokenPair: ['RAY', 'USDC'],
        depositFee: 0.1,
        withdrawalFee: 0.1,
        lastUpdated: new Date(),
        link: 'https://raydium.io/pools'
      },
      {
        name: 'BTC-SOL LP',
        protocol: 'Raydium',
        apy: 9.1,
        baseApy: 3.1,
        rewardApy: 6.0,
        riskLevel: 'medium-high',
        tvl: 22.5,
        assetType: 'Liquidity Pool',
        tokenPair: ['BTC', 'SOL'],
        depositFee: 0.1,
        withdrawalFee: 0.1,
        lastUpdated: new Date(),
        link: 'https://raydium.io/pools'
      },
      
      // Marinade opportunities
      {
        name: 'mSOL Staking',
        protocol: 'Marinade',
        apy: 6.8,
        baseApy: 6.8,
        rewardApy: 0,
        riskLevel: 'low',
        tvl: 120.5,
        assetType: 'Staking',
        tokenPair: ['SOL'],
        depositFee: 0,
        withdrawalFee: 0,
        lastUpdated: new Date(),
        link: 'https://marinade.finance'
      },
      {
        name: 'MNDE-USDC LP',
        protocol: 'Marinade',
        apy: 15.2,
        baseApy: 4.2,
        rewardApy: 11.0,
        riskLevel: 'high',
        tvl: 8.7,
        assetType: 'Liquidity Pool',
        tokenPair: ['MNDE', 'USDC'],
        depositFee: 0.1,
        withdrawalFee: 0.1,
        lastUpdated: new Date(),
        link: 'https://marinade.finance/app/pools'
      },
      {
        name: 'Marinade Native Staking',
        protocol: 'Marinade',
        apy: 7.1,
        baseApy: 7.1,
        rewardApy: 0,
        riskLevel: 'low',
        tvl: 95.3,
        assetType: 'Native Staking',
        tokenPair: ['SOL'],
        depositFee: 0,
        withdrawalFee: 0,
        lastUpdated: new Date(),
        link: 'https://marinade.finance/app/staking'
      },
      
      // Helius opportunities
      {
        name: 'SOL Staking',
        protocol: 'Helius',
        apy: 6.7,
        baseApy: 6.7,
        rewardApy: 0,
        riskLevel: 'low',
        tvl: 85.2,
        assetType: 'Staking',
        tokenPair: ['SOL'],
        depositFee: 0,
        withdrawalFee: 0,
        lastUpdated: new Date(),
        link: 'https://helius.dev'
      },
      {
        name: 'Helius Validator Staking',
        protocol: 'Helius',
        apy: 6.9,
        baseApy: 6.9,
        rewardApy: 0,
        riskLevel: 'low',
        tvl: 12.5,
        assetType: 'Staking',
        tokenPair: ['SOL'],
        depositFee: 0,
        withdrawalFee: 0,
        lastUpdated: new Date(),
        link: 'https://helius.dev/staking'
      }
    ]
  });

  console.log('Yield opportunities seeded successfully!');
}

seedYieldOpportunities()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  }); 