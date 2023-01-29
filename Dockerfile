FROM node:current-alpine
WORKDIR /home/node/app
COPY package*.json ./
COPY index.js ./index.js
RUN npm install
# ENV 
CMD [ "node", "index.js" ]