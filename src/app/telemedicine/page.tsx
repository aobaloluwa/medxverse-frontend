'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { openTelemedicineCall } from '@/lib/telemedicine-call-window';

function TelemedicineRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const account = useAuthStore((state) => state.account);
  const sessionId = searchParams.get('sessionId');

  useEffect(() => {
    if (sessionId) {
      const isStaff = account?.userType === 'STAFF';
      const target = isStaff
        ? `/staff/call/${encodeURIComponent(sessionId)}`
        : `/portal/call/${encodeURIComponent(sessionId)}`;

      openTelemedicineCall(sessionId, target, isStaff ? 'Staff Consultation Call' : 'Patient Virtual Care');
      router.replace(target);
      return;
    }

    if (account?.userType === 'PATIENT') {
      router.replace('/portal/telemedicine');
      return;
    }

    if (account?.userType === 'STAFF') {
      router.replace('/staff/messages/consultations');
      return;
    }

    // Default to portal telemedicine if no user session
    router.replace('/portal/telemedicine');
  }, [account?.userType, router, sessionId]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
      Opening your MedXVerse consultation…
    </div>
  );
}

export default function LegacyTelemedicineRedirect() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
          Opening your MedXVerse consultation…
        </div>
      }
    >
      <TelemedicineRedirectContent />
    </Suspense>
  );
}
