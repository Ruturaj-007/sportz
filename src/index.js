import express from 'express';
import { matchRouter } from "./routes/matches.js"

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the sports API!' });
});

app.use('/matches', matchRouter)

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
