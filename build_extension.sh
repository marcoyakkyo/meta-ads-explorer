#!/bin/bash
# RUN THIS SCRIPT WITH 'sh build_extension.sh'

rm -rf ./build ads-meta-chrome-ext.zip > /dev/null 2>&1
mkdir -p ./build > /dev/null 2>&1

echo "Building content script..."

# Ensure esbuild is installed
is_installed=$(npm list | grep -c esbuild)

if [ $is_installed -eq 0 ]; then
    echo "esbuild is not installed. Installing..."
    # npm install esbuild --save-dev
    if [ $? -ne 0 ]; then
        echo "Failed to install esbuild. Please install it manually."
        exit 1
    fi
fi

echo "Using esbuild to bundle and minify content.js...  with --minify"
npx esbuild ./chrome-extension/content.js --bundle  --outfile=./build/content_builded.js

if [ $? -ne 0 ]; then
    echo "Failed to build content script."
    exit 1
fi

if [ -f ./build/content_builded.js ]; then
    echo "Content script built successfully."
else
    echo "Failed to build content script."
    exit 1
fi

# zip the relevant files to create a Chrome extension package
echo "Creating Chrome extension package into build directory..."


echo "\n-----------------\nzipping the build directory to ads-meta-chrome-ext.zip..."
cp -r ./chrome-extension/manifest.json \
    ./chrome-extension/option \
    ./chrome-extension/background.js \
    ./chrome-extension/inject.js \
    ./chrome-extension/README.md \
    build/

zip -r ads-meta-chrome-ext.zip ./build/*

if [ $? -ne 0 ]; then
    echo "Failed to create Chrome extension package."
    exit 1
fi

echo "\n-----------------------\n"
echo "Chrome extension package created successfully:"
echo "ads-meta-chrome-ext.zip of size $(du -sh ads-meta-chrome-ext.zip | cut -f1)"
echo "build of size $(du -sh ./build | cut -f1)"
echo "use the build folder to load unpacked extension in Chrome"
echo "Remember to put the relevant credentials in the option page of the extension!"

# rm -rf ./content_builded.js > /dev/null 2>&1
