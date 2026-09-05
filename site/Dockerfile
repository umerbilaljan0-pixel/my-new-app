# Build the marketing site (static) and serve via nginx.
# Build context is the repo root for the shared design tokens.
FROM node:22-alpine AS build
WORKDIR /app
COPY design ./design
COPY site ./site
WORKDIR /app/site
RUN npm install --no-audit --no-fund
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/site/dist /usr/share/nginx/html
# SPA fallback
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / { try_files $uri $uri/ /index.html; }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
