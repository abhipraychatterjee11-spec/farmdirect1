"use client";

import Image from "next/image";
import { useState } from "react";
import { Sprout } from "lucide-react";
import { getProductImagePath } from "../lib/product-images";

export function ProductImage({ name, category, imageUrl, imageSource, className = "" }: { name: string; category: string; imageUrl?: string | null; imageSource?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false); const local = getProductImagePath(name); const src = imageUrl || local;
  if (!src || failed) return <div className={`grid place-items-center bg-[#edf4e4] text-[#1E4D36] ${className}`} role="img" aria-label={`${name} image unavailable`}><div className="flex items-center gap-2 text-sm font-semibold"><Sprout size={18} />{category}</div></div>;
  return <div className={`relative overflow-hidden bg-[#edf4e4] ${className}`}>{imageUrl ? <img src={imageUrl} alt={`Fresh ${name}`} className="h-full w-full object-cover" onError={() => setFailed(true)} /> : <Image src={src} alt={`Fresh ${name}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" onError={() => setFailed(true)} />}{imageSource === "ai_generated" && <span className="absolute bottom-2 left-2 rounded-full bg-[#f7f5ed]/95 px-2 py-1 text-[10px] font-semibold text-[#1e4d36]">AI-generated representative image</span>}</div>;
}
