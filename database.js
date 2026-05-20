// Configuração do banco de dados (em memória para testes)
// Em produção, aqui seria MongoDB, PostgreSQL, etc.

class Database {
  constructor() {
    this.contas = [];
    this.transacoes = [];
    this.nextId = 1;
    this.nextTransacaoId = 1;
  }

  // Contas
  salvarConta(conta) {
    const novaConta = {
      id: this.nextId++,
      ...conta,
      criadaEm: new Date(),
      atualizadaEm: new Date(),
      ativa: true,
      transacoes: []
    };
    this.contas.push(novaConta);
    return novaConta;
  }

  buscarContaPorId(id) {
    return this.contas.find(c => c.id === id);
  }

  buscarContaPorEmail(email) {
    return this.contas.find(c => c.email === email);
  }

  buscarContaPorNumero(numeroConta) {
    return this.contas.find(c => c.numeroConta === numeroConta);
  }

  atualizarConta(id, dados) {
    const index = this.contas.findIndex(c => c.id === id);
    if (index !== -1) {
      this.contas[index] = { ...this.contas[index], ...dados, atualizadaEm: new Date() };
      return this.contas[index];
    }
    return null;
  }

  deletarConta(id) {
    const index = this.contas.findIndex(c => c.id === id);
    if (index !== -1) {
      this.contas.splice(index, 1);
      return true;
    }
    return false;
  }

  listarTodasContas() {
    return this.contas;
  }

  // Transações
  salvarTransacao(transacao) {
    const novaTransacao = {
      id: this.nextTransacaoId++,
      ...transacao,
      data: new Date()
    };
    this.transacoes.push(novaTransacao);
    
    // Adicionar à conta
    const conta = this.buscarContaPorId(transacao.contaId);
    if (conta) {
      conta.transacoes.push(novaTransacao.id);
    }
    
    return novaTransacao;
  }

  buscarTransacoesPorConta(contaId) {
    return this.transacoes.filter(t => t.contaId === contaId);
  }

  // Estatísticas
  getEstatisticas() {
    const totalContas = this.contas.length;
    const totalSaldo = this.contas.reduce((sum, conta) => sum + conta.saldo, 0);
    const totalTransacoes = this.transacoes.length;
    
    return {
      totalContas,
      totalSaldo,
      totalTransacoes,
      mediaSaldo: totalContas > 0 ? totalSaldo / totalContas : 0
    };
  }

  // Reset (apenas para desenvolvimento)
  reset() {
    this.contas = [];
    this.transacoes = [];
    this.nextId = 1;
    this.nextTransacaoId = 1;
  }
}

// Singleton
const db = new Database();
module.exports = db;
