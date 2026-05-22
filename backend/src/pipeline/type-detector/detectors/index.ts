/**
 * Detectors Index
 * Exports all detector instances for use in type-detector.service.ts
 */

export { nginxDetector, NginxDetector } from "./nginx.detector";
export { syslogDetector, SyslogDetector } from "./syslog.detector";
export { jsonDetector, JsonDetector } from "./json.detector";
export { keyValueDetector, KeyValueDetector } from "./keyvalue.detector";
export { genericDetector, GenericDetector } from "./generic.detector";
export type { DetectorResult } from "./nginx.detector";
