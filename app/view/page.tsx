import fs from "fs/promises";
import path from "path";
import type { Proposal } from "../../lib/schema";
import { ViewActions } from "../components/ViewActions";
import { getProposal } from "../../lib/storage";

type CaseItem = {
  id: string;
  title: string;
  clientName: string;
  preview: string;
  previewImageFile?: string;
  previewImageSourceUrl?: string;
  link: string;
};

type PlanTask = {
  id: string;
  stage?: string;
  iterations?: string;
  hours?: string;
  days?: string;
  cost?: string;
  results?: string;
  title?: string;
  start?: string;
  end?: string;
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
  headerCommentTitle: "",
  headerComment: "",
  headerCommentVisible: false,
  nuancesTitle: "",
  nuances: "Детальный план производства — в отдельном документе",
  nuancesVisible: true,
  tasksCommentTitle: "",
  tasksComment: "",
  tasksCommentVisible: false,
  assumptions: "",
  deliverables: "",
  contactEmail: "pro@sobakapav.ru",
  contactTelegram: "@sobakapavpro",
  contactPhone: "+7 (495) 191-92-81",
  validUntil: "",
  hourlyRate: "4000",
  hourlyRateFrozen: false,
  casesRows: 1,
  casesTitle1: "Похожие проекты",
  casesTitle2: "Похожие проекты 2",
  casesCommentTitle: "",
  casesComment: "",
  casesCommentVisible: false,
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const renderDigitHtml = (value: string) =>
  escapeHtml(value).replace(
    /\d+(?:[.,\-–]\d+)+|\d+/g,
    '<span class="digit">$&</span>'
  );

const formatCost = (value: string) => {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const splitLinkSlug = (link: string) => {
  if (!link) return { base: "", slug: "" };
  const clean = link.replace(/\/$/, "");
  const parts = clean.split("/");
  const slug = parts.pop() ?? "";
  const base = parts.length ? `${parts.join("/")}/` : "";
  return { base, slug };
};

const formatCaseLink = (link?: string) => {
  if (!link) return { base: "", slug: "" };
  const { base, slug } = splitLinkSlug(link);
  const portfolioBase = "https://sobakapav.ru/portfolio/";
  if (link.startsWith(portfolioBase)) {
    return { base: "sbkpv.ru/", slug };
  }
  return { base, slug };
};

const renderResultsHtml = (value: string) => {
  if (/<ul|<li/i.test(value)) return value;
  const trimmed = value.trim();
  if (!trimmed) return "";
  const lines = trimmed.split(/\n+/).filter(Boolean);
  if (lines.length <= 1) return escapeHtml(trimmed);
  return `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
};

const decodeHtmlEntities = (value: string) =>
  value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");

const loadCases = async (): Promise<CaseItem[]> => {
  try {
    const baseDir = path.join(process.cwd(), "data", "cases");
    const indexPath = path.join(baseDir, "index.json");
    const raw = await fs.readFile(indexPath, "utf-8");
    const data = JSON.parse(raw) as { items?: { id: string }[] };
    const items = data.items ?? [];
    const results = await Promise.all(
      items.map(async (item) => {
        try {
          const casePath = path.join(baseDir, item.id, "case.json");
          const caseRaw = await fs.readFile(casePath, "utf-8");
          return JSON.parse(caseRaw) as CaseItem;
        } catch {
          return null;
        }
      })
    );
    return results.filter(Boolean) as CaseItem[];
  } catch {
    return [];
  }
};

type ViewPageProps = {
  searchParams?: Promise<{ proposalId?: string; versionId?: string }>;
};

export default async function ViewPage({ searchParams }: ViewPageProps) {
  const resolved = searchParams ? await searchParams : undefined;
  const proposalId = resolved?.proposalId ?? "";
  const versionId = resolved?.versionId;
  const record = proposalId ? await getProposal(proposalId, versionId) : null;
  const proposal = record?.proposal ?? defaultValues;
  const selectedCaseIds = record?.selectedCaseIds ?? [];
  const planTasks = (record?.planTasks ?? []) as PlanTask[];
  const cases = await loadCases();
  const casesPerRow = 5;
  const casesRows = proposal.casesRows === 2 ? 2 : 1;
  const caseRow1 = selectedCaseIds.slice(0, casesPerRow);
  const caseRow2 = selectedCaseIds.slice(casesPerRow, casesPerRow * 2);
  const casesTitle1 = proposal.casesTitle1 || defaultValues.casesTitle1;
  const casesTitle2 = proposal.casesTitle2 || defaultValues.casesTitle2;

  const normalizedPlan = planTasks.map((task) => ({
    stage: task.stage ?? task.title ?? "",
    iterations: task.iterations ?? "1",
    hours: task.hours ?? "",
    days: task.days ?? "",
    cost: task.cost ?? "",
    results: task.results ?? "",
  }));

  const sumPlanHours = normalizedPlan.reduce((sum, task) => {
    const hours = Number(String(task.hours ?? "").replace(/[^\d]/g, "")) || 0;
    const iterations =
      Number(String(task.iterations ?? "1").replace(/[^\d]/g, "")) || 1;
    return sum + hours * iterations;
  }, 0);

  const sumPlanCost = normalizedPlan.reduce((sum, task) => {
    const cost = Number(String(task.cost ?? "").replace(/[^\d]/g, "")) || 0;
    return sum + cost;
  }, 0);

  const contactPhone = proposal.contactPhone || defaultValues.contactPhone;
  const contactEmail = proposal.contactEmail || defaultValues.contactEmail;
  const contactTelegram = proposal.contactTelegram || defaultValues.contactTelegram;
  const validUntil = proposal.validUntil || defaultValues.validUntil;

  const payloadPlanTasks = planTasks.map((task) => ({
    id: task.id,
    title: task.title ?? task.stage ?? "",
    start: task.start ?? "",
    end: task.end ?? "",
  }));

  const renderCaseCards = (rowIds: string[]) => (
    <div className="grid grid-cols-5 gap-2 leading-[1]">
      {rowIds.map((id) => {
        const item = cases.find((c) => c.id === id);
        if (!item) return null;
        const { base, slug } = formatCaseLink(item.link);
        return (
          <div
            key={item.id}
            className="group relative flex min-h-[140px] flex-col gap-2 rounded-xl bg-white pt-0 pb-0 pr-3 pl-0"
          >
            {item.previewImageFile || item.previewImageSourceUrl ? (
              <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded bg-zinc-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewImageFile || item.previewImageSourceUrl}
                  alt={item.title}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="text-[10px] text-zinc-500">
                {item.preview || "—"}
              </div>
            )}
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
              {item.clientName || "Клиент"}
            </div>
            <div className="text-[12px] font-medium text-zinc-900">
              {item.title}
            </div>
            {item.link && (
              <span className="text-[10px] text-[#0E509E] underline">
                {base}
                <span className="font-semibold">{slug}</span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 px-10 py-12">
      <a
        href="/all"
        className="mb-6 inline-block text-xs text-[#0E509E] underline"
      >
        &lt;&lt; Назад к списку предложений
      </a>
      <section className="proposal-page relative w-full max-w-[794px] rounded-none bg-white px-12 pb-20 pt-14 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.55)]">
        <div className="flex flex-col gap-0">
          <section className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-5">
            <div className="proposal-headline text-[24px] text-zinc-900 leading-[1.2] md:col-span-3">
              <span>Коммерческое предложение</span>
              <br />
              <span>на </span>
              <span className="font-semibold">{proposal.serviceName}</span>
              <br />
              <span>для </span>
              <span className="inline-flex items-baseline gap-1">
                <span>компании&nbsp;</span>
                {proposal.clientLogoDataUrl && (
                  <span className="inline-flex h-6 items-center justify-center overflow-hidden bg-white text-[9px] uppercase tracking-[0.2em] text-zinc-400 align-middle translate-y-[6px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proposal.clientLogoDataUrl}
                      alt="logo"
                      className="h-full w-auto object-contain"
                    />
                  </span>
                )}
                <span className="font-semibold">{proposal.clientName}</span>
              </span>
            </div>
            <div className="flex flex-col gap-1 md:col-span-1 md:col-start-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-400 leading-none mt-[6px]">
                Сроки
              </div>
              <div
                className="digit-field text-[15px] text-zinc-900"
                dangerouslySetInnerHTML={{
                  __html: renderDigitHtml(proposal.timeline || ""),
                }}
              />
            </div>
            <div className="flex flex-col gap-1 md:col-span-1 md:col-start-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-400 leading-none mt-[6px]">
                Стоимость
              </div>
              <div className="flex items-end">
                <div
                  className="digit-field text-[15px] text-zinc-900"
                  dangerouslySetInnerHTML={{
                    __html: renderDigitHtml(proposal.price || ""),
                  }}
                />
              </div>
            </div>
          </section>

          {proposal.headerCommentVisible && (
            <section className="mb-6 flex flex-col gap-0">
              <div className="grid grid-cols-1 md:grid-cols-5 proposal-col-gap-8 proposal-row-gap-0">
                <div className="hidden md:block md:col-span-2" />
                <div className="flex flex-col gap-1 md:col-span-3 md:col-start-3">
                  {proposal.headerCommentTitle && (
                    <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-400">
                      {proposal.headerCommentTitle}
                    </div>
                  )}
                  <div
                    className="rich-field text-[15px] text-zinc-900 leading-[1.2]"
                    dangerouslySetInnerHTML={{
                      __html: decodeHtmlEntities(proposal.headerComment || ""),
                    }}
                  />
                </div>
              </div>
            </section>
          )}

          <section className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-5">
            <div className="flex flex-col gap-1 md:col-span-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-400 leading-[1] inline-flex items-baseline">
                Цель заказчика
              </div>
              <div
                className="rich-field w-full text-[15px] leading-[1.2] text-zinc-900"
                dangerouslySetInnerHTML={{
                  __html: decodeHtmlEntities(proposal.summary || ""),
                }}
              />
            </div>
            <div className="flex flex-col gap-1 md:col-span-3 md:col-start-3" style={{ transform: "translateY(-16px)" }}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-400 leading-[1] inline-flex items-baseline">
                <span>Задача</span>{" "}
                <img
                  src="/brand/sobaka-pavlova.png"
                  alt="Собака Павлова"
                  className="inline-block h-6 w-6 rounded-full object-cover"
                  style={{ marginLeft: 4, marginRight: 4, transform: "translateY(6px)" }}
                />{" "}
                <span>Собаки Павловой</span>
              </div>
              <div
                className="rich-field w-full text-[15px] leading-[1.2] text-zinc-900"
                dangerouslySetInnerHTML={{
                  __html: decodeHtmlEntities(proposal.scope || ""),
                }}
              />
            </div>
          </section>

          {proposal.tasksCommentVisible && (
            <section className="mb-6 flex flex-col gap-0">
              <div className="grid grid-cols-1 md:grid-cols-5 proposal-col-gap-8 proposal-row-gap-0">
                <div className="hidden md:block md:col-span-2" />
                <div className="flex flex-col gap-1 md:col-span-3 md:col-start-3">
                  {proposal.tasksCommentTitle && (
                    <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-400">
                      {proposal.tasksCommentTitle}
                    </div>
                  )}
                  <div
                    className="rich-field text-[15px] text-zinc-900 leading-[1.2]"
                    dangerouslySetInnerHTML={{
                      __html: decodeHtmlEntities(proposal.tasksComment || ""),
                    }}
                  />
                </div>
              </div>
            </section>
          )}

          <section className="mb-6 flex flex-col gap-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-400">
              Этапы и результаты работ
            </div>
            <div className="bg-white">
              <div className="flex flex-col gap-3">
                {normalizedPlan.map((task, index) => (
                  <div
                    key={`${task.stage}-${index}`}
                    className="grid items-baseline"
                    style={{
                      gridTemplateColumns:
                        "calc(40% + 3px - 6ch + 2ch) 4ch calc(2ch + 9px) 3ch 9ch 16px 1fr",
                      columnGap: "8px",
                    }}
                  >
                    <div className="text-sm text-zinc-900">
                      {index + 1}. <span className="font-semibold">{task.stage}</span>
                    </div>
                    <div className="text-sm text-right text-zinc-900">{task.hours}</div>
                    <div className="flex items-baseline gap-[1px] text-sm">
                      <span
                        style={{
                          color: "#95001B",
                          width: "8px",
                          lineHeight: "1.2",
                          display: "inline-block",
                        }}
                      >
                        {Number(task.iterations ?? "1") > 1 ? "×" : "\u00a0"}
                      </span>
                      <span
                        className={
                          Number(task.iterations ?? "1") > 1
                            ? "font-semibold"
                            : "text-white"
                        }
                        style={{
                          color:
                            Number(task.iterations ?? "1") > 1
                              ? "#95001B"
                              : "#ffffff",
                        }}
                      >
                        {task.iterations ?? "1"}
                      </span>
                    </div>
                    <div className="text-sm text-right text-zinc-500">{task.days}</div>
                    <div className="text-sm text-right text-zinc-900">
                      {formatCost(task.cost ?? "")}
                    </div>
                    <div />
                    <div
                      className="text-sm text-zinc-900"
                      dangerouslySetInnerHTML={{
                        __html: renderResultsHtml(task.results),
                      }}
                    />
                  </div>
                ))}
                <div
                  className="grid items-baseline"
                  style={{
                    gridTemplateColumns:
                      "calc(40% + 3px - 6ch + 2ch) 4ch calc(2ch + 9px) 3ch 9ch 16px 1fr",
                    columnGap: "8px",
                  }}
                >
                  <div />
                  <div className="flex w-full justify-end">
                    <span
                      className="inline-flex whitespace-nowrap px-2 py-0.5 text-sm text-white"
                      style={{
                        backgroundColor: "#19676C",
                        borderRadius: "6px",
                        marginRight: "-8px",
                      }}
                    >
                      {formatCost(String(sumPlanHours))}
                    </span>
                  </div>
                  <div />
                  <div />
                  <div className="flex w-full justify-end">
                    <span
                      className="inline-flex whitespace-nowrap px-2 py-0.5 text-sm text-white"
                      style={{
                        backgroundColor: "#19676C",
                        borderRadius: "6px",
                        marginRight: "-8px",
                      }}
                    >
                      {formatCost(String(sumPlanCost))}
                    </span>
                  </div>
                  <div />
                  <div />
                </div>
              </div>
            </div>
          </section>

          {proposal.nuancesVisible && (
            <section className="mb-6 flex flex-col gap-0">
              <div className="grid grid-cols-1 md:grid-cols-5 proposal-col-gap-8 proposal-row-gap-0">
                <div className="hidden md:block md:col-span-2" />
                <div className="flex flex-col gap-1 md:col-span-3 md:col-start-3">
                  {proposal.nuancesTitle && (
                    <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-400">
                      {proposal.nuancesTitle}
                    </div>
                  )}
                  <div
                    className="rich-field text-[15px] text-zinc-900 leading-[1.2]"
                    dangerouslySetInnerHTML={{
                      __html: decodeHtmlEntities(proposal.nuances || ""),
                    }}
                  />
                </div>
              </div>
            </section>
          )}

          <section className="mb-6 flex flex-col gap-0">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-400">
                  {casesTitle1}
                </div>
                {renderCaseCards(caseRow1)}
              </div>
              {casesRows === 2 && (
                <div className="flex flex-col gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-400">
                    {casesTitle2}
                  </div>
                  {renderCaseCards(caseRow2)}
                </div>
              )}
            </div>
          </section>

          {proposal.casesCommentVisible && (
            <section className="mb-6 flex flex-col gap-0">
              <div className="grid grid-cols-1 md:grid-cols-5 proposal-col-gap-8 proposal-row-gap-0">
                <div className="hidden md:block md:col-span-2" />
                <div className="flex flex-col gap-1 md:col-span-3 md:col-start-3">
                  {proposal.casesCommentTitle && (
                    <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-400">
                      {proposal.casesCommentTitle}
                    </div>
                  )}
                  <div
                    className="rich-field text-[15px] text-zinc-900 leading-[1.2]"
                    dangerouslySetInnerHTML={{
                      __html: decodeHtmlEntities(proposal.casesComment || ""),
                    }}
                  />
                </div>
              </div>
            </section>
          )}

          <section className="flex flex-col gap-2">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-5 md:items-end">
              <div className="flex flex-col gap-1 md:col-span-1 md:justify-end md:self-end">
                <div className="proposal-headline text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                  Коммерческое
                  <br />
                  предложение
                  <br />
                  действует
                  &nbsp;до
                  <br />
                  <span className="inline-flex whitespace-nowrap rounded bg-zinc-200 px-2 py-0.5 text-zinc-900 uppercase tracking-normal text-[12px] -ml-2">
                    {validUntil}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-0 md:col-span-2 md:col-start-3 md:justify-end md:self-end translate-y-[8px]">
                <div className="proposal-headline text-[24px] text-zinc-900 leading-[1.2]">
                  С уважением,
                </div>
                <div className="relative flex items-end text-zinc-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/sobaka-pavlova.png"
                    alt="Собака Павлова"
                    className="absolute -left-10 bottom-[2px] h-8 w-8 rounded-full object-cover"
                  />
                  <span className="proposal-headline text-[24px] font-semibold">
                    Собака Павлова
                  </span>
                </div>
              </div>
              <div className="flex flex-col md:col-span-1 md:col-start-5 md:justify-end md:self-end">
                <div className="text-[15px] text-zinc-900 leading-[1] mt-[14px]">
                  {contactPhone}
                </div>
                <div className="text-[15px] text-[#0E509E] underline leading-[1] mt-[2px]">
                  {contactEmail}
                </div>
                <div className="mt-[2px] flex items-center gap-1 text-[15px] text-zinc-700 leading-[1]">
                  <span>tg</span>
                  <span className="text-[#0E509E] underline">
                    {contactTelegram}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
      <ViewActions
        proposalId={proposalId}
        versionId={record?.versionId ?? ""}
        createdAt={record?.createdAt}
        payload={{
          proposal,
          selectedCaseIds,
          planTasks: payloadPlanTasks,
        }}
      />
    </div>
  );
}
