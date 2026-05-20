const fs = require('fs');
const path = require('path');

// Criar diretório de logs se não existir
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

class Logger {
  constructor() {
    this.logFile = path.join(logDir, `zentreonix-${new Date().toISOString().split('T')[0]}.log`);
  }

  // Formatar data
  getTimestamp() {
    return new Date().toISOString();
  }

  // Escrever no arquivo
  writeToFile(message) {
    fs.appendFileSync(this.logFile, message + '\n');
  }

  // Log de informação
  info(mensagem, dados = null) {
    const log = `[INFO] ${this.getTimestamp()} - ${mensagem}`;
    console.log('\x1b[32m%s\x1b[0m', log); // Verde
    this.writeToFile(log);
    
    if (dados) {
      console.log('\x1b[36m%s\x1b[0m', JSON.stringify(dados, null, 2));
      this.writeToFile(JSON.stringify(dados, null, 2));
    }
  }

  // Log de erro
  error(mensagem, erro = null) {
    const log = `[ERROR] ${this.getTimestamp()} - ${mensagem}`;
    console.log('\x1b[31m%s\x1b[0m', log); // Vermelho
    this.writeToFile(log);
    
    if (erro) {
      console.error(erro);
      this.writeToFile(erro.stack || erro.toString());
    }
  }

  // Log de aviso
  warn(mensagem, dados = null) {
    const log = `[WARN] ${this.getTimestamp()} - ${mensagem}`;
    console.log('\x1b[33m%s\x1b[0m', log); // Amarelo
    this.writeToFile(log);
    
    if (dados) {
      console.log(JSON.stringify(dados, null, 2));
      this.writeToFile(JSON.stringify(dados, null, 2));
    }
  }

  // Log de transação
  transaction(contaId, tipo, valor, saldoAnterior, novoSaldo) {
    const log = `[TRANSACTION] ${this.getTimestamp()} - Conta: ${contaId} | Tipo: ${tipo} | Valor: ${valor} | Saldo Anterior: ${saldoAnterior} | Novo Saldo: ${novoSaldo}`;
    console.log('\x1b[35m%s\x1b[0m', log); // Magenta
    this.writeToFile(log);
  }

  // Log de acesso
  access(req, status) {
    const log = `[ACCESS] ${this.getTimestamp()} - ${req.method} ${req.url} - Status: ${status} - IP: ${req.ip}`;
    console.log('\x1b[90m%s\x1b[0m', log); // Cinza
    this.writeToFile(log);
  }
}

module.exports = new Logger();
