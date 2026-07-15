import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const failures = []
const declarationKinds = new Map([
  [ts.SyntaxKind.InterfaceDeclaration, 'interface'],
  [ts.SyntaxKind.TypeAliasDeclaration, 'type'],
  [ts.SyntaxKind.EnumDeclaration, 'enum'],
  [ts.SyntaxKind.ClassDeclaration, 'class'],
])
const forbiddenNames = new Set([
  'constants.ts',
  'entities.ts',
  'format.ts',
  'helpers.ts',
  'models.ts',
  'types.ts',
  'utils.ts',
  'validation.ts',
])
const focusedFunctionFile = /\.(builder|factory|formatter|hook|parser|permission|role|util|validator)\.ts$/
const exportlessEntryFiles = new Set(['main.tsx', 'setupTests.ts', 'vite-env.d.ts'])

function walkDirectories(directory, directories = []) {
  directories.push(directory)
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) walkDirectories(path.join(directory, entry.name), directories)
  }
  return directories
}

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(target, files)
    else if (/\.tsx?$/.test(entry.name)) files.push(target)
  }
  return files
}

function containsJsx(node) {
  let found = false
  function visit(child) {
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) found = true
    if (!found) ts.forEachChild(child, visit)
  }
  visit(node)
  return found
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
}

function fail(file, sourceFile, node, message) {
  failures.push(`${file}:${lineOf(sourceFile, node)} ${message}`)
}

function declarationFileName(name) {
  if (name.startsWith('OAuth')) return `oauth${name.slice(5)}`
  return `${name.charAt(0).toLowerCase()}${name.slice(1)}`
}

function hasExportModifier(node) {
  return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false
}

function exportedCallables(sourceFile) {
  const callables = []
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && hasExportModifier(statement)) callables.push(statement)
    if (!ts.isVariableStatement(statement) || !hasExportModifier(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (
        declaration.initializer
        && (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
      ) {
        callables.push(declaration)
      }
    }
  }
  return callables
}

function exportedSymbols(sourceFile) {
  const symbols = []
  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement)) {
      symbols.push(statement)
      continue
    }
    if (ts.isExportDeclaration(statement)) {
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        symbols.push(...statement.exportClause.elements)
      } else {
        symbols.push(statement)
      }
      continue
    }
    if (!hasExportModifier(statement)) continue
    if (ts.isVariableStatement(statement)) symbols.push(...statement.declarationList.declarations)
    else symbols.push(statement)
  }
  return symbols
}

for (const directory of walkDirectories('src')) {
  if (!fs.existsSync(path.join(directory, 'index.ts'))) {
    failures.push(`${directory}:1 every frontend directory must contain index.ts`)
  }
  if (!fs.existsSync(path.join(directory, 'index.css'))) {
    failures.push(`${directory}:1 every frontend directory must contain index.css`)
  }
}

for (const file of walk('src')) {
  const basename = path.basename(file)
  const testFile = basename.includes('.test.') || basename.includes('.spec.')
  const declarationFile = basename.match(/^(.+)\.(interface|type|enum|class)\.ts$/)
  const sourceFile = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

  if (!testFile && (forbiddenNames.has(basename) || basename.endsWith('-utils.ts'))) {
    failures.push(`${file}:1 catch-all frontend file name is forbidden`)
  }

  if (basename === 'index.tsx') {
    failures.push(`${file}:1 React implementations must use a named .tsx file with an index.ts barrel`)
  }

  if (!testFile && basename === 'index.ts') {
    for (const statement of sourceFile.statements) {
      if (!ts.isExportDeclaration(statement)) {
        fail(file, sourceFile, statement, 'index.ts files may contain only explicit export declarations')
      }
    }
  }

  if (!testFile && basename !== 'index.ts' && !exportlessEntryFiles.has(basename)) {
    const exports = exportedSymbols(sourceFile)
    if (exports.length !== 1) {
      failures.push(`${file}:1 named frontend files must export exactly one symbol; found ${exports.length}`)
    }
    for (const statement of sourceFile.statements) {
      if (ts.isExportDeclaration(statement)) {
        fail(file, sourceFile, statement, 're-exports are allowed only in index.ts')
      }
    }
  }

  if (!testFile && focusedFunctionFile.test(basename)) {
    const callables = exportedCallables(sourceFile)
    if (callables.length !== 1) {
      failures.push(`${file}:1 focused function files must export exactly one callable`)
    }
  }

  const declarations = sourceFile.statements.filter((statement) => declarationKinds.has(statement.kind))
  if (declarationFile) {
    if (declarations.length !== 1) failures.push(`${file}:1 contract files must contain exactly one named declaration`)
    else {
      const declaration = declarations[0]
      const expectedKind = declarationFile[2]
      const actualKind = declarationKinds.get(declaration.kind)
      if (actualKind !== expectedKind) fail(file, sourceFile, declaration, `file suffix .${expectedKind}.ts does not match ${actualKind} declaration`)
      const expectedName = declarationFile[1]
      const actualName = declaration.name?.text
      if (actualName && declarationFileName(actualName) !== expectedName) {
        fail(file, sourceFile, declaration, `declaration ${actualName} does not match file name ${declarationFile[1]}`)
      }
    }
  }

  if (testFile || !file.endsWith('.tsx')) continue

  for (const declaration of declarations) {
    fail(file, sourceFile, declaration, 'named contracts and entities are forbidden in React modules')
  }

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.body && !containsJsx(statement.body)) {
      fail(file, sourceFile, statement, 'top-level non-rendering functions must live in a hook or focused utility module')
    }
    if (ts.isFunctionDeclaration(statement) && statement.parameters[0]?.type && ts.isTypeLiteralNode(statement.parameters[0].type)) {
      fail(file, sourceFile, statement.parameters[0].type, 'component props must use an isolated interface')
    }
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue
      if (containsJsx(declaration.initializer) || declaration.name.text.endsWith('Styled')) continue
      if (
        ts.isCallExpression(declaration.initializer)
        && ts.isIdentifier(declaration.initializer.expression)
        && declaration.initializer.expression.text === 'lazy'
      ) continue
      fail(file, sourceFile, declaration, 'top-level non-rendering values must live in a focused constant or utility module')
    }
  }
}

if (failures.length) {
  console.error(`Frontend structure check failed with ${failures.length} violation(s):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Frontend structure check passed')
