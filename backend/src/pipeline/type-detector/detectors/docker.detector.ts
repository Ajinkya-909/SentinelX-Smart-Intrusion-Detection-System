import { BaseDetector, MicroPattern } from "./base.detector";

export class DockerDetector extends BaseDetector {
  protected readonly logType = "DOCKER_JSON";
  // Identifying this specifically allows the parser to unwrap the {"log": "..."} payload
  protected readonly parserName = "jsonParserV1"; 

  protected readonly patterns: MicroPattern[] = [
    {
      name: "hasDockerLogPayload",
      regex: /"log"\s*:\s*"/i,
      weight: 3,
      isCritical: true
    },
    {
      name: "hasDockerStream",
      regex: /"stream"\s*:\s*"(?:stdout|stderr)"/i,
      weight: 2
    },
    {
      name: "hasDockerTime",
      // Docker uses highly precise ISO times: "2026-05-30T05:53:00.123456789Z"
      regex: /"time"\s*:\s*"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z"/i,
      weight: 1
    }
  ];
}

export const dockerDetector = new DockerDetector();