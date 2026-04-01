# Solana Escrow Program

Trustless peer-to-peer token swaps. No middleman. No trust required.

This is the program I am most proud of in this series. Escrow is a concept that exists in every financial system in the world — from real estate to cross-border payments. Building it on Solana meant stripping it down to its purest form: two parties, two tokens, one smart contract that enforces the rules for both of them.

Alice locks Token A into a vault. Bob sends Token B. The contract releases both atomically. If Bob never shows up, Alice cancels and gets everything back. The program is the middleman — and unlike a human middleman, it cannot lie, delay, or take a cut.

This is what decentralised finance actually means in practice.

## How it works

- `make_offer` — Maker deposits Token A into a PDA vault and sets the terms
- `take_offer` — Taker sends Token B, receives Token A atomically
- `cancel_offer` — Maker cancels and reclaims Token A at any time

## Tests

```
✔ Makes an offer   — Vault holds 500,000 Token A
✔ Takes an offer   — Taker receives Token A, Maker receives Token B

2 passing
```

## Stack
- Rust + Anchor 0.32.1
- anchor-spl for SPL token transfers
- Associated Token Accounts + PDA vaults
- TypeScript integration tests

## Run it

```bash
git clone https://github.com/Kingfaitho/solana-escrow-program
cd solana-escrow-program
npm install
anchor test
```

---

The concepts here — CPI calls, PDA signing, token vaults — are the foundation of every DeFi protocol on Solana. Building this from scratch rather than copying a template made the difference.
