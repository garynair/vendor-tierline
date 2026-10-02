import { ActionForm } from "@/components/action-form";
import { loadSampleData } from "./sample-data-actions";

// Admin-only button that copies the 27 fictional sample vendors (with their
// assessments and history) into a workspace that started empty.
export function LoadSampleData({ label = "Load sample data" }: { label?: string }) {
  return <ActionForm action={loadSampleData} submitLabel={label} pendingLabel="Loading sample data…" />;
}
