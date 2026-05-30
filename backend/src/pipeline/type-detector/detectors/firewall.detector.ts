import { BaseDetector, MicroPattern } from "./base.detector";

export class FirewallDetector extends BaseDetector {
  protected readonly logType = "FIREWALL_LOG";
  protected readonly parserName = "keyValueParser"; // KV is perfect for Firewall logs

  protected readonly patterns: MicroPattern[] = [
    {
      name: "hasSourceAndDestIp",
      // Checks if the line contains both a source and destination IP indicator
      regex: /\b(?:src|source_ip|SRC)=[\d\.]+\b.*\b(?:dst|dest_ip|DST)=[\d\.]+\b/i,
      weight: 3,
      isCritical: true
    },
    {
      name: "hasPorts",
      // Checks for source port (spt/sport) and dest port (dpt/dport)
      regex: /\b(?:spt|sport|SPT)=\d+\b.*\b(?:dpt|dport|DPT)=\d+\b/i,
      weight: 2
    },
    {
      name: "hasProtocol",
      // Commonly found protocol labels
      regex: /\b(?:proto|protocol|PROTO)=(?:TCP|UDP|ICMP)\b/i,
      weight: 1
    },
    {
      name: "hasAction",
      regex: /\b(?:action|act|ACT)=(?:permit|deny|drop|accept|blocked)\b/i,
      weight: 2
    }
  ];
}

export const firewallDetector = new FirewallDetector();