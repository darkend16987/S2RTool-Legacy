# Frontend Dockerfile for S2RTool
FROM nginx:alpine

# Copy static files to nginx html directory
COPY index.html /usr/share/nginx/html/
COPY building-render.html /usr/share/nginx/html/
COPY planning-render.html /usr/share/nginx/html/
COPY planning-detail-render.html /usr/share/nginx/html/
COPY settings.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/
COPY building-script.js /usr/share/nginx/html/
COPY planning-script.js /usr/share/nginx/html/
COPY planning-detail-script.js /usr/share/nginx/html/
COPY settings.js /usr/share/nginx/html/

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
