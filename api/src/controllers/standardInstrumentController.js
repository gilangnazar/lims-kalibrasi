const pool = require("../config/database");

// GET ALL STANDARD INSTRUMENTS
exports.getAllStandardInstruments = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [instruments] = await connection.query(
      "SELECT id, nama_alat, merk, serial_number, status FROM standard_instruments",
    );
    connection.release();

    res.status(200).json({
      status: 200,
      error: false,
      message: "Standard instruments fetched successfully",
      data: instruments,
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

// GET SINGLE STANDARD INSTRUMENT
exports.getStandardInstrumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    const [instruments] = await connection.query(
      "SELECT id, nama_alat, merk, serial_number, status FROM standard_instruments WHERE id = ?",
      [id],
    );
    connection.release();

    if (instruments.length === 0) {
      return res.status(404).json({
        status: 404,
        error: true,
        message: "Standard instrument not found",
      });
    }

    res.status(200).json({
      status: 200,
      error: false,
      message: "Standard instrument fetched successfully",
      data: instruments[0],
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

// CREATE STANDARD INSTRUMENT
exports.createStandardInstrument = async (req, res) => {
  try {
    const { nama_alat, merk, serial_number, status } = req.body;

    // Validate input
    if (!nama_alat || !merk || !serial_number || !status) {
      return res.status(400).json({
        status: 400,
        error: true,
        message: "Nama alat, merk, serial number, and status are required",
      });
    }

    // Validate status
    const validStatus = ["aktif", "tidak aktif"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({
        status: 400,
        error: true,
        message: "Status must be aktif or tidak aktif",
      });
    }

    const connection = await pool.getConnection();

    // Check if serial number exists
    const [existingInstruments] = await connection.query(
      "SELECT id FROM standard_instruments WHERE serial_number = ?",
      [serial_number],
    );

    if (existingInstruments.length > 0) {
      connection.release();
      return res.status(400).json({
        status: 400,
        error: true,
        message: "Serial number sudah terdaftar",
      });
    }

    // Insert instrument
    const [result] = await connection.query(
      "INSERT INTO standard_instruments (nama_alat, merk, serial_number, status) VALUES (?, ?, ?, ?)",
      [nama_alat, merk, serial_number, status],
    );

    connection.release();

    res.status(201).json({
      status: 201,
      error: false,
      message: "Standard instrument created successfully",
      data: {
        id: result.insertId,
        nama_alat,
        merk,
        serial_number,
        status,
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

// UPDATE STANDARD INSTRUMENT
exports.updateStandardInstrument = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_alat, merk, serial_number, status } = req.body;

    // Validate status if provided
    if (status) {
      const validStatus = ["aktif", "tidak aktif"];
      if (!validStatus.includes(status)) {
        return res.status(400).json({
          status: 400,
          error: true,
          message: "Status must be aktif or tidak aktif",
        });
      }
    }

    const connection = await pool.getConnection();

    // Check if instrument exists
    const [instruments] = await connection.query(
      "SELECT id FROM standard_instruments WHERE id = ?",
      [id],
    );

    if (instruments.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 404,
        error: true,
        message: "Standard instrument not found",
      });
    }

    // Check if serial number is unique (if being updated)
    if (serial_number) {
      const [existingInstruments] = await connection.query(
        "SELECT id FROM standard_instruments WHERE serial_number = ? AND id != ?",
        [serial_number, id],
      );

      if (existingInstruments.length > 0) {
        connection.release();
        return res.status(400).json({
          status: 400,
          error: true,
          message: "Serial number sudah terdaftar",
        });
      }
    }

    // Build update query
    let updateQuery = "UPDATE standard_instruments SET";
    let updateValues = [];

    if (nama_alat) {
      updateQuery += " nama_alat = ?,";
      updateValues.push(nama_alat);
    }

    if (merk) {
      updateQuery += " merk = ?,";
      updateValues.push(merk);
    }

    if (serial_number) {
      updateQuery += " serial_number = ?,";
      updateValues.push(serial_number);
    }

    if (status) {
      updateQuery += " status = ?,";
      updateValues.push(status);
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
      message: "Standard instrument updated successfully",
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

// DELETE STANDARD INSTRUMENT
exports.deleteStandardInstrument = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    // Check if instrument exists
    const [instruments] = await connection.query(
      "SELECT id FROM standard_instruments WHERE id = ?",
      [id],
    );

    if (instruments.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 404,
        error: true,
        message: "Standard instrument not found",
      });
    }

    // Delete instrument
    await connection.query("DELETE FROM standard_instruments WHERE id = ?", [
      id,
    ]);
    connection.release();

    res.status(200).json({
      status: 200,
      error: false,
      message: "Standard instrument deleted successfully",
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
