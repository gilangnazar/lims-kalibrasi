const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// LOGIN
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        status: 400,
        error: true,
        message: "Username dan password diperlukan",
      });
    }

    // Get connection
    const connection = await pool.getConnection();

    // Find user by username
    const [users] = await connection.query(
      "SELECT id, username, email, role, password FROM users WHERE username = ?",
      [username],
    );

    connection.release();

    // User not found
    if (users.length === 0) {
      return res.status(401).json({
        status: 401,
        error: true,
        message: "Username atau password salah",
      });
    }

    const user = users[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        status: 401,
        error: true,
        message: "Username atau password salah",
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE },
    );

    // Return success
    res.status(200).json({
      status: 200,
      error: false,
      message: "Login berhasil",
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 500,
      error: true,
      message: "Server error",
    });
  }
};

// LOGOUT (Optional - just clear token on frontend)
exports.logout = (req, res) => {
  res.status(200).json({
    status: 200,
    error: false,
    message: "Logout berhasil",
  });
};
