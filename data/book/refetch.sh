#!/bin/bash
function fetchBookData {
  rm -f $1.json
  curl "https://gotdata.northeurope.cloudapp.azure.com/api/book/$1" -s | python -m json.tool > $1.json 2> /dev/null
  if [[ "$(stat --printf="%s" $1.json)" == "0" ]]; then
    echo "Failed to fetch $1."
    rm $1.json
  else
    echo "Fetched $1"
  fi
}

fetchBookData ages
fetchBookData cities
fetchBookData characters
fetchBookData characterPaths
fetchBookData characterLocations
fetchBookData continents
fetchBookData cultures
fetchBookData events
fetchBookData houses
fetchBookData regions
