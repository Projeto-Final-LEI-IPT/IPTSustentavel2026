// Importa a biblioteca Sequelize
const Sequelize = require('sequelize');
// Importa as configurações da base de dados do arquivo config.js ou config.json
const config = require('../config/config');
// Determina o ambiente atual (development, production, test)
const env = process.env.NODE_ENV || 'development';
// Seleciona a configuração da base de dados apropriada para o ambiente atual
const dbConfig = config[env];
// Cria uma nova instância de conexão do Sequelize com os parâmetros da base de dados
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port || process.env.DB_PORT || 24714,
    dialect: dbConfig.dialect,
    dialectOptions: dbConfig.dialectOptions || {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
);
// Adiciona a biblioteca Sequelize e a instância de conexão ao objeto db
const db = {
  Sequelize,
  sequelize,
  // Importa o modelo Utilizador e o inicializa com a conexão atual
  Utilizador: require('./utilizador')(sequelize, Sequelize),
  TipoUtilizador: require('./tipo_utilizador')(sequelize, Sequelize),
  Artigo: require('./artigo')(sequelize, Sequelize),
  Categoria: require('./categoria')(sequelize, Sequelize),
  Mensagem: require('./mensagem')(sequelize, Sequelize),
  ArtigoFotos: require('./artigo_fotos')(sequelize, Sequelize),
  Notificacao: require('./notificacao')(sequelize, Sequelize),
  NotificacaoLida: require('./notificacaolida')(sequelize, Sequelize)
};

// Definição das associações
Object.values(db).forEach(model => {
  if (model.associate) {
    model.associate(db);
  }
});
// Exporta o objeto db contendo todos os modelos configurados e a conexão
module.exports = db;
