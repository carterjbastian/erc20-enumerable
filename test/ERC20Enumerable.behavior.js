const { BN, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS, MAX_UINT256 } = constants;

const { ethers } = require("hardhat");
const name = 'My Token';
const symbol = 'MTKN';

function shouldBehaveLikeERC20 (errorPrefix, initialSupply) {
  describe('total supply', function () {
    let token;
    let initialHolder;

    beforeEach(async () => {
      [initialHolder] = await ethers.getSigners()

      const TokenFactory = await ethers.getContractFactory("ERC20EnumerableMock")
      token = await TokenFactory.deploy(name, symbol, initialHolder.address, String(initialSupply))
      await token.deployed()
    })

    it('returns the total amount of tokens', async function () {
      expect(await token.totalSupply()).to.equal(String(initialSupply));
    });
  });

  describe('balanceOf', function () {
    let token;
    let initialHolder;
    let recipient;
    let anotherAccount;

    beforeEach(async () => {
      [initialHolder, recipient, anotherAccount] = await ethers.getSigners()

      const TokenFactory = await ethers.getContractFactory("ERC20EnumerableMock")
      token = await TokenFactory.deploy(name, symbol, initialHolder.address, String(initialSupply))
      await token.deployed()
    })
    describe('when the requested account has no tokens', function () {
      it('returns zero', async function () {
        expect(await token.balanceOf(anotherAccount.address)).to.equal('0');
      });
    });

    describe('when the requested account has some tokens', function () {
      it('returns the total amount of tokens', async function () {
        expect(await token.balanceOf(initialHolder.address)).to.equal(String(initialSupply));
      });
    });
  });

  describe('transfer', function () {
    let token;
    let initialHolder;

    beforeEach(async () => {
      [initialHolder] = await ethers.getSigners()

      const TokenFactory = await ethers.getContractFactory("ERC20EnumerableMock")
      token = await TokenFactory.deploy(name, symbol, initialHolder.address, String(initialSupply))
      await token.deployed()
    })
    shouldBehaveLikeERC20Transfer(errorPrefix, initialSupply, 'transfer');
  });

  describe('transfer from', function () {
    let token;
    let initialHolder;
    let recipient;
    let anotherAccount;
    let spender;

    beforeEach(async () => {
      [initialHolder, recipient, anotherAccount] = await ethers.getSigners()

      const TokenFactory = await ethers.getContractFactory("ERC20EnumerableMock")
      token = await TokenFactory.deploy(name, symbol, initialHolder.address, String(initialSupply))
      await token.deployed()
      spender = recipient;
    })

    describe('when the token owner is not the zero address', function () {
      let tokenOwner;

      beforeEach(async () => {
        tokenOwner = initialHolder.address;
      })

      describe('when the recipient is not the zero address', function () {
        let to;
        beforeEach(async () => {
          to = anotherAccount.address;
        })


        describe('when the spender has enough allowance', function () {
          beforeEach(async function () {
            await token.connect(initialHolder).approve(spender.address, String(initialSupply));
          });

          describe('when the token owner has enough balance', function () {
            const amount = String(initialSupply);

            it('transfers the requested amount', async function () {
              await token.connect(spender).transferFrom(tokenOwner, to, amount);

              expect(await token.balanceOf(tokenOwner)).to.equal('0');

              expect(await token.balanceOf(to)).to.equal(amount);
            });

            it('decreases the spender allowance', async function () {
              await token.connect(spender).transferFrom(tokenOwner, to, amount);

              expect(await token.allowance(tokenOwner, spender.address)).to.equal('0');
            });

            it('emits a transfer event', async function () {
              await expect(
                await token.connect(spender).transferFrom(tokenOwner, to, amount)
              ).to.emit(token, 'Transfer').withArgs(
                tokenOwner, to, amount
              );
            });

            it('emits an approval event', async function () {
              await expect(
                await token.connect(spender).transferFrom(tokenOwner, to, amount)
              ).to.emit(token, 'Approval').withArgs(
                tokenOwner, spender.address, await token.allowance(tokenOwner, spender.address)
              );
            });
          });

          describe('when the token owner does not have enough balance', function () {
            let amount = String(initialSupply);

            beforeEach('reducing balance', async function () {
              await token.connect(initialHolder).transfer(to, 1);
            });

            it('reverts', async function () {
              await expect(
                token.connect(spender).transferFrom(tokenOwner, to, amount)
              ).to.be.revertedWith(`${errorPrefix}: transfer amount exceeds balance`)
            });
          });
        });

        describe('when the spender does not have enough allowance', function () {
          let allowance = String((new BN(initialSupply)).subn(1));;

          beforeEach(async function () {
            await token.connect(initialHolder).approve(spender.address, allowance);
          });

          describe('when the token owner has enough balance', function () {
            const amount = String(initialSupply);

            it('reverts', async function () {
              await expect(
                token.connect(spender).transferFrom(tokenOwner, to, amount)
              ).to.be.revertedWith(`${errorPrefix}: insufficient allowance`);
            });
          });

          describe('when the token owner does not have enough balance', function () {
            const amount = String(allowance);

            beforeEach('reducing balance', async function () {
              await token.connect(initialHolder).transfer(to, 2);
            });

            it('reverts', async function () {
              await expect(
                token.connect(spender).transferFrom(tokenOwner, to, amount)
              ).to.be.revertedWith(`${errorPrefix}: transfer amount exceeds balance`);
            });
          });
        });

        describe('when the spender has unlimited allowance', function () {
          beforeEach(async function () {
            await token.connect(initialHolder).approve(spender.address, String(MAX_UINT256));
          });

          it('does not decrease the spender allowance', async function () {
            await token.connect(spender).transferFrom(tokenOwner, to, '1');

            expect(await token.allowance(tokenOwner, spender.address)).to.equal(String(MAX_UINT256));
          });

          it('does not emit an approval event', async function () {
            await expect(
              await token.connect(spender).transferFrom(tokenOwner, to, '1'),
            ).to.not.emit(token, 'Approval')
          });
        });
      });

      describe('when the recipient is the zero address', function () {
        const amount = String(initialSupply);
        const to = ZERO_ADDRESS;

        beforeEach(async function () {
          await token.connect(initialHolder).approve(spender.address, amount);
        });

        it('reverts', async function () {
          await expect(token.connect(spender).transferFrom(
            tokenOwner, to, amount)
          ).to.be.revertedWith(`${errorPrefix}: transfer to the zero address`);
        });
      });
    });

    describe('when the token owner is the zero address', function () {
      const amount = '0';
      const tokenOwner = ZERO_ADDRESS;
      let to;
      beforeEach(async () => {
        to = recipient.address;
      })

      it('reverts', async function () {
        await expect(
          token.connect(spender).transferFrom(tokenOwner, to, amount)
        ).to.be.revertedWith('from the zero address');
      });
    });
  });

  describe('approve', function () {
    let token;
    let initialHolder;
    let recipient;
    let anotherAccount;

    beforeEach(async () => {
      [initialHolder, recipient, anotherAccount] = await ethers.getSigners()

      const TokenFactory = await ethers.getContractFactory("ERC20EnumerableMock")
      token = await TokenFactory.deploy(name, symbol, initialHolder.address, String(initialSupply))
      await token.deployed()
    })

    shouldBehaveLikeERC20Approve(errorPrefix, initialSupply, 'approve',
    );
  });
}

function shouldBehaveLikeERC20Transfer (errorPrefix, balance, variant) {
  describe('when the recipient is not the zero address', function () {
    let from;
    let to;
    let token;
    let transfer;
    
    beforeEach(async () => {
      [from, to] = await ethers.getSigners()
      const TokenFactory = await ethers.getContractFactory("ERC20EnumerableMock")
      const initialSupply = new BN(100);
      token = await TokenFactory.deploy(name, symbol, from.address, String(initialSupply))
      await token.deployed()

      if (variant === 'transfer') {
        transfer = async function (from, to, value) {
          return token.connect(from).transfer(to.address, value);
        }
      } else if (variant === '_transfer') {
        transfer = async function (from, to, amount) {
          return token.transferInternal(from.address, to.address, amount);
        }
      }
    })
    describe('when the sender does not have enough balance', function () {
      const amount = String((new BN(balance)).addn(1));

      it('reverts', async function () {
        await expect(
            transfer.call(this, from, to, amount)
        ).to.be.revertedWith(`${errorPrefix}: transfer amount exceeds balance`);
      });
    });

    describe('when the sender transfers all balance', function () {
      const amount = String(balance);

      it('transfers the requested amount', async function () {
        await transfer.call(this, from, to, amount);

        expect(await token.balanceOf(from.address)).to.equal('0');

        expect(await token.balanceOf(to.address)).to.equal(amount);
      });

      it('emits a transfer event', async function () {
        await expect(
          await transfer.call(this, from, to, amount)
        ).to.emit(token, 'Transfer').withArgs(
          from.address, to.address, amount
        );
      });
    });

    describe('when the sender transfers zero tokens', function () {
      const amount = '0';

      it('transfers the requested amount', async function () {
        await transfer.call(this, from, to, amount);

        expect(await token.balanceOf(from.address)).to.equal(String(balance));

        expect(await token.balanceOf(to.address)).to.equal('0');
      });

      it('emits a transfer event', async function () {
        expect(
          await transfer.call(this, from, to, amount)
        ).to.emit(token, 'Transfer').withArgs(from.address, to.address, amount)
      });
    });
  });

  describe('when the recipient is the zero address', function () {
    let from;
    let to;
    let token;
    let transfer;
    
    beforeEach(async () => {
      [from, to] = await ethers.getSigners()
      const TokenFactory = await ethers.getContractFactory("ERC20EnumerableMock")
      const initialSupply = new BN(100);
      token = await TokenFactory.deploy(name, symbol, from.address, String(initialSupply))
      await token.deployed()
      if (variant === 'transfer') {
        transfer = async function (from, to, value) {
          return token.connect(from).transfer(to.address, value);
        }
      } else if (variant === '_transfer') {
        transfer = async function (from, to, amount) {
          return token.transferInternal(from.address, to.address, amount);
        }
      }
    })
    it('reverts', async function () {
      await expect(
          transfer.call(this, from, { address: ZERO_ADDRESS }, String(balance))
      ).to.be.revertedWith(`${errorPrefix}: transfer to the zero address`);
    });
  });
}

function shouldBehaveLikeERC20Approve (errorPrefix, supply, variant) {
  describe('when the spender is not the zero address', function () {
    let token;
    let owner;
    let spender;
    let approve;
    
    beforeEach(async () => {
      [owner, spender] = await ethers.getSigners()
      const TokenFactory = await ethers.getContractFactory("ERC20EnumerableMock")
      const initialSupply = new BN(100);
      token = await TokenFactory.deploy(name, symbol, owner.address, String(initialSupply))
      await token.deployed()
      if (variant === 'approveInternal') {
        approve = async function (owner, spender, amount) {
          return token.approveInternal(owner.address, spender.address, amount);
        }
      } else if (variant === 'approve') {
        approve = async function (owner, spender, amount) {
          return token.connect(owner).approve(spender.address, String(amount));
        }
      }
    })
    describe('when the sender has enough balance', function () {
      const amount = String(supply);

      it('emits an approval event', async function () {
        await expect(
          await approve.call(this, owner, spender, amount)
        ).to.emit(token, 'Approval').withArgs(
          owner.address, spender.address, amount
        );
      });

      describe('when there was no approved amount before', function () {
        it('approves the requested amount', async function () {
          await approve.call(this, owner, spender, amount);

          expect(await token.allowance(owner.address, spender.address)).to.equal(amount);
        });
      });

      describe('when the spender had an approved amount', function () {
        beforeEach(async function () {
          await approve.call(this, owner, spender, '1');
        });

        it('approves the requested amount and replaces the previous one', async function () {
          await approve.call(this, owner, spender, amount);

          expect(await token.allowance(owner.address, spender.address)).to.equal(amount);
        });
      });
    });

    describe('when the sender does not have enough balance', function () {
      const amount = String((new BN(supply)).addn(1));

      it('emits an approval event', async function () {
        await expect(
          await approve.call(this, owner, spender, amount)
        ).to.emit(token, 'Approval').withArgs(
          owner.address, spender.address, amount
        );
      });

      describe('when there was no approved amount before', function () {
        it('approves the requested amount', async function () {
          await approve.call(this, owner, spender, amount);

          expect(await token.allowance(owner.address, spender.address)).to.equal(amount);
        });
      });

      describe('when the spender had an approved amount', function () {
        beforeEach(async function () {
          await approve.call(this, owner, spender, '1');
        });

        it('approves the requested amount and replaces the previous one', async function () {
          await approve.call(this, owner, spender, amount);

          expect(await token.allowance(owner.address, spender.address)).to.equal(amount);
        });
      });
    });
  });

  describe('when the spender is the zero address', function () {
    let owner;
    let spender;
    let token;
    let approve;
    
    beforeEach(async () => {
      [owner, spender] = await ethers.getSigners()
      const TokenFactory = await ethers.getContractFactory("ERC20EnumerableMock")
      const initialSupply = new BN(100);
      token = await TokenFactory.deploy(name, symbol, owner.address, String(initialSupply))
      await token.deployed()
      if (variant === 'approveInternal') {
        approve = async function (owner, spender, amount) {
          return token.approveInternal(owner.address, spender.address, amount);
        }
      } else if (variant === 'approve') {
        approve = async function (owner, spender, amount) {
          return token.connect(owner).approve(spender.address, String(amount));
        }
      }
    })
    it('reverts', async function () {
      await expect(
          approve.call(this, owner, { address: ZERO_ADDRESS }, String(supply))
      ).to.be.revertedWith(`${errorPrefix}: approve to the zero address`);
    });
  });
}

module.exports = {
  shouldBehaveLikeERC20,
  shouldBehaveLikeERC20Transfer,
  shouldBehaveLikeERC20Approve,
};
