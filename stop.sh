#!/bin/bash

# Asterisk Management UI - Stop Script

cd "$(dirname "$0")"

echo "Stopping Asterisk Management UI..."
docker-compose -f docker-compose.dev.yml down

echo "Stack stopped."
