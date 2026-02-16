"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Proposal } from "../lib/schema";

type ProposalHistoryItem = {
  id: string;
  createdAt: string;
  clientName: string;
  serviceName?: string;
};

const defaultValues: Proposal = {
  clientName: "",
  serviceName: "",
  serviceId: "",
  clientLogoDataUrl: "",
  summary: "",
  scope: "",
  timeline: "",
  price: "",
  nuances: "",
  assumptions: "",
  deliverables: "",
  contacts: "",
  validUntil: "",
};

type ProposalField = keyof Proposal;

const blocks = [
  { id: "summary", label: "Бизнес-задача", field: "summary" },
  { id: "scope", label: "Объем работ", field: "scope" },
  { id: "timeline", label: "Сроки", field: "timeline" },
  { id: "price", label: "Стоимость", field: "price" },
  { id: "deliverables", label: "Результаты", field: "deliverables" },
  { id: "nuances", label: "Нюансы", field: "nuances" },
  { id: "assumptions", label: "Предпосылки", field: "assumptions" },
  { id: "contacts", label: "Контакты", field: "contacts" },
  { id: "validUntil", label: "Действует до", field: "validUntil" },
] as const;

type ServiceItem = {
  id: string;
  title: string;
  link?: string;
};

const useEditable = (value: string) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
  }, [value]);
  return ref;
};

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ProposalHistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("summary");
  const [proposal, setProposal] = useState<Proposal>(defaultValues);
  const [activeField, setActiveField] = useState<ProposalField | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);

  const labelClass =
    "text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-400";
  const editableClass =
    "w-full cursor-text text-[15px] leading-7 text-zinc-900 outline-none";

  const onSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const historyResponse = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proposal),
      });
      if (!historyResponse.ok) {
        throw new Error("Failed to store proposal");
      }

      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proposal),
      });
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "proposal.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const requiredMark = useMemo(() => <span className="text-red-500">*</span>, []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch("/api/proposals");
        if (!response.ok) return;
        const data = await response.json();
        setHistory(data.items ?? []);
      } catch {
        return;
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await fetch("/api/services");
        if (!response.ok) return;
        const data = await response.json();
        setServices(data.items ?? []);
      } catch {
        return;
      }
    };
    loadServices();
  }, []);

  const applyBlock = async () => {
    if (!selectedHistoryId) return;
    const response = await fetch(`/api/proposals/${selectedHistoryId}`);
    if (!response.ok) return;
    const data = await response.json();
    const proposal: Proposal | undefined = data?.item?.proposal;
    if (!proposal) return;

    const field = selectedBlock as ProposalField;
    setProposal((prev) => ({
      ...prev,
      [field]: proposal[field] ?? "",
    }));
  };

  const updateField = (field: ProposalField, value: string) => {
    setProposal((prev) => ({ ...prev, [field]: value }));
  };

  const controlMap: Record<ProposalField, { history: boolean }> = {
    clientName: { history: false },
    serviceName: { history: false },
    serviceId: { history: false },
    clientLogoDataUrl: { history: false },
    summary: { history: true },
    scope: { history: true },
    timeline: { history: true },
    price: { history: true },
    deliverables: { history: true },
    nuances: { history: true },
    assumptions: { history: true },
    contacts: { history: true },
    validUntil: { history: true },
  };
  const showHistory = activeField
    ? controlMap[activeField]?.history
    : true;

  const clientRef = useEditable(proposal.clientName);
  const serviceRef = useEditable(proposal.serviceName);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100">
      <main className="mx-auto flex w-full max-w-6xl gap-8 px-6 py-10">
        <section className="proposal-page w-full max-w-[840px] rounded-[32px] bg-white px-12 py-14 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.55)]">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4 border-b border-zinc-200 pb-8">
              <div className="proposal-headline flex items-center gap-2 text-[18px] text-zinc-900 whitespace-nowrap overflow-visible">
                <span>Коммерческое предложение на</span>
                <span
                  ref={serviceRef}
                  className="inline-flex flex-none items-center border-b border-transparent focus:border-zinc-300"
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="услугу"
                  onFocus={() => setActiveField("serviceName")}
                  onInput={(event) =>
                    updateField(
                      "serviceName",
                      event.currentTarget.textContent ?? ""
                    )
                  }
                />
                <span>для компании</span>
                <span className="flex min-w-[200px] flex-none items-center gap-2">
                  <span className="flex h-6 items-center justify-center overflow-hidden bg-white px-2 text-[9px] uppercase tracking-[0.2em] text-zinc-400">
                    {proposal.clientLogoDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={proposal.clientLogoDataUrl}
                        alt="logo"
                        className="h-full w-auto object-contain"
                      />
                    ) : (
                      "Лого"
                    )}
                  </span>
                  <span
                    ref={clientRef}
                    className="inline-flex flex-none items-center border-b border-transparent focus:border-zinc-300"
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder="название компании"
                    onFocus={() => setActiveField("clientName")}
                    onInput={(event) =>
                      updateField(
                        "clientName",
                        event.currentTarget.textContent ?? ""
                      )
                    }
                  />
                </span>
              </div>
            </div>

            <section className="flex flex-col gap-3">
              <div className={labelClass}>Бизнес-задача {requiredMark}</div>
              <div
                ref={useEditable(proposal.summary)}
                className={editableClass}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Опиши бизнес-задачу..."
                onFocus={() => setActiveField("summary")}
                onInput={(event) =>
                  updateField("summary", event.currentTarget.textContent ?? "")
                }
              />
            </section>

            <section className="flex flex-col gap-3">
              <div className={labelClass}>Объем работ {requiredMark}</div>
              <div
                ref={useEditable(proposal.scope)}
                className={editableClass}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Опиши объем работ..."
                onFocus={() => setActiveField("scope")}
                onInput={(event) =>
                  updateField("scope", event.currentTarget.textContent ?? "")
                }
              />
            </section>

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <div className={labelClass}>Сроки {requiredMark}</div>
                <div
                  ref={useEditable(proposal.timeline)}
                  className={editableClass}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Сроки..."
                  onFocus={() => setActiveField("timeline")}
                  onInput={(event) =>
                    updateField("timeline", event.currentTarget.textContent ?? "")
                  }
                />
              </div>
              <div className="flex flex-col gap-3">
                <div className={labelClass}>Стоимость {requiredMark}</div>
                <div
                  ref={useEditable(proposal.price)}
                  className={editableClass}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Стоимость..."
                  onFocus={() => setActiveField("price")}
                  onInput={(event) =>
                    updateField("price", event.currentTarget.textContent ?? "")
                  }
                />
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <div className={labelClass}>Результаты</div>
                <div
                  ref={useEditable(proposal.deliverables ?? "")}
                  className={editableClass}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Результаты..."
                  onFocus={() => setActiveField("deliverables")}
                  onInput={(event) =>
                    updateField(
                      "deliverables",
                      event.currentTarget.textContent ?? ""
                    )
                  }
                />
              </div>
              <div className="flex flex-col gap-3">
                <div className={labelClass}>Нюансы</div>
                <div
                  ref={useEditable(proposal.nuances ?? "")}
                  className={editableClass}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Нюансы..."
                  onFocus={() => setActiveField("nuances")}
                  onInput={(event) =>
                    updateField("nuances", event.currentTarget.textContent ?? "")
                  }
                />
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <div className={labelClass}>Предпосылки</div>
                <div
                  ref={useEditable(proposal.assumptions ?? "")}
                  className={editableClass}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Предпосылки..."
                  onFocus={() => setActiveField("assumptions")}
                  onInput={(event) =>
                    updateField("assumptions", event.currentTarget.textContent ?? "")
                  }
                />
              </div>
              <div className="flex flex-col gap-3">
                <div className={labelClass}>Контакты</div>
                <div
                  ref={useEditable(proposal.contacts ?? "")}
                  className={editableClass}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Контакты..."
                  onFocus={() => setActiveField("contacts")}
                  onInput={(event) =>
                    updateField("contacts", event.currentTarget.textContent ?? "")
                  }
                />
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <div className={labelClass}>Действует до</div>
              <div
                ref={useEditable(proposal.validUntil ?? "")}
                className={editableClass}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Действует до..."
                onFocus={() => setActiveField("validUntil")}
                onInput={(event) =>
                  updateField("validUntil", event.currentTarget.textContent ?? "")
                }
              />
            </section>
          </div>
        </section>

        <aside className="w-full max-w-xs">
          <div className="sticky top-6 flex flex-col gap-6">
            {showHistory && (
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-semibold text-zinc-900">История</div>
                <div className="mt-4 flex flex-col gap-3 text-sm">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Предложение
                    </span>
                    <select
                      className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                      value={selectedHistoryId}
                      onChange={(event) =>
                        setSelectedHistoryId(event.target.value)
                      }
                    >
                      <option value="">Выбрать предложение</option>
                    {history.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.clientName} — {item.serviceName ?? "Без услуги"}
                      </option>
                    ))}
                  </select>
                </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Блок
                    </span>
                    <select
                      className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                      value={selectedBlock}
                      onChange={(event) => setSelectedBlock(event.target.value)}
                    >
                    {blocks.map((block) => (
                      <option key={block.id} value={block.field}>
                        {block.label}
                      </option>
                    ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={applyBlock}
                    className="rounded-md border border-zinc-200 bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
                  >
                    Применить блок
                  </button>
                </div>
                {history.length === 0 && (
                  <p className="mt-3 text-xs text-zinc-500">
                    Нет сохраненных предложений. Сформируй PDF, чтобы добавить в
                    историю.
                  </p>
                )}
              </section>
            )}

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Услуга
                  <select
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-normal uppercase tracking-normal text-zinc-900 focus:border-zinc-900 focus:outline-none"
                    value={proposal.serviceId}
                    onChange={(event) => {
                      const id = event.target.value;
                      const service = services.find((item) => item.id === id);
                      setProposal((prev) => ({
                        ...prev,
                        serviceId: id,
                        serviceName: service?.title ?? prev.serviceName,
                      }));
                    }}
                  >
                    <option value="">Выбрать услугу</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Логотип
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full cursor-pointer rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-normal tracking-normal text-zinc-900 file:mr-3 file:rounded file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-zinc-800"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setProposal((prev) => ({
                          ...prev,
                          clientLogoDataUrl: String(reader.result ?? ""),
                        }));
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-zinc-900">Экспорт</div>
              <div className="mt-4 flex flex-col gap-3">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={onSubmit}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Генерация..." : "Сгенерировать PDF"}
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={async () => {
                    setIsLoading(true);
                    setError(null);
                    try {
                      const response = await fetch("/api/proposals", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(proposal),
                      });
                      if (!response.ok) {
                        throw new Error("Failed to store proposal");
                      }
                    } catch (err) {
                      setError("Не удалось сохранить предложение.");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Сохранить черновик
                </button>
                {error && <span className="text-xs text-red-500">{error}</span>}
              </div>
            </section>
          </div>
        </aside>
      </main>
    </div>
  );
}
