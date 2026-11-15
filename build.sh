#!/usr/bin/env bash
# Genera index.html (documento completo) a partir de src/app.html (fragmento publicado como Artifact)
set -e
cd "$(dirname "$0")"
{ echo '<!doctype html>'; echo '<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';
  echo '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';
  cat src/app.html; echo '</body></html>'; } > index.html
echo "index.html generado"
