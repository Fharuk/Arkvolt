import { ProductEditor } from '@/components/admin/ProductEditor';

export const metadata = { title: 'Edit product' };

export default function EditProductPage({ params }: { params: { id: string } }) {
  return <ProductEditor productId={params.id} />;
}
