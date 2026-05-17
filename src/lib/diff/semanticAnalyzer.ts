"use client";

import * as ts from "typescript";

export interface SemanticChange {
  type:
    | "function-signature"
    | "variable-rename"
    | "initialization"
    | "refactor"
    | "addition"
    | "deletion";
  description: string;
  scope: string; // e.g., "userInfo()"
  oldValue?: string;
  newValue?: string;
  lineNumber?: number;
}

/**
 * Analyze semantic changes between old and new code using AST
 */
export function analyzeSemanticChanges(
  oldCode: string,
  newCode: string,
  language: string,
): SemanticChange[] {
  const changes: SemanticChange[] = [];

  // Only use AST for TypeScript/JavaScript
  if (["typescript", "javascript"].includes(language)) {
    try {
      const oldAST = parseCode(oldCode, language);
      const newAST = parseCode(newCode, language);

      if (oldAST && newAST) {
        changes.push(...compareASTs(oldAST, newAST, oldCode, newCode));
      }
    } catch (error) {
      // Fallback to pattern matching if AST parsing fails
      console.warn(
        "AST parsing failed, falling back to pattern matching:",
        error,
      );
    }
  }

  // Fallback to pattern matching for other languages or if AST fails
  if (changes.length === 0) {
    changes.push(...analyzeWithPatterns(oldCode, newCode, language));
  }

  return changes;
}

/**
 * Parse code into AST using TypeScript compiler API
 */
function parseCode(code: string, language: string): any {
  if (!code.trim() || !ts) return null;

  try {
    const scriptKind =
      language === "typescript" ? ts.ScriptKind.TS : ts.ScriptKind.JS;

    return ts.createSourceFile(
      "temp.ts",
      code,
      ts.ScriptTarget.Latest,
      true,
      scriptKind,
    );
  } catch {
    return null;
  }
}

/**
 * Compare two ASTs and detect semantic changes
 */
function compareASTs(
  oldAST: any,
  newAST: any,
  _oldCode: string,
  _newCode: string,
): SemanticChange[] {
  if (!ts) return [];
  const changes: SemanticChange[] = [];

  const oldFunctions = extractFunctions(oldAST);
  const newFunctions = extractFunctions(newAST);

  // Compare functions
  for (const newFunc of newFunctions) {
    const oldFunc = oldFunctions.find((f) => f.name === newFunc.name);

    if (!oldFunc) {
      // New function
      changes.push({
        type: "addition",
        description: `Function "${newFunc.name}" added`,
        scope: `${newFunc.name}()`,
        lineNumber: newFunc.lineNumber,
      });
    } else {
      // Compare function signatures
      const oldParams = oldFunc.parameters.map((p) => p.name);
      const newParams = newFunc.parameters.map((p) => p.name);

      if (JSON.stringify(oldParams) !== JSON.stringify(newParams)) {
        changes.push({
          type: "function-signature",
          description: `Function signature changed: "${newFunc.name}"`,
          scope: `${newFunc.name}()`,
          oldValue: oldParams.join(", "),
          newValue: newParams.join(", "),
          lineNumber: newFunc.lineNumber,
        });
      }
    }
  }

  // Detect deleted functions
  for (const oldFunc of oldFunctions) {
    if (!newFunctions.find((f) => f.name === oldFunc.name)) {
      changes.push({
        type: "deletion",
        description: `Function "${oldFunc.name}" removed`,
        scope: `${oldFunc.name}()`,
        lineNumber: oldFunc.lineNumber,
      });
    }
  }

  // Detect variable renames and initializations
  const oldVars = extractVariables(oldAST);
  const newVars = extractVariables(newAST);

  // Look for variable renames (same pattern, different name)
  for (const newVar of newVars) {
    const similarOldVar = oldVars.find(
      (v) => v.value === newVar.value && v.name !== newVar.name,
    );

    if (similarOldVar) {
      changes.push({
        type: "variable-rename",
        description: `Variable renamed: "${similarOldVar.name}" → "${newVar.name}"`,
        scope: newVar.scope || "global",
        oldValue: similarOldVar.name,
        newValue: newVar.name,
        lineNumber: newVar.lineNumber,
      });
    }

    // Detect new initializations (telemetry, config, etc.)
    if (newVar.name.includes("telemetry") || newVar.name.includes("config")) {
      const wasNew = !oldVars.find((v) => v.name === newVar.name);
      if (wasNew) {
        changes.push({
          type: "initialization",
          description: `${capitalize(newVar.name)} initialization added`,
          scope: newVar.scope || "global",
          lineNumber: newVar.lineNumber,
        });
      }
    }
  }

  return changes;
}

interface FunctionInfo {
  name: string;
  parameters: Array<{ name: string; type?: string }>;
  lineNumber: number;
}

function extractFunctions(ast: ts.SourceFile): FunctionInfo[] {
  const functions: FunctionInfo[] = [];

  function visit(node: any) {
    if (!ts) return;
    // Function declarations
    if (ts.isFunctionDeclaration(node) && node.name) {
      const params = node.parameters.map((p) => ({
        name: p.name && ts.isIdentifier(p.name) ? p.name.text : "unknown",
        type: p.type
          ? node
              .getText()
              .substring(p.type.pos - node.pos, p.type.end - node.pos)
          : undefined,
      }));

      const lineNumber = ast.getLineAndCharacterOfPosition(node.pos).line + 1;

      functions.push({
        name: node.name.text,
        parameters: params,
        lineNumber,
      });
    }

    // Arrow functions assigned to variables
    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach((decl) => {
        if (decl.name && ts.isIdentifier(decl.name) && decl.initializer) {
          if (
            ts.isArrowFunction(decl.initializer) ||
            ts.isFunctionExpression(decl.initializer)
          ) {
            const func = decl.initializer;
            const params = func.parameters.map((p) => ({
              name: p.name && ts.isIdentifier(p.name) ? p.name.text : "unknown",
            }));

            const lineNumber =
              ast.getLineAndCharacterOfPosition(decl.pos).line + 1;

            functions.push({
              name: decl.name.text,
              parameters: params,
              lineNumber,
            });
          }
        }
      });
    }

    if (ts) ts.forEachChild(node, visit);
  }

  visit(ast);
  return functions;
}

interface VariableInfo {
  name: string;
  value?: string;
  scope?: string;
  lineNumber: number;
}

function extractVariables(ast: any): VariableInfo[] {
  if (!ts) return [];
  const variables: VariableInfo[] = [];

  function visit(node: any, scope: string = "global") {
    if (
      ts?.isVariableDeclaration(node) &&
      node.name &&
      ts.isIdentifier(node.name)
    ) {
      const varName = node.name.text;
      let value: string | undefined;

      if (node.initializer) {
        if (ts.isStringLiteral(node.initializer)) {
          value = node.initializer.text;
        } else if (ts.isNumericLiteral(node.initializer)) {
          value = node.initializer.text;
        } else if (ts.isObjectLiteralExpression(node.initializer)) {
          value = "object";
        }
      }

      const lineNumber = ast.getLineAndCharacterOfPosition(node.pos).line + 1;

      variables.push({
        name: varName,
        value,
        scope,
        lineNumber,
      });
    }

    // Update scope for function declarations
    if (ts?.isFunctionDeclaration(node) && node.name) {
      const newScope = node.name.text;
      if (ts) ts.forEachChild(node, (child) => visit(child, newScope));
    } else {
      if (ts) ts.forEachChild(node, (child) => visit(child, scope));
    }
  }

  visit(ast);
  return variables;
}

/**
 * Fallback pattern matching for non-TypeScript languages or when AST fails
 */
function analyzeWithPatterns(
  oldCode: string,
  newCode: string,
  language: string,
): SemanticChange[] {
  const changes: SemanticChange[] = [];
  const oldLines = oldCode.split("\n");
  const newLines = newCode.split("\n");

  // Detect function signature changes (basic regex)
  const funcPatterns: Record<string, RegExp> = {
    typescript: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
    javascript: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
    python: /^def\s+(\w+)\s*\(([^)]*)\)/,
  };

  const pattern = funcPatterns[language];
  if (pattern) {
    const oldFuncs = new Map<string, string>();
    const newFuncs = new Map<string, string>();

    oldLines.forEach((line, _idx) => {
      const match = line.match(pattern);
      if (match) {
        oldFuncs.set(match[1], match[2] || "");
      }
    });

    newLines.forEach((line, idx) => {
      const match = line.match(pattern);
      if (match) {
        newFuncs.set(match[1], match[2] || "");
        const oldParams = oldFuncs.get(match[1]);
        if (oldParams !== undefined && oldParams !== match[2]) {
          changes.push({
            type: "function-signature",
            description: `Function signature changed: "${match[1]}"`,
            scope: `${match[1]}()`,
            oldValue: oldParams,
            newValue: match[2] || "",
            lineNumber: idx + 1,
          });
        } else if (oldParams === undefined) {
          changes.push({
            type: "addition",
            description: `Function "${match[1]}" added`,
            scope: `${match[1]}()`,
            lineNumber: idx + 1,
          });
        }
      }
    });
  }

  // Detect initialization patterns
  const initPatterns = [
    /(?:const|let|var)\s+(\w*telemetry\w*)\s*=/,
    /(?:const|let|var)\s+(\w*config\w*)\s*=/,
    /(?:const|let|var)\s+(\w*init\w*)\s*=/,
  ];

  newLines.forEach((line, idx) => {
    for (const pattern of initPatterns) {
      const match = line.match(pattern);
      if (match) {
        const varName = match[1];
        const wasInOld = oldLines.some((l) => l.includes(varName));
        if (!wasInOld) {
          changes.push({
            type: "initialization",
            description: `${capitalize(varName)} initialization added`,
            scope: "global",
            lineNumber: idx + 1,
          });
        }
      }
    }
  });

  return changes;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Extract semantic scope from a change group
 */
export function extractSemanticScope(group: {
  title: string;
  type: string;
  changes: Array<{ left?: { content: string }; right?: { content: string } }>;
}): string {
  // Try to find function/class name from changes
  for (const change of group.changes) {
    const content = change.right?.content || change.left?.content || "";

    // Match function patterns
    const funcMatch = content.match(
      /(?:function|const|let|var)\s+(\w+)\s*[=(]/,
    );
    if (funcMatch) {
      return `${funcMatch[1]}()`;
    }

    // Match class patterns
    const classMatch = content.match(/class\s+(\w+)/);
    if (classMatch) {
      return classMatch[1];
    }
  }

  // Fallback to group title
  return group.title;
}
