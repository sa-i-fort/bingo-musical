# 🎵 Bingo Musical

Generador de cartones de bingo musical para imprimir. 100% frontend (Angular),
no requiere backend ni base de datos: todo se procesa en el navegador.

Demo: https://sa-i-fort.github.io/bingo-musical/

## ¿Qué hace?

1. **Cargar canciones**: desde un CSV (`número,canción`) o importando una
   playlist pública de Spotify (login con Spotify, sin contraseñas ni datos
   guardados en ningún servidor).
2. **Configurar** filas, columnas y número de cartones a generar.
3. Ver y **reordenar/borrar** canciones antes de generar (drag & drop).
4. **Generar** los cartones: cada cartón tiene números únicos por columna
   (rangos tipo bingo clásico) y no hay dos cartones idénticos.
5. **Descargar en PDF**: los cartones (listos para recortar) y el listado de
   canciones ya renumerado (para el presentador).

## Uso

```bash
npm install
npm start            # http://localhost:4200
npm run start:https  # con HTTPS local, necesario para probar el login de Spotify
```

```bash
npm run build   # build de producción en dist/bingo-musical
npm test        # tests unitarios (Vitest)
```

## Importación desde Spotify

No requiere backend: usa el flujo OAuth **Authorization Code + PKCE**, pensado
para apps 100% cliente. Solo necesita un **Client ID** público (sin secreto).

Para desarrollo local, copia `src/app/spotify-client-id.example.ts` a
`src/app/spotify-client-id.ts` (ignorado por git) y pon tu Client ID de
[Spotify for Developers](https://developer.spotify.com/dashboard). Registra
`https://127.0.0.1:4200/` como Redirect URI en tu app de Spotify.

En producción (GitHub Pages), el Client ID se inyecta en build time desde la
variable de repositorio `SPOTIFY_CLIENT_ID` (ver
`.github/workflows/deploy-pages.yml`).

## Despliegue

Cada push a `main` construye y publica la app en GitHub Pages mediante
`.github/workflows/deploy-pages.yml`.
