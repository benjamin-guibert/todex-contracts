const Migrations = artifacts.require('Migrations')

module.exports = ((deployer) => {
  deployer.deploy(Migrations)
}) as Truffle.Migration

export {}
