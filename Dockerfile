# The image used for the cardano-nodejs service in ./docker-compose.yml

# https://developers.cardano.org/docs/get-started/installing-cardano-node/#linux
# https://hydra.iohk.io/build/7739415
FROM node:lts

ENV CARDANO_NODE_BUILD="7739415"
ENV CARDANO_NODE_VERSION="1.30.1"
ENV CARDANO_NODE_SOCKET_PATH="/ipc/node.socket"

WORKDIR /app

RUN mkdir /cardano

RUN curl https://hydra.iohk.io/build/${CARDANO_NODE_BUILD}/download/1/cardano-node-${CARDANO_NODE_VERSION}-linux.tar.gz \
      -o /cardano/cardano-node-${CARDANO_NODE_VERSION}-linux.tar.gz

RUN tar -xvf /cardano/cardano-node-${CARDANO_NODE_VERSION}-linux.tar.gz -C /cardano

RUN rm -rf /cardano/cardano-node-${CARDANO_NODE_VERSION}-linux.tar.gz

RUN mv /cardano/cardano-cli /usr/local/bin
