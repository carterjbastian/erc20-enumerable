# ERC20 Enumerable

This is a modifaction of the (current at the time) OpenZeppelin ERC20 implementation to use an
EnumerableMap instead of a native mapping and provide getter logic to enumerate the \_balances
for an ERC20 token.

## Install and use

```
npm install "@carterjbastian/erc20-enumerable"
```

## Testing

```
npx hardhat test
```

I copied over the main tests from OpenZeppelin and converted them to Ethers. The test coverage seems fairly
complete of traditional ERC20 functionality and approval niceties.

I built this using hardhat and ethers. This led to testing issues (janky converting of Truffle tests
written by OpenZeppelin to Waffle). I could have done this better by re-writing the test logic, but
I really just wanted to get the tests passing as quickly as possible.

## TODOs

- Add test coverage of the new enumeration functionality.
- Fix the janky type and variable scope conversion issues that came from converting the tests to waffle.
- Figure out how to handle the fact that the mapping order is not guaranteed and if that has implications on calling multiple
  times within a single function?
- Add function to check if an address is in the balance map (which could be semantically different than)
