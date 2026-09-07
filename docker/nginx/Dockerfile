FROM nginx:stable-alpine

COPY docker/nginx/http.conf docker/nginx/https.conf /opt/puppertrak-nginx/templates/
COPY docker/nginx/start-nginx.sh /opt/puppertrak-nginx/start-nginx.sh

RUN chmod +x /opt/puppertrak-nginx/start-nginx.sh

CMD ["/opt/puppertrak-nginx/start-nginx.sh"]
