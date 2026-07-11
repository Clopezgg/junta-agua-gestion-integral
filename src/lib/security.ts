export type Permission=
 'users.manage'|'roles.manage'|'subscribers.read'|'subscribers.create'|'subscribers.update'|
 'tariffs.read'|'tariffs.manage'|'obligations.read'|'obligations.manage'|'debt.override'|
 'payments.read'|'payments.create'|'payments.void'|'cash.manage'|
 'expenses.read'|'expenses.create'|'expenses.approve'|'expenses.confirm'|'finance.read'|'bank.manage'|
 'reports.read'|'reports.export'|'integrations.read'|'integrations.manage'|
 'operations.read'|'operations.manage'|'inventory.read'|'inventory.manage'|
 'budget.read'|'budget.manage'|'assets.read'|'assets.manage'|'maintenance.manage'|
 'audit.read'|'settings.read'|'settings.manage'|'backups.read'|'backups.manage'|'communications.send'|'ocr.use'|'map.read';
const all:Permission[]=['users.manage','roles.manage','subscribers.read','subscribers.create','subscribers.update','tariffs.read','tariffs.manage','obligations.read','obligations.manage','debt.override','payments.read','payments.create','payments.void','cash.manage','expenses.read','expenses.create','expenses.approve','expenses.confirm','finance.read','bank.manage','reports.read','reports.export','integrations.read','integrations.manage','operations.read','operations.manage','inventory.read','inventory.manage','budget.read','budget.manage','assets.read','assets.manage','maintenance.manage','audit.read','settings.read','settings.manage','backups.read','backups.manage','communications.send','ocr.use','map.read'];
export const rolePermissions:Record<string,Permission[]>={
 superadmin:all,
 admin:all.filter(p=>!['roles.manage','backups.manage'].includes(p)),
 secretary:['subscribers.read','subscribers.create','subscribers.update','tariffs.read','obligations.read','payments.read','payments.create','cash.manage','expenses.read','expenses.create','reports.read','communications.send','ocr.use','map.read','budget.read','assets.read'],
 treasurer:['subscribers.read','tariffs.read','obligations.read','payments.read','payments.create','cash.manage','expenses.read','expenses.create','expenses.approve','expenses.confirm','finance.read','bank.manage','reports.read','reports.export','communications.send','map.read','budget.read','budget.manage','assets.read'],
 auditor:['subscribers.read','tariffs.read','obligations.read','payments.read','expenses.read','finance.read','reports.read','reports.export','audit.read','backups.read','map.read','budget.read','assets.read'],
 member:['subscribers.read','tariffs.read','obligations.read','reports.read','map.read','budget.read','assets.read'],
 technician:['subscribers.read','obligations.read','operations.read','operations.manage','inventory.read','inventory.manage','map.read','assets.read','assets.manage','maintenance.manage']
};
