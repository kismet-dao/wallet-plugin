import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface LogLevels {
    [key: string]: number;
}

interface Context {
    [key: string]: any;
}

class Logger {
    private maxWidth: number;
    private LOG_LEVELS: LogLevels;
    private currentLevel: number;
    private debugMode: boolean;

    constructor() {
        this.maxWidth = 80;

        // Log level configuration
        this.LOG_LEVELS = {
            none: 0,
            error: 1,
            info: 2,
            debug: 3
        };

        // Default to info level
        this.currentLevel = this.LOG_LEVELS.info;
        this.debugMode = false;

        // Initialize log directory
    }


    public setLevel(level: string): void {
        const normalizedLevel = level.toLowerCase();
        if (this.LOG_LEVELS.hasOwnProperty(normalizedLevel)) {
            this.currentLevel = this.LOG_LEVELS[normalizedLevel];
            this.debugMode = normalizedLevel === 'debug';
        }
    }

    private shouldLog(level: string): boolean {
        return this.LOG_LEVELS[level] <= this.currentLevel;
    }

    private wrapText(text: string, maxWidth: number): string[] {
        if (text.length <= maxWidth) {
            return [text];
        }

        const lines: string[] = [];
        let remainingText = text.trim();

        while (remainingText.length > maxWidth) {
            let breakIndex = remainingText.lastIndexOf(' ', maxWidth);

            if (breakIndex === -1 || breakIndex < maxWidth / 2) {
                breakIndex = maxWidth;
            }

            lines.push(remainingText.slice(0, breakIndex).trimRight());
            remainingText = remainingText.slice(breakIndex).trimLeft();
        }

        if (remainingText) {
            lines.push(remainingText);
        }

        return lines;
    }

    private formatMessage(level: string, message: string, context: Context = {}): string {
        const timestamp = new Date().toISOString();
        const contextStr = Object.keys(context).length ?
            ` | ${JSON.stringify(context)}` : '';

        const baseMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;

        if (baseMessage.length > this.maxWidth) {
            const wrappedLines = this.wrapText(baseMessage, this.maxWidth);
            return wrappedLines.join('\n');
        }
        return baseMessage;
    }

    public info(message: string, context: Context = {}): void {
        if (this.shouldLog('info')) {
            const formatted = this.formatMessage('INFO', message, context);
            console.log(chalk.blue('ℹ'), chalk.blue(formatted));
        }
    }

    public success(message: string, context: Context = {}): void {
        if (this.shouldLog('info')) {
            const formatted = this.formatMessage('SUCCESS', message, context);
            console.log(chalk.green('✔'), chalk.green(formatted));
        }
    }

    public warn(message: string, context: Context = {}): void {
        if (this.shouldLog('info')) {
            const formatted = this.formatMessage('WARN', message, context);
            console.log(chalk.yellow('⚠'), chalk.yellow(formatted));
        }
    }

    public error(message: string, error: Error | null = null, context: Context = {}): void {
        if (this.shouldLog('error')) {
            if (error) {
                context.error = {
                    message: error.message,
                    stack: this.debugMode ? error.stack : undefined
                };
            }
            const formatted = this.formatMessage('ERROR', message, context);
            console.log(chalk.red('✖'), chalk.red(formatted));
        }
    }

    public debug(message: string, context: Context = {}): void {
        if (this.shouldLog('debug')) {
            const formatted = this.formatMessage('DEBUG', message, context);
            console.log(chalk.gray('🔍'), chalk.gray(formatted));
        }
    }

    public twitterEvent(message: string, context: Context = {}): void {
        if (this.shouldLog('info')) {
            const formatted = this.formatMessage('TWITTER', message, context);
            console.log(chalk.cyan('🐦'), chalk.cyan(formatted));
        }
    }

    public transaction(message: string, context: Context = {}): void {
        if (this.shouldLog('info')) {
            const formatted = this.formatMessage('TRANSACTION', message, context);
            console.log(chalk.magenta('💰'), chalk.magenta(formatted));
        }
    }

    public getCurrentLevel(): string {
        return Object.keys(this.LOG_LEVELS).find(
            key => this.LOG_LEVELS[key] === this.currentLevel
        ) || 'none';
    }

    public getLogLevelStatus(): { current: string, available: string[], debugMode: boolean } {
        const current = this.getCurrentLevel();
        return {
            current,
            available: Object.keys(this.LOG_LEVELS),
            debugMode: this.debugMode
        };
    }
}

// Create and export singleton instance
export const logger = new Logger();

// Export class for testing or if multiple instances are needed
export default Logger;