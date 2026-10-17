// Typed domain models. The data-access layer (store.ts) can be swapped for a real database later.

export type ID = string;

export interface Contact {
  id: ID;
  name: string;
  phone: string; // normalized E.164, e.g. +919876543210
  location?: string;
  custom: Record<string, string>;
  listId: ID;
  createdAt: string;
  doNotCall?: boolean;
}

export interface ContactList {
  id: ID;
  name: string;
  sourceFile: string;
  fileType: "csv" | "xlsx" | "xls" | "pdf";
  count: number;
  rejected: number;
  duplicates: number;
  createdAt: string;
}

export interface KnowledgeDoc {
  id: ID;
  title: string;
  category: "Company" | "Property" | "FAQ" | "Pricing" | "Amenities" | "Reference";
  content: string;
  fileName?: string;
  updatedAt: string;
}

export interface AgentConfig {
  name: string;
  purpose: string;
  company: string;
  projects: string;
  locations: string;
  amenities: string;
  pricing: string;
  faqs: string;
  greeting: string;
  instructions: string;
  language: string;
  futureLanguages: string[];
  voiceProvider: string;
  voiceId: string;
  tone: "Warm & professional" | "Formal" | "Friendly" | "Consultative";
  objectives: string;
  qualificationQuestions: string;
  endingInstructions: string;
  callbackRules: string;
  siteVisitRules: string;
  humanHandoffRules: string;
  status: "Draft" | "Ready" | "Paused";
}

export type CampaignStatus = "Draft" | "Scheduled" | "Running" | "Paused" | "Completed" | "Cancelled" | "Stopped";

export interface Campaign {
  id: ID;
  name: string;
  agentName: string;
  listId: ID;
  objective: string;
  startDate: string;
  endDate: string;
  hoursStart: string;
  hoursEnd: string;
  days: string[];
  maxCallsPerDay: number;
  maxConcurrent: number;
  maxAttempts: number;
  retryMinutes: number;
  maxMinutes: number;
  maxSpend: number;
  status: CampaignStatus;
  processed: number;
  total: number;
  createdAt: string;
  confirmedAt?: string;
}

export type CallStatus = "Completed" | "No answer" | "Busy" | "Failed" | "Skipped";
export type Interest = "High" | "Medium" | "Low" | "None";
export type Sentiment = "Positive" | "Neutral" | "Negative";

export interface TranscriptLine { speaker: "Agent" | "Customer"; text: string }

export interface CallRecord {
  id: ID;
  contactId: ID;
  contactName: string;
  phone: string;
  campaignId: ID;
  campaignName: string;
  at: string;
  durationSec: number;
  status: CallStatus;
  outcome: string;
  interest: Interest;
  sentiment: Sentiment;
  estCost: number;
  followUp: "None" | "Pending" | "Done";
  transcript: TranscriptLine[];
  summary: string;
  questions: string[];
  objections: string[];
  callbackRequested: boolean;
  siteVisitRequested: boolean;
  nextAction: string;
  notes: string;
  simulated: true;
}

export const LEAD_STATUSES = [
  "New", "Interested", "Highly Interested", "Callback Requested", "Site Visit Requested",
  "Follow-up Required", "Converted", "Not Interested", "Unreachable", "Do Not Contact",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface TimelineEvent { at: string; text: string }

export interface Lead {
  id: ID;
  contactId: ID;
  name: string;
  phone: string;
  status: LeadStatus;
  propertyInterest: string;
  preferredLocation: string;
  budget: string;
  callbackPreference: string;
  notes: string;
  priority: boolean;
  timeline: TimelineEvent[];
  updatedAt: string;
}

export interface Appointment {
  id: ID;
  leadId: ID;
  name: string;
  phone: string;
  type: "Site visit" | "Callback";
  property: string;
  date: string; // ISO date-time
  status: "Requested" | "Confirmed" | "Completed" | "Cancelled";
}

export interface FollowUp {
  id: ID;
  leadId: ID;
  name: string;
  due: string;
  task: string;
  done: boolean;
}

export interface Restrictions {
  maxCallSec: number;
  warnBeforeSec: number;
  endRules: string;
  maxTotalMinutes: number;
  dailyMinutes: number;
  weeklyMinutes: number;
  monthlyMinutes: number;
  maxTotalCalls: number;
  dailyCalls: number;
  campaignCalls: number;
  maxSpend: number;
  maxCostPerCall: number;
  reserveMinutes: number;
  warnPercent: number;
  autoPause: boolean;
  interestContinue: boolean;
  interestCallback: boolean;
  interestSiteVisit: boolean;
  interestHuman: boolean;
  interestPriority: boolean;
  politeEnd: boolean;
  dncList: string; // newline separated numbers
  preventDuplicates: boolean;
  allowedListIds: ID[]; // empty = all
  callingStart: string;
  callingEnd: string;
  retryLimit: number;
  requireConsent: boolean;
  manualApproval: boolean;
  emergencyStop: boolean;
}

export interface UsageSettings {
  pricePerMinute: number;
  currency: "INR" | "USD";
  allowanceMinutes: number;
  warnPercent: number;
}

export type NotificationKind = "lead" | "callback" | "visit" | "usage" | "campaign" | "error";

export interface AppNotification {
  id: ID;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
}

export interface NotificationPrefs {
  inApp: Record<NotificationKind, boolean>;
  email: string; // placeholder only
}

export interface Profile { displayName: string; company: string; timezone: string }

export interface IntegrationSettings {
  provider: "Bolna";
  agentId: string;
  webhookUrl: string;
  fromNumber: string;
  // Note: API keys are never stored in the browser. They belong in server-side secrets.
}
