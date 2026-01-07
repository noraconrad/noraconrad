# Git helper functions for batch committing

# Function to commit changes in batches
# Usage: git-batch-commit [batch-size]
# Default batch size is 10
git-batch-commit() {
    local SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    if [ -f "$SCRIPT_DIR/commit-batch.sh" ]; then
        bash "$SCRIPT_DIR/commit-batch.sh" "$@"
    else
        echo "Error: commit-batch.sh not found"
        return 1
    fi
}

# Alias for convenience
alias gbc='git-batch-commit'
