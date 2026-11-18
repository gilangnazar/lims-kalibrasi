const bcrypt = require("bcryptjs");

async function generateHash(password) {
  const hash = await bcrypt.hash(password, 10);
  console.log("Password:", password);
  console.log("Bcrypt Hash:", hash);
}

generateHash("admin");
