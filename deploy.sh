#!/bin/bash

rm -rf dist power-card.js

if npx eslint 'src/**/*.ts' --fix; then
  echo "Lint successful"
else
  echo "Lint failed"
  exit 1
fi

if npm run build; then
  echo "Build successful"
  cp power-card.js ~/config/www/
else
  echo "Build failed"
  exit 1
fi
