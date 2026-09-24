// routes/artigo.js
// Importação das dependências necessárias
// Importa o framework Express
const express = require('express');
// Cria um router Express
const router = express.Router();
// Importa o middleware de autenticação
const authenticateToken = require('../middleware/auth');
// Importa os modelos da base de dados
const db = require('../models');
// Importa operadores do Sequelize para filtros
const { Op } = require('sequelize');
// Módulo para operações com o sistema de ficheiros
const fs = require('fs');
// Módulo para manipulação de caminhos de ficheiro
const path = require('path');
// Middleware para gestão de upload de ficheiros
const multer = require('multer');

// Configurações de segurança
const MAX_FILE_SIZE = 5 * 1024 * 1024; // Limite máximo de 5MB para ficheiros
const ALLOWED_MIME_TYPES = [
  'image/jpeg', // Permite JPEGs
  'image/png', // Permite PNGs
  'image/gif', // Permite GIFs
  'image/webp' // Permite WebP
];

// Verifica e cria o diretório de uploads
// Verifica se a pasta de uploads existe; se não, cria-a
const uploadDir = path.join(__dirname, '../pictures'); // Define o caminho para a pasta de uploads
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // Cria a pasta recursivamente se não existir
}

// Configuração segura do Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Define o destino dos ficheiros carregados
  },
  filename: (req, file, cb) => {
    const sanitizedName = Date.now() + '_' +
      file.originalname.replace(/[^a-zA-Z0-9_.-]/g, ''); // Sanitiza o nome do ficheiro, removendo caracteres potencialmente perigosos
    cb(null, sanitizedName); // Define o nome final do ficheiro
  }
});
// Função de filtro para verificar os tipos de ficheiros permitidos
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true); // Aceita o ficheiro se o tipo MIME estiver na lista permitida
  } else {
    cb(new Error('Tipo de arquivo não permitido'), false); // Rejeita o ficheiro se o tipo não for permitido
  }
};

// Configuração completa do middleware Multer
const upload = multer({
  storage: storage, // Usa a configuração de armazenamento definida acima
  limits: {
    fileSize: MAX_FILE_SIZE, // Limita o tamanho do ficheiro a 5MB
    files: 5 // 
  },
  fileFilter: fileFilter // Usa a função de filtro definida acima
});

// GET todos os artigos (público)
// Rota para obter todos os artigos (requer autenticação)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Captura parâmetros de consulta
    const { titulo, categoria_id, estado, disponivel, page = 1, limit = 4, isBackoffice } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Validação dos parâmetros
    if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
      return res.status(400).send({
        message: "Parâmetros de paginação inválidos"
      });
    }

    // Calcular offset para paginação
    const offset = (pageNum - 1) * limitNum;

    // Construir cláusula WHERE dinâmica
    const whereClause = {};
    if (titulo) {
      whereClause.titulo = { [Op.like]: `%${titulo}%` }; // Filtra por correspondência parcial
    }
    if (categoria_id) {
      whereClause.categoria_id = categoria_id;
    }
    if (estado) {
      whereClause.estado = estado;
    }
    if (disponivel === 'true') {
      whereClause.disponivel = true;
    } else if (disponivel === 'false') {
      whereClause.disponivel = false;
    } else if (isBackoffice !== 'true') {
      // Mantém o comportamento original apenas para requisições não-backoffice
      whereClause.disponivel = true;
    }   
    // Obter total de registros para calcular número total de páginas
    const count = await db.Artigo.count({ where: whereClause });

    const artigos = await db.Artigo.findAll({
      where: whereClause, // Aplica filtro de pesquisa
      include: [
        {
          model: db.Utilizador,
          as: 'utilizador',
          attributes: ['id', 'nome', 'email']
        },
        {
          model: db.Categoria,
          as: 'categoria',
          attributes: ['id', 'nome']
        },
        {
          model: db.ArtigoFotos,
          as: 'fotos',
          attributes: ['id', 'caminho_foto']
        }
      ],
      order: [['data_publicacao', 'DESC']], // Ordena por data decrescente
      limit: limitNum,
      offset: offset
    });

    // Calcular total de páginas
    const totalPages = Math.ceil(count / limitNum);

    // Retorna o resultado paginado
    res.json({
      artigos: artigos,
      pagination: {
        totalItems: count,
        totalPages: totalPages,
        currentPage: pageNum,
        itemsPerPage: limitNum
      }
    });
  } catch (error) {
    res.status(500).send({
      message: error.message || "Erro ao obter artigos"
    });
  }
});

// GET artigo por ID (público)
// Rota para obter um artigo específico por ID (requer autenticação)
router.get('/:id', authenticateToken, async (req, res) => {
  // Obtém o ID dos parâmetros da rota
  const id = req.params.id;
  try {
    const artigo = await db.Artigo.findByPk(id, {
      include: [
        {
          model: db.Utilizador,
          as: 'utilizador',
          attributes: ['id', 'nome', 'email']
        },
        {
          model: db.Categoria,
          as: 'categoria',
          attributes: ['id', 'nome']
        },
        {
          model: db.ArtigoFotos,
          as: 'fotos',
          attributes: ['id', 'caminho_foto']
        }
      ]
    });

    if (artigo) {
      res.json(artigo);
    } else {
      res.status(404).send({
        message: `Artigo com id=${id} não encontrado`
      });
    }
  } catch (error) {
    res.status(500).send({
      message: `Erro ao obter artigo com id=${id}`
    });
  }
});

// POST criar novo artigo (protegido)
// Rota para criar um novo artigo (requer autenticação)
router.post('/', authenticateToken, async (req, res) => {
  const {
    titulo,
    descricao,
    estado,
    categoria_id,
    disponivel,
    validade_meses,
    utilizador_id
  } = req.body;

  // Verifica se os campos obrigatórios estão presentes
  if (!titulo || !categoria_id || !utilizador_id) {
    return res.status(400).send({
      message: "Campos obrigatórios: titulo, categoria_id, utilizador_id"
    });
  }

  try {
    //Verificar se o utilizador existe
    const utilizadorExiste = await db.Utilizador.findByPk(utilizador_id);
    if (!utilizadorExiste) {
      return res.status(400).send({
        message: "Utilizador selecionado não existe"
      });
    }
    
    // Cria um novo artigo com os dados fornecidos
    const novoArtigo = await db.Artigo.create({
      titulo,
      descricao: descricao || null,
      estado: estado || 'Disponível',
      categoria_id,
      disponivel: disponivel !== undefined ? disponivel : true,
      validade_meses: validade_meses || 6,
      utilizador_id: utilizador_id,
      data_publicacao: new Date()
    });

    // Procura o artigo criado com suas relações
    const artigoCompleto = await db.Artigo.findByPk(novoArtigo.id, {
      include: [
        { model: db.Utilizador, as: 'utilizador' },
        { model: db.Categoria, as: 'categoria' }
      ]
    });

    // Retorna o artigo criado com status 201
    res.status(201).json(artigoCompleto);
  } catch (error) {
    // Em caso de erro, retorna status 500
    res.status(500).send({
      message: error.message || "Erro ao criar artigo"
    });
  }
});

// PUT atualizar artigo (protegido)
// Rota para atualizar um artigo existente (requer autenticação)
router.put('/:id', authenticateToken, async (req, res) => {
  // Obtém o ID dos parâmetros da rota
  const id = req.params.id;

  try {
    // Procura o artigo a ser atualizado
    const artigo = await db.Artigo.findByPk(id);

    if (!artigo) {
      // Verifica se o artigo existe
      return res.status(404).send({
        message: `Artigo com id=${id} não encontrado`
      });
    }

    // Verificar se o utilizador é o dono do artigo ou docente
    const utilizadorCompleto = await db.Utilizador.findByPk(req.user.id);
    if (artigo.utilizador_id !== req.user.id && utilizadorCompleto.tipo_utilizador_id !== 2) {
      return res.status(403).send({
        message: "Não tem permissão para editar este artigo"
      });
    }

    // Atualiza o artigo
    await db.Artigo.update(req.body, {
      where: { id: id }
    });

    res.send({ message: "Artigo atualizado com sucesso" });
  } catch (error) {
    res.status(500).send({
      message: `Erro ao atualizar artigo com id=${id}`
    });
  }
});

// DELETE apagar uma foto específica de um artigo (protegido)
router.delete('/:artigoId/fotos/:fotoId', authenticateToken, async (req, res) => {
  try {
    const foto = await db.ArtigoFotos.findOne({
      where: {
        id: req.params.fotoId,
        artigo_id: req.params.artigoId
      },
      include: [{ model: db.Artigo, as: 'artigo' }]
    });

    if (!foto) {
      return res.status(404).json({ message: "Foto não encontrada" });
    }

    // Verificar se o utilizador é o dono do artigo
    if (foto.artigo.utilizador_id !== req.user.id) {
      return res.status(403).json({ message: "Sem permissão" });
    }

    // Apagar o arquivo físico
    const filePath = path.join(uploadDir, foto.caminho_foto);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath); // Remove o arquivo
    }

    // Apagar da base de dados
    await foto.destroy();

    res.json({ message: "Foto excluída com sucesso" });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao excluir foto",
      error: error.message
    });
  }
});



// POST adicionar fotos a um artigo (protegido)
router.post('/:id/fotos', authenticateToken, upload.array('fotos', 5), // Middleware para processar múltiplos arquivos
  async (req, res) => {
    try {
      const artigo = await db.Artigo.findByPk(req.params.id);
      const utilizadorCompleto = await db.Utilizador.findByPk(req.user.id);
      
      if (!artigo || (artigo.utilizador_id !== req.user.id && utilizadorCompleto.tipo_utilizador_id !== 2)) {
        return res.status(403).json({ message: "Operação não permitida" });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "Nenhuma foto enviada" });
      }

      // Processar upload de fotos
      const fotos = req.files.map(file => ({
        caminho_foto: file.filename,
        artigo_id: artigo.id
      }));

      await db.ArtigoFotos.bulkCreate(fotos);

      res.json({
        message: "Fotos adicionadas com sucesso",
        fotos
      });

    } catch (error) {
      res.status(500).json({
        message: "Erro ao adicionar fotos",
        error: error.message
      });
    }
  }
);



// DELETE apagar artigo (protegido)
// Rota para apagar um artigo (requer autenticação)
router.delete('/:id', authenticateToken, async (req, res) => {
  // Obtém o ID dos parâmetros da rota
  const id = req.params.id;

  try {
    // 1. Procura o artigo incluindo as fotos associadas
    const artigo = await db.Artigo.findByPk(id, {
      include: [
        {
          model: db.ArtigoFotos,
          as: 'fotos',
          attributes: ['id', 'caminho_foto']
        }
      ]
    });

    // Verifica se o artigo existe
    if (!artigo) {
      return res.status(404).send({
        message: `Artigo com id=${id} não encontrado`
      });
    }

    // 2. Verificar se o utilizador é o dono do artigo ou docente (tipo 2)
    const utilizadorCompleto = await db.Utilizador.findByPk(req.user.id);
    if (artigo.utilizador_id !== req.user.id && utilizadorCompleto.tipo_utilizador_id !== 2) {
      return res.status(403).send({
        message: "Não tem permissão para apagar este artigo"
      });
    }

    // 3. Apagar os ficheiros físicos da pasta 'pictures'
    if (artigo.fotos && artigo.fotos.length > 0) {
      artigo.fotos.forEach(foto => {
        if (foto.caminho_foto) {
          // Extrai apenas o nome do ficheiro (ex: 172000000_foto.jpg)
          const fileName = path.basename(foto.caminho_foto);
          const filePath = path.join(uploadDir, fileName);

          // Verifica se o ficheiro existe no disco antes de apagar
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (err) {
              console.error(`Erro ao apagar o ficheiro físico ${fileName}:`, err);
            }
          }
        }
      });
    }

    // 4. Apagar os registos de fotos na base de dados (caso a FK não tenha CASCADE)
    await db.ArtigoFotos.destroy({
      where: { artigo_id: id }
    });

    // 5. Apagar o artigo da base de dados
    await artigo.destroy();

    res.send({ message: "Artigo e respetivas imagens apagados com sucesso" });
  } catch (error) {
    console.error("Erro ao apagar artigo e fotos:", error);
    res.status(500).send({
      message: `Erro ao apagar artigo com id=${id}`,
      error: error.message
    });
  }
});

// Exporta o router para uso em outros ficheiros
module.exports = router;
