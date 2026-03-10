FROM node:18

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm install

COPY . .

# React development server por default é 3000
EXPOSE 3000

CMD ["npm", "start"]

