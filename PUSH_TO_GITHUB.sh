#!/bin/bash

echo "🚀 Pushing Recalibra to GitHub"
echo ""

# Check if remote exists
if git remote | grep -q origin; then
    echo "Remote 'origin' already exists"
    git remote -v
    echo ""
    read -p "Do you want to push to existing remote? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled"
        exit 1
    fi
else
    echo "⚠️  No remote configured yet!"
    echo ""
    echo "First, create a repository on GitHub:"
    echo "  1. Go to https://github.com/new"
    echo "  2. Name it 'recalibra' (or your preferred name)"
    echo "  3. Don't initialize with README/license"
    echo "  4. Click 'Create repository'"
    echo ""
    read -p "Enter your GitHub username: " GITHUB_USER
    read -p "Enter repository name (default: recalibra): " REPO_NAME
    REPO_NAME=${REPO_NAME:-recalibra}
    
    echo ""
    echo "Adding remote: https://github.com/$GITHUB_USER/$REPO_NAME.git"
    git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
fi

echo ""
echo "Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    git remote get-url origin | sed 's|https://github.com/|https://github.com/|' | xargs -I {} echo "View at: {}"
else
    echo ""
    echo "❌ Push failed. Make sure:"
    echo "  - You have a GitHub repository created"
    echo "  - You're authenticated (use: gh auth login)"
    echo "  - The repository URL is correct"
fi

