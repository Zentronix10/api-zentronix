// internationalLoanController.js - Empréstimos com integração IBAN/SWIFT

const db = require('./database');
const logger = require('./logger');
const { generateIBAN, generateSWIFT, validateIBAN } = require('./ibanGenerator');
const { processSwiftTransfer, getExchangeRate, SWIFT_FEES } = require('./swiftIntegration');

// Configurações de empréstimos internacionais
const INTERNATIONAL_LOAN_CONFIG = {
    USD: {
        name: 'Dólar Americano',
        symbol: '$',
        maxAmount: 900000000000000,
        minAmount: 10000,
        interestRate: 0.015,
        internationalFee: 0.02, // 2% taxa internacional
        minTerm: 12,
        maxTerm: 360
    },
    EUR: {
        name: 'Euro',
        symbol: '€',
        maxAmount: 900000000000000,
        minAmount: 10000,
        interestRate: 0.012,
        internationalFee: 0.02,
        minTerm: 12,
        maxTerm: 360
    },
    GBP: {
        name: 'Libra Esterlina',
        symbol: '£',
        maxAmount: 900000000000000,
        minAmount: 10000,
        interestRate: 0.013,
        internationalFee: 0.02,
        minTerm: 12,
        maxTerm: 360
    }
};

// Solicitar empréstimo internacional
const requestInternationalLoan = async (req, res) => {
    try {
        const {
            amount,
            currency = 'USD',
            termMonths = 12,
            destinationCountry,
            recipientIBAN,
            recipientSwift,
            recipientName
        } = req.body;
        
        const contaId = req.contaId;
        const conta = db.buscarContaPorId(contaId);
        
        if (!conta) {
            return res.status(404).json({ erro: 'Conta não encontrada' });
        }
        
        // Validar configuração
        const config = INTERNATIONAL_LOAN_CONFIG[currency];
        if (!config) {
            return res.status(400).json({ erro: 'Moeda inválida' });
        }
        
        // Validar valor
        if (amount < config.minAmount) {
            return res.status(400).json({ erro: `Valor mínimo: ${config.symbol}${config.minAmount}` });
        }
        
        if (amount > config.maxAmount) {
            return res.status(400).json({ erro: `Valor máximo: ${config.symbol}${config.maxAmount}` });
        }
        
        // Validar IBAN e SWIFT se for transferência internacional
        let ibanValid = true;
        let swiftValid = true;
        
        if (recipientIBAN) {
            ibanValid = validateIBAN(recipientIBAN);
            if (!ibanValid) {
                return res.status(400).json({ erro: 'IBAN inválido' });
            }
        }
        
        if (recipientSwift && recipientSwift.length < 8) {
            swiftValid = false;
            return res.status(400).json({ erro: 'Código SWIFT inválido (mínimo 8 caracteres)' });
        }
        
        // Gerar IBAN e SWIFT para a conta se não tiver
        if (!conta.iban) {
            conta.iban = generateIBAN('GB');
            conta.swift = generateSWIFT('GB');
            db.atualizarConta(contaId, { iban: conta.iban, swift: conta.swift });
        }
        
        // Calcular empréstimo
        const monthlyRate = config.interestRate;
        const totalInterest = amount * monthlyRate * termMonths;
        const internationalFee = amount * config.internationalFee;
        const totalAmount = amount + totalInterest + internationalFee;
        const monthlyPayment = (amount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                               (Math.pow(1 + monthlyRate, termMonths) - 1);
        
        // Criar solicitação
        const newLoan = {
            id: Date.now(),
            type: 'INTERNATIONAL',
            contaId: contaId,
            contaNumero: conta.numeroConta,
            amount: amount,
            currency: currency,
            termMonths: termMonths,
            monthlyPayment: monthlyPayment,
            totalInterest: totalInterest,
            internationalFee: internationalFee,
            totalAmount: totalAmount,
            destinationCountry: destinationCountry,
            recipientIBAN: recipientIBAN,
            recipientSwift: recipientSwift,
            recipientName: recipientName,
            status: 'PENDING',
            createdAt: new Date(),
            paidMonths: 0,
            remainingBalance: totalAmount,
            paymentHistory: []
        };
        
        // Salvar (você precisa criar um array loansInternational)
        if (!global.internationalLoans) global.internationalLoans = [];
        global.internationalLoans.push(newLoan);
        
        res.status(201).json({
            sucesso: true,
            mensagem: 'Solicitação de empréstimo internacional recebida',
            emprestimo: {
                id: newLoan.id,
                valor: `${config.symbol}${amount.toLocaleString()}`,
                moeda: currency,
                prazo: `${termMonths} meses`,
                parcelaMensal: `${config.symbol}${monthlyPayment.toFixed(2)}`,
                taxaInternacional: `${config.internationalFee * 100}%`,
                totalJuros: `${config.symbol}${totalInterest.toFixed(2)}`,
                valorTotal: `${config.symbol}${totalAmount.toFixed(2)}`,
                suaContaIBAN: conta.iban,
                suaContaSWIFT: conta.swift
            }
        });
        
    } catch (error) {
        logger.error('Erro em empréstimo internacional', error);
        res.status(500).json({ erro: 'Erro ao processar solicitação' });
    }
};

// Aprovar e enviar empréstimo via SWIFT
const approveAndSendInternationalLoan = async (req, res) => {
    try {
        const { loanId } = req.params;
        const contaId = req.contaId;
        
        const loan = global.internationalLoans?.find(l => l.id === parseInt(loanId));
        
        if (!loan) {
            return res.status(404).json({ erro: 'Empréstimo não encontrado' });
        }
        
        if (loan.contaId !== contaId) {
            return res.status(403).json({ erro: 'Acesso negado' });
        }
        
        if (loan.status !== 'PENDING') {
            return res.status(400).json({ erro: `Empréstimo já está ${loan.status}` });
        }
        
        // Buscar conta
        const conta = db.buscarContaPorId(contaId);
        
        // Enviar via SWIFT
        const swiftResult = await processSwiftTransfer(
            conta,
            { saldo: 0 }, // Destino temporário
            loan.amount,
            loan.currency,
            loan.recipientSwift,
            loan.recipientIBAN,
            { 
                priority: 'PRIORITY',
                description: `International Loan Disbursement - Loan ID: ${loan.id}`
            }
        );
        
        if (swiftResult.success) {
            loan.status = 'ACTIVE';
            loan.disbursedAt = new Date();
            loan.swiftTransactionId = swiftResult.transaction.transactionId;
            
            res.json({
                sucesso: true,
                mensagem: 'Empréstimo aprovado e enviado via SWIFT!',
                swiftTransaction: {
                    id: swiftResult.transaction.transactionId,
                    valor: `${loan.currency === 'USD' ? '$' : loan.currency === 'EUR' ? '€' : '£'}${loan.amount.toLocaleString()}`,
                    taxaSWIFT: `$${swiftResult.transaction.fee}`,
                    status: swiftResult.transaction.status,
                    prazoEstimado: swiftResult.transaction.processingTime,
                    paraIBAN: loan.recipientIBAN,
                    paraSWIFT: loan.recipientSwift
                }
            });
        } else {
            throw new Error('Falha no envio SWIFT');
        }
        
    } catch (error) {
        logger.error('Erro ao enviar empréstimo internacional', error);
        res.status(500).json({ erro: 'Erro ao processar envio internacional' });
    }
};

// Obter informações bancárias da conta
const getBankAccountInfo = async (req, res) => {
    try {
        const contaId = req.contaId;
        const conta = db.buscarContaPorId(contaId);
        
        if (!conta) {
            return res.status(404).json({ erro: 'Conta não encontrada' });
        }
        
        // Gerar IBAN e SWIFT se não existir
        if (!conta.iban) {
            conta.iban = generateIBAN('GB');
            conta.swift = generateSWIFT('GB');
            db.atualizarConta(contaId, { iban: conta.iban, swift: conta.swift });
        }
        
        res.json({
            banco: 'Zentreonix Bank Offshore',
            endereco: 'Level 39, One Canada Square, London E14 5AB, United Kingdom',
            titular: conta.nome,
            numeroConta: conta.numeroConta,
            iban: conta.iban,
            swift: conta.swift,
            moeda: conta.moeda || 'USD',
            saldo: conta.saldo,
            codigoBanco: 'ZENXGB22',
            tipoConta: conta.tipo || 'Offshore'
        });
        
    } catch (error) {
        logger.error('Erro ao buscar informações bancárias', error);
        res.status(500).json({ erro: 'Erro ao buscar informações' });
    }
};

// Transferência internacional via SWIFT
const internationalTransfer = async (req, res) => {
    try {
        const {
            toIBAN,
            toSwift,
            amount,
            currency = 'USD',
            priority = 'STANDARD',
            description
        } = req.body;
        
        const contaId = req.contaId;
        const conta = db.buscarContaPorId(contaId);
        
        if (!conta) {
            return res.status(404).json({ erro: 'Conta não encontrada' });
        }
        
        // Validar IBAN
        if (!validateIBAN(toIBAN)) {
            return res.status(400).json({ erro: 'IBAN de destino inválido' });
        }
        
        // Validar SWIFT
        if (!toSwift || toSwift.length < 8) {
            return res.status(400).json({ erro: 'Código SWIFT inválido' });
        }
        
        // Validar valor
        if (!amount || amount <= 0) {
            return res.status(400).json({ erro: 'Valor inválido' });
        }
        
        // Verificar se tem saldo (incluindo taxas)
        const fee = SWIFT_FEES[priority]?.fee || SWIFT_FEES.STANDARD.fee;
        const totalNeeded = amount + fee;
        
        if (conta.saldo < totalNeeded) {
            return res.status(400).json({ 
                erro: 'Saldo insuficiente',
                necessario: totalNeeded,
                disponivel: conta.saldo,
                taxaSWIFT: fee
            });
        }
        
        // Processar transferência
        const result = await processSwiftTransfer(
            conta,
            { iban: toIBAN, swift: toSwift },
            amount,
            currency,
            toSwift,
            toIBAN,
            { priority, description }
        );
        
        if (result.success) {
            res.json({
                sucesso: true,
                mensagem: 'Transferência internacional via SWIFT iniciada',
                transacao: {
                    id: result.transaction.transactionId,
                    valor: amount,
                    moeda: currency,
                    taxa: fee,
                    totalDebitado: amount + fee,
                    paraIBAN: toIBAN,
                    paraSWIFT: toSwift,
                    status: result.transaction.status,
                    prazoEstimado: result.transaction.processingTime
                }
            });
        }
        
    } catch (error) {
        logger.error('Erro na transferência internacional', error);
        res.status(500).json({ erro: 'Erro na transferência internacional' });
    }
};

module.exports = {
    requestInternationalLoan,
    approveAndSendInternationalLoan,
    getBankAccountInfo,
    internationalTransfer
};
