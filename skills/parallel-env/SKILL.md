---
name: parallel-env
description: >
  Levanta entornos paralelos por branch usando el CLI `benv` en lugar de git worktrees.
  Clona el workspace (copy-on-write en APFS), hace checkout de la branch, y arranca su
  propio stack (Docker Compose u otro) en un offset de puertos libre para trabajar varias
  branches en simultáneo sin pisar el checkout principal. Usar cuando el usuario quiera
  probar/correr una branch en paralelo, "montar la branch en otro puerto", o evitar el
  toggle de worktrees.
---

# parallel-env (`benv`)

`benv` es un CLI portable (`~/.local/bin/benv`, Node sin deps) que reemplaza el flujo de
git worktrees por **instancias aisladas**: cada branch corre en su propia copia del
workspace, en su propio stack, en un offset de puertos.

## Cuándo usarlo

- El usuario quiere correr una branch en paralelo al entorno principal.
- Quiere "el mismo entorno pero en otro puerto" para otra branch.
- Está frustrado con worktrees porque su tooling/Docker monta el checkout principal:
  `benv` evita ese problema dándole a cada branch su propio dir + stack.

## Requisitos

- Un manifiesto `.benv.json` en la raíz del workspace (correr `benv init` si no existe).
- Docker Compose para proyectos con `compose` en el manifiesto; o comandos `up`/`down`
  propios para cualquier otro stack.

## Comandos

```bash
benv init                      # crea .benv.json (autodetecta docker-compose.yml)
benv up <branch> [--name N]    # clona workspace + checkout branch + levanta app en puerto libre
                               #   DEFAULT: comparte la BD del stack principal (mismo dato, intacta)
benv up <branch> --isolated-db # variante: stack completo con volúmenes de BD propios y frescos
benv ls                        # lista instancias (branch, offset, project, dir)
benv open [name] --zed         # abre el repo de la instancia en un editor (--code/--cursor/--editor <cmd>)
                               #   sin flag usa "editor" del manifiesto o $EDITOR; --root abre todo el workspace
benv ports <name>              # muestra el mapeo de puertos de una instancia
benv down <name>               # baja el stack (conserva el dir)
benv rm <name>                 # baja + borra el dir
benv prune                     # limpia entradas cuyo dir ya no existe
```

## Modo BD: compartido (default) vs aislado

- **Compartido (default)**: la instancia arranca **solo los `appServices`** (con `--no-deps`)
  en puertos nuevos y se une a las **redes externas** del stack principal, así los nombres
  de servicio (`db`, `redis`, ...) resuelven a los containers de MAIN. Mismo dato, y la BD
  de main queda **intacta** (no se crea, no se migra, no se borra en `rm`). Podés tener N
  puertos apuntando a la misma BD. Requiere el stack principal corriendo.
- **Aislado (`--isolated-db`)**: levanta el stack completo con sus propios volúmenes,
  sembrados de cero. Útil para probar migraciones o datos limpios sin tocar main.

Requiere en el manifiesto `compose.appServices` (qué servicios corre cada instancia).

## Cómo funciona

1. **Clona el workspace** (`workspaceRoot`) al dir de la instancia. En macOS/APFS usa
   `cp -c -R` (clonefile copy-on-write): instantáneo y sin gastar disco hasta modificar.
2. **Checkout de la branch** dentro de `repoSubdir` de la copia (git independiente).
3. **Aísla el stack**:
   - Docker: copia el compose a `docker-compose.benv.yml`, le suma el offset a los puertos
     host, y prefija `name:`/`container_name:` para que redes/volúmenes/containers no
     colisionen. Levanta con `docker compose -p <prefix>-<name> ...`.
   - No-Docker: corre el comando `up` del manifiesto con env `BENV_DIR`, `BENV_REPO`,
     `BENV_NAME`, `BENV_PORT_OFFSET`, `BENV_PROJECT`.
4. **Trackea estado** en `~/.benv/<name>/state.json` (slot de puerto, dir, project).

## Manifiesto `.benv.json`

```json
{
  "name": "miproyecto",
  "workspaceRoot": ".",
  "repoSubdir": ".",
  "instancesRoot": "~/.benv/miproyecto/instances",
  "portOffsetStep": 100,
  "compose": { "file": "docker-compose.yml", "projectPrefix": "miproyecto", "rewriteNames": true }
}
```

Para stacks no-Docker, reemplazar `compose` por:

```json
  "up":   "docker run ... -p $BENV_PORT_OFFSET ...",
  "down": "..."
```

Provisioning post-arranque (migraciones, composer/npm, copiar configs) con `postUp`:

```json
  "postUp": [
    "docker exec $BENV_PROJECT-app-1 php artisan migrate --force"
  ]
```

Cada comando corre con cwd = dir de la instancia y env `BENV_DIR/BENV_REPO/BENV_NAME/BENV_PORT_OFFSET/BENV_PROJECT`. Un fallo avisa pero no revierte la instancia.

**Timing**: `postUp` corre apenas `docker compose up -d` retorna, con los containers todavía
booteando. Si el comando depende de un proceso interno (supervisor, php-fpm, etc.), meterle
un retry/espera. Ejemplo real (copiar config + recargar nginx cuando supervisor esté listo):

```json
  "postUp": [
    "docker cp path/to.conf $BENV_PROJECT-app-1:/etc/nginx/x.conf && for i in $(seq 1 30); do docker exec $BENV_PROJECT-app-1 supervisorctl restart nginx >/dev/null 2>&1 && break; sleep 2; done"
  ]
```

Campos:

- `workspaceRoot` — dir a clonar (relativo al manifiesto). Para monorepos/multi-repo,
  apuntar a la carpeta que contiene todo lo que el stack necesita montar.
- `repoSubdir` — subdir donde se hace el checkout de la branch.
- `portOffsetStep` — cuánto separar cada instancia (default 100). Instancia N → offset N*step.
- `compose.projectPrefix` — prefijo del `COMPOSE_PROJECT_NAME` por instancia.

## Notas / límites

- Cada instancia Docker arranca con **volúmenes propios** (DB vacía salvo que el compose
  siembre datos). No comparte datos con el entorno principal.
- El offset de puertos asume que el compose publica puertos con formato `HOST:CONTAINER`.
  Si un puerto está fijo por otra vía (env externo), ajustarlo a mano.
- Cloná `workspaceRoot` con todo lo que el stack monta (repos hermanos incluidos), o los
  mounts relativos apuntarán fuera de la copia.
