const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

// 1. We need to add `const [realPortfolio, setRealPortfolio] = useState<any[]>([]);`
// Let's insert it after `const [isAboutOpen, setIsAboutOpen] = useState(false);`
if (!code.includes('setRealPortfolio')) {
  code = code.replace(
    'const [isAboutOpen, setIsAboutOpen] = useState(false);',
    'const [isAboutOpen, setIsAboutOpen] = useState(false);\n  const [realPortfolio, setRealPortfolio] = useState<any[]>([]);'
  );
}

// 2. We need the SEED_PORTFOLIO_DATA
const seedDataStr = `
const SEED_PORTFOLIO_DATA = [
  { symbol: 'CASH', value: 67500.00, category: 'Cash', quantity: 1, institution: 'Schwab' },
  { symbol: 'AAPL', value: 45000.00, category: 'Stock', quantity: 200, institution: 'Schwab' },
  { symbol: 'QQQ', value: 85000.00, category: 'ETF', quantity: 150, institution: 'Schwab' }
];
`;

if (!code.includes('SEED_PORTFOLIO_DATA')) {
  code = code.replace(
    'export default function Home() {',
    seedDataStr + '\nexport default function Home() {'
  );
}

// 3. Add `const activeData = realPortfolio.length > 0 ? realPortfolio : SEED_PORTFOLIO_DATA;`
// We need to calculate Net Worth, Cash, etc. based on `activeData`.
// Let's replace the hardcoded values in Dashboard Containers with dynamic ones based on activeData.

fs.writeFileSync('src/app/page.tsx', code);
