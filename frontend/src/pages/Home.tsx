import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GeoAnalysisMap } from "@/components/dashboard/GeoAnalysisMap";
import {
  Shield,
  Zap,
  Activity,
  AlertTriangle,
  Lock,
  Globe,
  Terminal,
  Server,
  Cpu,
  ArrowRight,
  Database,
  Eye,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  FileText,
  Workflow,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/landing/Navbar";

const mockGeoData = {
  total_requests: 1690,
  countries: [
    {
      country: "China",
      country_code: "CN",
      request_count: 432,
      severity: "CRITICAL",
      regions: [
        { region: "Beijing", request_count: 210, severity: "CRITICAL" },
        { region: "Shanghai", request_count: 222, severity: "HIGH" }
      ]
    },
    {
      country: "Russia",
      country_code: "RU",
      request_count: 280,
      severity: "HIGH",
      regions: [
        { region: "Moscow", request_count: 180, severity: "HIGH" },
        { region: "Saint Petersburg", request_count: 100, severity: "MEDIUM" }
      ]
    },
    {
      country: "India",
      country_code: "IN",
      request_count: 195,
      severity: "MEDIUM",
      regions: [
        { region: "New Delhi", request_count: 115, severity: "MEDIUM" },
        { region: "Bengaluru", request_count: 80, severity: "LOW" }
      ]
    },
    {
      country: "Brazil",
      country_code: "BR",
      request_count: 150,
      severity: "HIGH",
      regions: [
        { region: "Rio de Janeiro", request_count: 90, severity: "HIGH" },
        { region: "São Paulo", request_count: 60, severity: "MEDIUM" }
      ]
    },
    {
      country: "United States",
      country_code: "US",
      request_count: 120,
      severity: "LOW",
      regions: [
        { region: "California", request_count: 75, severity: "LOW" },
        { region: "Virginia", request_count: 45, severity: "LOW" }
      ]
    },
    {
      country: "United Kingdom",
      country_code: "GB",
      request_count: 110,
      severity: "MEDIUM",
      regions: [
        { region: "London", request_count: 110, severity: "MEDIUM" }
      ]
    },
    {
      country: "Japan",
      country_code: "JP",
      request_count: 95,
      severity: "LOW",
      regions: [
        { region: "Tokyo", request_count: 95, severity: "LOW" }
      ]
    },
    {
      country: "Germany",
      country_code: "DE",
      request_count: 90,
      severity: "LOW",
      regions: [
        { region: "Frankfurt", request_count: 55, severity: "LOW" },
        { region: "Berlin", request_count: 35, severity: "LOW" }
      ]
    },
    {
      country: "South Africa",
      country_code: "ZA",
      request_count: 85,
      severity: "HIGH",
      regions: [
        { region: "Cape Town", request_count: 85, severity: "HIGH" }
      ]
    },
    {
      country: "Egypt",
      country_code: "EG",
      request_count: 70,
      severity: "MEDIUM",
      regions: [
        { region: "Cairo", request_count: 70, severity: "MEDIUM" }
      ]
    },
    {
      country: "Australia",
      country_code: "AU",
      request_count: 65,
      severity: "LOW",
      regions: [
        { region: "Sydney", request_count: 65, severity: "LOW" }
      ]
    }
  ]
};

export default function Home() {
  const navigate = useNavigate();

  // Pipeline stage tracking
  const [activeStage, setActiveStage] = useState<number>(0);
  const pipelineStages = [
    {
      stage: 1,
      name: "Upload",
      title: "Secure Log Ingestion",
      services: "Multer, JobService",
      desc: "SentinelX securely ingests log files up to 300 MB. The ingestion layer reads file metadata and handles compressed formats asynchronously.",
      details: [
        "Memory-safe 4-byte BOM encoding detector",
        "Supports .log, .txt, .json, .jsonl, and .csv formats",
        "Validates MIME types & file size constraints"
      ],
      icon: Lock,
    },
    {
      stage: 2,
      name: "Normalize",
      title: "Streaming Normalization",
      services: "Preprocessor, TypeDetector, Parser, Normalizer",
      desc: "Logs are streamed in 1,000-line batches. SentinelX identifies the file format out of 13 supported types and normalizes it into a standard schema.",
      details: [
        "Tiered log-type penalties for greedy fallbacks",
        "Asynchronous stream processing (line-by-line)",
        "PostgreSQL (Prisma) batch insert optimization"
      ],
      icon: Activity,
    },
    {
      stage: 3,
      name: "Analyze",
      title: "Parallel Analysis",
      services: "AnalyzerOrchestrator, 5 Detection Engines",
      desc: "Normalized logs are processed through a sliding window of 5,000 logs with 500-log overlap, triggering 27 concurrent threat detectors.",
      details: [
        "Pattern matching & regular expressions (Rule Engine)",
        "Z-score statistical anomaly algorithms (Statistical Engine)",
        "Temporal behavioral profiling (Temporal Engine)",
        "Multi-stage APT chain correlations (Correlation Engine)",
        "Unsupervised Isolation Forest & DBSCAN (ML Engine)"
      ],
      icon: Cpu,
    },
    {
      stage: 4,
      name: "Insights",
      title: "AI Synthesis & Recommendations",
      services: "InsightsService, Claude LLM",
      desc: "Combines deterministic statistical timeline counts with generative insights to synthesize high-level alerts and remediation steps.",
      details: [
        "Deterministic GEO-IP country mapping",
        "Attack timeline & severity distributions",
        "Prioritized remediation action plans via Claude"
      ],
      icon: Sparkles,
    }
  ];

  // Engine specification tab tracking
  const [activeEngine, setActiveEngine] = useState<string>("rule");
  const enginesData = {
    rule: {
      name: "Rule Engine",
      precision: "90–96%",
      recall: "65–75%",
      description: "Uses 11 deterministic pattern signatures to catch known attack vectors.",
      detectors: [
        { name: "bruteForce", threshold: "50 fails / 5 min or 10 fails / 30s" },
        { name: "impossibleVelocity", threshold: "60-second travel gap validation" },
        { name: "privilegeEscalation", threshold: "3 administrative attempts / 10 min" },
        { name: "sqlInjection", threshold: "12 distinct SQL keyword patterns" },
        { name: "xss", threshold: "9 script injection patterns" },
        { name: "pathTraversal", threshold: "5 directory traversal signatures" },
        { name: "maliciousUpload", threshold: "18 dangerous file extensions checked" },
        { name: "scannerBot", threshold: "9 automated tool user-agent signatures" },
      ]
    },
    statistical: {
      name: "Statistical Engine",
      precision: "72–82%",
      recall: "70–80%",
      description: "Computes rolling baselines in-window to identify sudden volumetric anomalies.",
      detectors: [
        { name: "requestSpike", threshold: "Z-score ≥ 3.0 (5× moving average)" },
        { name: "errorRateSpike", threshold: "3× baseline HTTP 4xx/5xx error ratio" },
        { name: "dataTransferSpike", threshold: "3× standard deviation of download size" },
        { name: "endpointDiversitySpike", threshold: "3× baseline unique endpoint requests" },
        { name: "criticalEventSpike", threshold: "5× baseline critical severity logs" },
      ]
    },
    temporal: {
      name: "Temporal Engine",
      precision: "78–88%",
      recall: "72–82%",
      description: "Profiles entity activity periods and machine-like request patterns.",
      detectors: [
        { name: "rapidBurst", threshold: "100+ requests in a 30-second window" },
        { name: "reconnaissanceBurst", threshold: "50+ requests, >50% fails, 10+ paths in 5 min" },
        { name: "midnightAccess", threshold: "Authenticated activity between 00:00–04:00" },
        { name: "offHoursAdmin", threshold: "Admin actions outside 22:00–06:00 Mon–Fri" },
        { name: "abnormalIntervals", threshold: "Request intervals consistently < 500 ms" },
      ]
    },
    correlation: {
      name: "Correlation Engine",
      precision: "75–85%",
      recall: "60–70%",
      description: "Tracks state patterns across multiple events to surface advanced persistent threat chains.",
      detectors: [
        { name: "reconExploitationChain", threshold: "Recon activity followed by exploit in 15 min" },
        { name: "privilegeEscalationChain", threshold: "Auth failure cascade → admin access in 2 min" },
        { name: "dataExfiltrationChain", threshold: "Volumetric transfer following failed logins in 30 min" },
        { name: "lateralMovement", threshold: "Same user accessing multiple host endpoints in 1 hour" },
        { name: "sessionHijacking", threshold: "Reusing session tokens from distinct IPs in 1 hour" },
      ]
    },
    ml: {
      name: "Machine Learning",
      precision: "68–78%",
      recall: "65–75%",
      description: "FastAPI microservice utilizing unsupervised models for zero-day threat identification.",
      detectors: [
        { name: "Isolation Forest", threshold: "Contamination=0.05. Evaluates 11 IP & 10 User features" },
        { name: "DBSCAN Clustering", threshold: "eps=0.3, min_samples=5. Flags noise points as high risk" },
      ]
    }
  };

  // Log format preview grid
  const [selectedFormat, setSelectedFormat] = useState<string>("suricata");
  const logFormats = {
    suricata: {
      name: "Suricata IDS Alert",
      desc: "Tier 1 High Fidelity EVE JSON. Maps directly to the rule engine with zero classification loss.",
      detect: "suricata.detector",
      parse: "json.parser",
      sample: `{
  "timestamp": "2026-06-04T14:32:10.124Z",
  "event_type": "alert",
  "src_ip": "185.220.101.4",
  "dest_ip": "10.0.0.12",
  "alert": {
    "action": "allowed",
    "signature": "ET EXPLOIT Apache Struts RCE",
    "category": "Attempted Administrator Privilege Gain",
    "severity": 1,
    "signature_id": 2021035
  }
}`
    },
    cloudtrail: {
      name: "AWS CloudTrail",
      desc: "Tier 1 High Fidelity JSON log envelope. Ideal for tracking API credentials and role modifications.",
      detect: "cloudtrail.detector",
      parse: "json.parser",
      sample: `{
  "eventVersion": "1.08",
  "userIdentity": {
    "type": "IAMUser",
    "userName": "security-admin",
    "arn": "arn:aws:iam::123456:user/security-admin"
  },
  "eventTime": "2026-06-04T14:30:15Z",
  "eventSource": "iam.amazonaws.com",
  "eventName": "CreateAccessKey",
  "awsRegion": "us-east-1",
  "sourceIPAddress": "220.181.108.52"
}`
    },
    syslog: {
      name: "Linux Syslog",
      desc: "Tier 2 Infrastructure text log. Categorizes authentication and sudo activities.",
      detect: "syslog.detector",
      parse: "syslog.parser",
      sample: `Jun  4 14:32:15 web-srv-01 sudo: pam_unix(sudo:auth): authentication failure; logname= uid=1000 euid=0 ruser=john rhost=192.168.1.105  user=john`
    },
    windows: {
      name: "Windows Event Logs",
      desc: "Tier 1 High Fidelity text export. Leverages keyvalue parsing to isolate Logon EventIDs.",
      detect: "windows.detector",
      parse: "keyvalue.parser",
      sample: `EventID: 4625
Level: Error
Source: Microsoft-Windows-Security-Auditing
Computer: DC01.corp.internal
Subject:
  Account Name: Administrator
  Account Domain: CORP
Failure Information:
  Failure Reason: Unknown user name or bad password.`
    },
    nginx: {
      name: "Nginx Access Log",
      desc: "Tier 2 Infrastructure access logs. Ideal for SQLi, XSS, and bot scanning patterns.",
      detect: "nginx.detector",
      parse: "nginx.parser",
      sample: `192.168.1.105 - - [04/Jun/2026:14:32:20 +0000] "POST /wp-login.php HTTP/1.1" 403 543 "https://example.com/wp-login.php" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) sqlmap/1.8.2"`
    },
    docker: {
      name: "Docker Logs",
      desc: "Tier 1 High Fidelity container stream. Parses nested syslog or JSON envelopes.",
      detect: "docker.detector",
      parse: "json.parser / syslog.parser",
      sample: `{"log":"[ERROR] 2026-06-04 14:32:33 - Database connection timeout\\n","stream":"stderr","time":"2026-06-04T14:32:33.453Z"}`
    }
  };

  return (
    <div className="min-h-screen bg-[#040811] text-foreground overflow-x-hidden selection:bg-primary/30">
      <Navbar />
      {/* Styles for interactive threat map connection lines */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flow {
          from {
            stroke-dashoffset: 20;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .glow-primary {
          filter: drop-shadow(0 0 8px hsl(84 100% 52% / 0.5));
        }
        .glow-danger {
          filter: drop-shadow(0 0 8px hsl(0 91% 56% / 0.5));
        }
        .glow-cyan {
          filter: drop-shadow(0 0 8px hsl(188 100% 45% / 0.5));
        }
        .cyber-grid {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.015) 1px, transparent 1px);
        }
      `}} />

      {/* Decorative Blur Background (Constrained to prevent horizontal overflow) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-critical/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 cyber-grid" />
      </div>

      {/* HERO & LIVE MAP SECTION */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 md:pt-32 pb-16 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Text */}
          <div className="lg:col-span-5 space-y-6">
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-white">
              Smart Threat Detection <br />
              <span className="text-gradient-primary">In Your System Logs</span>
            </h1>

            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-xl">
              An enterprise-grade, asynchronous log pipeline engineered to ingest, normalize, and audit logs. Detect threats concurrently across 5 analytic engines backed by machine learning models and AI.
            </p>

            <div className="flex flex-col gap-4 max-w-lg w-full">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="sm:flex-1 bg-primary hover:bg-primary/95 text-primary-foreground font-bold tracking-wide rounded-lg flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-[1.01] shadow-[0_0_15px_rgba(132,255,13,0.2)]"
                  onClick={() => navigate("/login")}
                >
                  Launch Console
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="sm:flex-1 border-border hover:border-primary/50 hover:bg-primary/5 hover:text-primary text-foreground font-semibold rounded-lg flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-[1.01]"
                  onClick={() => navigate("/public/jobresult")}
                >
                  <Eye className="w-4 h-4 text-primary" />
                  View Live Demo
                </Button>
              </div>
              <Button
                size="lg"
                variant="outline"
                className="w-full border-border/80 hover:border-white/20 bg-secondary/10 hover:bg-secondary/30 text-muted-foreground hover:text-foreground font-semibold rounded-lg flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-[1.005]"
                onClick={() => {
                  const element = document.getElementById("pipeline-section");
                  element?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Learn Architecture
              </Button>
            </div>

            {/* Ingestion Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-6 pt-6 border-t border-border/50 font-mono">
              <div>
                <div className="text-2xl font-bold text-white">300 MB</div>
                <div className="text-xs text-muted-foreground mt-1 uppercase">Max File Size</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">1.2M+</div>
                <div className="text-xs text-muted-foreground mt-1 uppercase">Max Line Cap</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">27</div>
                <div className="text-xs text-muted-foreground mt-1 uppercase">Active Detectors</div>
              </div>
            </div>
          </div>

          {/* Right Live Threat Map */}
          <div className="lg:col-span-7">
            <GeoAnalysisMap data={mockGeoData} colorMode="primaryShades" mapScale={185} mapCenter={[10, 0]} />
          </div>

        </div>
      </section>

      {/* PIPELINE STAGES VISUALIZER */}
      <section id="pipeline-section" className="py-20 relative z-10 border-t border-border/30 bg-[#060c1c]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-1.5 text-primary text-xs font-mono font-bold tracking-widest uppercase">
              <Workflow className="w-4 h-4" />
              THE PROCESSING PIPELINE
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              4-Stage Resumable Pipeline
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              SentinelX handles raw logs through a structured streaming pipeline, minimizing RAM pressure while extracting complex security insight.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Steps */}
            <div className="lg:col-span-5 space-y-4">
              {pipelineStages.map((stage, idx) => {
                const Icon = stage.icon;
                const isActive = activeStage === idx;
                return (
                  <div
                    key={stage.stage}
                    onClick={() => setActiveStage(idx)}
                    className={`p-4 sm:p-5 rounded-xl border transition-all duration-300 cursor-pointer flex gap-3 sm:gap-4 items-start ${
                      isActive
                        ? "bg-card border-primary glow-primary"
                        : "bg-card/45 border-border/40 hover:border-border/80"
                    }`}
                  >
                    <div className={`p-2 sm:p-2.5 rounded-lg shrink-0 ${isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] sm:text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 shrink-0">
                          STAGE 0{stage.stage}
                        </span>
                        <span className="text-[10px] sm:text-xs font-mono text-muted-foreground truncate max-w-[120px] xs:max-w-[200px] sm:max-w-none">
                          {stage.services}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white">{stage.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                        {stage.title} — {stage.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Stage Detail Panel */}
            <div className="lg:col-span-7">
              <div className="border border-border/50 rounded-xl bg-card p-4 sm:p-8 h-full min-h-[300px] sm:min-h-[420px] flex flex-col justify-between relative shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="space-y-6">
                  {/* Stage metadata */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-xs font-mono font-bold text-primary">
                        DETAILED OVERVIEW
                      </span>
                      <h3 className="text-2xl font-black text-white">
                        {pipelineStages[activeStage]?.title}
                      </h3>
                    </div>
                    <div className="text-5xl font-black text-primary/15 font-mono">
                      0{pipelineStages[activeStage]?.stage}
                    </div>
                  </div>

                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                    {pipelineStages[activeStage]?.desc}
                  </p>

                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-mono font-bold text-foreground uppercase tracking-widest">
                      Key Pipeline Invariants
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {pipelineStages[activeStage]?.details.map((detail, index) => (
                        <div key={index} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                          <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Micro Service Component Box */}
                <div className="mt-6 sm:mt-8 p-3 sm:p-4 rounded-lg bg-[#040811] border border-border/50 flex flex-col xs:flex-row gap-3 xs:gap-2 items-start xs:items-center justify-between text-[11px] sm:text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-accent" />
                    <span className="text-muted-foreground">Active Core Service:</span>
                    <span className="text-white font-bold">{pipelineStages[activeStage]?.services.split(',')[0]}</span>
                  </div>
                  <span className="text-accent hover:underline cursor-pointer flex items-center gap-1" onClick={() => navigate("/login")}>
                    Inspect Logs
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* DETECTOR ENGINES SPECIFICATIONS */}
      <section id="engines-section" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 text-accent text-xs font-mono font-bold tracking-widest uppercase">
            <Cpu className="w-4 h-4" />
            DETECTION CAPABILITIES
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            27 Detectors Across 5 Engines
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            SentinelX audits log feeds in parallel using 5 distinct security engines, ranging from signature checks to unsupervised machine learning.
          </p>
        </div>

        {/* Engine Tabs Selector */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {Object.entries(enginesData).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setActiveEngine(key)}
              className={`p-2 px-3 sm:p-3 sm:px-6 rounded-lg border font-semibold text-xs sm:text-sm transition-all duration-200 backdrop-blur-sm ${
                activeEngine === key
                  ? "bg-accent/15 border-accent text-accent glow-info"
                  : "bg-card/45 hover:bg-card border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {value.name}
            </button>
          ))}
        </div>

        {/* Engine Details Grid */}
        <div className="border border-border/50 rounded-xl bg-card/45 backdrop-blur-md p-4 sm:p-8 relative shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.01] to-transparent pointer-events-none" />
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Left Engine Intro */}
            <div className="md:col-span-4 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-accent tracking-widest uppercase">
                  ENGINE TELEMETRY
                </span>
                <h3 className="text-2xl font-bold text-white">
                  {enginesData[activeEngine as keyof typeof enginesData].name}
                </h3>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {enginesData[activeEngine as keyof typeof enginesData].description}
              </p>

              {/* Accuracy stats */}
              <div className="border-t border-border/40 pt-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Precision:</span>
                  <span className="text-white font-bold">{enginesData[activeEngine as keyof typeof enginesData].precision}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Recall:</span>
                  <span className="text-white font-bold">{enginesData[activeEngine as keyof typeof enginesData].recall}</span>
                </div>
              </div>
            </div>

            {/* Right Detectors List */}
            <div className="md:col-span-8 space-y-3">
              <h4 className="text-xs font-mono font-bold text-foreground uppercase tracking-widest pb-2 border-b border-border/30">
                Trigger Signatures & Limits
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {enginesData[activeEngine as keyof typeof enginesData].detectors.map((det, index) => (
                  <div key={index} className="p-3.5 rounded-lg border border-border/30 bg-[#040811]/45 flex flex-col justify-between gap-1.5">
                    <span className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      {det.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono bg-border/20 px-2 py-0.5 rounded w-fit">
                      Limit: {det.threshold}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </section>

      {/* LOG FORMAT PREVIEW GRID */}
      <section id="formats-section" className="py-20 relative z-10 border-t border-border/30 bg-[#060c1c]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-1.5 text-primary text-xs font-mono font-bold tracking-widest uppercase">
              <FileText className="w-4 h-4" />
              INTEGRATION COVERAGE
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Supported Log Formats (13 Types)
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              SentinelX features dedicated parsers for 11 log sources with 2 generic key-value and plain text fallbacks.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left formats list */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-2 sm:gap-3">
              {Object.entries(logFormats).map(([key, value]) => {
                const isSelected = selectedFormat === key;
                return (
                  <div
                    key={key}
                    onClick={() => setSelectedFormat(key)}
                    className={`p-3 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 sm:gap-4 select-none min-w-0 ${
                      isSelected
                        ? "bg-card border-primary glow-primary"
                        : "bg-card/45 border-border/40 hover:border-border/80"
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-bold text-white text-xs sm:text-sm md:text-base truncate">{value.name}</h3>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-mono truncate max-w-[100px] xs:max-w-[150px] sm:max-w-none">
                        Parser: {value.parse}
                      </p>
                    </div>
                    <span className="text-[10px] text-primary font-mono flex items-center gap-0.5 hover:underline shrink-0">
                      View Sample
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Right Code Block Display */}
            <div className="lg:col-span-7">
              <div className="border border-border/50 rounded-xl bg-[#040811] overflow-hidden shadow-2xl">
                {/* Window Header */}
                <div className="flex justify-between items-center px-4 py-3 border-b border-border/40 bg-card/65 font-mono text-xs text-muted-foreground shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-critical/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-medium/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-low/70" />
                    <span className="ml-2 text-foreground font-bold">
                      {logFormats[selectedFormat as keyof typeof logFormats].name} Codeblock
                    </span>
                  </div>
                  <span>JSON / RFC Schema</span>
                </div>
                
                {/* Window Body */}
                <div className="p-4 sm:p-5 space-y-4">
                  <div className="text-xs text-muted-foreground font-mono">
                    <span className="text-primary">// Parser Metadata:</span>{" "}
                    {logFormats[selectedFormat as keyof typeof logFormats].desc}
                  </div>

                  <div className="relative">
                    <pre className="font-mono text-xs text-emerald-400 bg-secondary/30 p-4 rounded border border-border/40 overflow-x-auto max-h-[260px] custom-scrollbar">
                      {logFormats[selectedFormat as keyof typeof logFormats].sample}
                    </pre>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground">
                    <span>Detector: {logFormats[selectedFormat as keyof typeof logFormats].detect}</span>
                    <span className="text-accent">Type extraction: STREAMS ENABLED</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* WHY CHOOSE SENTINELX / METRICS */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-xs font-semibold text-accent font-mono tracking-wider">
              <CheckCircle className="w-3.5 h-3.5" />
              SYSTEM INVARIANTS
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Built for Security Operations
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              SentinelX bridges raw log auditing with visual intelligence, delivering clean timelines and AI-driven recommendations.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: "Asymmetric Scaling", desc: "Process logs up to 1.2M+ lines safely using custom file streams." },
                { title: "Zero cold-starts", desc: "Redis-backed BullMQ processing handles jobs asynchronously." },
                { title: "Deterministic GeoIP", desc: "Attrit source countries using a fast, offline localized database." },
                { title: "Unsupervised ML", desc: "No training labels required. Isolation Forest automatically flags outliers." },
                { title: "Actionable Insights", desc: "AI synthesizes remediation plans prioritized by attack patterns." },
                { title: "Standard JSON Output", desc: "Developer-friendly schema integrates with external SIEM systems." }
              ].map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <h4 className="font-semibold text-white text-sm flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-5">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            {/* Visual element displaying core pipeline architecture cards */}
            <div className="relative border border-border/50 rounded-xl bg-card/65 p-4 sm:p-8 overflow-hidden shadow-2xl space-y-6 backdrop-blur-md">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
              
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-primary/10 border border-primary/20">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Security Guardrails</h4>
                  <p className="text-xs text-muted-foreground">Active pipeline integrity</p>
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3.5 rounded bg-[#040811]/50 border border-border/40 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-accent" />
                    <span className="text-white">JWT Ingress Token</span>
                  </div>
                  <span className="text-emerald-400 font-bold">VERIFIED</span>
                </div>
                <div className="p-3.5 rounded bg-[#040811]/50 border border-border/40 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-accent" />
                    <span className="text-white">Prisma Database adapter</span>
                  </div>
                  <span className="text-emerald-400 font-bold">CONNECTED</span>
                </div>
                <div className="p-3.5 rounded bg-[#040811]/50 border border-border/40 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-accent" />
                    <span className="text-white">Claude AI Service</span>
                  </div>
                  <span className="text-emerald-400 font-bold">ONLINE</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="py-12 sm:py-24 border-t border-border/30 bg-gradient-to-b from-[#040811] to-[#060c1c] text-center relative z-10 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Ready to Securing Your Enterprise?
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Get comprehensive threat insight in minutes. Upload your logs securely and receive deterministic geo-correlations coupled with Claude AI recommendations.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold tracking-wide rounded-lg flex items-center gap-2 transition-all duration-300 transform hover:scale-[1.02] shadow-[0_0_15px_rgba(132,255,13,0.2)]"
              onClick={() => navigate("/login")}
            >
              Analyze Logs Now
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-border hover:bg-muted text-white rounded-lg"
              onClick={() => navigate("/signup")}
            >
              Register Account
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
