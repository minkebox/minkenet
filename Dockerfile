FROM alpine:3.12

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY . /app

RUN apk add nodejs npm git chromium libpcap-dev build-base python3;\
    mv /app/minkebox /; \
    cd /app ; npm install --production ;\
    apk del git npm build-base python3

EXPOSE 8080/tcp
VOLUME /app/db

#HEALTHCHECK --interval=60s --timeout=5s --start-period=5s --retries=3 CMD ifconfig eth0 || exit 1

CMD [ "/bin/sh", "-c", "(cd /app ; node server.js)" ]
