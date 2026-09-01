// Tipos para el gate estático del Enterprise Rebuild (implementación en enterprise-gates.mjs).
export function checkLegacyCssImports(): string[];
export function checkLegacyClasses(): string[];
export function checkUuidForms(): string[];
export function runAllGates(): string[];
export function listSourceFiles(dir?: string): string[];
export function readAllowlist(name: string): Set<string>;
export const LEGACY_CSS: string[];
export const CSS_IMPORT_ALLOWED: Set<string>;
