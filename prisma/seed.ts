import { PrismaClient, UserRole, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a test user
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      phone: '+919876543210',
      name: 'Test User',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  console.log('✅ Created test user:', testUser.email);

  // Seed Products
  console.log('🌱 Seeding products...');
  const products = [
    {
      id: 1,
      name: 'Classic White T-Shirt',
      description: 'A comfortable and versatile white t-shirt made from 100% cotton.',
      price: 29.99,
      image: 'https://placehold.co/400x400/png?text=T-Shirt',
      stock: 100,
      category: 'Apparel',
    },
    {
      id: 2,
      name: 'Denim Jeans',
      description: 'Classic blue denim jeans with a slim fit.',
      price: 49.99,
      image: 'https://placehold.co/400x400/png?text=Jeans',
      stock: 50,
      category: 'Apparel',
    },
    {
      id: 3,
      name: 'Sneakers',
      description: 'Stylish and comfortable sneakers for everyday wear.',
      price: 89.99,
      image: 'https://placehold.co/400x400/png?text=Sneakers',
      stock: 0,
      category: 'Footwear',
    },
    {
      id: 4,
      name: 'Leather Jacket',
      description: 'Premium leather jacket with a modern cut.',
      price: 199.99,
      image: 'https://placehold.co/400x400/png?text=Jacket',
      stock: 5,
      category: 'Apparel',
    },
  ];

  // Upsert products to avoid duplicates on re-seed
  for (const p of products) {
    // We use ID to upsert since we don't have unique name
    await prisma.product.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    });
  }
  console.log('✅ Created products');
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

