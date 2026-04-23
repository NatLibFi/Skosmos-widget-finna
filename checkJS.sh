#! /bin/bash

WIDGETPATH="$(pwd)/widget.js"

if [ -z "$1" ]; then
  echo "Usage: $0 <path-to-skosmos-installation>"
  echo "For example: $0 /var/www/html/Skosmos"
  exit 1
fi

if [ "$2" == "--fix" ]; then
  cd $1
  echo "Automatically fixing $WIDGETPATH"
  npx eslint --fix --no-ignore --config $1/node_modules/standard/eslintrc.json $WIDGETPATH
else
  cd $1
  echo "Checking the validity of $WIDGETPATH"
  npx eslint --no-ignore --config $1/node_modules/standard/eslintrc.json $WIDGETPATH
  echo "If you want to apply the fixes automatically, run this script again with --fix in the end"
  echo "For example: $0 /var/www/html/Skosmos --fix"
fi

