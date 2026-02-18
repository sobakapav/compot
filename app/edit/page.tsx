"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Proposal } from "../../lib/schema";

type ProposalHistoryItem = {
  proposalId: string;
  latestVersionId: string;
  latestCreatedAt: string;
  markedVersionId: string;
  markedCreatedAt: string;
  clientName: string;
  serviceName?: string;
  versions: {
    versionId: string;
    createdAt: string;
    pdf?: boolean;
    source?: string;
  }[];
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

type ProposalField = keyof Proposal;

const blocks = [
  { id: "summary", label: "Бизнес-задача", field: "summary" },
  { id: "scope", label: "Дизайн-задача", field: "scope" },
  { id: "timeline", label: "Сроки", field: "timeline" },
  { id: "price", label: "Стоимость", field: "price" },
  { id: "deliverables", label: "Результаты", field: "deliverables" },
  { id: "nuances", label: "Нюансы", field: "nuances" },
  { id: "footer", label: "Подвал", field: "contactEmail" },
] as const;

type ServiceItem = {
  id: string;
  title: string;
  link?: string;
};

type CaseItem = {
  id: string;
  title: string;
  clientName: string;
  preview: string;
  previewImageFile?: string;
  previewImageSourceUrl?: string;
  link: string;
  serviceIds?: string[];
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

const useEditableHtml = (value: string) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);
  return ref;
};

const splitLinkSlug = (link: string) => {
  if (!link) return { base: "", slug: "" };
  const clean = link.replace(/\/$/, "");
  const parts = clean.split("/");
  const slug = parts.pop() ?? "";
  const base = parts.length ? `${parts.join("/")}/` : "";
  return { base, slug };
};

const formatCaseLink = (link: string) => {
  const { base, slug } = splitLinkSlug(link);
  const portfolioBase = "https://sobakapav.ru/portfolio/";
  if (link.startsWith(portfolioBase)) {
    return { base: "sbkpv.ru/", slug };
  }
  return { base, slug };
};

const lowerFirst = (value: string) => {
  if (!value) return value;
  if (/^(UX|UI)\b/.test(value)) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
};

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ProposalHistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [proposal, setProposal] = useState<Proposal>(defaultValues);
  const proposalRef = useRef<Proposal>(defaultValues);
  const selectedCaseIdsRef = useRef<string[]>([]);
  const planTasksRef = useRef<PlanTask[]>([]);
  const [activeField, setActiveField] = useState<ProposalField | null>(null);
  const [activeBlock, setActiveBlock] = useState<
    "header" | "tasks" | "plan" | "terms" | "cases" | "footer" | null
  >(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const didInitContactsRef = useRef(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [caseFilter, setCaseFilter] = useState("");
  const [caseScope, setCaseScope] = useState<"all" | "service" | "selected">(
    "all"
  );
  const [validUntilValue, setValidUntilValue] = useState("");
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const isNewProposal = searchParams.get("new") === "1";
  const lastSavedRef = useRef<string>("");

  type PlanTask = {
    id: string;
    title: string;
    start: string;
    end: string;
  };

  const [planTasks, setPlanTasks] = useState<PlanTask[]>([
    { id: "t1", title: "Discovery", start: "2026-03-01", end: "2026-03-10" },
    { id: "t2", title: "Design", start: "2026-03-11", end: "2026-03-25" },
  ]);

  const serviceTitleMap = useMemo(
    () => new Map(services.map((service) => [service.id, service.title])),
    [services]
  );

  const serviceLabel = useMemo(() => {
    const name = proposal.serviceName || "услуга";
    const max = "UX-отдел на аутсорсе".length;
    if (name.length <= max) return name;
    return `${name.slice(0, max)}…`;
  }, [proposal.serviceName]);

  const filteredCases = useMemo(() => {
    let list = cases;
    if (caseScope === "service" && proposal.serviceId) {
      list = list.filter((item) =>
        item.serviceIds?.includes(proposal.serviceId)
      );
    }
    if (caseScope === "selected") {
      list = list.filter((item) => selectedCaseIds.includes(item.id));
    }
    const query = caseFilter.trim().toLowerCase();
    if (!query) return list;
    return list.filter((item) => {
      const serviceTitles =
        item.serviceIds?.map((id) => serviceTitleMap.get(id)).filter(Boolean) ??
        [];
      const haystack = [
        item.id,
        item.title,
        item.clientName,
        item.preview,
        item.link,
        ...(item.serviceIds ?? []),
        ...serviceTitles,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [
    caseFilter,
    cases,
    serviceTitleMap,
    caseScope,
    proposal.serviceId,
    selectedCaseIds,
  ]);

  const updatePlanTask = (id: string, patch: Partial<PlanTask>) => {
    setPlanTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...patch } : task))
    );
  };

  const addPlanTask = () => {
    const nextId = `t${planTasks.length + 1}`;
    setPlanTasks((prev) => [
      ...prev,
      { id: nextId, title: "New task", start: "", end: "" },
    ]);
  };

  const removePlanTask = (id: string) => {
    setPlanTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const toggleCase = (id: string) => {
    setSelectedCaseIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  const removeCase = (id: string) => {
    setSelectedCaseIds((prev) => prev.filter((item) => item !== id));
  };

  const moveCase = (fromId: string, toId: string) => {
    setSelectedCaseIds((prev) => {
      const fromIndex = prev.indexOf(fromId);
      const toIndex = prev.indexOf(toId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  };

  const parseDate = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const daysBetween = (start: Date, end: Date) =>
    Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

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
        body: JSON.stringify({
          proposal,
          proposalId,
          source: "pdf",
          pdf: true,
          selectedCaseIds,
          planTasks,
        }),
      });
      if (!historyResponse.ok) {
        const message = await historyResponse.text();
        throw new Error(message || "Failed to store proposal");
      }
      const historyData = await historyResponse.json();
      if (!proposalId && historyData?.proposalId) {
        setProposalId(historyData.proposalId);
      }
      lastSavedRef.current = serializeState(
        proposal,
        selectedCaseIds,
        planTasks
      );

      const createdAt = historyData?.createdAt ?? new Date().toISOString();
      const stamp = `${createdAt.slice(0, 10)}_${createdAt
        .slice(11, 16)
        .replace(":", "-")}`;
      const fileName = `sbkpv_cmpr_${stamp}.pdf`;
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposal,
          selectedCaseIds,
          planTasks,
          fileName,
        }),
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to generate PDF");
      }
      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error("Empty PDF");
      }
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      const link = document.createElement("a");
      link.href = url;
      const now = new Date();
      const stamp = `${now.toISOString().slice(0, 10)}_${now
        .toISOString()
        .slice(11, 16)
        .replace(":", "-")}`;
      link.download = fileName;
      link.rel = "noopener";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Не удалось сформировать PDF. Проверь поля и попробуй снова.");
    } finally {
      setIsLoading(false);
    }
  };

  const requiredMark = useMemo(() => <span className="text-red-500">*</span>, []);

  useEffect(() => {
    if (didInitContactsRef.current) return;
    didInitContactsRef.current = true;
    setProposal((prev) => {
      const hasAny =
        prev.contactEmail || prev.contactTelegram || prev.contactPhone;
      if (hasAny) return prev;
      return {
        ...prev,
        contactEmail: defaultValues.contactEmail,
        contactTelegram: defaultValues.contactTelegram,
        contactPhone: defaultValues.contactPhone,
      };
    });
  }, []);

  useEffect(() => {
    proposalRef.current = proposal;
  }, [proposal]);

  useEffect(() => {
    selectedCaseIdsRef.current = selectedCaseIds;
  }, [selectedCaseIds]);

  useEffect(() => {
    planTasksRef.current = planTasks;
  }, [planTasks]);

  useEffect(() => {
    const pid = searchParams.get("proposalId");
    const vid = searchParams.get("versionId");
    setProposalId(pid);
    setVersionId(vid);
  }, [searchParams]);

  useEffect(() => {
    if (caseScope !== "selected") return;
    if (selectedCaseIds.length > 0) return;
    setCaseScope("all");
  }, [caseScope, selectedCaseIds.length]);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      const current = proposalRef.current;
      if (
        !hasChanges(
          current,
          selectedCaseIdsRef.current,
          planTasksRef.current
        )
      ) {
        return;
      }
      try {
        const response = await fetch("/api/proposals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proposal: current,
            proposalId,
            source: "autosave",
            selectedCaseIds: selectedCaseIdsRef.current,
            planTasks: planTasksRef.current,
          }),
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!proposalId && data?.proposalId) {
          setProposalId(data.proposalId);
        }
        lastSavedRef.current = serializeState(
          current,
          selectedCaseIdsRef.current,
          planTasksRef.current
        );
      } catch {
        // Ignore autosave errors.
      }
    }, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [proposalId]);

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
    if (!proposalId) return;
    const loadProposal = async () => {
      try {
        const url = new URL(`/api/proposals/${proposalId}`, window.location.origin);
        if (versionId) url.searchParams.set("versionId", versionId);
        const response = await fetch(url.toString());
        if (!response.ok) return;
        const data = await response.json();
        const item = data?.item;
        if (!item?.proposal) return;
        const mergedProposal = {
          ...proposalRef.current,
          ...item.proposal,
          contactEmail:
            item.proposal.contactEmail || proposalRef.current.contactEmail,
          contactTelegram:
            item.proposal.contactTelegram || proposalRef.current.contactTelegram,
          contactPhone:
            item.proposal.contactPhone || proposalRef.current.contactPhone,
          validUntil:
            item.proposal.validUntil || proposalRef.current.validUntil,
        };
        const nextCaseIds = item.selectedCaseIds ?? [];
        const nextPlanTasks = item.planTasks ?? [];
        setProposal(mergedProposal);
        setSelectedCaseIds(nextCaseIds);
        setPlanTasks(nextPlanTasks);
        lastSavedRef.current = serializeState(
          mergedProposal,
          nextCaseIds,
          nextPlanTasks
        );
      } catch {
        return;
      }
    };
    loadProposal();
  }, [proposalId, versionId]);

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

  useEffect(() => {
    const loadCases = async () => {
      try {
        const response = await fetch("/api/cases");
        if (!response.ok) return;
        const data = await response.json();
        const items = data.items ?? [];
        setCases(items);
      } catch {
        return;
      }
    };
    loadCases();
  }, []);

  const applyTemplate = async () => {
    if (!selectedHistoryId) return;
    const selectedItem = history.find(
      (item) => item.proposalId === selectedHistoryId
    );
    const versionQuery = selectedItem?.markedVersionId
      ? `?versionId=${selectedItem.markedVersionId}`
      : "";
    const response = await fetch(
      `/api/proposals/${selectedHistoryId}${versionQuery}`
    );
    if (!response.ok) return;
    const data = await response.json();
    const proposal: Proposal | undefined = data?.item?.proposal;
    if (!proposal) return;
    const emptyProposal = Object.fromEntries(
      Object.keys(defaultValues).map((key) => [key, ""])
    ) as Proposal;
    setProposal({
      ...emptyProposal,
      ...proposal,
    });
    setSelectedCaseIds(data?.item?.selectedCaseIds ?? []);
    setPlanTasks(data?.item?.planTasks ?? []);
  };

  const updateField = (field: ProposalField, value: string) => {
    setProposal((prev) => ({ ...prev, [field]: value }));
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
      "<span class=\"digit\">$&</span>"
    );

  const buildMonth = (year: number, month: number) => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startOffset = (first.getDay() + 6) % 7;
    const totalDays = last.getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i += 1) cells.push(null);
    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(new Date(year, month, day));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return { year, month, cells };
  };

  const formatDateValue = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const calendarMonths = useMemo(() => {
    const now = new Date();
    const first = buildMonth(now.getFullYear(), now.getMonth());
    const next = buildMonth(now.getFullYear(), now.getMonth() + 1);
    return [first, next];
  }, []);

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }),
    []
  );
  const longDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    []
  );
  const dayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const todayValue = formatDateValue(new Date());
  const formatLongDate = (date: Date) => {
    const base = longDateFormatter.format(date).replace(/\s?г\.$/i, "");
    return `${base} года`;
  };

  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerShouldWrap, setHeaderShouldWrap] = useState(false);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const check = () => {
      const parent = el.parentElement;
      if (!parent) return;
      setHeaderShouldWrap(el.scrollWidth > parent.clientWidth);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    if (el.parentElement) observer.observe(el.parentElement);
    window.addEventListener("resize", check);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [proposal.clientName, proposal.serviceName]);

  useEffect(() => {
    if (proposal.validUntil) return;
    const target = new Date();
    target.setDate(target.getDate() + 14);
    const day = target.getDay();
    if (day === 6) target.setDate(target.getDate() + 2);
    if (day === 0) target.setDate(target.getDate() + 1);
    setValidUntilValue(formatDateValue(target));
    setProposal((prev) => ({
      ...prev,
      validUntil: formatLongDate(target),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSelectionOffset = (root: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    const range = selection.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(root);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().length;
  };

  const restoreSelectionOffset = (root: HTMLElement, offset: number) => {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      null
    );
    let currentOffset = 0;
    let node: Node | null = walker.nextNode();
    while (node) {
      const textLength = node.textContent?.length ?? 0;
      if (currentOffset + textLength >= offset) {
        const range = document.createRange();
        const selection = window.getSelection();
        range.setStart(node, offset - currentOffset);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        return;
      }
      currentOffset += textLength;
      node = walker.nextNode();
    }
  };


  const normalizeRichHtml = (html: string) => {
    const container = document.createElement("div");
    container.innerHTML = html;
    const text = (container.textContent ?? "").replace(/\u00A0/g, " ").trim();
    if (!text) return "";
    return container.innerHTML;
  };

  const updateRichField = (field: ProposalField, html: string) => {
    const normalized = normalizeRichHtml(html);
    setProposal((prev) => ({ ...prev, [field]: normalized }));
  };

  const richFields = new Set<ProposalField>(["summary", "scope"]);
  const headerFields = new Set<ProposalField>([
    "serviceName",
    "serviceId",
    "clientName",
    "clientLogoDataUrl",
  ]);
  const showRichControls = activeField ? richFields.has(activeField) : false;
  const showHeaderControls = activeField
    ? headerFields.has(activeField)
    : true;

  const [richState, setRichState] = useState({
    bold: false,
    ordered: false,
    unordered: false,
  });

  const updateRichState = () => {
    setRichState({
      bold: document.queryCommandState("bold"),
      ordered: document.queryCommandState("insertOrderedList"),
      unordered: document.queryCommandState("insertUnorderedList"),
    });
  };

  useEffect(() => {
    const handler = () => {
      if (!showRichControls) return;
      const selection = window.getSelection();
      const node = selection?.anchorNode as Node | null;
      const element =
        node instanceof HTMLElement ? node : node?.parentElement ?? null;
      if (!element?.closest(".rich-field")) return;
      updateRichState();
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [showRichControls]);

  const execRichCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    updateRichState();
  };

  const normalizeLink = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const getSelectionLink = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return "";
    let node = selection.anchorNode as Node | null;
    while (node) {
      if (node instanceof HTMLAnchorElement) {
        return node.getAttribute("href") ?? "";
      }
      node = node.parentNode;
    }
    return "";
  };

  const handleRichKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    if (event.key.toLowerCase() === "b") {
      event.preventDefault();
      execRichCommand("bold");
      return;
    }
    if (event.key.toLowerCase() === "k") {
      event.preventDefault();
      const existing = getSelectionLink();
      const url = window.prompt("Ссылка (URL):", existing);
      if (url === null) return;
      const normalized = normalizeLink(url);
      if (!normalized) {
        execRichCommand("unlink");
        return;
      }
      execRichCommand("createLink", normalized);
      return;
    }
    const orderedHotkey =
      event.shiftKey &&
      (event.key === "7" ||
        event.code === "Digit7" ||
        event.key === "&" ||
        event.key.toLowerCase() === "o");
    if (orderedHotkey) {
      event.preventDefault();
      execRichCommand("insertOrderedList");
      return;
    }
    const unorderedHotkey =
      event.shiftKey &&
      (event.key === "8" ||
        event.code === "Digit8" ||
        event.key === "*" ||
        event.key.toLowerCase() === "u");
    if (unorderedHotkey) {
      event.preventDefault();
      execRichCommand("insertUnorderedList");
    }
  };

  const controlMap: Record<ProposalField, { history: boolean }> = {
    clientName: { history: false },
    serviceName: { history: false },
    serviceId: { history: false },
    clientLogoDataUrl: { history: false },
    summary: { history: true },
    scope: { history: true },
    timeline: { history: false },
    price: { history: false },
    deliverables: { history: true },
    nuances: { history: true },
    assumptions: { history: true },
    contactEmail: { history: true },
    contactTelegram: { history: true },
    contactPhone: { history: true },
    validUntil: { history: true },
  };
  const showHistory = activeField
    ? controlMap[activeField]?.history
    : true;

  const clientRef = useEditable(proposal.clientName);
  const serviceRef = useEditable(proposal.serviceName);

  const setFocus = (field: ProposalField, block: typeof activeBlock) => {
    setActiveField(field);
    setActiveBlock(block);
  };

  const serializeState = (
    data: Proposal,
    caseIds: string[],
    tasks: PlanTask[]
  ) =>
    JSON.stringify({
      proposal: data,
      selectedCaseIds: caseIds,
      planTasks: tasks,
    });

  const hasChanges = (data: Proposal, caseIds: string[], tasks: PlanTask[]) =>
    serializeState(data, caseIds, tasks) !== lastSavedRef.current;

  const saveProposal = async (
    source: "manual" | "autosave" | "pdf" | "create"
  ) => {
    const response = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proposal,
        proposalId,
        source,
        selectedCaseIds,
        planTasks,
      }),
    });
    if (!response.ok) {
      throw new Error("Failed to store proposal");
    }
    const data = await response.json();
    if (!proposalId && data?.proposalId) {
      setProposalId(data.proposalId);
    }
    return data;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100">
      <main
        className="flex w-full gap-8 px-0 py-0"
        onClickCapture={(event) => {
          const target = event.target as HTMLElement | null;
          if (!target) return;
          if (target.closest("[data-block]")) return;
          if (
            target.closest(
              "button, input, select, textarea, a, [contenteditable], label, [role='button']"
            )
          ) {
            return;
          }
          setActiveBlock(null);
          setActiveField(null);
        }}
      >
        <button
          type="button"
          className="fixed left-6 top-4 z-20 text-xs text-[#0E509E] underline"
          onClick={async () => {
            setIsLoading(true);
            setError(null);
            try {
              if (
                hasChanges(
                  proposalRef.current,
                  selectedCaseIdsRef.current,
                  planTasksRef.current
                )
              ) {
                await saveProposal("autosave");
                lastSavedRef.current = serializeState(
                  proposalRef.current,
                  selectedCaseIdsRef.current,
                  planTasksRef.current
                );
              }
              router.push("/all");
            } catch (err) {
              setError("Не удалось сохранить предложение.");
            } finally {
              setIsLoading(false);
            }
          }}
        >
          &lt;&lt; Назад к списку предложений
        </button>
        <aside className="w-[250px] flex-none" data-controls>
          <div className="sticky top-16 flex flex-col gap-6">
            {true && (
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 text-sm">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-2">
                      {history.map((item) => {
                        const isCurrent = item.proposalId === proposalId;
                        const isSelectable = !isCurrent;
                        const isNew = isCurrent && isNewProposal;
                        const title = isNew
                          ? "Новое"
                          : `${item.clientName || "Без клиента"} — ${
                              item.serviceName ?? "без услуги"
                            }`;
                        return (
                          <div
                            key={item.proposalId}
                            className="flex items-start justify-between gap-2"
                          >
                            <label
                              className={`flex items-start gap-2 text-xs ${
                                isSelectable
                                  ? "text-zinc-700"
                                  : "text-zinc-400"
                              }`}
                            >
                              <input
                                type="radio"
                                name="proposal-template"
                                value={item.proposalId}
                                checked={selectedHistoryId === item.proposalId}
                                onChange={(event) =>
                                  setSelectedHistoryId(event.target.value)
                                }
                                className="mt-1"
                                disabled={!isSelectable}
                              />
                              <span>
                                {title}
                                {item.markedCreatedAt && (
                                  <span className="ml-2 text-[10px] text-zinc-400">
                                    {item.markedCreatedAt.slice(0, 10)}
                                  </span>
                                )}
                              </span>
                            </label>
                            {!isCurrent && (
                              <a
                                href={`/view?proposalId=${item.proposalId}&versionId=${item.markedVersionId || item.latestVersionId}`}
                                className="text-[10px] text-[#0E509E] underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Посмотреть
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={applyTemplate}
                    className="rounded-md border border-zinc-200 bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
                  >
                    Взять как шаблон
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
          </div>
        </aside>
        <section className="w-[680px] flex-none">
          <section className="proposal-page relative min-h-screen w-full rounded-none bg-white px-12 pb-20 pt-14 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.55)]">
            <div className="flex flex-col gap-[24px]">
              <section
                data-block="header"
                className={`flex flex-col gap-4 ${
                  activeBlock === "header" ? "active-block" : ""
                }`}
              >
              <div className="proposal-headline text-[24px] text-zinc-900 leading-[1.2]">
                <span>Коммерческое предложение</span>
                <br />
                <span>на </span>
                <span
                  ref={serviceRef}
                  className="inline-block align-baseline font-semibold border-b border-transparent focus:border-zinc-300"
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="услугу"
                  onFocus={() => setFocus("serviceName", "header")}
                  onInput={(event) =>
                    updateField(
                      "serviceName",
                      event.currentTarget.textContent ?? ""
                    )
                  }
                />
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
                        onClick={() => setFocus("clientLogoDataUrl", "header")}
                      />
                    </span>
                  )}
                  <span
                    ref={clientRef}
                    className="inline-block align-baseline font-semibold border-b border-transparent focus:border-zinc-300"
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder="название компании"
                    onFocus={() => setFocus("clientName", "header")}
                    onInput={(event) =>
                      updateField(
                        "clientName",
                        event.currentTarget.textContent ?? ""
                      )
                    }
                  />
                </span>
              </div>
            </section>

            <section
              data-block="tasks"
              className={`grid grid-cols-1 gap-6 md:grid-cols-5 ${
                activeBlock === "tasks" ? "active-block" : ""
              }`}
            >
              <div className="flex flex-col gap-1 md:col-span-2">
                <div className={labelClass}>Цель заказчика {requiredMark}</div>
                <div
                  ref={useEditableHtml(proposal.summary)}
                  className={`${editableClass} rich-field leading-[1.2]`}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Опиши бизнес-задачу..."
                  onFocus={() => {
                    setFocus("summary", "tasks");
                    updateRichState();
                  }}
                  onKeyDown={handleRichKeyDown}
                  onClick={(event) => {
                    const target = event.target as HTMLElement | null;
                    if (target?.tagName === "A") {
                      const href = (target as HTMLAnchorElement).href;
                      if (href) window.open(href, "_blank", "noopener,noreferrer");
                    }
                  }}
                  onInput={(event) =>
                    updateRichField("summary", event.currentTarget.innerHTML)
                  }
                />
              </div>
              <div className="flex flex-col gap-1 md:col-span-3 md:col-start-3">
                <div className={labelClass}>Задача подрядчика {requiredMark}</div>
                <div
                  ref={useEditableHtml(proposal.scope)}
                  className={`${editableClass} rich-field leading-[1.2]`}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Опиши дизайн-задачу..."
                  onFocus={() => {
                    setFocus("scope", "tasks");
                    updateRichState();
                  }}
                  onKeyDown={handleRichKeyDown}
                  onClick={(event) => {
                    const target = event.target as HTMLElement | null;
                    if (target?.tagName === "A") {
                      const href = (target as HTMLAnchorElement).href;
                      if (href) window.open(href, "_blank", "noopener,noreferrer");
                    }
                  }}
                  onInput={(event) =>
                    updateRichField("scope", event.currentTarget.innerHTML)
                  }
                />
              </div>
            </section>

            <section
              data-block="plan"
              className={`flex flex-col gap-2 ${
                activeBlock === "plan" ? "active-block" : ""
              }`}
            >
              <div className={labelClass}>План</div>
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
                    const length =
                      start && end ? daysBetween(start, end) : 1;
                    const left = planRange ? (offset / total) * 100 : 0;
                    const width = planRange ? (length / total) * 100 : 0;
                    return (
                      <div
                        key={task.id}
                        className="grid grid-cols-1 gap-2 md:grid-cols-[1.2fr_1fr_1fr_2fr_36px]"
                      >
                        <input
                          className="w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                          value={task.title}
                          onFocus={() => setActiveBlock("plan")}
                          onChange={(event) =>
                            updatePlanTask(task.id, {
                              title: event.target.value,
                            })
                          }
                        />
                        <input
                          className="w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                          placeholder="YYYY-MM-DD"
                          value={task.start}
                          onFocus={() => setActiveBlock("plan")}
                          onChange={(event) =>
                            updatePlanTask(task.id, {
                              start: event.target.value,
                            })
                          }
                        />
                        <input
                          className="w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                          placeholder="YYYY-MM-DD"
                          value={task.end}
                          onFocus={() => setActiveBlock("plan")}
                          onChange={(event) =>
                            updatePlanTask(task.id, {
                              end: event.target.value,
                            })
                          }
                        />
                        <div className="relative h-9 rounded-md bg-zinc-100">
                          <div
                            className="absolute top-1/2 h-3 -translate-y-1/2 rounded-md bg-emerald-500"
                            style={{
                              left: `${left}%`,
                              width: `${Math.max(2, width)}%`,
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          className="h-9 w-9 rounded-md border border-zinc-200 text-xs text-zinc-500 hover:border-zinc-300"
                          onClick={() => removePlanTask(task.id)}
                        >
                          —
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="self-start rounded-md border border-zinc-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 hover:border-zinc-300"
                    onClick={() => {
                      setActiveBlock("plan");
                      addPlanTask();
                    }}
                  >
                    Добавить этап
                  </button>
                </div>
              </div>
            </section>

            <section
              data-block="terms"
              className={`flex flex-col gap-2 ${
                activeBlock === "terms" ? "active-block" : ""
              }`}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                <div className="flex flex-col gap-1 md:col-span-1">
                  <div className={labelClass}>Сроки {requiredMark}</div>
                  <div
                    className="digit-field text-[15px] text-zinc-900"
                    contentEditable
                    suppressContentEditableWarning
                    dir="ltr"
                    data-placeholder="Сроки..."
                    onFocus={() => setFocus("timeline", "terms")}
                    onInput={(event) => {
                      const root = event.currentTarget;
                      const offset = getSelectionOffset(root);
                      const value = root.textContent ?? "";
                      updateField("timeline", value);
                      root.innerHTML = value ? renderDigitHtml(value) : "";
                      requestAnimationFrame(() =>
                        restoreSelectionOffset(root, offset)
                      );
                    }}
                    dangerouslySetInnerHTML={{
                      __html: renderDigitHtml(proposal.timeline),
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-1 md:col-start-2">
                  <div className={labelClass}>Стоимость {requiredMark}</div>
                  <div className="flex min-h-[2.6em] items-end">
                    <div
                      className="digit-field text-[15px] text-zinc-900"
                      contentEditable
                      suppressContentEditableWarning
                      dir="ltr"
                      data-placeholder="Стоимость..."
                      onFocus={() => setFocus("price", "terms")}
                      onInput={(event) => {
                        const root = event.currentTarget;
                        const offset = getSelectionOffset(root);
                        const value = root.textContent ?? "";
                        updateField("price", value);
                        root.innerHTML = value ? renderDigitHtml(value) : "";
                        requestAnimationFrame(() =>
                          restoreSelectionOffset(root, offset)
                        );
                      }}
                      dangerouslySetInnerHTML={{
                        __html: renderDigitHtml(proposal.price),
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1 md:col-span-3 md:col-start-3">
                  <div className={labelClass}>Нюансы</div>
                  <div className="flex min-h-[2.6em] items-end">
                    <div
                    ref={useEditable(proposal.nuances ?? "")}
                    className="w-full cursor-text bg-transparent text-[12px] leading-[1.2] text-zinc-900 outline-none"
                      contentEditable
                      suppressContentEditableWarning
                      data-placeholder="Нюансы..."
                      onFocus={() => setFocus("nuances", "terms")}
                      onInput={(event) =>
                        updateField(
                          "nuances",
                          event.currentTarget.textContent ?? ""
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </section>

            <section
              data-block="cases"
              className={`flex flex-col gap-0 ${
                activeBlock === "cases" ? "active-block" : ""
              }`}
              onClick={() => setActiveBlock("cases")}
            >
              <div className={labelClass}>Похожие проекты</div>
              <div className="grid grid-cols-5 gap-2 leading-[1]">
                {selectedCaseIds.map((id) => {
                  const item = cases.find((c) => c.id === id);
                  if (!item) return null;
                  const { base: linkBase, slug: linkSlug } = formatCaseLink(
                    item.link
                  );
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", item.id);
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const fromId = event.dataTransfer.getData("text/plain");
                        if (fromId) moveCase(fromId, item.id);
                      }}
                      className="group relative flex min-h-[140px] flex-col gap-2 rounded-xl bg-white pt-0 pb-0 pr-3 pl-0"
                    >
                      {item.previewImageFile || item.previewImageSourceUrl ? (
                        <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded bg-zinc-50">
                          <img
                            src={item.previewImageFile || item.previewImageSourceUrl}
                            alt={item.title}
                            className="h-full w-full object-contain"
                            loading="lazy"
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
                        <a
                          className="text-[10px] text-[#0E509E] underline"
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {linkBase}
                          <span className="font-semibold">{linkSlug}</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => removeCase(item.id)}
                        className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-xs text-zinc-500 shadow-sm group-hover:flex"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section
              data-block="footer"
              className={`mt-[48px] flex flex-col gap-2 ${
                activeBlock === "footer" ? "active-block" : ""
              }`}
            >
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
                    <span
                      ref={useEditable(proposal.validUntil ?? "")}
                      className="inline-flex whitespace-nowrap rounded bg-zinc-200 px-2 py-0.5 text-zinc-900 uppercase tracking-normal text-[12px] -ml-2"
                      contentEditable
                      suppressContentEditableWarning
                      data-placeholder="17 марта 2026 года"
                      onFocus={() => setFocus("validUntil", "footer")}
                      onInput={(event) => {
                        setValidUntilValue("");
                        updateField(
                          "validUntil",
                          event.currentTarget.textContent ?? ""
                        );
                      }}
                    />
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
                  <div
                    ref={useEditable(proposal.contactPhone ?? "")}
                    className={`${editableClass} leading-[1] mt-[14px]`}
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder="Телефон..."
                    onFocus={() => setFocus("contactPhone", "footer")}
                    onInput={(event) =>
                      updateField(
                        "contactPhone",
                        event.currentTarget.textContent ?? ""
                      )
                    }
                  />
                  <a
                    ref={useEditable(proposal.contactEmail ?? "")}
                    className={`${editableClass} leading-[1] text-[#0E509E] underline mt-[2px]`}
                    style={{ color: "#0E509E" }}
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder="Email..."
                    href={
                      proposal.contactEmail
                        ? `mailto:${proposal.contactEmail}`
                        : undefined
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    onFocus={() => setFocus("contactEmail", "footer")}
                    onInput={(event) =>
                      updateField(
                        "contactEmail",
                        event.currentTarget.textContent ?? ""
                      )
                    }
                  />
                  <div className="mt-[2px] flex items-center gap-1 text-[15px] text-zinc-700 leading-[1]">
                    <span>tg</span>
                    <a
                      ref={useEditable(proposal.contactTelegram ?? "")}
                      className="text-[15px] text-[#0E509E] underline"
                      contentEditable
                      suppressContentEditableWarning
                      data-placeholder="@username"
                      href={
                        proposal.contactTelegram
                          ? `https://t.me/${proposal.contactTelegram.replace(
                              /^@/,
                              ""
                            )}`
                          : undefined
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      onFocus={() => setFocus("contactTelegram", "footer")}
                      onInput={(event) =>
                        updateField(
                          "contactTelegram",
                          event.currentTarget.textContent ?? ""
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>
        </section>

        <aside className="w-[250px] flex-none" data-controls>
          <div className="sticky top-6 flex min-h-[calc(100vh-3rem)] flex-col gap-6">
            {activeBlock === "header" && (
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
                          serviceName: service
                            ? lowerFirst(service.title)
                            : prev.serviceName,
                        }));
                        if (id) {
                          const matched = cases.filter((item) =>
                            item.serviceIds?.includes(id)
                          );
                          const byYear = matched.reduce<Record<string, typeof matched>>(
                            (acc, item) => {
                              const key = String(
                                (item as { year?: number | string }).year ?? ""
                              );
                              if (!acc[key]) acc[key] = [];
                              acc[key].push(item);
                              return acc;
                            },
                            {}
                          );
                          const years = Object.keys(byYear)
                            .map((key) => Number(key))
                            .filter((value) => !Number.isNaN(value))
                            .sort((a, b) => b - a);
                          const picked: string[] = [];
                          const shuffle = <T,>(arr: T[]) =>
                            arr
                              .map((value) => ({
                                value,
                                sort: Math.random(),
                              }))
                              .sort((a, b) => a.sort - b.sort)
                              .map((item) => item.value);
                          for (const year of years) {
                            if (picked.length >= 5) break;
                            const shuffled = shuffle(byYear[String(year)] ?? []);
                            for (const item of shuffled) {
                              if (picked.length >= 5) break;
                              picked.push(item.id);
                            }
                          }
                          if (picked.length < 5) {
                            const noYear = shuffle(byYear[""] ?? []);
                            for (const item of noYear) {
                              if (picked.length >= 5) break;
                              picked.push(item.id);
                            }
                          }
                          setSelectedCaseIds(picked);
                        }
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
                  <div className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    <label className="flex flex-col gap-2">
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
                    {proposal.clientLogoDataUrl && (
                      <button
                        type="button"
                        className="w-fit text-[10px] font-medium tracking-normal text-[#0E509E] underline"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setProposal((prev) => ({
                            ...prev,
                            clientLogoDataUrl: "",
                          }));
                        }}
                      >
                        Удалить логотип
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            {showRichControls && (
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-semibold text-zinc-900">
                  Оформление текста
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <button
                    type="button"
                    className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                      richState.bold
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300"
                    }`}
                    onClick={() => execRichCommand("bold")}
                  >
                    Жирный
                  </button>
                  <button
                    type="button"
                    className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                      richState.unordered
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300"
                    }`}
                    onClick={() => execRichCommand("insertUnorderedList")}
                  >
                    Список
                  </button>
                  <button
                    type="button"
                    className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                      richState.ordered
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300"
                    }`}
                    onClick={() => execRichCommand("insertOrderedList")}
                  >
                    Нумерация
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 transition hover:border-zinc-300"
                    onClick={() => {
                      const existing = getSelectionLink();
                      const url = window.prompt("Ссылка (URL):", existing);
                      if (url === null) return;
                      const normalized = normalizeLink(url);
                      if (!normalized) {
                        execRichCommand("unlink");
                        return;
                      }
                      execRichCommand("createLink", normalized);
                    }}
                  >
                    Ссылка
                  </button>
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  Горячие клавиши: Cmd/Ctrl+B, Cmd/Ctrl+K, Cmd/Ctrl+Shift+7/8
                </p>
              </section>
            )}

            {activeBlock === "cases" && (
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-sm font-semibold text-zinc-900">
                  Кейсы
                  <span className="text-xs font-normal text-zinc-500">
                    {cases.length}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                  <button
                    type="button"
                    disabled={!proposal.serviceId}
                    className={`${
                      caseScope === "service"
                        ? "rounded bg-zinc-200 px-2 py-0.5 text-zinc-900 no-underline"
                        : proposal.serviceId
                        ? "text-zinc-500 underline"
                        : "text-zinc-400"
                    }`}
                    onClick={() => setCaseScope("service")}
                  >
                    {serviceLabel}
                  </button>
                  <button
                    type="button"
                    disabled={selectedCaseIds.length === 0}
                    className={`${
                      caseScope === "selected"
                        ? "rounded bg-zinc-200 px-2 py-0.5 text-zinc-900 no-underline"
                        : selectedCaseIds.length === 0
                        ? "text-zinc-400"
                        : "text-zinc-500 underline"
                    }`}
                    onClick={() => setCaseScope("selected")}
                  >
                    выбранные
                  </button>
                  <button
                    type="button"
                    className={`${
                      caseScope === "all"
                        ? "rounded bg-zinc-200 px-2 py-0.5 text-zinc-900 no-underline"
                        : "text-zinc-500 underline"
                    }`}
                    onClick={() => setCaseScope("all")}
                  >
                    все
                  </button>
                </div>
                <div className="relative mt-3">
                  <input
                    type="text"
                    value={caseFilter}
                    onChange={(event) => setCaseFilter(event.target.value)}
                    placeholder="Поиск по кейсам и услугам..."
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 pr-8 text-xs text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
                  />
                  {caseFilter && (
                    <button
                      type="button"
                      onClick={() => setCaseFilter("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600"
                      aria-label="Очистить"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="mt-3 flex min-h-[360px] max-h-[520px] flex-col gap-2 overflow-auto text-sm">
                  {cases.length === 0 && (
                    <div className="rounded-md border border-dashed border-zinc-200 px-3 py-2 text-xs text-zinc-500">
                      Кейсы не загружены. Обнови страницу.
                    </div>
                  )}
                  {filteredCases.map((item) => {
                    const checked = selectedCaseIds.includes(item.id);
                    const isServiceMatch =
                      proposal.serviceId &&
                      item.serviceIds?.includes(proposal.serviceId);
                    const linkInfo = item.link
                      ? formatCaseLink(item.link)
                      : null;
                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 px-1 py-1"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCase(item.id)}
                          className="mt-0.5"
                        />
                        <div
                          className="flex-1 text-xs text-zinc-700"
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleCase(item.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              toggleCase(item.id);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span>{item.title}</span>
                            {item.clientName && (
                              <span className="text-[10px] text-zinc-500">
                                {item.clientName}
                              </span>
                            )}
                            {isServiceMatch && (
                              <span className="text-emerald-500">★</span>
                            )}
                          </div>
                          {linkInfo && (
                            <a
                              className="text-[10px] text-[#0E509E] underline"
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {linkInfo.base}
                              <span className="font-semibold">
                                {linkInfo.slug}
                              </span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  Выбрано: {selectedCaseIds.length}/5
                </div>
              </section>
            )}

            {activeField === "validUntil" && (
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-semibold text-zinc-900">
                  Дата
                </div>
                <div className="mt-3 grid grid-cols-1 gap-4">
                  {calendarMonths.map((monthData) => (
                    <div key={`${monthData.year}-${monthData.month}`}>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        {monthFormatter.format(
                          new Date(monthData.year, monthData.month, 1)
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-7 gap-1 text-[10px] text-zinc-400">
                        {dayLabels.map((label) => {
                          const isWeekendLabel = label === "Сб" || label === "Вс";
                          return (
                            <div
                              key={label}
                              className={`text-center ${
                                isWeekendLabel ? "text-red-500" : ""
                              }`}
                            >
                              {label}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-1 grid grid-cols-7 gap-1">
                        {monthData.cells.map((date, index) => {
                          if (!date) {
                            return (
                              <div
                                key={`empty-${index}`}
                                className="h-7"
                              />
                            );
                          }
                          const value = formatDateValue(date);
                          const isActive = validUntilValue === value;
                          const isToday = value === todayValue;
                          const isPast = value < todayValue;
                          return (
                            <button
                              key={value}
                              type="button"
                              disabled={isPast}
                              className={`h-7 rounded-md text-[11px] ${
                                isToday
                                  ? "bg-zinc-900 text-white"
                                  : isActive
                                  ? "bg-zinc-200 text-zinc-900"
                                  : "text-zinc-700 hover:bg-zinc-100"
                              } ${isPast ? "cursor-not-allowed text-zinc-300" : ""}`}
                              onClick={() => {
                                setValidUntilValue(value);
                                setProposal((prev) => ({
                                  ...prev,
                                  validUntil: formatLongDate(date),
                                }));
                              }}
                            >
                              {date.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-auto rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={onSubmit}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Генерация..." : "Скачать PDF"}
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={async () => {
                    setIsLoading(true);
                    setError(null);
                    try {
                      await saveProposal("manual");
                      lastSavedRef.current = serializeState(
                        proposal,
                        selectedCaseIds,
                        planTasks
                      );
                    } catch (err) {
                      setError("Не удалось сохранить предложение.");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Сохранить версию
                </button>
              </div>
              {error && (
                <div className="mt-2 text-right text-xs text-red-500">{error}</div>
              )}
            </section>
          </div>
        </aside>
      </main>
    </div>
  );
}
