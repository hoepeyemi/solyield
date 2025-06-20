import { prisma } from '../server/db';

async function seedYieldOpportunities() {
  console.log('Seeding yield opportunities...');

  // Clear existing opportunities
  await prisma.yieldOpportunity.deleteMany({});

  // Create opportunities
  await prisma.yieldOpportunity.createMany({
    data: [
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
        name: 'USDC-USDT LP',
        protocol: 'Orca',
        apy: 3.2,
        baseApy: 1.2,
        rewardApy: 2.0,
        riskLevel: 'low',
        tvl: 89.7,
        assetType: 'Liquidity Pool',
        tokenPair: ['USDC', 'USDT'],
        depositFee: 0.05,
        withdrawalFee: 0.05,
        lastUpdated: new Date(),
        link: 'https://www.orca.so'
      },
      {
        name: 'SOL Lending',
        protocol: 'Solend',
        apy: 4.1,
        baseApy: 4.1,
        rewardApy: 0,
        riskLevel: 'medium',
        tvl: 32.4,
        assetType: 'Lending',
        tokenPair: ['SOL'],
        depositFee: 0,
        withdrawalFee: 0,
        lastUpdated: new Date(),
        link: 'https://solend.fi'
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
        name: 'ETH-SOL LP',
        protocol: 'Orca',
        apy: 7.8,
        baseApy: 2.8,
        rewardApy: 5.0,
        riskLevel: 'medium',
        tvl: 27.3,
        assetType: 'Liquidity Pool',
        tokenPair: ['ETH', 'SOL'],
        depositFee: 0.05,
        withdrawalFee: 0.05,
        lastUpdated: new Date(),
        link: 'https://www.orca.so'
      },
      {
        name: 'USDC Lending',
        protocol: 'Solend',
        apy: 5.2,
        baseApy: 5.2,
        rewardApy: 0,
        riskLevel: 'low',
        tvl: 156.8,
        assetType: 'Lending',
        tokenPair: ['USDC'],
        depositFee: 0,
        withdrawalFee: 0,
        lastUpdated: new Date(),
        link: 'https://solend.fi'
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
        name: 'SOL Vault',
        protocol: 'Tulip',
        apy: 7.5,
        baseApy: 7.5,
        rewardApy: 0,
        riskLevel: 'medium',
        tvl: 15.3,
        assetType: 'Vault',
        tokenPair: ['SOL'],
        depositFee: 0.1,
        withdrawalFee: 0.1,
        lastUpdated: new Date(),
        link: 'https://tulip.garden'
      },
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
        name: 'Helius SOL Staking',
        protocol: 'Helius',
        apy: 6.7,
        baseApy: 6.7,
        rewardApy: 0,
        riskLevel: 'Low',
        tvl: 12.5,
        assetType: 'Staking',
        tokenPair: ['SOL'],
        depositFee: 0,
        withdrawalFee: 0,
        lastUpdated: new Date(),
        link: null
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