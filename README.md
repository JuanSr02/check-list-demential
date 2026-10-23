# Plantilla

Checklist diaria que arranca de cero cada día a partir de una plantilla editable.
Pensada para el celular y la PC: se instala como app, sincroniza entre dispositivos y funciona sin conexión.

Proyecto construido junto con [Claude](https://claude.ai) (Anthropic).

## Qué hace

- **Plantilla del día.** Cada día empieza con la misma lista. La plantilla se edita desde la app: agregar, renombrar, ordenar y borrar ítems.
- **Subítems.** Un ítem puede tener pasos (por ejemplo *Limpieza Completa* → Lavar, Barrer piso, Baño…). Cuando se completan todos, el ítem pasa a *Hechas*.
- **Ajustes por día.** Se puede omitir un ítem o un subítem solo por hoy, o agregar algo puntual sin tocar la plantilla.
- **Historial.** Avance de los últimos 7 días, y navegación hasta 30 días atrás.
- **Sincronizada y offline.** Lo que marcás en el celular aparece en la PC. Sin conexión sigue funcionando y sube los cambios cuando vuelve.
- **Temas de color.** Seis paletas (Azul, Bosque, Atardecer, Uva, Océano, Grafito), cada una con modo claro, oscuro o automático.
- **Animaciones y sonido.** Efecto al marcar, entrada a *Hechas* al completar un ítem, y confeti con sonido al terminar el día. Se desactivan desde *Ajustes*.

## Stack

| Parte | Tecnología |
|---|---|
| Frontend | HTML, CSS y JavaScript sin frameworks ni build |
| App instalable | PWA (manifest + service worker) |
| API | Vercel Function — [`api/state.js`](api/state.js) |
| Datos | Upstash Redis (vía Vercel Storage) |
| Acceso | Clave única por variable de entorno (`APP_SECRET`) |

## Despliegue en Vercel

1. Importar el repo en Vercel (**Add New → Project**) y desplegar.
2. **Storage → Create Database → Upstash for Redis** y conectarla al proyecto. Esto agrega `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
3. **Settings → Environment Variables:** agregar `APP_SECRET` con la clave de acceso.
4. **Redeploy.**

Para instalarla, abrí la URL y elegí *Instalar app* (Chrome) o *Agregar a inicio* (Safari).

## Desarrollo local

```bash
npm install
APP_SECRET=1234 npm run dev   # http://localhost:3000
```

Sin Redis configurado, los datos se guardan en memoria.

## Estructura

```
├── index.html             # página
├── styles.css             # estilos y temas
├── app.js                 # lógica, vistas y sincronización
├── fx.js                  # temas, sonidos (Web Audio) y confeti
├── api/
│   ├── state.js           # GET/POST de plantilla y días (protegido con clave)
│   └── _store.js          # cliente Redis (memoria en local)
├── sw.js                  # caché offline
├── manifest.webmanifest   # datos de la app instalable
├── icons/                 # íconos
└── dev-server.mjs         # servidor local
```

## Datos

| Clave en Redis | Contenido |
|---|---|
| `plantilla:template` | ítems y subítems de la plantilla |
| `plantilla:day:AAAA-MM-DD` | estado de cada ítem y subítem ese día |

## Actualizar

Al cambiar archivos, subir `VERSION` en `sw.js` para que las apps instaladas tomen la versión nueva.
