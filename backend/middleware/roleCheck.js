// middleware/roleCheck.js

const isAdmin = (req, res, next) => {
  // O middleware 'authenticateToken' já colocou os dados do user em req.user
  // Agora verificamos se o tipo_utilizador_id corresponde ao ADMINISTRADOR (ID 4)
  if (req.user && req.user.tipo_utilizador_id === 4) {
    next(); // É admin, pode passar!
  } else {
    // 403 Forbidden: Ele sabe quem és, mas tu não tens "pedigree" para aqui estar
    return res.status(403).json({ 
      message: "Acesso negado. Esta funcionalidade é exclusiva para administradores." 
    });
  }
};

module.exports = { isAdmin };