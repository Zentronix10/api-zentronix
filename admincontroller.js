const db = require('../config/database');
const logger = require('../utils/logger');

// Apenas para desenvolvimento - em produção, isso teria autenticação de admin

// Listar todas as contas
const listarTodasContas = async (req, res) => {
  try {
    const contas = db.listarTodasContas();
    const contasSemSenha = contas.map(({ senha, ...conta }) => conta);
    
    res.json({
      total: contasSemSenha.length,
      contas: contasSemSenha
    });
    
  } catch (error) {
    logger.error('Erro ao listar contas', error);
    res.status(500).json({ erro: 'Erro ao listar contas' });
  }
};

// Estatísticas do sistema
const getEstatisticas = async (req, res) => {
  try {
    const stats = db.getEstatisticas();
    
    res.json({
      sistema: 'Zentreonix Bank',
      versao: '1.0.0',
      ...stats,
      timestamp: new Date()
    });
    
  } catch (error) {
    logger.error('Erro ao buscar estatísticas', error);
    res.status(500).json({ erro: 'Erro ao buscar estatísticas' });
  }
};

// Desativar conta
const desativarConta = async (req, res) => {
  try {
    const { id } = req.params;
    const conta = db.buscarContaPorId(parseInt(id));
    
    if (!conta) {
      return res.status(404).json({ erro: 'Conta não encontrada' });
    }
    
    db.atualizarConta(conta.id, { ativa: false });
    
    logger.warn(`Conta desativada: ${conta.numeroConta}`, { admin: req.ip });
    
    res.json({
      sucesso: true,
      mensagem: `Conta ${conta.numeroConta} desativada com sucesso`
    });
    
  } catch (error) {
    logger.error('Erro ao desativar conta', error);
    res.status(500).json({ erro: 'Erro ao desativar conta' });
  }
};

// Reset do sistema (apenas desenvolvimento)
const resetSistema = async (req, res) => {
  try {
    const apiKey = req.headers['x-admin-key'];
    
    if (apiKey !== 'admin_zentreonix_2024') {
      return res.status(401).json({ erro: 'Não autorizado' });
    }
    
    db.reset();
    
    logger.warn('SISTEMA RESETADO - Todos os dados foram removidos');
    
    res.json({
      sucesso: true,
      mensagem: 'Sistema resetado com sucesso'
    });
    
  } catch (error) {
    logger.error('Erro ao resetar sistema', error);
    res.status(500).json({ erro: 'Erro ao resetar sistema' });
  }
};

module.exports = {
  listarTodasContas,
  getEstatisticas,
  desativarConta,
  resetSistema
};
