import React, { useMemo, useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';
import { Globe, ChevronDown, ChevronUp, MapPin, Shield, Activity, List, X } from 'lucide-react';

// Using a standard, lightweight TopoJSON file for world borders
const geoUrl = 'https://unpkg.com/world-atlas@2.0.2/countries-110m.json';

interface RegionData {
  region: string;
  request_count: number;
  severity: string;
}

interface CountryInfo {
  country: string; // E.g. "United States", "India", "Germany"
  request_count: number;
  severity: string;
  country_code?: string;
  regions?: RegionData[];
}

interface GeoAnalysisInsightData {
  countries: CountryInfo[];
  total_requests: number;
}

interface GeoAnalysisMapProps {
  data: GeoAnalysisInsightData;
  colorMode?: 'default' | 'primaryShades';
  mapScale?: number;
  mapCenter?: [number, number];
}

const getSeverityColor = (severity: string, colorMode?: 'default' | 'primaryShades') => {
  if (colorMode === 'primaryShades') {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'hsl(84, 100%, 65%)';
      case 'HIGH':
        return 'hsl(84, 100%, 50%)';
      case 'MEDIUM':
        return 'hsl(84, 85%, 38%)';
      case 'LOW':
        return 'hsl(84, 60%, 26%)';
      default:
        return 'hsl(210, 12%, 14%)';
    }
  }
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return 'hsl(var(--critical))';
    case 'HIGH':
      return 'hsl(var(--high))';
    case 'MEDIUM':
      return 'hsl(var(--medium))';
    case 'LOW':
      return 'hsl(var(--accent))';
    default:
      return 'hsl(var(--muted))';
  }
};

const getSeverityBadgeClass = (severity: string, colorMode?: 'default' | 'primaryShades') => {
  if (colorMode === 'primaryShades') {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-[hsl(84,100%,65%)]/10 text-[hsl(84,100%,65%)] border-[hsl(84,100%,65%)]/20';
      case 'HIGH':
        return 'bg-[hsl(84,100%,50%)]/10 text-[hsl(84,100%,50%)] border-[hsl(84,100%,50%)]/20';
      case 'MEDIUM':
        return 'bg-[hsl(84,85%,38%)]/10 text-[hsl(84,85%,38%)] border-[hsl(84,85%,38%)]/20';
      case 'LOW':
        return 'bg-[hsl(84,60%,26%)]/10 text-[hsl(84,60%,26%)] border-[hsl(84,60%,26%)]/20';
      default:
        return 'bg-muted/10 text-muted border-border';
    }
  }
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return 'bg-critical/10 text-critical border-critical/20';
    case 'HIGH':
      return 'bg-high/10 text-high border-high/20';
    case 'MEDIUM':
      return 'bg-medium/10 text-medium border-medium/20';
    case 'LOW':
      return 'bg-accent/10 text-accent border-accent/20';
    default:
      return 'bg-muted/10 text-muted border-border';
  }
};

// Dictionary mapping TopoJSON country names to your API's continent groupings.
// Exposing this for fallback continent highlighting.
const countryToContinentMap: Record<string, string> = {
  // North America
  'United States of America': 'North America',
  'Canada': 'North America',
  'Mexico': 'North America',
  'Greenland': 'North America',
  'Cuba': 'North America',
  'Dominican Rep.': 'North America',
  'Haiti': 'North America',
  'Guatemala': 'North America',
  'Honduras': 'North America',
  'El Salvador': 'North America',
  'Nicaragua': 'North America',
  'Costa Rica': 'North America',
  'Panama': 'North America',
  'Jamaica': 'North America',

  // South America
  'Brazil': 'South America',
  'Colombia': 'South America',
  'Argentina': 'South America',
  'Peru': 'South America',
  'Venezuela': 'South America',
  'Chile': 'South America',
  'Ecuador': 'South America',
  'Bolivia': 'South America',
  'Paraguay': 'South America',
  'Uruguay': 'South America',
  'Guyana': 'South America',
  'Suriname': 'South America',

  // Europe
  'Russia': 'Europe',
  'Germany': 'Europe',
  'United Kingdom': 'Europe',
  'France': 'Europe',
  'Italy': 'Europe',
  'Spain': 'Europe',
  'Ukraine': 'Europe',
  'Poland': 'Europe',
  'Romania': 'Europe',
  'Netherlands': 'Europe',
  'Belgium': 'Europe',
  'Czechia': 'Europe',
  'Greece': 'Europe',
  'Portugal': 'Europe',
  'Sweden': 'Europe',
  'Hungary': 'Europe',
  'Belarus': 'Europe',
  'Austria': 'Europe',
  'Serbia': 'Europe',
  'Switzerland': 'Europe',
  'Bulgaria': 'Europe',
  'Denmark': 'Europe',
  'Finland': 'Europe',
  'Slovakia': 'Europe',
  'Norway': 'Europe',
  'Ireland': 'Europe',
  'Croatia': 'Europe',
  'Moldova': 'Europe',
  'Bosnia and Herz.': 'Europe',
  'Albania': 'Europe',
  'Lithuania': 'Europe',
  'Macedonia': 'Europe',
  'Slovenia': 'Europe',
  'Latvia': 'Europe',
  'Estonia': 'Europe',
  'Montenegro': 'Europe',
  'Luxembourg': 'Europe',
  'Iceland': 'Europe',

  // Asia
  'China': 'Asia',
  'India': 'Asia',
  'Japan': 'Asia',
  'Indonesia': 'Asia',
  'Pakistan': 'Asia',
  'Bangladesh': 'Asia',
  'Philippines': 'Asia',
  'Vietnam': 'Asia',
  'Turkey': 'Asia',
  'Iran': 'Asia',
  'Thailand': 'Asia',
  'Myanmar': 'Asia',
  'South Korea': 'Asia',
  'Iraq': 'Asia',
  'Afghanistan': 'Asia',
  'Saudi Arabia': 'Asia',
  'Uzbekistan': 'Asia',
  'Malaysia': 'Asia',
  'Yemen': 'Asia',
  'Nepal': 'Asia',
  'North Korea': 'Asia',
  'Sri Lanka': 'Asia',
  'Kazakhstan': 'Asia',
  'Syria': 'Asia',
  'Cambodia': 'Asia',
  'Jordan': 'Asia',
  'Azerbaijan': 'Asia',
  'United Arab Emirates': 'Asia',
  'Tajikistan': 'Asia',
  'Israel': 'Asia',
  'Laos': 'Asia',
  'Kyrgyzstan': 'Asia',
  'Turkmenistan': 'Asia',
  'Singapore': 'Asia',
  'Oman': 'Asia',
  'Palestine': 'Asia',
  'Kuwait': 'Asia',
  'Georgia': 'Asia',
  'Mongolia': 'Asia',
  'Armenia': 'Asia',
  'Qatar': 'Asia',
  'Taiwan': 'Asia',

  // Africa
  'Nigeria': 'Africa',
  'Ethiopia': 'Africa',
  'Egypt': 'Africa',
  'Dem. Rep. Congo': 'Africa',
  'Tanzania': 'Africa',
  'South Africa': 'Africa',
  'Kenya': 'Africa',
  'Uganda': 'Africa',
  'Algeria': 'Africa',
  'Sudan': 'Africa',
  'Morocco': 'Africa',
  'Angola': 'Africa',
  'Mozambique': 'Africa',
  'Ghana': 'Africa',
  'Madagascar': 'Africa',
  'Cameroon': 'Africa',
  "Côte d'Ivoire": 'Africa',
  'Niger': 'Africa',
  'Burkina Faso': 'Africa',
  'Mali': 'Africa',
  'Malawi': 'Africa',
  'Zambia': 'Africa',
  'Senegal': 'Africa',
  'Chad': 'Africa',
  'Somalia': 'Africa',
  'Zimbabwe': 'Africa',
  'Guinea': 'Africa',
  'Rwanda': 'Africa',
  'Benin': 'Africa',
  'Burundi': 'Africa',
  'Tunisia': 'Africa',
  'S. Sudan': 'Africa',
  'Togo': 'Africa',
  'Sierra Leone': 'Africa',
  'Libya': 'Africa',
  'Congo': 'Africa',
  'Liberia': 'Africa',
  'Central African Rep.': 'Africa',
  'Mauritania': 'Africa',
  'Eritrea': 'Africa',
  'Namibia': 'Africa',
  'Gambia': 'Africa',
  'Botswana': 'Africa',
  'Gabon': 'Africa',
  'Lesotho': 'Africa',
  'Guinea-Bissau': 'Africa',
  'Eq. Guinea': 'Africa',
  'Mauritius': 'Africa',
  'Eswatini': 'Africa',
  'Djibouti': 'Africa',
  'W. Sahara': 'Africa',

  // Oceania
  'Australia': 'Oceania',
  'Papua New Guinea': 'Oceania',
  'New Zealand': 'Oceania',
  'Fiji': 'Oceania',
  'Solomon Is.': 'Oceania',
  'Vanuatu': 'Oceania',
  'New Caledonia': 'Oceania',
};

// Robust matching between API country and TopoJSON country names
const matchCountry = (apiCountry: string, geoName: string): boolean => {
  const apiLower = apiCountry.toLowerCase().trim();
  const geoLower = geoName.toLowerCase().trim();
  
  if (apiLower === geoLower) return true;
  
  if (apiLower === 'united states' || apiLower === 'us' || apiLower === 'usa') {
    return geoLower === 'united states of america' || geoLower === 'united states';
  }
  if (apiLower === 'united kingdom' || apiLower === 'uk') {
    return geoLower === 'united kingdom' || geoLower === 'uk';
  }
  if (apiLower === 'russia') {
    return geoLower === 'russia' || geoLower === 'russian federation';
  }
  if (apiLower === 'south korea' || apiLower === 'korea' || apiLower === 'kr') {
    return geoLower === 'south korea' || geoLower === 'dem. rep. korea' || geoLower === 'korea';
  }
  
  return false;
};
export const GeoAnalysisMap: React.FC<GeoAnalysisMapProps> = ({
  data,
  colorMode = 'default',
  mapScale = 140,
  mapCenter = [0, 20],
}) => {
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Closed by default
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
    subcontent?: string;
    severity?: string;
  } | null>(null);

  const toggleCountry = (countryName: string) => {
    if (expandedCountry === countryName) {
      setExpandedCountry(null);
    } else {
      setExpandedCountry(countryName);
    }
  };

  if (!data?.countries || data.countries.length === 0) return null;

  return (
    <div className="flex flex-col h-[500px] bg-card border border-border rounded-xl p-5 gradient-card overflow-hidden relative select-none">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.015] via-transparent to-primary/[0.01] pointer-events-none" />

      {/* Header */}
      <div className="mb-4 flex justify-between items-start z-10 relative">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Globe className="w-5 h-5 text-accent animate-pulse" />
            Origin Concentrations
          </h3>
          <p className="text-sm text-muted-foreground">
            Geopolitical threat correlation & source analysis
          </p>
        </div>

        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`p-2 px-3.5 rounded-lg border transition-all duration-200 backdrop-blur-sm flex items-center gap-2 text-xs font-semibold select-none shadow-md ${
            isSidebarOpen
              ? 'bg-accent/15 border-accent/40 text-accent glow-info'
              : 'bg-secondary hover:bg-muted border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          {isSidebarOpen ? (
            <>
              <X className="w-4 h-4" />
              <span>Hide Breakdown</span>
            </>
          ) : (
            <>
              <List className="w-4 h-4" />
              <span>Show Breakdown</span>
            </>
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="relative flex-grow flex items-stretch mt-1 overflow-hidden rounded-lg border border-border/40">
        {/* Map Vector (Fills full section width & height) */}
        <div className="w-full h-full flex items-center justify-center relative bg-secondary/10 overflow-hidden">
          <ComposableMap
            projectionConfig={{ scale: mapScale }}
            width={800}
            height={400}
            style={{ width: '100%', height: '100%' }}
          >
            <ZoomableGroup
              center={mapCenter}
              minZoom={1}
              maxZoom={6}
            >
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const countryName = geo.properties.name;
                    
                    // Match country name directly or fall back to continent name mapping
                    const matchedData = data.countries.find(
                      (c) =>
                        matchCountry(c.country, countryName) ||
                        c.country.toLowerCase() === countryToContinentMap[countryName]?.toLowerCase()
                    );

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={
                          matchedData
                            ? getSeverityColor(matchedData.severity, colorMode)
                            : 'hsl(var(--secondary))'
                        }
                        stroke="hsl(var(--border))"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: 'none', transition: 'all 300ms ease' },
                          hover: {
                            fill: matchedData
                              ? getSeverityColor(matchedData.severity, colorMode)
                              : 'hsl(var(--muted))',
                            filter: matchedData ? 'brightness(1.15) saturate(1.1)' : 'brightness(1.08)',
                            outline: 'none',
                            cursor: matchedData ? 'pointer' : 'default',
                          },
                          pressed: { outline: 'none' },
                        }}
                        onMouseEnter={(event) => {
                          const displayName = matchedData ? matchedData.country : countryName;
                          setTooltip({
                            x: event.clientX,
                            y: event.clientY,
                            content: displayName,
                            subcontent: matchedData ? `${matchedData.request_count} requests` : undefined,
                            severity: matchedData ? matchedData.severity : undefined,
                          });
                        }}
                        onMouseMove={(event) => {
                          setTooltip((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  x: event.clientX,
                                  y: event.clientY,
                                }
                              : null
                          );
                        }}
                        onMouseLeave={() => {
                          setTooltip(null);
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        </div>

        {/* Collapsible Details Sidebar Panel (Overlay) */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-80 z-20 flex flex-col justify-between overflow-hidden bg-background/95 border-l border-border/40 p-4 backdrop-blur-md transition-all duration-300 transform shadow-2xl ${
            isSidebarOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex-grow flex flex-col justify-between overflow-hidden">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase font-mono tracking-widest mb-3 flex items-center gap-1.5 shrink-0">
              <Shield className="w-3.5 h-3.5 text-accent" />
              Regional Breakdown
            </h4>

            {/* Scrollable list of Countries */}
            <div className="flex-grow overflow-y-auto pr-1 space-y-2.5 h-0 custom-scrollbar">
              {data.countries.map((c, index) => {
                const isExpanded = expandedCountry === c.country;
                const hasRegions = c.regions && c.regions.length > 0;
                const badgeClass = getSeverityBadgeClass(c.severity, colorMode);

                return (
                  <div
                    key={index}
                    className="border border-border/40 rounded-lg bg-card/45 hover:bg-card/75 transition-all duration-300 overflow-hidden"
                  >
                    {/* Header line for Country */}
                    <div
                      onClick={() => hasRegions && toggleCountry(c.country)}
                      className={`flex items-center justify-between p-3 cursor-pointer ${
                        hasRegions ? 'hover:bg-secondary/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-accent" />
                        <div>
                          <span className="font-semibold text-foreground text-sm tracking-wide">
                            {c.country}
                          </span>
                          {c.country_code && c.country_code !== 'UN' && (
                            <span className="text-[10px] text-muted-foreground font-mono ml-1.5 uppercase bg-border/20 px-1 rounded">
                              {c.country_code}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-medium text-foreground">
                          {c.request_count} reqs
                        </span>
                        
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badgeClass}`}>
                          {c.severity}
                        </span>

                        {hasRegions && (
                          isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )
                        )}
                      </div>
                    </div>

                    {/* Collapsible list of States/Regions */}
                    {hasRegions && isExpanded && (
                      <div className="px-3 pb-3 pt-0 border-t border-border/20 bg-secondary/10">
                        <div className="space-y-1.5 mt-2.5 font-mono text-[11px]">
                          {c.regions!.map((r, rIndex) => (
                            <div
                              key={rIndex}
                              className="flex justify-between items-center py-1 border-b border-border/10 last:border-b-0"
                            >
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-accent/40 rounded-full mr-0.5" />
                                {r.region}
                              </span>
                              <div className="flex items-center gap-2 font-medium">
                                <span className="text-foreground">
                                  {r.request_count} reqs
                                </span>
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: getSeverityColor(r.severity, colorMode) }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Metrics */}
          <div className="mt-3 pt-3 border-t border-border/30 flex justify-between text-xs font-mono text-muted-foreground bg-card/10 px-2 py-1.5 rounded-md shrink-0">
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-accent" />
              Total requests:
            </span>
            <span className="text-foreground font-bold tracking-wide">
              {data.total_requests}
            </span>
          </div>
        </div>
      </div>
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-background/95 border border-border/80 px-3 py-2 rounded-lg shadow-xl backdrop-blur-md text-xs font-mono flex flex-col gap-0.5"
          style={{
            top: tooltip.y + 15,
            left: tooltip.x + 15,
          }}
        >
          <div className="font-bold text-foreground">{tooltip.content}</div>
          {tooltip.subcontent && (
            <div className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <span>{tooltip.subcontent}</span>
              {tooltip.severity && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: getSeverityColor(tooltip.severity, colorMode) }}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};