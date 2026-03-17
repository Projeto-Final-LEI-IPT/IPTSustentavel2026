// Exporta uma função que recebe a instância do Sequelize e os tipos de dados
module.exports = (sequelize, DataTypes) => {
   // Importa a biblioteca bcrypt para criptografia de senhas
  const bcrypt = require('bcrypt');
   // Define um modelo chamado 'UTILIZADOR' no Sequelize
  const Utilizador = sequelize.define('UTILIZADOR', {
    // Campo 'email' do tipo String que não pode ser nulo e deve ser único
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    // Campo 'nome' do tipo String que não pode ser nulo
    nome: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // Campo 'imagem' do tipo String para armazenar o caminho da imagem do perfi
    imagem: DataTypes.STRING,
    //categoria: DataTypes.STRING,
    data_registo: {
      type: DataTypes.STRING,
      allowNull: false
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true, // Por padrão, novos users estão ativos
      allowNull: false
    }
  }
  , {
    tableName: 'utilizador'
  });

  Utilizador.associate = (models) => {
    Utilizador.hasMany(models.Artigo, {
      foreignKey: 'utilizador_id',
      as: 'utilizador'
    });

   Utilizador.belongsToMany(models.Notificacao, {
      through: 'NOTIFICACAO_LIDA',
      as: 'notificacoes',
      foreignKey: 'utilizador_id'
    });

    Utilizador.belongsTo(models.TipoUtilizador, {
      foreignKey: 'tipo_utilizador_id',
      as: 'tipo_utilizador'
    });
  };


  // Define um hook que é executado antes de criar um novo utilizador
  // Gera um "salt" aleatório e usa-o para criptografar a senha
  // Isso garante que as senhas nunca sejam armazenadas em texto claro
  Utilizador.beforeCreate(async (user) => {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  });
  // Retorna o modelo Utilizador configurado
  return Utilizador;
};
