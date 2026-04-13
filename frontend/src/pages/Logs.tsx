import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { processLogs, type LogEvent } from '@/services/mockApi';
import { Button } from '@/components/ui/button';
import { Upload, FileJson } from 'lucide-react';

const placeholder = `{
  "logs": [
    {
      "timestamp": "2024-02-27T10:14:00Z",
      "source": "auth_service",
      "event": "LOGIN_FAILED",
      "user": "john_doe",
      "ip": "192.168.1.105",
      "details": "5 consecutive failed attempts"
    }
  ]
}`;

export default function Logs() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputType, setInputType] = useState('json');

  const handleSubmit = async () => {
    setLoading(true);
    const data = await processLogs(input || placeholder);
    setResults(data);
    setLoading(false);
  };

  const riskColors: Record<string, string> = {
    Critical: 'bg-critical/20 text-critical',
    High: 'bg-high/20 text-high',
    Medium: 'bg-medium/20 text-medium',
    Low: 'bg-low/20 text-low',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Log Input</h2>
          <p className="text-sm text-muted-foreground mt-1">Upload or paste logs for analysis</p>
        </div>

        <div className="flex gap-2">
          {['json', 'auth', 'db'].map((t) => (
            <button key={t} onClick={() => t === 'json' && setInputType(t)} className={`px-4 py-2 rounded-lg text-sm transition-colors ${inputType === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'} ${t !== 'json' ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {t === 'json' ? 'JSON' : t === 'auth' ? 'Auth Logs' : 'DB Logs'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="gradient-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileJson className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">JSON Input</span>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                className="w-full h-64 bg-secondary border border-border rounded-lg p-4 text-sm text-foreground font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="gradient-card border border-border rounded-xl p-8 border-dashed flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors opacity-60">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Drag & drop files here (coming soon)</p>
            </div>
            <Button onClick={handleSubmit} disabled={loading} className="w-full gradient-amber text-primary-foreground hover:opacity-90">
              {loading ? 'Processing...' : 'Analyze Logs'}
            </Button>
          </div>

          <div className="gradient-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-4">Parsed Results</h3>
            {results.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Submit logs to see parsed results</div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {results.map((r) => (
                  <div key={r.id} className="bg-secondary rounded-lg p-4 text-sm font-mono space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-primary">{r.category}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${riskColors[r.risk_level]}`}>{r.risk_level} ({r.risk_score})</span>
                    </div>
                    <p className="text-muted-foreground">{r.description}</p>
                    <p className="text-xs text-muted-foreground">Actor: {r.actor} | Status: {r.status}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
