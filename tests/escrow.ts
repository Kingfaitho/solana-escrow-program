import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Escrow } from '../target/types/escrow';
import { createMint, createAccount, mintTo, getAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { assert } from 'chai';

describe('escrow', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Escrow as Program<Escrow>;

  let tokenMintA: anchor.web3.PublicKey;
  let tokenMintB: anchor.web3.PublicKey;
  let makerTokenAccountA: anchor.web3.PublicKey;
  let makerTokenAccountB: anchor.web3.PublicKey;
  let takerTokenAccountA: anchor.web3.PublicKey;
  let takerTokenAccountB: anchor.web3.PublicKey;

  const maker = anchor.web3.Keypair.generate();
  const taker = anchor.web3.Keypair.generate();
  const offerId = new anchor.BN(1);

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(maker.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(taker.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    );
    tokenMintA = await createMint(provider.connection, maker, maker.publicKey, null, 6);
    tokenMintB = await createMint(provider.connection, taker, taker.publicKey, null, 6);
    makerTokenAccountA = await createAccount(provider.connection, maker, tokenMintA, maker.publicKey);
    makerTokenAccountB = await createAccount(provider.connection, maker, tokenMintB, maker.publicKey);
    takerTokenAccountA = await createAccount(provider.connection, taker, tokenMintA, taker.publicKey);
    takerTokenAccountB = await createAccount(provider.connection, taker, tokenMintB, taker.publicKey);
    await mintTo(provider.connection, maker, tokenMintA, makerTokenAccountA, maker, 1_000_000);
    await mintTo(provider.connection, taker, tokenMintB, takerTokenAccountB, taker, 1_000_000);
  });

  it('Makes an offer', async () => {
    const [offerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('offer'), maker.publicKey.toBuffer(), offerId.toArrayLike(Buffer, 'le', 8)],
      program.programId
    );
    const vault = anchor.utils.token.associatedAddress({ mint: tokenMintA, owner: offerPda });

    await program.methods
      .makeOffer(offerId, new anchor.BN(500_000), new anchor.BN(500_000))
      .accounts({
        maker: maker.publicKey,
        tokenMintA,
        tokenMintB,
        makerTokenAccountA,
        offer: offerPda,
        vault,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([maker])
      .rpc();

    const vaultAccount = await getAccount(provider.connection, vault);
    assert.equal(vaultAccount.amount.toString(), '500000');
    console.log('Vault holds:', vaultAccount.amount.toString(), 'Token A');
  });

  it('Takes an offer', async () => {
    const [offerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('offer'), maker.publicKey.toBuffer(), offerId.toArrayLike(Buffer, 'le', 8)],
      program.programId
    );
    const vault = anchor.utils.token.associatedAddress({ mint: tokenMintA, owner: offerPda });

    await program.methods
      .takeOffer()
      .accounts({
        taker: taker.publicKey,
        maker: maker.publicKey,
        tokenMintA,
        tokenMintB,
        takerTokenAccountA,
        takerTokenAccountB,
        makerTokenAccountB,
        offer: offerPda,
        vault,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([taker])
      .rpc();

    const takerAccountA = await getAccount(provider.connection, takerTokenAccountA);
    const makerAccountB = await getAccount(provider.connection, makerTokenAccountB);
    assert.equal(takerAccountA.amount.toString(), '500000');
    assert.equal(makerAccountB.amount.toString(), '500000');
    console.log('Taker received:', takerAccountA.amount.toString(), 'Token A');
    console.log('Maker received:', makerAccountB.amount.toString(), 'Token B');
  });
});