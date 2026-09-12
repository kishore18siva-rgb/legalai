import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Product } from '../types';
import { Package, Plus, Search } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center space-x-2">
            <Package className="w-7 h-7 text-blue-600" />
            <span>Product Catalog Directory</span>
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Registered packaged commodities inspected under Legal Metrology Rules, 2011.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, brand, or category..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="px-6 py-3">Product Name</th>
                <th className="px-6 py-3">Brand</th>
                <th className="px-6 py-3">Statutory Category</th>
                <th className="px-6 py-3">Package Type</th>
                <th className="px-6 py-3">Manufacturer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-bold text-gray-900">{p.name}</td>
                  <td className="px-6 py-4 text-gray-600">{p.brand || 'Generic'}</td>
                  <td className="px-6 py-4 font-semibold text-blue-800">{p.category}</td>
                  <td className="px-6 py-4 text-gray-600">{p.packageType || 'Wrapper'}</td>
                  <td className="px-6 py-4 text-gray-600">{p.manufacturer || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
