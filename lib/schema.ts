import { z } from "zod";

export const proposalSchema = z.object({
  clientName: z.string().optional().default(""),
  serviceName: z.string().optional().default(""),
  serviceId: z.string().optional().default(""),
  clientLogoDataUrl: z.string().optional().default(""),
  summary: z.string().optional().default(""),
  scope: z.string().optional().default(""),
  timeline: z.string().optional().default(""),
  price: z.string().optional().default(""),
  headerCommentTitle: z.string().optional().default(""),
  headerComment: z.string().optional().default(""),
  headerCommentVisible: z.boolean().optional().default(false),
  nuancesTitle: z.string().optional().default(""),
  nuances: z
    .string()
    .optional()
    .default("Детальный план производства — в отдельном документе"),
  nuancesVisible: z.boolean().optional().default(true),
  tasksCommentTitle: z.string().optional().default(""),
  tasksComment: z.string().optional().default(""),
  tasksCommentVisible: z.boolean().optional().default(false),
  assumptions: z.string().optional().default(""),
  deliverables: z.string().optional().default(""),
  contactEmail: z.string().optional().default(""),
  contactTelegram: z.string().optional().default(""),
  contactPhone: z.string().optional().default(""),
  validUntil: z.string().optional().default(""),
  hourlyRate: z.string().optional().default("4000"),
  hourlyRateFrozen: z.boolean().optional().default(false),
  casesRows: z.number().optional().default(1),
  casesTitle1: z.string().optional().default("Похожие проекты"),
  casesTitle2: z.string().optional().default("Похожие проекты 2"),
  casesCommentTitle: z.string().optional().default(""),
  casesComment: z.string().optional().default(""),
  casesCommentVisible: z.boolean().optional().default(false),
});

export type Proposal = z.infer<typeof proposalSchema>;
