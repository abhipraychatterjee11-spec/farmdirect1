"use client";

import Image from "next/image";
import { useState } from "react";
import { Sprout } from "lucide-react";
import { getProductImagePath } from "../lib/product-images";

export function ProductImage({ name, category, className = "" }: { name: string; category: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = getProductImagePath(name);

  if (!src || failed) {
    return <div className={`grid place-items-center bg-[#edf4e4] text-[#1E4D36] ${className}`} role="img" aria-label={`${name} image unavailable`}><div className="flex items-center gap-2 text-sm font-semibold"><Sprout size={18} />{category}</div></div>;
  }

  return <div className={`relative overflow-hidden bg-[#edf4e4] ${className}`}><Image src={src} alt={`Fresh ${name}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" onError={() => setFailed(true)} /></div>;
}
