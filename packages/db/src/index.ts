import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  mobileshopPrisma?: PrismaClient;
};

export const prisma = globalForPrisma.mobileshopPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.mobileshopPrisma = prisma;
}
