type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export declare const logger: {
    debug(module: string, message: string, ...args: unknown[]): void;
    info(module: string, message: string, ...args: unknown[]): void;
    warn(module: string, message: string, ...args: unknown[]): void;
    error(module: string, message: string, ...args: unknown[]): void;
};
export type { LogLevel };
//# sourceMappingURL=logger.d.ts.map