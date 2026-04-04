const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
    throw new Error('Seeding is blocked in production unless ALLOW_PROD_SEED=true');
  }

  console.log('Starting database seed...');
  console.log('Preserving existing tables and data...');

  const seedUsers = [
    {
      username: 'admin',
      password: 'admin123',
      fullName: 'System Administrator',
      role: 'admin',
    },
    {
      username: 'staff1',
      password: 'staff123',
      fullName: 'John Reader',
      role: 'staff',
    },
    {
      username: 'staff2',
      password: 'staff123',
      fullName: 'Sarah Meter',
      role: 'staff',
    },
    {
      username: 'staff3',
      password: 'staff123',
      fullName: 'Mike Counter',
      role: 'staff',
    },
  ];

  for (const seedUser of seedUsers) {
    const passwordHash = await bcrypt.hash(seedUser.password, 10);
    const user = await prisma.user.upsert({
      where: { username: seedUser.username },
      update: {
        passwordHash,
        fullName: seedUser.fullName,
        role: seedUser.role,
        isActive: true,
      },
      create: {
        username: seedUser.username,
        passwordHash,
        fullName: seedUser.fullName,
        role: seedUser.role,
        isActive: true,
      },
    });

    console.log(`Ensured seed user exists: ${user.username}`);
  }

  console.log('\n=== Seed completed successfully! ===');
  if (process.env.NODE_ENV !== 'production') {
    console.log('\nLogin credentials:');
    console.log('Admin:  username=admin,  password=admin123');
    console.log('Staff1: username=staff1, password=staff123');
    console.log('Staff2: username=staff2, password=staff123');
    console.log('Staff3: username=staff3, password=staff123');
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
