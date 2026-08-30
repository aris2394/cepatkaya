const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/components/Dashboard.tsx',
  'src/components/ExpenseLogger.tsx',
  'src/components/CategoryModal.tsx',
  'src/components/IncomeModal.tsx',
  'src/components/ui/BudgetGauge.tsx',
  'src/pages/login.astro'
];

filesToUpdate.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(/from-indigo-500 to-violet-600/g, 'from-rose-500 to-pink-600');
    content = content.replace(/hover:from-indigo-400 hover:to-violet-500/g, 'hover:from-rose-400 hover:to-pink-500');
    content = content.replace(/from-indigo-500 to-violet-500/g, 'from-rose-500 to-pink-500');
    content = content.replace(/indigo-600/g, 'rose-600');
    content = content.replace(/indigo-500/g, 'rose-500');
    content = content.replace(/indigo-400/g, 'rose-400');
    content = content.replace(/indigo-300/g, 'rose-300');
    content = content.replace(/violet-600/g, 'pink-600');
    content = content.replace(/violet-500/g, 'pink-500');
    
    // Also change the SVG icon in Dashboard to use the image logo
    content = content.replace(
      /<div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center font-black text-base tracking-wider shadow-lg shadow-rose-500\/30">\s*CK\s*<\/div>/g,
      '<img src="/logo.png" alt="CepatKaya Logo" class="w-11 h-11 object-contain drop-shadow-[0_4px_8px_rgba(244,63,94,0.3)]" />'
    );
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
