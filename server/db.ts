import { PrismaClient } from '@prisma/client';

// Create a singleton PrismaClient instance
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
});

// Export the client as 'db' for backward compatibility
export const db = prisma;

// Handle connection
export const connect = async () => {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Handle disconnection
export const disconnect = async () => {
  await prisma.$disconnect();
  console.log('Database disconnected');
};