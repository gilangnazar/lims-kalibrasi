const pool = require("../config/database");

// GET ALL METHODS
exports.getMethods = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [methods] = await connection.query(
      "SELECT id, nama_metode, deskripsi, parameter_schema FROM methods",
    );
    connection.release();

    res.status(200).json({
      status: 200,
      error: false,
      message: "Methods fetched successfully",
      data: methods,
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

// GET SINGLE METHOD
exports.getMethodById = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    const [method] = await connection.query(
      "SELECT id, nama_metode, deskripsi, parameter_schema FROM methods WHERE id = ?",
      [id],
    );
    connection.release();

    if (method.length === 0) {
      return res.status(404).json({
        status: 404,
        error: true,
        message: "Method not found",
      });
    }

    res.status(200).json({
      status: 200,
      error: false,
      message: "Method fetched successfully",
      data: method[0],
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

// CREATE METHOD
exports.createMethod = async (req, res) => {
  try {
    const { nama_metode, deskripsi, parameter_schema } = req.body;

    // Validate input
    if (!nama_metode || !deskripsi || !parameter_schema) {
      return res.status(400).json({
        status: 400,
        error: true,
        message: "nama_metode, deskripsi, parameter_schema are required",
      });
    }

    const parameterSchemaJson = JSON.stringify(parameter_schema);

    const connection = await pool.getConnection();

    // Insert customer
    const [result] = await connection.query(
      "INSERT INTO methods (nama_metode, deskripsi, parameter_schema) VALUES (?, ?, ?)",
      [nama_metode, deskripsi, parameterSchemaJson],
    );

    connection.release();

    res.status(201).json({
      status: 201,
      error: false,
      message: "Method created successfully",
      data: {
        id: result.insertId,
        nama_metode,
        deskripsi,
        parameter_schema,
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

// UPDATE METHOD
exports.updateMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_metode, deskripsi, parameter_schema } = req.body;

    const parameterSchemaJson = JSON.stringify(parameter_schema);

    const connection = await pool.getConnection();

    // Check if customer exists
    const [method] = await connection.query(
      "SELECT id FROM methods WHERE id = ?",
      [id],
    );

    if (method.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 404,
        error: true,
        message: "Method not found",
      });
    }

    // Build update query
    let updateQuery = "UPDATE methods SET";
    let updateValues = [];

    if (nama_metode) {
      updateQuery += " nama_metode = ?,";
      updateValues.push(nama_metode);
    }

    if (deskripsi) {
      updateQuery += " deskripsi = ?,";
      updateValues.push(deskripsi);
    }

    if (parameterSchemaJson) {
      updateQuery += " parameter_schema = ?,";
      updateValues.push(parameterSchemaJson);
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
      message: "Method updated successfully",
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

// DELETE METHOD
exports.deleteMethod = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    // Check if method exists
    const [customer] = await connection.query(
      "SELECT id FROM methods WHERE id = ?",
      [id],
    );

    if (customer.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 404,
        error: true,
        message: "Method not found",
      });
    }

    // Delete method
    await connection.query("DELETE FROM methods WHERE id = ?", [id]);
    connection.release();

    res.status(200).json({
      status: 200,
      error: false,
      message: "Method deleted successfully",
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
