FROM node:19

ENV NETWORK=mainnet

RUN apt-get update && apt-get -y upgrade

RUN mkdir /usr/src/app
##RUN mkdir /app && chown -R node:node /app

WORKDIR /usr/src/app

##RUN wget https://raw.githubusercontent.com/eficode/wait-for/v2.2.2/wait-for -O /wait-for && chmod +x /wait-for

##USER node

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . ./

RUN yarn run build
EXPOSE 3000
CMD [ "yarn", "start" ]