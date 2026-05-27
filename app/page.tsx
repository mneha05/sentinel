import { loadDataset } from "@/lib/data";
import Dashboard from "@/components/Dashboard";

export default async function Page() {
  const dataset = await loadDataset();
  return <Dashboard dataset={dataset} />;
}
