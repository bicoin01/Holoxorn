// server.js - Backend for Holoxorn AI
// Enables saving conversations, authentication, and file uploads

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not supported'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter
});

// Simple JSON database
const DATA_FILE = path.join(__dirname, 'database.json');

// Initialize database
function initDatabase() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      users: [],
      conversations: [],
      messages: [],
      files: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

function readDatabase() {
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(data);
}

function writeDatabase(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

initDatabase();

// ============ API ROUTES ============

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', message: 'Holoxorn API is running!' });
});

// Send message to AI
app.post('/api/chat', (req, res) => {
  const { message, userId, sessionId } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message not provided' });
  }
  
  // Simulate AI response (can integrate with OpenAI later)
  const responses = [
    `🤖 Holoxorn AI: "${message}" - Successfully processed! How can I help?`,
    `✨ AI Core: Message received. Neural analysis complete.`,
    `🧠 Holoxorn: Thank you for your message. Neural networks optimized.`,
    `⚡ Interface active: "${message.substring(0, 50)}" processed.`
  ];
  
  const aiResponse = responses[Math.floor(Math.random() * responses.length)];
  
  // Save conversation
  const db = readDatabase();
  const conversation = {
    id: Date.now(),
    userId: userId || 'anonymous',
    sessionId: sessionId || Date.now().toString(),
    userMessage: message,
    aiResponse: aiResponse,
    timestamp: new Date().toISOString()
  };
  
  db.conversations.push(conversation);
  writeDatabase(db);
  
  res.json({ 
    response: aiResponse,
    conversationId: conversation.id,
    timestamp: conversation.timestamp
  });
});

// Get conversation history
app.get('/api/conversations/:userId', (req, res) => {
  const { userId } = req.params;
  const db = readDatabase();
  const userConversations = db.conversations.filter(c => c.userId === userId);
  res.json({ conversations: userConversations });
});

// Delete conversation
app.delete('/api/conversations/:id', (req, res) => {
  const conversationId = parseInt(req.params.id);
  const db = readDatabase();
  
  const conversationIndex = db.conversations.findIndex(c => c.id === conversationId);
  if (conversationIndex === -1) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  db.conversations.splice(conversationIndex, 1);
  writeDatabase(db);
  
  res.json({ success: true, message: 'Conversation deleted successfully' });
});

// File upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const fileData = {
    id: Date.now(),
    originalName: req.file.originalname,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
    path: `/uploads/${req.file.filename}`,
    uploadedAt: new Date().toISOString()
  };
  
  const db = readDatabase();
  db.files.push(fileData);
  writeDatabase(db);
  
  res.json({
    success: true,
    file: fileData,
    message: 'File uploaded successfully!'
  });
});

// List all files
app.get('/api/files', (req, res) => {
  const db = readDatabase();
  res.json({ files: db.files });
});

// Delete file
app.delete('/api/files/:id', (req, res) => {
  const fileId = parseInt(req.params.id);
  const db = readDatabase();
  
  const fileIndex = db.files.findIndex(f => f.id === fileId);
  if (fileIndex === -1) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  const file = db.files[fileIndex];
  const filePath = path.join(__dirname, file.path);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  
  db.files.splice(fileIndex, 1);
  writeDatabase(db);
  
  res.json({ success: true, message: 'File deleted successfully' });
});

// User registration
app.post('/api/register', (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  const db = readDatabase();
  
  // Check if user already exists
  const existingUser = db.users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  // Create new user (simple - no password hashing for demo)
  const newUser = {
    id: Date.now(),
    email: email,
    name: name || email.split('@')[0],
    password: password, // In production, hash this!
    createdAt: new Date().toISOString()
  };
  
  db.users.push(newUser);
  writeDatabase(db);
  
  res.json({ 
    success: true, 
    user: { id: newUser.id, email: newUser.email, name: newUser.name },
    message: 'User registered successfully'
  });
});

// User login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  const db = readDatabase();
  const user = db.users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.json({ 
    success: true, 
    user: { id: user.id, email: user.email, name: user.name },
    message: 'Login successful'
  });
});

// Get user stats
app.get('/api/stats/:userId', (req, res) => {
  const { userId } = req.params;
  const db = readDatabase();
  
  const userConversations = db.conversations.filter(c => c.userId === userId);
  const userFiles = db.files.filter(f => f.userId === userId);
  
  res.json({
    stats: {
      totalConversations: userConversations.length,
      totalFiles: userFiles.length,
      lastActive: userConversations.length > 0 ? userConversations[userConversations.length - 1].timestamp : null
    }
  });
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Holoxorn API Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${path.join(__dirname, 'uploads')}`);
  console.log(`💾 Database file: ${DATA_FILE}`);
});
