# Migraciones de Supabase

SQL para ejecutar manualmente (SQL Editor del dashboard, o `psql`) en orden,
una sola vez por proyecto/entorno. No usan la CLI de Supabase, son simples
scripts numerados.

- `0001_games.sql` — tabla `games` (estado del juego en directo) + Realtime.
- `0002_cards.sql` — tabla `cards` (cartones generados, vinculados a una partida).

## Cómo ejecutarlas

**Opción A — SQL Editor del dashboard** (la más simple): abre tu proyecto en
https://supabase.com/dashboard → *SQL Editor* → pega el contenido de cada
archivo en orden (`0001...`, `0002...`, etc.) → *Run*.

**Opción B — `psql`** (connection string en *Project Settings → Database*):

```bash
for f in supabase/migrations/*.sql; do
  psql "$SUPABASE_DB_URL" -f "$f"
done
```

**Opción C — CLI de Supabase**, si prefieres usarla (no es necesaria para
este flujo manual, pero funciona igual con estos mismos archivos):

```bash
supabase link --project-ref <tu-project-ref>
supabase db push
```

Al añadir una nueva migración, crea `000N_descripcion.sql` con el siguiente
número y anótala aquí.
