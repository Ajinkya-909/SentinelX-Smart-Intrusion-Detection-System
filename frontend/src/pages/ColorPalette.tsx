import React from "react";

interface ColorSwatch {
  name: string;
  cssVar: string;
  description: string;
  usage: string;
}

interface SeverityLevel {
  level: string;
  color: string;
  cssVar: string;
  description: string;
}

const ColorPalette = () => {
  // Color definitions for proper rendering
const colorValues = {
  primary: "hsl(84 100% 52%)",
  accent: "hsl(188 100% 45%)",
  destructive: "hsl(0 91% 56%)",
  critical: "hsl(0 91% 56%)",
  high: "hsl(25 95% 60%)",
  medium: "hsl(45 93% 57%)",
  low: "hsl(142 71% 50%)",
  info: "hsl(188 100% 50%)",

  // refined dark surfaces
  card: "hsl(210 18% 8%)",
  secondary: "hsl(210 16% 6%)",
  muted: "hsl(210 12% 14%)",

  statusOnline: "hsl(142 71% 50%)",
  statusWarning: "hsl(45 93% 57%)",
  statusError: "hsl(0 91% 56%)",
  statusProcessing: "hsl(188 100% 50%)",
};
  const primaryColors: ColorSwatch[] = [
    {
      name: "Primary (Lime Green)",
      cssVar: "--primary",
      description: "Main accent color - Neon lime for primary actions",
      usage: "Buttons, highlights, active states",
    },
    {
      name: "Accent (Cyan)",
      cssVar: "--accent",
      description: "Secondary accent - Bright cyan for secondary actions",
      usage: "Links, secondary buttons, info highlights",
    },
    {
      name: "Destructive (Red)",
      cssVar: "--destructive",
      description: "Error/danger states - Bright red",
      usage: "Delete buttons, error messages, critical alerts",
    },
  ];


  const statusIndicators = [
    {
      name: "Online",
      color: "bg-status-online",
      description: "System operational",
    },
    {
      name: "Warning",
      color: "bg-status-warning",
      description: "Check required",
    },
    {
      name: "Error",
      color: "bg-status-error",
      description: "Failure detected",
    },
    {
      name: "Processing",
      color: "bg-status-processing",
      description: "Active work",
    },
  ];

  const neutralColors: ColorSwatch[] = [
    {
      name: "Background",
      cssVar: "--background",
      description: "Main background - Very dark blue-black",
      usage: "Page backgrounds, main surface",
    },
    {
      name: "Card",
      cssVar: "--card",
      description: "Card background - Slightly lighter than main",
      usage: "Cards, panels, elevated surfaces",
    },
    {
      name: "Secondary",
      cssVar: "--secondary",
      description: "Secondary background - Light blue-gray",
      usage: "Alternate backgrounds, complementary surfaces",
    },
    {
      name: "Muted",
      cssVar: "--muted",
      description: "Muted elements - Subtle accents",
      usage: "Disabled states, subtle separators",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-8 lg:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg text-primary-foreground"
              style={{ backgroundColor: colorValues.primary }}
            >
              S
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold">
              <span className="text-foreground">SentinelX</span>
              <span className="ml-2" style={{ color: colorValues.primary }}>
                Design System
              </span>
            </h1>
          </div>
          <p className="text-muted-foreground text-lg mt-2">
            Color Palette & Typography Showcase
          </p>
        </div>

        {/* Typography Section */}
        <section className="mb-20">
          <h2
            className="text-3xl font-bold mb-12"
            style={{ color: colorValues.primary }}
          >
            Typography
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  DISPLAY LARGE
                </p>
                <h3 className="text-5xl font-bold text-foreground">
                  Display Large
                </h3>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  DISPLAY MEDIUM
                </p>
                <h3 className="text-4xl font-bold text-foreground">
                  Display Medium
                </h3>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">HEADLINE</p>
                <h3 className="text-3xl font-bold text-foreground">Headline</h3>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">SUBHEADING</p>
                <h4 className="text-xl font-semibold text-foreground">
                  Subheading
                </h4>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">BODY LARGE</p>
                <p className="text-lg text-foreground">
                  This is body large text. Used for main content paragraphs.
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">BODY</p>
                <p className="text-base text-foreground">
                  This is body text. Standard size for most content.
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">BODY SMALL</p>
                <p className="text-sm text-foreground">
                  This is body small text. Used for secondary information.
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">CAPTION</p>
                <p className="text-xs text-muted-foreground">
                  This is caption text. Used for helper text and labels.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Primary Colors */}
        <section className="mb-20">
          <h2
            className="text-3xl font-bold mb-12"
            style={{ color: colorValues.primary }}
          >
            Primary Colors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {primaryColors.map((color, idx) => {
              const colorMap = [
                colorValues.primary,
                colorValues.accent,
                colorValues.destructive,
              ];
              return (
                <div key={color.cssVar} className="space-y-3">
                  <div
                    className="h-40 rounded-lg flex items-center justify-center text-foreground font-semibold border border-white border-opacity-5"
                    style={{ backgroundColor: colorMap[idx] }}
                  >
                    <span>{color.name}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {color.name}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {color.cssVar}
                    </p>
                    <p className="text-sm text-foreground mt-2">
                      {color.description}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: colorValues.accent }}
                    >
                      Usage: {color.usage}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Severity Levels */}
        <section className="mb-20">
          <h2
            className="text-3xl font-bold mb-12"
            style={{ color: colorValues.primary }}
          >
            Severity Levels
          </h2>
        </section>

        {/* Status Indicators */}
        <section className="mb-20">
          <h2
            className="text-3xl font-bold mb-12"
            style={{ color: colorValues.primary }}
          >
            Status Indicators
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {statusIndicators.map((status) => {
              const statusColorMap: Record<string, string> = {
                Online: colorValues.statusOnline,
                Warning: colorValues.statusWarning,
                Error: colorValues.statusError,
                Processing: colorValues.statusProcessing,
              };
              return (
                <div key={status.name} className="space-y-3">
                  <div
                    className="h-24 rounded-lg flex items-center justify-center border border-white border-opacity-5"
                    style={{ backgroundColor: statusColorMap[status.name] }}
                  >
                    <div className="w-4 h-4 bg-white rounded-full opacity-60"></div>
                  </div>
                  <p className="font-medium text-foreground text-center">
                    {status.name}
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    {status.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Neutral Colors */}
        <section className="mb-20">
          <h2
            className="text-3xl font-bold mb-12"
            style={{ color: colorValues.primary }}
          >
            Neutral Colors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {neutralColors.map((color) => {
              const neutralColorMap: Record<string, string> = {
                Background:
                  colorValues.card === "hsl(210 20% 10%)"
                    ? "hsl(210 15% 5%)"
                    : colorValues.card,
                Card: colorValues.card,
                Secondary: colorValues.secondary,
                Muted: colorValues.muted,
              };
              return (
                <div key={color.cssVar} className="flex gap-4">
                  <div
                    className="w-24 h-24 rounded-lg border border-white border-opacity-10"
                    style={{ backgroundColor: neutralColorMap[color.name] }}
                  ></div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{color.name}</p>
                    <p className="text-sm text-muted-foreground font-mono mt-1">
                      {color.cssVar}
                    </p>
                    <p className="text-sm text-foreground mt-3">
                      {color.description}
                    </p>
                    <p
                      className="text-xs mt-2"
                      style={{ color: colorValues.accent }}
                    >
                      Usage: {color.usage}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Color Reference Grid */}
        <section className="mb-20">
          <h2
            className="text-3xl font-bold mb-12"
            style={{ color: colorValues.primary }}
          >
            Complete Color Reference
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { name: "Primary", color: colorValues.primary },
              { name: "Accent", color: colorValues.accent },
              { name: "Critical", color: colorValues.critical },
              { name: "High", color: colorValues.high },
              { name: "Medium", color: colorValues.medium },
              { name: "Low", color: colorValues.low },
              { name: "Info", color: colorValues.info },
              { name: "Card", color: colorValues.card },
              { name: "Secondary", color: colorValues.secondary },
              { name: "Muted", color: colorValues.muted },
              { name: "Destructive", color: colorValues.destructive },
              { name: "Online", color: colorValues.statusOnline },
            ].map((item) => (
              <div key={item.name} className="space-y-2">
                <div
                  className="h-24 rounded-lg border border-white border-opacity-5"
                  style={{ backgroundColor: item.color }}
                ></div>
                <p className="text-xs text-center text-foreground font-medium">
                  {item.name}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Notes */}
        <section
          className="p-8 rounded-lg border border-white border-opacity-10"
          style={{ backgroundColor: "rgba(20, 27, 34, 0.5)" }}
        >
          <h3
            className="text-xl font-bold mb-6"
            style={{ color: colorValues.primary }}
          >
            Theme Configuration Notes
          </h3>
          <ul className="space-y-3 text-foreground">
            <li className="flex gap-3">
              <span
                style={{ color: colorValues.primary }}
                className="flex-shrink-0 font-bold"
              >
                •
              </span>
              <span className="text-sm">
                All colors use CSS custom properties and are stored in{" "}
                <code className="bg-secondary bg-opacity-40 px-2 py-1 rounded text-xs font-mono">
                  index.css
                </code>
              </span>
            </li>
            <li className="flex gap-3">
              <span
                style={{ color: colorValues.primary }}
                className="flex-shrink-0 font-bold"
              >
                •
              </span>
              <span className="text-sm">
                Fonts are configurable via{" "}
                <code className="bg-secondary bg-opacity-40 px-2 py-1 rounded text-xs font-mono">
                  --font-sans
                </code>{" "}
                and{" "}
                <code className="bg-secondary bg-opacity-40 px-2 py-1 rounded text-xs font-mono">
                  --font-mono
                </code>{" "}
                variables
              </span>
            </li>
            <li className="flex gap-3">
              <span
                style={{ color: colorValues.primary }}
                className="flex-shrink-0 font-bold"
              >
                •
              </span>
              <span className="text-sm">
                Current font:{" "}
                <span
                  className="font-semibold"
                  style={{ color: colorValues.accent }}
                >
                  Inter
                </span>{" "}
                (sans-serif) and{" "}
                <span
                  className="font-semibold"
                  style={{ color: colorValues.accent }}
                >
                  JetBrains Mono
                </span>{" "}
                (monospace)
              </span>
            </li>
            <li className="flex gap-3">
              <span
                style={{ color: colorValues.primary }}
                className="flex-shrink-0 font-bold"
              >
                •
              </span>
              <span className="text-sm">
                All colors are fully customizable by updating CSS variables
              </span>
            </li>
            <li className="flex gap-3">
              <span
                style={{ color: colorValues.primary }}
                className="flex-shrink-0 font-bold"
              >
                •
              </span>
              <span className="text-sm">
                Dark theme focused on operational seriousness and clarity
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default ColorPalette;
