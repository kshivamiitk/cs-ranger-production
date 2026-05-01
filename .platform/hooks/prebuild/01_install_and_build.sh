#!/bin/bash
set -e

echo "Installing root dependencies..."
npm install

echo "Installing frontend dependencies..."
npm --prefix frontend install

echo "Building frontend..."
npm --prefix frontend run build