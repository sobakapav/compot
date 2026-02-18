"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ProposalListItem = {
  proposalId: string;
  latestVersionId: string;
  latestCreatedAt: string;
  clientName: string;
  serviceName?: string;
  versions: {
    versionId: string;
    createdAt: string;
    pdf?: boolean;
    source?: string;
  }[];
};

const formatDate = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
};

const formatDateTime = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const datePart = date.toISOString().slice(0, 10);
  const timePart = date.toISOString().slice(11, 19);
  return `${datePart} ${timePart}`;
};

export default function AllProposalsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ProposalListItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/proposals");
        if (!response.ok) return;
        const data = await response.json();
        setItems(data.items ?? []);
      } catch {
        return;
      }
    };
    load();
  }, []);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) =>
      (b.latestCreatedAt || "").localeCompare(a.latestCreatedAt || "")
    );
  }, [items]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 px-10 py-12">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Все предложения
          </h1>
          <button
            type="button"
            className="rounded border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 hover:border-zinc-300"
            onClick={() => router.push("/new")}
          >
            Новое предложение
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {sorted.length === 0 && (
            <div className="rounded border border-dashed border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
              Пока нет сохранённых предложений.
            </div>
          )}
          {sorted.map((item) => (
            <div
              key={item.proposalId}
              className="rounded border border-zinc-200 bg-white px-4 py-3"
            >
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  className="text-left text-sm font-semibold text-[#0E509E] underline hover:text-[#0B3F7C]"
                  onClick={() =>
                    router.push(
                      `/edit?proposalId=${item.proposalId}&versionId=${item.latestVersionId}`
                    )
                  }
                >
                  {item.clientName || "Без клиента"} —{" "}
                  {item.serviceName || "Без услуги"}
                  {item.latestCreatedAt && (
                    <span className="ml-2 text-xs font-normal text-zinc-400">
                      {formatDate(item.latestCreatedAt)}
                    </span>
                  )}
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                <span>Версии:</span>
                <select
                  className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700"
                  value={item.latestVersionId}
                  onChange={(event) =>
                    router.push(
                      `/edit?proposalId=${item.proposalId}&versionId=${event.target.value}`
                    )
                  }
                >
                  {item.versions.map((version) => (
                    <option
                      key={version.versionId}
                      value={version.versionId}
                      style={{
                        fontWeight: version.pdf ? 600 : 400,
                      }}
                    >
                      {formatDateTime(version.createdAt)}
                      {version.pdf ? " · PDF" : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="ml-auto text-xs text-[#0E509E] underline"
                  onClick={() =>
                    router.push(`/view?proposalId=${item.proposalId}`)
                  }
                >
                  Посмотреть
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
