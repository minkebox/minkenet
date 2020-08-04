FROM alpine:latest

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY . /app

RUN apk add nodejs npm git chromium ;\
    cd /app ; npm install --production ;\
    apk del git

EXPOSE 8080/tcp
VOLUME /app/db

CMD [ "npm", "start", "--prefix", "/app" ]
