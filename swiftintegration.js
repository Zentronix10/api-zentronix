// swiftIntegration.js - Sistema SWIFT para transferências internacionais

const logger = require('./logger');
const { generateSWIFT, validateIBAN } = require('./ibanGenerator');

// Taxas por tipo de transferência SWIFT
const SWIFT_FEES = {
    STANDARD: {
        fee: 25, // Taxa fixa $25
        processingTime: '2-5 dias úteis',
        priority: 'NORMAL'
    },
    EXPRESS: {
        fee: 50,
        processingTime: '1-2 dias úteis',
        priority: 'HIGH'
    },
    PRIORITY: {
        fee: 100,
        processingTime: 'Mesmo dia',
        priority: 'URGENT'
    }
};

// Bancos correspondentes para SWIFT
const CORRESPONDENT_BANKS = {
    'US': { name: 'JPMorgan Chase', swift: 'CHASUS33', location: 'New York' },
    'GB': { name: 'Barclays Bank', swift: 'BARCGB22', location: 'London' },
    'DE': { name: 'Deutsche Bank', swift: 'DEUTDEFF', location: 'Frankfurt' },
    'FR': { name: 'BNP Paribas', swift: 'BNPAFRPP', location: 'Paris' },
    'ES': { name: 'Santander', swift: 'BSCHESMM', location: 'Madrid' },
    'IT': { name: 'Unicredit', swift: 'UNCRITMM', location: 'Milan' },
    'CH': { name: 'UBS', swift: 'UBSWCHZH', location: 'Zurich' },
    'BR': { name: 'Itaú', swift: 'ITAUBRSP', location: 'São Paulo' }
};

// Histórico de transferências SWIFT
let swiftTransactions = [];
let nextSwiftId = 1;

// Processar transferência SWIFT
const processSwiftTransfer = async (fromAccount, toAccount, amount, currency, swiftCode, iban, options = {}) => {
    try {
        const { priority = 'STANDARD', description = '' } = options;
        
        // Validar SWIFT
        if (!swiftCode || swiftCode.length < 8) {
            throw new Error('Código SWIFT inválido');
        }
        
        // Validar IBAN
        if (!validateIBAN(iban)) {
            throw new Error('IBAN inválido');
        }
        
        // Calcular taxas
        const fee = SWIFT_FEES[priority].fee;
        const totalAmount = amount + fee;
        
        // Verificar saldo
        if (fromAccount.saldo < totalAmount) {
            throw new Error('Saldo insuficiente para transferência + taxas');
        }
        
        // Encontrar banco correspondente
        const countryCode = iban.slice(0, 2);
        const correspondentBank = CORRESPONDENT_BANKS[countryCode];
        
        if (!correspondentBank) {
            throw new Error('Banco correspondente não encontrado para este país');
        }
        
        // Registrar transação SWIFT
        const swiftTransaction = {
            id: nextSwiftId++,
            transactionId: `SWIFT${Date.now()}${Math.floor(Math.random() * 1000)}`,
            fromAccount: fromAccount.numeroConta,
            fromName: fromAccount.nome,
            toIBAN: iban,
            toSwift: swiftCode,
            toBank: correspondentBank.name,
            correspondentBank: correspondentBank,
            amount: amount,
            currency: currency,
            fee: fee,
            totalAmount: totalAmount,
            priority: priority,
            status: 'PROCESSING',
            processingTime: SWIFT_FEES[priority].processingTime,
            description: description,
            createdAt: new Date(),
            estimatedCompletion: new Date(Date.now() + (priority === 'PRIORITY' ? 86400000 : 86400000 * 3))
        };
        
        swiftTransactions.push(swiftTransaction);
        
        // Debitar da conta
        fromAccount.saldo -= totalAmount;
        
        logger.info(`Transferência SWIFT iniciada: ${swiftTransaction.transactionId}`, {
            from: fromAccount.numeroConta,
            to: iban,
            amount: amount,
            fee: fee
        });
        
        // Simular processamento (em produção, isso seria assíncrono)
        setTimeout(() => {
            swiftTransaction.status = 'COMPLETED';
            swiftTransaction.completedAt = new Date();
            logger.info(`Transferência SWIFT completada: ${swiftTransaction.transactionId}`);
        }, 5000);
        
        return {
            success: true,
            transaction: swiftTransaction
        };
        
    } catch (error) {
        logger.error('Erro na transferência SWIFT:', error);
        throw error;
    }
};

// Obter status da transferência SWIFT
const getSwiftStatus = (transactionId) => {
    const transaction = swiftTransactions.find(t => t.transactionId === transactionId);
    if (!transaction) return null;
    
    return {
        transactionId: transaction.transactionId,
        status: transaction.status,
        amount: transaction.amount,
        fee: transaction.fee,
        estimatedCompletion: transaction.estimatedCompletion,
        completedAt: transaction.completedAt
    };
};

// Listar transferências SWIFT de uma conta
const getSwiftTransactions = (accountNumber) => {
    return swiftTransactions.filter(t => t.fromAccount === accountNumber);
};

// Calcular cotação para transferência internacional
const getExchangeRate = (fromCurrency, toCurrency) => {
    // Taxas de câmbio simuladas (reais)
    const rates = {
        'USD_EUR': 0.92,
        'USD_GBP': 0.79,
        'EUR_USD': 1.09,
        'EUR_GBP': 0.86,
        'GBP_USD': 1.27,
        'GBP_EUR': 1.16
    };
    
    const pair = `${fromCurrency}_${toCurrency}`;
    const rate = rates[pair] || 1;
    
    // Spread bancário de 1%
    const spread = 0.01;
    const finalRate = rate * (1 - spread);
    
    return finalRate;
};

// Obter informações do banco por SWIFT
const getBankBySwift = (swiftCode) => {
    const swiftPrefix = swiftCode.slice(0, 8);
    for (const [country, bank] of Object.entries(CORRESPONDENT_BANKS)) {
        if (bank.swift === swiftPrefix) {
            return {
                bank: bank.name,
                country: country,
                swift: bank.swift,
                location: bank.location
            };
        }
    }
    return null;
};

module.exports = {
    processSwiftTransfer,
    getSwiftStatus,
    getSwiftTransactions,
    getExchangeRate,
    getBankBySwift,
    SWIFT_FEES
};
