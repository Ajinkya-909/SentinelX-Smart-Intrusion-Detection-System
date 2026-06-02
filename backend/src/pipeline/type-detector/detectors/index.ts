export { nginxAccessDetector, nginxErrorDetector, NginxAccessDetector, NginxErrorDetector } from "./nginx.detector";
export { apacheAccessDetector, apacheErrorDetector, ApacheAccessDetector, ApacheErrorDetector } from "./apache.detector";
export { syslogDetector, SyslogDetector } from "./syslog.detector";
export { windowsEventDetector, WindowsEventDetector } from "./windows.detector";
export { firewallDetector, FirewallDetector } from "./firewall.detector";
export { cloudTrailDetector, CloudTrailDetector } from "./cloudtrail.detector";
export { suricataDetector, SuricataDetector } from "./suricata.detector";
export { dockerDetector, DockerDetector } from "./docker.detector";
export { jsonDetector, JsonDetector } from "./json.detector";
export { keyValueDetector, KeyValueDetector } from "./keyvalue.detector";
export { genericDetector, GenericDetector } from "./generic.detector";

export type { DetectorResult } from "./nginx.detector";