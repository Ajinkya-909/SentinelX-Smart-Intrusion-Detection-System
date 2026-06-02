import { GeoIPUtil } from "../src/utils/geoip";

console.log("=== SENTINELX GEOIP OFFLINE LOOKUP TEST ===");

const testIPs = [
  "8.8.8.8",            // USA
  "1.1.1.1",            // Australia / Cloudflare
  "150.183.249.110",    // User's anomaly IP
  "185.190.140.10",     // Europe (Netherlands)
  "117.200.0.1",        // India (Asia)
  "127.0.0.1",          // Localhost
  "192.168.1.50"        // LAN
];

for (const ip of testIPs) {
  console.log(`\nIP Address: ${ip}`);
  const result = GeoIPUtil.lookupIP(ip);
  console.log(JSON.stringify(result, null, 2));
}

console.log("\n=== TEST COMPLETED ===");
