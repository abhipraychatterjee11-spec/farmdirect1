"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageSquareText, Phone } from "lucide-react";
import { dashboardForRole, type AppRole } from "../lib/auth";
import { normalizeIndianPhone } from "../lib/phone";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

const input = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-green-100";

type Profile = { phone: string | null; role: AppRole };

export function PhoneLinking() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.replace("/login");
        return;
      }
      const { data } = await supabase.from("profiles").select("phone, role").eq("id", user.id).maybeSingle();
      if (!data) {
        window.location.replace("/unauthorized");
        return;
      }
      const currentProfile = data as Profile;
      setProfile(currentProfile);
      setPhone(currentProfile.phone ?? user.phone ?? "");
      setLoading(false);
    }
    void loadProfile();
  }, []);

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeIndianPhone(phone);
    if (!normalized) {
      setError("Enter a valid Indian mobile number, for example +919876543210.");
      return;
    }

    setSubmitting(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ phone: normalized });
    if (updateError) {
      setError("We could not send a verification code to this mobile number. Check the number and try again.");
      setSubmitting(false);
      return;
    }
    setPendingPhone(normalized);
    setCode("");
    setSubmitting(false);
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingPhone || !/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit verification code sent to your mobile.");
      return;
    }

    setSubmitting(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { error: verificationError } = await supabase.auth.verifyOtp({ phone: pendingPhone, token: code, type: "phone_change" });
    if (verificationError) {
      setError("That verification code is invalid or has expired. Request a new code and try again.");
      setSubmitting(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !profile) {
      setError("Your session could not be confirmed. Please log in again.");
      setSubmitting(false);
      return;
    }
    const { error: profileError } = await supabase.from("profiles").update({ phone: pendingPhone }).eq("id", user.id);
    if (profileError) {
      setError("Your mobile was verified, but FarmDirect could not save it to your profile. Please contact the demo team.");
      setSubmitting(false);
      return;
    }
    await supabase.auth.refreshSession();
    router.replace(dashboardForRole(profile.role));
    router.refresh();
  }

  async function resendCode() {
    if (!pendingPhone) return;
    setSubmitting(true);
    setError("");
    const { error: resendError } = await createSupabaseBrowserClient().auth.resend({ type: "phone_change", phone: pendingPhone });
    if (resendError) setError("We could not resend the verification code. Please try again shortly.");
    setSubmitting(false);
  }

  if (loading) return <p className="mt-6 text-sm text-slate-600">Loading your mobile details…</p>;

  return <div className="mt-7 space-y-5">
    <div className="rounded-2xl border border-green-950/10 bg-[#f7faf5] p-4 text-sm leading-6 text-slate-700">
      <div className="flex items-start gap-3"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-green-100 text-leaf"><Phone size={16} /></span><p><strong className="text-leaf">Mobile sign-in is optional.</strong> Verify your number to use OTP login later. It stays connected to this FarmDirect account and does not create a new profile.</p></div>
      {profile?.phone && <p className="mt-3 border-t border-green-950/10 pt-3 text-xs text-slate-600">Current profile mobile: <span className="font-semibold text-slate-700">{profile.phone}</span></p>}
    </div>

    {!pendingPhone ? (
      <form onSubmit={sendCode} className="space-y-4">
        <label className="block text-sm font-semibold">Indian mobile number<input className={input} value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="+919876543210" required /></label>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={submitting} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><MessageSquareText size={17} />{submitting ? "Sending code…" : "Send verification code"}</button>
      </form>
    ) : (
      <form onSubmit={verifyCode} className="space-y-4">
        <label className="block text-sm font-semibold">Verification code<input className={input} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" required /></label>
        <p className="text-xs leading-5 text-slate-600">We sent a code to {pendingPhone}. Verifying it links this same account for mobile OTP sign-in.</p>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={submitting} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><CheckCircle2 size={17} />{submitting ? "Verifying…" : "Verify mobile"}</button>
        <div className="flex items-center justify-between gap-3 text-sm"><button type="button" onClick={() => { setPendingPhone(null); setError(""); }} className="font-semibold text-leaf hover:underline">Change number</button><button type="button" onClick={resendCode} disabled={submitting} className="font-semibold text-leaf hover:underline disabled:opacity-60">Resend code</button></div>
      </form>
    )}

    {profile && <Link href={dashboardForRole(profile.role)} className="block text-center text-sm font-semibold text-slate-600 hover:text-leaf">Continue without mobile OTP</Link>}
  </div>;
}
