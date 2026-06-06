/**
 * ZENTRONIX BANK - COMPLETE OPERATIONAL ERP SYSTEM
 * Enterprise Resource Planning for Banking Operations
 * Version: 1.0.0
 * Language: JavaScript (Node.js)
 * 
 * Features:
 * - Customer Relationship Management (CRM)
 * - Human Resources Management (HRM)
 * - Payroll Processing
 * - Leave & Attendance Management
 * - Recruitment & Onboarding
 * - Performance Management
 * - Training & Development
 * - Inventory & Supply Chain Management
 * - Vendor Management
 * - Purchase Orders & Procurement
 * - Warehouse Management
 * - Fleet Management
 * - Facility Management
 * - Document Management System (DMS)
 * - Workflow Automation
 * - Task & Project Management
 * - SLA Management
 * - Help Desk & Ticketing System
 * - Compliance Management
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

// ========================================
// CONFIGURATION
// ========================================

const OPERATIONAL_CONFIG = {
    // Employee statuses
    EMPLOYEE_STATUS: {
        ACTIVE: 'ACTIVE',
        ON_LEAVE: 'ON_LEAVE',
        TERMINATED: 'TERMINATED',
        PROBATION: 'PROBATION'
    },
    
    // Leave types
    LEAVE_TYPES: {
        ANNUAL: 'ANNUAL',
        SICK: 'SICK',
        MATERNITY: 'MATERNITY',
        PATERNITY: 'PATERNITY',
        BEREAVEMENT: 'BEREAVEMENT',
        UNPAID: 'UNPAID',
        STUDY: 'STUDY'
    },
    
    // Ticket priorities
    TICKET_PRIORITY: {
        LOW: 'LOW',
        MEDIUM: 'MEDIUM',
        HIGH: 'HIGH',
        URGENT: 'URGENT'
    },
    
    // Ticket statuses
    TICKET_STATUS: {
        OPEN: 'OPEN',
        IN_PROGRESS: 'IN_PROGRESS',
        RESOLVED: 'RESOLVED',
        CLOSED: 'CLOSED',
        ESCALATED: 'ESCALATED'
    },
    
    // Purchase order statuses
    PO_STATUS: {
        DRAFT: 'DRAFT',
        PENDING_APPROVAL: 'PENDING_APPROVAL',
        APPROVED: 'APPROVED',
        ORDERED: 'ORDERED',
        RECEIVED: 'RECEIVED',
        CANCELLED: 'CANCELLED'
    },
    
    // Task priorities
    TASK_PRIORITY: {
        LOW: 1,
        MEDIUM: 2,
        HIGH: 3,
        CRITICAL: 4
    },
    
    // Task statuses
    TASK_STATUS: {
        TODO: 'TODO',
        IN_PROGRESS: 'IN_PROGRESS',
        IN_REVIEW: 'IN_REVIEW',
        DONE: 'DONE',
        BLOCKED: 'BLOCKED'
    },
    
    // SLA tiers
    SLA_TIERS: {
        PREMIUM: { responseTime: 15, resolutionTime: 60 }, // minutes
        STANDARD: { responseTime: 60, resolutionTime: 240 },
        BASIC: { responseTime: 180, resolutionTime: 720 }
    },
    
    // Document types
    DOCUMENT_TYPES: {
        CONTRACT: 'CONTRACT',
        INVOICE: 'INVOICE',
        REPORT: 'REPORT',
        POLICY: 'POLICY',
        PROCEDURE: 'PROCEDURE',
        CERTIFICATE: 'CERTIFICATE'
    }
};

// ========================================
// DATA MODELS
// ========================================

class Employee {
    constructor(data) {
        this.employeeId = data.employeeId || this.generateEmployeeId();
        this.firstName = data.firstName;
        this.lastName = data.lastName;
        this.email = data.email;
        this.phone = data.phone;
        this.department = data.department;
        this.position = data.position;
        this.managerId = data.managerId || null;
        this.hireDate = data.hireDate || new Date();
        this.status = data.status || OPERATIONAL_CONFIG.EMPLOYEE_STATUS.PROBATION;
        this.salary = data.salary;
        this.currency = data.currency || 'USD';
        this.bankAccount = data.bankAccount;
        this.address = data.address;
        this.emergencyContact = data.emergencyContact;
        this.documents = data.documents || [];
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    
    generateEmployeeId() {
        const prefix = 'EMP';
        const year = new Date().getFullYear();
        const random = crypto.randomBytes(3).toString('hex').toUpperCase();
        return `${prefix}${year}-${random}`;
    }
    
    getFullName() {
        return `${this.firstName} ${this.lastName}`;
    }
}

class LeaveRequest {
    constructor(data) {
        this.leaveId = data.leaveId || this.generateLeaveId();
        this.employeeId = data.employeeId;
        this.type = data.type;
        this.startDate = data.startDate;
        this.endDate = data.endDate;
        this.days = this.calculateDays(data.startDate, data.endDate);
        this.reason = data.reason;
        this.status = data.status || 'PENDING'; // PENDING, APPROVED, REJECTED, CANCELLED
        this.approvedBy = data.approvedBy || null;
        this.approvedAt = data.approvedAt || null;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    
    generateLeaveId() {
        return `LV-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
    
    calculateDays(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate - startDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
}

class Attendance {
    constructor(data) {
        this.attendanceId = data.attendanceId || this.generateAttendanceId();
        this.employeeId = data.employeeId;
        this.date = data.date || new Date();
        this.checkIn = data.checkIn;
        this.checkOut = data.checkOut || null;
        this.hoursWorked = data.hoursWorked || 0;
        this.overtime = data.overtime || 0;
        this.status = data.status || 'PRESENT'; // PRESENT, ABSENT, LATE, HALF_DAY
        this.notes = data.notes || null;
        this.createdAt = new Date();
    }
    
    generateAttendanceId() {
        return `ATT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
}

class Customer {
    constructor(data) {
        this.customerId = data.customerId || this.generateCustomerId();
        this.customerType = data.customerType; // INDIVIDUAL, CORPORATE
        this.firstName = data.firstName;
        this.lastName = data.lastName;
        this.companyName = data.companyName || null;
        this.email = data.email;
        this.phone = data.phone;
        this.address = data.address;
        this.taxId = data.taxId || null;
        this.kycStatus = data.kycStatus || 'PENDING';
        this.riskRating = data.riskRating || 'MEDIUM';
        this.relationshipManager = data.relationshipManager || null;
        this.accounts = data.accounts || [];
        this.notes = data.notes || [];
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    
    generateCustomerId() {
        const prefix = 'CUST';
        const random = crypto.randomBytes(6).toString('hex').toUpperCase();
        return `${prefix}-${random}`;
    }
    
    getFullName() {
        return this.customerType === 'CORPORATE' ? this.companyName : `${this.firstName} ${this.lastName}`;
    }
}

class SupportTicket {
    constructor(data) {
        this.ticketId = data.ticketId || this.generateTicketId();
        this.customerId = data.customerId;
        this.subject = data.subject;
        this.description = data.description;
        this.category = data.category;
        this.priority = data.priority || OPERATIONAL_CONFIG.TICKET_PRIORITY.MEDIUM;
        this.status = data.status || OPERATIONAL_CONFIG.TICKET_STATUS.OPEN;
        this.assignedTo = data.assignedTo || null;
        this.slaDeadline = this.calculateSLADeadline(data.priority);
        this.resolution = data.resolution || null;
        this.resolvedAt = data.resolvedAt || null;
        this.closedAt = data.closedAt || null;
        this.attachments = data.attachments || [];
        this.comments = data.comments || [];
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    
    generateTicketId() {
        return `TKT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
    
    calculateSLADeadline(priority) {
        const now = new Date();
        let slaMinutes = 0;
        
        switch (priority) {
            case OPERATIONAL_CONFIG.TICKET_PRIORITY.URGENT:
                slaMinutes = OPERATIONAL_CONFIG.SLA_TIERS.PREMIUM.responseTime;
                break;
            case OPERATIONAL_CONFIG.TICKET_PRIORITY.HIGH:
                slaMinutes = OPERATIONAL_CONFIG.SLA_TIERS.PREMIUM.resolutionTime;
                break;
            case OPERATIONAL_CONFIG.TICKET_PRIORITY.MEDIUM:
                slaMinutes = OPERATIONAL_CONFIG.SLA_TIERS.STANDARD.responseTime;
                break;
            default:
                slaMinutes = OPERATIONAL_CONFIG.SLA_TIERS.BASIC.responseTime;
        }
        
        return new Date(now.getTime() + slaMinutes * 60 * 1000);
    }
    
    isSLAViolated() {
        return new Date() > this.slaDeadline && this.status !== OPERATIONAL_CONFIG.TICKET_STATUS.CLOSED;
    }
}

class PurchaseOrder {
    constructor(data) {
        this.poId = data.poId || this.generatePOId();
        this.poNumber = data.poNumber || this.generatePONumber();
        this.vendorId = data.vendorId;
        this.vendorName = data.vendorName;
        this.items = data.items || [];
        this.subtotal = this.calculateSubtotal();
        this.tax = this.subtotal * 0.1; // 10% tax
        this.total = this.subtotal + this.tax;
        this.currency = data.currency || 'USD';
        this.status = data.status || OPERATIONAL_CONFIG.PO_STATUS.DRAFT;
        this.requestedBy = data.requestedBy;
        this.approvedBy = data.approvedBy || null;
        this.approvedAt = data.approvedAt || null;
        this.orderDate = data.orderDate || null;
        this.expectedDelivery = data.expectedDelivery || null;
        this.receivedDate = data.receivedDate || null;
        this.notes = data.notes || null;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    
    generatePOId() {
        return `PO-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
    
    generatePONumber() {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const random = crypto.randomBytes(3).toString('hex').toUpperCase();
        return `PO-${year}${month}-${random}`;
    }
    
    calculateSubtotal() {
        return this.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    }
}

class Vendor {
    constructor(data) {
        this.vendorId = data.vendorId || this.generateVendorId();
        this.name = data.name;
        this.category = data.category;
        this.contactPerson = data.contactPerson;
        this.email = data.email;
        this.phone = data.phone;
        this.address = data.address;
        this.taxId = data.taxId;
        this.paymentTerms = data.paymentTerms || 'NET30';
        this.rating = data.rating || 0; // 0-5
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.contractStart = data.contractStart || null;
        this.contractEnd = data.contractEnd || null;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    
    generateVendorId() {
        return `VEN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
}

class InventoryItem {
    constructor(data) {
        this.itemId = data.itemId || this.generateItemId();
        this.sku = data.sku;
        this.name = data.name;
        this.category = data.category;
        this.description = data.description;
        this.unitOfMeasure = data.unitOfMeasure;
        this.currentStock = data.currentStock || 0;
        this.minimumStock = data.minimumStock || 0;
        this.maximumStock = data.maximumStock || 0;
        this.reorderPoint = data.reorderPoint || 0;
        this.unitCost = data.unitCost;
        this.sellingPrice = data.sellingPrice;
        this.currency = data.currency || 'USD';
        this.location = data.location;
        this.supplierId = data.supplierId;
        this.lastRestocked = data.lastRestocked || null;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    
    generateItemId() {
        return `ITM-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
    
    needsReorder() {
        return this.currentStock <= this.reorderPoint;
    }
}

class Project {
    constructor(data) {
        this.projectId = data.projectId || this.generateProjectId();
        this.name = data.name;
        this.description = data.description;
        this.clientId = data.clientId || null;
        this.startDate = data.startDate;
        this.endDate = data.endDate;
        this.budget = data.budget;
        this.currency = data.currency || 'USD';
        this.status = data.status || 'PLANNING'; // PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED
        this.priority = data.priority || OPERATIONAL_CONFIG.TASK_PRIORITY.MEDIUM;
        this.projectManager = data.projectManager;
        this.team = data.team || [];
        this.tasks = data.tasks || [];
        this.progress = 0;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    
    generateProjectId() {
        return `PRJ-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
    
    updateProgress() {
        if (this.tasks.length === 0) return 0;
        const completedTasks = this.tasks.filter(t => t.status === OPERATIONAL_CONFIG.TASK_STATUS.DONE).length;
        this.progress = (completedTasks / this.tasks.length) * 100;
        return this.progress;
    }
}

class Task {
    constructor(data) {
        this.taskId = data.taskId || this.generateTaskId();
        this.projectId = data.projectId;
        this.title = data.title;
        this.description = data.description;
        this.assigneeId = data.assigneeId;
        this.dueDate = data.dueDate;
        this.priority = data.priority || OPERATIONAL_CONFIG.TASK_PRIORITY.MEDIUM;
        this.status = data.status || OPERATIONAL_CONFIG.TASK_STATUS.TODO;
        this.estimatedHours = data.estimatedHours || 0;
        this.actualHours = data.actualHours || 0;
        this.parentTaskId = data.parentTaskId || null;
        this.subtasks = data.subtasks || [];
        this.attachments = data.attachments || [];
        this.comments = data.comments || [];
        this.createdBy = data.createdBy;
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.completedAt = data.completedAt || null;
    }
    
    generateTaskId() {
        return `TSK-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
}

class Document {
    constructor(data) {
        this.documentId = data.documentId || this.generateDocumentId();
        this.title = data.title;
        this.type = data.type;
        this.category = data.category;
        this.version = data.version || '1.0';
        this.fileUrl = data.fileUrl;
        this.fileSize = data.fileSize;
        this.fileType = data.fileType;
        this.tags = data.tags || [];
        this.author = data.author;
        this.department = data.department;
        this.expiryDate = data.expiryDate || null;
        this.status = data.status || 'ACTIVE'; // ACTIVE, ARCHIVED, EXPIRED
        this.permissions = data.permissions || []; // Who can access
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    
    generateDocumentId() {
        return `DOC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
}

// ========================================
// HUMAN RESOURCES SERVICE
// ========================================

class HRService extends EventEmitter {
    constructor() {
        super();
        this.employees = new Map();
        this.leaveRequests = new Map();
        this.attendance = new Map();
        this.leaveBalances = new Map();
    }
    
    async hireEmployee(employeeData) {
        const employee = new Employee(employeeData);
        this.employees.set(employee.employeeId, employee);
        
        // Initialize leave balance
        this.leaveBalances.set(employee.employeeId, {
            ANNUAL: 20,
            SICK: 10,
            MATERNITY: 90,
            PATERNITY: 10,
            BEREAVEMENT: 5,
            UNPAID: 0,
            STUDY: 5
        });
        
        this.emit('employee_hired', employee);
        return employee;
    }
    
    async submitLeaveRequest(requestData) {
        const leaveRequest = new LeaveRequest(requestData);
        
        // Check available balance
        const balance = this.leaveBalances.get(leaveRequest.employeeId);
        if (balance && balance[leaveRequest.type] < leaveRequest.days) {
            throw new Error(`Insufficient ${leaveRequest.type} leave balance. Available: ${balance[leaveRequest.type]} days`);
        }
        
        this.leaveRequests.set(leaveRequest.leaveId, leaveRequest);
        this.emit('leave_requested', leaveRequest);
        return leaveRequest;
    }
    
    async approveLeave(leaveId, approverId) {
        const leaveRequest = this.leaveRequests.get(leaveId);
        if (!leaveRequest) throw new Error('Leave request not found');
        
        leaveRequest.status = 'APPROVED';
        leaveRequest.approvedBy = approverId;
        leaveRequest.approvedAt = new Date();
        
        // Deduct from balance
        const balance = this.leaveBalances.get(leaveRequest.employeeId);
        if (balance) {
            balance[leaveRequest.type] -= leaveRequest.days;
        }
        
        this.emit('leave_approved', leaveRequest);
        return leaveRequest;
    }
    
    async recordAttendance(attendanceData) {
        const attendance = new Attendance(attendanceData);
        this.attendance.set(attendance.attendanceId, attendance);
        this.emit('attendance_recorded', attendance);
        return attendance;
    }
    
    async getPayroll(month, year) {
        const payroll = [];
        
        for (const employee of this.employees.values()) {
            if (employee.status === OPERATIONAL_CONFIG.EMPLOYEE_STATUS.ACTIVE) {
                // Calculate days worked
                const monthAttendance = Array.from(this.attendance.values())
                    .filter(a => a.employeeId === employee.employeeId &&
                           new Date(a.date).getMonth() === month &&
                           new Date(a.date).getFullYear() === year);
                
                const daysWorked = monthAttendance.length;
                const dailyRate = employee.salary / 22; // Assuming 22 working days
                const grossPay = daysWorked * dailyRate;
                
                // Calculate deductions
                const tax = grossPay * 0.15; // 15% tax
                const socialSecurity = grossPay * 0.08;
                const netPay = grossPay - tax - socialSecurity;
                
                payroll.push({
                    employeeId: employee.employeeId,
                    name: employee.getFullName(),
                    department: employee.department,
                    salary: employee.salary,
                    daysWorked,
                    grossPay,
                    deductions: { tax, socialSecurity },
                    netPay
                });
            }
        }
        
        return {
            month,
            year,
            payroll,
            totalGross: payroll.reduce((sum, p) => sum + p.grossPay, 0),
            totalNet: payroll.reduce((sum, p) => sum + p.netPay, 0)
        };
    }
    
    async getEmployeeLeaveBalance(employeeId) {
        return this.leaveBalances.get(employeeId) || null;
    }
}

// ========================================
// CUSTOMER RELATIONSHIP SERVICE
// ========================================

class CRMService extends EventEmitter {
    constructor() {
        super();
        this.customers = new Map();
        this.tickets = new Map();
        this.interactions = new Map();
    }
    
    async addCustomer(customerData) {
        const customer = new Customer(customerData);
        this.customers.set(customer.customerId, customer);
        this.emit('customer_added', customer);
        return customer;
    }
    
    async createSupportTicket(ticketData) {
        const ticket = new SupportTicket(ticketData);
        this.tickets.set(ticket.ticketId, ticket);
        this.emit('ticket_created', ticket);
        return ticket;
    }
    
    async updateTicketStatus(ticketId, status, resolution = null) {
        const ticket = this.tickets.get(ticketId);
        if (!ticket) throw new Error('Ticket not found');
        
        ticket.status = status;
        ticket.updatedAt = new Date();
        
        if (status === OPERATIONAL_CONFIG.TICKET_STATUS.RESOLVED && resolution) {
            ticket.resolution = resolution;
            ticket.resolvedAt = new Date();
        }
        
        if (status === OPERATIONAL_CONFIG.TICKET_STATUS.CLOSED) {
            ticket.closedAt = new Date();
        }
        
        this.emit('ticket_updated', ticket);
        return ticket;
    }
    
    async addInteraction(interactionData) {
        const interactionId = `INT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const interaction = {
            interactionId,
            ...interactionData,
            createdAt: new Date()
        };
        this.interactions.set(interactionId, interaction);
        this.emit('interaction_added', interaction);
        return interaction;
    }
    
    async getCustomerTickets(customerId) {
        return Array.from(this.tickets.values())
            .filter(t => t.customerId === customerId)
            .sort((a, b) => b.createdAt - a.createdAt);
    }
    
    async getSLAMetrics() {
        const tickets = Array.from(this.tickets.values());
        const closedTickets = tickets.filter(t => t.status === OPERATIONAL_CONFIG.TICKET_STATUS.CLOSED);
        const violatedTickets = tickets.filter(t => t.isSLAViolated());
        
        return {
            totalTickets: tickets.length,
            openTickets: tickets.filter(t => t.status !== OPERATIONAL_CONFIG.TICKET_STATUS.CLOSED).length,
            resolvedTickets: closedTickets.length,
            slaViolations: violatedTickets.length,
            slaComplianceRate: tickets.length > 0 ? ((tickets.length - violatedTickets.length) / tickets.length) * 100 : 100,
            averageResolutionTime: this.calculateAverageResolutionTime(closedTickets)
        };
    }
    
    calculateAverageResolutionTime(closedTickets) {
        if (closedTickets.length === 0) return 0;
        
        const totalTime = closedTickets.reduce((sum, ticket) => {
            const resolutionTime = (ticket.resolvedAt || ticket.closedAt) - ticket.createdAt;
            return sum + resolutionTime;
        }, 0);
        
        return totalTime / closedTickets.length / (1000 * 60 * 60); // Hours
    }
}

// ========================================
// PROCUREMENT & INVENTORY SERVICE
// ========================================

class ProcurementService extends EventEmitter {
    constructor() {
        super();
        this.vendors = new Map();
        this.purchaseOrders = new Map();
        this.inventory = new Map();
    }
    
    async addVendor(vendorData) {
        const vendor = new Vendor(vendorData);
        this.vendors.set(vendor.vendorId, vendor);
        this.emit('vendor_added', vendor);
        return vendor;
    }
    
    async createPurchaseOrder(poData) {
        const po = new PurchaseOrder(poData);
        this.purchaseOrders.set(po.poId, po);
        this.emit('po_created', po);
        return po;
    }
    
    async approvePurchaseOrder(poId, approverId) {
        const po = this.purchaseOrders.get(poId);
        if (!po) throw new Error('Purchase order not found');
        
        po.status = OPERATIONAL_CONFIG.PO_STATUS.APPROVED;
        po.approvedBy = approverId;
        po.approvedAt = new Date();
        
        this.emit('po_approved', po);
        return po;
    }
    
    async receiveInventory(poId, receivedItems) {
        const po = this.purchaseOrders.get(poId);
        if (!po) throw new Error('Purchase order not found');
        
        for (const received of receivedItems) {
            const item = this.inventory.get(received.itemId);
            if (item) {
                item.currentStock += received.quantity;
                item.lastRestocked = new Date();
                item.updatedAt = new Date();
                this.inventory.set(item.itemId, item);
            }
        }
        
        po.status = OPERATIONAL_CONFIG.PO_STATUS.RECEIVED;
        po.receivedDate = new Date();
        
        this.emit('inventory_received', { poId, receivedItems });
        return po;
    }
    
    async addInventoryItem(itemData) {
        const item = new InventoryItem(itemData);
        this.inventory.set(item.itemId, item);
        this.emit('inventory_added', item);
        return item;
    }
    
    async getReorderReport() {
        const itemsToReorder = [];
        
        for (const item of this.inventory.values()) {
            if (item.needsReorder()) {
                const quantityToOrder = item.maximumStock - item.currentStock;
                itemsToReorder.push({
                    itemId: item.itemId,
                    name: item.name,
                    sku: item.sku,
                    currentStock: item.currentStock,
                    reorderPoint: item.reorderPoint,
                    recommendedOrder: quantityToOrder,
                    supplierId: item.supplierId
                });
            }
        }
        
        return {
            generatedAt: new Date(),
            itemsToReorder,
            totalItemsToReorder: itemsToReorder.length
        };
    }
}

// ========================================
// PROJECT MANAGEMENT SERVICE
// ========================================

class ProjectManagementService extends EventEmitter {
    constructor() {
        super();
        this.projects = new Map();
        this.tasks = new Map();
    }
    
    async createProject(projectData) {
        const project = new Project(projectData);
        this.projects.set(project.projectId, project);
        this.emit('project_created', project);
        return project;
    }
    
    async createTask(taskData) {
        const task = new Task(taskData);
        this.tasks.set(task.taskId, task);
        
        // Add to project if specified
        if (task.projectId) {
            const project = this.projects.get(task.projectId);
            if (project) {
                project.tasks.push(task);
                project.updateProgress();
            }
        }
        
        this.emit('task_created', task);
        return task;
    }
    
    async updateTaskStatus(taskId, status, completedBy = null) {
        const task = this.tasks.get(taskId);
        if (!task) throw new Error('Task not found');
        
        task.status = status;
        task.updatedAt = new Date();
        
        if (status === OPERATIONAL_CONFIG.TASK_STATUS.DONE) {
            task.completedAt = new Date();
            
            // Update project progress
            if (task.projectId) {
                const project = this.projects.get(task.projectId);
                if (project) {
                    project.updateProgress();
                }
            }
        }
        
        this.emit('task_updated', task);
        return task;
    }
    
    async getProjectDashboard() {
        const projects = Array.from(this.projects.values());
        const tasks = Array.from(this.tasks.values());
        
        return {
            totalProjects: projects.length,
            activeProjects: projects.filter(p => p.status === 'ACTIVE').length,
            completedProjects: projects.filter(p => p.status === 'COMPLETED').length,
            totalTasks: tasks.length,
            completedTasks: tasks.filter(t => t.status === OPERATIONAL_CONFIG.TASK_STATUS.DONE).length,
            overdueTasks: tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== OPERATIONAL_CONFIG.TASK_STATUS.DONE).length,
            projectProgress: projects.map(p => ({
                projectId: p.projectId,
                name: p.name,
                progress: p.progress,
                status: p.status
            }))
        };
    }
}

// ========================================
// DOCUMENT MANAGEMENT SERVICE
// ========================================

class DocumentManagementService extends EventEmitter {
    constructor() {
        super();
        this.documents = new Map();
    }
    
    async uploadDocument(documentData) {
        const document = new Document(documentData);
        this.documents.set(document.documentId, document);
        this.emit('document_uploaded', document);
        return document;
    }
    
    async getDocumentsByDepartment(department) {
        return Array.from(this.documents.values())
            .filter(d => d.department === department && d.status === 'ACTIVE');
    }
    
    async getDocumentsByType(type) {
        return Array.from(this.documents.values())
            .filter(d => d.type === type && d.status === 'ACTIVE');
    }
    
    async archiveDocument(documentId) {
        const document = this.documents.get(documentId);
        if (!document) throw new Error('Document not found');
        
        document.status = 'ARCHIVED';
        document.updatedAt = new Date();
        
        this.emit('document_archived', document);
        return document;
    }
    
    async searchDocuments(searchTerm) {
        const term = searchTerm.toLowerCase();
        return Array.from(this.documents.values())
            .filter(d => 
                d.title.toLowerCase().includes(term) ||
                d.tags.some(tag => tag.toLowerCase().includes(term)) ||
                d.category.toLowerCase().includes(term)
            );
    }
}

// ========================================
// EXPRESS ROUTES
// ========================================

function createOperationalRouter(hrService, crmService, procurementService, projectService, documentService) {
    const express = require('express');
    const router = express.Router();
    
    // ========== HR Routes ==========
    router.post('/hr/employees', async (req, res) => {
        try {
            const employee = await hrService.hireEmployee(req.body);
            res.json(employee);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.post('/hr/leave-requests', async (req, res) => {
        try {
            const leave = await hrService.submitLeaveRequest(req.body);
            res.json(leave);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.post('/hr/leave-requests/:leaveId/approve', async (req, res) => {
        try {
            const { approverId } = req.body;
            const leave = await hrService.approveLeave(req.params.leaveId, approverId);
            res.json(leave);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.post('/hr/attendance', async (req, res) => {
        try {
            const attendance = await hrService.recordAttendance(req.body);
            res.json(attendance);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.get('/hr/payroll/:year/:month', async (req, res) => {
        const payroll = await hrService.getPayroll(parseInt(req.params.month) - 1, parseInt(req.params.year));
        res.json(payroll);
    });
    
    // ========== CRM Routes ==========
    router.post('/crm/customers', async (req, res) => {
        try {
            const customer = await crmService.addCustomer(req.body);
            res.json(customer);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.post('/crm/tickets', async (req, res) => {
        try {
            const ticket = await crmService.createSupportTicket(req.body);
            res.json(ticket);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.put('/crm/tickets/:ticketId/status', async (req, res) => {
        try {
            const { status, resolution } = req.body;
            const ticket = await crmService.updateTicketStatus(req.params.ticketId, status, resolution);
            res.json(ticket);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.get('/crm/sla-metrics', async (req, res) => {
        const metrics = await crmService.getSLAMetrics();
        res.json(metrics);
    });
    
    // ========== Procurement Routes ==========
    router.post('/procurement/vendors', async (req, res) => {
        try {
            const vendor = await procurementService.addVendor(req.body);
            res.json(vendor);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.post('/procurement/purchase-orders', async (req, res) => {
        try {
            const po = await procurementService.createPurchaseOrder(req.body);
            res.json(po);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.post('/procurement/purchase-orders/:poId/approve', async (req, res) => {
        try {
            const { approverId } = req.body;
            const po = await procurementService.approvePurchaseOrder(req.params.poId, approverId);
            res.json(po);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.post('/procurement/inventory', async (req, res) => {
        try {
            const item = await procurementService.addInventoryItem(req.body);
            res.json(item);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.get('/procurement/reorder-report', async (req, res) => {
        const report = await procurementService.getReorderReport();
        res.json(report);
    });
    
    // ========== Project Management Routes ==========
    router.post('/projects', async (req, res) => {
        try {
            const project = await projectService.createProject(req.body);
            res.json(project);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.post('/projects/tasks', async (req, res) => {
        try {
            const task = await projectService.createTask(req.body);
            res.json(task);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.put('/projects/tasks/:taskId/status', async (req, res) => {
        try {
            const { status, completedBy } = req.body;
            const task = await projectService.updateTaskStatus(req.params.taskId, status, completedBy);
            res.json(task);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.get('/projects/dashboard', async (req, res) => {
        const dashboard = await projectService.getProjectDashboard();
        res.json(dashboard);
    });
    
    // ========== Document Management Routes ==========
    router.post('/documents', async (req, res) => {
        try {
            const document = await documentService.uploadDocument(req.body);
            res.json(document);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.get('/documents/department/:department', async (req, res) => {
        const documents = await documentService.getDocumentsByDepartment(req.params.department);
        res.json(documents);
    });
    
    router.get('/documents/search', async (req, res) => {
        const { q } = req.query;
        const results = await documentService.searchDocuments(q);
        res.json(results);
    });
    
    return router;
}

// ========================================
// MAIN INITIALIZATION
// ========================================

async function initializeOperationalSystem() {
    const hrService = new HRService();
    const crmService = new CRMService();
    const procurementService = new ProcurementService();
    const projectService = new ProjectManagementService();
    const documentService = new DocumentManagementService();
    
    console.log('[OperationalERP] ✅ System initialized');
    console.log('[OperationalERP] Modules: HR, CRM, Procurement, Projects, Documents');
    
    return {
        hrService,
        crmService,
        procurementService,
        projectService,
        documentService
    };
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
    HRService,
    CRMService,
    ProcurementService,
    ProjectManagementService,
    DocumentManagementService,
    createOperationalRouter,
    initializeOperationalSystem,
    OPERATIONAL_CONFIG,
    Employee,
    Customer,
    SupportTicket,
    PurchaseOrder,
    Vendor,
    InventoryItem,
    Project,
    Task,
    Document
};
