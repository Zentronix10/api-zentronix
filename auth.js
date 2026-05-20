const logger = require('../utils/logger');

// Middleware de autenticação simples
const authMiddleware = (req, res, next) => {
  // Pular autenticação para rotas públicas
  const rotasPublicas = ['/api/registrar', '/api/login', '/', '/health'];
  
  if (rotasPublicas.includes(req.path)) {
    return next();
  }
  
  // Pegar token do header
  const token = req.headers['authorization'];
  
  if (!token) {
    logger.warn(`Tentativa de acesso sem token: ${req.path}`, { ip: req.ip });
    return res.status(401).json({ 
      erro: 'Token de autenticação não fornecido',
      mensagem: 'Adicione o header: Authorization: Bearer seu_token_aqui'
    });
  }
  
  // Token simples (em produção usar JWT)
  // Formato esperado: "Bearer token_simples_1_123456789"
  const tokenParts = token.split(' ');
  const tokenValue = tokenParts[1] || tokenParts[0];
  
  if (!tokenValue.startsWith('token_simples_')) {
    logger.warn(`Token inválido detectado: ${req.path}`, { ip: req.ip });
    return res.status(401).json({ erro: 'Token inválido' });
  }
  
  // Extrair ID da conta do token
  const contaId = parseInt(tokenValue.split('_')[2]);
  
  if (isNaN(contaId)) {
    return res.status(401).json({ erro: 'Token mal formatado' });
  }
  
  // Adicionar contaId na requisição
  req.contaId = contaId;
  logger.info(`Acesso autorizado - Conta ID: ${contaId}`, { path: req.path });
  
  next();
};

// Middleware para validar API Key (para serviços externos)
const apiKeyMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY || 'zentreonix_api_123456';
  
  if (!apiKey || apiKey !== validApiKey) {
    logger.warn(`API Key inválida: ${req.path}`, { ip: req.ip });
    return res.status(401).json({ erro: 'API Key inválida' });
  }
  
  next();
};

// Middleware para log de acesso
const logMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.access(req, res.statusCode);
    if (duration > 1000) {
      logger.warn(`Requisição lenta detectada: ${duration}ms`, { path: req.path });
    }
  });
  
  next();
};

module.exports = { authMiddleware, apiKeyMiddleware, logMiddleware };
