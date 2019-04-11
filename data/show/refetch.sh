#!/bin/bash
function fetchShowData {
  rm -f $1.json
  curl "https://api.got.show/api/show/$1" -s | python -m json.tool > $1.json 2> /dev/null
  if [[ "$(stat --printf="%s" $1.json)" == "0" ]]; then
    echo "Failed to fetch $1."
    rm $1.json
  else
    echo "Fetched $1"
  fi
}

fetchShowData animals
fetchShowData assassins
fetchShowData bastards
fetchShowData battles
fetchShowData cities
fetchShowData characters
fetchShowData castles
fetchShowData episodes
fetchShowData regions
fetchShowData religions
fetchShowData towns
