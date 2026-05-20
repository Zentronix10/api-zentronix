const Joi = require('joi');

// Validar criação de conta
const validateConta = (data) => {
  const schema = Joi.object({
    nome: Joi.string().min(3).max(100).required()
      .messages({
        'string.min': 'Nome deve ter no mínimo 3 caracteres',
        'string.max': 'Nome deve ter no máximo 100 caracteres',
        'any.required': 'Nome é obrigatório'
      }),
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Email inválido',
        'any.required': 'Email é obrigatório'
      }),
    senha: Joi.string().min(6).required()
      .messages({
        'string.min': 'Senha deve ter no mínimo 6 caracteres',
        'any.required': 'Senha é obrigatória'
      }),
    moeda: Joi.string().valid('USD', 'EUR', 'GBP', 'BRL').default('USD'),
    tipo: Joi.string().valid('personal', 'business', 'offshore').default('personal')
  });
  
  return schema.validate(data);
};

// Validar transferência
const validateTransferencia = (data) => {
  const schema = Joi.object({
    contaDestinoNumero: Joi.string().pattern(/^ZEN\d{7}$/).required()
      .messages({
        'string.pattern.base': 'Número de conta inválido. Formato: ZEN seguido de 7 dígitos',
        'any.required': 'Conta destino é obrigatória'
      }),
    valor: Joi.number().positive().min(0.01).required()
      .messages({
        'number.positive': 'Valor deve ser positivo',
        'number.min': 'Valor mínimo é 0.01',
        'any.required': 'Valor é obrigatório'
      }),
    descricao: Joi.string().max(200).optional()
  });
  
  return schema.validate(data);
};

// Validar depósito/saque
const validateTransacao = (data) => {
  const schema = Joi.object({
    valor: Joi.number().positive().min(0.01).required(),
    descricao: Joi.string().max(200).optional()
  });
  
  return schema.validate(data);
};

module.exports = {
  validateConta,
  validateTransferencia,
  validateTransacao
};
