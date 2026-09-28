FROM node:22-bookworm-slim

USER root
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium xvfb ca-certificates fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/ripperos-browser
RUN npm init -y && npm install playwright-core@1.55.0

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
ENV DISPLAY=:99
EXPOSE 9222

CMD ["sh", "-c", "Xvfb :99 -screen 0 1280x800x24 -ac +extension RANDR & exec /usr/bin/chromium --headless=new --disable-dev-shm-usage --no-sandbox --remote-debugging-address=0.0.0.0 --remote-debugging-port=9222 about:blank"]
