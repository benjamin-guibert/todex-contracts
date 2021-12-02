import truffleAssert from 'truffle-assertions'
import { ExchangeInstance, TokenInstance } from '../../types/truffle-contracts'
import { AllEvents } from '../../types/truffle-contracts/Exchange'
import { advanceBlockTime, BURN_ADDRESS as ETHER_ADDRESS } from './helpers'

const Token = artifacts.require('Token')
const Exchange = artifacts.require('Exchange')

contract('Exchange', ([deployer, feeAccount, user1, user2]: string[]) => {
  const initialSupply = '100000000000000000000000000'
  const feePercent = '10'
  const initializeToken = () => Token.new(initialSupply, { from: deployer })
  const initializeExchange = () => Exchange.new(feeAccount, feePercent, { from: deployer })

  let token: TokenInstance
  let exchange: ExchangeInstance

  describe('#feeAccount()', () => {
    let result: string

    before(async () => {
      exchange = await initializeExchange()
      result = await exchange.feeAccount()
    })

    it('should return fee account', () => result.toString().should.equal(feeAccount))
  })

  describe('#feePercent()', () => {
    let result: BN

    before(async () => {
      exchange = await initializeExchange()
      result = await exchange.feePercent()
    })

    it('should return fee percent', () => result.toString().should.equal(feePercent.toString()))
  })

  describe('#ethBalanceOf', () => {
    const value = '1000000000000000000'

    let result: BN

    context('when exists', () => {
      before(async () => {
        exchange = await initializeExchange()
        await exchange.depositEther({ value, from: user1 })
        result = await exchange.ethBalanceOf(user1)
      })

      it('should return balance', () => result.toString().should.equal(value))
    })

    context('when none', () => {
      before(async () => {
        exchange = await initializeExchange()
        result = await exchange.ethBalanceOf(user1)
      })

      it('should return balance', () => result.toString().should.equal('0'))
    })
  })

  describe('#tokenBalanceOf', () => {
    const value = '1000000000000000000'

    let result: BN

    context('when exists', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        await token.transfer(user1, value, { from: deployer })
        await token.approve(exchange.address, value, { from: user1 })
        await exchange.depositToken(token.address, value, { from: user1 })
        result = await exchange.tokenBalanceOf(token.address, user1)
      })

      it('should return balance', () => result.toString().should.equal(value))
    })

    context('when none', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        await token.transfer(user2, value, { from: deployer })
        await token.approve(exchange.address, value, { from: user2 })
        await exchange.depositToken(token.address, value, { from: user2 })
        result = await exchange.tokenBalanceOf(token.address, user1)
      })

      it('should return balance', () => result.toString().should.equal('0'))
    })

    context('when unknown', () => {
      let otherToken: TokenInstance

      before(async () => {
        token = await initializeToken()
        otherToken = await initializeToken()
        exchange = await initializeExchange()
        await token.transfer(user1, value, { from: deployer })
        await otherToken.transfer(user1, value, { from: deployer })
        await otherToken.transfer(user2, value, { from: deployer })
        await otherToken.approve(exchange.address, value, { from: user2 })
        await exchange.depositToken(otherToken.address, value, { from: user2 })

        result = await exchange.tokenBalanceOf(token.address, user1)
      })

      it('should return balance', () => result.toString().should.equal('0'))
    })
  })

  describe('#orders()', () => {
    const sellAmount = '10000000000'
    const buyAmount = '1000000000000000000'

    let timestamp: BN
    let result: {
      0: BN
      1: BN
      2: BN
      3: string
      4: string
      5: BN
      6: string
      7: BN
    }

    before(async () => {
      token = await initializeToken()
      exchange = await initializeExchange()
      await exchange.createOrder(ETHER_ADDRESS, sellAmount, token.address, sellAmount, { from: user1 })
      await exchange.createOrder(ETHER_ADDRESS, sellAmount, token.address, buyAmount, { from: user1 })
      await exchange.createOrder(ETHER_ADDRESS, buyAmount, token.address, buyAmount, { from: user1 })
      timestamp = web3.utils.toBN(await advanceBlockTime(1))
      result = await exchange.orders(2)
    })

    it('should return orders', () => {
      result[0].toString().should.equal('2')
      result[1].sub(timestamp).lte(web3.utils.toBN(1)).should.true
      result[2].toString().should.equal('0')
      result[3].should.equal(user1)
      result[4].should.equal(ETHER_ADDRESS)
      result[5].toString().should.equal(sellAmount)
      result[6].toString().should.equal(token.address)
      result[7].toString().should.equal(buyAmount)
    })
  })

  describe('#depositEther()', () => {
    const value = '1000000000000000000'

    let transaction: Truffle.TransactionResponse<AllEvents>

    before(async () => {
      exchange = await initializeExchange()
      await token.transfer(user1, value, { from: deployer })
      await exchange.depositEther({ value: '2000000000000000000', from: user1 })

      transaction = await exchange.depositEther({ value, from: user1 })
    })

    it('should increase contract Ether balance', async () => {
      const balance = await web3.eth.getBalance(exchange.address)
      balance.toString().should.eq('3000000000000000000')
    })

    it('should increase exchange user1 Ether balance', async () => {
      const balance = await exchange.ethBalanceOf(user1)
      balance.toString().should.equal('3000000000000000000')
    })

    it('should emit DepositEther', () => {
      truffleAssert.eventEmitted(transaction, 'DepositEther', {
        account: user1,
        amount: web3.utils.toBN(value),
        newBalance: web3.utils.toBN('3000000000000000000'),
      })
    })
  })

  describe('#depositToken()', () => {
    context('when success', () => {
      let otherToken: TokenInstance
      let transaction: Truffle.TransactionResponse<AllEvents>

      before(async () => {
        token = await initializeToken()
        otherToken = await initializeToken()
        exchange = await initializeExchange()
        await token.transfer(user1, '10000000000000000000', { from: deployer })
        await otherToken.transfer(user1, '10000000000000000000', { from: deployer })
        await token.transfer(user2, '10000000000000000000', { from: deployer })
        await otherToken.transfer(user2, '10000000000000000000', { from: deployer })
        await token.approve(exchange.address, '3000000000000000000', { from: user2 })
        await exchange.depositToken(token.address, '3000000000000000000', { from: user2 })
        await otherToken.approve(exchange.address, '9000000000000000000', { from: user2 })
        await exchange.depositToken(otherToken.address, '9000000000000000000', { from: user2 })
        await token.approve(exchange.address, '5000000000000000000', { from: user1 })
        await exchange.depositToken(token.address, '5000000000000000000', { from: user1 })
        await token.approve(exchange.address, '1000000000000000000', { from: user1 })

        transaction = await exchange.depositToken(token.address, '1000000000000000000', { from: user1 })
      })

      it('should increase exchange user1 token balance', async () => {
        const balance = await exchange.tokenBalanceOf(token.address, user1)
        balance.toString().should.equal('6000000000000000000')
      })

      it('should decrease user1 token balance', async () => {
        const balance = await token.balanceOf(user1)
        balance.toString().should.equal('4000000000000000000')
      })

      it('should emit DepositToken', () => {
        truffleAssert.eventEmitted(transaction, 'DepositToken', {
          account: user1,
          token: token.address,
          amount: web3.utils.toBN('1000000000000000000'),
          newBalance: web3.utils.toBN('6000000000000000000'),
        })
      })
    })

    context('when insufficient funds', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        token.transfer(user1, '4000000000000000000', { from: deployer })
        await token.approve(exchange.address, '3000000000000000000', { from: user1 })
        await exchange.depositToken(token.address, '3000000000000000000', { from: user1 })
        await token.approve(exchange.address, '2000000000000000000', { from: user1 })
      })

      it('should revert', async () =>
        await truffleAssert.reverts(
          exchange.depositToken(token.address, '2000000000000000000', { from: user1 }),
          'ERC20: transfer amount exceeds balance'
        ))
    })

    context('when transfer not allowed', () => {
      before(async () => {
        token = await initializeToken()
        token.transfer(user1, '4000000000000000000')
        exchange = await initializeExchange()
      })

      it('should revert', async () =>
        await truffleAssert.reverts(
          exchange.depositToken(token.address, '2000000000000000000', { from: user1 }),
          'ERC20: transfer amount exceeds allowance'
        ))
    })
  })

  describe('#withdrawEther()', () => {
    let initUserBalance: BN
    let transaction: Truffle.TransactionResponse<AllEvents>

    context('when success', () => {
      before(async () => {
        exchange = await initializeExchange()
        await exchange.depositEther({ value: '9000000000000000000', from: user2 })
        await exchange.depositEther({ value: '3000000000000000000', from: user1 })
        initUserBalance = web3.utils.toBN(await web3.eth.getBalance(user1))

        transaction = await exchange.withdrawEther('1000000000000000000', { from: user1 })
      })

      it('should decrease contract Ether balance', async () => {
        const balance = await web3.eth.getBalance(exchange.address)
        balance.should.eq('11000000000000000000')
      })

      it('should increase user Ether balance', async () => {
        const balance = web3.utils.toBN(await web3.eth.getBalance(user1))
        balance.gt(initUserBalance).should.true
      })

      it('should decrease exchange user Ether balance', async () => {
        const balance = await exchange.ethBalanceOf(user1)
        balance.toString().should.equal('2000000000000000000')
      })

      it('should emit WithdrawEther', () => {
        truffleAssert.eventEmitted(transaction, 'WithdrawEther', {
          account: user1,
          amount: web3.utils.toBN('1000000000000000000'),
          newBalance: web3.utils.toBN('2000000000000000000'),
        })
      })
    })

    context('when insufficient funds', () => {
      before(async () => {
        exchange = await initializeExchange()
        await exchange.depositEther({ value: '3000000000000000000', from: user1 })
      })
      it('should revert', async () =>
        await truffleAssert.reverts(
          exchange.withdrawEther('5000000000000000000', { from: user1 }),
          'Insufficient funds'
        ))
    })
  })

  describe('#withdrawToken()', () => {
    let otherToken: TokenInstance

    context('when success', () => {
      let transaction: Truffle.TransactionResponse<AllEvents>

      before(async () => {
        token = await initializeToken()
        otherToken = await initializeToken()
        await token.transfer(user1, '3000000000000000000', { from: deployer })
        await otherToken.transfer(user1, '4000000000000000000', { from: deployer })
        exchange = await initializeExchange()
        await token.approve(exchange.address, '9000000000000000000', { from: deployer })
        await exchange.depositToken(token.address, '9000000000000000000', { from: deployer })
        await token.approve(exchange.address, '3000000000000000000', { from: user1 })
        await exchange.depositToken(token.address, '3000000000000000000', { from: user1 })
        await otherToken.approve(exchange.address, '4000000000000000000', { from: user1 })
        await exchange.depositToken(otherToken.address, '4000000000000000000', { from: user1 })

        transaction = await exchange.withdrawToken(token.address, '1000000000000000000', { from: user1 })
      })

      it('should increase user token balance', async () => {
        const balance = await token.balanceOf(user1)
        balance.toString().should.equal('1000000000000000000')
      })

      it('should decrease exchange user token balance', async () => {
        const balance = await exchange.tokenBalanceOf(token.address, user1)
        balance.toString().should.equal('2000000000000000000')
      })

      it('should emit WithdrawToken', () => {
        truffleAssert.eventEmitted(transaction, 'WithdrawToken', {
          account: user1,
          amount: web3.utils.toBN('1000000000000000000'),
          newBalance: web3.utils.toBN('2000000000000000000'),
        })
      })
    })

    context('when insufficient funds', () => {
      before(async () => {
        token = await initializeToken()
        await token.transfer(user1, '1000000000000000000', { from: deployer })
        exchange = await initializeExchange()
        await token.approve(exchange.address, '1000000000000000000', { from: user1 })
        await exchange.depositToken(token.address, '1000000000000000000', { from: user1 })
      })

      it('should revert', async () =>
        await truffleAssert.reverts(
          exchange.withdrawToken(token.address, '2000000000000000000', { from: user1 }),
          'Insufficient funds'
        ))
    })

    context('when unknown token', () => {
      before(async () => {
        token = await initializeToken()
        otherToken = await initializeToken()
        await token.transfer(user1, '3000000000000000000', { from: deployer })
        await otherToken.transfer(user1, '3000000000000000000', { from: deployer })
        exchange = await initializeExchange()
        await token.approve(exchange.address, '1000000000000000000', { from: user1 })
        await exchange.depositToken(token.address, '1000000000000000000', { from: user1 })
      })

      it('should revert', async () =>
        await truffleAssert.reverts(
          exchange.withdrawToken(otherToken.address, '1000000000000000000', { from: deployer }),
          'Insufficient funds'
        ))
    })
  })

  describe('#createOrder()', () => {
    const sellAmount = '10000000000'
    const buyAmount = '1000000000000000000'

    let timestamp: BN

    context('when success', () => {
      let transaction: Truffle.TransactionResponse<AllEvents>

      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        timestamp = web3.utils.toBN(await advanceBlockTime(1))

        transaction = await exchange.createOrder(ETHER_ADDRESS, sellAmount, token.address, buyAmount, { from: user1 })
      })

      it('should create order', async () => {
        const order = await exchange.orders(1)
        order[0].toString().should.equal('1')
        order[1].sub(timestamp).lte(web3.utils.toBN(1)).should.true
        order[1].sub(timestamp).gte(web3.utils.toBN(-1)).should.true
        order[2].toString().should.equal('0')
        order[3].should.equal(user1)
        order[4].should.equal(ETHER_ADDRESS)
        order[5].toString().should.equal(sellAmount)
        order[6].toString().should.equal(token.address)
        order[7].toString().should.equal(buyAmount)
      })

      it('should emit CreateOrder', () => {
        truffleAssert.eventEmitted(
          transaction,
          'CreateOrder',
          (event: {
            id: BN
            timestamp: BN
            account: string
            sellToken: string
            sellAmount: BN
            buyToken: string
            buyAmount: BN
          }) => {
            return (
              event.id.toString() == '1' &&
              event.timestamp.sub(timestamp).lte(web3.utils.toBN(1)) &&
              event.account == user1 &&
              event.sellToken == ETHER_ADDRESS &&
              event.sellAmount.toString() == sellAmount &&
              event.buyToken == token.address &&
              event.buyAmount.toString() == buyAmount
            )
          }
        )
      })
    })

    context('when same assets', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
      })

      it('should revert', async () =>
        await truffleAssert.reverts(
          exchange.createOrder(token.address, buyAmount, token.address, sellAmount, { from: user1 }),
          'Assets are identical'
        ))
    })
  })

  describe('#cancelOrder()', () => {
    const sellAmount = '10000000000'
    const buyAmount = '1000000000000000000'

    let timestamp: BN

    context('when success', () => {
      let transaction: Truffle.TransactionResponse<AllEvents>

      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        timestamp = web3.utils.toBN(await advanceBlockTime(1))
        await exchange.createOrder(ETHER_ADDRESS, sellAmount, token.address, buyAmount, { from: user1 })

        transaction = await exchange.cancelOrder(1, { from: user1 })
      })

      it('should cancel the order', async () => {
        const order = await exchange.orders(1)
        order[2].toString().should.equal('2')
      })

      it('should emit CancelOrder', () => {
        truffleAssert.eventEmitted(
          transaction,
          'CancelOrder',
          (event: {
            id: BN
            timestamp: BN
            account: string
            sellToken: string
            sellAmount: BN
            buyToken: string
            buyAmount: BN
          }) => {
            return (
              event.id.toString() == '1' &&
              event.timestamp.sub(timestamp).lte(web3.utils.toBN(1)) &&
              event.account == user1 &&
              event.sellToken == ETHER_ADDRESS &&
              event.sellAmount.toString() == sellAmount &&
              event.buyToken == token.address &&
              event.buyAmount.toString() == buyAmount
            )
          }
        )
      })
    })

    context('when unknown', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        await exchange.createOrder(token.address, buyAmount, ETHER_ADDRESS, sellAmount, { from: user1 })
      })

      it('should revert', async () =>
        await truffleAssert.reverts(exchange.cancelOrder(2, { from: user1 }), 'Order unknown'))
    })

    context('when already cancelled', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        await exchange.createOrder(token.address, buyAmount, ETHER_ADDRESS, sellAmount, { from: user1 })
        await exchange.cancelOrder(1, { from: user1 })
      })

      it('should revert', async () =>
        await truffleAssert.reverts(exchange.cancelOrder(1, { from: user1 }), 'Order not cancellable'))
    })

    // context('when filled', () => {
    //         before(async () => {
    //           token = await initializeToken()
    //           exchange = await initializeExchange()
    //           await exchange.createOrder(token.address, buyAmount, ETHER_ADDRESS, sellAmount, { from: user1 })
    //           // await exchange.cancelOrder(1, { from: user1 })
    //         })

    //         it('should revert', async () =>
    //           await truffleAssert.reverts(await exchange.cancelOrder(1, { from: user1 }), 'Order not cancellable'))
    // })

    context('when not owner', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        await exchange.createOrder(token.address, buyAmount, ETHER_ADDRESS, sellAmount, { from: user2 })
      })

      it('should revert', async () =>
        await truffleAssert.reverts(exchange.cancelOrder(1, { from: user1 }), 'Not owner of the order'))
    })
  })

  describe('#fillOrder()', () => {
    const ethAmount = '10000000000'
    const tokenAmount = '1000000000000000000'

    context('when selling Ether', () => {
      context('when success', () => {
        let timestamp: BN
        let transaction: Truffle.TransactionResponse<AllEvents>

        before(async () => {
          token = await initializeToken()
          exchange = await initializeExchange()
          await token.transfer(user1, '1100000000000000000', { from: deployer })
          await exchange.depositEther({ value: ethAmount, from: user2 })
          await token.approve(exchange.address, '1100000000000000000', { from: user1 })
          await exchange.depositToken(token.address, '1100000000000000000', { from: user1 })
          await exchange.createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount, { from: user2 })
          timestamp = web3.utils.toBN(await advanceBlockTime(1))

          transaction = await exchange.fillOrder(1, { from: user1 })
        })

        it('should fill the order', async () => {
          const order = await exchange.orders(1)
          order[2].toString().should.equal('1')
        })

        it('should increase exchange buyer Ether', async () => {
          const balance = await exchange.ethBalanceOf(user1)
          balance.toString().should.equal(ethAmount)
        })

        it('should decrease exchange seller Ether', async () => {
          const balance = await exchange.ethBalanceOf(user2)
          balance.toString().should.equal('0')
        })

        it('should increase exchange seller token', async () => {
          const balance = await exchange.tokenBalanceOf(token.address, user2)
          balance.toString().should.equal(tokenAmount)
        })

        it('should decrease exchange buyer token', async () => {
          const balance = await exchange.tokenBalanceOf(token.address, user1)
          balance.toString().should.equal('0')
        })

        it('should increase exchange fee account token', async () => {
          const balance = await exchange.tokenBalanceOf(token.address, feeAccount)
          balance.toString().should.equal('100000000000000000')
        })

        it('should emit Trade', () => {
          truffleAssert.eventEmitted(
            transaction,
            'Trade',
            (event: {
              timestamp: BN
              orderId: BN
              sellAccount: string
              sellToken: string
              sellAmount: BN
              buyAccount: string
              buyToken: string
              buyAmount: BN
            }) => {
              return (
                event.timestamp.sub(timestamp).lte(web3.utils.toBN(1)) &&
                event.orderId.toString() == '1' &&
                event.sellAccount == user2 &&
                event.sellToken == ETHER_ADDRESS &&
                event.sellAmount.toString() == ethAmount &&
                event.buyAccount == user1 &&
                event.buyToken == token.address &&
                event.buyAmount.toString() == tokenAmount
              )
            }
          )
        })
      })

      context('when insufficient funds for buyer', () => {
        before(async () => {
          token = await initializeToken()
          exchange = await initializeExchange()
          await token.transfer(user1, tokenAmount, { from: deployer })
          await exchange.depositEther({ value: ethAmount, from: user2 })
          await token.approve(exchange.address, tokenAmount, { from: user1 })
          await exchange.depositToken(token.address, tokenAmount, { from: user1 })
          await exchange.createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount, { from: user2 })
        })

        it('should revert', async () =>
          await truffleAssert.reverts(exchange.fillOrder(1, { from: user1 }), 'Insufficient funds for buyer'))
      })

      context('when insufficient funds for seller', () => {
        before(async () => {
          token = await initializeToken()
          exchange = await initializeExchange()
          await token.transfer(user1, '1100000000000000000', { from: deployer })
          await exchange.depositEther({ value: '1000000000', from: user2 })
          await token.approve(exchange.address, '1100000000000000000', { from: user1 })
          await exchange.depositToken(token.address, '1100000000000000000', { from: user1 })
          await exchange.createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount, { from: user2 })
        })

        it('should revert', async () =>
          await truffleAssert.reverts(exchange.fillOrder(1, { from: user1 }), 'Insufficient funds for seller'))
      })
    })

    context('when selling token', () => {
      context('when success', () => {
        let timestamp: BN
        let transaction: Truffle.TransactionResponse<AllEvents>

        before(async () => {
          token = await initializeToken()
          exchange = await initializeExchange()
          await token.transfer(user2, tokenAmount, { from: deployer })
          await token.approve(exchange.address, tokenAmount, { from: user2 })
          await exchange.depositToken(token.address, tokenAmount, { from: user2 })
          await exchange.depositEther({ value: '11000000000', from: user1 })
          await exchange.createOrder(token.address, tokenAmount, ETHER_ADDRESS, ethAmount, { from: user2 })
          timestamp = web3.utils.toBN(await advanceBlockTime(1))

          transaction = await exchange.fillOrder(1, { from: user1 })
        })

        it('should fill the order', async () => {
          const order = await exchange.orders(1)
          order[2].toString().should.equal('1')
        })

        it('should increase exchange buyer token', async () => {
          const balance = await exchange.tokenBalanceOf(token.address, user1)
          balance.toString().should.equal(tokenAmount)
        })

        it('should decrease exchange seller token', async () => {
          const balance = await exchange.tokenBalanceOf(token.address, user2)
          balance.toString().should.equal('0')
        })

        it('should increase exchange seller Ether', async () => {
          const balance = await exchange.ethBalanceOf(user2)
          balance.toString().should.equal(ethAmount)
        })

        it('should decrease exchange buyer Ether', async () => {
          const balance = await exchange.ethBalanceOf(user1)
          balance.toString().should.equal('0')
        })

        it('should increase exchange fee account Ether', async () => {
          const balance = await exchange.ethBalanceOf(feeAccount)
          balance.toString().should.equal('1000000000')
        })

        it('should emit Trade', () => {
          truffleAssert.eventEmitted(
            transaction,
            'Trade',
            (event: {
              timestamp: BN
              orderId: BN
              sellAccount: string
              sellToken: string
              sellAmount: BN
              buyAccount: string
              buyToken: string
              buyAmount: BN
            }) => {
              return (
                event.timestamp.sub(timestamp).lte(web3.utils.toBN(1)) &&
                event.orderId.toString() == '1' &&
                event.sellAccount == user2 &&
                event.sellToken == token.address &&
                event.sellAmount.toString() == tokenAmount &&
                event.buyAccount == user1 &&
                event.buyToken == ETHER_ADDRESS &&
                event.buyAmount.toString() == ethAmount
              )
            }
          )
        })
      })

      context('when insufficient funds for buyer', () => {
        before(async () => {
          token = await initializeToken()
          exchange = await initializeExchange()
          await token.transfer(user2, tokenAmount, { from: deployer })
          await token.approve(exchange.address, tokenAmount, { from: user2 })
          await exchange.depositToken(token.address, tokenAmount, { from: user2 })
          await exchange.depositEther({ value: ethAmount, from: user1 })
          await exchange.createOrder(token.address, tokenAmount, ETHER_ADDRESS, ethAmount, { from: user2 })
        })

        it('should revert', async () =>
          await truffleAssert.reverts(exchange.fillOrder(1, { from: user1 }), 'Insufficient funds for buyer'))
      })

      context('when insufficient funds for seller', () => {
        before(async () => {
          token = await initializeToken()
          exchange = await initializeExchange()
          await token.transfer(user2, '100000000000000000', { from: deployer })
          await token.approve(exchange.address, '100000000000000000', { from: user2 })
          await exchange.depositToken(token.address, '100000000000000000', { from: user2 })
          await exchange.depositEther({ value: '11000000000', from: user1 })
          await exchange.createOrder(token.address, tokenAmount, ETHER_ADDRESS, ethAmount, { from: user2 })
        })

        it('should revert', async () =>
          await truffleAssert.reverts(exchange.fillOrder(1, { from: user1 }), 'Insufficient funds for seller'))
      })
    })

    context('when unknown order', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        await token.transfer(user1, '1100000000000000000', { from: deployer })
        await exchange.depositEther({ value: ethAmount, from: user2 })
        await token.approve(exchange.address, '1100000000000000000', { from: user1 })
        await exchange.depositToken(token.address, '1100000000000000000', { from: user1 })
        await exchange.createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount, { from: user2 })
      })

      it('should revert', async () =>
        await truffleAssert.reverts(exchange.fillOrder(2, { from: user1 }), 'Order unknown'))
    })

    context('when cancelled order', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        await token.transfer(user1, '1100000000000000000', { from: deployer })
        await exchange.depositEther({ value: ethAmount, from: user2 })
        await token.approve(exchange.address, '1100000000000000000', { from: user1 })
        await exchange.depositToken(token.address, '1100000000000000000', { from: user1 })
        await exchange.createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount, { from: user2 })
        await exchange.cancelOrder(1, { from: user2 })
      })

      it('should revert', async () =>
        await truffleAssert.reverts(exchange.fillOrder(1, { from: user1 }), 'Order not fillable'))
    })

    context('when filled order', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        await token.transfer(user1, '1100000000000000000', { from: deployer })
        await exchange.depositEther({ value: ethAmount, from: user2 })
        await token.approve(exchange.address, '1100000000000000000', { from: user1 })
        await exchange.depositToken(token.address, '1100000000000000000', { from: user1 })
        await exchange.createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount, { from: user2 })
        await exchange.fillOrder(1, { from: user1 })
      })

      it('should revert', async () =>
        await truffleAssert.reverts(exchange.fillOrder(1, { from: user1 }), 'Order not fillable'))
    })
  })
})
