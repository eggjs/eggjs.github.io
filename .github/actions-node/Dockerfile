FROM node:lts-slim

LABEL "com.github.actions.name"="node"
LABEL "com.github.actions.description"="Deploy to Github Pages"
LABEL "com.github.actions.icon"="mic"
LABEL "com.github.actions.color"="purple"

LABEL "repository"="https://github.com/eggjs/eggjs.github.io"
LABEL "homepage"="https://github.com/eggjs/eggjs.github.io"
LABEL "maintainer"="Suyi <thonatos.yang@gmail.com>"

RUN \
    apt-get update -y && \
    apt-get install -y git

ADD entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]