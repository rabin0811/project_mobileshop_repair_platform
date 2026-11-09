import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const branches = [
  {
    name: 'Main Branch',
    slug: 'main',
    address: 'Durbar Marg, Ward 1',
    city: 'Kathmandu',
    state: 'Bagmati',
    postalCode: '44600',
    phone: '+977 1 555 0100',
    whatsapp: '+977 980 000 0000',
    email: 'hello@mobifix.local',
    mapsUrl: 'https://maps.google.com/?q=Durbar+Marg+Kathmandu',
    timezone: 'Asia/Kathmandu',
    businessHours: {
      mon: ['09:00', '19:00'],
      tue: ['09:00', '19:00'],
      wed: ['09:00', '19:00'],
      thu: ['09:00', '19:00'],
      fri: ['09:00', '19:00'],
      sat: ['10:00', '17:00'],
      sun: null,
    },
  },
];

const brands = [
  {
    name: 'Apple',
    slug: 'apple',
    sortOrder: 1,
    priceFactor: 1.2,
    models: [
      { name: 'iPhone 15', slug: 'iphone-15', releaseYear: 2023, sortOrder: 1, priceFactor: 1.25 },
      { name: 'iPhone 14', slug: 'iphone-14', releaseYear: 2022, sortOrder: 2, priceFactor: 1.15 },
      { name: 'iPhone 13', slug: 'iphone-13', releaseYear: 2021, sortOrder: 3, priceFactor: 1.05 },
    ],
  },
  {
    name: 'Samsung',
    slug: 'samsung',
    sortOrder: 2,
    priceFactor: 1,
    models: [
      { name: 'Galaxy S24', slug: 'galaxy-s24', releaseYear: 2024, sortOrder: 1, priceFactor: 1.15 },
      { name: 'Galaxy S23', slug: 'galaxy-s23', releaseYear: 2023, sortOrder: 2, priceFactor: 1.05 },
      { name: 'Galaxy A54', slug: 'galaxy-a54', releaseYear: 2023, sortOrder: 3, priceFactor: 0.85 },
    ],
  },
  {
    name: 'Xiaomi',
    slug: 'xiaomi',
    sortOrder: 3,
    priceFactor: 0.8,
    models: [
      { name: 'Redmi Note 13', slug: 'redmi-note-13', releaseYear: 2024, sortOrder: 1, priceFactor: 0.85 },
      { name: 'Xiaomi 13', slug: 'xiaomi-13', releaseYear: 2023, sortOrder: 2, priceFactor: 1.05 },
    ],
  },
  {
    name: 'Google',
    slug: 'google',
    sortOrder: 4,
    priceFactor: 1.1,
    models: [
      { name: 'Pixel 8', slug: 'pixel-8', releaseYear: 2023, sortOrder: 1, priceFactor: 1.05 },
      { name: 'Pixel 7', slug: 'pixel-7', releaseYear: 2022, sortOrder: 2, priceFactor: 0.95 },
    ],
  },
] as const;

const services = [
  {
    name: 'Screen replacement',
    slug: 'screen-replacement',
    shortDescription: 'Cracked or unresponsive display replacement.',
    description: 'Premium display assembly replacement with a quality check and warranty.',
    category: 'SCREEN',
    startingPrice: 499900,
    estTimeMin: 60,
    warrantyDays: 180,
    priceModel: 'FIXED',
    sortOrder: 1,
  },
  {
    name: 'Battery replacement',
    slug: 'battery-replacement',
    shortDescription: 'Restore all-day battery life.',
    description: 'Genuine-grade battery replacement with health verification.',
    category: 'BATTERY',
    startingPrice: 249900,
    estTimeMin: 30,
    warrantyDays: 180,
    priceModel: 'FIXED',
    sortOrder: 2,
  },
  {
    name: 'Charging port repair',
    slug: 'charging-port-repair',
    shortDescription: 'Fix loose or dead charging ports.',
    description: 'Charging port cleaning or replacement and charging test.',
    category: 'CHARGING_PORT',
    startingPrice: 129900,
    estTimeMin: 45,
    warrantyDays: 90,
    priceModel: 'FIXED',
    sortOrder: 3,
  },
  {
    name: 'Camera repair',
    slug: 'camera-repair',
    shortDescription: 'Blurry, cracked, or black camera fixes.',
    description: 'Rear or front camera module diagnosis and replacement.',
    category: 'CAMERA',
    startingPrice: 299900,
    estTimeMin: 60,
    warrantyDays: 90,
    priceModel: 'FIXED',
    sortOrder: 4,
  },
  {
    name: 'Speaker repair',
    slug: 'speaker-repair',
    shortDescription: 'Restore clear call and media audio.',
    description: 'Earpiece or loudspeaker cleaning and replacement.',
    category: 'SPEAKER',
    startingPrice: 149900,
    estTimeMin: 45,
    warrantyDays: 90,
    priceModel: 'FIXED',
    sortOrder: 5,
  },
  {
    name: 'Motherboard repair',
    slug: 'motherboard-repair',
    shortDescription: 'Advanced board-level diagnostics and repair.',
    description: 'Micro-soldering and component-level motherboard repair.',
    category: 'MOTHERBOARD',
    startingPrice: 699900,
    estTimeMin: 180,
    warrantyDays: 30,
    priceModel: 'FROM',
    sortOrder: 6,
  },
  {
    name: 'Water damage treatment',
    slug: 'water-damage-treatment',
    shortDescription: 'Ultrasonic cleaning and corrosion treatment.',
    description: 'Full teardown, board cleaning, and post-treatment testing.',
    category: 'WATER_DAMAGE',
    startingPrice: 399900,
    estTimeMin: 180,
    warrantyDays: 30,
    priceModel: 'FROM',
    sortOrder: 7,
  },
  {
    name: 'Software repair',
    slug: 'software-repair',
    shortDescription: 'Boot loops, crashes, and update failures.',
    description: 'Software diagnosis, safe reflash, and data-preserving recovery.',
    category: 'SOFTWARE',
    startingPrice: 99900,
    estTimeMin: 60,
    warrantyDays: 30,
    priceModel: 'FIXED',
    sortOrder: 8,
  },
  {
    name: 'Unlocking service',
    slug: 'unlocking-service',
    shortDescription: 'Carrier and account unlock assistance.',
    description: 'Eligibility checks and supported unlock workflows.',
    category: 'UNLOCKING',
    startingPrice: 199900,
    estTimeMin: 60,
    warrantyDays: 30,
    priceModel: 'FROM',
    sortOrder: 9,
  },
  {
    name: 'Data recovery',
    slug: 'data-recovery',
    shortDescription: 'Recover photos, chats, and documents.',
    description: 'Logical and supported physical data recovery with privacy controls.',
    category: 'DATA_RECOVERY',
    startingPrice: 499900,
    estTimeMin: 120,
    warrantyDays: 30,
    priceModel: 'FROM',
    sortOrder: 10,
  },
  {
    name: 'Accessory replacement',
    slug: 'accessory-replacement',
    shortDescription: 'Buttons, SIM trays, and small parts.',
    description: 'Small mechanical part replacement and fitment testing.',
    category: 'ACCESSORY',
    startingPrice: 79900,
    estTimeMin: 30,
    warrantyDays: 30,
    priceModel: 'FIXED',
    sortOrder: 11,
  },
  {
    name: 'Other repair',
    slug: 'other-repair',
    shortDescription: 'Not sure what is wrong? Start here.',
    description: 'General diagnosis for issues not covered by another service.',
    category: 'OTHER',
    startingPrice: 99900,
    estTimeMin: 60,
    warrantyDays: 30,
    priceModel: 'FROM',
    sortOrder: 12,
  },
] as const;

async function main() {
  const branch = await prisma.branch.upsert({
    where: { slug: branches[0].slug },
    update: { ...branches[0] },
    create: { ...branches[0] },
  });

  const brandRecords: Record<string, { id: string; models: Record<string, string> }> = {};

  for (const brandSeed of brands) {
    const brand = await prisma.brand.upsert({
      where: { slug: brandSeed.slug },
      update: { name: brandSeed.name, sortOrder: brandSeed.sortOrder, isActive: true },
      create: { name: brandSeed.name, slug: brandSeed.slug, sortOrder: brandSeed.sortOrder },
    });
    const models: Record<string, string> = {};
    for (const modelSeed of brandSeed.models) {
      const model = await prisma.deviceModel.upsert({
        where: { brandId_slug: { brandId: brand.id, slug: modelSeed.slug } },
        update: { name: modelSeed.name, releaseYear: modelSeed.releaseYear, sortOrder: modelSeed.sortOrder, isActive: true },
        create: {
          brandId: brand.id,
          name: modelSeed.name,
          slug: modelSeed.slug,
          releaseYear: modelSeed.releaseYear,
          sortOrder: modelSeed.sortOrder,
        },
      });
      models[modelSeed.slug] = model.id;
    }
    brandRecords[brandSeed.slug] = { id: brand.id, models };
  }

  const serviceRecords: Record<string, { id: string }> = {};
  for (const serviceSeed of services) {
    const service = await prisma.service.upsert({
      where: { slug: serviceSeed.slug },
      update: {
        name: serviceSeed.name,
        shortDescription: serviceSeed.shortDescription,
        description: serviceSeed.description,
        category: serviceSeed.category,
        startingPrice: serviceSeed.startingPrice,
        estTimeMin: serviceSeed.estTimeMin,
        warrantyDays: serviceSeed.warrantyDays,
        priceModel: serviceSeed.priceModel,
        sortOrder: serviceSeed.sortOrder,
        isActive: true,
      },
      create: {
        name: serviceSeed.name,
        slug: serviceSeed.slug,
        shortDescription: serviceSeed.shortDescription,
        description: serviceSeed.description,
        category: serviceSeed.category,
        startingPrice: serviceSeed.startingPrice,
        estTimeMin: serviceSeed.estTimeMin,
        warrantyDays: serviceSeed.warrantyDays,
        priceModel: serviceSeed.priceModel,
        sortOrder: serviceSeed.sortOrder,
      },
    });
    serviceRecords[serviceSeed.slug] = service;
  }

  // Rebuild the price matrix so repeated seeds are deterministic.
  await prisma.servicePrice.deleteMany();
  const priceRows: Array<{
    serviceId: string;
    brandId: string;
    modelId: string | null;
    basePrice: number;
    partsCost: number;
  }> = [];

  for (const serviceSeed of services) {
    const service = serviceRecords[serviceSeed.slug];
    for (const brandSeed of brands) {
      const brand = brandRecords[brandSeed.slug];
      const brandBase = Math.round(serviceSeed.startingPrice * brandSeed.priceFactor);
      priceRows.push({
        serviceId: service.id,
        brandId: brand.id,
        modelId: null,
        basePrice: brandBase,
        partsCost: Math.round(brandBase * 0.4),
      });
      for (const modelSeed of brandSeed.models) {
        const modelBase = Math.round(brandBase * modelSeed.priceFactor);
        priceRows.push({
          serviceId: service.id,
          brandId: brand.id,
          modelId: brand.models[modelSeed.slug],
          basePrice: modelBase,
          partsCost: Math.round(modelBase * 0.4),
        });
      }
    }
  }

  await prisma.servicePrice.createMany({ data: priceRows });

  const adminPasswordHash = await bcrypt.hash('Admin123!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@mobifix.local' },
    update: {
      name: 'Shop Admin',
      role: 'ADMIN',
      isActive: true,
      passwordHash: adminPasswordHash,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: 'admin@mobifix.local',
      passwordHash: adminPasswordHash,
      name: 'Shop Admin',
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
    },
  });

  const customerPasswordHash = await bcrypt.hash('Customer123!', 12);
  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {
      name: 'Sample Customer',
      role: 'CUSTOMER',
      isActive: true,
      passwordHash: customerPasswordHash,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: 'customer@example.com',
      passwordHash: customerPasswordHash,
      name: 'Sample Customer',
      role: 'CUSTOMER',
      emailVerifiedAt: new Date(),
    },
  });

  const customer = await prisma.customer.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: { userId: customerUser.id },
  });

  const sampleBooking = await prisma.booking.findUnique({ where: { bookingRef: 'MF-20260802-ABC23' } });
  if (!sampleBooking) {
    const booking = await prisma.booking.create({
      data: {
        bookingRef: 'MF-20260802-ABC23',
        branchId: branch.id,
        customerId: customer.id,
        brandId: brandRecords.apple.id,
        modelId: brandRecords.apple.models['iphone-15'],
        problemDescription: 'Cracked screen and weak battery.',
        scheduledAt: new Date('2026-08-02T10:00:00.000Z'),
        timeSlot: '10:00',
        estimatedCost: 749800,
        status: 'CONFIRMED',
        repairStage: 'REPAIRING',
        services: {
          create: [
            { serviceId: serviceRecords['screen-replacement'].id, quotedPrice: 499900, isPrimary: true },
            { serviceId: serviceRecords['battery-replacement'].id, quotedPrice: 249900 },
          ],
        },
        events: {
          create: [
            { actorType: 'CUSTOMER', toStatus: 'PENDING', note: 'Booking submitted online' },
            { actorType: 'ADMIN', fromStatus: 'PENDING', toStatus: 'CONFIRMED', note: 'Confirmed by shop' },
            { actorType: 'ADMIN', fromStatus: 'CONFIRMED', toStatus: 'REPAIRING', note: 'Repair started' },
          ],
        },
      },
    });
    await prisma.invoice.create({
      data: {
        bookingId: booking.id,
        invoiceNo: 'INV-20260802-0001',
        subtotal: 749800,
        taxAmount: 134964,
        discount: 0,
        total: 884764,
        status: 'ISSUED',
      },
    });
  }

  console.log('Seed complete: 1 branch, 4 brands, 12 services, admin + customer accounts.');
  console.log('Admin login: admin@mobifix.local / Admin123!');
  console.log('Customer login: customer@example.com / Customer123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
