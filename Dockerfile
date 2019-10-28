FROM node:12

WORKDIR /app/src
COPY package*.json ./
RUN npm install --only=production
COPY . .

RUN mkdir -p /app/data
RUN chown node:node /app/data

USER node
CMD [ "npm", "start" ]
