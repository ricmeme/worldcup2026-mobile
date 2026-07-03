# WorldCup 2026 Mobile PWA - Samsung S21 Ultra

Versión móvil de la app WorldCup 2026, optimizada para Android/Samsung S21 Ultra.

## Qué incluye

- Vista rápida de hoy.
- Fixture completo en hora Chile.
- Marcadores con ESPN fallback cuando el navegador permite la conexión.
- Cache local si no hay internet o la API falla.
- Bracket móvil por rondas.
- Match Center tocando cualquier partido.
- Favorito, sólo favorito, modo sin spoilers.
- Últimos 5 eventos registrados en orden cronológico.
- Ruta al título por país.
- Exportar calendario `.ics`.
- Instalable como app en Android con Chrome: PWA.

## Cómo instalar en tu Samsung S21 Ultra

1. Sube esta carpeta a un hosting HTTPS gratuito, recomendado: GitHub Pages.
2. Abre la URL desde Chrome en el S21 Ultra.
3. Toca el menú `⋮` de Chrome.
4. Toca `Agregar a pantalla principal` o `Instalar app`.
5. Se instala como una app más en tu celular.

## Por qué PWA y no APK

La PWA es la opción gratis y práctica:

- No necesita Play Store.
- No necesita firma digital pagada.
- No necesita Android Studio.
- Se instala en la pantalla principal.
- Puede actualizarse simplemente subiendo nuevos archivos.

## Importante

Para que funcione como app instalable, debe estar publicada por HTTPS. Abrir `index.html` directo desde archivos puede servir para ver la interfaz, pero no instala bien como PWA ni usa service worker.
