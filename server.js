const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Carregar variáveis de ambiente
dotenv.config();

// Criar aplicação Express
const app = express();

// Configurar porta
const PORT = process.env.PORT || 3000;

// Middlewares básicos
app.use(helmet()); // Segurança headers HTTP
app.use(cors()); // Permitir requisições de outros domínios
app.use(express.json()); // Parsear JSON do body
app.use(express.urlencoded({ extended: true })); // Parsear formulários URL-encoded

// Limitar requisições (evitar ataques de força bruta)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requisições por IP
  message: 'Muitas requisições deste IP, tente novamente mais tarde.'
});
app.use('/api/', limiter);

// Banco de dados em memória para testes (enquanto não temos MongoDB)
let contas = [];
let nextId = 1;

// =========== FUNCIONALIDADES REAIS ===========

// 1. Rota de boas vindas
app.get('/', (req, res) => {
  res.json({
    nome: 'Zentreonix Bank API',
    versao: '1.0.0',
    status: 'Online 🟢',
    endpoints: [
      'POST /api/registrar - Criar nova conta',
      'POST /api/login - Fazer login',
      'GET /api/conta/:id - Ver dados da conta',
      'POST /api/depositar - Depositar dinheiro',
      'POST /api/sacar - Sacar dinheiro',
      'POST /api/transferir - Transferir entre contas',
      'GET /api/saldo/:id - Ver saldo',
      'DELETE /api/conta/:id - Fechar conta'
    ]
  });
});

// 2. Registrar nova conta
app.post('/api/registrar', (req, res) => {
  const { nome, email, senha, moeda = 'USD' } = req.body;
  
  // Validar dados
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
  }
  
  // Verificar se email já existe
  const emailExiste = contas.find(conta => conta.email === email);
  if (emailExiste) {
    return res.status(400).json({ erro: 'Email já cadastrado' });
  }
  
  // Gerar número da conta (ex: ZEN001)
  const numeroConta = `ZEN${String(nextId).padStart(4, '0')}`;
  
  // Criar nova conta
  const novaConta = {
    id: nextId++,
    numeroConta: numeroConta,
    nome: nome,
    email: email,
    senha: senha, // Em produção, isso deve ser criptografado!
    saldo: 0,
    moeda: moeda,
    criadaEm: new Date(),
    ativa: true
  };
  
  contas.push(novaConta);
  
  // Remover senha da resposta
  const { senha: _, ...contaSemSenha } = novaConta;
  
  res.status(201).json({
    sucesso: true,
    mensagem: 'Conta criada com sucesso!',
    conta: contaSemSenha
  });
});

// 3. Login
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  
  if (!email || !senha) {
    return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
  }
  
  // Buscar conta
  const conta = contas.find(c => c.email === email && c.senha === senha);
  
  if (!conta) {
    return res.status(401).json({ erro: 'Email ou senha inválidos' });
  }
  
  if (!conta.ativa) {
    return res.status(401).json({ erro: 'Conta desativada' });
  }
  
  // Gerar token simples (em produção use JWT)
  const token = `token_simples_${conta.id}_${Date.now()}`;
  
  res.json({
    sucesso: true,
    mensagem: 'Login realizado com sucesso',
    token: token,
    contaId: conta.id,
    numeroConta: conta.numeroConta,
    nome: conta.nome
  });
});

// 4. Ver dados da conta
app.get('/api/conta/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const conta = contas.find(c => c.id === id);
  
  if (!conta) {
    return res.status(404).json({ erro: 'Conta não encontrada' });
  }
  
  // Remover senha antes de enviar
  const { senha, ...contaSemSenha } = conta;
  
  res.json(contaSemSenha);
});

// 5. Depositar dinheiro
app.post('/api/depositar', (req, res) => {
  const { contaId, valor } = req.body;
  
  if (!contaId || !valor || valor <= 0) {
    return res.status(400).json({ erro: 'ID da conta e valor positivo são obrigatórios' });
  }
  
  const conta = contas.find(c => c.id === contaId);
  
  if (!conta) {
    return res.status(404).json({ erro: 'Conta não encontrada' });
  }
  
  if (!conta.ativa) {
    return res.status(400).json({ erro: 'Conta inativa' });
  }
  
  // Realizar depósito
  conta.saldo += valor;
  
  res.json({
    sucesso: true,
    mensagem: `Depósito de ${valor} ${conta.moeda} realizado com sucesso`,
    novoSaldo: conta.saldo,
    moeda: conta.moeda,
    data: new Date()
  });
});

// 6. Sacar dinheiro
app.post('/api/sacar', (req, res) => {
  const { contaId, valor } = req.body;
  
  if (!contaId || !valor || valor <= 0) {
    return res.status(400).json({ erro: 'ID da conta e valor positivo são obrigatórios' });
  }
  
  const conta = contas.find(c => c.id === contaId);
  
  if (!conta) {
    return res.status(404).json({ erro: 'Conta não encontrada' });
  }
  
  if (!conta.ativa) {
    return res.status(400).json({ erro: 'Conta inativa' });
  }
  
  if (conta.saldo < valor) {
    return res.status(400).json({ erro: 'Saldo insuficiente' });
  }
  
  // Realizar saque
  conta.saldo -= valor;
  
  res.json({
    sucesso: true,
    mensagem: `Saque de ${valor} ${conta.moeda} realizado com sucesso`,
    novoSaldo: conta.saldo,
    moeda: conta.moeda,
    data: new Date()
  });
});

// 7. Transferir entre contas
app.post('/api/transferir', (req, res) => {
  const { contaOrigemId, contaDestinoNumero, valor } = req.body;
  
  if (!contaOrigemId || !contaDestinoNumero || !valor || valor <= 0) {
    return res.status(400).json({ 
      erro: 'ID da conta origem, número da conta destino e valor são obrigatórios' 
    });
  }
  
  // Buscar contas
  const contaOrigem = contas.find(c => c.id === contaOrigemId);
  const contaDestino = contas.find(c => c.numeroConta === contaDestinoNumero);
  
  if (!contaOrigem) {
    return res.status(404).json({ erro: 'Conta de origem não encontrada' });
  }
  
  if (!contaDestino) {
    return res.status(404).json({ erro: 'Conta de destino não encontrada' });
  }
  
  if (!contaOrigem.ativa || !contaDestino.ativa) {
    return res.status(400).json({ erro: 'Uma das contas está inativa' });
  }
  
  if (contaOrigem.saldo < valor) {
    return res.status(400).json({ erro: 'Saldo insuficiente na conta de origem' });
  }
  
  // Realizar transferência
  contaOrigem.saldo -= valor;
  contaDestino.saldo += valor;
  
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
    data: new Date()
  });
});

// 8. Ver saldo
app.get('/api/saldo/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const conta = contas.find(c => c.id === id);
  
  if (!conta) {
    return res.status(404).json({ erro: 'Conta não encontrada' });
  }
  
  res.json({
    numeroConta: conta.numeroConta,
    nome: conta.nome,
    saldo: conta.saldo,
    moeda: conta.moeda,
    atualizadoEm: new Date()
  });
});

// 9. Fechar conta (deletar)
app.delete('/api/conta/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = contas.findIndex(c => c.id === id);
  
  if (index === -1) {
    return res.status(404).json({ erro: 'Conta não encontrada' });
  }
  
  const conta = contas[index];
  
  if (conta.saldo > 0) {
    return res.status(400).json({ 
      erro: 'Não é possível fechar conta com saldo positivo. Primeiro faça um saque total.' 
    });
  }
  
  // Remover conta ou marcar como inativa
  contas.splice(index, 1);
  
  res.json({
    sucesso: true,
    mensagem: `Conta ${conta.numeroConta} fechada com sucesso`
  });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🏦 Zentreonix Bank API - ONLINE`);
  console.log('='.repeat(50));
  console.log(`📡 Servidor rodando em: http://localhost:${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.ENVIRONMENT || 'development'}`);
  console.log('='.repeat(50));
  console.log('\n✅ Endpoints disponíveis:');
  console.log('   POST /api/registrar');
  console.log('   POST /api/login');
  console.log('   GET  /api/conta/:id');
  console.log('   POST /api/depositar');
  console.log('   POST /api/sacar');
  console.log('   POST /api/transferir');
  console.log('   GET  /api/saldo/:id');
  console.log('   DELETE /api/conta/:id');
  console.log('\n💡 Dica: Use o Thunder Client ou Postman para testar');
  console.log('='.repeat(50));
});
