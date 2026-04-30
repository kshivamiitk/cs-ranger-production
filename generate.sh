#!/bin/bash
# Script to dump all source files for debugging (excluding node_modules, .next, and lock files)

OUTPUT_FILE="project-dump.txt"
echo "Generating project dump to $OUTPUT_FILE ..."

# Clear output file
> "$OUTPUT_FILE"

# Find all relevant source files
find . -type f \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.css" -o -name "*.sql" -o -name ".env*" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/.next/*" \
  ! -path "*/dist/*" \
  ! -path "*/build/*" \
  ! -path "*/.git/*" \
  ! -name "package-lock.json" \
  ! -name "yarn.lock" \
  ! -name "pnpm-lock.yaml" \
  ! -name ".env" \
  ! -name ".env.local" \
  ! -name ".env.example" \
  | while read -r file; do
    echo "=================================================================" >> "$OUTPUT_FILE"
    echo "FILE: $file" >> "$OUTPUT_FILE"
    echo "=================================================================" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
  done

echo "Done. Output written to $OUTPUT_FILE"
echo "File size: $(wc -l < "$OUTPUT_FILE") lines"