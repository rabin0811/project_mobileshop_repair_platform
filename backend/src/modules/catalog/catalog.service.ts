import { prisma } from '@mobileshop/db';
import { errorCode } from '@mobileshop/shared';
import { AppError } from '../../lib/errors';

export async function listBrands() {
  return prisma.brand.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, slug: true, logoUrl: true, _count: { select: { models: true } } },
  });
}

export async function listModels(brandId: string) {
  const brand = await prisma.brand.findFirst({ where: { id: brandId, isActive: true } });
  if (!brand) throw new AppError(404, errorCode.NOT_FOUND, 'Brand not found');
  return prisma.deviceModel.findMany({
    where: { brandId, isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, slug: true, releaseYear: true, imageUrl: true },
  });
}

export async function listServices() {
  const services = await prisma.service.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  return Promise.all(
    services.map(async (s) => {
      const min = await prisma.servicePrice.aggregate({
        where: { serviceId: s.id, isActive: true },
        _min: { basePrice: true },
      });
      return { ...s, fromPrice: min._min.basePrice ?? s.startingPrice };
    }),
  );
}

export async function getService(slug: string) {
  const service = await prisma.service.findFirst({ where: { slug, isActive: true } });
  if (!service) throw new AppError(404, errorCode.NOT_FOUND, 'Service not found');
  const min = await prisma.servicePrice.aggregate({
    where: { serviceId: service.id, isActive: true },
    _min: { basePrice: true },
  });
  return { ...service, fromPrice: min._min.basePrice ?? service.startingPrice };
}

/**
 * Resolve the price matrix for a set of services.
 * Resolution: exact model override → brand default → service.startingPrice (isFromPrice).
 */
export async function estimateItems(serviceIds: string[], brandId?: string, modelId?: string) {
  const services = await prisma.service.findMany({ where: { id: { in: serviceIds }, isActive: true } });
  const items: Array<{ serviceId: string; quote: number; partsCost: number; isFromPrice: boolean; estTimeMin: number }> = [];
  let total = 0;

  for (const service of services) {
    let quote: number | null = null;
    let partsCost = 0;
    if (brandId && modelId) {
      const candidates = await prisma.servicePrice.findMany({
        where: { serviceId: service.id, brandId, OR: [{ modelId }, { modelId: null }], isActive: true },
      });
      const price = candidates.find((p) => p.modelId === modelId) ?? candidates[0];
      if (price) {
        quote = price.basePrice;
        partsCost = price.partsCost;
      }
    }
    const isFromPrice = quote == null;
    const finalQuote = quote ?? service.startingPrice;
    total += finalQuote;
    items.push({ serviceId: service.id, quote: finalQuote, partsCost, isFromPrice, estTimeMin: service.estTimeMin });
  }

  return { items, total };
}

export async function estimate(input: { brandId: string; modelId: string; serviceIds: string[] }) {
  const brand = await prisma.brand.findFirst({ where: { id: input.brandId, isActive: true } });
  if (!brand) throw new AppError(404, errorCode.NOT_FOUND, 'Brand not found');
  const model = await prisma.deviceModel.findFirst({ where: { id: input.modelId, brandId: brand.id, isActive: true } });
  if (!model) throw new AppError(404, errorCode.NOT_FOUND, 'Model not found');

  const { items, total } = await estimateItems(input.serviceIds, brand.id, model.id);
  const services = await prisma.service.findMany({ where: { id: { in: input.serviceIds } } });

  return {
    brand: { id: brand.id, name: brand.name },
    model: { id: model.id, name: model.name },
    items: items.map((it) => ({
      service: services.find((s) => s.id === it.serviceId) && {
        id: it.serviceId,
        name: services.find((s) => s.id === it.serviceId)!.name,
        slug: services.find((s) => s.id === it.serviceId)!.slug,
        estTimeMin: it.estTimeMin,
        warrantyDays: services.find((s) => s.id === it.serviceId)!.warrantyDays,
      },
      quote: it.quote,
      partsCost: it.partsCost,
      isFromPrice: it.isFromPrice,
    })),
    total,
    isEstimateOnly: items.some((it) => it.isFromPrice),
  };
}
