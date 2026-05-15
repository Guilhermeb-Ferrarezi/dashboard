#!/bin/sh
set -eu

codex_home="${CODEX_HOME:-/root/.codex}"
template_dir="${CODEX_INSTRUCTIONS_TEMPLATE_DIR:-/usr/local/share/codex}"
template_file="${CODEX_INSTRUCTIONS_TEMPLATE:-$template_dir/AGENTS.override.md}"
openapi_file="${CODEX_OPENAPI_TEMPLATE:-$template_dir/openapi.yaml}"

mkdir -p "$codex_home"

if [ -f "$template_file" ]; then
  cp "$template_file" "$codex_home/AGENTS.override.md"
fi

if [ -f "$openapi_file" ]; then
  cp "$openapi_file" "$codex_home/openapi.yaml"
fi

exec "$@"
