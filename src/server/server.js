const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new sqlite3.Database('./tennis_reservations.db');

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT, is_admin INTEGER)");
  db.run("CREATE TABLE IF NOT EXISTS reservations (id INTEGER PRIMARY KEY AUTOINCREMENT, court INTEGER, date TEXT, time TEXT, user_id INTEGER)");
});

// Authentication middleware
function authenticateToken(req, res, next) {
  const token = req.header('Authorization');
  if (!token) return res.sendStatus(401);

  jwt.verify(token, 'your_jwt_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// User registration
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Check if user already exists
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, existingUser) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // If user doesn't exist, create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username, password, is_admin) VALUES (?, ?, 0)', [username, hashedPassword], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to create user' });
      }
      res.status(201).json({ message: 'User created successfully' });
    });
  });
});

// User login
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, 'your_jwt_secret');
    res.json({ token });
  });
});

// Create reservation
app.post('/reservations', authenticateToken, (req, res) => {
  const { court, date, time } = req.body;
  const userId = req.user.id;

  db.run('INSERT INTO reservations (court, date, time, user_id) VALUES (?, ?, ?, ?)', [court, date, time, userId], (err) => {
    if (err) {
      return res.status(400).json({ error: 'Unable to create reservation' });
    }
    res.status(201).json({ message: 'Reservation created successfully' });
  });
});

// Get user's reservations
app.get('/reservations', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all('SELECT * FROM reservations WHERE user_id = ?', [userId], (err, rows) => {
    if (err) {
      return res.status(400).json({ error: 'Unable to fetch reservations' });
    }
    res.json(rows);
  });
});

// Update reservation
app.put('/reservations/:id', authenticateToken, (req, res) => {
  const { court, date, time } = req.body;
  const userId = req.user.id;
  const reservationId = req.params.id;

  db.run('UPDATE reservations SET court = ?, date = ?, time = ? WHERE id = ? AND user_id = ?', [court, date, time, reservationId, userId], (err) => {
    if (err) {
      return res.status(400).json({ error: 'Unable to update reservation' });
    }
    res.json({ message: 'Reservation updated successfully' });
  });
});

// Delete reservation
app.delete('/reservations/:id', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const reservationId = req.params.id;

  db.run('DELETE FROM reservations WHERE id = ? AND user_id = ?', [reservationId, userId], (err) => {
    if (err) {
      return res.status(400).json({ error: 'Unable to delete reservation' });
    }
    res.json({ message: 'Reservation deleted successfully' });
  });
});

// Admin: Get all reservations
app.get('/admin/reservations', authenticateToken, (req, res) => {
  if (!req.user.is_admin) {
    return res.sendStatus(403);
  }

  db.all('SELECT * FROM reservations', (err, rows) => {
    if (err) {
      return res.status(400).json({ error: 'Unable to fetch reservations' });
    }
    res.json(rows);
  });
});

// Admin: Delete any reservation
app.delete('/admin/reservations/:id', authenticateToken, (req, res) => {
  if (!req.user.is_admin) {
    return res.sendStatus(403);
  }

  const reservationId = req.params.id;

  db.run('DELETE FROM reservations WHERE id = ?', [reservationId], (err) => {
    if (err) {
      return res.status(400).json({ error: 'Unable to delete reservation' });
    }
    res.json({ message: 'Reservation deleted successfully' });
  });
});

// Admin login
app.post('/admin/login', (req, res) => {
  console.log('Admin login route hit');
  const { username, password } = req.body;
  console.log('Admin login attempt:', username, password);

  if ((username === 'admin' && password === 'admin') || (username === 'rod' && password === 'admin')) {
    const token = jwt.sign({ id: 0, username: username, is_admin: true }, 'your_jwt_secret');
    res.json({ token });
  } else {
    res.status(400).json({ error: 'Invalid admin credentials' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});