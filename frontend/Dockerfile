# Build the workbench and serve it via nginx (which also proxies to the engine).
# Build context is the repo root so the shared design tokens are available.
FROM node:22-alpine AS build
WORKDIR /app
COPY design ./design
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm install --no-audit --no-fund
RUN npm run build

FROM nginx:alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
