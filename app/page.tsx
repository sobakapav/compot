"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProposalCard } from "./components/ProposalCard";

type VersionItem = {
  versionId: string;
  createdAt: string;
  pdf?: boolean;
};

type ProposalSummary = {
  proposalId: string;
  lastEditedVersionId: string;
  lastEditedAt: string;
  markedVersionId: string;
  latestVersionId: string;
  clientName: string;
  serviceName?: string;
  clientLogoDataUrl?: string;
  versions: VersionItem[];
};

const formatDateTime = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const datePart = date.toISOString().slice(0, 10);
  const timePart = date.toISOString().slice(11, 16);
  return `${datePart} ${timePart}`;
};

export default function Home() {
  const [latest, setLatest] = useState<ProposalSummary | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/proposals");
        if (!response.ok) return;
        const data = await response.json();
        const items: ProposalSummary[] = data.items ?? [];
        const sorted = [...items].sort((a, b) =>
          (b.lastEditedAt || "").localeCompare(a.lastEditedAt || "")
        );
        const item = sorted[0] ?? null;
        setLatest(item);
        if (item) {
          setSelectedVersion(item.markedVersionId || item.latestVersionId);
        }
      } catch {
        return;
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 px-10 py-12">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Compot</h1>
        {latest && (
          <ProposalCard
            item={latest}
            selectedVersionId={selectedVersion}
            onSelectVersion={(versionId) => setSelectedVersion(versionId)}
            onEdit={() =>
              (window.location.href = `/edit?proposalId=${latest.proposalId}&versionId=${selectedVersion}`)
            }
            onDelete={() => {
              const label = formatDateTime(
                latest.versions.find((v) => v.versionId === selectedVersion)
                  ?.createdAt ?? selectedVersion
              );
              const name = `${latest.clientName || "Без клиента"} — ${
                latest.serviceName || "Без услуги"
              }`;
              const ok = window.confirm(
                `Вы уверены, что хотите удалить версию ${label} предложения ${name}?`
              );
              if (!ok) return;
              fetch(
                `/api/proposals/${latest.proposalId}?versionId=${selectedVersion}`,
                { method: "DELETE" }
              ).then(() => window.location.reload());
            }}
            onMark={() => {
              fetch(`/api/proposals/${latest.proposalId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ versionId: selectedVersion }),
              }).then(() => window.location.reload());
            }}
            onSample={() => {
              fetch(
                `/api/proposals/${latest.proposalId}?versionId=${selectedVersion}`
              )
                .then((response) => response.json())
                .then((data) =>
                  fetch("/api/proposals", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      proposal: data?.item?.proposal,
                      source: "create",
                      selectedCaseIds: data?.item?.selectedCaseIds ?? [],
                      planTasks: data?.item?.planTasks ?? [],
                    }),
                  })
                )
                .then((response) => response.json())
                .then((created) => {
                  if (created?.proposalId && created?.versionId) {
                    window.location.href = `/edit?proposalId=${created.proposalId}&versionId=${created.versionId}`;
                  }
                });
            }}
            onDownload={() => {
              fetch(
                `/api/proposals/${latest.proposalId}?versionId=${selectedVersion}`
              )
                .then((response) => response.json())
                .then((data) =>
                  fetch("/api/pdf", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      proposal: data?.item?.proposal,
                      selectedCaseIds: data?.item?.selectedCaseIds ?? [],
                      planTasks: data?.item?.planTasks ?? [],
                      fileName: data?.item?.createdAt
                        ? `sbkpv_cmpr_${data.item.createdAt
                            .slice(0, 10)}_${data.item.createdAt
                            .slice(11, 16)
                            .replace(":", "-")}.pdf`
                        : undefined,
                    }),
                  })
                )
                .then((response) => response.blob())
                .then((blob) => {
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  const createdAt =
                    latest.versions.find(
                      (version) => version.versionId === selectedVersion
                    )?.createdAt ?? "";
                  if (createdAt) {
                    const stamp = `${createdAt
                      .slice(0, 10)}_${createdAt
                      .slice(11, 16)
                      .replace(":", "-")}`;
                    link.download = `sbkpv_cmpr_${stamp}.pdf`;
                  }
                  link.rel = "noopener";
                  link.click();
                  URL.revokeObjectURL(url);
                });
            }}
            onView={() =>
              (window.location.href = `/view?proposalId=${latest.proposalId}&versionId=${selectedVersion}`)
            }
            formatDateTime={formatDateTime}
          />
        )}
        <div className="flex flex-row gap-3 text-sm">
          <Link
            href="/new"
            className="w-fit rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800"
          >
            Новое предложение
          </Link>
          <Link
            href="/all"
            className="w-fit rounded border border-zinc-200 bg-white px-4 py-2 text-zinc-900 hover:border-zinc-300"
          >
            Все предложения
          </Link>
        </div>
      </div>
    </div>
  );
}
