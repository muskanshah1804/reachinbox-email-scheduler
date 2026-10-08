import { Router } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'CSV file is required',
      });
    }

    const text = req.file.buffer.toString('utf-8');

    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        error: 'CSV file is empty',
      });
    }

    const rows = records.map((row: any) => ({
      email: String(
        row.email ||
        row.Email ||
        row.recipient ||
        row.Recipient ||
        ''
      ).trim(),
      name: String(
        row.name ||
        row.Name ||
        ''
      ).trim(),
    }));

    const valid = rows.filter((row) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)
    );

    const invalid = rows.filter(
      (row) =>
        row.email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)
    );

    return res.json({
      total: rows.length,
      valid: valid.length,
      invalid: invalid.length,
      recipients: valid,
      invalidRows: invalid,
    });
  } catch (error: any) {
    console.error('CSV parsing error:', error);

    return res.status(400).json({
      error: error?.message || 'Invalid CSV file',
    });
  }
});

export default router;