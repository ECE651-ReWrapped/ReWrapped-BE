FROM node:16-alpine

ENV NODE_ENV=developmetn

RUN mkdir /app
WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn

COPY . .

EXPOSE 6001

CMD ["yarn", "start"]
