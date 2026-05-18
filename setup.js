require('dotenv').config();
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './db/clothesparis.db';

// Créer le dossier si nécessaire
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Lire et exécuter le schéma
const schema = fs.readFileSync(path.join(process.cwd(), 'schema.sql'), 'utf8');
db.exec(schema);

// ── PRODUITS INITIAUX ─────────────────────────────────────────────────
const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products (name, brand, category, price, price_old, stock, description, sizes, colors)
  VALUES (@name, @brand, @category, @price, @price_old, @stock, @description, @sizes, @colors)
`);

const products = [
  {
    name: 'ProGrid Omni 9 "Microchip"',
    brand: 'Saucony',
    category: 'sneakers',
    price: 139.99,
    price_old: 180.00,
    stock: 24,
    description: 'Running rétro avec amorti ProGrid. Mesh respirant, look Y2K.',
    sizes: JSON.stringify(['38','39','40','41','42','43','44','45']),
    colors: JSON.stringify(['gris','bleu'])
  },
  {
    name: 'GEL-1130 Homme',
    brand: 'Asics',
    category: 'sneakers',
    price: 119.90,
    price_old: 180.00,
    stock: 18,
    description: 'Running lifestyle avec amorti GEL. Confort premium au quotidien.',
    sizes: JSON.stringify(['39','40','41','42','43','44','45']),
    colors: JSON.stringify(['blanc','gris','bleu'])
  },
  {
    name: 'Air Max Plus TN',
    brand: 'Nike',
    category: 'sneakers',
    price: 99.90,
    price_old: 185.00,
    stock: 12,
    description: 'Iconic design avec amorti Air visible. Silhouette agressive.',
    sizes: JSON.stringify(['38','39','40','41','42','43','44','45']),
    colors: JSON.stringify(['blanc','bleu'])
  },
  {
    name: 'Samba OG Femme Rose/Bordeaux',
    brand: 'Adidas',
    category: 'sneakers femme',
    price: 115.00,
    price_old: 140.00,
    stock: 20,
    description: 'Icône du football urbain. Tige en cuir, semelle caoutchouc.',
    sizes: JSON.stringify(['36','37','38','39','40','41']),
    colors: JSON.stringify(['rose','bordeaux'])
  },
  {
    name: '740 Homme Blanc',
    brand: 'New Balance',
    category: 'sneakers',
    price: 109.90,
    price_old: 140.00,
    stock: 15,
    description: 'Dad shoe ultime. Tige en mesh et suède, semelle chunky.',
    sizes: JSON.stringify(['40','41','42','43','44','45']),
    colors: JSON.stringify(['blanc'])
  },
  {
    name: '9060 Blanc/Gris',
    brand: 'New Balance',
    category: 'sneakers',
    price: 149.99,
    price_old: 179.99,
    stock: 30,
    description: 'Silhouette chunky inspirée des runners Y2K. Mesh et daim, amorti ABZORB DXL.',
    sizes: JSON.stringify(['36','37','38','39','40','41','42','43','44','45']),
    colors: JSON.stringify(['blanc','gris'])
  },
  {
    name: '9060 Noir Triple Black',
    brand: 'New Balance',
    category: 'sneakers',
    price: 149.99,
    price_old: 179.99,
    stock: 22,
    description: 'Version all-black de la 9060. Style urbain maximum.',
    sizes: JSON.stringify(['36','37','38','39','40','41','42','43','44','45']),
    colors: JSON.stringify(['noir'])
  },
  {
    name: 'XT-6 Homme Blanc',
    brand: 'Salomon',
    category: 'sneakers running',
    price: 160.00,
    price_old: 200.00,
    stock: 10,
    description: 'Trail runner devenu icône urbaine. Technologie Contagrip.',
    sizes: JSON.stringify(['40','41','42','43','44','45','46']),
    colors: JSON.stringify(['blanc','gris'])
  },
  {
    name: 'UA Tech T-Shirt Reflective',
    brand: 'Under Armour',
    category: 'tshirts',
    price: 29.99,
    price_old: 40.00,
    stock: 50,
    description: 'T-shirt technique avec bandes réfléchissantes. Tissu HeatGear.',
    sizes: JSON.stringify(['S','M','L','XL','XXL']),
    colors: JSON.stringify(['noir','blanc','gris'])
  },
  {
    name: 'Bonnet Storm Launch Noir',
    brand: 'Under Armour',
    category: 'bonnets',
    price: 29.99,
    price_old: 39.99,
    stock: 40,
    description: 'Bonnet de running avec technologie Storm. Coupe-vent et imperméable.',
    sizes: JSON.stringify(['Unique']),
    colors: JSON.stringify(['noir'])
  },
  {
    name: 'Bonnet Halftime Pom Marine',
    brand: 'Under Armour',
    category: 'bonnets',
    price: 34.99,
    price_old: 44.99,
    stock: 35,
    description: 'Bonnet tricoté avec pompon. Logo brodé Under Armour.',
    sizes: JSON.stringify(['Unique']),
    colors: JSON.stringify(['marine'])
  },
  {
    name: 'Bonnet Halftime Pom Vert',
    brand: 'Under Armour',
    category: 'bonnets',
    price: 31.49,
    price_old: 44.99,
    stock: 28,
    description: 'Bonnet tricoté avec pompon. Logo brodé Under Armour.',
    sizes: JSON.stringify(['Unique']),
    colors: JSON.stringify(['vert'])
  }
];

const insertMany = db.transaction((prods) => {
  for (const p of prods) insertProduct.run(p);
});

insertMany(products);

console.log('✅ Base de données initialisée');
console.log(`✅ ${products.length} produits insérés`);
console.log(`📂 Fichier: ${path.resolve(DB_PATH)}`);

db.close();
