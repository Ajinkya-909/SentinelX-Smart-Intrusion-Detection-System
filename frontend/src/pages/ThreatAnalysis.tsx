import DashboardLayout from '@/layouts/DashboardLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';

const patternData = [
  { name: 'Brute Force', count: 45 },
  { name: 'SQL Injection', count: 32 },
  { name: 'XSS', count: 28 },
  { name: 'DDoS', count: 18 },
  { name: 'Privilege Esc.', count: 12 },
  { name: 'Data Exfil.', count: 8 },
];

const radarData = [
  { subject: 'Network', A: 85 },
  { subject: 'Application', A: 72 },
  { subject: 'Database', A: 65 },
  { subject: 'Authentication', A: 90 },
  { subject: 'Endpoint', A: 55 },
  { subject: 'Cloud', A: 40 },
];

export default function ThreatAnalysis() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Threat Analysis</h2>
          <p className="text-sm text-muted-foreground mt-1">AI-powered threat pattern recognition</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="gradient-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-4">Attack Patterns</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={patternData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 5%, 22%)" />
                  <XAxis dataKey="name" stroke="hsl(30, 10%, 55%)" fontSize={11} />
                  <YAxis stroke="hsl(30, 10%, 55%)" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(30, 6%, 13%)', border: '1px solid hsl(30, 5%, 22%)', borderRadius: '8px', color: 'hsl(40, 20%, 90%)' }} />
                  <Bar dataKey="count" fill="hsl(40, 90%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="gradient-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-4">Threat Surface</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(30, 5%, 22%)" />
                  <PolarAngleAxis dataKey="subject" stroke="hsl(30, 10%, 55%)" fontSize={11} />
                  <Radar dataKey="A" stroke="hsl(40, 90%, 50%)" fill="hsl(40, 90%, 50%)" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="gradient-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-3">🧠 AI Analysis Summary</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p><span className="text-primary font-medium">Pattern Detected:</span> A significant increase in brute-force authentication attempts has been observed, primarily targeting the AUTH service between 8:00 AM and 10:00 AM. The attack pattern suggests a coordinated effort from multiple source IPs.</p>
            <p><span className="text-primary font-medium">Risk Assessment:</span> The correlation between failed login attempts and subsequent API anomalies indicates potential credential stuffing. Recommend immediate implementation of rate limiting and enhanced monitoring on affected endpoints.</p>
            <p><span className="text-primary font-medium">Recommendation:</span> Enable multi-factor authentication for all admin accounts, implement IP-based rate limiting, and review database access patterns for the past 48 hours to identify any successful breaches.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
