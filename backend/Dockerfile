FROM node:18

WORKDIR /app

# Copiar dependências
COPY package*.json ./
RUN npm install

# Copiar código
COPY . .

EXPOSE 3001

CMD ["npm", "start"]

