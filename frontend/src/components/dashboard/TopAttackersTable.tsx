import React from 'react';
import { ShieldAlert } from 'lucide-react';

// Assuming you added TopAttackersInsightData to your types
interface TopAttackersInsightData {
  attackers: Array<{
    ip: string;
    request_count: number;
    threat_count: number;
    severity: string;
  }>;
  total_unique_ips?: number;
}

interface TopAttackersTableProps {
  data: TopAttackersInsightData;
}

export const TopAttackersTable: React.FC<TopAttackersTableProps> = ({ data }) => {
  if (!data?.attackers || data.attackers.length === 0) return null;

  return (
    <div className="flex flex-col h-[380px] bg-card border border-border rounded-xl p-5 gradient-card overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-critical/[0.015] via-transparent to-accent/[0.01] pointer-events-none" />

      <div className="relative mb-4 flex justify-between items-end">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Top Attack Sources
          </h3>

          <p className="text-sm text-muted-foreground">
            Identified malicious entities
          </p>
        </div>

        <ShieldAlert className="w-5 h-5 text-critical/50" />
      </div>

      <div className="relative flex-grow overflow-auto pr-2 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="pb-2 font-medium">
                Source IP
              </th>

              <th className="pb-2 font-medium text-right">
                Requests
              </th>

              <th className="pb-2 font-medium text-right">
                Threats
              </th>

              <th className="pb-2 font-medium text-center">
                Severity
              </th>
            </tr>
          </thead>

          <tbody className="text-sm divide-y divide-border/50">
            {data.attackers.slice(0, 6).map((attacker, idx) => {
              const isCritical =
                attacker.severity === 'CRITICAL';

              return (
                <tr
                  key={idx}
                  className="hover:bg-secondary/50 transition-colors duration-200"
                >
                  <td className="py-3 font-mono text-foreground/90">
                    {attacker.ip}
                  </td>

                  <td className="py-3 text-right text-muted-foreground">
                    {attacker.request_count}
                  </td>

                  <td className="py-3 text-right text-critical font-medium">
                    {attacker.threat_count}
                  </td>

                  <td className="py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${
                        isCritical
                          ? 'bg-critical/10 text-critical border-critical/20'
                          : 'bg-high/10 text-high border-high/20'
                      }`}
                    >
                      {attacker.severity}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};