import { Suspense } from "react";
import EditPageClient from "./EditPageClient";

export default function EditPage() {
  return (
    <Suspense>
      <EditPageClient />
    </Suspense>
  );
}
