export interface LogEvent {
  id: string;
  timestamp: string;
  category: 'AUTH' | 'API' | 'DB' | 'SYSTEM' | 'Payments';
  actor: string;
  action: string;
  description: string;
  status: 'success' | 'failure' | 'warning';
  risk_score: number;
  risk_level: 'Critical' | 'High' | 'Medium' | 'Low';
  source_ip?: string;
}

export interface Alert {
  id: string;
  timestamp: string;
  category: string;
  actor: string;
  description: string;
  risk_level: 'Critical' | 'High' | 'Medium' | 'Low';
  risk_score: number;
  resolved: boolean;
}

export interface DashboardData {
  totalLogs: number;
  totalLogsTrend: number;
  alertsGenerated: number;
  alertsTrend: number;
  avgRiskScore: number;
  avgRiskTrend: number;
  criticalEvents: number;
  criticalTrend: number;
  activityData: { time: string; logs: number; alerts: number }[];
  riskSummary: { name: string; value: number; color: string }[];
  logSources: { name: string; value: number; color: string }[];
  recentAlerts: Alert[];
  riskOverview: { level: string; count: number; color: string }[];
}

const mockAlerts: Alert[] = [
  { id: '1', timestamp: '10:14 AM', category: 'AUTH', actor: 'john_doe', description: '5 Failed login attempts', risk_level: 'Critical', risk_score: 95, resolved: false },
  { id: '2', timestamp: '9:58 AM', category: 'API', actor: 'unknown', description: 'CORS threat - Auth disparities', risk_level: 'High', risk_score: 78, resolved: false },
  { id: '3', timestamp: '9:28 AM', category: 'DB', actor: 'admin723', description: 'Database corruption - malicious insert', risk_level: 'High', risk_score: 72, resolved: false },
  { id: '4', timestamp: '8:45 AM', category: 'AUTH', actor: 'jane_smith', description: 'Brute force - High attempts', risk_level: 'Medium', risk_score: 55, resolved: true },
  { id: '5', timestamp: '8:20 AM', category: 'Payments', actor: 'user209', description: 'Licensing - Common risk triggers', risk_level: 'Low', risk_score: 25, resolved: true },
  { id: '6', timestamp: '7:45 AM', category: 'SYSTEM', actor: 'system', description: 'Unexpected service restart', risk_level: 'Medium', risk_score: 48, resolved: false },
  { id: '7', timestamp: '7:12 AM', category: 'API', actor: 'bot_crawler', description: 'Rate limit exceeded - 500 req/min', risk_level: 'High', risk_score: 82, resolved: false },
  { id: '8', timestamp: '6:30 AM', category: 'AUTH', actor: 'admin_root', description: 'Privilege escalation attempt', risk_level: 'Critical', risk_score: 98, resolved: false },
];

export function getDashboardData(): DashboardData {
  return {
    totalLogs: 8524,
    totalLogsTrend: 288,
    alertsGenerated: 182,
    alertsTrend: 5,
    avgRiskScore: 65,
    avgRiskTrend: 5,
    criticalEvents: 27,
    criticalTrend: 2,
    activityData: [
      { time: '12:40 AM', logs: 12000000, alerts: 200 },
      { time: '2:00 AM', logs: 18000000, alerts: 350 },
      { time: '4:00 AM', logs: 25000000, alerts: 500 },
      { time: '6:00 AM', logs: 40000000, alerts: 600 },
      { time: '8:00 AM', logs: 82000000, alerts: 800 },
      { time: '8:20 AM', logs: 105400000, alerts: 1054 },
      { time: '10:00 AM', logs: 95000000, alerts: 900 },
      { time: '12:00 PM', logs: 78000000, alerts: 750 },
    ],
    riskSummary: [
      { name: 'Critical', value: 34, color: 'hsl(0, 72%, 51%)' },
      { name: 'High', value: 37, color: 'hsl(25, 95%, 53%)' },
      { name: 'Medium', value: 15, color: 'hsl(45, 93%, 47%)' },
      { name: 'Low', value: 14, color: 'hsl(142, 71%, 45%)' },
    ],
    logSources: [
      { name: 'System', value: 334, color: 'hsl(0, 72%, 51%)' },
      { name: 'Help', value: 54, color: 'hsl(25, 95%, 53%)' },
      { name: 'Rest', value: 37, color: 'hsl(45, 93%, 47%)' },
      { name: 'Semproxy', value: 76, color: 'hsl(142, 71%, 45%)' },
    ],
    recentAlerts: mockAlerts.slice(0, 5),
    riskOverview: [
      { level: 'Critical', count: 27, color: 'hsl(0, 72%, 51%)' },
      { level: 'High', count: 54, color: 'hsl(25, 95%, 53%)' },
      { level: 'Medium', count: 76, color: 'hsl(45, 93%, 47%)' },
      { level: 'Low', count: 25, color: 'hsl(142, 71%, 45%)' },
    ],
  };
}

export function getAlerts(): Alert[] {
  return mockAlerts;
}

export async function processLogs(jsonInput: string): Promise<LogEvent[]> {
  await new Promise((r) => setTimeout(r, 1500));
  return [
    { id: '1', timestamp: new Date().toISOString(), category: 'AUTH', actor: 'user123', action: 'login', description: 'Failed login attempt', status: 'failure', risk_score: 72, risk_level: 'High' },
    { id: '2', timestamp: new Date().toISOString(), category: 'API', actor: 'service_bot', action: 'request', description: 'Unusual API pattern detected', status: 'warning', risk_score: 55, risk_level: 'Medium' },
    { id: '3', timestamp: new Date().toISOString(), category: 'DB', actor: 'admin', action: 'query', description: 'SQL injection attempt blocked', status: 'failure', risk_score: 92, risk_level: 'Critical' },
  ];
}
