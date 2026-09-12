class Product {
  final String? id;
  final String name;
  final String? brand;
  final String category;
  final String? packageType;
  final String? manufacturer;

  Product({
    this.id,
    required this.name,
    this.brand,
    required this.category,
    this.packageType,
    this.manufacturer,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'],
      name: json['name'] ?? 'Packaged Item',
      brand: json['brand'],
      category: json['category'] ?? 'Food',
      packageType: json['packageType'],
      manufacturer: json['manufacturer'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'brand': brand,
        'category': category,
        'packageType': packageType,
        'manufacturer': manufacturer,
      };
}
