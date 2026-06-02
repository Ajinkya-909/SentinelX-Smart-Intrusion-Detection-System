import geoip from "geoip-lite";

interface GeoIPResult {
  country: string;
  country_code: string;
  region: string;
  city: string;
  continent: string;
}

// 2-Letter ISO Country Code to Country Name and Continent Mapping
const COUNTRY_MAP: Record<string, { name: string; continent: string }> = {
  US: { name: "United States", continent: "North America" },
  CA: { name: "Canada", continent: "North America" },
  MX: { name: "Mexico", continent: "North America" },
  GB: { name: "United Kingdom", continent: "Europe" },
  DE: { name: "Germany", continent: "Europe" },
  FR: { name: "France", continent: "Europe" },
  IT: { name: "Italy", continent: "Europe" },
  ES: { name: "Spain", continent: "Europe" },
  NL: { name: "Netherlands", continent: "Europe" },
  BE: { name: "Belgium", continent: "Europe" },
  CH: { name: "Switzerland", continent: "Europe" },
  SE: { name: "Sweden", continent: "Europe" },
  NO: { name: "Norway", continent: "Europe" },
  FI: { name: "Finland", continent: "Europe" },
  DK: { name: "Denmark", continent: "Europe" },
  IE: { name: "Ireland", continent: "Europe" },
  RU: { name: "Russia", continent: "Europe" },
  UA: { name: "Ukraine", continent: "Europe" },
  PL: { name: "Poland", continent: "Europe" },
  TR: { name: "Turkey", continent: "Asia" },
  IN: { name: "India", continent: "Asia" },
  CN: { name: "China", continent: "Asia" },
  JP: { name: "Japan", continent: "Asia" },
  KR: { name: "South Korea", continent: "Asia" },
  SG: { name: "Singapore", continent: "Asia" },
  MY: { name: "Malaysia", continent: "Asia" },
  ID: { name: "Indonesia", continent: "Asia" },
  TH: { name: "Thailand", continent: "Asia" },
  VN: { name: "Vietnam", continent: "Asia" },
  PH: { name: "Philippines", continent: "Asia" },
  PK: { name: "Pakistan", continent: "Asia" },
  BD: { name: "Bangladesh", continent: "Asia" },
  IL: { name: "Israel", continent: "Asia" },
  AE: { name: "United Arab Emirates", continent: "Asia" },
  SA: { name: "Saudi Arabia", continent: "Asia" },
  IR: { name: "Iran", continent: "Asia" },
  IQ: { name: "Iraq", continent: "Asia" },
  ZA: { name: "South Africa", continent: "Africa" },
  EG: { name: "Egypt", continent: "Africa" },
  NG: { name: "Nigeria", continent: "Africa" },
  KE: { name: "Kenya", continent: "Africa" },
  MA: { name: "Morocco", continent: "Africa" },
  DZ: { name: "Algeria", continent: "Africa" },
  BR: { name: "Brazil", continent: "South America" },
  AR: { name: "Argentina", continent: "South America" },
  CO: { name: "Colombia", continent: "South America" },
  CL: { name: "Chile", continent: "South America" },
  PE: { name: "Peru", continent: "South America" },
  VE: { name: "Venezuela", continent: "South America" },
  AU: { name: "Australia", continent: "Oceania" },
  NZ: { name: "New Zealand", continent: "Oceania" },
};

// US State names mapping
const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
};

// Indian State names mapping
const IN_STATES: Record<string, string> = {
  AP: "Andhra Pradesh", AR: "Arunachal Pradesh", AS: "Assam", BR: "Bihar", CG: "Chhattisgarh",
  GA: "Goa", GJ: "Gujarat", HR: "Haryana", HP: "Himachal Pradesh", JH: "Jharkhand",
  KA: "Karnataka", KL: "Kerala", MP: "Madhya Pradesh", MH: "Maharashtra", MN: "Manipur",
  ML: "Meghalaya", MZ: "Mizoram", NL: "Nagaland", OD: "Odisha", PB: "Punjab",
  RJ: "Rajasthan", SK: "Sikkim", TN: "Tamil Nadu", TG: "Telangana", TR: "Tripura",
  UP: "Uttar Pradesh", UK: "Uttarakhand", WB: "West Bengal", DL: "Delhi", JK: "Jammu and Kashmir",
  PY: "Puducherry", CH: "Chandigarh", AN: "Andaman and Nicobar Islands", LD: "Lakshadweep",
  DN: "Dadra and Nagar Haveli and Daman and Diu"
};

export const GeoIPUtil = {
  /**
   * Geolocate an IP address using geoip-lite.
   * Runs locally with no external APIs or network overhead.
   */
  lookupIP(ip: string): GeoIPResult {
    if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
      return {
        country: "Internal Network",
        country_code: "LAN",
        region: "Local Subnet",
        city: "Internal",
        continent: "North America", // Default continent to avoid missing references
      };
    }

    try {
      const geo = geoip.lookup(ip);
      if (!geo) {
        return {
          country: "Unknown",
          country_code: "UN",
          region: "Unknown Region",
          city: "Unknown",
          continent: "Unknown",
        };
      }

      const countryCode = (geo.country || "UN").toUpperCase();
      const mappedCountry = COUNTRY_MAP[countryCode];
      
      const countryName = mappedCountry ? mappedCountry.name : (geo.country || "Unknown");
      const continentName = mappedCountry ? mappedCountry.continent : "Other";

      let regionName = geo.region || "Unknown Region";
      if (geo.region && countryCode === "US" && US_STATES[geo.region]) {
        regionName = US_STATES[geo.region]!;
      } else if (geo.region && countryCode === "IN" && IN_STATES[geo.region]) {
        regionName = IN_STATES[geo.region]!;
      }

      return {
        country: countryName,
        country_code: countryCode,
        region: regionName,
        city: geo.city || "Unknown City",
        continent: continentName,
      };
    } catch (error) {
      return {
        country: "Unknown",
        country_code: "UN",
        region: "Unknown Region",
        city: "Unknown",
        continent: "Unknown",
      };
    }
  }
};
