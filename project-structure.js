const fs = require("fs");
const path = require("path");

const OUTPUT_FILE = "project-structure.txt";

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".github",
  ".next",
  ".turbo",
  ".vscode",
  ".idea",
  "dist",
  "build",
  "coverage",
  ".cache",
  ".parcel-cache",
  ".vercel",
  ".railway",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".venv",
  "venv",
  "env",
  ".env",
  ".DS_Store",
  ".gradle",
  "target",
  "out",
  "logs"
]);

const IGNORE_FILES = [
  ".log",
  ".pyc",
  ".pyo",
  ".class",
  ".lock",
  ".tmp",
  ".swp",
  ".swo"
];

let output = [];

function shouldIgnore(name) {
  if (IGNORE_DIRS.has(name)) return true;

  return IGNORE_FILES.some(ext => name.endsWith(ext));
}

function walk(dir, prefix = "") {
  let entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(e => !shouldIgnore(e.name))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? "└── " : "├── ";

    output.push(prefix + connector + entry.name);

    if (entry.isDirectory()) {
      walk(
        path.join(dir, entry.name),
        prefix + (isLast ? "    " : "│   ")
      );
    }
  });
}

output.push(path.basename(process.cwd()));
walk(process.cwd());

fs.writeFileSync(OUTPUT_FILE, output.join("\n"));

console.log(`Project structure written to ${OUTPUT_FILE}`);