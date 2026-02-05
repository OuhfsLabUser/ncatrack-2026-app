// tests/setup.js
import { PrismaClient } from '@prisma/client';

// Create a singleton Prisma instance to use across tests
global.prisma = new PrismaClient();

beforeAll(async () => {
  // Any setup you need before all tests
  console.log('Setting up test environment...');
  
  // Check if we have at least one CAC to use in tests
  const cacCount = await global.prisma.child_advocacy_center.count();
  if (cacCount === 0) {
    console.warn('Warning: No Child Advocacy Centers found in database. Tests may fail.');
  }
});

afterAll(async () => {
  await global.prisma.$disconnect();
  console.log('Test environment cleanup complete.');
});