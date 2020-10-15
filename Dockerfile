FROM alpine:latest

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY . /app

RUN apk add nodejs npm git chromium libpcap-dev build-base python3;\
    mv /app/minkebox /; \
    cd /app ; npm install --production ;\
    apk del git npm build-base python3

EXPOSE 8080/tcp
VOLUME /app/db

CMD [ "/bin/sh", "-c", "(cd /app ; node server.js)" ]
