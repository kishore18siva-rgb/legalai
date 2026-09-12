"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProduct = exports.listProducts = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const listProducts = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            orderBy: { name: 'asc' },
            include: { inspections: { select: { id: true, overallResult: true, createdAt: true } } },
        });
        return res.json(products);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.listProducts = listProducts;
const createProduct = async (req, res) => {
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.createProduct = createProduct;
