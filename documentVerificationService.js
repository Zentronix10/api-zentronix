// documentVerificationService.js - Complete Document Verification System
// Features: OCR processing, Document validation, Fraud detection, Template matching, AI-powered verification

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class DocumentVerificationService {
    constructor() {
        this.verificationRequests = [];
        this.verifiedDocuments = [];
        this.fraudReports = [];
        this.documentTemplates = this.initializeDocumentTemplates();
        this.supportedDocuments = {
            passport: {
                countries: ['USA', 'BRA', 'GBR', 'DEU', 'FRA', 'ITA', 'ESP', 'PRT', 'CHE', 'JPN', 'CHN', 'IND'],
                requiredFields: ['documentNumber', 'fullName', 'dateOfBirth', 'nationality', 'expiryDate'],
                verificationScore: 0
            },
            driverLicense: {
                countries: ['USA', 'BRA', 'GBR', 'DEU', 'FRA', 'ITA', 'ESP', 'PRT', 'CAN', 'AUS'],
                requiredFields: ['licenseNumber', 'fullName', 'dateOfBirth', 'issueDate', 'expiryDate', 'address'],
                verificationScore: 0
            },
            nationalId: {
                countries: ['BRA', 'IND', 'CHN', 'ZAF', 'MEX', 'ARG', 'TUR', 'SAU'],
                requiredFields: ['idNumber', 'fullName', 'dateOfBirth', 'issueDate', 'expiryDate'],
                verificationScore: 0
            },
            proofOfAddress: {
                acceptedTypes: ['utilityBill', 'bankStatement', 'taxDocument', 'leaseAgreement', 'governmentLetter'],
                requiredFields: ['fullName', 'address', 'issueDate', 'issuerName'],
                maxAgeDays: 90,
                verificationScore: 0
            },
            taxDocument: {
                acceptedTypes: ['w9', 'w8ben', 'taxReturn', 'tinCertificate'],
                requiredFields: ['taxId', 'fullName', 'issueDate', 'issuingAuthority'],
                verificationScore: 0
            },
            incorporationCertificate: {
                requiredFields: ['companyName', 'registrationNumber', 'incorporationDate', 'jurisdiction', 'registeredAddress'],
                verificationScore: 0
            },
            selfie: {
                requiredFields: ['faceDetected', 'livenessScore'],
                minLivenessScore: 0.85,
                verificationScore: 0
            }
        };
    }

    // ============= 1. INITIALIZE DOCUMENT TEMPLATES =============
    initializeDocumentTemplates() {
        return {
            passport_USA: {
                type: 'passport',
                country: 'USA',
                format: 'booklet',
                securityFeatures: ['hologram', 'microprint', 'uv_reactive', 'intaglio_printing'],
                fields: {
                    documentNumber: { pattern: /^[A-Z0-9]{9}$/, required: true },
                    surname: { pattern: /^[A-Z\s]{2,30}$/, required: true },
                    givenName: { pattern: /^[A-Z\s]{2,30}$/, required: true },
                    nationality: { pattern: /^USA$/, required: true },
                    dateOfBirth: { pattern: /^\d{2}\/\d{2}\/\d{4}$/, required: true },
                    sex: { pattern: /^[MF]$/, required: true },
                    expiryDate: { pattern: /^\d{2}\/\d{2}\/\d{4}$/, required: true }
                }
            },
            passport_BRA: {
                type: 'passport',
                country: 'BRA',
                format: 'booklet',
                securityFeatures: ['hologram', 'microprint', 'uv_reactive', 'laser_engraving'],
                fields: {
                    documentNumber: { pattern: /^[A-Z0-9]{9}$/, required: true },
                    nome: { pattern: /^[A-Z\s]{2,50}$/, required: true },
                    nacionalidade: { pattern: /^BRASILEIRA$/, required: true },
                    dataNascimento: { pattern: /^\d{2}\/\d{2}\/\d{4}$/, required: true },
                    dataExpedicao: { pattern: /^\d{2}\/\d{2}\/\d{4}$/, required: true },
                    dataValidade: { pattern: /^\d{2}\/\d{2}\/\d{4}$/, required: true }
                }
            },
            driverLicense_USA: {
                type: 'driverLicense',
                country: 'USA',
                format: 'card',
                securityFeatures: ['hologram', 'microprint', 'uv_reactive', 'ghost_image'],
                fields: {
                    licenseNumber: { pattern: /^[A-Z0-9]{5,15}$/, required: true },
                    fullName: { pattern: /^[A-Z\s]{2,50}$/, required: true },
                    address: { pattern: /.+/, required: true },
                    dateOfBirth: { pattern: /^\d{2}\/\d{2}\/\d{4}$/, required: true },
                    issueDate: { pattern: /^\d{2}\/\d{2}\/\d{4}$/, required: true },
                    expiryDate: { pattern: /^\d{2}\/\d{2}\/\d{4}$/, required: true },
                    class: { pattern: /^[A-Z]{1,2}$/, required: true }
                }
            },
            utilityBill: {
                type: 'proofOfAddress',
                format: 'document',
                requiredIssuers: ['electric', 'water', 'gas', 'internet', 'phone'],
                fields: {
                    customerName: { pattern: /^[A-Z\s]{2,50}$/, required: true },
                    serviceAddress: { pattern: /.+/, required: true },
                    issueDate: { pattern: /^\d{2}\/\d{2}\/\d{4}$/, required: true },
                    dueDate: { pattern: /^\d{2}\/\d{2}\/\d{4}$/, required: false },
                    amount: { pattern: /^\d+\.\d{2}$/, required: false },
                    issuerName: { pattern: /^[A-Z\s]{2,30}$/, required: true }
                }
            },
            bankStatement: {
                type: 'proofOfAddress',
                format: 'document',
                requiredIssuers: ['bank', 'financial_institution'],
                fields: {
                    accountHolderName: { pattern: /^[A-Z\s]{2,50}$/, required: true },
                    mailingAddress: { pattern: /.+/, required: true },
                    statementDate: { pattern: /^\d{2}\/\d{2}\/\d{4}$/, required: true },
                    bankName: { pattern: /^[A-Z\s]{2,30}$/, required: true },
                    accountNumber: { pattern: /^[A-Z0-9]{5,20}$/, required: false }
                }
            },
            selfie: {
                type: 'selfie',
                format: 'image',
                requirements: {
                    minResolution: 640,
                    maxFileSize: 5242880, // 5MB
                    acceptedFormats: ['jpg', 'jpeg', 'png', 'heic'],
                    minLivenessScore: 0.85
                }
            }
        };
    }

    // ============= 2. SUBMIT DOCUMENT FOR VERIFICATION =============
    async submitDocument(userId, documentType, documentData) {
        const verificationId = uuidv4();
        
        const verificationRequest = {
            id: verificationId,
            userId: userId,
            documentType: documentType,
            status: 'pending',
            submittedAt: new Date().toISOString(),
            documentData: documentData,
            verificationResults: null,
            fraudChecks: null,
            finalScore: 0,
            isVerified: false,
            rejectionReason: null,
            verifiedBy: null,
            verifiedAt: null
        };
        
        this.verificationRequests.push(verificationRequest);
        
        // Start verification process
        this.processVerification(verificationId);
        
        return {
            success: true,
            verificationId: verificationId,
            message: 'Document submitted for verification',
            estimatedTime: '2-3 minutes'
        };
    }

    // ============= 3. PROCESS DOCUMENT VERIFICATION =============
    async processVerification(verificationId) {
        const verification = this.verificationRequests.find(v => v.id === verificationId);
        if (!verification) return;
        
        console.log(`🔍 Processing document verification for ${verificationId}`);
        
        verification.status = 'processing';
        
        // Step 1: Validate document format and quality
        const formatValidation = await this.validateDocumentFormat(verification);
        
        // Step 2: Extract data using OCR
        const extractedData = await this.extractDocumentData(verification);
        
        // Step 3: Validate extracted data against templates
        const dataValidation = await this.validateDocumentData(verification, extractedData);
        
        // Step 4: Perform fraud detection
        const fraudCheck = await this.performFraudDetection(verification, extractedData);
        
        // Step 5: Calculate verification score
        const finalScore = this.calculateVerificationScore(formatValidation, dataValidation, fraudCheck);
        
        // Step 6: Make final decision
        const isVerified = finalScore >= 85;
        
        verification.verificationResults = {
            formatValidation: formatValidation,
            extractedData: extractedData,
            dataValidation: dataValidation,
            fraudCheck: fraudCheck,
            finalScore: finalScore,
            completedAt: new Date().toISOString()
        };
        
        verification.finalScore = finalScore;
        verification.isVerified = isVerified;
        verification.status = isVerified ? 'verified' : 'rejected';
        
        if (!isVerified) {
            verification.rejectionReason = this.generateRejectionReason(formatValidation, dataValidation, fraudCheck);
        }
        
        verification.verifiedAt = new Date().toISOString();
        
        if (isVerified) {
            this.verifiedDocuments.push({
                id: uuidv4(),
                verificationId: verificationId,
                userId: verification.userId,
                documentType: verification.documentType,
                extractedData: extractedData,
                verifiedAt: verification.verifiedAt
            });
        }
        
        console.log(`📄 Document verification ${isVerified ? 'PASSED' : 'FAILED'} for ${verificationId} - Score: ${finalScore}%`);
        
        return verification;
    }

    // ============= 4. VALIDATE DOCUMENT FORMAT =============
    async validateDocumentFormat(verification) {
        const { documentType, documentData } = verification;
        const template = this.documentTemplates[documentType] || this.getTemplateByType(documentType);
        
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            quality: {
                resolution: 0,
                clarity: 0,
        lighting: 0
            }
        };
        
        // Check file format
        const validFormats = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'image/heic'];
        if (!validFormats.includes(documentData.mimeType)) {
            validation.isValid = false;
            validation.errors.push('Invalid file format. Please upload JPEG, PNG, or PDF');
        }
        
        // Check file size (max 10MB)
        if (documentData.size > 10485760) {
            validation.isValid = false;
            validation.errors.push('File size exceeds 10MB limit');
        }
        
        // Simulate quality checks
        validation.quality.resolution = 85 + Math.random() * 10;
        validation.quality.clarity = 80 + Math.random() * 15;
        validation.quality.lighting = 75 + Math.random() * 20;
        
        if (validation.quality.resolution < 70) {
            validation.warnings.push('Low resolution detected. Image may be blurry.');
        }
        
        if (validation.quality.clarity < 60) {
            validation.warnings.push('Poor image clarity. Text may be unreadable.');
        }
        
        // Check for document completeness
        if (template && template.requiredFields) {
            const missingFields = this.checkMissingFields(documentData.extractedData, template.requiredFields);
            if (missingFields.length > 0) {
                validation.warnings.push(`Missing fields: ${missingFields.join(', ')}`);
            }
        }
        
        return validation;
    }

    // ============= 5. EXTRACT DOCUMENT DATA (OCR) =============
    async extractDocumentData(verification) {
        const { documentType, documentData } = verification;
        
        // Simulate OCR extraction
        // In production: Integrate with Tesseract, Google Vision, or AWS Textract
        
        const extractedData = {
            rawText: this.simulateOCR(documentData),
            fields: {},
            confidence: {},
            processingTime: Math.random() * 2000
        };
        
        // Extract fields based on document type
        switch (documentType) {
            case 'passport_USA':
                extractedData.fields = {
                    documentNumber: this.generateRandomDocumentNumber(),
                    fullName: this.generateRandomName(),
                    surname: this.generateRandomName(),
                    givenName: this.generateRandomName(),
                    nationality: 'USA',
                    dateOfBirth: this.generateRandomDate('1980-01-01', '2000-12-31'),
                    expiryDate: this.generateRandomDate('2025-01-01', '2030-12-31')
                };
                extractedData.confidence = {
                    documentNumber: 0.95,
                    fullName: 0.92,
                    surname: 0.94,
                    givenName: 0.93,
                    nationality: 0.99,
                    dateOfBirth: 0.89,
                    expiryDate: 0.91
                };
                break;
                
            case 'driverLicense_USA':
                extractedData.fields = {
                    licenseNumber: this.generateRandomLicenseNumber(),
                    fullName: this.generateRandomName(),
                    address: this.generateRandomAddress(),
                    dateOfBirth: this.generateRandomDate('1980-01-01', '2000-12-31'),
                    issueDate: this.generateRandomDate('2020-01-01', '2023-12-31'),
                    expiryDate: this.generateRandomDate('2025-01-01', '2030-12-31'),
                    class: Math.random() > 0.5 ? 'C' : 'D'
                };
                extractedData.confidence = {
                    licenseNumber: 0.93,
                    fullName: 0.94,
                    address: 0.87,
                    dateOfBirth: 0.90,
                    issueDate: 0.88,
                    expiryDate: 0.92,
                    class: 0.95
                };
                break;
                
            case 'utilityBill':
                extractedData.fields = {
                    customerName: this.generateRandomName(),
                    serviceAddress: this.generateRandomAddress(),
                    issueDate: this.generateRandomDate('2024-01-01', '2024-12-31'),
                    dueDate: this.generateRandomDate('2024-12-01', '2025-01-31'),
                    issuerName: ['Electric Company', 'Water Authority', 'Gas Corp'][Math.floor(Math.random() * 3)]
                };
                extractedData.confidence = {
                    customerName: 0.96,
                    serviceAddress: 0.88,
                    issueDate: 0.94,
                    dueDate: 0.92,
                    issuerName: 0.97
                };
                break;
                
            case 'bankStatement':
                extractedData.fields = {
                    accountHolderName: this.generateRandomName(),
                    mailingAddress: this.generateRandomAddress(),
                    statementDate: this.generateRandomDate('2024-10-01', '2024-12-31'),
                    bankName: ['Chase', 'Bank of America', 'Wells Fargo'][Math.floor(Math.random() * 3)]
                };
                extractedData.confidence = {
                    accountHolderName: 0.95,
                    mailingAddress: 0.86,
                    statementDate: 0.93,
                    bankName: 0.98
                };
                break;
                
            case 'selfie':
                extractedData.fields = {
                    faceDetected: true,
                    livenessScore: 0.85 + Math.random() * 0.14,
                    qualityScore: 0.80 + Math.random() * 0.15
                };
                extractedData.confidence = {
                    faceDetected: 0.99,
                    livenessScore: 0.92,
                    qualityScore: 0.89
                };
                break;
                
            default:
                extractedData.fields = {
                    documentNumber: this.generateRandomDocumentNumber(),
                    fullName: this.generateRandomName(),
                    dateOfBirth: this.generateRandomDate('1980-01-01', '2000-12-31')
                };
                extractedData.confidence = {
                    documentNumber: 0.90,
                    fullName: 0.88,
                    dateOfBirth: 0.85
                };
        }
        
        return extractedData;
    }

    // ============= 6. VALIDATE DOCUMENT DATA =============
    async validateDocumentData(verification, extractedData) {
        const validation = {
            isValid: true,
            fieldValidations: {},
            errors: [],
            warnings: []
        };
        
        const template = this.getTemplateByType(verification.documentType);
        
        for (const [field, value] of Object.entries(extractedData.fields)) {
            const fieldTemplate = template?.fields?.[field];
            const fieldValidation = {
                isValid: true,
                confidence: extractedData.confidence[field] || 0,
                errors: []
            };
            
            // Check confidence threshold
            if (fieldValidation.confidence < 0.7) {
                fieldValidation.isValid = false;
                fieldValidation.errors.push('Low confidence in OCR extraction');
                validation.warnings.push(`Low confidence for field: ${field}`);
            }
            
            // Check pattern matching
            if (fieldTemplate && fieldTemplate.pattern) {
                if (!fieldTemplate.pattern.test(value)) {
                    fieldValidation.isValid = false;
                    fieldValidation.errors.push('Field value does not match expected format');
                }
            }
            
            // Check for logical consistency
            if (field === 'expiryDate' || field === 'dataValidade') {
                const expiryDate = new Date(value);
                const today = new Date();
                if (expiryDate < today) {
                    fieldValidation.isValid = false;
                    fieldValidation.errors.push('Document has expired');
                    validation.errors.push('Document is expired');
                }
            }
            
            if (field === 'dateOfBirth') {
                const dob = new Date(value);
                const age = this.calculateAge(dob);
                if (age < 18) {
                    fieldValidation.isValid = false;
                    fieldValidation.errors.push('Underage document');
                }
                if (age > 120) {
                    fieldValidation.isValid = false;
                    fieldValidation.errors.push('Invalid date of birth');
                }
            }
            
            validation.fieldValidations[field] = fieldValidation;
            if (!fieldValidation.isValid) validation.isValid = false;
        }
        
        // Check for document age (proof of address)
        if (verification.documentType === 'proofOfAddress' || verification.documentType === 'utilityBill' || verification.documentType === 'bankStatement') {
            const issueDate = new Date(extractedData.fields.issueDate || extractedData.fields.statementDate);
            const daysOld = Math.floor((new Date() - issueDate) / (1000 * 60 * 60 * 24));
            
            if (daysOld > 90) {
                validation.isValid = false;
                validation.errors.push(`Document is ${daysOld} days old. Must be less than 90 days.`);
            } else if (daysOld > 60) {
                validation.warnings.push(`Document is ${daysOld} days old. Consider submitting a newer document.`);
            }
        }
        
        return validation;
    }

    // ============= 7. PERFORM FRAUD DETECTION =============
    async performFraudDetection(verification, extractedData) {
        const fraudCheck = {
            isFraudulent: false,
            riskScore: 0,
            checks: [],
            flags: []
        };
        
        // Check 1: Document tampering detection
        const tamperingScore = this.detectTampering(verification);
        fraudCheck.checks.push({
            name: 'tampering_detection',
            passed: tamperingScore < 0.3,
            score: tamperingScore,
            details: tamperingScore > 0.5 ? 'Potential document tampering detected' : 'No tampering detected'
        });
        if (tamperingScore > 0.5) fraudCheck.flags.push('possible_tampering');
        
        // Check 2: Duplicate document check
        const isDuplicate = this.checkDuplicateDocument(verification);
        fraudCheck.checks.push({
            name: 'duplicate_check',
            passed: !isDuplicate,
            score: isDuplicate ? 1 : 0,
            details: isDuplicate ? 'Document already used for verification' : 'Unique document'
        });
        if (isDuplicate) fraudCheck.flags.push('duplicate_document');
        
        // Check 3: Digital manipulation detection
        const manipulationScore = this.detectDigitalManipulation(verification);
        fraudCheck.checks.push({
            name: 'digital_manipulation',
            passed: manipulationScore < 0.4,
            score: manipulationScore,
            details: manipulationScore > 0.6 ? 'Signs of digital manipulation detected' : 'No manipulation detected'
        });
        if (manipulationScore > 0.6) fraudCheck.flags.push('digital_manipulation');
        
        // Check 4: Metadata analysis
        const metadataIssues = this.analyzeMetadata(verification);
        fraudCheck.checks.push({
            name: 'metadata_analysis',
            passed: metadataIssues.length === 0,
            score: metadataIssues.length * 0.2,
            details: metadataIssues.length > 0 ? `Metadata issues: ${metadataIssues.join(', ')}` : 'Metadata clean'
        });
        if (metadataIssues.length > 0) fraudCheck.flags.push(...metadataIssues);
        
        // Check 5: Pattern recognition (known fraud patterns)
        const patternMatch = this.checkFraudPatterns(verification);
        fraudCheck.checks.push({
            name: 'pattern_recognition',
            passed: !patternMatch.matched,
            score: patternMatch.score,
            details: patternMatch.matched ? `Matched known fraud pattern: ${patternMatch.pattern}` : 'No patterns matched'
        });
        if (patternMatch.matched) fraudCheck.flags.push('fraud_pattern_matched');
        
        // Calculate overall risk score
        fraudCheck.riskScore = fraudCheck.checks.reduce((sum, check) => sum + check.score, 0) / fraudCheck.checks.length * 100;
        fraudCheck.isFraudulent = fraudCheck.riskScore > 50 || fraudCheck.flags.length > 2;
        
        return fraudCheck;
    }

    // ============= 8. DETECT TAMPERING =============
    detectTampering(verification) {
        // Simulate tampering detection
        // In production: Use AI models to detect Photoshop, copy-paste, etc.
        return Math.random();
    }

    // ============= 9. CHECK DUPLICATE DOCUMENT =============
    checkDuplicateDocument(verification) {
        const documentHash = this.generateDocumentHash(verification.documentData);
        const existingDocuments = this.verifiedDocuments.filter(d => 
            this.generateDocumentHash(d) === documentHash
        );
        return existingDocuments.length > 0;
    }

    // ============= 10. DETECT DIGITAL MANIPULATION =============
    detectDigitalManipulation(verification) {
        // Simulate detection of Photoshop, AI-generated images, etc.
        return Math.random();
    }

    // ============= 11. ANALYZE METADATA =============
    analyzeMetadata(verification) {
        const issues = [];
        
        // Check for missing metadata
        if (!verification.documentData.metadata) {
            issues.push('missing_metadata');
        }
        
        // Check for suspicious software
        const suspiciousSoftware = ['Photoshop', 'GIMP', 'Illustrator', 'AfterEffects'];
        if (verification.documentData.metadata?.software && 
            suspiciousSoftware.some(sw => verification.documentData.metadata.software.includes(sw))) {
            issues.push('suspicious_software');
        }
        
        // Check creation date
        const creationDate = verification.documentData.metadata?.creationDate;
        if (creationDate && new Date(creationDate) > new Date()) {
            issues.push('future_creation_date');
        }
        
        return issues;
    }

    // ============= 12. CHECK FRAUD PATTERNS =============
    checkFraudPatterns(verification) {
        // Check against known fraud patterns
        const patterns = [
            { name: 'mismatched_names', condition: () => Math.random() > 0.95, score: 0.8 },
            { name: 'invalid_date_patterns', condition: () => Math.random() > 0.97, score: 0.9 },
            { name: 'synthetic_identity', condition: () => Math.random() > 0.98, score: 0.95 },
            { name: 'document_farming', condition: () => Math.random() > 0.96, score: 0.85 }
        ];
        
        for (const pattern of patterns) {
            if (pattern.condition()) {
                return { matched: true, pattern: pattern.name, score: pattern.score };
            }
        }
        
        return { matched: false, score: 0 };
    }

    // ============= 13. CALCULATE VERIFICATION SCORE =============
    calculateVerificationScore(formatValidation, dataValidation, fraudCheck) {
        let score = 0;
        
        // Format validation weight: 30%
        let formatScore = 0;
        if (formatValidation.isValid) formatScore += 20;
        formatScore += (formatValidation.quality.resolution / 100) * 5;
        formatScore += (formatValidation.quality.clarity / 100) * 5;
        formatScore = Math.min(30, formatScore);
        score += formatScore;
        
        // Data validation weight: 40%
        let dataScore = 0;
        if (dataValidation.isValid) dataScore += 20;
        for (const [field, validation] of Object.entries(dataValidation.fieldValidations || {})) {
            if (validation.isValid) dataScore += (validation.confidence * 20) / Object.keys(dataValidation.fieldValidations).length;
        }
        dataScore = Math.min(40, dataScore);
        score += dataScore;
        
        // Fraud detection weight: 30%
        let fraudScore = 30 - (fraudCheck.riskScore * 0.3);
        fraudScore = Math.max(0, Math.min(30, fraudScore));
        score += fraudScore;
        
        return Math.round(score);
    }

    // ============= 14. GET VERIFICATION STATUS =============
    async getVerificationStatus(verificationId) {
        const verification = this.verificationRequests.find(v => v.id === verificationId);
        
        if (!verification) {
            return {
                success: false,
                error: 'Verification request not found'
            };
        }
        
        return {
            success: true,
            verification: {
                id: verification.id,
                status: verification.status,
                documentType: verification.documentType,
                submittedAt: verification.submittedAt,
                isVerified: verification.isVerified,
                finalScore: verification.finalScore,
                rejectionReason: verification.rejectionReason,
                verifiedAt: verification.verifiedAt
            }
        };
    }

    // ============= 15. MANUAL REVIEW (ADMIN) =============
    async manualReview(verificationId, reviewerId, decision, notes) {
        const verification = this.verificationRequests.find(v => v.id === verificationId);
        
        if (!verification) {
            return {
                success: false,
                error: 'Verification request not found'
            };
        }
        
        verification.status = decision === 'approve' ? 'verified' : 'rejected';
        verification.isVerified = decision === 'approve';
        verification.verifiedBy = reviewerId;
        verification.verifiedAt = new Date().toISOString();
        verification.reviewNotes = notes;
        
        if (decision === 'reject') {
            verification.rejectionReason = notes;
        }
        
        return {
            success: true,
            message: `Document ${decision === 'approve' ? 'approved' : 'rejected'} manually`,
            verification: verification
        };
    }

    // ============= 16. GET VERIFIED DOCUMENTS (ADMIN) =============
    async getVerifiedDocuments(filters = {}) {
        let documents = [...this.verifiedDocuments];
        
        if (filters.userId) {
            documents = documents.filter(d => d.userId === filters.userId);
        }
        
        if (filters.documentType) {
            documents = documents.filter(d => d.documentType === filters.documentType);
        }
        
        if (filters.startDate) {
            documents = documents.filter(d => new Date(d.verifiedAt) >= new Date(filters.startDate));
        }
        
        if (filters.endDate) {
            documents = documents.filter(d => new Date(d.verifiedAt) <= new Date(filters.endDate));
        }
        
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 50;
        const startIndex = (page - 1) * limit;
        
        return {
            success: true,
            total: documents.length,
            page: page,
            limit: limit,
            documents: documents.slice(startIndex, startIndex + limit)
        };
    }

    // ============= 17. GET PENDING VERIFICATIONS (ADMIN) =============
    async getPendingVerifications() {
        const pending = this.verificationRequests.filter(v => v.status === 'pending' || v.status === 'processing');
        
        return {
            success: true,
            total: pending.length,
            verifications: pending.map(v => ({
                id: v.id,
                userId: v.userId,
                documentType: v.documentType,
                submittedAt: v.submittedAt,
                status: v.status,
                finalScore: v.finalScore
            }))
        };
    }

    // ============= 18. GENERATE VERIFICATION REPORT =============
    async generateVerificationReport(startDate, endDate) {
        const verifications = this.verificationRequests.filter(v => 
            new Date(v.submittedAt) >= new Date(startDate) &&
            new Date(v.submittedAt) <= new Date(endDate)
        );
        
        const total = verifications.length;
        const verified = verifications.filter(v => v.isVerified).length;
        const rejected = verifications.filter(v => !v.isVerified && v.status === 'rejected').length;
        const pending = verifications.filter(v => v.status === 'pending' || v.status === 'processing').length;
        
        const byDocumentType = {};
        verifications.forEach(v => {
            if (!byDocumentType[v.documentType]) {
                byDocumentType[v.documentType] = { total: 0, verified: 0, rejected: 0 };
            }
            byDocumentType[v.documentType].total++;
            if (v.isVerified) byDocumentType[v.documentType].verified++;
            if (!v.isVerified && v.status === 'rejected') byDocumentType[v.documentType].rejected++;
        });
        
        const averageScore = verifications.reduce((sum, v) => sum + (v.finalScore || 0), 0) / total;
        
        return {
            success: true,
            period: { startDate, endDate },
            summary: {
                total: total,
                verified: verified,
                rejected: rejected,
                pending: pending,
                verificationRate: total > 0 ? (verified / total * 100).toFixed(2) : 0,
                averageScore: averageScore.toFixed(2)
            },
            byDocumentType: byDocumentType,
            timestamp: new Date().toISOString()
        };
    }

    // ============= HELPER FUNCTIONS =============
    getTemplateByType(documentType) {
        // Find template by type or return generic template
        for (const [key, template] of Object.entries(this.documentTemplates)) {
            if (key.includes(documentType) || template.type === documentType) {
                return template;
            }
        }
        return null;
    }

    checkMissingFields(extractedData, requiredFields) {
        const missing = [];
        for (const field of requiredFields) {
            if (!extractedData[field]) {
                missing.push(field);
            }
        }
        return missing;
    }

    generateDocumentHash(documentData) {
        const dataString = JSON.stringify({
            type: documentData.type,
            data: documentData.data,
            userId: documentData.userId
        });
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }

    generateRejectionReason(formatValidation, dataValidation, fraudCheck) {
        const reasons = [];
        
        if (!formatValidation.isValid) {
            reasons.push(...formatValidation.errors);
        }
        
        if (!dataValidation.isValid) {
            reasons.push(...dataValidation.errors);
        }
        
        if (fraudCheck.isFraudulent) {
            reasons.push(`Fraud detected: ${fraudCheck.flags.join(', ')}`);
        }
        
        if (reasons.length === 0) {
            reasons.push('Document does not meet verification requirements');
        }
        
        return reasons.join('. ');
    }

    calculateAge(dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    // Random generators for simulation
    generateRandomDocumentNumber() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        let result = '';
        for (let i = 0; i < 2; i++) result += letters[Math.floor(Math.random() * letters.length)];
        for (let i = 0; i < 7; i++) result += numbers[Math.floor(Math.random() * numbers.length)];
        return result;
    }

    generateRandomName() {
        const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Maria', 'James', 'Robert', 'Jennifer', 'William'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
        return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`.toUpperCase();
    }

    generateRandomAddress() {
        const streets = ['Main St', 'Broadway', 'Park Ave', 'Oak St', 'Maple Dr', 'Cedar Rd', 'Elm St', 'Washington Blvd'];
        const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'];
        const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA'];
        const zipCodes = ['10001', '90210', '60601', '77001', '85001', '19101', '78201', '92101'];
        const index = Math.floor(Math.random() * streets.length);
        return `${Math.floor(Math.random() * 9999) + 1} ${streets[index]}, ${cities[index]}, ${states[index]} ${zipCodes[index]}`;
    }

    generateRandomDate(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const date = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
        return date.toLocaleDateString('en-US');
    }

    generateRandomLicenseNumber() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        let result = '';
        for (let i = 0; i < 1; i++) result += letters[Math.floor(Math.random() * letters.length)];
        for (let i = 0; i < 7; i++) result += numbers[Math.floor(Math.random() * numbers.length)];
        for (let i = 0; i < 1; i++) result += letters[Math.floor(Math.random() * letters.length)];
        return result;
    }

    simulateOCR(documentData) {
        // Simulate OCR text extraction
        return "This is simulated OCR extracted text from the document.";
    }
}

module.exports = new DocumentVerificationService();
