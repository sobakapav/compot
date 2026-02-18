import fs from "fs/promises";
import path from "path";
import type { Proposal } from "../../lib/schema";

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
  title: string;
  start: string;
  end: string;
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
  contactEmail: "pro@sobakapav.ru",
  contactTelegram: "@sobakapavpro",
  contactPhone: "+7 (495) 191-92-81",
  validUntil: "",
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

const parseDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const daysBetween = (start: Date, end: Date) =>
  Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

const decodePayload = (data: string | undefined) => {
  if (!data) return null;
  try {
    const decoded = Buffer.from(decodeURIComponent(data), "base64").toString(
      "utf-8"
    );
    return JSON.parse(decoded) as {
      proposal?: Proposal;
      selectedCaseIds?: string[];
      planTasks?: PlanTask[];
    };
  } catch {
    return null;
  }
};

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

type PrintPageProps = {
  searchParams?: Promise<{ data?: string | string[] }>;
};

export default async function PrintPage({ searchParams }: PrintPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const dataParam = Array.isArray(resolvedParams?.data)
    ? resolvedParams?.data?.[0]
    : resolvedParams?.data;
  const payload = decodePayload(dataParam);
  const proposal = payload?.proposal ?? defaultValues;
  const selectedCaseIds = payload?.selectedCaseIds ?? [];
  const planTasks = payload?.planTasks ?? [];
  const cases = await loadCases();

  const planRange = (() => {
    const dates = planTasks
      .map((task) => [parseDate(task.start), parseDate(task.end)])
      .flat()
      .filter(Boolean) as Date[];
    if (dates.length === 0) return null;
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    return { min, max, total: daysBetween(min, max) };
  })();

  return (
    <div style={{ width: 794, margin: 0 }}>
      <section className="proposal-page relative w-[794px] rounded-none bg-white px-12 pb-20 pt-14">
        <div className="flex flex-col gap-[24px]">
          <section className="flex flex-col gap-4">
            <div className="proposal-headline text-[24px] text-zinc-900 leading-[1.2]">
              <span>Коммерческое предложение</span>
              <br />
              <span>на </span>
              <span className="font-semibold">{proposal.serviceName}</span>
              <br />
              <span>для </span>
              <span className="inline-flex items-baseline gap-1">
                <span>компании&nbsp;</span>
                <span className="inline-flex h-6 items-center justify-center overflow-hidden bg-white text-[9px] uppercase tracking-[0.2em] text-zinc-400 align-middle translate-y-[6px]">
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
                <span className="font-semibold">{proposal.clientName}</span>
              </span>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 md:grid-cols-5">
            <div className="flex flex-col gap-1 md:col-span-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-400">
                Цель заказчика
              </div>
              <div
                className="rich-field w-full text-[15px] leading-[1.2] text-zinc-900"
                dangerouslySetInnerHTML={{ __html: proposal.summary || "" }}
              />
            </div>
            <div className="flex flex-col gap-1 md:col-span-3 md:col-start-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-400">
                  Задача подрядчика
                </div>
              <div
                className="rich-field w-full text-[15px] leading-[1.2] text-zinc-900"
                dangerouslySetInnerHTML={{ __html: proposal.scope || "" }}
              />
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-400">
              План
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="flex flex-col gap-3">
                {planTasks.map((task) => {
                  const start = parseDate(task.start);
                  const end = parseDate(task.end);
                  const total = planRange?.total ?? 1;
                  const offset =
                    start && planRange
                      ? daysBetween(planRange.min, start) - 1
                      : 0;
                  const length = start && end ? daysBetween(start, end) : 1;
                  const left = planRange ? (offset / total) * 100 : 0;
                  const width = planRange ? (length / total) * 100 : 0;
                  return (
                    <div
                      key={task.id}
                      className="grid grid-cols-1 gap-2 md:grid-cols-[1.2fr_1fr_1fr_2fr_36px]"
                    >
                      <div className="text-sm text-zinc-900">{task.title}</div>
                      <div className="text-sm text-zinc-900">{task.start}</div>
                      <div className="text-sm text-zinc-900">{task.end}</div>
                      <div className="relative h-9 rounded-md bg-zinc-100">
                        <div
                          className="absolute top-1/2 h-3 -translate-y-1/2 rounded-md bg-emerald-500"
                          style={{
                            left: `${left}%`,
                            width: `${Math.max(2, width)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <div className="flex flex-col gap-1 md:col-span-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-400">
                  Сроки
                </div>
                <div
                  className="digit-field text-[15px] text-zinc-900"
                  dangerouslySetInnerHTML={{
                    __html: renderDigitHtml(proposal.timeline || ""),
                  }}
                />
              </div>
              <div className="flex flex-col gap-1 md:col-span-1 md:col-start-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-400">
                  Стоимость
                </div>
                <div className="flex min-h-[2.6em] items-end">
                  <div
                    className="digit-field text-[15px] text-zinc-900"
                    dangerouslySetInnerHTML={{
                      __html: renderDigitHtml(proposal.price || ""),
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 md:col-span-3 md:col-start-3">
                {proposal.nuances?.trim() ? (
                  <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-400">
                    Нюансы
                  </div>
                ) : null}
                {proposal.nuances?.trim() ? (
                  <div className="flex min-h-[2.6em] items-end">
                    <div className="text-[12px] text-zinc-900 leading-[1.2]">
                      {proposal.nuances}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-400">
              Похожие проекты
            </div>
            <div className="grid grid-cols-5 gap-2 leading-[1]">
              {selectedCaseIds.map((id) => {
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
          </section>

          <section className="mt-[48px] flex flex-col gap-2">
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
                    {proposal.validUntil}
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
                  {proposal.contactPhone}
                </div>
                <div className="text-[15px] text-[#0E509E] underline leading-[1] mt-[2px]">
                  {proposal.contactEmail}
                </div>
                <div className="mt-[2px] flex items-center gap-1 text-[15px] text-zinc-700 leading-[1]">
                  <span>tg</span>
                  <span className="text-[#0E509E] underline">
                    {proposal.contactTelegram}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
