#!/bin/bash
# Run this script with 
# npm run pushLDBtoYML
# because it assumes you're in the root folder
package="${PWD##*/}"
fvtt package workon $package --type "System"
for dir in packs/*; do
    pack="${dir##*/}"
    rm ./src/$pack/*.yml
    fvtt package unpack -n $pack --out ./src/$pack --yaml
done
