// Prototype data-access layer. Persists to this browser only (clearly labelled in the UI).
// Replace with server functions + a database for production. Never trust this for auth or enforcement.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AgentConfig, AppNotification, Appointment, CallRecord, Campaign, Contact, ContactList,
  FollowUp, IntegrationSettings, KnowledgeDoc, Lead, NotificationKind, NotificationPrefs,
  Profile, Restrictions, UsageSettings,
} from "./types";

export const uid = (p = "") => p + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const now = () => new Date().toISOString();

export const defaultAgent: AgentConfig = {
  name: "Priya",
  purpose: "Introduce our residential projects, answer questions, qualify interest and schedule site visits.",
  company: "",
  projects: "",
  locations: "",
  amenities: "",
  pricing: "",
  faqs: "",
  greeting: "నమస్కారం! నేను ప్రియ, మీతో మా కొత్త రెసిడెన్షియల్ ప్రాజెక్ట్ గురించి మాట్లాడవచ్చా?",
  instructions: "Be concise and respectful. Never pressure the customer. Only share approved information from the knowledge base.",
  language: "Telugu",
  futureLanguages: ["Hindi", "English", "Tamil", "Kannada"],
  voiceProvider: "Bolna (not connected)",
  voiceId: "",
  tone: "Warm & professional",
  objectives: "Qualify interest, capture preferred location and budget (if offered), and book a site visit.",
  qualificationQuestions: "Are you looking to buy for yourself or as an investment?\nWhich location do you prefer?\nWhat timeline are you considering?",
  endingInstructions: "Thank the customer, summarise next steps, and end politely.",
  callbackRules: "Offer a callback at the customer's preferred time within calling hours.",
  siteVisitRules: "Offer weekend slots between 10:00 and 17:00. Confirm name, date and project.",
  humanHandoffRules: "If the customer asks for a person or raises a complaint, flag for human follow-up.",
  status: "Draft",
};

export const defaultRestrictions: Restrictions = {
  maxCallSec: 120, warnBeforeSec: 15, endRules: "Wrap up politely when the limit approaches; offer a callback if the customer is interested.",
  maxTotalMinutes: 5000, dailyMinutes: 500, weeklyMinutes: 2500, monthlyMinutes: 5000,
  maxTotalCalls: 10000, dailyCalls: 1000, campaignCalls: 2000,
  maxSpend: 50000, maxCostPerCall: 25, reserveMinutes: 100, warnPercent: 80, autoPause: true,
  interestContinue: true, interestCallback: true, interestSiteVisit: true, interestHuman: true, interestPriority: true, politeEnd: true,
  dncList: "", preventDuplicates: true, allowedListIds: [], callingStart: "10:00", callingEnd: "19:00",
  retryLimit: 2, requireConsent: true, manualApproval: true, emergencyStop: false,
};

interface State {
  session: { mode: "dev-preview"; email: string; since: string } | null;
  profile: Profile;
  agent: AgentConfig;
  docs: KnowledgeDoc[];
  lists: ContactList[];
  contacts: Contact[];
  campaigns: Campaign[];
  calls: CallRecord[];
  leads: Lead[];
  appointments: Appointment[];
  followUps: FollowUp[];
  restrictions: Restrictions;
  usage: UsageSettings;
  notifications: AppNotification[];
  notifPrefs: NotificationPrefs;
  integration: IntegrationSettings;

  set: <K extends keyof State>(key: K, value: State[K]) => void;
  notify: (kind: NotificationKind, title: string, body: string) => void;
  importContacts: (list: ContactList, contacts: Contact[]) => void;
  deleteList: (id: string) => void;
  upsertCampaign: (c: Campaign) => void;
  patchCampaign: (id: string, p: Partial<Campaign>) => void;
  addCalls: (calls: CallRecord[]) => void;
  patchCall: (id: string, p: Partial<CallRecord>) => void;
  patchLead: (id: string, p: Partial<Lead>, event?: string) => void;
  resetAll: () => void;
}

const initial = {
  session: null,
  profile: { displayName: "Owner", company: "", timezone: "Asia/Kolkata" },
  agent: defaultAgent,
  docs: [] as KnowledgeDoc[],
  lists: [] as ContactList[],
  contacts: [] as Contact[],
  campaigns: [] as Campaign[],
  calls: [] as CallRecord[],
  leads: [] as Lead[],
  appointments: [] as Appointment[],
  followUps: [] as FollowUp[],
  restrictions: defaultRestrictions,
  usage: { pricePerMinute: 6, currency: "INR", allowanceMinutes: 5000, warnPercent: 80 } as UsageSettings,
  notifications: [] as AppNotification[],
  notifPrefs: {
    inApp: { lead: true, callback: true, visit: true, usage: true, campaign: true, error: true },
    email: "",
  } as NotificationPrefs,
  integration: { provider: "Bolna", agentId: "", webhookUrl: "", fromNumber: "" } as IntegrationSettings,
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial,
      set: (key, value) => set({ [key]: value } as Partial<State>),
      notify: (kind, title, body) => {
        if (!get().notifPrefs.inApp[kind]) return;
        set((s) => ({ notifications: [{ id: uid("n_"), kind, title, body, at: now(), read: false }, ...s.notifications].slice(0, 300) }));
      },
      importContacts: (list, contacts) =>
        set((s) => ({ lists: [list, ...s.lists], contacts: [...s.contacts, ...contacts] })),
      deleteList: (id) =>
        set((s) => ({ lists: s.lists.filter((l) => l.id !== id), contacts: s.contacts.filter((c) => c.listId !== id) })),
      upsertCampaign: (c) =>
        set((s) => ({ campaigns: s.campaigns.some((x) => x.id === c.id) ? s.campaigns.map((x) => (x.id === c.id ? c : x)) : [c, ...s.campaigns] })),
      patchCampaign: (id, p) => set((s) => ({ campaigns: s.campaigns.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
      addCalls: (calls) => set((s) => ({ calls: [...calls, ...s.calls] })),
      patchCall: (id, p) => set((s) => ({ calls: s.calls.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
      patchLead: (id, p, event) =>
        set((s) => ({
          leads: s.leads.map((l) =>
            l.id === id ? { ...l, ...p, updatedAt: now(), timeline: event ? [{ at: now(), text: event }, ...l.timeline] : l.timeline } : l,
          ),
        })),
      resetAll: () => set({ ...initial, session: get().session }),
    }),
    { name: "voicedesk-prototype-v1" },
  ),
);

export const minutesUsed = (calls: CallRecord[]) => calls.reduce((a, c) => a + c.durationSec, 0) / 60;
