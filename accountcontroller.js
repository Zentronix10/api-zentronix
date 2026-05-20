const db = require('../config/database');
const logger = require('../utils/logger');
const { validateConta, validateTransferencia } = require('../utils/validation');

// Gerar número de conta único
const gerarNumeroConta = () => {
  const prefixo = 'ZEN';
  const numero = String(Date.now()).slice(-6);
  const digito = Math.floor(Math.random() * 9) + 1;
  return `${prefixo}${numero}${digito}`;
};

// Registrar nova conta
const registrar = async (req, res) => {
  try {
    const { nome, email, senha, moeda = 'USD', tipo = 'personal' } = req.body;
    
    // Validar
    const { error } = validateConta(req.body);
    if (error) {
      logger.warn('Falha na validação de cadastro', { erro: error.details[0].message });
      return res.status(400).json({ erro: error.details[0].message });
    }
    
    // Verificar email duplicado
    const contaExistente = db.buscarContaPorEmail(email);
    if (contaExistente) {
      return res.status(400).json({ erro: 'Email já cadastrado' });
    }
    
    // Criar conta
    const numeroConta = gerarNumeroConta();
    const novaConta = {
      numeroConta,
      nome,
      email,
      senha, // Em produção: usar bcrypt
      saldo: 0,
      moeda,
      tipo,
      ativa: true,
      limiteDiario: tipo === 'business' ? 50000 : 10000,
      transacoesHoje: 0,
      ultimoResetDiario: new Date()
    };
    
    const conta = db.salvarConta(novaConta);
    
    // Remover senha da resposta
    const { senha: _, ...contaSemSenha } = conta;
    
    logger.info(`Nova conta criada: ${numeroConta}`, { nome, email, tipo });
    
    res.status(201).json({
      sucesso: true,
      mensagem: 'Conta criada com sucesso!',
      conta: contaSemSenha
    });
    
  } catch (error) {
    logger.error('Erro ao registrar conta', error);
    res.status(500).json({ erro: 'Erro interno ao criar conta' });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }
    
    const conta = db.buscarContaPorEmail(email);
    
    if (!conta || conta.senha !== senha) {
      logger.warn(`Tentativa de login falhou: ${email}`);
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }
    
    if (!conta.ativa) {
      return res.status(401).json({ erro: 'Conta desativada. Contate o suporte.' });
    }
    
    // Resetar limite diário se necessário
    const hoje = new Date().toDateString();
    const ultimoReset = new Date(conta.ultimoResetDiario).toDateString();
    if (hoje !== ultimoReset) {
      conta.transacoesHoje = 0;
      conta.ultimoResetDiario = new Date();
      db.atualizarConta(conta.id, { transacoesHoje: 0, ultimoResetDiario: new Date() });
    }
    
    // Gerar token
    const token = `token_simples_${conta.id}_${Date.now()}`;
    
    logger.info(`Login realizado: ${conta.numeroConta}`, { email });
    
    res.json({
      sucesso: true,
      mensagem: 'Login realizado com sucesso',
      token,
      conta: {
        id: conta.id,
        numeroConta: conta.numeroConta,
        nome: conta.nome,
        email: conta.email,
        saldo: conta.saldo,
        moeda: conta.moeda,
        tipo: conta.tipo
      }
    });
    
  } catch (error) {
    logger.error('Erro no login', error);
    res.status(500).json({ erro: 'Erro interno no login' });
  }
};

// Ver perfil
const getPerfil = async (req, res) => {
  try {
    const conta = db.buscarContaPorId(req.contaId);
    
    if (!conta) {
      return res.status(404).json({ erro: 'Conta não encontrada' });
    }
    
    const { senha, ...perfil } = conta;
    
    res.json(perfil);
    
  } catch (error) {
    logger.error('Erro ao buscar perfil', error);
    res.status(500).json({ erro: 'Erro ao buscar perfil' });
  }
};

// Depositar
const depositar = async (req, res) => {
  try {
    const { valor, descricao = 'Depósito' } = req.body;
    
    if (!valor || valor <= 0) {
      return res.status(400).json({ erro: 'Valor inválido para depósito' });
    }
    
    const conta = db.buscarContaPorId(req.contaId);
    
    if (!conta) {
      return res.status(404).json({ erro: 'Conta não encontrada' });
    }
    
    const saldoAnterior = conta.saldo;
    conta.saldo += valor;
    db.atualizarConta(conta.id, { saldo: conta.saldo });
    
    // Registrar transação
    const transacao = {
      contaId: conta.id,
      tipo: 'DEPOSITO',
      valor,
      descricao,
      saldoAnterior,
      novoSaldo: conta.saldo
    };
    db.salvarTransacao(transacao);
    
    logger.transaction(conta.numeroConta, 'DEPOSITO', valor, saldoAnterior, conta.saldo);
    
    res.json({
      sucesso: true,
      mensagem: `Depósito de ${valor} ${conta.moeda} realizado com sucesso`,
      novoSaldo: conta.saldo,
      moeda: conta.moeda,
      transacaoId: transacao.id
    });
    
  } catch (error) {
    logger.error('Erro ao depositar', error);
    res.status(500).json({ erro: 'Erro ao realizar depósito' });
  }
};

// Sacar
const sacar = async (req, res) => {
  try {
    const { valor, descricao = 'Saque' } = req.body;
    
    if (!valor || valor <= 0) {
      return res.status(400).json({ erro: 'Valor inválido para saque' });
    }
    
    const conta = db.buscarContaPorId(req.contaId);
    
    if (!conta) {
      return res.status(404).json({ erro: 'Conta não encontrada' });
    }
    
    // Verificar limite diário
    if (conta.transacoesHoje + valor > conta.limiteDiario) {
      return res.status(400).json({ 
        erro: `Limite diário de ${conta.limiteDiario} ${conta.moeda} excedido` 
      });
    }
    
    if (conta.saldo < valor) {
      return res.status(400).json({ erro: 'Saldo insuficiente' });
    }
    
    const saldoAnterior = conta.saldo;
    conta.saldo -= valor;
    conta.transacoesHoje += valor;
    
    db.atualizarConta(conta.id, { 
      saldo: conta.saldo,
      transacoesHoje: conta.transacoesHoje
    });
    
    // Registrar transação
    const transacao = {
      contaId: conta.id,
      tipo: 'SAQUE',
      valor,
      descricao,
      saldoAnterior,
      novoSaldo: conta.saldo
    };
    db.salvarTransacao(transacao);
    
    logger.transaction(conta.numeroConta, 'SAQUE', valor, saldoAnterior, conta.saldo);
    
    res.json({
      sucesso: true,
      mensagem: `Saque de ${valor} ${conta.moeda} realizado com sucesso`,
      novoSaldo: conta.saldo,
      moeda: conta.moeda,
      transacaoId: transacao.id
    });
    
  } catch (error) {
    logger.error('Erro ao sacar', error);
    res.status(500).json({ erro: 'Erro ao realizar saque' });
  }
};

// Transferir
const transferir = async (req, res) => {
  try {
    const { contaDestinoNumero, valor, descricao = 'Transferência' } = req.body;
    
    const { error } = validateTransferencia(req.body);
    if (error) {
      return res.status(400).json({ erro: error.details[0].message });
    }
    
    const contaOrigem = db.buscarContaPorId(req.contaId);
    const contaDestino = db.buscarContaPorNumero(contaDestinoNumero);
    
    if (!contaOrigem) {
      return res.status(404).json({ erro: 'Conta de origem não encontrada' });
    }
    
    if (!contaDestino) {
      return res.status(404).json({ erro: 'Conta de destino não encontrada' });
    }
    
    if (!contaOrigem.ativa || !contaDestino.ativa) {
      return res.status(400).json({ erro: 'Uma das contas está inativa' });
    }
    
    // Verificar limite diário
    if (contaOrigem.transacoesHoje + valor > contaOrigem.limiteDiario) {
      return res.status(400).json({ 
        erro: `Limite diário de ${contaOrigem.limiteDiario} ${contaOrigem.moeda} excedido` 
      });
    }
    
    if (contaOrigem.saldo < valor) {
      return res.status(400).json({ erro: 'Saldo insuficiente' });
    }
    
    // Realizar transferência
    const saldoAnteriorOrigem = contaOrigem.saldo;
    contaOrigem.saldo -= valor;
    contaOrigem.transacoesHoje += valor;
    
    const saldoAnteriorDestino = contaDestino.saldo;
    contaDestino.saldo += valor;
    
    db.atualizarConta(contaOrigem.id, { 
      saldo: contaOrigem.saldo,
      transacoesHoje: contaOrigem.transacoesHoje
    });
    db.atualizarConta(contaDestino.id, { saldo: contaDestino.saldo });
    
    // Registrar transações
    const transacaoOrigem = {
      contaId: contaOrigem.id,
      tipo: 'TRANSFERENCIA_ENVIADA',
      valor,
      descricao: `${descricao} para ${contaDestino.numeroConta}`,
      saldoAnterior: saldoAnteriorOrigem,
      novoSaldo: contaOrigem.saldo,
      contaDestinoId: contaDestino.id
    };
    
    const transacaoDestino = {
      contaId: contaDestino.id,
      tipo: 'TRANSFERENCIA_RECEBIDA',
      valor,
      descricao: `${descricao} de ${contaOrigem.numeroConta}`,
      saldoAnterior: saldoAnteriorDestino,
      novoSaldo: contaDestino.saldo,
      contaOrigemId: contaOrigem.id
    };
    
    db.salvarTransacao(transacaoOrigem);
    db.salvarTransacao(transacaoDestino);
    
    logger.transaction(contaOrigem.numeroConta, 'TRANSFERENCIA_ENVIADA', valor, saldoAnteriorOrigem, contaOrigem.saldo);
    logger.transaction(contaDestino.numeroConta, 'TRANSFERENCIA_RECEBIDA', valor, saldoAnteriorDestino, contaDestino.saldo);
    
    res.json({
      sucesso: true,
      mensagem: `Transferência de ${valor} ${contaOrigem.moeda} realizada com sucesso`,
      origem: {
        numeroConta: contaOrigem.numeroConta,
        novoSaldo: contaOrigem.saldo
      },
      destino: {
        numeroConta: contaDestino.numeroConta,
        nome: contaDestino.nome
      },
      descricao
    });
    
  } catch (error) {
    logger.error('Erro ao transferir', error);
    res.status(500).json({ erro: 'Erro ao realizar transferência' });
  }
};

// Ver saldo
const getSaldo = async (req, res) => {
  try {
    const conta = db.buscarContaPorId(req.contaId);
    
    if (!conta) {
      return res.status(404).json({ erro: 'Conta não encontrada' });
    }
    
    res.json({
      numeroConta: conta.numeroConta,
      nome: conta.nome,
      saldo: conta.saldo,
      moeda: conta.moeda,
      limiteDiario: conta.limiteDiario,
      usadoHoje: conta.transacoesHoje,
      disponivelHoje: conta.limiteDiario - conta.transacoesHoje,
      atualizadoEm: new Date()
    });
    
  } catch (error) {
    logger.error('Erro ao buscar saldo', error);
    res.status(500).json({ erro: 'Erro ao buscar saldo' });
  }
};

// Extrato
const getExtrato = async (req, res) => {
  try {
    const { limite = 50, pagina = 1 } = req.query;
    const conta = db.buscarContaPorId(req.contaId);
    
    if (!conta) {
      return res.status(404).json({ erro: 'Conta não encontrada' });
    }
    
    let transacoes = db.buscarTransacoesPorConta(conta.id);
    
    // Ordenar por data decrescente
    transacoes.sort((a, b) => b.data - a.data);
    
    // Paginação
    const start = (pagina - 1) * limite;
    const end = start + parseInt(limite);
    const transacoesPaginadas = transacoes.slice(start, end);
    
    res.json({
      conta: {
        numeroConta: conta.numeroConta,
        nome: conta.nome,
        saldo: conta.saldo,
        moeda: conta.moeda
      },
      transacoes: transacoesPaginadas,
      paginacao: {
        total: transacoes.length,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        totalPaginas: Math.ceil(transacoes.length / limite)
      }
    });
    
  } catch (error) {
    logger.error('Erro ao buscar extrato', error);
    res.status(500).json({ erro: 'Erro ao buscar extrato' });
  }
};

module.exports = {
  registrar,
  login,
  getPerfil,
  depositar,
  sacar,
  transferir,
  getSaldo,
  getExtrato
};
