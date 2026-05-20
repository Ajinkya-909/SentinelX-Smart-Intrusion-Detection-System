export { BaseParser } from "./base.parser";
export { nginxParser, NginxParser } from "./nginx.parser";
export { syslogParser, SyslogParser } from "./syslog.parser";
export { jsonParser, JsonParser } from "./json.parser";
export { genericParser, GenericParser } from "./generic.parser";

// Map parser names to parser instances
export const parserRegistry = {
  nginxParserV1: () => require("./nginx.parser").nginxParser,
  syslogParserV1: () => require("./syslog.parser").syslogParser,
  jsonParserV1: () => require("./json.parser").jsonParser,
  genericParser: () => require("./generic.parser").genericParser,
};
