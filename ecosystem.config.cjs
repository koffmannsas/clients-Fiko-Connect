module.exports = {
  apps: [
    {
      name: "fiko-connect",
      script: "./node_modules/.bin/tsx",
      args: "server.ts",
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
