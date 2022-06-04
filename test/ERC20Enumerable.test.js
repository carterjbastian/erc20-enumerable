/* eslint-disable jest/valid-expect */

const { BN, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

const { ethers } = require("hardhat");

const {
  shouldBehaveLikeERC20,
  shouldBehaveLikeERC20Transfer,
  shouldBehaveLikeERC20Approve,
} = require('./ERC20Enumerable.behavior');

describe('ERC20', function () {
  let initialHolder;
  let recipient;
  let anotherAccount;
  let token;

  const name = 'My Token';
  const symbol = 'MTKN';

  const initialSupply = new BN(100);

  beforeEach(async function () {
    [initialHolder, recipient, anotherAccount] = await ethers.getSigners()

    const TokenFactory = await ethers.getContractFactory("ERC20EnumerableMock")
    token = await TokenFactory.deploy(name, symbol, initialHolder.address, String(initialSupply))
    await token.deployed()

  });

  it('has a name', async function () {
    let name = await token.name();
    expect(name).to.equal(name);
  });

  it('has a symbol', async function () {
    expect(await token.symbol()).to.equal(symbol);
  });

  it('has 18 decimals', async function () {
    expect(await token.decimals()).to.equal(18);
  });


  shouldBehaveLikeERC20('ERC20', initialSupply);

  describe('set decimals', function () {
    const decimals = new BN(6);

    it('can set decimals during construction', async function () {
      const TokenFactory = await ethers.getContractFactory("ERC20EnumerableDecimalsMock")
      const token = await TokenFactory.connect(initialHolder).deploy(name, symbol, String(decimals))
      await token.deployed()
      expect(await token.decimals()).to.equal(Number(decimals));
    });
  });

  describe('decrease allowance', function () {
    describe('when the spender is not the zero address', function () {
      let spender

      beforeEach(async function () {
        spender = recipient.address;
      })

      function shouldDecreaseApproval (amount) {
        describe('when there was no approved amount before', function () {
          it('reverts', async function () {
            await expect(
              token.connect(initialHolder).decreaseAllowance(
                spender, amount,
              )
            ).to.be.revertedWith('ERC20: decreased allowance below zero')
          });
        });

        describe('when the spender had an approved amount', function () {
          const approvedAmount = amount;

          beforeEach(async function () {
            await token.connect(initialHolder).approve(spender, approvedAmount);
          });

          it('emits an approval event', async function () {
            await expect(
              await token.connect(initialHolder).decreaseAllowance(spender, approvedAmount)
            ).to.emit(token, 'Approval').withArgs(
              initialHolder.address, spender, '0'
            );
          });

          it('decreases the spender allowance subtracting the requested amount', async function () {
            let subbed = new BN(approvedAmount).subn(1)
            await token.connect(initialHolder).decreaseAllowance(spender, String(subbed));

            expect(await token.allowance(initialHolder.address, spender)).to.equal('1');
          });

          it('sets the allowance to zero when all allowance is removed', async function () {
            await token.connect(initialHolder).decreaseAllowance(spender, approvedAmount);
            expect(await token.allowance(initialHolder.address, spender)).to.equal('0');
          });

          it('reverts when more than the full allowance is removed', async function () {
            let added = new BN(approvedAmount).addn(1)
            await expect(
              token.connect(initialHolder).decreaseAllowance(spender, String(added))
            ).to.be.revertedWith('ERC20: decreased allowance below zero');
          });
        });
      }

      describe('when the sender has enough balance', function () {
        const amount = String(initialSupply);

        shouldDecreaseApproval(amount);
      });

      describe('when the sender does not have enough balance', function () {
        const amount = String(initialSupply.addn(1));

        shouldDecreaseApproval(amount);
      });
    });

    describe('when the spender is the zero address', function () {
      const amount = String(initialSupply);
      const spender = ZERO_ADDRESS;

      it('reverts', async function () {
        await expect(token.connect(initialHolder).decreaseAllowance(
          spender, amount)
        ).to.be.revertedWith('ERC20: decreased allowance below zero');
      });
    });
  });

  describe('increase allowance', function () {
    const amount = String(initialSupply);

    describe('when the spender is not the zero address', function () {
      let spender 
      
      beforeEach(async () => {
        spender = recipient.address;
      })

      describe('when the sender has enough balance', function () {
        it('emits an approval event', async function () {
          await expect(
            await token.connect(initialHolder).increaseAllowance(spender, amount)
          ).to.emit(token, 'Approval').withArgs(
            initialHolder.address, spender, amount
          );
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await token.connect(initialHolder).increaseAllowance(spender, amount);

            expect(await token.allowance(initialHolder.address, spender)).to.equal(amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await token.connect(initialHolder).approve(spender, '1');
          });

          it('increases the spender allowance adding the requested amount', async function () {
            let added = new BN(amount).addn(1)
            await token.connect(initialHolder).increaseAllowance(spender, amount);

            expect(await token.allowance(initialHolder.address, spender)).to.equal(String(added));
          });
        });
      });

      describe('when the sender does not have enough balance', function () {
        const amount = String(initialSupply.addn(1));

        it('emits an approval event', async function () {
          await expect(
            await token.connect(initialHolder).increaseAllowance(spender, amount)
          ).to.emit(
            token,
            'Approval',
          ).withArgs(
            initialHolder.address, spender, amount,
          );
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await token.connect(initialHolder).increaseAllowance(spender, amount);

            expect(await token.allowance(initialHolder.address, spender)).to.equal(amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await token.connect(initialHolder).approve(spender, '1');
          });

          it('increases the spender allowance adding the requested amount', async function () {
            let added = (new BN(amount)).addn(1)
            await token.connect(initialHolder).increaseAllowance(spender, amount);

            expect(await token.allowance(initialHolder.address, spender)).to.equal(String(added));
          });
        });
      });
    });

    describe('when the spender is the zero address', function () {
      const spender = ZERO_ADDRESS;

      it('reverts', async function () {
        await expect(
          token.connect(initialHolder).increaseAllowance(spender, amount)
        ).to.be.revertedWith('ERC20: approve to the zero address');
      });
    });
  });

  describe('_mint', function () {
    const amount = String(new BN(50));
    it('rejects a null account', async function () {
      await expect(
        token.mint(ZERO_ADDRESS, amount)
      ).to.be.revertedWith('ERC20: mint to the zero address');
    });

    describe('for a non zero account', function () {
      let receipt 
      beforeEach('minting', async function () {
        receipt = await token.mint(recipient.address, amount);
      });

      it('increments totalSupply', async function () {
        const expectedSupply = initialSupply.add(new BN(amount));
        expect(await token.totalSupply()).to.equal(String(expectedSupply));
      });

      it('increments recipient balance', async function () {
        expect(await token.balanceOf(recipient.address)).to.equal(amount);
      });

      it('emits Transfer event', async function () {
        const event = await expect(
          receipt
        ).to.emit(token, 'Transfer').withArgs(
          ZERO_ADDRESS, recipient.address, amount
        );
      });
    });
  });

  describe('_burn', function () {
    it('rejects a null account', async function () {
      await expect(token.burn(ZERO_ADDRESS, '1')).to.be.revertedWith('ERC20: burn from the zero address');
    });

    describe('for a non zero account', function () {
      it('rejects burning more than balance', async function () {
        await expect(token.burn(
          initialHolder.address, String(initialSupply.addn(1)))
        ).to.be.revertedWith('ERC20: burn amount exceeds balance');
      });

      const describeBurn = function (description, amount) {
        describe(description, function () {
          let receipt
          beforeEach('burning', async function () {
            receipt = await token.burn(initialHolder.address, amount);
          });

          it('decrements totalSupply', async function () {
            const expectedSupply = initialSupply.sub(new BN(amount));
            expect(await token.totalSupply()).to.equal(String(expectedSupply));
          });

          it('decrements initialHolder balance', async function () {
            const expectedBalance = initialSupply.sub(new BN(amount));
            expect(await token.balanceOf(initialHolder.address)).to.equal(String(expectedBalance));
          });

          it('emits Transfer event', async function () {
            const event = await expect(
              receipt
            ).to.emit(token, 'Transfer').withArgs(
              initialHolder.address, ZERO_ADDRESS, amount
            );
          });
        });
      };

      describeBurn('for entire balance', String(initialSupply));
      describeBurn('for less amount than balance', String(initialSupply.subn(1)));
    });
  });

  describe('_transfer', function () {
    shouldBehaveLikeERC20Transfer('ERC20', String(initialSupply), '_transfer');

    describe('when the sender is the zero address', function () {
      it('reverts', async function () {
        await expect(token.transferInternal(ZERO_ADDRESS, recipient.address, String(initialSupply)))
          .to.be.revertedWith('ERC20: transfer from the zero address');
      });
    });
  });

  describe('_approve', function () {
    shouldBehaveLikeERC20Approve('ERC20', String(initialSupply), 'approveInternal');

    describe('when the owner is the zero address', function () {
      it('reverts', async function () {
        await expect(token.approveInternal(ZERO_ADDRESS, recipient.address, String(initialSupply)))
          .to.be.revertedWith('ERC20: approve from the zero address')
      });
    });
  });
});
