import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedYieldOpportunities() {
  try {
    console.log('Seeding yield opportunities...');
    
    // Clear existing data
    await prisma.yieldOpportunity.deleteMany({});
    
    // Create sample yield opportunities
    const opportunities = [
      {
        name: 'SOL-USDC LP',
        protocol: 'Raydium',
        apy: 12.5,
        baseApy: 8.2,
        rewardApy: 4.3,
        riskLevel: 'medium',
        tvl: 24.5,
        assetType: 'Liquidity Pool',
        tokenPair: ['SOL', 'USDC'],
        depositFee: 0.1,
        withdrawalFee: 0.1,
        lastUpdated: new Date(),
        link: 'https://raydium.io/pools'
      },
      {
        name: 'ETH-USDC LP',
        protocol: 'Orca',
        apy: 9.8,
        baseApy: 6.5,
        rewardApy: 3.3,
        riskLevel: 'medium',
        tvl: 18.7,
        assetType: 'Liquidity Pool',
        tokenPair: ['ETH', 'USDC'],
        depositFee: 0.2,
        withdrawalFee: 0.2,
        lastUpdated: new Date(),
        link: 'https://www.orca.so/'
      },
      {
        name: 'SOL Staking',
        protocol: 'Marinade',
        apy: 6.2,
        baseApy: 6.2,
        rewardApy: 0,
        riskLevel: 'low',
        tvl: 125.3,
        assetType: 'Staking',
        tokenPair: ['SOL'],
        depositFee: 0,
        withdrawalFee: 0,
        lastUpdated: new Date(),
        link: 'https://marinade.finance/'
      },
      {
        name: 'USDC Lending',
        protocol: 'Solend',
        apy: 5.8,
        baseApy: 4.2,
        rewardApy: 1.6,
        riskLevel: 'low',
        tvl: 78.4,
        assetType: 'Lending',
        tokenPair: ['USDC'],
        depositFee: 0,
        withdrawalFee: 0,
        lastUpdated: new Date(),
        link: 'https://solend.fi/'
      },
      {
        name: 'BTC-SOL LP',
        protocol: 'Raydium',
        apy: 15.3,
        baseApy: 9.1,
        rewardApy: 6.2,
        riskLevel: 'medium-high',
        tvl: 12.8,
        assetType: 'Liquidity Pool',
        tokenPair: ['BTC', 'SOL'],
        depositFee: 0.15,
        withdrawalFee: 0.15,
        lastUpdated: new Date(),
        link: 'https://raydium.io/pools'
      },
      {
        name: 'USDT Lending',
        protocol: 'Solend',
        apy: 5.5,
        baseApy: 4.0,
        rewardApy: 1.5,
        riskLevel: 'low',
        tvl: 65.2,
        assetType: 'Lending',
        tokenPair: ['USDT'],
        depositFee: 0,
        withdrawalFee: 0,
        lastUpdated: new Date(),
        link: 'https://solend.fi/'
      },
      {
        name: 'SOL-USDT LP',
        protocol: 'Orca',
        apy: 11.9,
        baseApy: 7.8,
        rewardApy: 4.1,
        riskLevel: 'medium',
        tvl: 22.1,
        assetType: 'Liquidity Pool',
        tokenPair: ['SOL', 'USDT'],
        depositFee: 0.2,
        withdrawalFee: 0.2,
        lastUpdated: new Date(),
        link: 'https://www.orca.so/'
      },
      {
        name: 'ETH Staking',
        protocol: 'Tulip',
        apy: 7.5,
        baseApy: 7.5,
        rewardApy: 0,
        riskLevel: 'medium',
        tvl: 45.6,
        assetType: 'Staking',
        tokenPair: ['ETH'],
        depositFee: 0.1,
        withdrawalFee: 0.1,
        lastUpdated: new Date(),
        link: 'https://tulip.garden/'
      },
      {
        name: 'BTC-USDC LP',
        protocol: 'Raydium',
        apy: 10.2,
        baseApy: 6.8,
        rewardApy: 3.4,
        riskLevel: 'medium',
        tvl: 31.5,
        assetType: 'Liquidity Pool',
        tokenPair: ['BTC', 'USDC'],
        depositFee: 0.15,
        withdrawalFee: 0.15,
        lastUpdated: new Date(),
        link: 'https://raydium.io/pools'
      },
      {
        name: 'SOL Leveraged Farming',
        protocol: 'Tulip',
        apy: 18.7,
        baseApy: 10.5,
        rewardApy: 8.2,
        riskLevel: 'high',
        tvl: 8.9,
        assetType: 'Leveraged Farming',
        tokenPair: ['SOL'],
        depositFee: 0.3,
        withdrawalFee: 0.3,
        lastUpdated: new Date(),
        link: 'https://tulip.garden/'
      }
    ];
    
    for (const opportunity of opportunities) {
      await prisma.yieldOpportunity.create({
        data: {
          ...opportunity
        }
      });
    }
    
    console.log('Successfully seeded yield opportunities!');
  } catch (error) {
    console.error('Error seeding yield opportunities:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedYieldOpportunities()
  .catch(error => {
    console.error('Failed to seed database:', error);
    process.exit(1);
  }); 