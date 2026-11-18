const pool = require("../config/database");
const bcrypt = require("bcryptjs");

const validRoles = [
  "Admin",
  "Finance",
  "Admin Teknisi",
  "Manajer Teknis",
  "Teknisi",
];

// GET ALL USERS
exports.getAllUsers = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [users] = await connection.query(
      "SELECT id, username, email, role FROM users",
    );
    connection.release();

    res.status(200).json({
      status: 200,
      error: false,
      message: "Users fetched successfully",
      data: users,
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

// GET SINGLE USER
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    const [users] = await connection.query(
      "SELECT id, username, email, role FROM users WHERE id = ?",
      [id],
    );
    connection.release();

    if (users.length === 0) {
      return res.status(404).json({
        status: 404,
        error: true,
        message: "User not found",
      });
    }

    res.status(200).json({
      status: 200,
      error: false,
      message: "User fetched successfully",
      data: users[0],
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

// CREATE USER
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Validate input
    if (!username || !email || !password || !role) {
      return res.status(400).json({
        status: 400,
        error: true,
        message: "Username, email, password, and role are required",
      });
    }

    // Validate role
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        status: 400,
        error: true,
        message: "Invalid role",
      });
    }

    const connection = await pool.getConnection();

    // Check if username exists
    const [existingUsers] = await connection.query(
      "SELECT id FROM users WHERE username = ?",
      [username],
    );

    if (existingUsers.length > 0) {
      connection.release();
      return res.status(400).json({
        status: 400,
        error: true,
        message: "Username sudah terdaftar",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await connection.query(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
      [username, email, hashedPassword, role],
    );

    connection.release();

    res.status(201).json({
      status: 201,
      error: false,
      message: "User created successfully",
      data: {
        id: result.insertId,
        username,
        email,
        role,
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

// UPDATE USER
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, role } = req.body;

    // Validate role if provided
    if (role) {
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          status: 400,
          error: true,
          message: "Invalid role",
        });
      }
    }

    const connection = await pool.getConnection();

    // Check if user exists
    const [users] = await connection.query(
      "SELECT id FROM users WHERE id = ?",
      [id],
    );

    if (users.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 404,
        error: true,
        message: "User not found",
      });
    }

    // Build update query
    let updateQuery = "UPDATE users SET";
    let updateValues = [];

    if (email) {
      updateQuery += " email = ?,";
      updateValues.push(email);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += " password = ?,";
      updateValues.push(hashedPassword);
    }

    if (role) {
      updateQuery += " role = ?,";
      updateValues.push(role);
    }

    // Remove trailing comma
    updateQuery = updateQuery.slice(0, -1);
    updateQuery += " WHERE id = ?";
    updateValues.push(id);

    await connection.query(updateQuery, updateValues);
    connection.release();

    res.status(200).json({
      status: 200,
      error: false,
      message: "User updated successfully",
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

// DELETE USER
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting admin user (id = 1)
    if (id === "1") {
      return res.status(400).json({
        status: 400,
        error: true,
        message: "Cannot delete admin user",
      });
    }

    const connection = await pool.getConnection();

    // Check if user exists
    const [users] = await connection.query(
      "SELECT id FROM users WHERE id = ?",
      [id],
    );

    if (users.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 404,
        error: true,
        message: "User not found",
      });
    }

    // Delete user
    await connection.query("DELETE FROM users WHERE id = ?", [id]);
    connection.release();

    res.status(200).json({
      status: 200,
      error: false,
      message: "User deleted successfully",
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
