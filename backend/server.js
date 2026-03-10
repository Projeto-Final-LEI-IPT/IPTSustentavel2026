//Importações e Configuração Inicial
//Importa o framework Express.js
const express = require('express');
const path = require('path');
//Importa o middleware CORS (Cross-Origin Resource Sharing)
const cors = require('cors');
//Importa os modelos da base de dados
const db = require('./models');
//Carrega variáveis de ambiente a partir de um ficheiro .env. 
require('dotenv').config();
//Verificação de Configuração
//Esta linha imprime o valor da variável de ambiente JWT_SECRET na consola.
console.log(process.env.JWT_SECRET);
//Cria uma nova instância da aplicação Express.
const app = express();
//Configuração de Middlewares
//Ativa o middleware CORS
app.use(cors());
// Ativa o middleware que analisa o corpo dos pedidos com conteúdo JSON, para processar dados enviados em formato JSON nas requisições POST e PUT.
app.use(express.json());
//app.use('/pictures', express.static(path.join(__dirname, './pictures')));
//app.use('/api/pictures', express.static('./routes/uploads'));


// Rotas
app.use('/api/pictures', require('./routes/uploads'));
//Rotas para gestão de utilizadores.
app.use('/api/utilizadores', require('./routes/utilizadores'));
//Rotas para gestão de artigos
app.use('/api/artigos', require('./routes/artigos'));
//Rotas para gestão de mensagens.
app.use('/api/mensagens', require('./routes/mensagens'));
//Rotas para gestão de categorias
app.use('/api/categorias', require('./routes/categorias'));
//Rotas para autenticação (login, registo, etc.).
app.use('/api/auth', require('./routes/auth'));
//Rotas para as notificações.
app.use('/api/notificacoes', require('./routes/notificacoes'));

//Define a porta em que o servidor vai escutar
const PORT = process.env.PORT || 3001;
//Sincronização da Base de Dados e Inicialização do Servidor
//Sincroniza os modelos Sequelize com a base de dados
db.sequelize.sync({ alter: true }).then(() => {
  //Inicia o servidor na porta especificada.
  app.listen(PORT, () => {
    //Imprime uma mensagem na consola indicando que o servidor está a funcionar e em qual porta.
    console.log(`Server running on port ${PORT}`);
  });
});
