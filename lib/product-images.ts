const productImages: Record<string, string> = {
  "Nashik Tomatoes": "/images/products/nashik-tomatoes.jpg",
  "Red Onions": "/images/products/red-onions.jpg",
  "Farm Potatoes": "/images/products/farm-potatoes.jpg",
  "Kolam Rice": "/images/products/kolam-rice.jpg",
  "Alphonso Mangoes": "/images/products/alphonso-mangoes.jpg",
  "Wheat Flour": "/images/products/wheat-flour.jpg",
};

export function getProductImagePath(productName: string) {
  return productImages[productName] ?? null;
}
