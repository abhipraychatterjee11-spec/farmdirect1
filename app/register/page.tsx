import Link from "next/link";
import { Leaf } from "lucide-react";
import { RegisterForm } from "../../components/auth-forms";

export default function RegisterPage() { return <main className="page-shell grid min-h-screen place-items-center p-5"><section className="w-full max-w-2xl rounded-3xl bg-white p-7 shadow-xl shadow-green-950/10 sm:p-9"><Link href="/" className="flex items-center gap-2 text-lg font-bold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-leaf text-white"><Leaf size={19}/></span>FarmDirect <span className="text-clay">AI</span></Link><span className="mt-8 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-leaf">Join the direct market</span><h1 className="mt-4 text-3xl font-extrabold">Create your account</h1><p className="mt-2 text-sm leading-6 text-slate-600">Your role determines the secure workspace FarmDirect opens for you.</p><RegisterForm/></section></main>; }
