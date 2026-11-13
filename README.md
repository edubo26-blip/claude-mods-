# aviso-cache-fria

Mod que avisa cuando la caché del prompt de Claude está por enfriarse. Tras cada petición al modelo arranca una cuenta atrás (5 minutos por defecto, o 1 hora con la caché extendida). Encima del prompt muestra una banda: 🔥 caliente con el tiempo restante, ⏳ amarilla cuando queda poco (60 s por defecto), y ❄️ cuando ya se enfrió. En esos dos momentos también lanza un toast y una notificación. La duración y el margen de aviso se cambian en el menú de configuración.

## Instalar

En la app de escritorio: Configuración → Plugins → **+ Agregar** → Agregar marketplace → **Agregar desde un repositorio**, pega `edubo26-blip/claude-mods-` y luego agrega **aviso-cache-fria**.

En una terminal con Claude Code:

```
/plugin install aviso-cache-fria --marketplace edubo26-blip/claude-mods-
```
