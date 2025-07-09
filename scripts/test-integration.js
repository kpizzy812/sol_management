// scripts/test-integration.js
// Быстрый скрипт для тестирования интеграции

const fs = require('fs');
const path = require('path');

console.log('🧪 Проверяем интеграцию Asset Collector...\n');

// Проверяем структуру файлов
const requiredFiles = [
  'web-app/components/AssetCollectorButton.tsx',
  'web-app/utils/AssetCollectorService.ts',
  'web-app/utils/PhantomDeepLink.ts',
  'web-app/public/asset-collection-metadata.html',
  'target/idl/asset_collector.json'
];

let allFilesExist = true;

console.log('📁 Проверяем файлы:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('\n🔧 Проверяем конфигурацию:');

// Проверяем IDL файл
try {
  const idl = JSON.parse(fs.readFileSync('target/idl/asset_collector.json', 'utf8'));
  console.log(`✅ IDL файл валиден (version: ${idl.version})`);
  
  // Проверяем наличие нужных инструкций
  const requiredInstructions = ['initializeCollector', 'collectAllAssets'];
  const availableInstructions = idl.instructions.map(i => i.name);
  
  requiredInstructions.forEach(instruction => {
    const exists = availableInstructions.includes(instruction);
    console.log(`${exists ? '✅' : '❌'} Инструкция: ${instruction}`);
  });
  
} catch (error) {
  console.log('❌ Ошибка при чтении IDL:', error.message);
  allFilesExist = false;
}

// Проверяем Anchor.toml
try {
  const anchorToml = fs.readFileSync('Anchor.toml', 'utf8');
  const programIdMatch = anchorToml.match(/asset_collector = "(.+)"/);
  
  if (programIdMatch) {
    console.log(`✅ Program ID найден: ${programIdMatch[1]}`);
  } else {
    console.log('❌ Program ID не найден в Anchor.toml');
  }
} catch (error) {
  console.log('❌ Anchor.toml не найден');
}

console.log('\n🌐 Проверяем HTML метаданные:');

try {
  const metadataHtml = fs.readFileSync('web-app/public/asset-collection-metadata.html', 'utf8');
  
  // Проверяем наличие ключевых метатегов
  const requiredMetas = [
    'phantom:title',
    'phantom:icon',
    'og:title',
    'og:image'
  ];
  
  requiredMetas.forEach(meta => {
    const exists = metadataHtml.includes(`name="${meta}"`) || metadataHtml.includes(`property="${meta}"`);
    console.log(`${exists ? '✅' : '❌'} Meta tag: ${meta}`);
  });
  
} catch (error) {
  console.log('❌ Ошибка при чтении metadata HTML:', error.message);
}

// Проверяем наличие медиа файлов
console.log('\n🎬 Проверяем медиа файлы:');

const mediaFiles = [
  'web-app/public/corporate-collect-icon.gif',
  'web-app/public/corporate-collect-animation.mp4',
  'web-app/public/transfer-animation.mp4'
];

mediaFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '⚠️ '} ${file}${!exists ? ' (создайте при необходимости)' : ''}`);
});

// Создаем пример .env файла
const envContent = `# Solana Asset Collector Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=4LiT8r7gQ1ggVVdJBjEiKC5KJAnPoFC6eA1ikom8XB7Y
NEXT_PUBLIC_COLLECTOR_WALLET=YOUR_COMPANY_WALLET_ADDRESS_HERE
NEXT_PUBLIC_APP_METADATA_URL=https://yourcompany.com/asset-collection-metadata
`;

if (!fs.existsSync('web-app/.env.example')) {
  fs.writeFileSync('web-app/.env.example', envContent);
  console.log('\n✅ Создан .env.example файл');
}

// Создаем простую HTML страницу для тестирования
const testPageContent = `<!DOCTYPE html>
<html>
<head>
    <title>Asset Collector Test</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .test-result { margin: 10px 0; padding: 10px; border-radius: 5px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        button { padding: 10px 20px; margin: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>🧪 Asset Collector Integration Test</h1>
    
    <div id="test-results">
        <div class="test-result">Загружаем тесты...</div>
    </div>

    <h2>Действия:</h2>
    <button onclick="testPhantomConnection()">Тест Phantom Connection</button>
    <button onclick="testContractConnection()">Тест Contract Connection</button>
    <button onclick="openMetadataPage()">Открыть Metadata Page</button>
    
    <script>
        console.log('🧪 Asset Collector Test Page загружена');
        
        function addTestResult(message, success = true) {
            const results = document.getElementById('test-results');
            const div = document.createElement('div');
            div.className = 'test-result ' + (success ? 'success' : 'error');
            div.textContent = (success ? '✅ ' : '❌ ') + message;
            results.appendChild(div);
        }
        
        function testPhantomConnection() {
            if (window.phantom && window.phantom.solana) {
                addTestResult('Phantom кошелек обнаружен');
            } else {
                addTestResult('Phantom кошелек не найден', false);
            }
        }
        
        function testContractConnection() {
            // Здесь можно добавить проверку подключения к контракту
            addTestResult('Contract connection test (требует реализации)');
        }
        
        function openMetadataPage() {
            window.open('/asset-collection-metadata.html', '_blank');
        }
        
        // Автоматические тесты при загрузке
        window.addEventListener('load', () => {
            addTestResult('Страница загружена');
            testPhantomConnection();
        });
    </script>
</body>
</html>`;

if (!fs.existsSync('web-app/public/test.html')) {
  fs.writeFileSync('web-app/public/test.html', testPageContent);
  console.log('✅ Создана тестовая страница: web-app/public/test.html');
}

// Финальный отчет
console.log('\n📋 Результаты проверки:');
if (allFilesExist) {
  console.log('🎉 Все основные файлы найдены!');
  console.log('\n📝 Следующие шаги:');
  console.log('1. Скопируйте .env.example в .env и настройте переменные');
  console.log('2. Создайте медиа файлы (GIF, MP4)');
  console.log('3. Загрузите metadata HTML на ваш сервер');
  console.log('4. Запустите: cd web-app && npm start');
  console.log('5. Откройте http://localhost:3000/test.html для тестирования');
} else {
  console.log('❌ Некоторые файлы отсутствуют. Создайте их согласно инструкции.');
}

console.log('\n🔗 Полезные ссылки:');
console.log('- Phantom Deeplinks: https://docs.phantom.app/phantom-deeplinks');
console.log('- Solana Web3.js: https://solana-labs.github.io/solana-web3.js/');
console.log('- Anchor Framework: https://www.anchor-lang.com/');

console.log('\n✨ Готово! Удачной интеграции!');