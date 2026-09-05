/**
 * Code Execution Runner
 * Executes student-submitted code files (JavaScript, TypeScript, Python) against custom inputs.
 * Captures console/stdout, return values, errors, and execution timing.
 */

export interface ExecutionResult {
  success: boolean;
  status: 'passed' | 'failed' | 'error';
  output: string;
  stdout: string[];
  executionTimeMs: number;
  error?: string;
}

// Global Pyodide singleton
let pyodideInstance: any = null;
let pyodideLoadingPromise: Promise<any> | null = null;

export async function getPyodide(): Promise<any> {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoadingPromise) return pyodideLoadingPromise;

  pyodideLoadingPromise = new Promise(async (resolve, reject) => {
    try {
      if (typeof window === 'undefined') {
        throw new Error('Pyodide can only run in browser environment');
      }

      if (!(window as any).loadPyodide) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
        script.async = true;
        document.head.appendChild(script);

        await new Promise((res, rej) => {
          script.onload = res;
          script.onerror = () => rej(new Error('Failed to load Pyodide WebAssembly runtime from CDN. Check network connection.'));
        });
      }

      const pyodide = await (window as any).loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
      });
      pyodideInstance = pyodide;
      resolve(pyodide);
    } catch (err) {
      pyodideLoadingPromise = null;
      reject(err);
    }
  });

  return pyodideLoadingPromise;
}

/**
 * Parses user custom input string into clean JavaScript arguments or Python expression.
 * Handles inputs like:
 *   - "nums = [2, 7, 11, 15], target = 9" -> [[2, 7, 11, 15], 9]
 *   - "[2, 7, 11, 15], 9" -> [[2, 7, 11, 15], 9]
 *   - "s = 'racecar'" -> ["racecar"]
 *   - "'hello world'" -> ["hello world"]
 */
export function parseCustomInput(inputStr: string): any[] {
  const trimmed = inputStr.trim();
  if (!trimmed) return [];

  // 1. Try keyword assignments like "nums = [1, 2], target = 3"
  if (trimmed.includes('=')) {
    try {
      // Split by commas that are NOT inside brackets or quotes
      const parts = splitTopLevelCommas(trimmed);
      const values: any[] = [];
      for (const part of parts) {
        const eqIdx = part.indexOf('=');
        if (eqIdx !== -1) {
          const valStr = part.slice(eqIdx + 1).trim();
          values.push(safeEvalJson(valStr));
        } else {
          values.push(safeEvalJson(part.trim()));
        }
      }
      return values;
    } catch {
      // fallback to standard parsing
    }
  }

  // 2. Try comma-separated arguments: "[1, 2, 3], 4"
  try {
    const parts = splitTopLevelCommas(trimmed);
    return parts.map((p) => safeEvalJson(p.trim()));
  } catch {
    return [trimmed];
  }
}

function safeEvalJson(str: string): any {
  // Normalize single quotes to double quotes for JSON parsing if valid
  try {
    return JSON.parse(str);
  } catch {}

  // Convert Python booleans/None to JSON
  const pyNormalized = str
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null');
  try {
    return JSON.parse(pyNormalized);
  } catch {}

  // Handle single-quoted strings: 'hello' -> "hello"
  if ((str.startsWith("'") && str.endsWith("'")) || (str.startsWith('"') && str.endsWith('"'))) {
    return str.slice(1, -1);
  }

  // If number
  if (!isNaN(Number(str))) {
    return Number(str);
  }

  return str;
}

function splitTopLevelCommas(str: string): string[] {
  const results: string[] = [];
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let current = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (inString) {
      current += char;
      if (char === stringChar && str[i - 1] !== '\\') {
        inString = false;
      }
    } else if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
      current += char;
    } else if (char === '[' || char === '{' || char === '(') {
      depth++;
      current += char;
    } else if (char === ']' || char === '}' || char === ')') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      results.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    results.push(current);
  }
  return results;
}

/**
 * Detects the entrypoint function name in JavaScript or Python code.
 */
function findEntrypointFunctionName(code: string, language: string): string | null {
  if (language.includes('py')) {
    const match = code.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
    return match ? match[1] : null;
  } else {
    // Look for `function foo(` or `const foo = (` or `export function foo(`
    const fnMatch = code.match(/(?:function\s+|const\s+|let\s+|var\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=\s*(?:async\s*)?\([^)]*\)\s*=>|=\s*function|\()/);
    return fnMatch ? fnMatch[1] : null;
  }
}

/**
 * Executes a code snippet against custom inputs.
 */
export async function executeCodeFile(
  code: string,
  language: string,
  customInput: string
): Promise<ExecutionResult> {
  const startTime = performance.now();
  const stdout: string[] = [];
  const langLower = (language || '').toLowerCase();

  // 1. PYTHON EXECUTION (via WebAssembly Pyodide)
  if (langLower.includes('py') || langLower === 'python') {
    try {
      const pyodide = await getPyodide();

      // Intercept Python stdout
      pyodide.setStdout({
        batched: (text: string) => {
          stdout.push(text);
        },
      });
      pyodide.setStderr({
        batched: (text: string) => {
          stdout.push(`[stderr] ${text}`);
        },
      });

      // Execute the uploaded script to define functions & classes
      await pyodide.runPythonAsync(code);

      // Find the function name
      const fnName = findEntrypointFunctionName(code, 'python');
      let returnVal: any = undefined;

      if (fnName) {
        // Format input arguments into python call
        const rawInput = customInput.trim();
        let pyCall = '';
        if (rawInput.includes('=')) {
          // Set variables first, then call function
          const assignments = splitTopLevelCommas(rawInput).map((s) => s.trim()).join('\n');
          const argNames = splitTopLevelCommas(rawInput).map((s) => s.split('=')[0].trim()).join(', ');
          pyCall = `${assignments}\n__res__ = ${fnName}(${argNames})\n__res__`;
        } else if (rawInput.length > 0) {
          pyCall = `__res__ = ${fnName}(${rawInput})\n__res__`;
        } else {
          pyCall = `__res__ = ${fnName}()\n__res__`;
        }

        returnVal = await pyodide.runPythonAsync(pyCall);
      } else {
        returnVal = 'Script executed successfully';
      }

      const duration = Math.round(performance.now() - startTime);
      const outputStr = returnVal !== undefined ? String(returnVal) : '(No return value)';

      return {
        success: true,
        status: 'passed',
        output: outputStr,
        stdout,
        executionTimeMs: duration,
      };
    } catch (pyErr: any) {
      const duration = Math.round(performance.now() - startTime);
      return {
        success: false,
        status: 'error',
        output: '',
        stdout,
        error: pyErr?.message || String(pyErr),
        executionTimeMs: duration,
      };
    }
  }

  // 2. JAVASCRIPT / TYPESCRIPT EXECUTION
  try {
    const customConsole = {
      log: (...args: any[]) => {
        stdout.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      },
      warn: (...args: any[]) => {
        stdout.push('[WARN] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      },
      error: (...args: any[]) => {
        stdout.push('[ERROR] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      },
      info: (...args: any[]) => {
        stdout.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      },
    };

    const parsedArgs = parseCustomInput(customInput);
    const fnName = findEntrypointFunctionName(code, 'javascript');

    // Strip export keywords for in-browser evaluation
    const sanitizedCode = code
      .replace(/export\s+default\s+/g, '')
      .replace(/export\s+/g, '');

    let executionScript = `
      const console = __customConsole__;
      ${sanitizedCode}
    `;

    if (fnName) {
      executionScript += `
        if (typeof ${fnName} === 'function') {
          return ${fnName}(...__args__);
        }
        return undefined;
      `;
    }

    const runner = new Function('__customConsole__', '__args__', executionScript);
    const result = runner(customConsole, parsedArgs);
    const duration = Math.round(performance.now() - startTime);

    const outputStr = result !== undefined
      ? (typeof result === 'object' ? JSON.stringify(result) : String(result))
      : '(No return value)';

    return {
      success: true,
      status: 'passed',
      output: outputStr,
      stdout,
      executionTimeMs: duration,
    };
  } catch (jsErr: any) {
    const duration = Math.round(performance.now() - startTime);
    return {
      success: false,
      status: 'error',
      output: '',
      stdout,
      error: jsErr?.message || String(jsErr),
      executionTimeMs: duration,
    };
  }
}
