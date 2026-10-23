# Plantilla

Checklist diaria con plantilla editable y subítems. Cada día arranca de cero desde la plantilla, y los días anteriores quedan en el historial (30 días).
Se instala como app en el celular y en la PC, sincroniza entre los dos y abre aunque no haya conexión. Lo que hagas sin conexión se sube solo cuando vuelve.

Todo corre en **Vercel**: la página, una función (`api/state.js`) y una base Redis gratuita que se conecta desde el panel de Vercel.
Para entrar se usa una **clave** que elegís vos. Se pide una sola vez en cada dispositivo.

---

## Publicarla (unos 10 minutos, gratis)

### 1. Subir el código a GitHub
Creá un repo vacío en GitHub (por ejemplo `plantilla`, puede ser privado) y subí esta carpeta:

```bash
git init && git add . && git commit -m "Plantilla"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/plantilla.git
git push -u origin main
```

### 2. Importarlo en Vercel
1. Entrá a https://vercel.com con tu cuenta de GitHub.
2. **Add New… → Project** → elegí el repo `plantilla` → **Deploy**. No hace falta cambiar ninguna opción.

### 3. Conectar la base de datos
1. En el proyecto de Vercel → pestaña **Storage** → **Create Database** → **Upstash for Redis** (plan Free) → aceptar.
2. Cuando pregunte, conectala a este proyecto (todas las *environments*).
   Vercel agrega solo las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`.

### 4. Elegir tu clave
1. Proyecto → **Settings → Environment Variables** → agregar:
   - Key: `APP_SECRET`
   - Value: la clave que quieras (algo que no uses en otro lado)
2. Guardar.

### 5. Volver a publicar
Pestaña **Deployments** → en el último, menú **⋯** → **Redeploy**, para que tome la base y la clave.

Listo: la app queda en `https://plantilla-xxxx.vercel.app`.

---

## Instalarla como app
- **Android (Chrome):** abrí el link → menú ⋮ → **Instalar app**.
- **iPhone (Safari):** Compartir → **Agregar a inicio**.
- **PC (Chrome/Edge):** ícono de instalar en la barra de direcciones.

En cada uno, la primera vez te pide la clave.

## Cambiar algo después
Editá los archivos, subí en `sw.js` el número de `VERSION` (`'v1'` → `'v2'`) y hacé `git push`.
Vercel publica solo, y las apps instaladas toman la versión nueva al abrirse.

## Probarla en tu PC sin Vercel
```bash
npm install
APP_SECRET=1234 npm run dev     # en Windows (PowerShell):  $env:APP_SECRET="1234"; npm run dev
```
Abrí http://localhost:3000. Sin Redis configurado, guarda en memoria y se borra al cerrar el servidor.

## Archivos
```
index.html, styles.css, app.js   la app
api/state.js                     la función: lee y guarda (pide la clave)
api/_store.js                    conexión a Redis
sw.js, manifest.webmanifest      para instalarla y usarla sin conexión
icons/                           íconos
dev-server.mjs                   servidor para probar local
```
Los datos quedan en Redis como `plantilla:template` y `plantilla:day:AAAA-MM-DD`. Se pueden ver desde Vercel → Storage → tu base → *Data Browser*.
