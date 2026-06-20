module.exports = {
  apps : [{
    name: "my-frontend",
    script: "npx.cmd",
    args: "serve -s build -l 3000",
    interpreter: "none", // Dòng này cực kỳ quan trọng trên Windows
    env: {
      NODE_ENV: "production"
    }
  }]
}