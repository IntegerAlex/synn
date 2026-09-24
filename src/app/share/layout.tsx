"use client";

import { QueryProvider } from "@/components/providers/QueryProvider";

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <QueryProvider>{children}</QueryProvider>;
}
