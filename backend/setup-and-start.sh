#!/bin/bash

echo "Setting up HealthPrevent backend..."

# Fix permissions for script
chmod +x setup-and-start.sh

# Install core dependencies first
echo "Installing core dependencies..."
npm install

# Install additional dependencies
echo "Installing additional dependencies..."
node install-missing-deps.js

# Start the server
echo "Starting the server..."
npm start
