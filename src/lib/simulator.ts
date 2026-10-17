// Campaign simulation. No real calls are ever placed. Every generated record is flagged simulated.
import { useStore, uid, now, minutesUsed } from "./store";
import type { CallRecord, Interest, Lead, LeadStatus, Sentiment } from "./types";

const timers = new Map<string, ReturnType<typeof setInterval>>();

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function inHours(start: string, end: string) {
  const d = new Date();
  const m = d.getHours() * 60 + d.getMinutes();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return m >= sh * 60 + sm && m <= eh * 60 + em;
}

export type LimitCheck = { ok: true } | { ok: false; reason: string };

export function checkLimits(campaignId: string): LimitCheck {
  const s = useStore.getState();
  const r = s.restrictions;
  const c = s.campaigns.find((x) => x.id === campaignId);
  if (!c) return { ok: false, reason: "Campaign not found" };
  if (r.emergencyStop) return { ok: false, reason: "Emergency stop is active" };
  const used = minutesUsed(s.calls);
  const today = new Date().toDateString();
  const todays = s.calls.filter((x) => new Date(x.at).toDateString() === today);
  const campCalls = s.calls.filter((x) => x.campaignId === c.id);
  const campMin = minutesUsed(campCalls);
  const spend = used * s.usage.pricePerMinute;
  if (used >= r.maxTotalMinutes - r.reserveMinutes) return { ok: false, reason: "Total minute limit (minus reserve) reached" };
  if (used >= s.usage.allowanceMinutes) return { ok: false, reason: "Usage allowance exhausted" };
  if (minutesUsed(todays) >= r.dailyMinutes) return { ok: false, reason: "Daily minute limit reached" };
  if (todays.length >= r.dailyCalls || todays.length >= c.maxCallsPerDay) return { ok: false, reason: "Daily call limit reached" };
  if (s.calls.length >= r.maxTotalCalls) return { ok: false, reason: "Total call limit reached" };
  if (campCalls.length >= r.campaignCalls) return { ok: false, reason: "Campaign call limit reached" };
  if (campMin >= c.maxMinutes) return { ok: false, reason: "Campaign minute limit reached" };
  if (spend >= r.maxSpend || campMin * s.usage.pricePerMinute >= c.maxSpend) return { ok: false, reason: "Spending limit reached" };
  return { ok: true };
}

function makeCall(campaignId: string, contactIdx: number): CallRecord | null {
  const s = useStore.getState();
  const c = s.campaigns.find((x) => x.id === campaignId)!;
  const contacts = s.contacts.filter((x) => x.listId === c.listId);
  const ct = contacts[contactIdx];
  if (!ct) return null;
  const dnc = new Set(s.restrictions.dncList.split(/\s+/).filter(Boolean));
  const base = { id: uid("call_"), contactId: ct.id, contactName: ct.name || "Unknown", phone: ct.phone, campaignId: c.id, campaignName: c.name, at: now(), simulated: true as const, notes: "", transcript: [], questions: [], objections: [], callbackRequested: false, siteVisitRequested: false, followUp: "None" as const };
  if (ct.doNotCall || dnc.has(ct.phone)) {
    return { ...base, durationSec: 0, status: "Skipped", outcome: "Do-not-call list", interest: "None", sentiment: "Neutral", estCost: 0, summary: "Skipped because the number is on the do-not-call list.", nextAction: "None" };
  }
  if (s.restrictions.preventDuplicates && s.calls.some((x) => x.phone === ct.phone && x.status === "Completed")) {
    return { ...base, durationSec: 0, status: "Skipped", outcome: "Already contacted", interest: "None", sentiment: "Neutral", estCost: 0, summary: "Skipped by duplicate-call prevention.", nextAction: "None" };
  }
  const roll = Math.random();
  if (roll < 0.25) {
    const st = pick(["No answer", "Busy", "Failed"] as const);
    return { ...base, durationSec: 0, status: st, outcome: st, interest: "None", sentiment: "Neutral", estCost: 0, summary: `Simulated: ${st.toLowerCase()}.`, nextAction: "Retry later" };
  }
  const interest: Interest = pick(["High", "Medium", "Medium", "Low", "None", "None"]);
  const sentiment: Sentiment = interest === "High" ? "Positive" : interest === "None" ? pick(["Neutral", "Negative"]) : pick(["Positive", "Neutral"]);
  const max = s.restrictions.maxCallSec;
  const durationSec = Math.min(max, Math.round((interest === "None" ? 20 : 45) + Math.random() * max));
  const callback = interest !== "None" && s.restrictions.interestCallback && Math.random() < 0.35;
  const visit = interest === "High" && s.restrictions.interestSiteVisit && Math.random() < 0.6;
  const agent = s.agent.name;
  const transcript = [
    { speaker: "Agent" as const, text: s.agent.greeting },
    { speaker: "Customer" as const, text: interest === "None" ? "Sorry, I'm not interested right now." : "Yes, tell me. Which location is the project in?" },
    ...(interest === "None"
      ? [{ speaker: "Agent" as const, text: "No problem at all. Thank you for your time. Have a good day." }]
      : [
          { speaker: "Agent" as const, text: `${agent}: ${s.agent.locations || "Our project locations"} — I can share details on configurations and pricing.` },
          { speaker: "Customer" as const, text: "What is the price range for a 2BHK?" },
          { speaker: "Agent" as const, text: s.agent.pricing || "Pricing details will be shared by our team as per the approved price sheet." },
          ...(visit ? [{ speaker: "Customer" as const, text: "Can I visit the site this weekend?" }, { speaker: "Agent" as const, text: "Certainly. I've noted a site-visit request; our team will confirm the slot." }] : []),
          ...(callback ? [{ speaker: "Customer" as const, text: "Please call me back in the evening." }, { speaker: "Agent" as const, text: "Noted. We'll call you back within calling hours." }] : []),
        ]),
  ];
  return {
    ...base, durationSec, status: "Completed", interest, sentiment, transcript,
    outcome: visit ? "Site visit requested" : callback ? "Callback requested" : interest === "None" ? "Not interested" : "Information shared",
    estCost: +(durationSec / 60 * s.usage.pricePerMinute).toFixed(2),
    summary: interest === "None" ? "Customer declined politely." : `Customer showed ${interest.toLowerCase()} interest and asked about location and pricing.`,
    questions: interest === "None" ? [] : ["Project location", "2BHK price range"],
    objections: interest === "Low" ? ["Budget concerns"] : [],
    callbackRequested: callback, siteVisitRequested: visit,
    followUp: callback || visit || interest === "High" ? "Pending" : "None",
    nextAction: visit ? "Confirm site visit slot" : callback ? "Schedule callback" : interest === "High" ? "Human follow-up" : "None",
  };
}

function applyCallEffects(call: CallRecord) {
  const s = useStore.getState();
  if (call.status !== "Completed") {
    if (call.status !== "Skipped" && !s.leads.some((l) => l.contactId === call.contactId)) {
      useStore.setState({ leads: [mkLead(call, "Unreachable"), ...s.leads] });
    }
    return;
  }
  const status: LeadStatus = call.siteVisitRequested ? "Site Visit Requested" : call.callbackRequested ? "Callback Requested" : call.interest === "High" ? "Highly Interested" : call.interest === "Medium" ? "Interested" : call.interest === "Low" ? "Follow-up Required" : "Not Interested";
  const existing = s.leads.find((l) => l.contactId === call.contactId);
  let lead: Lead;
  if (existing) {
    lead = { ...existing, status, updatedAt: now(), timeline: [{ at: now(), text: `Simulated call: ${call.outcome}` }, ...existing.timeline] };
    useStore.setState({ leads: s.leads.map((l) => (l.id === lead.id ? lead : l)) });
  } else {
    lead = mkLead(call, status);
    useStore.setState({ leads: [lead, ...s.leads] });
  }
  const st = useStore.getState();
  if (call.siteVisitRequested) {
    const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); d.setHours(11, 0, 0, 0);
    useStore.setState({ appointments: [{ id: uid("ap_"), leadId: lead.id, name: lead.name, phone: lead.phone, type: "Site visit", property: st.agent.projects.split("\n")[0] || "Project", date: d.toISOString(), status: "Requested" }, ...st.appointments] });
    st.notify("visit", "Site visit requested", `${lead.name} requested a site visit.`);
  }
  if (call.callbackRequested) {
    const d = new Date(Date.now() + 86400000);
    useStore.setState({ followUps: [{ id: uid("fu_"), leadId: lead.id, name: lead.name, due: d.toISOString(), task: "Callback requested", done: false }, ...useStore.getState().followUps] });
    st.notify("callback", "Callback requested", `${lead.name} asked for a callback.`);
  }
  if (call.interest === "High") st.notify("lead", "Highly interested lead", `${lead.name} (${lead.phone}) is highly interested.`);
}

function mkLead(call: CallRecord, status: LeadStatus): Lead {
  const c = useStore.getState().contacts.find((x) => x.id === call.contactId);
  return {
    id: uid("lead_"), contactId: call.contactId, name: call.contactName, phone: call.phone, status,
    propertyInterest: "", preferredLocation: c?.location ?? "", budget: "", callbackPreference: "", notes: "",
    priority: call.interest === "High" && useStore.getState().restrictions.interestPriority,
    timeline: [{ at: now(), text: `Simulated call: ${call.outcome}` }], updatedAt: now(),
  };
}

export function startSimulation(campaignId: string) {
  stopTimer(campaignId);
  const st = useStore.getState();
  st.patchCampaign(campaignId, { status: "Running" });
  const tick = () => {
    const s = useStore.getState();
    const c = s.campaigns.find((x) => x.id === campaignId);
    if (!c || c.status !== "Running") return stopTimer(campaignId);
    if (!inHours(s.restrictions.callingStart, s.restrictions.callingEnd) || !inHours(c.hoursStart, c.hoursEnd)) {
      s.patchCampaign(campaignId, { status: "Paused" });
      s.notify("campaign", "Campaign paused", `${c.name}: outside permitted calling hours.`);
      return stopTimer(campaignId);
    }
    const lim = checkLimits(campaignId);
    if (!lim.ok) {
      if (s.restrictions.autoPause || s.restrictions.emergencyStop) {
        s.patchCampaign(campaignId, { status: s.restrictions.emergencyStop ? "Stopped" : "Paused" });
        s.notify("usage", "Campaign paused by limit", `${c.name}: ${lim.reason}.`);
        return stopTimer(campaignId);
      }
    }
    const batch: CallRecord[] = [];
    for (let i = 0; i < c.maxConcurrent && c.processed + i < c.total; i++) {
      const call = makeCall(campaignId, c.processed + i);
      if (call) batch.push(call);
    }
    s.addCalls(batch);
    batch.forEach(applyCallEffects);
    const processed = c.processed + batch.length;
    const used = minutesUsed(useStore.getState().calls);
    if (used / s.usage.allowanceMinutes * 100 >= s.usage.warnPercent && used - minutesUsed(batch) < s.usage.allowanceMinutes * s.usage.warnPercent / 100) {
      s.notify("usage", "Usage warning", `Estimated usage passed ${s.usage.warnPercent}% of the allowance.`);
    }
    if (processed >= c.total || batch.length === 0) {
      s.patchCampaign(campaignId, { processed, status: "Completed" });
      s.notify("campaign", "Campaign completed", `${c.name} finished (${processed} contacts, simulated).`);
      return stopTimer(campaignId);
    }
    s.patchCampaign(campaignId, { processed });
  };
  timers.set(campaignId, setInterval(tick, 1200));
  tick();
}

export function stopTimer(id: string) {
  const t = timers.get(id);
  if (t) clearInterval(t);
  timers.delete(id);
}

export function emergencyStopAll() {
  const s = useStore.getState();
  s.campaigns.forEach((c) => { if (c.status === "Running" || c.status === "Paused" || c.status === "Scheduled") { stopTimer(c.id); s.patchCampaign(c.id, { status: "Stopped" }); } });
  s.set("restrictions", { ...s.restrictions, emergencyStop: true });
  s.notify("error", "Emergency stop activated", "All campaigns were stopped.");
}

/** Resume timers after a page reload for campaigns that were running. */
export function resumeRunning() {
  useStore.getState().campaigns.filter((c) => c.status === "Running" && !timers.has(c.id)).forEach((c) => startSimulation(c.id));
}
