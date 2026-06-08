import { BaseDetector, MicroPattern } from "./base.detector";

export class FirewallDetector extends BaseDetector {
  protected readonly logType = "FIREWALL_LOG";
  protected readonly parserName = "keyValueParser"; // KV is perfect for Firewall logs

  protected readonly patterns: MicroPattern[] = [
    {
      name: "hasSourceAndDestIp",
      // Checks if the line contains both a source and destination IP indicator (handles KV and JSON format)
      regex: /(?:\b(?:src|source_ip|SRC)=[\d\.]+\b.*\b(?:dst|dest_ip|DST)=[\d\.]+\b)|(?:"(?:Src IP|src|source_ip|src_ip)"\s*:\s*"[\d\.]+"\s*,?\s*.*\s*"(?:Dst IP|dst|dest_ip|dst_ip)"\s*:\s*"[\d\.]+")|(?:"(?:Dst IP|dst|dest_ip|dst_ip)"\s*:\s*"[\d\.]+"\s*,?\s*.*\s*"(?:Src IP|src|source_ip|src_ip)"\s*:\s*"[\d\.]+")/i,
      weight: 3,
      isCritical: true
    },
    {
      name: "hasPorts",
      // Checks for source port and dest port (handles KV and JSON format)
      regex: /(?:\b(?:spt|sport|SPT)=\d+\b.*\b(?:dpt|dport|DPT)=\d+\b)|(?:"(?:Src port|spt|sport)"\s*:\s*"?\d+"?\s*,?\s*.*\s*"(?:Dst port|dpt|dport)"\s*:\s*"?\d+"?)|(?:"(?:Dst port|dpt|dport)"\s*:\s*"?\d+"?\s*,?\s*.*\s*"(?:Src port|spt|sport)"\s*:\s*"?\d+"?)/i,
      weight: 2
    },
    {
      name: "hasProtocol",
      // Commonly found protocol labels (handles KV and JSON format)
      regex: /(?:\b(?:proto|protocol|PROTO)=(?:TCP|UDP|ICMP)\b)|(?:"(?:protocol|proto)"\s*:\s*"(?:TCP|UDP|ICMP)")/i,
      weight: 1
    },
    {
      name: "hasAction",
      // Commonly found firewall action labels (handles KV and JSON format)
      regex: /(?:\b(?:action|act|ACT)=(?:permit|deny|drop|accept|blocked)\b)|(?:"(?:Log subtype|action|act)"\s*:\s*"(?:permit|deny|drop|accept|blocked|Allowed|Denied)")/i,
      weight: 2
    }
  ];
}

export const firewallDetector = new FirewallDetector();