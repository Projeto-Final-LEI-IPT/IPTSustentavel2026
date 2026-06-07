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

//LOGIN INSTITUCIONAL

// 1. Rota para iniciar o login (Redireciona o utilizador para a Microsoft)
router.get('/microsoft', async (req, res) => {
  const authCodeUrlParameters = {
    scopes: ["user.read"],
    redirectUri: process.env.MS_REDIRECT_URI, // Porta 3001 definida no .env
  };

  try {
    const response = await pca.getAuthCodeUrl(authCodeUrlParameters);
    res.json({ url: response }); // O frontend recebe esta URL e redireciona o user
  } catch (error) {
    res.status(500).send("Erro ao gerar URL da Microsoft");
  }
});

// 2. Rota de Callback (Onde a Microsoft devolve o código de sucesso)
router.get('/microsoft/callback', async (req, res) => {
  const tokenRequest = {
    code: req.query.code,
    scopes: ["user.read"],
    redirectUri: process.env.MS_REDIRECT_URI,
  };

  try {
    const response = await pca.acquireTokenByCode(tokenRequest);

    // Tenta apanhar o email do campo 'mail'. Se estiver vazio, tenta o 'preferred_username'.
    const email = response.account.idTokenClaims.mail || response.account.idTokenClaims.preferred_username;

    // Tenta apanhar o nome. Se não existir, usa um nome padrão.
    const displayName = response.account.idTokenClaims.name || "Utilizador IPT";

    // O ID único da Microsoft (importante para o campo microsoftId da tua BD)
    const microsoftId = response.account.homeAccountId;

    // Lógica "Procurar ou Criar"
    let user = await db.Utilizador.findOne({ where: { email: mail } });

    if (!user) {
      // Atribuição automática baseada no domínio do email
      const tipoId = email.toLowerCase().startsWith('aluno') ? 1 : 2; 

      user = await db.Utilizador.create({
        nome: displayName,
        email: mail,
        microsoftId: id,
        tipo_utilizador_id: tipoId,
        ativo: true,
        password: null // Login MS não usa password local
      });
    }

    // Verifica se a conta institucional foi desativada no sistema
    if (user.ativo === false) {
      return res.status(403).send('A sua conta institucional está desativada neste sistema.');
    }

    // Gera o token JWT interno com o cargo do utilizador
    const token = jwt.sign(
      { id: user.id, email: user.email, tipo_utilizador_id: user.tipo_utilizador_id },
      process.env.JWT_SECRET,
      { expiresIn: '1w' }
    );

    // Redireciona de volta para o Frontend (Porta 3000) com o token na URL
    res.redirect(`http://localhost:3000/login-success?token=${token}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro na autenticação Microsoft");
  }
});
// Exporta o router para uso em outros ficheiros
module.exports = router;
