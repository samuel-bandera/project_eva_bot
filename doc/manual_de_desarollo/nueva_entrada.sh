#!/usr/bin/env bash
# Uso: ./nueva-entrada.sh "[TIPO]" "Título de la entrada"

TIPO="${1:-[GEN]}"
TITULO="${2:-Sin título}"
FECHA=$(date '+%d/%m/%Y')
HORA=$(date '+%H:%M')

cat >> bitacora.md << EOF

---

## [Entrada XX] — $TITULO

**Fecha:** $FECHA
**Hora:** $HORA
**Tipo:** \`$TIPO\`
**Estado:** 🟡 En progreso
**Autor:** Samuel Bandera

### 🎯 Objetivo



### 🛠️ Qué se hizo



### 🐛 Problemas encontrados



### ✅ Estado



### 🔜 Próximo paso



---
EOF

echo "✅ Entrada agregada a bitacora.md"
echo "   Fecha: $FECHA  Hora: $HORA"
