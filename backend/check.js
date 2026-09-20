const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.legalRule.count().then(console.log).finally(() => prisma.$disconnect());
