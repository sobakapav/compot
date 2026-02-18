"use client";

type ViewActionsProps = {
  proposalId: string;
  versionId: string;
  createdAt?: string;
  payload: {
    proposal: unknown;
    selectedCaseIds: string[];
    planTasks: { id: string; title: string; start: string; end: string }[];
  };
};

export function ViewActions({
  proposalId,
  versionId,
  createdAt,
  payload,
}: ViewActionsProps) {
  return (
    <div className="fixed bottom-6 right-6 flex items-center gap-3">
      <a
        href={`/edit?proposalId=${proposalId}&versionId=${versionId}`}
        className="rounded border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-900 shadow-sm hover:border-zinc-300"
      >
        Редактировать
      </a>
      <button
        type="button"
        className="rounded bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800"
        onClick={async () => {
          const response = await fetch("/api/pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...payload,
              fileName: createdAt
                ? `sbkpv_cmpr_${createdAt
                    .slice(0, 10)}_${createdAt.slice(11, 16).replace(":", "-")}.pdf`
                : undefined,
            }),
          });
          if (!response.ok) return;
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          if (createdAt) {
            const stamp = `${createdAt
              .slice(0, 10)}_${createdAt.slice(11, 16).replace(":", "-")}`;
            link.download = `sbkpv_cmpr_${stamp}.pdf`;
          }
          link.rel = "noopener";
          link.click();
          URL.revokeObjectURL(url);
        }}
      >
        Скачать PDF
      </button>
    </div>
  );
}
