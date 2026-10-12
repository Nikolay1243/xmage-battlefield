#!/bin/sh
set -eu
cd "$(dirname "$0")"
destination=${1:?Usage: build-macos.sh /absolute/path/to/client/lib}
mkdir -p "$destination/XMageBattlefield.app/Contents/MacOS"
swiftc XMageBattlefield.swift -o "$destination/XMageBattlefield.app/Contents/MacOS/XMageBattlefield" -framework Cocoa -framework WebKit -framework AVFoundation
cp Info.plist "$destination/XMageBattlefield.app/Contents/Info.plist"
