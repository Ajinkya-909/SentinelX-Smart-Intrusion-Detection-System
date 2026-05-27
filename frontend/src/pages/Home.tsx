import {
  Shield,
  Zap,
  TrendingUp,
  AlertTriangle,
  Lock,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navigate, useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Shield,
      title: "Smart Threat Detection",
      description:
        "Advanced ML-powered algorithms detect intrusions and anomalies in your system logs with precision.",
      color: "text-primary",
    },
    {
      icon: Zap,
      title: "Real-Time Analysis",
      description:
        "Process and analyze logs asynchronously while staying responsive to your security needs.",
      color: "text-accent",
    },
    {
      icon: TrendingUp,
      title: "Actionable Insights",
      description:
        "Transform raw log data into clear, categorized security insights with severity levels.",
      color: "text-primary",
    },
  ];

  const process = [
    {
      step: "1",
      title: "Upload",
      description: "Securely upload your log files in common formats",
      icon: Lock,
    },
    {
      step: "2",
      title: "Process",
      description: "Our pipeline analyzes, normalizes, and detects threats",
      icon: Activity,
    },
    {
      step: "3",
      title: "Insights",
      description: "Get comprehensive security insights and recommendations",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        {/* Gradient background accent */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-block mb-6 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-sm font-medium text-primary">
              Intelligent Security Platform
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
            Detect Threats in{" "}
            <span className="text-gradient-primary">Your Logs</span>
          </h1>

          {/* Description */}
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            SentinelX is a log-based Smart Intrusion Detection System that
            analyzes system and application logs to detect anomalies, suspicious
            behavior, and potential security threats in real-time.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              onClick={()=>{
                navigate('/login')
              }}
            >
              Get Started
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-accent/30 hover:bg-accent/10 text-foreground"
            >
              Learn More
            </Button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-8 border-t border-border/30">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                99.9%
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Detection Accuracy
              </p>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-accent">
                Real-Time
              </div>
              <p className="text-sm text-muted-foreground mt-1">Log Analysis</p>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                Zero
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                False Positives
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">What We Do</h2>
            <p className="text-muted-foreground text-lg">
              Powerful features designed for modern security teams
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="group relative p-8 rounded-lg bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
                >
                  {/* Background accent */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative">
                    <div className="mb-4 inline-block p-3 rounded-lg bg-primary/10">
                      <Icon className={`w-6 h-6 ${feature.color}`} />
                    </div>

                    <h3 className="text-xl font-semibold mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How We Do It Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How We Do It</h2>
            <p className="text-muted-foreground text-lg">
              Simple, efficient, and powerful pipeline
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {process.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="relative">
                  {/* Connector line (hidden on mobile) */}
                  {idx < process.length - 1 && (
                    <div className="hidden md:block absolute top-20 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
                  )}

                  <div className="relative p-8 rounded-lg border border-border/50 bg-background hover:bg-card/50 transition-colors">
                    {/* Step number circle */}
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 border border-primary/50 mb-4">
                      <span className="text-lg font-bold text-primary">
                        {item.step}
                      </span>
                    </div>

                    <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {item.description}
                    </p>

                    <div className="pt-4">
                      <Icon className="w-8 h-8 text-accent/60" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">Why Choose SentinelX?</h2>
              <ul className="space-y-4">
                {[
                  "Asynchronous processing for large log files",
                  "ML-powered threat detection algorithms",
                  "Simple integration with your existing systems",
                  "Developer-friendly REST API",
                  "Scalable architecture for enterprise use",
                  "Security-first design with JWT authentication",
                ].map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0">
                      <div className="flex items-center justify-center h-6 w-6 rounded-md bg-primary/20 border border-primary/50">
                        <svg
                          className="h-4 w-4 text-primary"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                    <span className="text-lg text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              {/* Glass card with visual interest */}
              <div className="relative p-8 rounded-lg glass border border-primary/20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/5" />

                <div className="relative space-y-6">
                  <div className="p-4 bg-background/50 rounded border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm font-medium text-primary">
                        Processing Pipeline
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Upload → Parse → Analyze → Insights
                    </p>
                  </div>

                  <div className="p-4 bg-background/50 rounded border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                      <span className="text-sm font-medium text-accent">
                        Queue-Based Processing
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Reliable, fault-tolerant job execution
                    </p>
                  </div>

                  <div className="p-4 bg-background/50 rounded border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm font-medium text-primary">
                        Real-Time Updates
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Track progress with live status updates
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-gradient-to-r from-primary/10 to-accent/10 border-y border-border/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Secure Your Logs?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start analyzing your logs with SentinelX today. Detect threats,
            prevent breaches.
          </p>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            Start Free Analysis
          </Button>
        </div>
      </section>
    </div>
  );
}
