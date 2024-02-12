const app = require('./app');
const PORT = process.env.DATABASE_PORT || 5000; // Fallback to 5000 if DATABASE_PORT is not defined

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
