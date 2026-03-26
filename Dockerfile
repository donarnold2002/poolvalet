FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --production
COPY client/package*.json ./client/
RUN cd client && npm install
COPY . .
RUN cd client && npm run build && cp -r build ../server/
EXPOSE 3001
CMD ["node", "server/index.js"]
