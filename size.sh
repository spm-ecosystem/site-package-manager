#!/usr/bin/env bash

set -e

TARGET_DIR="${1:-.}"

# ANSI Color Codes
C_RESET="\x1b[0m"
C_BOLD="\x1b[1m"
C_DIM="\x1b[2m"
C_CYAN="\x1b[36m"
C_GREEN="\x1b[32m"
C_MAGENTA="\x1b[35m"
C_YELLOW="\x1b[33m"

echo -e "${C_BOLD}${C_MAGENTA} Directory and File Size Inspection Report${C_RESET}"
echo -e "${C_DIM} Target: $(realpath "$TARGET_DIR")${C_RESET}"
echo ""

echo -e "${C_BOLD}${C_CYAN}--- 1. DIRECTORY SIZES (Excluding node_modules) ---${C_RESET}"
du -h --max-depth=1 --exclude="node_modules" "$TARGET_DIR" 2>/dev/null | sort -hr
echo ""

echo -e "${C_BOLD}${C_CYAN}--- 2. SIZES BY FILE EXTENSION (Excluding node_modules) ---${C_RESET}"

find "$TARGET_DIR" -type d \( -name "node_modules" -o -name ".git" \) -prune -o -type f -print0 | while IFS= read -r -d '' file; do
    size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo 0)
    
    ext="${file##*.}"
    if [ "$file" = "$ext" ]; then
        ext="no_extension"
    else
        ext=$(echo "$ext" | tr '[:upper:]' '[:lower:]')
    fi
    
    echo "$ext $size"
done | awk '{
    ext = $1;
    size = $2;
    sum[ext] += size;
    count[ext] += 1;
} END {
    printf "%-15s %-15s %-12s\n", "EXTENSION", "TOTAL SIZE", "FILE COUNT";
    printf "%-15s %-15s %-12s\n", "---------", "----------", "----------";
    
    for (e in sum) {
        s = sum[e];
        cnt = count[e];
        
        split("B KB MB GB TB", unit);
        i = 1;
        while (s >= 1024 && i < 5) {
            s /= 1024;
            i++;
        }
        printf "%-15s %6.2f %-8s (%d files)\n", e, s, unit[i], cnt;
    }
}' | sort -hr -k2

echo ""
echo -e "${C_BOLD}${C_GREEN} Inspection complete.${C_RESET}"