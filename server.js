const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ dest: 'uploads/' });
const DATA_DIR = path.join(__dirname, 'uploads', 'datasets');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function datasetPath(id) {
  return path.join(DATA_DIR, `${id}.json`);
}

app.post('/api/upload-csv', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const csvText = fs.readFileSync(req.file.path, 'utf8');
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const id = crypto.randomBytes(6).toString('hex');
    const dataset = {
      id,
      createdAt: new Date().toISOString(),
      rows: records
    };

    fs.writeFileSync(datasetPath(id), JSON.stringify(dataset, null, 2));
    fs.unlinkSync(req.file.path);

    res.json({
      id,
      rows: records.length,
      shareUrl: `/visualization.html?id=${id}`,
      apiUrl: `/api/datasets/${id}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/datasets/:id', (req, res) => {
  const file = datasetPath(req.params.id);

  if (!fs.existsSync(file)) {
    return res.status(404).json({ error: 'Dataset not found.' });
  }

  const dataset = JSON.parse(fs.readFileSync(file, 'utf8'));
  res.json(dataset);
});

app.patch('/api/datasets/:id', (req, res) => {
  const file = datasetPath(req.params.id);

  if (!fs.existsSync(file)) {
    return res.status(404).json({ error: 'Dataset not found.' });
  }

  const current = JSON.parse(fs.readFileSync(file, 'utf8'));
  current.rows = req.body.rows || current.rows;
  current.updatedAt = new Date().toISOString();

  fs.writeFileSync(file, JSON.stringify(current, null, 2));
  res.json(current);
});


app.listen(PORT, () => {
  console.log(`Capstone visualization API running on port ${PORT}`);
});