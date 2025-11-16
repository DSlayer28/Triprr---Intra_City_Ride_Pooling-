const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const RIDERS_FILE = path.join(DATA_DIR, 'riders.json');
const PASSENGERS_FILE = path.join(DATA_DIR, 'passengers.json');

// Initialize data directory and files
async function initializeData() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Check if files exist, create if not
    try {
      await fs.access(RIDERS_FILE);
    } catch {
      await fs.writeFile(RIDERS_FILE, JSON.stringify([]));
    }
    
    try {
      await fs.access(PASSENGERS_FILE);
    } catch {
      await fs.writeFile(PASSENGERS_FILE, JSON.stringify([]));
    }
    
    console.log('✅ Data files initialized');
  } catch (error) {
    console.error('Error initializing data:', error);
  }
}

// Helper functions to read/write data
async function readData(file) {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data:', error);
    return [];
  }
}

async function writeData(file, data) {
  try {
    await fs.writeFile(file, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing data:', error);
  }
}

// Matching algorithm
function calculateMatch(source1, dest1, source2, dest2) {
  const s1 = source1.toLowerCase();
  const d1 = dest1.toLowerCase();
  const s2 = source2.toLowerCase();
  const d2 = dest2.toLowerCase();
  
  const sourceMatch = s1.includes(s2) || s2.includes(s1);
  const destMatch = d1.includes(d2) || d2.includes(d1);
  
  if (sourceMatch && destMatch) return 0; // Perfect match
  if (sourceMatch || destMatch) return 1;  // Partial match
  return 5; // No match
}

// Routes

// GET all riders
app.get('/api/riders', async (req, res) => {
  const riders = await readData(RIDERS_FILE);
  res.json(riders);
});

// GET all passengers
app.get('/api/passengers', async (req, res) => {
  const passengers = await readData(PASSENGERS_FILE);
  res.json(passengers);
});

// POST new rider
app.post('/api/riders', async (req, res) => {
  const { name, source, destination, sourceLng, sourceLat, destLng, destLat, time } = req.body;
  
  if (!name || !source || !destination || !time) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  const riders = await readData(RIDERS_FILE);
  const newRider = {
    id: Date.now(),
    name,
    source,
    destination,
    sourceLng,
    sourceLat,
    destLng,
    destLat,
    time,
    createdAt: new Date().toISOString()
  };
  
  riders.push(newRider);
  await writeData(RIDERS_FILE, riders);
  
  res.status(201).json(newRider);
});

// POST new passenger
app.post('/api/passengers', async (req, res) => {
  const { name, source, destination, sourceLng, sourceLat, destLng, destLat, time } = req.body;
  
  if (!name || !source || !destination || !time) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  const passengers = await readData(PASSENGERS_FILE);
  const newPassenger = {
    id: Date.now(),
    name,
    source,
    destination,
    sourceLng,
    sourceLat,
    destLng,
    destLat,
    time,
    createdAt: new Date().toISOString()
  };
  
  passengers.push(newPassenger);
  await writeData(PASSENGERS_FILE, passengers);
  
  res.status(201).json(newPassenger);
});

// GET matches for a rider
app.get('/api/matches/rider', async (req, res) => {
  const { source, destination } = req.query;
  
  if (!source || !destination) {
    return res.status(400).json({ error: 'Source and destination are required' });
  }
  
  const passengers = await readData(PASSENGERS_FILE);
  const matches = passengers.filter(passenger => {
    const matchScore = calculateMatch(
      source,
      destination,
      passenger.source,
      passenger.destination
    );
    return matchScore <= 2; // Threshold for matching
  });
  
  res.json(matches);
});

// GET matches for a passenger
app.get('/api/matches/passenger', async (req, res) => {
  const { source, destination } = req.query;
  
  if (!source || !destination) {
    return res.status(400).json({ error: 'Source and destination are required' });
  }
  
  const riders = await readData(RIDERS_FILE);
  const matches = riders.filter(rider => {
    const matchScore = calculateMatch(
      rider.source,
      rider.destination,
      source,
      destination
    );
    return matchScore <= 2; // Threshold for matching
  });
  
  res.json(matches);
});

// DELETE rider
app.delete('/api/riders/:id', async (req, res) => {
  const riders = await readData(RIDERS_FILE);
  const filteredRiders = riders.filter(r => r.id !== parseInt(req.params.id));
  await writeData(RIDERS_FILE, filteredRiders);
  res.json({ message: 'Rider deleted' });
});

// DELETE passenger
app.delete('/api/passengers/:id', async (req, res) => {
  const passengers = await readData(PASSENGERS_FILE);
  const filteredPassengers = passengers.filter(p => p.id !== parseInt(req.params.id));
  await writeData(PASSENGERS_FILE, filteredPassengers);
  res.json({ message: 'Passenger deleted' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
async function startServer() {
  await initializeData();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
  });
}

startServer();