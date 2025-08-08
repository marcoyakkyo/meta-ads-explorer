#!/bin/bash
# RUN THIS SCRIPT WITH 'bash build_extension.sh'

rm -rf ./build ads-meta-chrome-ext.zip > /dev/null 2>&1
mkdir -p ./build > /dev/null 2>&1

echo "Building content script..."

# Ensure esbuild is installed
if [ $(npm list | grep -c esbuild) -eq 0 ]; then
    echo "esbuild is not installed. Try with 'npm install esbuild --save-dev'"
    exit 1
fi

files=(
    "background.js"
    "content.js"
    "inject.js"
    "option/options.js"
)

echo "Using esbuild to bundle and minify $files (with --minify)"

for file in "${files[@]}"; do
    echo "Processing $file..."
    npx esbuild "./chrome-extension/$file" --bundle --minify --outfile="./build/$file" --platform=browser
    if [ $? -ne 0 ]; then
        echo "Failed to build $file."
        exit 1
    fi
done

# zip the relevant files to create a Chrome extension package
echo "Creating Chrome extension package into build directory..."

echo "-----------------"
echo "zipping the build directory to ads-meta-chrome-ext.zip..."

cp ./chrome-extension/manifest.json \
    ./chrome-extension/README.md \
    build/

cp ./chrome-extension/option/options.html ./build/option/options.html

zip -r ads-meta-chrome-ext.zip ./build/*

if [ $? -ne 0 ]; then
    echo "Failed to create Chrome extension package."
    exit 1
fi

echo ""
echo "-----------------------"
echo "Chrome extension package created successfully:"
echo "ads-meta-chrome-ext.zip of size $(du -sh ads-meta-chrome-ext.zip | cut -f1)"
echo "build of size $(du -sh ./build | cut -f1)"
echo ""

echo "Use the build folder to load unpacked extension in Chrome"
echo "Remember to put the relevant credentials in the option page of the extension!"
