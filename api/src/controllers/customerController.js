const pool = require("../config/database");

// GET ALL CUSTOMERS
exports.getCustomers = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [customers] = await connection.query(
      "SELECT id, company_name, pic_name, email, phone, address FROM customers",
    );
    connection.release();

    res.status(200).json({
      status: 200,
      error: false,
      message: "Customers fetched successfully",
      data: customers,
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

// GET SINGLE CUSTOMER
exports.getCustomersById = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    const [customers] = await connection.query(
      "SELECT id, company_name, pic_name, email, phone, address FROM customers WHERE id = ?",
      [id],
    );
    connection.release();

    if (customers.length === 0) {
      return res.status(404).json({
        status: 404,
        error: true,
        message: "Customers not found",
      });
    }

    res.status(200).json({
      status: 200,
      error: false,
      message: "Customers fetched successfully",
      data: customers[0],
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

// CREATE CUSTOMER
exports.createCustomer = async (req, res) => {
  try {
    const { company_name, pic_name, email, phone, address } = req.body;

    // Validate input
    if (!company_name || !pic_name || !email || !phone || !address) {
      return res.status(400).json({
        status: 400,
        error: true,
        message: "Company name, PIC Name, email, phone, address are required",
      });
    }

    const connection = await pool.getConnection();

    // Insert customer
    const [result] = await connection.query(
      "INSERT INTO customers (company_name, pic_name, email, phone, address) VALUES (?, ?, ?, ?, ?)",
      [company_name, pic_name, email, phone, address],
    );

    connection.release();

    res.status(201).json({
      status: 201,
      error: false,
      message: "Customer created successfully",
      data: {
        id: result.insertId,
        company_name,
        pic_name,
        email,
        phone,
        address,
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

// UPDATE CUSTOMER
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, pic_name, email, phone, address } = req.body;

    const connection = await pool.getConnection();

    // Check if customer exists
    const [customer] = await connection.query(
      "SELECT id FROM customers WHERE id = ?",
      [id],
    );

    if (customer.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 404,
        error: true,
        message: "Customer not found",
      });
    }

    // Build update query
    let updateQuery = "UPDATE customers SET";
    let updateValues = [];

    if (company_name) {
      updateQuery += " company_name = ?,";
      updateValues.push(company_name);
    }

    if (pic_name) {
      updateQuery += " pic_name = ?,";
      updateValues.push(pic_name);
    }

    if (email) {
      updateQuery += " email = ?,";
      updateValues.push(email);
    }

    if (phone) {
      updateQuery += " phone = ?,";
      updateValues.push(phone);
    }

    if (address) {
      updateQuery += " address = ?,";
      updateValues.push(address);
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
      message: "Customer updated successfully",
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

// DELETE CUSTOMER
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    // Check if instrument exists
    const [customer] = await connection.query(
      "SELECT id FROM customers WHERE id = ?",
      [id],
    );

    if (customer.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 404,
        error: true,
        message: "Customer not found",
      });
    }

    // Delete instrument
    await connection.query("DELETE FROM customers WHERE id = ?", [id]);
    connection.release();

    res.status(200).json({
      status: 200,
      error: false,
      message: "Customer deleted successfully",
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
