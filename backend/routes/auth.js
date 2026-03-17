// routes/auth.js
// Importação das dependências necessárias
// Importa o framework Express
const express = require('express');
// Cria um router Express
const router = express.Router();
// Importa JWT para geração de tokens
const jwt = require('jsonwebtoken');
// Importa bcrypt para verificação de passwords
const bcrypt = require('bcrypt');
// Importa os modelos da base de dados
const db = require('../models');
// Rota de autenticação/login
router.post('/login', async (req, res) => {
  // Extrai email e password do corpo do pedido
  const { email, password } = req.body;

  try {
    // Procura o utilizador na base de dados pelo email
    const user = await db.Utilizador.findOne({ where: { email } });
    // Se não encontrar o utilizador, retorna erro 401 (Não Autorizado)
    if (!user) return res.status(401).send('Credenciais inválidas');
    //Verificar se a conta está ativa
    if (user.ativo === false) {
      return res.status(403).send('A sua conta foi desativada por um administrador.');
    }
    // Verifica se a password fornecida corresponde à hash guardada
    const validPassword = await bcrypt.compare(password, user.password);
    // Se a password não corresponder, retorna erro 401
    if (!validPassword) return res.status(401).send('Credenciais inválidas');
    // Gera um token JWT com os dados do utilizador
    const token = jwt.sign(
      { id: user.id, email: user.email, tipo_utilizador_id: user.tipo_utilizador_id }, // Payload do token (dados do utilizador)
      process.env.JWT_SECRET, // Chave secreta para assinatura do token
      { expiresIn: '1w' } // Token expira em 1 semana
    );
    // Retorna o token gerado
    res.json({
      token,
      userId: user.id,
      userTypeId: user.tipo_utilizador_id
    });
  } catch (error) {
    // Em caso de erro no servidor, retorna status 500
    res.status(500).send('Erro no servidor');
  }
});
// Exporta o router para uso em outros ficheiros
module.exports = router;
