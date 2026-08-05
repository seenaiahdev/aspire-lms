import { Award, Download, Share2, ShieldCheck, ExternalLink, Calendar } from 'lucide-react';
import { certificates } from '@/data/mock';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function CertificatesScreen() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl text-ink-900">Certificates</h2>
        <p className="text-ink-500 text-sm mt-1">Download, verify, and share your earned certificates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: 'Earned', value: certificates.length, icon: Award, color: 'primary' },
          { label: 'Verified', value: certificates.length, icon: ShieldCheck, color: 'success' },
          { label: 'Shared', value: 2, icon: Share2, color: 'accent' },
        ].map((s, i) => (
          <Card key={i} className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${s.color}-100 flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 text-${s.color}-600`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-900 font-display">{s.value}</p>
              <p className="text-xs text-ink-500">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {certificates.map((cert) => (
          <Card key={cert.id} hover className="overflow-hidden group">
            {/* Certificate preview */}
            <div className="relative h-48 bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 p-6 flex flex-col items-center justify-center text-white text-center">
              <div className="absolute inset-0 dot-pattern opacity-10" />
              <div className="absolute inset-2 border-2 border-white/20 rounded-xl" />
              <div className="relative z-10">
                <Award className="w-12 h-12 text-secondary-300 mx-auto mb-2" />
                <p className="text-xs uppercase tracking-wider text-white/60 mb-1">Certificate of Completion</p>
                <p className="font-display font-bold text-lg leading-tight">{cert.title}</p>
                <p className="text-xs text-white/70 mt-1">Grade: {cert.grade}</p>
              </div>
            </div>
            <CardBody>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-ink-900 text-sm">{cert.course}</h3>
                <Badge variant="success">{cert.grade}</Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-ink-500 mb-4">
                <Calendar className="w-3.5 h-3.5" />{cert.issuedDate}
                <span className="text-ink-300">·</span>
                <span className="font-mono">{cert.verifyId}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" fullWidth leftIcon={<Download className="w-3.5 h-3.5" />}>Download</Button>
                <Button size="sm" variant="ghost" leftIcon={<Share2 className="w-3.5 h-3.5" />}>Share</Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
