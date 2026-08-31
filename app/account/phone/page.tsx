import Link from "next/link";
import { Leaf } from "lucide-react";
import { PhoneLinking } from "../../../components/phone-linking";

export default function PhoneSettingsPage() {
  return <main className="page-shell grid min-h-screen place-items-center p-5"><section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl shadow-green-950/10 sm:p-9"><Link href="/" className="flex items-center gap-2 text-lg font-bold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-leaf text-white"><Leaf size={19} /></span>FarmDirect <span className="text-clay">AI</span></Link><span className="mt-8 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-leaf">Optional account security</span><h1 className="mt-4 text-3xl font-extrabold">Enable mobile login</h1><p className="mt-2 text-sm leading-6 text-slate-600">Verify your mobile number once to enable OTP login for your existing FarmDirect account.</p><PhoneLinking /></section></main>;
}
