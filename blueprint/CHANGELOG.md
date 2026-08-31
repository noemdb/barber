# BarberService — Registro de modificaciones

Este documento asienta, de forma trazable, toda modificación implementada contra el contrato
`blueprint/specv1.0.md`. Cada entrada indica alcance, archivos, decisiones, verificación y
regresión conocida.

> ## 🔄 Registro reiniciado (nueva iteración)
>
> El historial previo (Cambio 1‑18, correspondiente al ciclo anterior de desarrollo) se descarta
> porque este documento se asocia a un **nuevo proyecto / iteración**. El formato y la convención
> de registro se mantienen. Cualquier cambio de esta iteración se asienta a partir de la sección
> siguiente.

---

## Convención para futuros cambios

Todo cambio de código debe añadir una entrada en este documento (`blueprint/CHANGELOG.md`) antes
de declararse terminado: alcance, archivos, decisiones, verificación y riesgos. Los cambios de
esquema deben producir su migración Prisma (§7) y reflejarse en el seed si corresponde (§36).

Cada entrada sigue esta plantilla:

```md
## YYYY-MM-DD · Cambio N — Título breve

### Objetivo

Por qué se hace este cambio.

### Qué se hizo

Decisión de diseño y acciones concretas.

### Archivos

| Archivo | Acción |
| --- | --- |
| `ruta/archivo` | creado / modificado / eliminado |

### Verificación

- `npm run typecheck`: OK.
- `npm run lint`: OK.
- `npm run build`: OK.
- Pruebas relevantes (si aplica).

### Regresión conocida

Limitaciones o efectos colaterales a considerar.
```
