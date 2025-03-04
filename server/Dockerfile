FROM ubuntu:24.04

WORKDIR /app

COPY package.json package-lock.json scraper.js upload.js db.js schema.sql /app

RUN touch sqlite.db &&\
    apt update && apt install -y cron &&\
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/bin/node /app/scraper.js >> /app/scraper.log 2>&1") | crontab - &&\
    (crontab -l 2>/dev/null; echo "0 * * * * /usr/bin/node /app/upload.js >> /app/upload.log 2>&1") | crontab - &&\
    apt install -y sqlite3 &&\
    sqlite3 sqlite.db < schema.sql &&\
    apt install -y curl &&\
    curl -fsSL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh &&\
    bash nodesource_setup.sh &&\
    rm nodesource_setup.sh &&\
    apt install -y nodejs &&\
    npm ci

CMD ["sh", "-c", "printenv > /etc/environment && cron -f"]
