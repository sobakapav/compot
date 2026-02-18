"use client";

type VersionItem = {
  versionId: string;
  createdAt: string;
  pdf?: boolean;
  source?: string;
};

type ProposalCardItem = {
  proposalId: string;
  clientName: string;
  serviceName?: string;
  clientLogoDataUrl?: string;
  markedVersionId?: string;
  latestVersionId?: string;
  versions: VersionItem[];
};

type ProposalCardProps = {
  item: ProposalCardItem;
  selectedVersionId: string;
  onSelectVersion: (versionId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onMark: () => void;
  onSample: () => void;
  onDownload: () => void;
  onView: () => void;
  formatDateTime: (value: string) => string;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLDivElement>) => void;
};

export function ProposalCard({
  item,
  selectedVersionId,
  onSelectVersion,
  onEdit,
  onDelete,
  onMark,
  onSample,
  onDownload,
  onView,
  formatDateTime,
  onDragStart,
  onDragOver,
  onDrop,
}: ProposalCardProps) {
  const isMarked = selectedVersionId === item.markedVersionId;

  return (
    <div
      className="relative"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {item.clientLogoDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.clientLogoDataUrl}
          alt="logo"
          className="absolute top-1/2 h-6 w-6 -translate-y-1/2 object-contain"
          style={{ left: "-34px" }}
        />
      )}
      <div className="rounded border border-zinc-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-zinc-900">
              {item.clientName || "Без клиента"} —{" "}
              {item.serviceName || "Без услуги"}
            </span>
            <select
              className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700"
              value={selectedVersionId}
              onChange={(event) => onSelectVersion(event.target.value)}
            >
              {item.versions.map((version) => {
                const marked = version.versionId === item.markedVersionId;
                return (
                  <option
                    key={version.versionId}
                    value={version.versionId}
                    style={{
                      fontWeight: version.pdf ? 600 : 400,
                    }}
                  >
                    {formatDateTime(version.createdAt)}
                    {version.pdf ? " [ PDF ]" : ""}
                    {marked ? " [ актуальная ]" : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#0E509E]">
            <button type="button" className="underline" onClick={onEdit}>
              <span className="mr-1 inline-flex text-zinc-900 translate-y-[2px]">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </span>
              Редактировать
            </button>
            <button type="button" className="underline" onClick={onDelete}>
              <span className="mr-1 inline-flex text-zinc-900 translate-y-[2px]">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </span>
              Удалить
            </button>
            <button
              type="button"
              className={`${
                isMarked ? "text-zinc-400" : "underline"
              }`}
              onClick={isMarked ? undefined : onMark}
              disabled={isMarked}
            >
              <span className="mr-1 inline-flex text-zinc-900 translate-y-[2px]">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 17l-4 2 1-4-3-3 4-.5L12 7l2 4.5 4 .5-3 3 1 4Z" />
                </svg>
              </span>
              Пометить как актуальную
            </button>
            <button type="button" className="underline" onClick={onSample}>
              <span className="mr-1 inline-flex text-zinc-900 translate-y-[2px]">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <rect x="2" y="2" width="13" height="13" rx="2" />
                </svg>
              </span>
              Использовать как образец
            </button>
            <button type="button" className="underline" onClick={onDownload}>
              <span className="mr-1 inline-flex text-zinc-900 translate-y-[2px]">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
              </span>
              Скачать PDF
            </button>
            <button type="button" className="underline" onClick={onView}>
              <span className="mr-1 inline-flex text-zinc-900 translate-y-[2px]">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </span>
              Посмотреть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
