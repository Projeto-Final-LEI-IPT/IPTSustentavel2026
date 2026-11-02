// Carrega as variáveis de ambiente do ficheiro .env para o objeto process.env
// Isto permite aceder às variáveis de ambiente definidas no ficheiro .env
require('dotenv').config();

const dbSettings = {
  // Define o nome de utilizador da base de dados a partir da variável de ambiente DB_USER
  username: process.env.DB_USER,
  // Define a palavra-passe da base de dados a partir da variável de ambiente DB_PASSWORD
  password: process.env.DB_PASSWORD,
  // Define o nome da base de dados a partir da variável de ambiente DB_NAME
  database: process.env.DB_NAME,
  // Define o endereço do servidor da base de dados a partir da variável de ambiente DB_HOST
  host: process.env.DB_HOST,
  // Define a porta do servidor da base de dados a partir da variável de ambiente DB_PORT, ou utiliza 3306 como valor padrão
  port: process.env.DB_PORT || 24714,
  // Especifica que o dialeto SQL a ser utilizado é MySQL
  dialect: 'mysql',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
};

// Exporta um objeto de configuração para ser utilizado noutros módulos
module.exports = {
  development: dbSettings,
  production: dbSettings
};