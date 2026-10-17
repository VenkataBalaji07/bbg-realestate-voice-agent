import type { ReactNode } from "react";
import { Download, FileSpreadsheet, FileText, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { exportRows, type Row } from "@/lib/exporter";
import { toast } from "sonner";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold text-foreground sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, actions, children, className }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border bg-card shadow-card", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            {title && <h2 className="text-[0.9375rem] font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "gold" | "success" | "warning" | "destructive" }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-card">
      <div className="eyebrow">{label}</div>
      <div className={cn("num mt-2 text-2xl font-semibold", tone === "success" && "text-success", tone === "warning" && "text-warning", tone === "destructive" && "text-destructive", tone === "gold" && "text-gold")}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

const toneMap: Record<string, string> = {
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/25",
  destructive: "bg-destructive-soft text-destructive border-destructive/20",
  gold: "bg-accent text-accent-foreground border-gold/30",
  navy: "bg-secondary text-primary border-primary/15",
  muted: "bg-muted text-muted-foreground border-border",
};

export function Tag({ tone = "muted", children }: { tone?: keyof typeof toneMap; children: ReactNode }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[0.6875rem] font-medium", toneMap[tone])}>{children}</span>;
}

export function statusTone(s: string): keyof typeof toneMap {
  if (/completed|converted|highly|high|positive|confirmed|ready|done|running/i.test(s)) return "success";
  if (/callback|site visit|follow|pending|paused|medium|requested|scheduled|warning/i.test(s)) return "warning";
  if (/fail|not interested|negative|do not|stopped|cancel|error|unreach|busy|none|no answer/i.test(s)) return "destructive";
  if (/interested|new/i.test(s)) return "navy";
  return "muted";
}

export function StatusTag({ value }: { value: string }) {
  return <Tag tone={statusTone(value)}>{value}</Tag>;
}

export function Notice({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "warning" | "destructive" }) {
  return (
    <div className={cn("flex gap-2.5 rounded-md border px-4 py-3 text-xs leading-relaxed", toneMap[tone])}>
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[0.6875rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Empty({ icon: Icon, title, body, action }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border bg-secondary"><Icon className="h-5 w-5 text-primary" /></div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ExportMenu({ title, rows, columns }: { title: string; rows: Row[]; columns?: string[] }) {
  const run = async (f: "csv" | "xlsx" | "pdf") => {
    if (!rows.length) return toast.error("Nothing to export yet.");
    try { await exportRows(f, title, rows, columns); toast.success(`${title} exported`); } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm"><Download className="h-4 w-4" />Export</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => run("xlsx")}><FileSpreadsheet className="h-4 w-4" />Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("csv")}><FileSpreadsheet className="h-4 w-4" />CSV (.csv)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("pdf")}><FileText className="h-4 w-4" />PDF (.pdf)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const fmtDate = (s: string) => new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
export const fmtDur = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
export const money = (n: number, cur = "INR") => new Intl.NumberFormat("en-IN", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
