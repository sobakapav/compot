import { z } from "zod";

export const proposalSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  serviceName: z.string().min(1, "Service name is required"),
  serviceId: z.string().optional().default(""),
  clientLogoDataUrl: z.string().optional().default(""),
  summary: z.string().min(1, "Summary is required"),
  scope: z.string().min(1, "Scope is required"),
  timeline: z.string().min(1, "Timeline is required"),
  price: z.string().min(1, "Price is required"),
  nuances: z.string().optional().default(""),
  assumptions: z.string().optional().default(""),
  deliverables: z.string().optional().default(""),
  contactName: z.string().optional().default(""),
  contactRole: z.string().optional().default(""),
  contactEmail: z.string().optional().default(""),
  contactTelegram: z.string().optional().default(""),
  contactPhone: z.string().optional().default(""),
  validUntil: z.string().optional().default(""),
});

export type Proposal = z.infer<typeof proposalSchema>;
