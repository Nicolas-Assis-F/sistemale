import { getCatalog } from "@/lib/catalog";
import { LandingPage } from "@/components/landing/LandingPage";
export default async function HomePage() {
  return <LandingPage products={await getCatalog()} />;
}
