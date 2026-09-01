export type Permission=
 'users.manage'|'roles.manage'|'subscribers.read'|'subscribers.create'|'subscribers.update'|
 'tariffs.read'|'tariffs.manage'|'obligations.read'|'obligations.manage'|'debt.override'|
 'payments.read'|'payments.create'|'payments.void'|'cash.manage'|
 'expenses.read'|'expenses.create'|'expenses.approve'|'expenses.confirm'|'finance.read'|'bank.manage'|
 'reports.read'|'reports.export'|'integrations.read'|'integrations.manage'|'updates.read'|
 'operations.read'|'operations.manage'|'inventory.read'|'inventory.manage'|
 'metering.read'|'metering.manage'|'imports.read'|'imports.manage'|
 'budget.read'|'budget.manage'|'assets.read'|'assets.manage'|'maintenance.manage'|
 'document_templates.read'|'document_templates.manage'|'benefits.read'|'benefits.manage'|
 'portal.manage'|'service_catalog.read'|'service_catalog.manage'|
 'audit.read'|'settings.read'|'settings.manage'|'backups.read'|'backups.manage'|'backups.read_metadata'|'backups.create'|'backups.download'|'backups.restore'|'communications.send'|'communications.read'|'ocr.use'|'map.read'|'water.read'|'water.manage'|'governance.read'|'governance.manage'|'compliance.read'|'compliance.manage'|'calendar.manage';
const all:Permission[]=['users.manage','roles.manage','subscribers.read','subscribers.create','subscribers.update','tariffs.read','tariffs.manage','obligations.read','obligations.manage','debt.override','payments.read','payments.create','payments.void','cash.manage','expenses.read','expenses.create','expenses.approve','expenses.confirm','finance.read','bank.manage','reports.read','reports.export','integrations.read','integrations.manage','updates.read','operations.read','operations.manage','inventory.read','inventory.manage','metering.read','metering.manage','imports.read','imports.manage','budget.read','budget.manage','assets.read','assets.manage','maintenance.manage','document_templates.read','document_templates.manage','benefits.read','benefits.manage','portal.manage','service_catalog.read','service_catalog.manage','audit.read','settings.read','settings.manage','backups.read','backups.manage','backups.read_metadata','backups.create','backups.download','backups.restore','communications.send','communications.read','ocr.use','map.read','water.read','water.manage','governance.read','governance.manage','compliance.read','compliance.manage','calendar.manage'];
export const rolePermissions:Record<string,Permission[]>={
 superadmin:all,
 admin:all.filter(p=>!['roles.manage','backups.manage'].includes(p)),
 secretary:['subscribers.read','subscribers.create','subscribers.update','tariffs.read','obligations.read','payments.read','payments.create','cash.manage','expenses.read','expenses.create','reports.read','communications.send','ocr.use','map.read','budget.read','assets.read','metering.read','imports.read','imports.manage','document_templates.read','benefits.read','service_catalog.read'],
 treasurer:['subscribers.read','tariffs.read','obligations.read','payments.read','payments.create','cash.manage','expenses.read','expenses.create','expenses.approve','expenses.confirm','finance.read','bank.manage','reports.read','reports.export','communications.send','map.read','budget.read','budget.manage','assets.read','metering.read','metering.manage','imports.read','document_templates.read','benefits.read','service_catalog.read'],
 auditor:['subscribers.read','tariffs.read','obligations.read','payments.read','expenses.read','finance.read','reports.read','reports.export','audit.read','backups.read','backups.read_metadata','map.read','budget.read','assets.read','metering.read','imports.read','integrations.read','updates.read','document_templates.read','benefits.read','service_catalog.read'],
 member:['subscribers.read','tariffs.read','obligations.read','reports.read','map.read','budget.read','assets.read','metering.read'],
 technician:['subscribers.read','obligations.read','operations.read','operations.manage','inventory.read','inventory.manage','map.read','assets.read','assets.manage','maintenance.manage','metering.read','metering.manage','imports.read','imports.manage','service_catalog.read']
};
