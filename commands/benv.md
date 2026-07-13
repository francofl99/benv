Levanta o gestiona un entorno paralelo por branch con el CLI `benv` (alternativa a git worktrees): clona el workspace copy-on-write y corre la app en un puerto propio, compartiendo por defecto la BD/servicios del stack principal.

Cargá la skill `benv` y seguí ese playbook. Requiere un `.benv.json` en la raíz del workspace (si no existe, `benv init`).

## Uso

`/benv <acción> [args]` — si no se especifica acción, asumí `up` con la branch que indique el usuario.

| Intención | Comando |
|-----------|---------|
| Levantar una branch en otro puerto | `benv up <branch>` |
| Igual con BD propia fresca | `benv up <branch> --isolated-db` |
| Ver instancias activas | `benv ls` |
| Abrir una shell en el dir de la instancia | `benv open <name>` (subshell) |
| Abrir la instancia en un editor | `benv open <name> --code` (o `--zed`/`--cursor`/`--claude`/`--editor <cmd>`) |
| Ver puertos | `benv ports <name>` |
| Bajar y borrar | `benv rm <name>` |

## Reglas

- Correr `benv` desde dentro del proyecto (encuentra el `.benv.json` caminando hacia arriba).
- Por defecto la instancia **comparte la BD del stack principal** (mismo dato, intacta). Aclararlo si el usuario espera datos distintos; usar `--isolated-db` para BD fresca.
- Si la branch no existe local ni en origin, benv la crea desde el último `origin/main`/`master`.
- Tras `benv up`, reportar al usuario los puertos que devuelve el comando (app en `<base>+offset`).
- Antes de `benv rm`, confirmar (baja containers y borra el dir de la instancia; no toca la BD de main).
- El modo compartido requiere el stack principal corriendo.
