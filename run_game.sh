#!/bin/bash
# Helper script to run the interactive console game on macOS

# Ensure gradlew is executable (required on macOS after git clone)
chmod +x ./gradlew

# Auto-detect JAVA_HOME on macOS if not already set
if [ -z "$JAVA_HOME" ]; then
    # Try macOS java_home utility (works for both Intel and Apple Silicon)
    if [ -x /usr/libexec/java_home ]; then
        export JAVA_HOME=$(/usr/libexec/java_home -v 17 2>/dev/null || /usr/libexec/java_home 2>/dev/null)
    fi
fi

if [ -z "$JAVA_HOME" ]; then
    echo "Warning: JAVA_HOME is not set and could not be auto-detected."
    echo "Please install JDK 17 via: brew install openjdk@17"
    exit 1
fi

echo "Using JAVA_HOME: $JAVA_HOME"
./gradlew :app:runConsoleGame --console=plain
