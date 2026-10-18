# EMOTIVE MVP 0.3.1

Prototipo narrativo interactivo con interfaz responsive, preferencias de tono, decisiones ramificadas y guardado local del progreso.

## Compilar el APK gratis

1. Abre la pestaña **Actions** del repositorio.
2. Selecciona **Build EMOTIVE Android APK**.
3. Pulsa **Run workflow** en la rama `main` (también se ejecuta cuando cambian los archivos del proyecto).
4. Espera a que el trabajo termine en verde.
5. En el resumen de la ejecución, descarga el artefacto `EMOTIVE-Android-debug-APK`.
6. Descomprime el artefacto y copia `app-debug.apk` al teléfono Android. Permite la instalación desde esa fuente si Android lo solicita.

Documentación oficial sobre artefactos: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts

## Pruebas locales

```bash
npm install
npm test
```

## Estado y limitaciones

- Este es un prototipo funcional de historia interactiva, no un servicio audiovisual generativo.
- Las preferencias y el progreso se almacenan en el dispositivo; no hay cuentas ni sincronización en la nube.
- No se accede a cámara ni se analizan expresiones faciales.
- El APK de depuración sirve para pruebas e instalación manual; no es una versión firmada para distribución comercial.
- El proceso de compilación depende de que GitHub Actions esté habilitado para el repositorio y de que sus runners puedan descargar dependencias.
