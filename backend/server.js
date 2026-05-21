import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'node:dns';
import multer from 'multer';
import pdfParse from 'pdf-parse-new';
import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';

// Router DNS often fails Atlas host lookups; use public resolvers for MongoDB only
dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Fail fast instead of hanging 10s on buffered ops when Atlas is unreachable
mongoose.set('bufferCommands', false);

let isDbConnected = false;
const memoryHistory = [];
let memoryIdCounter = 1;

const connectMongo = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            family: 4,
        });
        isDbConnected = true;
        console.log('🍃 MongoDB Database Engine Connected Successfully!');
    } catch (err) {
        isDbConnected = false;
        console.error('❌ MongoDB Connection Database Error:', err.message);
        console.warn('⚠️ Running with in-memory history fallback until Atlas is reachable.');

        if (/authentication failed|bad auth/i.test(err.message)) {
            console.warn('   Auth fix: Atlas → Database Access → reset DB user password → update MONGO_URI in .env');
        } else if (/whitelist|ECONNREFUSED|ENOTFOUND|ReplicaSetNoPrimary/i.test(err.message)) {
            console.warn('   Network fix: Atlas → Network Access → confirm 0.0.0.0/0 active, or use mobile hotspot/VPN once.');
        }
    }
};

connectMongo();

const buildMockAnalysis = (fileName) => `### 📋 Summary & Context
Automated mock analysis for "${fileName}". Document parsed successfully in MOCK MODE while database connectivity is being verified.

### ⚖️ Core Legal Issues & Clauses
No live Gemini inference in MOCK MODE. Replace with real scan once cloud API is available.

### ⚠️ Key Risks & Critical Obligations
Database persistence may be deferred if MongoDB credentials or network routing are not configured for this machine.

### 📅 Detected Deadlines & Timeline Alerts
No explicit deadlines detected in mock output. Re-run analysis after MongoDB connection is restored.`;

const persistAnalysis = async ({ fileName, extractedTextSnippet, aiAnalysisRaw }) => {
    if (isDbConnected && mongoose.connection.readyState === 1) {
        const doc = new LegalAnalysis({ fileName, extractedTextSnippet, aiAnalysisRaw });
        await doc.save();
        return { stored: true, storage: 'mongodb', record: doc };
    }

    const memRecord = {
        _id: `mem-${memoryIdCounter++}`,
        fileName,
        extractedTextSnippet,
        aiAnalysisRaw,
        timestamp: new Date(),
    };
    memoryHistory.unshift(memRecord);
    return { stored: true, storage: 'memory', record: memRecord };
};

const findHistoryList = async () => {
    if (isDbConnected && mongoose.connection.readyState === 1) {
        return LegalAnalysis.find()
            .sort({ timestamp: -1 })
            .select('fileName timestamp _id');
    }
    return memoryHistory.map(({ _id, fileName, timestamp }) => ({ _id, fileName, timestamp }));
};

const findHistoryById = async (id) => {
    if (isDbConnected && mongoose.connection.readyState === 1) {
        return LegalAnalysis.findById(id);
    }
    return memoryHistory.find((item) => item._id === id) || null;
};

const deleteHistoryById = async (id) => {
    if (isDbConnected && mongoose.connection.readyState === 1) {
        return LegalAnalysis.findByIdAndDelete(id);
    }
    const index = memoryHistory.findIndex((item) => item._id === id);
    if (index === -1) return null;
    const [removed] = memoryHistory.splice(index, 1);
    return removed;
};
// 📝 2. Mongoose Schema Specification for Document History Data
const LegalAnalysisSchema = new mongoose.Schema({
    fileName: { type: String, required: true },
    extractedTextSnippet: { type: String, required: true },
    aiAnalysisRaw: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const LegalAnalysis = mongoose.model('LegalAnalysis', LegalAnalysisSchema);

// Google Gen AI Client Configuration
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const upload = multer({ storage: multer.memoryStorage() });
const USE_MOCK_AI = false;

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildAnalysisPrompt = (extractedText) => `You are an expert AI-Powered Legal Document Analysis Tool built on a modern MERN SaaS stack. 
Analyze the provided legal document text with deep NLP understanding and structure your response strictly into these four high-fidelity sections with professional precision:

1. ### 📋 Summary & Context
Provide a comprehensive summary of the document, the parties involved, and the background context.

2. ### ⚖️ Core Legal Issues & Clauses
Detail the primary legal arguments, contractual parameters, constitutional codes, or procedural conflicts discovered.

3. ### ⚠️ Key Risks & Critical Obligations
Analyze potential risk indicators, liability loops, hidden clauses, and binding obligations that need immediate legal attention.

4. ### 📅 Detected Deadlines & Timeline Alerts
Identify and extract all implicit or explicit dates, filing deadlines, regulatory timelines, or action items mentioned within the text. If no specific dates are found, provide a generic recommended timeline based on the case type.

Do not use unnecessary markdown wrapping. Here is the raw document text:\n\n${extractedText.substring(0, 15000)}`;

const generateLegalAnalysis = async (extractedText) => {
    const prompt = buildAnalysisPrompt(extractedText);
    let lastError = null;

    for (const model of GEMINI_MODELS) {
        for (let attempt = 1; attempt <= 2; attempt += 1) {
            try {
                console.log(`🚀 Gemini request → ${model} (attempt ${attempt})`);
                const response = await ai.models.generateContent({
                    model,
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: prompt }],
                        },
                    ],
                });

                if (!response.text) {
                    throw new Error('Gemini returned an empty analysis response.');
                }

                console.log(`✅ Gemini analysis complete via ${model}`);
                return response.text;
            } catch (err) {
                lastError = err;
                const status = err?.status || err?.error?.code;
                const overloaded = status === 503 || /high demand|UNAVAILABLE/i.test(err?.message || '');

                console.warn(`⚠️ ${model} failed (attempt ${attempt}):`, err.message);

                if (overloaded && attempt < 2) {
                    await sleep(2000 * attempt);
                    continue;
                }
                break;
            }
        }
    }

    throw lastError || new Error('All Gemini models failed.');
};

app.get('/', (req, res) => {
    res.json({ message: "Legal SaaS Backend operational with MongoDB persistence layer!" });
});

// 🚀 3. Core Document Upload, Parsing, AI Generation, and Database Storage Route
app.post('/api/analyze', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded." });
        }

        console.log("⏳ Parsing PDF Content Layers...");
        const pdfData = await pdfParse(req.file.buffer);
        const extractedText = pdfData.text;

        if (!extractedText || extractedText.trim().length === 0) {
            return res.status(400).json({ error: "Could not extract text from this PDF." });
        }

        let aiAnalysisResult = "";

        if (USE_MOCK_AI) {
            console.log("⚡ [MOCK MODE] Instantly generating mock matrix data...");
            aiAnalysisResult = buildMockAnalysis(req.file.originalname);
        } else {
            aiAnalysisResult = await generateLegalAnalysis(extractedText);
        }

        console.log('💾 Caching and saving document analysis matrix...');
        const saveResult = await persistAnalysis({
            fileName: req.file.originalname,
            extractedTextSnippet: extractedText.substring(0, 1000),
            aiAnalysisRaw: aiAnalysisResult,
        });

        const storageLabel = saveResult.storage === 'mongodb'
            ? 'MongoDB securely'
            : 'in-memory fallback (MongoDB offline)';

        console.log(`🎉 Analysis record saved via ${saveResult.storage}.`);

        res.json({
            message: `Legal document processed, analyzed, and stored in ${storageLabel}!`,
            aiAnalysis: aiAnalysisResult,
            extractedText: extractedText,
            storage: saveResult.storage,
        });

    } catch (error) {
        console.error("❌ Processing Pipeline Crash Log: ", error);

        const status = error?.status || error?.error?.code;
        const overloaded = status === 503 || /high demand|UNAVAILABLE/i.test(error?.message || '');

        if (overloaded) {
            return res.status(503).json({
                error: "Gemini servers are temporarily overloaded (503). Your API key is valid — please retry in 1–2 minutes.",
                details: error.message,
            });
        }

        res.status(500).json({
            error: "Error processing or storing document analysis operations.",
            details: error.message,
        });
    }
});

// 📑 5. NEW: Fetch All Recent Document Analysis History from MongoDB
app.get('/api/history', async (req, res) => {
    try {
        const history = await findHistoryList();
        res.json(history);
    } catch (error) {
        console.error("❌ History Fetch Error: ", error);
        res.status(500).json({ error: "Failed to retrieve scanning history records." });
    }
});

// 📑 6. NEW: Fetch Specific Past Analysis Details via ID
app.get('/api/history/:id', async (req, res) => {
    try {
        const record = await findHistoryById(req.params.id);
        if (!record) {
            return res.status(404).json({ error: "Analysis record not found." });
        }
        res.json({
            aiAnalysis: record.aiAnalysisRaw,
            extractedText: record.extractedTextSnippet,
            fileName: record.fileName
        });
    } catch (error) {
        console.error("❌ Detail Fetch Error: ", error);
        res.status(500).json({ error: "Failed to fetch document details." });
    }
});

// 🗑️ 7. NEW: Delete Specific History Entry from MongoDB
app.delete('/api/history/:id', async (req, res) => {
    try {
        const deletedRecord = await deleteHistoryById(req.params.id);
        if (!deletedRecord) {
            return res.status(404).json({ error: "Record not found or already deleted." });
        }
        res.json({ message: "Analysis log entry successfully purged from database securely!" });
    } catch (error) {
        console.error("❌ Purge Operation Error: ", error);
        res.status(500).json({ error: "Failed to delete the selected history record entry." });
    }
});

app.listen(PORT, () => {
    console.log(`Server is LIVE and running on http://localhost:${PORT}`);
});