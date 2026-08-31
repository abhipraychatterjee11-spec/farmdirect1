import type { Metadata } from "next";
import "./globals.css";
import { SessionHeader } from "../components/session-header";
import { ContextBackButton } from "../components/context-back-button";
export const metadata: Metadata = { title: "FarmDirect", description: "Direct farm-to-buyer marketplace" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><SessionHeader /><ContextBackButton />{children}</body></html>; }
