module.exports = {
  apps: [{
    name: "fiko-connect-preprod",
    script: "npx",
    args: "tsx server.ts",
    instances: 2,
    exec_mode: "cluster",
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "development",
      PORT: 4001,
      KCG_CONTEXT: "preprod"
    }
  }, {
    name: "fiko-connect-prod",
    script: "node",
    args: "dist/server.js",
    instances: "max",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 4000,
      KCG_CONTEXT: "production"
    }
  }]
};
