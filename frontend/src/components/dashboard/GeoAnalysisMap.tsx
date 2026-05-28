import React from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { Globe } from 'lucide-react';

// Using a standard, lightweight TopoJSON file for world borders
const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

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
    case 'CRITICAL': return '#EF4444'; // Red
    case 'HIGH': return '#F97316';     // Orange
    case 'MEDIUM': return '#EAB308';   // Yellow
    case 'LOW': return '#3B82F6';      // Blue
    default: return '#6B7280';         // Gray
  }
};

export const GeoAnalysisMap: React.FC<GeoAnalysisMapProps> = ({ data }) => {
  if (!data?.countries || data.countries.length === 0) return null;

  return (
    <div className="flex flex-col h-full bg-[#121212] border border-gray-800 rounded-xl p-5 shadow-lg overflow-hidden">
      <div className="mb-2 flex justify-between items-start z-10 relative">
        <div>
          <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            Origin Concentrations
          </h3>
          <p className="text-sm text-gray-400">Geopolitical threat correlation</p>
        </div>
        <div className="bg-[#1A1A1A] px-3 py-1 rounded-md border border-gray-800 flex gap-3 text-xs font-mono">
          <span className="text-red-400"><span className="w-2 h-2 inline-block bg-red-500 rounded-full mr-1"></span>High Risk</span>
          <span className="text-blue-400"><span className="w-2 h-2 inline-block bg-blue-500 rounded-full mr-1"></span>Low Risk</span>
        </div>
      </div>

      <div className="flex-grow w-full relative -mt-4">
        <ComposableMap 
          projectionConfig={{ scale: 140 }} 
          width={800} 
          height={400} 
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup center={[0, 20]}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  // Match the country name from the map JSON with your API data
                  const countryName = geo.properties.name;
                  const matchedData = data.countries.find(
                    (c) => c.country.toLowerCase() === countryName.toLowerCase()
                  );

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={matchedData ? getSeverityColor(matchedData.severity) : "#1E1E1E"}
                      stroke="#333333"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { 
                          fill: matchedData ? getSeverityColor(matchedData.severity) : "#2A2A2A", 
                          outline: "none",
                          cursor: matchedData ? "pointer" : "default"
                        },
                        pressed: { outline: "none" },
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
        <div className="mt-2 pt-3 border-t border-gray-800 flex justify-between text-xs font-mono text-gray-400">
          <p>Top Source: <span className="text-gray-200">{data.countries[0].country}</span></p>
          <p>Requests: <span className="text-gray-200">{data.countries[0].request_count}</span></p>
        </div>
      )}
    </div>
  );
};