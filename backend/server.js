const express = require('express');
const cors = require('cors');
const gitRoutes = require('./routes/git');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/git', gitRoutes);

app.get('/', (req, res) => {
    res.send('Git Visualizer Backend is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
