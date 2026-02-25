"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProposalCard } from "../components/ProposalCard";

type ProposalListItem = {
  proposalId: string;
  latestVersionId: string;
  latestCreatedAt: string;
  markedVersionId: string;
  markedCreatedAt: string;
  lastEditedVersionId: string;
  lastEditedAt: string;
  clientName: string;
  serviceName?: string;
  clientLogoDataUrl?: string;
  versions: {
    versionId: string;
    createdAt: string;
    pdf?: boolean;
    source?: string;
  }[];
};

const formatDateTime = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const datePart = date.toISOString().slice(0, 10);
  const timePart = date.toISOString().slice(11, 16);
  return `${datePart} ${timePart}`;
};

export default function AllProposalsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ProposalListItem[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<
    Record<string, string>
  >({});
  const [pushLoading, setPushLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  const getVersionLabel = (item: ProposalListItem, versionId: string) => {
    const version = item.versions.find((v) => v.versionId === versionId);
    if (!version) return versionId;
    return formatDateTime(version.createdAt);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/proposals");
        if (!response.ok) return;
        const data = await response.json();
        setItems(data.items ?? []);
        const defaults: Record<string, string> = {};
        for (const item of data.items ?? []) {
          if (item?.proposalId) {
            defaults[item.proposalId] =
              item.markedVersionId || item.latestVersionId;
          }
        }
        setSelectedVersions(defaults);
      } catch {
        return;
      }
    };
    load();
  }, []);

  const onPushAll = async () => {
    setPushLoading(true);
    setPushStatus(null);
    try {
      const response = await fetch("/api/data/push", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Push failed");
      }
      if (payload?.status === "pushed") {
        setPushStatus("Данные отправлены на GitHub.");
        return;
      }
      if (payload?.status === "clean") {
        setPushStatus("Нет изменений для отправки.");
        return;
      }
      if (payload?.status === "skipped") {
        setPushStatus("Отправка данных не настроена.");
        return;
      }
      if (payload?.status === "failed") {
        throw new Error(payload?.error ?? "Push failed");
      }
      setPushStatus("Не удалось определить результат отправки данных.");
    } catch {
      setPushStatus("Не удалось отправить данные на GitHub.");
    } finally {
      setPushLoading(false);
    }
  };

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
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pushLoading}
              className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onPushAll}
            >
              {pushLoading ? "Сохранение..." : "Сохранить все в облаке"}
            </button>
            <button
              type="button"
              className="rounded border border-zinc-900 bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
              onClick={() => router.push("/new")}
            >
              Новое предложение
            </button>
          </div>
        </div>
        {pushStatus && (
          <div className="text-sm text-zinc-500">{pushStatus}</div>
        )}
        <div className="flex flex-col gap-3">
          {sorted.length === 0 && (
            <div className="rounded border border-dashed border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
              Пока нет сохранённых предложений.
            </div>
          )}
          {sorted.map((item) => {
            const selected =
              selectedVersions[item.proposalId] ??
              item.markedVersionId ??
              item.latestVersionId;
            return (
              <ProposalCard
                key={item.proposalId}
                item={item}
                selectedVersionId={selected}
                onSelectVersion={(versionId) =>
                  setSelectedVersions((prev) => ({
                    ...prev,
                    [item.proposalId]: versionId,
                  }))
                }
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", item.proposalId);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={async (event) => {
                  event.preventDefault();
                  const sourceId = event.dataTransfer.getData("text/plain");
                  const targetId = item.proposalId;
                  if (!sourceId || sourceId === targetId) return;
                  await fetch("/api/proposals/merge", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sourceId, targetId }),
                  });
                  const response = await fetch("/api/proposals");
                  if (!response.ok) return;
                  const data = await response.json();
                  setItems(data.items ?? []);
                  const defaults: Record<string, string> = {};
                  for (const proposal of data.items ?? []) {
                    defaults[proposal.proposalId] =
                      proposal.markedVersionId || proposal.latestVersionId;
                  }
                  setSelectedVersions(defaults);
                }}
                onEdit={() =>
                  router.push(
                    `/edit?proposalId=${item.proposalId}&versionId=${selected}`
                  )
                }
                onDelete={async () => {
                  const label = getVersionLabel(item, selected);
                  const name = `${item.clientName || "Без клиента"} — ${
                    item.serviceName || "Без услуги"
                  }`;
                  const ok = window.confirm(
                    `Вы уверены, что хотите удалить версию ${label} предложения ${name}?`
                  );
                  if (!ok) return;
                  await fetch(
                    `/api/proposals/${item.proposalId}?versionId=${selected}`,
                    { method: "DELETE" }
                  );
                  const response = await fetch("/api/proposals");
                  if (!response.ok) return;
                  const data = await response.json();
                  setItems(data.items ?? []);
                  const defaults: Record<string, string> = {};
                  for (const proposal of data.items ?? []) {
                    defaults[proposal.proposalId] =
                      proposal.markedVersionId || proposal.latestVersionId;
                  }
                  setSelectedVersions(defaults);
                }}
                onMark={async () => {
                  await fetch(`/api/proposals/${item.proposalId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ versionId: selected }),
                  });
                  const response = await fetch("/api/proposals");
                  if (!response.ok) return;
                  const data = await response.json();
                  setItems(data.items ?? []);
                  const defaults: Record<string, string> = {};
                  for (const proposal of data.items ?? []) {
                    defaults[proposal.proposalId] =
                      proposal.markedVersionId || proposal.latestVersionId;
                  }
                  setSelectedVersions(defaults);
                }}
                onSample={async () => {
                  const response = await fetch(
                    `/api/proposals/${item.proposalId}?versionId=${selected}`
                  );
                  if (!response.ok) return;
                  const data = await response.json();
                  const proposal = data?.item?.proposal;
                  if (!proposal) return;
                  const createResponse = await fetch("/api/proposals", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      proposal,
                      source: "create",
                      selectedCaseIds: data?.item?.selectedCaseIds ?? [],
                      planTasks: data?.item?.planTasks ?? [],
                    }),
                  });
                  if (!createResponse.ok) return;
                  const created = await createResponse.json();
                  if (created?.proposalId && created?.versionId) {
                    router.push(
                      `/edit?proposalId=${created.proposalId}&versionId=${created.versionId}`
                    );
                  }
                }}
                onDownload={async () => {
                  const response = await fetch(
                    `/api/proposals/${item.proposalId}?versionId=${selected}`
                  );
                  if (!response.ok) return;
                  const data = await response.json();
                  const createdAt = data?.item?.createdAt;
                  const fileName = createdAt
                    ? `sbkpv_cmpr_${createdAt
                        .slice(0, 10)}_${createdAt
                        .slice(11, 16)
                        .replace(":", "-")}.pdf`
                    : undefined;
                  const payload = {
                    proposal: data?.item?.proposal,
                    selectedCaseIds: data?.item?.selectedCaseIds ?? [],
                    planTasks: data?.item?.planTasks ?? [],
                    fileName,
                  };
                  const pdfResponse = await fetch("/api/pdf", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  if (!pdfResponse.ok) return;
                  const blob = await pdfResponse.blob();
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  if (fileName) {
                    link.download = fileName;
                  }
                  link.rel = "noopener";
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                onView={() =>
                  router.push(
                    `/view?proposalId=${item.proposalId}&versionId=${selected}`
                  )
                }
                formatDateTime={formatDateTime}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
