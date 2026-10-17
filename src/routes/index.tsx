import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Eye, EyeOff, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useStore, now } from "@/lib/store";
import building from "@/assets/login-building.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Estate Voice" },
      { name: "description", content: "Owner sign-in for the Estate Voice real-estate calling dashboard." },
      { property: "og:title", content: "Sign in — Estate Voice" },
      { property: "og:description", content: "Owner sign-in for the Estate Voice real-estate calling dashboard." },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const setKey = useStore((s) => s.set);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; pw?: string; form?: string }>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: typeof errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) er.email = "Enter a valid email address.";
    if (pw.length < 8) er.pw = "Password must be at least 8 characters.";
    if (!Object.keys(er).length) er.form = "Secure sign-in has not been configured yet. The authorised owner account will be connected once credentials are provided.";
    setErrors(er);
  };

  const preview = () => {
    setKey("session", { mode: "dev-preview", email: "development preview", since: now() });
    nav({ to: "/overview" });
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary"><Building2 className="h-4.5 w-4.5 text-gold" /></div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Estate Voice</div>
            <div className="text-[0.6875rem] text-muted-foreground">Calling & lead desk</div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm py-12">
          <div className="eyebrow mb-3">Owner access</div>
          <h1 className="text-[1.75rem] font-semibold leading-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in with your authorised email to manage campaigns, leads and site visits.</p>

          <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" aria-invalid={!!errors.email} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw" className="text-xs">Password</Label>
              <div className="relative">
                <Input id="pw" type={show ? "text" : "password"} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className="h-11 pr-11" aria-invalid={!!errors.pw} />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.pw && <p className="text-xs text-destructive">{errors.pw}</p>}
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} /> Keep me signed in on this device
            </label>
            {errors.form && (
              <div className="flex gap-2 rounded-md border border-destructive/20 bg-destructive-soft px-3 py-2.5 text-xs text-destructive">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />{errors.form}
              </div>
            )}
            <Button type="submit" className="h-11 w-full"><Lock className="h-4 w-4" />Sign in</Button>
          </form>

          <div className="mt-8 rounded-md border border-dashed border-gold/50 bg-accent/50 p-4">
            <div className="text-xs font-semibold text-accent-foreground">Development preview</div>
            <p className="mt-1 text-[0.6875rem] leading-relaxed text-accent-foreground/80">Open the dashboard without authentication to review the prototype. This is not a secure session; data is stored in this browser only and all calls are simulated.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={preview}>Enter development preview</Button>
          </div>
        </div>

        <p className="text-[0.6875rem] text-muted-foreground">Single authorised owner. No public registration.</p>
      </div>

      <div className="relative hidden overflow-hidden lg:block">
        <img src={building} alt="Modern residential tower at dusk" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/20 to-transparent" />
        <div className="absolute bottom-0 p-14 text-primary-foreground">
          <div className="mb-3 h-px w-12 bg-gold" />
          <p className="max-w-md text-xl font-light leading-snug">Every enquiry answered in Telugu, every interested buyer followed up, every site visit on the calendar.</p>
        </div>
      </div>
    </div>
  );
}
