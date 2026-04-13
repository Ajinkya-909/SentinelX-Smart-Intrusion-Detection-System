import { Link } from 'react-router-dom';
import { Shield, Brain, BarChart3, Activity, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  { icon: Activity, title: 'Real-time Log Analysis', desc: 'Process and analyze thousands of log entries in real-time with intelligent parsing.' },
  { icon: Brain, title: 'AI-Powered Detection', desc: 'Machine learning models detect anomalies and threats with high accuracy.' },
  { icon: BarChart3, title: 'Smart Insights', desc: 'Comprehensive dashboards with actionable threat intelligence and risk scoring.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <img src="/logo.PNG" alt="SentinelX" className="w-8 h-8" />
          <span className="font-bold text-lg text-foreground">SentinelX</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login"><Button variant="ghost" className="text-muted-foreground hover:text-foreground">Login</Button></Link>
          <Link to="/signup"><Button className="gradient-amber text-primary-foreground hover:opacity-90">Get Started</Button></Link>
        </div>
      </nav>

      <section className="max-w-5xl mx-auto text-center py-32 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-secondary mb-8">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground">Intelligent Threat Detection</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          <span className="text-gradient-amber">SentinelX</span>
          <br />
          <span className="text-foreground">Smart Intrusion Detection System</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          AI-powered log analysis and threat detection platform. Monitor, detect, and respond to security threats in real-time with intelligent risk scoring.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/signup"><Button size="lg" className="gradient-amber text-primary-foreground hover:opacity-90 gap-2">Get Started <ArrowRight className="w-4 h-4" /></Button></Link>
          <Link to="/login"><Button size="lg" variant="outline" className="border-border text-foreground hover:bg-secondary">Login</Button></Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-32">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="gradient-card border border-border rounded-xl p-6 hover:glow-amber transition-shadow">
              <div className="w-12 h-12 rounded-lg gradient-amber flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
