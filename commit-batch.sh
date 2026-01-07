#!/bin/bash

# Script to commit changes in batches to avoid rate limits
# Usage: ./commit-batch.sh [batch-size]
# Default batch size is 10

BATCH_SIZE=${1:-10}

# Get list of changed files (handles both modified and new files)
CHANGED_FILES=()
while IFS= read -r line; do
    if [ -n "$line" ]; then
        # Extract filename (handles both " M file" and "?? file" formats)
        file=$(echo "$line" | awk '{print $2}')
        if [ -n "$file" ]; then
            CHANGED_FILES+=("$file")
        fi
    fi
done < <(git status --porcelain)

if [ ${#CHANGED_FILES[@]} -eq 0 ]; then
    echo "No changes to commit."
    exit 0
fi

TOTAL_FILES=${#CHANGED_FILES[@]}
echo "Found $TOTAL_FILES files to commit"

# Process files in batches
BATCH_NUM=1
CURRENT_BATCH=0

for file in "${CHANGED_FILES[@]}"; do
    # Stage the file
    git add "$file"
    CURRENT_BATCH=$((CURRENT_BATCH + 1))
    
    # Commit when batch is full
    if [ $CURRENT_BATCH -eq $BATCH_SIZE ]; then
        echo "Committing batch $BATCH_NUM ($BATCH_SIZE files)..."
        git commit -m "Update content (batch $BATCH_NUM)"
        BATCH_NUM=$((BATCH_NUM + 1))
        CURRENT_BATCH=0
        sleep 2  # Small delay between commits to avoid rate limits
    fi
done

# Commit any remaining files
if [ $CURRENT_BATCH -gt 0 ]; then
    echo "Committing final batch ($CURRENT_BATCH files)..."
    git commit -m "Update content (final batch)"
fi

echo "All changes committed. Pushing to remote..."
git push

echo "Done! Committed $TOTAL_FILES files in $((BATCH_NUM - 1 + (CURRENT_BATCH > 0 ? 1 : 0))) batches."
