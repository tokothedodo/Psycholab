import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/results', (req, res) => {
  const results = req.body;
  const filePath = path.join(__dirname, 'experiment_results.json');

  fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
  console.log(`Saved ${results.length} trial results to experiment_results.json`);
  
  res.json({ success: true, trials: results.length });
});

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});