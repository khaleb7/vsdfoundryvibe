#!/bin/bash
# Run this script with 
# npm run pullYMLtoLDB
# because it assumes you're in the root folder
package="${PWD##*/}"
fvtt package workon $package --type "System"
rm -r ./packs/*
for dir in src/*; do
    pack="${dir##*/}"
    fvtt package pack -n $pack --in ./src/$pack --out ./packs/ --yaml
done
