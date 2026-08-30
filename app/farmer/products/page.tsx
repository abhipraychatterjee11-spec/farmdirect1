import FarmerProducts from "../../../components/farmer-products";

type ProductPageProps = { searchParams: Promise<{ edit?: string | string[] }> };

export default async function FarmerProductsPage({ searchParams }: ProductPageProps) {
  const { edit } = await searchParams;
  return <FarmerProducts editProductId={typeof edit === "string" ? edit : undefined} />;
}
