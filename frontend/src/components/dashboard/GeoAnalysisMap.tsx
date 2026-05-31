import React, { useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';
import { Globe } from 'lucide-react';

// Using a standard, lightweight TopoJSON file for world borders
const geoUrl = 'https://unpkg.com/world-atlas@2.0.2/countries-110m.json';

interface GeoAnalysisInsightData {
  countries: Array<{
    country: string; // From API: e.g., "Africa", "Asia", "South America"
    request_count: number;
    threat_count: number;
    severity: string;
  }>;
  total_countries?: number;
}

interface GeoAnalysisMapProps {
  data: GeoAnalysisInsightData;
}

const getSeverityColor = (severity: string) => {
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

// Dictionary mapping TopoJSON country names to your API's continent groupings.
// Expand this list if specific countries on your map remain grey during a continent-wide attack.
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
  'Russia': 'Europe', // Technically transcontinental, grouping based on typical TopoJSON mapping
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

export const GeoAnalysisMap: React.FC<GeoAnalysisMapProps> = ({ data }) => {
  if (!data?.countries || data.countries.length === 0) return null;

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-xl p-5 gradient-card overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.015] via-transparent to-primary/[0.01] pointer-events-none" />

      <div className="mb-2 flex justify-between items-start z-10 relative">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Globe className="w-5 h-5 text-accent" />
            Origin Concentrations
          </h3>
          <p className="text-sm text-muted-foreground">
            Geopolitical threat correlation
          </p>
        </div>

        <div className="bg-secondary/70 px-3 py-1 rounded-md border border-border flex gap-3 text-xs font-mono backdrop-blur-sm">
          <span className="text-critical flex items-center">
            <span className="w-2 h-2 inline-block bg-critical rounded-full mr-1" />
            High Risk
          </span>
          <span className="text-accent flex items-center">
            <span className="w-2 h-2 inline-block bg-accent rounded-full mr-1" />
            Low Risk
          </span>
        </div>
      </div>

      <div className="flex-grow w-full relative -mt-4">
        <ComposableMap
          projectionConfig={{ scale: 140 }}
          width={800}
          height={400}
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup center={[0, 20]}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const countryName = geo.properties.name;
                  
                  // Look up the continent for this specific TopoJSON country
                  const continentName = countryToContinentMap[countryName];

                  // Match the resolved continent name against the API data
                  const matchedData = data.countries.find(
                    (c) =>
                      c.country.toLowerCase() ===
                      continentName?.toLowerCase()
                  );

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={
                        matchedData
                          ? getSeverityColor(matchedData.severity)
                          : 'hsl(var(--secondary))'
                      }
                      stroke="hsl(var(--border))"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: {
                          fill: matchedData
                            ? getSeverityColor(matchedData.severity)
                            : 'hsl(var(--muted))',
                          filter: matchedData ? 'brightness(1.1)' : 'brightness(1.05)',
                          outline: 'none',
                          cursor: matchedData ? 'pointer' : 'default',
                        },
                        pressed: { outline: 'none' },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Top Source Footer overlay */}
      {data.countries[0] && (
        <div className="mt-2 pt-3 border-t border-border flex justify-between text-xs font-mono text-muted-foreground relative z-10">
          <p>
            Top Regional Source:{' '}
            <span className="text-foreground">
              {data.countries[0].country}
            </span>
          </p>
          <p>
            Requests:{' '}
            <span className="text-foreground">
              {data.countries[0].request_count}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};