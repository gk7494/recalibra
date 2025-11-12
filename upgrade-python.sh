#!/bin/bash

echo "Upgrading Python to 3.8+ for Recalibra"
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew is not installed."
    echo "Install it from: https://brew.sh"
    exit 1
fi

# Check for Command Line Tools
if ! xcode-select -p &> /dev/null; then
    echo "⚠️  Xcode Command Line Tools are required."
    echo ""
    echo "Installing Command Line Tools..."
    echo "A popup window will appear - click 'Install' and wait for it to complete."
    echo ""
    xcode-select --install
    
    echo ""
    echo "⏳ Waiting for Command Line Tools installation to complete..."
    echo "   (This may take 5-10 minutes)"
    echo ""
    
    # Wait for installation
    while ! xcode-select -p &> /dev/null; do
        sleep 5
        echo "   Still waiting... (press Ctrl+C to cancel and install manually)"
    done
    
    echo "✅ Command Line Tools installed!"
    echo ""
fi

echo "Installing Python 3.11 via Homebrew..."
brew install python@3.11

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Python 3.11 installed successfully!"
    echo ""
    echo "Python 3.11 is now available. The start-dev.sh script will automatically use it."
    echo ""
    echo "You can now run:"
    echo "  ./start-dev.sh"
else
    echo ""
    echo "❌ Failed to install Python 3.11"
    echo ""
    echo "You can try:"
    echo "  1. Install Command Line Tools manually: xcode-select --install"
    echo "  2. Or install from source: brew install --build-from-source python@3.11"
    exit 1
fi
