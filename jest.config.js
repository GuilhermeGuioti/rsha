const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

const customJestConfig = {
  testEnvironment: "node",
  // Suítes compartilham um único Postgres e isolam via TRUNCATE no beforeEach;
  // rodar em paralelo faz uma suíte apagar dados que outra está usando.
  maxWorkers: 1,
};

module.exports = createJestConfig(customJestConfig);
