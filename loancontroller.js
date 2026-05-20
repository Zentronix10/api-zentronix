// loanController.js - Sistema de Empréstimos Zentreonix Bank
// Valores: USD 900T | EUR 900T | GBP 900T

const db = require('./database');
const logger = require('./logger');

// ============ CONFIGURAÇÕES DOS EMPRÉSTIMOS ============
const LOAN_CONFIG = {
    USD: {
        name: 'Dólar Americano',
        symbol: '$',
        maxAmount: 900000000000000, // 900 TRILHÕES de Dólares
        minAmount: 1000,
        interestRate: 0.015, // 1.5% ao mês
        annualRate: 0.18,    // 18% ao ano
        minTerm: 6,
        maxTerm: 360,
        earlyPaymentDiscount: 0.02,
        lateFee: 0.05,
        insuranceFee: 0.001,
        openingFee: 0.01,
        currency: 'USD'
    },
    EUR: {
        name: 'Euro',
        symbol: '€',
        maxAmount: 900000000000000, // 900 TRILHÕES de Euros
        minAmount: 1000,
        interestRate: 0.012, // 1.2% ao mês
        annualRate: 0.144,   // 14.4% ao ano
        minTerm: 6,
        maxTerm: 360,
        earlyPaymentDiscount: 0.02,
        lateFee: 0.05,
        insuranceFee: 0.001,
        openingFee: 0.01,
        currency: 'EUR'
    },
    GBP: {
        name: 'Libra Esterlina',
        symbol: '£',
        maxAmount: 900000000000000, // 900 TRILHÕES de Libras
        minAmount: 1000,
        interestRate: 0.013, // 1.3% ao mês
        annualRate: 0.156,   // 15.6% ao ano
        minTerm: 6,
        maxTerm: 360,
        earlyPaymentDiscount: 0.02,
        lateFee: 0.05,
        insuranceFee: 0.001,
        openingFee: 0.01,
        currency: 'GBP'
    }
};

// Banco de dados de empréstimos
let loans = [];
let nextLoanId = 1;

// ============ FUNÇÕES DE CÁLCULO BANCÁRIO REAL ============

// Calcular CET (Custo Efetivo Total)
const calculateCET = (amount, rate, months, openingFee, insuranceFee) => {
    const totalInterest = amount * rate * months;
    const totalOpeningFee = amount * openingFee;
    const totalInsurance = amount * insuranceFee * months;
    const cet = (totalInterest + totalOpeningFee + totalInsurance) / amount * 100;
    return cet;
};

// Calcular parcela pelo Sistema Price
const calculateMonthlyPayment = (amount, monthlyRate, months) => {
    if (monthlyRate === 0) return amount / months;
    const payment = amount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    return payment;
};

// Gerar tabela de amortização
const generateAmortizationTable = (amount, monthlyRate, months) => {
    const monthlyPayment = calculateMonthlyPayment(amount, monthlyRate, months);
    let balance = amount;
    let table = [];
    let totalInterest = 0;
    
    for (let i = 1; i <= months; i++) {
        const interest = balance * monthlyRate;
        const principal = monthlyPayment - interest;
        balance -= principal;
        
        totalInterest += interest;
        
        table.push({
            month: i,
            payment: monthlyPayment,
            interest: interest,
            principal: principal,
            balance: Math.max(0, balance)
        });
    }
    
    return {
        table,
        totalPayment: monthlyPayment * months,
        totalInterest: totalInterest,
        monthlyPayment: monthlyPayment
    };
};

// Calcular juros de atraso
const calculateLateFee = (paymentAmount, daysLate, lateFeeRate) => {
    const lateFee = paymentAmount * lateFeeRate;
    const dailyInterest = paymentAmount * 0.00033;
    const dailyLateFee = dailyInterest * daysLate;
    return {
        lateFee: lateFee,
        dailyFee: dailyLateFee,
        total: lateFee + dailyLateFee
    };
};

// ============ FUNÇÕES PRINCIPAIS ============

// Solicitar empréstimo
const requestLoan = async (req, res) => {
    try {
        const { 
            amount, 
            currency = 'USD', 
            termMonths = 12,
            purpose = 'Investimento'
        } = req.body;
        
        const contaId = req.contaId;
        
        // Validar conta
        const conta = db.buscarContaPorId(contaId);
        if (!conta) {
            return res.status(404).json({ erro: 'Conta não encontrada' });
        }
        
        // Validar moeda
        if (!LOAN_CONFIG[currency]) {
            return res.status(400).json({ 
                erro: 'Moeda inválida', 
                moedas: ['USD', 'EUR', 'GBP']
            });
        }
        
        const config = LOAN_CONFIG[currency];
        
        // Validar valor
        if (!amount || amount <= 0) {
            return res.status(400).json({ erro: 'Valor do empréstimo inválido' });
        }
        
        if (amount < config.minAmount) {
            return res.status(400).json({ 
                erro: `Valor mínimo para ${currency} é ${config.symbol}${config.minAmount.toLocaleString()}`
            });
        }
        
        if (amount > config.maxAmount) {
            return res.status(400).json({ 
                erro: `Valor máximo para ${currency} é ${config.symbol}${config.maxAmount.toLocaleString()}`
            });
        }
        
        // Validar prazo
        if (termMonths < config.minTerm || termMonths > config.maxTerm) {
            return res.status(400).json({ 
                erro: `Prazo deve ser entre ${config.minTerm} e ${config.maxTerm} meses`
            });
        }
        
        // Calcular valores
        const monthlyRate = config.interestRate;
        const amortization = generateAmortizationTable(amount, monthlyRate, termMonths);
        const totalInterest = amortization.totalInterest;
        const monthlyPayment = amortization.monthlyPayment;
        const totalAmount = amount + totalInterest;
        const openingFeeValue = amount * config.openingFee;
        const insuranceTotal = amount * config.insuranceFee * termMonths;
        const cet = calculateCET(amount, config.interestRate, termMonths, config.openingFee, config.insuranceFee);
        
        // Criar empréstimo
        const newLoan = {
            id: nextLoanId++,
            contaId: contaId,
            contaNumero: conta.numeroConta,
            nomeCliente: conta.nome,
            amount: amount,
            currency: currency,
            termMonths: termMonths,
            interestRate: config.interestRate,
            monthlyPayment: monthlyPayment,
            totalInterest: totalInterest,
            totalAmount: totalAmount,
            openingFee: openingFeeValue,
            insuranceFee: insuranceTotal,
            cet: cet,
            purpose: purpose,
            status: 'PENDING',
            requestedAt: new Date(),
            approvedAt: null,
            nextPaymentDate: null,
            paidMonths: 0,
            remainingBalance: totalAmount,
            paidAmount: 0,
            latePayments: 0,
            paymentHistory: []
        };
        
        loans.push(newLoan);
        
        logger.info(`Empréstimo solicitado: ${currency} ${amount.toLocaleString()}`, {
            conta: conta.numeroConta,
            valor: amount,
            moeda: currency
        });
        
        res.status(201).json({
            sucesso: true,
            mensagem: `Solicitação de empréstimo de ${config.symbol}${amount.toLocaleString()} ${currency} recebida`,
            emprestimo: {
                id: newLoan.id,
                valorSolicitado: newLoan.amount,
                moeda: newLoan.currency,
                prazoMeses: newLoan.termMonths,
                taxaJurosMensal: `${(newLoan.interestRate * 100).toFixed(2)}%`,
                valorParcela: newLoan.monthlyPayment,
                totalJuros: newLoan.totalInterest,
                valorTotal: newLoan.totalAmount,
                taxaAbertura: newLoan.openingFee,
                seguro: newLoan.insuranceFee,
                cet: `${newLoan.cet.toFixed(2)}%`,
                status: newLoan.status,
                solicitadoEm: newLoan.requestedAt
            }
        });
        
    } catch (error) {
        logger.error('Erro ao solicitar empréstimo', error);
        res.status(500).json({ erro: 'Erro ao processar solicitação' });
    }
};

// Aprovar empréstimo
const approveLoan = async (req, res) => {
    try {
        const { loanId } = req.params;
        const contaId = req.contaId;
        
        const loan = loans.find(l => l.id === parseInt(loanId));
        
        if (!loan) {
            return res.status(404).json({ erro: 'Empréstimo não encontrado' });
        }
        
        if (loan.contaId !== contaId) {
            return res.status(403).json({ erro: 'Este empréstimo não pertence à sua conta' });
        }
        
        if (loan.status !== 'PENDING') {
            return res.status(400).json({ erro: `Empréstimo já está ${loan.status}` });
        }
        
        // Aprovar
        loan.status = 'ACTIVE';
        loan.approvedAt = new Date();
        loan.nextPaymentDate = new Date();
        loan.nextPaymentDate.setMonth(loan.nextPaymentDate.getMonth() + 1);
        
        // Valor líquido
        const netAmount = loan.amount - loan.openingFee;
        
        // Creditar na conta
        const conta = db.buscarContaPorId(contaId);
        const saldoAnterior = conta.saldo;
        conta.saldo += netAmount;
        db.atualizarConta(contaId, { saldo: conta.saldo });
        
        // Registrar transação
        const transacao = {
            contaId: contaId,
            tipo: 'EMPRESTIMO_APROVADO',
            valor: netAmount,
            descricao: `Empréstimo de ${loan.currency} ${loan.amount.toLocaleString()} aprovado`,
            saldoAnterior: saldoAnterior,
            novoSaldo: conta.saldo,
            loanId: loan.id
        };
        
        if (db.salvarTransacao) {
            db.salvarTransacao(transacao);
        }
        
        const config = LOAN_CONFIG[loan.currency];
        
        res.json({
            sucesso: true,
            mensagem: `✅ EMPRÉSTIMO APROVADO!`,
            detalhes: {
                valorBruto: `${config.symbol}${loan.amount.toLocaleString()}`,
                taxaAbertura: `${config.symbol}${loan.openingFee.toLocaleString()}`,
                valorLiquido: `${config.symbol}${netAmount.toLocaleString()}`,
                valorParcela: `${config.symbol}${loan.monthlyPayment.toFixed(2)}`,
                primeiraParcela: new Date(loan.nextPaymentDate).toLocaleDateString('pt-BR'),
                totalParcelas: loan.termMonths,
                novoSaldo: conta.saldo
            }
        });
        
    } catch (error) {
        logger.error('Erro ao aprovar empréstimo', error);
        res.status(500).json({ erro: 'Erro ao aprovar empréstimo' });
    }
};

// Pagar parcela
const payInstallment = async (req, res) => {
    try {
        const { loanId } = req.params;
        const contaId = req.contaId;
        
        const loan = loans.find(l => l.id === parseInt(loanId));
        
        if (!loan) {
            return res.status(404).json({ erro: 'Empréstimo não encontrado' });
        }
        
        if (loan.contaId !== contaId) {
            return res.status(403).json({ erro: 'Este empréstimo não pertence à sua conta' });
        }
        
        if (loan.status !== 'ACTIVE') {
            return res.status(400).json({ erro: `Empréstimo está ${loan.status}` });
        }
        
        const conta = db.buscarContaPorId(contaId);
        let paymentAmount = loan.monthlyPayment;
        let lateFee = 0;
        
        // Verificar atraso
        const today = new Date();
        const dueDate = new Date(loan.nextPaymentDate);
        
        if (today > dueDate) {
            const daysLate = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
            const config = LOAN_CONFIG[loan.currency];
            const lateCalculation = calculateLateFee(loan.monthlyPayment, daysLate, config.lateFee);
            lateFee = lateCalculation.total;
            paymentAmount += lateFee;
            loan.latePayments++;
        }
        
        if (conta.saldo < paymentAmount) {
            return res.status(400).json({ 
                erro: 'Saldo insuficiente',
                parcela: loan.monthlyPayment,
                multa: lateFee,
                totalDevido: paymentAmount,
                saldoAtual: conta.saldo
            });
        }
        
        // Processar pagamento
        const saldoAnterior = conta.saldo;
        conta.saldo -= paymentAmount;
        loan.paidMonths++;
        loan.paidAmount += paymentAmount;
        loan.remainingBalance -= loan.monthlyPayment;
        
        // Atualizar próxima parcela
        loan.nextPaymentDate.setMonth(loan.nextPaymentDate.getMonth() + 1);
        
        // Registrar pagamento
        loan.paymentHistory.push({
            id: nextPaymentId++,
            date: new Date(),
            amount: paymentAmount,
            lateFee: lateFee,
            month: loan.paidMonths,
            remainingBalance: loan.remainingBalance
        });
        
        // Verificar se quitou
        if (loan.paidMonths >= loan.termMonths || loan.remainingBalance <= 0) {
            loan.status = 'PAID';
            loan.completedAt = new Date();
        }
        
        db.atualizarConta(contaId, { saldo: conta.saldo });
        
        // Registrar transação
        const transacao = {
            contaId: contaId,
            tipo: 'PAGAMENTO_EMPRESTIMO',
            valor: paymentAmount,
            descricao: `Pagamento parcela ${loan.paidMonths}/${loan.termMonths}`,
            saldoAnterior: saldoAnterior,
            novoSaldo: conta.saldo,
            loanId: loan.id
        };
        
        if (db.salvarTransacao) {
            db.salvarTransacao(transacao);
        }
        
        const config = LOAN_CONFIG[loan.currency];
        
        res.json({
            sucesso: true,
            mensagem: `Parcela ${loan.paidMonths}/${loan.termMonths} paga!`,
            parcela: {
                numero: loan.paidMonths,
                valor: `${config.symbol}${loan.monthlyPayment.toFixed(2)}`,
                multa: `${config.symbol}${lateFee.toFixed(2)}`,
                totalPago: `${config.symbol}${paymentAmount.toFixed(2)}`,
                parcelasRestantes: loan.termMonths - loan.paidMonths,
                saldoDevedor: `${config.symbol}${loan.remainingBalance.toFixed(2)}`,
                status: loan.status,
                novoSaldo: conta.saldo
            }
        });
        
    } catch (error) {
        logger.error('Erro ao pagar parcela', error);
        res.status(500).json({ erro: 'Erro ao processar pagamento' });
    }
};

// Ver meus empréstimos
const getMyLoans = async (req, res) => {
    try {
        const contaId = req.contaId;
        const myLoans = loans.filter(l => l.contaId === contaId);
        
        if (myLoans.length === 0) {
            return res.json({
                mensagem: 'Você não possui empréstimos',
                emprestimos: []
            });
        }
        
        const formattedLoans = myLoans.map(loan => {
            const config = LOAN_CONFIG[loan.currency];
            return {
                id: loan.id,
                valor: `${config.symbol}${loan.amount.toLocaleString()}`,
                moeda: loan.currency,
                prazoMeses: loan.termMonths,
                parcelasPagas: loan.paidMonths,
                parcelasRestantes: loan.termMonths - loan.paidMonths,
                parcelaMensal: `${config.symbol}${loan.monthlyPayment.toFixed(2)}`,
                saldoDevedor: `${config.symbol}${loan.remainingBalance.toFixed(2)}`,
                status: loan.status,
                solicitadoEm: loan.requestedAt,
                proximoPagamento: loan.nextPaymentDate
            };
        });
        
        res.json({
            total: myLoans.length,
            emprestimos: formattedLoans
        });
        
    } catch (error) {
        logger.error('Erro ao buscar empréstimos', error);
        res.status(500).json({ erro: 'Erro ao buscar empréstimos' });
    }
};

// Solicitar valor máximo
const requestMaxLoan = async (req, res) => {
    try {
        const { currency = 'USD' } = req.body;
        const contaId = req.contaId;
        
        if (!LOAN_CONFIG[currency]) {
            return res.status(400).json({ erro: 'Moeda inválida' });
        }
        
        const config = LOAN_CONFIG[currency];
        const maxAmount = config.maxAmount;
        
        req.body = {
            amount: maxAmount,
            currency: currency,
            termMonths: 360,
            purpose: `EMPRÉSTIMO MÁXIMO - ${config.symbol}${maxAmount.toLocaleString()}`
        };
        
        await requestLoan(req, res);
        
    } catch (error) {
        logger.error('Erro ao solicitar empréstimo máximo', error);
        res.status(500).json({ erro: 'Erro ao processar solicitação' });
    }
};

// Estatísticas (Admin)
const getLoanStats = async (req, res) => {
    try {
        const totalLoans = loans.length;
        const activeLoans = loans.filter(l => l.status === 'ACTIVE').length;
        const pendingLoans = loans.filter(l => l.status === 'PENDING').length;
        const paidLoans = loans.filter(l => l.status === 'PAID').length;
        
        const totalAmount = loans.reduce((sum, loan) => sum + loan.amount, 0);
        const totalOutstanding = loans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
        
        const byCurrency = {
            USD: {
                total: loans.filter(l => l.currency === 'USD').length,
                amount: loans.filter(l => l.currency === 'USD').reduce((sum, l) => sum + l.amount, 0)
            },
            EUR: {
                total: loans.filter(l => l.currency === 'EUR').length,
                amount: loans.filter(l => l.currency === 'EUR').reduce((sum, l) => sum + l.amount, 0)
            },
            GBP: {
                total: loans.filter(l => l.currency === 'GBP').length,
                amount: loans.filter(l => l.currency === 'GBP').reduce((sum, l) => sum + l.amount, 0)
            }
        };
        
        res.json({
            total: {
                emprestimos: totalLoans,
                ativos: activeLoans,
                pendentes: pendingLoans,
                quitados: paidLoans,
                valorTotal: totalAmount,
                valorDevido: totalOutstanding
            },
            porMoeda: byCurrency,
            configuracoes: LOAN_CONFIG
        });
        
    } catch (error) {
        logger.error('Erro ao buscar estatísticas', error);
        res.status(500).json({ erro: 'Erro ao buscar estatísticas' });
    }
};

// Extrato do empréstimo
const getLoanStatement = async (req, res) => {
    try {
        const { loanId } = req.params;
        const contaId = req.contaId;
        
        const loan = loans.find(l => l.id === parseInt(loanId));
        
        if (!loan) {
            return res.status(404).json({ erro: 'Empréstimo não encontrado' });
        }
        
        if (loan.contaId !== contaId) {
            return res.status(403).json({ erro: 'Acesso negado' });
        }
        
        const config = LOAN_CONFIG[loan.currency];
        
        res.json({
            emprestimo: {
                id: loan.id,
                valor: `${config.symbol}${loan.amount.toLocaleString()}`,
                moeda: loan.currency,
                prazo: `${loan.termMonths} meses`,
                taxa: `${(loan.interestRate * 100).toFixed(2)}%`,
                parcela: `${config.symbol}${loan.monthlyPayment.toFixed(2)}`,
                totalPago: `${config.symbol}${loan.paidAmount.toFixed(2)}`,
                saldoDevedor: `${config.symbol}${loan.remainingBalance.toFixed(2)}`,
                status: loan.status
            },
            pagamentos: loan.paymentHistory.map(p => ({
                data: p.date,
                parcela: p.month,
                valor: `${config.symbol}${p.amount.toFixed(2)}`,
                multa: `${config.symbol}${p.lateFee.toFixed(2)}`,
                saldoRestante: `${config.symbol}${p.remainingBalance.toFixed(2)}`
            }))
        });
        
    } catch (error) {
        logger.error('Erro ao buscar extrato', error);
        res.status(500).json({ erro: 'Erro ao buscar extrato' });
    }
};

module.exports = {
    requestLoan,
    approveLoan,
    payInstallment,
    getMyLoans,
    requestMaxLoan,
    getLoanStats,
    getLoanStatement
};
