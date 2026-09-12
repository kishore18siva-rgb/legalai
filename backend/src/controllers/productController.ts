import { Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const listProducts = async (req: any, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: { inspections: { select: { id: true, overallResult: true, createdAt: true } } },
    });
    return res.json(products);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const createProduct = async (req: any, res: Response) => {
  try {
    const { name, brand, category, packageType, manufacturer, packer, importer, countryOfOrigin } = req.body;
    const product = await prisma.product.create({
      data: {
        name,
        brand,
        category,
        packageType,
        manufacturer,
        packer,
        importer,
        countryOfOrigin,
      },
    });
    return res.status(201).json(product);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
