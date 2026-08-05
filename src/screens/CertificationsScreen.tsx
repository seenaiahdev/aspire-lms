import React, { useState } from 'react';
import { Award, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';

export function CertificationsScreen() {
  const [toastVisible, setToastVisible] = useState(false);
  return (
    <div className="max-w-5xl mx-auto py-20 px-6 font-sans">
      {toastVisible && (
        <Toast message="We'll notify you when certifications are available." onClose={() => setToastVisible(false)} position="top-right" />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="rounded-3xl bg-white p-10 shadow-md text-center">
          <div className="mx-auto w-28 h-28 rounded-full bg-amber-50 flex items-center justify-center mb-6">
            <Award className="w-12 h-12 text-amber-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Certifications</h1>
          <p className="text-slate-500 mb-6">Certification management is coming soon. Stay tuned for verified badges and certificates.</p>
          <div className="flex justify-center gap-3">
            <Button variant="primary" size="md" onClick={() => setToastVisible(true)}>Get Notified</Button>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-md">
          <h3 className="text-lg font-semibold mb-3">What to expect</h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500 mt-1" />
              <div>
                <div className="font-medium">Verified certificates</div>
                <div className="text-xs">Download, verify and share credentials with employers.</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-sky-500 mt-1" />
              <div>
                <div className="font-medium">Badge system</div>
                <div className="text-xs">Earn badges for skill milestones and display them on your profile.</div>
              </div>
            </li>
            {/* Removed Verification API item per design request */}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default CertificationsScreen;
