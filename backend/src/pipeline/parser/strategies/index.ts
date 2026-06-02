export { BaseParser } from "./base.parser";
export { nginxParser, NginxParser } from "./nginx.parser";
export { apacheParser, ApacheParser } from "./apache.parser";
export { syslogParser, SyslogParser } from "./syslog.parser";
export { jsonParser, JsonParser } from "./json.parser";
export { keyValueParser, KeyValueParser } from "./keyvalue.parser";
export { genericParser, GenericParser } from "./generic.parser";

// Map parser names to parser instances
export const parserRegistry = {
  nginxParserV1: () => require("./nginx.parser").nginxParser,
  apacheParserV1: () => require("./apache.parser").apacheParser,
  syslogParserV1: () => require("./syslog.parser").syslogParser,
  jsonParserV1: () => require("./json.parser").jsonParser,
  keyValueParser: () => require("./keyvalue.parser").keyValueParser,
  genericParser: () => require("./generic.parser").genericParser,
};
