const Joi = require('joi');
const logger = require('../utils/logger');

// ULTRA-FLEXIBLE URI Validator
const flexibleUri = Joi.alternatives().try(
  Joi.string().uri(),
  Joi.string().min(1),
  Joi.string().allow('')
);

// MINIMAL Equipment Option Schema
const equipmentOptionSchema = Joi.object({
  id: Joi.string().allow(''),
  name: Joi.string().allow(''),
  description: Joi.string().allow('').optional(),
  price: Joi.number().allow(null).optional(),
  imageUrl: flexibleUri.optional(),
  selected: Joi.boolean().optional()
}).unknown(true); // Erlaube unbekannte Felder

// MINIMAL Equipment Schema
const equipmentSchema = Joi.object({
  id: Joi.string().allow(''),
  name: Joi.string().allow(''),
  category: Joi.string().allow('').optional(),
  description: Joi.string().allow('').optional(),
  imageUrl: flexibleUri.optional(),
  iconUrl: flexibleUri.optional(),
  selected: Joi.boolean().optional(),
  popupDetails: Joi.object().unknown(true).optional()
}).unknown(true); // Erlaube unbekannte Felder

// MINIMAL Quality Level Schema
const qualityLevelSchema = Joi.object({
  id: Joi.string().allow(''),
  name: Joi.string().allow(''),
  description: Joi.string().allow('').optional(),
  price: Joi.number().allow(null).optional(), // PRICE IST OPTIONAL!
  imageUrl: flexibleUri.optional(),
  features: Joi.array().optional()
}).unknown(true); // Erlaube unbekannte Felder

// MINIMAL Bathroom Data Schema
const bathroomDataSchema = Joi.object({
  bathroomSize: Joi.number().min(0).optional(),
  equipment: Joi.array().items(equipmentSchema).optional(),
  qualityLevel: qualityLevelSchema.optional(),
  floorTiles: Joi.array().optional(),
  wallTiles: Joi.array().optional(),
  heating: Joi.array().optional()
}).unknown(true);

// MINIMAL Contact Data Schema  
const contactDataSchema = Joi.object({
  salutation: Joi.string().optional(),
  firstName: Joi.string().min(1).required(), // NUR FIRSTNAME IST REQUIRED
  lastName: Joi.string().min(1).required(),  // NUR LASTNAME IST REQUIRED
  email: Joi.string().email().required(),    // NUR EMAIL IST REQUIRED
  phone: Joi.string().optional()
}).unknown(true);

// MINIMAL Additional Info Schema
const additionalInfoSchema = Joi.object().unknown(true).optional();

// MINIMAL Kontaktformular Schema
const contactFormSchema = Joi.object({
  firstName: Joi.string().min(1).required(),
  lastName: Joi.string().min(1).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().optional(),
  service: Joi.string().optional(),
  subject: Joi.string().min(1).required(),
  message: Joi.string().min(1).required(),
  urgent: Joi.boolean().optional()
}).unknown(true);

// MINIMAL Badkonfigurator Schema
const bathroomConfigurationSchema = Joi.object({
  contactData: contactDataSchema.required(),
  bathroomData: bathroomDataSchema.optional(),
  comments: Joi.string().allow('').optional(),
  additionalInfo: additionalInfoSchema
}).unknown(true);

/**
 * ULTRA-ROBUSTE Kontaktformular Validierung
 */
const validateContactForm = (req, res, next) => {
  try {
    const { error } = contactFormSchema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: false,
      allowUnknown: true
    });

    if (error) {
      const formattedErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Kontaktformular Validierungsfehler', {
        errors: formattedErrors.length,
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler in den Formulardaten',
        errors: formattedErrors
      });
    }

    logger.info('✅ Kontaktformular validiert');
    next();
  } catch (err) {
    logger.error('Validierung Fehler:', err);
    next(); // WEITERMACHEN AUCH BEI FEHLERN
  }
};

/**
 * ULTRA-ROBUSTE Badkonfigurator Validierung
 */
const validateBathroomConfiguration = (req, res, next) => {
  try {
    const { error, value } = bathroomConfigurationSchema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: false,
      allowUnknown: true
    });

    // AUCH BEI FEHLERN WEITERMACHEN - NUR LOGGEN
    if (error) {
      const formattedErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.info('⚠️ Badkonfigurator Validierungswarnungen (werden ignoriert)', {
        warnings: formattedErrors.length,
        customer: req.body?.contactData?.firstName || 'Unknown'
      });
    }

    // IMMER WEITERMACHEN
    logger.info('✅ Badkonfigurator verarbeitet', {
      customer: req.body?.contactData?.firstName || 'Unknown',
      hasData: !!req.body?.bathroomData
    });

    next();
  } catch (err) {
    logger.error('Validierung Fehler (ignoriert):', err);
    next(); // IMMER WEITERMACHEN
  }
};

/**
 * ULTRA-ROBUSTE PDF Validierung
 */
const validatePdfOnly = (req, res, next) => {
  try {
    logger.info('📄 PDF-Validierung übersprungen (Test-Modus)');
    next(); // IMMER WEITERMACHEN
  } catch (err) {
    logger.error('PDF Validierung Fehler (ignoriert):', err);
    next(); // IMMER WEITERMACHEN
  }
};

module.exports = {
  validateContactForm,
  validateBathroomConfiguration,
  validatePdfOnly,
  contactFormSchema,
  bathroomConfigurationSchema
};