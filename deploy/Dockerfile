# Lab Companion as one container: build the static site, serve it with Caddy.
#
#   docker build -f deploy/Dockerfile -t lab-companion .
#   docker run -d --name lab -p 80:80 -p 443:443 -e LAB_DOMAIN=lab.example.org \
#     -v caddy_data:/data --restart unless-stopped lab-companion
#
# Without LAB_DOMAIN it serves plain HTTP on :80 (put it behind your own TLS proxy then).

# --- build ---------------------------------------------------------------------------------------
# glibc image: the TypeScript 7 compiler ships native binaries
FROM node:24-slim AS build
WORKDIR /app
COPY web/package.json web/package-lock.json web/
RUN cd web && npm ci --no-audit --no-fund
COPY engine/labcalc engine/labcalc
COPY web web
# fetch-py downloads the pinned, SHA-256-checked wheels from PyPI and zips the engine
RUN cd web && npm run build

# --- serve ---------------------------------------------------------------------------------------
FROM caddy:2-alpine
ENV LAB_DOMAIN=":80" LAB_ROOT="/srv/lab-companion"
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/web/dist /srv/lab-companion
EXPOSE 80 443
