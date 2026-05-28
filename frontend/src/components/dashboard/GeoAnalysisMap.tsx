import React from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';
import { Globe } from 'lucide-react';

// Using a standard, lightweight TopoJSON file for world borders
const geoUrl =
  'https://unpkg.com/world-atlas@2.0.2/countries-110m.json';

interface GeoAnalysisInsightData {
  countries: Array<{
    country: string;
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
                  // Match the country name from the map JSON with your API data
                  const countryName = geo.properties.name;

                  const matchedData = data.countries.find(
                    (c) =>
                      c.country.toLowerCase() ===
                      countryName.toLowerCase()
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
                        default: {
                          outline: 'none',
                        },

                        hover: {
                          fill: matchedData
                            ? getSeverityColor(matchedData.severity)
                            : 'hsl(var(--muted))',

                          filter: matchedData
                            ? 'brightness(1.1)'
                            : 'brightness(1.05)',

                          outline: 'none',

                          cursor: matchedData
                            ? 'pointer'
                            : 'default',
                        },

                        pressed: {
                          outline: 'none',
                        },
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
            Top Source:{' '}
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