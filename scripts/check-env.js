const fs = require('fs');
const path = require('path');

// Busca todos los archivos .env en el proyecto
function findEnvFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findEnvFiles(filePath));
    } else if (file.match(/^\.env(\..+)?$/)) {
      results.push(filePath);
    }
  });
  return results;
}

// Extrae las claves de un archivo .env
function getEnvKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => line.split('=')[0].trim());
}

// Compara las claves entre archivos
function compareEnvKeys(envFiles) {
  const allKeys = new Set();
  const fileKeys = {};
  envFiles.forEach(file => {
    const keys = getEnvKeys(file);
    fileKeys[file] = keys;
    keys.forEach(key => allKeys.add(key));
  });

  // Detecta claves faltantes
  const missing = {};
  Object.entries(fileKeys).forEach(([file, keys]) => {
    const missingKeys = Array.from(allKeys).filter(key => !keys.includes(key));
    if (missingKeys.length > 0) {
      missing[file] = missingKeys;
    }
  });
  return missing;
}

// Genera el mensaje para el PR
function generateMessage(missing) {
  if (Object.keys(missing).length === 0) {
    return '✅ Todos los archivos .env tienen las mismas variables.';
  }
  let msg = '⚠️ Variables faltantes en archivos .env:\n';
  Object.entries(missing).forEach(([file, keys]) => {
    msg += `\n- **${path.basename(file)}** falta: ${keys.join(', ')}`;
  });
  return msg;
}

// MAIN
const envFiles = findEnvFiles(process.cwd());
const missing = compareEnvKeys(envFiles);
const message = generateMessage(missing);

// Guarda el resultado para el workflow
fs.writeFileSync('env-check-result.txt', message);
console.log(message);
