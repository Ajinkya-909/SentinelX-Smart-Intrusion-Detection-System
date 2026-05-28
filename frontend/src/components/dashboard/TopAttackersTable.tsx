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
    <div className="flex flex-col h-full bg-[#121212] border border-gray-800 rounded-xl p-5 shadow-lg overflow-hidden">
      <div className="mb-4 flex justify-between items-end">
        <div>
          <h3 className="text-lg font-semibold text-gray-100">Top Attack Sources</h3>
          <p className="text-sm text-gray-400">Identified malicious entities</p>
        </div>
        <ShieldAlert className="w-5 h-5 text-red-500/50" />
      </div>

      <div className="flex-grow overflow-auto pr-2 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
              <th className="pb-2 font-medium">Source IP</th>
              <th className="pb-2 font-medium text-right">Requests</th>
              <th className="pb-2 font-medium text-right">Threats</th>
              <th className="pb-2 font-medium text-center">Severity</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-800/50">
            {data.attackers.slice(0, 6).map((attacker, idx) => {
              const isCritical = attacker.severity === 'CRITICAL';
              return (
                <tr key={idx} className="hover:bg-[#1A1A1A] transition-colors">
                  <td className="py-3 font-mono text-gray-300">{attacker.ip}</td>
                  <td className="py-3 text-right text-gray-400">{attacker.request_count}</td>
                  <td className="py-3 text-right text-red-400 font-medium">{attacker.threat_count}</td>
                  <td className="py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                      isCritical ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                                 : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    }`}>
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