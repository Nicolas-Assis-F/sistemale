import { redirect } from 'next/navigation';
export default async function ProductPage({params}:{params:Promise<{slug:string}>}) { const {slug}=await params;redirect(`/vitrine/${encodeURIComponent(slug)}`); }
