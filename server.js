const app = require('./app');
const PORT = process.env.PORT || 3000; // Fallback to 5000 if DATABASE_PORT is not defined

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
