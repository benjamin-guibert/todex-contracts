// eslint-disable-next-line @typescript-eslint/no-var-requires
require('ts-node').register({
  files: true,
})

module.exports = {
  test_file_extension_regexp: /.*\.ts$/,
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*',
    },
  },
  compilers: {
    solc: {
      version: '>=0.8.0 <0.9.0',
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  db: {
    enabled: false,
  },
}
