"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const api_1 = __importDefault(require("./routes/api"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '20mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '20mb' }));
// Static file serving for uploads & generated PDF reports
app.use('/storage', express_1.default.static(path_1.default.join(process.cwd(), 'storage')));
// Mount API Router
app.use('/api', api_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'LegalLens Backend', timestamp: new Date().toISOString() });
});
// Start Server
app.listen(PORT, () => {
    console.log(`LegalLens Backend Service running on port ${PORT}`);
    console.log(`API Base URL: http://localhost:${PORT}/api`);
});
