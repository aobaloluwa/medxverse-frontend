"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import PatientShell from "@/components/patient/PatientShell";

/**
 * Keep the patient navigation shell mounted across portal route changes.
 * Public emergency SOS, call routes, and authentication screens remain accessible without mandatory login.
 */
export default function PatientPortalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicOrCallRoute =
    pathname === "/portal/login" ||
    pathname === "/portal/register" ||
    pathname === "/portal/emergency" ||
    pathname.startsWith("/portal/call/");

  if (isPublicOrCallRoute) return <>{children}</>;

  return <PatientShell>{children}</PatientShell>;
}
