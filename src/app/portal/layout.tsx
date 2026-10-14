"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import PatientShell from "@/components/patient/PatientShell";

/**
 * Keep the patient navigation shell mounted across portal route changes.
 * Authentication screens intentionally remain outside the dashboard shell.
 */
export default function PatientPortalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/portal/login" || pathname === "/portal/register";

  if (isAuthPage) return <>{children}</>;

  return <PatientShell>{children}</PatientShell>;
}
