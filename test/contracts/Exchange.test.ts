import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { Exchange, Exchange__factory, Token, Token__factory } from '../../typechain-types'
import { BigNumber } from '@ethersproject/bignumber'
import { BURN_ADDRESS as ETHER_ADDRESS } from './helpers'
import { ContractTransaction } from '@ethersproject/contracts'

describe('Exchange', () => {
  const initialSupply = BigNumber.from('1000000000000000000000')
  const feePercent = 10

  let feeAccount: SignerWithAddress
  let user1: SignerWithAddress
  let user2: SignerWithAddress
  let initializeToken: () => Promise<Token>
  let initializeExchange: () => Promise<Exchange>
  let token: Token
  let exchange: Exchange

  before(async () => {
    ;[, feeAccount, user1, user2] = await ethers.getSigners()
    initializeToken = async () => {
      const factory = (await ethers.getContractFactory('Token')) as Token__factory
      return (await factory.deploy(initialSupply)).deployed()
    }
    initializeExchange = async () => {
      const factory = (await ethers.getContractFactory('Exchange')) as Exchange__factory
      return (await factory.deploy(feeAccount.address, feePercent)).deployed()
    }
  })

  describe('#feeAccount()', () => {
    let result: string

    before(async () => {
      exchange = await initializeExchange()
      result = await exchange.feeAccount()
    })

    it('should return fee account', () => expect(result).to.equal(feeAccount.address))
  })

  describe('#feePercent()', () => {
    let result: number

    before(async () => {
      exchange = await initializeExchange()
      result = await exchange.feePercent()
    })

    it('should return fee percent', () => expect(result).to.equal(feePercent))
  })

  describe('#ethBalanceOf', () => {
    const value = BigNumber.from('1000000000000000000')

    let result: BigNumber

    context('when exists', () => {
      before(async () => {
        exchange = await initializeExchange()
        await exchange.connect(user1).depositEther({ value })
        result = await exchange.ethBalanceOf(user1.address)
      })

      it('should return balance', () => expect(result).to.equal(value))
    })

    context('when none', () => {
      before(async () => {
        exchange = await initializeExchange()
        result = await exchange.ethBalanceOf(user1.address)
      })

      it('should return balance', () => expect(result).to.equal(BigNumber.from(0)))
    })
  })

  describe('#tokenBalanceOf', () => {
    const value = BigNumber.from('1000000000000000000')

    let result: BigNumber

    context('when exists', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        await token.transfer(user1.address, value)
        await token.connect(user1).approve(exchange.address, value)
        await exchange.connect(user1).depositToken(token.address, value)
        result = await exchange.tokenBalanceOf(token.address, user1.address)
      })

      it('should return balance', () => expect(result).to.equal(value))
    })

    context('when none', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        await token.transfer(user2.address, value)
        await token.connect(user2).approve(exchange.address, value)
        await exchange.connect(user2).depositToken(token.address, value)

        result = await exchange.tokenBalanceOf(token.address, user1.address)
      })

      it('should return balance', () => expect(result).to.equal(BigNumber.from(0)))
    })

    context('when unknown', () => {
      let otherToken: Token

      before(async () => {
        token = await initializeToken()
        otherToken = await initializeToken()
        exchange = await initializeExchange()
        await token.transfer(user1.address, value)
        await otherToken.transfer(user1.address, value)
        await otherToken.transfer(user2.address, value)
        await otherToken.connect(user2).approve(exchange.address, value)
        await exchange.connect(user2).depositToken(otherToken.address, value)

        result = await exchange.tokenBalanceOf(token.address, user1.address)
      })

      it('should return balance', () => expect(result).to.equal(BigNumber.from(0)))
    })

    describe('#orders()', () => {
      const sellAmount = BigNumber.from('10000000000')
      const buyAmount = BigNumber.from('1000000000000000000')

      let result: {
        0: BigNumber
        1: number
        2: string
        3: string
        4: BigNumber
        5: string
        6: BigNumber
      }

      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        await exchange.connect(user1).createOrder(ETHER_ADDRESS, sellAmount, token.address, sellAmount)
        await exchange.connect(user1).createOrder(ETHER_ADDRESS, sellAmount, token.address, buyAmount)
        await exchange.connect(user1).createOrder(ETHER_ADDRESS, buyAmount, token.address, buyAmount)

        result = await exchange.orders(2)
      })

      it('should return orders', () => {
        expect(result[0]).to.equal(BigNumber.from(2))
        expect(result[1]).to.equal(0)
        expect(result[2]).to.equal(user1.address)
        expect(result[3]).to.equal(ETHER_ADDRESS)
        expect(result[4]).to.equal(BigNumber.from(sellAmount))
        expect(result[5]).to.equal(token.address)
        expect(result[6]).to.equal(BigNumber.from(buyAmount))
      })
    })
  })

  describe('#depositEther()', () => {
    const value = BigNumber.from('1000000000000000000')

    let transaction: ContractTransaction

    before(async () => {
      exchange = await initializeExchange()
      await token.transfer(user1.address, value)
      await exchange.connect(user1).depositEther({ value: '2000000000000000000' })

      transaction = await exchange.connect(user1).depositEther({ value })
    })

    it('should increase contract Ether balance', async () => {
      const balance = await ethers.provider.getBalance(exchange.address)
      expect(balance).to.eq(BigNumber.from('3000000000000000000'))
    })

    it('should increase exchange user1 Ether balance', async () => {
      const balance = await exchange.ethBalanceOf(user1.address)
      expect(balance).to.equal(BigNumber.from('3000000000000000000'))
    })

    it('should emit DepositEther', async () => {
      await expect(transaction)
        .to.emit(exchange, 'DepositEther')
        .withArgs(user1.address, BigNumber.from(value), BigNumber.from('3000000000000000000'))
    })
  })

  describe('#depositToken()', () => {
    context('when success', () => {
      let otherToken: Token
      let transaction: ContractTransaction

      before(async () => {
        token = await initializeToken()
        otherToken = await initializeToken()
        exchange = await initializeExchange()
        await token.transfer(user1.address, '10000000000000000000')
        await otherToken.transfer(user1.address, '10000000000000000000')
        await token.transfer(user2.address, '10000000000000000000')
        await otherToken.transfer(user2.address, '10000000000000000000')
        await token.connect(user2).approve(exchange.address, '3000000000000000000')
        await exchange.connect(user2).depositToken(token.address, '3000000000000000000')
        await otherToken.connect(user2).approve(exchange.address, '9000000000000000000')
        await exchange.connect(user2).depositToken(otherToken.address, '9000000000000000000')
        await token.connect(user1).approve(exchange.address, '5000000000000000000')
        await exchange.connect(user1).depositToken(token.address, '5000000000000000000')
        await token.connect(user1).approve(exchange.address, '1000000000000000000')

        transaction = await exchange.connect(user1).depositToken(token.address, '1000000000000000000')
      })

      it('should increase exchange user1 token balance', async () => {
        const balance = await exchange.tokenBalanceOf(token.address, user1.address)
        expect(balance).to.equal(BigNumber.from('6000000000000000000'))
      })

      it('should decrease user1 token balance', async () => {
        const balance = await token.balanceOf(user1.address)
        expect(balance).to.equal(BigNumber.from('4000000000000000000'))
      })

      it('should emit DepositToken', async () => {
        await expect(transaction)
          .to.emit(exchange, 'DepositToken')
          .withArgs(
            user1.address,
            token.address,
            BigNumber.from('1000000000000000000'),
            BigNumber.from('6000000000000000000')
          )
      })
    })

    context('when insufficient funds', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        token.transfer(user1.address, '4000000000000000000')
        await token.connect(user1).approve(exchange.address, '3000000000000000000')
        await exchange.connect(user1).depositToken(token.address, '3000000000000000000')
        await token.connect(user1).approve(exchange.address, '2000000000000000000')
      })

      it('should revert', async () =>
        await expect(exchange.connect(user1).depositToken(token.address, '2000000000000000000')).to.be.revertedWith(
          'ERC20: transfer amount exceeds balance'
        ))
    })

    context('when transfer not allowed', () => {
      before(async () => {
        token = await initializeToken()
        token.transfer(user1.address, '4000000000000000000')
        exchange = await initializeExchange()
      })

      it('should revert', async () =>
        await expect(exchange.connect(user1).depositToken(token.address, '2000000000000000000')).to.be.revertedWith(
          'ERC20: transfer amount exceeds allowance'
        ))
    })
  })

  describe('#withdrawEther()', () => {
    let initUserBalance: BigNumber

    context('when success', () => {
      let transaction: ContractTransaction

      before(async () => {
        exchange = await initializeExchange()
        await exchange.connect(user2).depositEther({ value: '9000000000000000000' })
        await exchange.connect(user1).depositEther({ value: '3000000000000000000' })
        initUserBalance = await ethers.provider.getBalance(user1.address)

        transaction = await exchange.connect(user1).withdrawEther('1000000000000000000')
      })

      it('should decrease contract Ether balance', async () => {
        const balance = await ethers.provider.getBalance(exchange.address)
        expect(balance).to.equal(BigNumber.from('11000000000000000000'))
      })

      it('should increase user Ether balance', async () => {
        const balance = await ethers.provider.getBalance(user1.address)
        expect(balance.gt(initUserBalance)).to.true
      })

      it('should decrease exchange user Ether balance', async () => {
        const balance = await exchange.ethBalanceOf(user1.address)
        expect(balance).to.equal(BigNumber.from('2000000000000000000'))
      })

      it('should emit WithdrawEther', async () => {
        await expect(transaction)
          .to.emit(exchange, 'WithdrawEther')
          .withArgs(user1.address, BigNumber.from('1000000000000000000'), BigNumber.from('2000000000000000000'))
      })
    })

    context('when insufficient funds', () => {
      before(async () => {
        exchange = await initializeExchange()
        await exchange.connect(user1).depositEther({ value: '3000000000000000000' })
      })

      it('should revert', async () =>
        await expect(exchange.connect(user1).withdrawEther('5000000000000000000')).to.be.revertedWith(
          'Insufficient funds'
        ))
    })
  })

  describe('#withdrawToken()', () => {
    let otherToken: Token

    context('when success', () => {
      let transaction: ContractTransaction

      before(async () => {
        token = await initializeToken()
        otherToken = await initializeToken()
        await token.transfer(user1.address, '3000000000000000000')
        await otherToken.transfer(user1.address, '4000000000000000000')
        exchange = await initializeExchange()
        await token.approve(exchange.address, '9000000000000000000')
        await exchange.depositToken(token.address, '9000000000000000000')
        await token.connect(user1).approve(exchange.address, '3000000000000000000')
        await exchange.connect(user1).depositToken(token.address, '3000000000000000000')
        await otherToken.connect(user1).approve(exchange.address, '4000000000000000000')
        await exchange.connect(user1).depositToken(otherToken.address, '4000000000000000000')

        transaction = await exchange.connect(user1).withdrawToken(token.address, '1000000000000000000')
      })

      it('should increase user token balance', async () => {
        const balance = await token.balanceOf(user1.address)
        expect(balance).to.equal(BigNumber.from('1000000000000000000'))
      })

      it('should decrease exchange user token balance', async () => {
        const balance = await exchange.tokenBalanceOf(token.address, user1.address)
        expect(balance).to.equal('2000000000000000000')
      })

      it('should emit WithdrawToken', async () => {
        await expect(transaction)
          .to.emit(exchange, 'WithdrawToken')
          .withArgs(
            user1.address,
            token.address,
            BigNumber.from('1000000000000000000'),
            BigNumber.from('2000000000000000000')
          )
      })
    })

    context('when insufficient funds', () => {
      before(async () => {
        token = await initializeToken()
        await token.transfer(user1.address, '1000000000000000000')
        exchange = await initializeExchange()
        await token.connect(user1).approve(exchange.address, '1000000000000000000')
        await exchange.connect(user1).depositToken(token.address, '1000000000000000000')
      })

      it('should revert', async () =>
        await expect(exchange.connect(user1).withdrawToken(token.address, '2000000000000000000')).to.be.revertedWith(
          'Insufficient funds'
        ))
    })

    context('when unknown token', () => {
      before(async () => {
        token = await initializeToken()
        otherToken = await initializeToken()
        await token.transfer(user1.address, '3000000000000000000')
        await otherToken.transfer(user1.address, '3000000000000000000')
        exchange = await initializeExchange()
        await token.connect(user1).approve(exchange.address, '1000000000000000000')
        await exchange.connect(user1).depositToken(token.address, '1000000000000000000')
      })

      it('should revert', async () =>
        await expect(exchange.withdrawToken(otherToken.address, '1000000000000000000')).to.be.revertedWith(
          'Insufficient funds'
        ))
    })
  })

  describe('#createOrder()', () => {
    const sellAmount = BigNumber.from('10000000000')
    const buyAmount = BigNumber.from('1000000000000000000')

    context('when success', () => {
      let transaction: ContractTransaction

      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()

        transaction = await exchange.connect(user1).createOrder(ETHER_ADDRESS, sellAmount, token.address, buyAmount)
      })

      it('should create order', async () => {
        const order = await exchange.orders(1)
        expect(order[0]).to.equal(1)
        expect(order[1]).to.equal(0)
        expect(order[2]).to.equal(user1.address)
        expect(order[3]).to.equal(ETHER_ADDRESS)
        expect(order[4]).to.equal(sellAmount)
        expect(order[5]).to.equal(token.address)
        expect(order[6]).to.equal(buyAmount)
      })

      it('should emit CreateOrder', async () => {
        await expect(transaction)
          .to.emit(exchange, 'CreateOrder')
          .withArgs(1, user1.address, ETHER_ADDRESS, sellAmount, token.address, buyAmount)
      })
    })

    context('when same assets', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
      })

      it('should revert', async () =>
        await expect(
          exchange.connect(user1).createOrder(token.address, buyAmount, token.address, sellAmount)
        ).to.be.revertedWith('Assets are identical'))
    })
  })

  describe('#cancelOrder()', () => {
    const sellAmount = BigNumber.from('10000000000')
    const buyAmount = BigNumber.from('1000000000000000000')

    context('when success', () => {
      let transaction: ContractTransaction

      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        await exchange.connect(user1).createOrder(ETHER_ADDRESS, sellAmount, token.address, buyAmount)

        transaction = await exchange.connect(user1).cancelOrder(1)
      })

      it('should cancel the order', async () => {
        const order = await exchange.orders(1)
        expect(order[1]).to.equal(2)
      })

      it('should emit CancelOrder', async () => {
        await expect(transaction)
          .to.emit(exchange, 'CancelOrder')
          .withArgs(1, user1.address, ETHER_ADDRESS, sellAmount, token.address, buyAmount)
      })
    })

    context('when unknown', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        await exchange.connect(user1).createOrder(token.address, buyAmount, ETHER_ADDRESS, sellAmount)
      })

      it('should revert', async () =>
        await expect(exchange.connect(user1).cancelOrder(2)).to.be.revertedWith('Order unknown'))
    })

    context('when already cancelled', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        await exchange.connect(user1).createOrder(token.address, buyAmount, ETHER_ADDRESS, sellAmount)
        await exchange.connect(user1).cancelOrder(1)
      })

      it('should revert', async () =>
        await expect(exchange.connect(user1).cancelOrder(1)).to.be.revertedWith('Order not cancellable'))
    })

    context('when filled', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        await exchange.connect(user1).createOrder(token.address, buyAmount, ETHER_ADDRESS, sellAmount)
        await exchange.connect(user1).cancelOrder(1)
      })

      it('should revert', async () =>
        await expect(exchange.connect(user1).cancelOrder(1)).to.be.revertedWith('Order not cancellable'))
    })

    context('when not owner', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        await exchange.connect(user2).createOrder(token.address, buyAmount, ETHER_ADDRESS, sellAmount)
      })

      it('should revert', async () =>
        await expect(exchange.connect(user1).cancelOrder(1)).to.be.revertedWith('Not owner of the order'))
    })
  })

  describe('#fillOrder()', () => {
    const ethAmount = BigNumber.from('10000000000')
    const tokenAmount = BigNumber.from('1000000000000000000')

    context('when selling Ether', () => {
      context('when success', () => {
        let transaction: ContractTransaction

        before(async () => {
          token = await initializeToken()
          exchange = await initializeExchange()
          await token.transfer(user1.address, '1100000000000000000')
          await exchange.connect(user2).depositEther({ value: ethAmount })
          await token.connect(user1).approve(exchange.address, '1100000000000000000')
          await exchange.connect(user1).depositToken(token.address, '1100000000000000000')
          await exchange.connect(user2).createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount)

          transaction = await exchange.connect(user1).fillOrder(1)
        })

        it('should fill the order', async () => {
          const order = await exchange.orders(1)
          expect(order[1]).to.equal(1)
        })

        it('should increase exchange buyer Ether', async () => {
          const balance = await exchange.ethBalanceOf(user1.address)
          expect(balance).to.equal(ethAmount)
        })

        it('should decrease exchange seller Ether', async () => {
          const balance = await exchange.ethBalanceOf(user2.address)
          expect(balance).to.equal(BigNumber.from(0))
        })

        it('should increase exchange seller token', async () => {
          const balance = await exchange.tokenBalanceOf(token.address, user2.address)
          expect(balance).to.equal(tokenAmount)
        })

        it('should decrease exchange buyer token', async () => {
          const balance = await exchange.tokenBalanceOf(token.address, user1.address)
          expect(balance).to.equal(BigNumber.from(0))
        })

        it('should increase exchange fee account token', async () => {
          const balance = await exchange.tokenBalanceOf(token.address, feeAccount.address)
          expect(balance).to.equal(BigNumber.from('100000000000000000'))
        })

        it('should emit Trade', async () => {
          await expect(transaction)
            .to.emit(exchange, 'Trade')
            .withArgs(1, user2.address, ETHER_ADDRESS, ethAmount, user1.address, token.address, tokenAmount)
        })
      })

      context('when insufficient funds for buyer', () => {
        before(async () => {
          token = await initializeToken()
          exchange = await initializeExchange()
          await token.transfer(user1.address, tokenAmount)
          await exchange.connect(user2).depositEther({ value: ethAmount })
          await token.connect(user1).approve(exchange.address, tokenAmount)
          await exchange.connect(user1).depositToken(token.address, tokenAmount)
          await exchange.connect(user2).createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount)
        })

        it('should revert', async () =>
          await expect(exchange.connect(user1).fillOrder(1)).to.be.revertedWith('Insufficient funds for buyer'))
      })

      context('when insufficient funds for seller', () => {
        before(async () => {
          token = await initializeToken()
          exchange = await initializeExchange()
          await token.transfer(user1.address, '1100000000000000000')
          await exchange.connect(user2).depositEther({ value: '1000000000' })
          await token.connect(user1).approve(exchange.address, '1100000000000000000')
          await exchange.connect(user1).depositToken(token.address, '1100000000000000000')
          await exchange.connect(user2).createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount)
        })

        it('should revert', async () =>
          await expect(exchange.connect(user1).fillOrder(1)).to.be.revertedWith('Insufficient funds for seller'))
      })
    })

    context('when selling token', () => {
      context('when success', () => {
        let transaction: ContractTransaction

        before(async () => {
          token = await initializeToken()
          exchange = await initializeExchange()
          await token.transfer(user2.address, tokenAmount)
          await token.connect(user2).approve(exchange.address, tokenAmount)
          await exchange.connect(user2).depositToken(token.address, tokenAmount)
          await exchange.connect(user1).depositEther({ value: '11000000000' })
          await exchange.connect(user2).createOrder(token.address, tokenAmount, ETHER_ADDRESS, ethAmount)

          transaction = await exchange.connect(user1).fillOrder(1)
        })

        it('should fill the order', async () => {
          const order = await exchange.orders(1)
          expect(order[1]).to.equal(1)
        })

        it('should increase exchange buyer token', async () => {
          const balance = await exchange.tokenBalanceOf(token.address, user1.address)
          expect(balance).to.equal(tokenAmount)
        })

        it('should decrease exchange seller token', async () => {
          const balance = await exchange.tokenBalanceOf(token.address, user2.address)
          expect(balance).to.equal(BigNumber.from(0))
        })

        it('should increase exchange seller Ether', async () => {
          const balance = await exchange.ethBalanceOf(user2.address)
          expect(balance).to.equal(ethAmount)
        })

        it('should decrease exchange buyer Ether', async () => {
          const balance = await exchange.ethBalanceOf(user1.address)
          expect(balance).to.equal(BigNumber.from(0))
        })

        it('should increase exchange fee account Ether', async () => {
          const balance = await exchange.ethBalanceOf(feeAccount.address)
          expect(balance).to.equal(BigNumber.from('1000000000'))
        })

        it('should emit Trade', async () => {
          await expect(transaction)
            .to.emit(exchange, 'Trade')
            .withArgs(1, user2.address, token.address, tokenAmount, user1.address, ETHER_ADDRESS, ethAmount)
        })
      })

      context('when insufficient funds for buyer', () => {
        before(async () => {
          token = await initializeToken()
          exchange = await initializeExchange()
          await token.transfer(user2.address, tokenAmount)
          await token.connect(user2).approve(exchange.address, tokenAmount)
          await exchange.connect(user2).depositToken(token.address, tokenAmount)
          await exchange.connect(user1).depositEther({ value: ethAmount })
          await exchange.connect(user2).createOrder(token.address, tokenAmount, ETHER_ADDRESS, ethAmount)
        })

        it('should revert', async () =>
          await expect(exchange.connect(user1).fillOrder(1)).to.be.revertedWith('Insufficient funds for buyer'))
      })

      context('when insufficient funds for seller', () => {
        before(async () => {
          token = await initializeToken()
          exchange = await initializeExchange()
          await token.transfer(user2.address, '100000000000000000')
          await token.connect(user2).approve(exchange.address, '100000000000000000')
          await exchange.connect(user2).depositToken(token.address, '100000000000000000')
          await exchange.connect(user1).depositEther({ value: '11000000000' })
          await exchange.connect(user2).createOrder(token.address, tokenAmount, ETHER_ADDRESS, ethAmount)
        })

        it('should revert', async () =>
          await expect(exchange.connect(user1).fillOrder(1)).to.be.revertedWith('Insufficient funds for seller'))
      })
    })

    context('when unknown order', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        await token.transfer(user1.address, '1100000000000000000')
        await exchange.connect(user2).depositEther({ value: ethAmount })
        await token.connect(user1).approve(exchange.address, '1100000000000000000')
        await exchange.connect(user1).depositToken(token.address, '1100000000000000000')
        await exchange.connect(user2).createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount)
      })

      it('should revert', async () =>
        await expect(exchange.connect(user1).fillOrder(2)).to.be.revertedWith('Order unknown'))
    })

    context('when cancelled order', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        await token.transfer(user1.address, '1100000000000000000')
        await exchange.connect(user2).depositEther({ value: ethAmount })
        await token.connect(user1).approve(exchange.address, '1100000000000000000')
        await exchange.connect(user1).depositToken(token.address, '1100000000000000000')
        await exchange.connect(user2).createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount)
        await exchange.connect(user2).cancelOrder(1)
      })

      it('should revert', async () =>
        await expect(exchange.connect(user1).fillOrder(1)).to.be.revertedWith('Order not fillable'))
    })

    context('when filled order', () => {
      before(async () => {
        token = await initializeToken()
        exchange = await initializeExchange()
        await token.transfer(user1.address, '1100000000000000000')
        await exchange.connect(user2).depositEther({ value: ethAmount })
        await token.connect(user1).approve(exchange.address, '1100000000000000000')
        await exchange.connect(user1).depositToken(token.address, '1100000000000000000')
        await exchange.connect(user2).createOrder(ETHER_ADDRESS, ethAmount, token.address, tokenAmount)
        await exchange.connect(user1).fillOrder(1)
      })

      it('should revert', async () =>
        await expect(exchange.connect(user1).fillOrder(1)).to.be.revertedWith('Order not fillable'))
    })
  })
})
